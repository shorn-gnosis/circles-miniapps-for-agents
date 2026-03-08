/**
 * Trust Explorer - Explore Circles trust relationships
 */
import { onWalletChange } from './miniapp-sdk.js';
import { Sdk } from '@aboutcircles/sdk';
import { getAddress } from 'viem';

const SDK_CONFIG = {
  circlesRpcUrl: 'https://staging.circlesubi.network/',
  pathfinderUrl: 'https://pathfinder.aboutcircles.com',
  profileServiceUrl: 'https://rpc.aboutcircles.com/profiles/',
  referralsServiceUrl: 'https://staging.circlesubi.network/referrals',
  v1HubAddress: '0x29b9a7fbb8995b2423a71cc17cf9810798f6c543',
  v2HubAddress: '0xc12C1E50ABB450d6205Ea2C3Fa861b3B834d13e8',
  nameRegistryAddress: '0xA27566fD89162cC3D40Cb59c87AAaA49B85F3474',
  baseGroupMintPolicy: '0xcCa27c26CF7BAC2a9928f42201d48220F0e3a549',
  standardTreasury: '0x08F90aB73A515308f03A718257ff9887ED330C6e',
  coreMembersGroupDeployer: '0xFEca40Eb02FB1f4F5F795fC7a03c1A27819B1Ded',
  baseGroupFactoryAddress: '0xD0B5Bd9962197BEaC4cbA24244ec3587f19Bd06d',
  liftERC20Address: '0x5F99a795dD2743C36D63511f0D4bc667e6d3cDB5',
  invitationFarmAddress: '0x0000000000000000000000000000000000000000',
  referralsModuleAddress: '0x12105a9B291aF2ABb0591001155A75949b062CE5',
  invitationModuleAddress: '0x00738aca013B7B2e6cfE1690F0021C3182Fa40B5'
};

let connectedAddress = null;
let viewingAddress = null;
let sdk = null;
let activeTab = 'incoming';
let trustData = { trusting: [], trustedBy: [] };

const $ = (id) => document.getElementById(id);

function initSdk() {
  if (!sdk) {
    sdk = new Sdk(SDK_CONFIG, null);
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

  list.innerHTML = relations.map((rel) => `
    <div class="trust-item" data-address="${rel.trustee || rel.truster}">
      <div class="trust-item-info">
        <div class="trust-item-name">${rel.name || shortenAddress(rel.trustee || rel.truster)}</div>
        <div class="trust-item-address mono">${shortenAddress(rel.trustee || rel.truster)}</div>
      </div>
      <button class="btn btn-secondary btn-inline view-btn" data-address="${rel.trustee || rel.truster}">
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
  try {
    const profile = await s.rpc.profile.getProfileByAddress(address);
    console.log('[DEBUG] Profile found:', profile);
    return profile;
  } catch (err) {
    const msg = decodeError(err);
    console.log('[DEBUG] getProfile error for', address, ':', msg, err);
    return null;
  }
}

async function getTrusts(address) {
  const s = initSdk();
  try {
    const trusts = await s.rpc.trust.getTrusts(address);
    return trusts || [];
  } catch (err) {
    console.error('[DEBUG] getTrusts error:', decodeError(err));
    return [];
  }
}

async function getTrustedBy(address) {
  const s = initSdk();
  try {
    const trustedBy = await s.rpc.trust.getTrustedBy(address);
    return trustedBy || [];
  } catch (err) {
    console.error('[DEBUG] getTrustedBy error:', decodeError(err));
    return [];
  }
}

async function searchProfiles(query) {
  const s = initSdk();
  if (!query || query.length < 2) return [];

  if (query.startsWith('0x') && query.length >= 40) {
    try {
      const profile = await getProfile(getAddress(query));
      if (profile) {
        return [{ address: query, name: profile.name || 'Unknown' }];
      }
    } catch (err) {}
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
    const [profile, trusts, trustedBy] = await Promise.all([
      getProfile(address).catch(() => null),
      getTrusts(address),
      getTrustedBy(address)
    ]);

    console.log('[DEBUG] Results:', { profile, trustsCount: trusts.length, trustedByCount: trustedBy.length });

    renderProfile(profile, address);
    trustData = { trusting: trusts, trustedBy };
    renderTrustCounts(trusts, trustedBy);
    renderTrustList(activeTab === 'incoming' ? trustedBy : trusts);
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
    if (connectedAddress) loadProfile(connectedAddress);
  });
}

async function initializeApp(address) {
  showView('connected-view');
  setupEventListeners();
  await loadProfile(address);
}

onWalletChange(async (address) => {
  console.log('[DEBUG] Wallet change event:', address);
  
  if (!address) {
    console.log('[DEBUG] Wallet disconnected');
    connectedAddress = null;
    viewingAddress = null;
    $('wallet-status').textContent = 'Not connected';
    $('wallet-status').className = 'badge';
    showView('disconnected-view');
    return;
  }

  console.log('[DEBUG] Connected address:', address);

  try {
    connectedAddress = getAddress(address);
    $('wallet-status').textContent = shortenAddress(connectedAddress);
    $('wallet-status').className = 'badge badge-success';
    await initializeApp(connectedAddress);
  } catch (err) {
    console.error('[DEBUG] Init error:', err);
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
