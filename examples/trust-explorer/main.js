/**
 * Trust Explorer - Explore Circles trust relationships
 *
 * SDK pattern:
 *   miniapp-sdk.js  - wallet bridge (transactions, signing)
 *   @aboutcircles/sdk + viem - read Circles state (profiles, trust)
 */
import { onWalletChange } from './miniapp-sdk.js';
import { Sdk } from '@aboutcircles/sdk';
import { getAddress } from 'viem';

const RPC_URL = 'https://rpc.aboutcircles.com/';

let connectedAddress = null;
let viewingAddress = null;
let sdk = null;
let activeTab = 'incoming';
let trustData = { trusting: [], trustedBy: [] };

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

function renderProfile(profile, address) {
  const name = profile?.name || profile?.registeredName || 'Unknown';
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

  list.innerHTML = relations.map((rel) => `
    <div class="trust-item" data-address="${rel.address}">
      <div class="trust-item-info">
        <div class="trust-item-name">${rel.name || 'Unknown'}</div>
        <div class="trust-item-address mono">${shortenAddress(rel.address)}</div>
      </div>
      <button class="btn btn-secondary btn-inline view-btn" data-address="${rel.address}">
        View
      </button>
    </div>
  `).join('');

  list.querySelectorAll('.view-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const addr = e.target.dataset.address;
      if (addr) loadProfile(addr);
    });
  });
}

function setTabsLoading() {
  $('tab-incoming').classList.toggle('active', activeTab === 'incoming');
  $('tab-outgoing').classList.toggle('active', activeTab === 'outgoing');
}

async function getProfile(address) {
  const s = initSdk();
  const profile = await s.rpc.profile.getProfileByAddress(address);
  return profile;
}

async function getTrustRelations(address) {
  const s = initSdk();
  try {
    const relations = await s.data.getTrustRelations(address);
    return relations || { trusting: [], trustedBy: [] };
  } catch (err) {
    console.warn('getTrustRelations error:', err);
    return { trusting: [], trustedBy: [] };
  }
}

async function searchProfiles(query) {
  const s = initSdk();
  if (!query || query.length < 2) return [];

  if (query.startsWith('0x') && query.length >= 40) {
    const profile = await getProfile(getAddress(query));
    if (profile) {
      return [{
        address: query,
        name: profile.name || profile.registeredName || 'Unknown'
      }];
    }
    return [];
  }

  try {
    const results = await s.rpc.profile.searchByAddressOrName(query, 10, 0);
    return results || [];
  } catch (err) {
    console.warn('search error:', err);
    return [];
  }
}

async function loadProfile(address) {
  viewingAddress = address;
  const isSelf = address.toLowerCase() === connectedAddress?.toLowerCase();

  $('back-to-self-btn').classList.toggle('hidden', isSelf);
  $('trust-list').innerHTML = '<div class="loading-placeholder">Loading trust data...</div>';

  try {
    const profile = await getProfile(address);
    renderProfile(profile, address);

    const relations = await getTrustRelations(address);
    trustData = relations;

    renderTrustCounts(relations.trusting, relations.trustedBy);
    renderTrustList(activeTab === 'incoming' ? relations.trustedBy : relations.trusting);
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
    setTabsLoading();
    renderTrustList(trustData.trustedBy);
  });

  $('tab-outgoing').addEventListener('click', () => {
    activeTab = 'outgoing';
    setTabsLoading();
    renderTrustList(trustData.trusting);
  });

  $('back-to-self-btn').addEventListener('click', () => {
    if (connectedAddress) {
      loadProfile(connectedAddress);
    }
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
    $('wallet-status').textContent = 'Not connected';
    $('wallet-status').className = 'badge';
    showView('disconnected-view');
    return;
  }

  try {
    connectedAddress = getAddress(address);
    $('wallet-status').textContent = shortenAddress(connectedAddress);
    $('wallet-status').className = 'badge badge-success';
    await initializeApp(connectedAddress);
  } catch (err) {
    if (isPasskeyAutoConnectError(err)) {
      showToast('Passkey auto-connect failed. Re-open wallet connect and choose your wallet again.', 'error');
    } else {
      showToast(`Failed to initialise: ${decodeError(err)}`, 'error');
    }
  }
});

if (!isMiniappMode()) {
  document.body.insertAdjacentHTML(
    'afterbegin',
    '<div style="background:#fff9ea;padding:8px 16px;font-size:12px;text-align:center;border-bottom:1px solid #f8e4b3">' +
    'Running in standalone mode. Load via Circles host for full functionality.</div>'
  );
}

function isMiniappMode() {
  return window.parent !== window;
}
