/**
 * Trust Explorer - Explore Circles trust relationships
 */
import { onWalletChange } from './miniapp-sdk.js';
import { Sdk } from '@aboutcircles/sdk';
import { getAddress } from 'viem';

// Production RPC endpoint
const RPC_URL = 'https://rpc.aboutcircles.com/';

let connectedAddress = null;
let viewingAddress = null;
let sdk = null;
let activeTab = 'incoming';
let trustData = { trusting: [], trustedBy: [] };
let profileCache = {}; // address → profile name

const $ = (id) => document.getElementById(id);

function initSdk() {
  if (!sdk) {
    sdk = new Sdk(RPC_URL, null);
  }
  return sdk;
}

function showToast(message, type = 'info', ms = 4000) {
  document.querySelector('.toast')?.remove();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), ms);
}

function decodeError(err) {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err.shortMessage) return err.shortMessage;
  if (err.message) return err.message;
  return String(err);
}

function isPasskeyAutoConnectError(err) {
  const msg = decodeError(err).toLowerCase();
  return (
    msg.includes('passkey') ||
    msg.includes('auto connect') ||
    (msg.includes('wallet address') && msg.includes('retrieve'))
  );
}

function showView(id) {
  document.querySelectorAll('.view').forEach((el) => el.classList.add('hidden'));
  $(id)?.classList.remove('hidden');
}

function shortenAddress(addr) {
  if (!addr) return '-';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function getDisplayName(address) {
  return profileCache[address?.toLowerCase()] || shortenAddress(address);
}

function renderProfile(profile, address) {
  const name = profile?.name || 'Unknown';
  $('profile-name').textContent = name;
  $('profile-address').textContent = shortenAddress(address);
  $('profile-address').title = address;
}

function renderTrustCounts(trusting, trustedBy) {
  $('trusting-count').textContent = trusting.length;
  $('trusted-by-count').textContent = trustedBy.length;
}

function renderTrustList(relations) {
  const list = $('trust-list');

  if (!relations || relations.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <p>No trust relationships found</p>
      </div>
    `;
    return;
  }

  list.innerHTML = relations.map((rel) => {
    // Aggregated trust relations use objectAvatar for the counterpart address
    const addr = rel.objectAvatar || rel.trustee || rel.truster;
    const name = getDisplayName(addr);
    const expiry = rel.expiryTime ? Number(rel.expiryTime) : 0;
    const isExpiring = expiry > 0 && expiry < (Date.now() / 1000 + 30 * 24 * 60 * 60); // < 30 days
    const expiryLabel = expiry === 0
      ? ''
      : isExpiring
        ? `<span class="expiry-badge warn">Expires ${new Date(expiry * 1000).toLocaleDateString()}</span>`
        : '';

    return `
      <div class="trust-item" data-address="${addr}">
        <div class="trust-item-info">
          <div class="trust-item-name">${name}</div>
          <div class="trust-item-address mono">${shortenAddress(addr)}${expiryLabel}</div>
        </div>
        <button class="btn btn-secondary btn-inline view-btn" data-address="${addr}">
          View
        </button>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.view-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const addr = e.target.dataset.address;
      if (addr) loadProfile(addr);
    });
  });
}

function setTabsActive() {
  $('tab-incoming').classList.toggle('active', activeTab === 'incoming');
  $('tab-outgoing').classList.toggle('active', activeTab === 'outgoing');
}

async function getProfile(address) {
  const s = initSdk();
  try {
    const profile = await s.rpc.profile.getProfileByAddress(address);
    if (profile?.name) {
      profileCache[address.toLowerCase()] = profile.name;
    }
    return profile;
  } catch (err) {
    return null;
  }
}

/**
 * Fetch aggregated trust relations and enrich with profile names in batch.
 * Uses circles_getAggregatedTrustRelations which returns:
 *   { subjectAvatar, relation: 'trusts'|'trustedBy'|'mutuallyTrusts', objectAvatar, expiryTime, ... }
 */
async function getAggregatedTrusts(address) {
  const s = initSdk();
  try {
    const all = await s.rpc.trust.getAggregatedTrustRelations(address);
    if (!all || all.length === 0) return { trusting: [], trustedBy: [] };

    // Separate into directional lists
    // 'trusts' = subject trusts object (outgoing)
    // 'trustedBy' = subject is trusted by object (incoming)
    // 'mutuallyTrusts' = both directions → include in both lists
    const trusting = all.filter(r =>
      r.relation === 'trusts' || r.relation === 'mutuallyTrusts'
    );
    const trustedBy = all.filter(r =>
      r.relation === 'trustedBy' || r.relation === 'mutuallyTrusts'
    );

    // Batch-fetch profile names for all unique addresses
    const allAddresses = [...new Set(all.map(r => r.objectAvatar).filter(Boolean))];
    if (allAddresses.length > 0) {
      try {
        const profiles = await s.rpc.profile.getProfileByAddressBatch(allAddresses);
        profiles.forEach((p, i) => {
          if (p?.name) {
            profileCache[allAddresses[i].toLowerCase()] = p.name;
          }
        });
      } catch (err) {
        // Profile batch failed — names will fall back to shortened addresses
        console.warn('Profile batch lookup failed:', decodeError(err));
      }
    }

    return { trusting, trustedBy };
  } catch (err) {
    console.warn('Trust query error:', decodeError(err));
    return { trusting: [], trustedBy: [] };
  }
}

async function searchProfiles(query) {
  const s = initSdk();
  if (!query || query.length < 2) return [];

  // Direct address lookup
  if (query.startsWith('0x') && query.length >= 40) {
    try {
      const profile = await getProfile(getAddress(query));
      return [{ address: query, name: profile?.name || 'Unknown' }];
    } catch (err) {
      return [];
    }
  }

  // Name search — try both possible SDK method names
  try {
    const results = await s.rpc.profile.searchByAddressOrName(query, 10, 0);
    if (results && results.length > 0) return results;
  } catch (err) {
    // fall through to alternate method
  }

  try {
    const results = await s.rpc.profile.searchProfiles(query, 10, 0);
    return results || [];
  } catch (err) {
    console.warn('Profile search error:', decodeError(err));
    return [];
  }
}

async function loadProfile(address) {
  viewingAddress = address;
  const isSelf = address.toLowerCase() === connectedAddress?.toLowerCase();

  $('back-to-self-btn').classList.toggle('hidden', isSelf);
  $('trust-list').innerHTML = '<div class="loading-placeholder">Loading trust data...</div>';

  try {
    const [profile, { trusting, trustedBy }] = await Promise.all([
      getProfile(address).catch(() => null),
      getAggregatedTrusts(address)
    ]);

    renderProfile(profile, address);
    trustData = { trusting, trustedBy };
    renderTrustCounts(trusting, trustedBy);
    renderTrustList(activeTab === 'incoming' ? trustedBy : trusting);
  } catch (err) {
    console.error('loadProfile error:', err);
    showToast(`Failed to load profile: ${decodeError(err)}`, 'error');
    $('trust-list').innerHTML = `
      <div class="empty-state result-error">
        <p>Could not load trust data for this address.</p>
      </div>
    `;
  }
}

function setupEventListeners() {
  const searchInput = $('search-input');
  const searchResults = $('search-results');
  let searchTimeout = null;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    clearTimeout(searchTimeout);

    if (query.length < 2) {
      searchResults.classList.add('hidden');
      return;
    }

    searchTimeout = setTimeout(async () => {
      try {
        const results = await searchProfiles(query);
        if (results.length === 0) {
          searchResults.classList.add('hidden');
          return;
        }

        searchResults.innerHTML = results.slice(0, 5).map((r) => `
          <div class="search-result-item" data-address="${r.address}">
            <span class="search-result-name">${r.name || 'Unknown'}</span>
            <span class="search-result-address mono">${shortenAddress(r.address)}</span>
          </div>
        `).join('');

        searchResults.classList.remove('hidden');

        searchResults.querySelectorAll('.search-result-item').forEach((item) => {
          item.addEventListener('click', () => {
            const addr = item.dataset.address;
            searchInput.value = '';
            searchResults.classList.add('hidden');
            loadProfile(addr);
          });
        });
      } catch (err) {
        console.warn('search error:', err);
      }
    }, 300);
  });

  searchInput.addEventListener('blur', () => {
    setTimeout(() => searchResults.classList.add('hidden'), 200);
  });

  $('tab-incoming').addEventListener('click', () => {
    activeTab = 'incoming';
    setTabsActive();
    renderTrustList(trustData.trustedBy);
  });

  $('tab-outgoing').addEventListener('click', () => {
    activeTab = 'outgoing';
    setTabsActive();
    renderTrustList(trustData.trusting);
  });

  $('back-to-self-btn').addEventListener('click', () => {
    if (connectedAddress) loadProfile(connectedAddress);
  });
}

async function initializeApp(address) {
  showView('connected-view');
  setupEventListeners();
  await loadProfile(address);
}

onWalletChange(async (address) => {
  if (!address) {
    connectedAddress = null;
    viewingAddress = null;
    sdk = null;
    profileCache = {};
    $('wallet-status').textContent = 'Not connected';
    $('wallet-status').className = 'badge';
    showView('disconnected-view');
    return;
  }

  try {
    connectedAddress = getAddress(address);
    $('wallet-status').textContent = `${connectedAddress.slice(0, 6)}…${connectedAddress.slice(-4)}`;
    $('wallet-status').className = 'badge badge-success';
    await initializeApp(connectedAddress);
  } catch (err) {
    console.error('Init error:', err);
    if (isPasskeyAutoConnectError(err)) {
      showToast('Passkey auto-connect failed. Re-open wallet connect and choose your wallet again.', 'error');
    } else {
      showToast(`Failed to initialise: ${decodeError(err)}`, 'error');
    }
  }
});

if (window.parent === window) {
  document.body.insertAdjacentHTML(
    'afterbegin',
    '<div style="background:#fff9ea;padding:8px 16px;font-size:12px;text-align:center;border-bottom:1px solid #f8e4b3">' +
    'Running in standalone mode. Load via Circles host for full functionality.</div>'
  );
}