/**
 * Test Account Flagger
 *
 * Lets Circles users flag addresses as test/bot/old accounts by storing
 * a ##TEST_ACCOUNTS##["0x…", …] list in their own profile metadata.
 * The list is stored on IPFS and referenced on-chain (NameRegistry v2),
 * so analytics dashboards and TMSs can aggregate flagged addresses.
 *
 * The connected wallet's own address can optionally be included.
 * Additional addresses are entered manually — no need to connect each one.
 */
import { onWalletChange, sendTransactions } from './miniapp-sdk.js';
import { Sdk } from '@aboutcircles/sdk';
import { getAddress, encodeFunctionData, isAddress } from 'viem';
import { cidV0ToHex } from '@aboutcircles/sdk-utils';

// ── Constants ────────────────────────────────────────────────────────────────
const TEST_MARKER = '##TEST_ACCOUNTS##';
const NAME_REGISTRY = '0xA27566fD89162cC3D40Cb59c87AAaA49B85F3474';
const UPDATE_ABI = [{
  type: 'function',
  name: 'updateMetadataDigest',
  inputs: [{ name: 'metadataDigest', type: 'bytes32' }],
  stateMutability: 'nonpayable',
}];

// ── State ────────────────────────────────────────────────────────────────────
let connectedAddress = null;
let sdk = null;
let currentProfile = null;
let flaggedAddresses = []; // checksummed addresses

// ── UI helpers ───────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

function showView(id) {
  document.querySelectorAll('.view').forEach((el) => el.classList.add('hidden'));
  $(id)?.classList.remove('hidden');
}

function showToast(message, type = 'info', ms = 4000) {
  document.querySelector('.toast')?.remove();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), ms);
}

function setLoading(btn, loading, label) {
  btn.disabled = loading;
  btn.textContent = loading ? `${label}…` : label;
}

// ── Runner bridge ────────────────────────────────────────────────────────────
function createRunner(address) {
  return {
    address,
    async sendTransaction(txs) {
      const formatted = txs.map((tx) => ({
        to: tx.to,
        data: tx.data || '0x',
        value: tx.value ? `0x${BigInt(tx.value).toString(16)}` : '0x0',
      }));
      const hashes = await sendTransactions(formatted);
      return { hash: hashes[hashes.length - 1] };
    },
  };
}

// ── Profile helpers ──────────────────────────────────────────────────────────

/** Parse the flagged address list from a profile description. */
function parseFlaggedAddresses(description) {
  if (!description || !description.includes(TEST_MARKER)) return [];
  try {
    const jsonStr = description.split(TEST_MARKER)[1].trim();
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return [];
    // Validate and checksum each address
    return parsed.filter((a) => isAddress(a)).map((a) => getAddress(a));
  } catch (e) {
    console.error('Failed to parse flagged addresses:', e);
    return [];
  }
}

/** Build the description string with the flagged address list. */
function buildDescription(baseDescription, addresses) {
  const clean = baseDescription
    ? baseDescription.split(TEST_MARKER)[0].trim()
    : '';

  if (addresses.length === 0) return clean;

  const json = JSON.stringify(addresses);
  return clean
    ? `${clean}\n\n${TEST_MARKER}\n${json}`
    : `${TEST_MARKER}\n${json}`;
}

/** Pin updated profile to IPFS and update the on-chain CID. */
async function updateProfile(updatedFields) {
  const profilePayload = {
    name: currentProfile?.name || '',
    description: updatedFields.description ?? currentProfile?.description ?? '',
    previewImageUrl: currentProfile?.previewImageUrl,
    imageUrl: currentProfile?.imageUrl,
    location: currentProfile?.location,
    geoLocation: currentProfile?.geoLocation,
  };

  console.log('Profile to pin:', JSON.stringify(profilePayload, null, 2));

  const cid = await sdk.profiles.create(profilePayload);
  console.log('New CID:', cid);

  const metadataDigest = cidV0ToHex(cid);
  const data = encodeFunctionData({
    abi: UPDATE_ABI,
    functionName: 'updateMetadataDigest',
    args: [metadataDigest],
  });

  const runner = createRunner(connectedAddress);
  await runner.sendTransaction([{ to: NAME_REGISTRY, data, value: 0n }]);
}

// ── UI rendering ─────────────────────────────────────────────────────────────

function renderAddressList() {
  const listEl = $('address-list');
  const countEl = $('flag-count');
  const saveBtn = $('btn-save');

  countEl.textContent = flaggedAddresses.length;

  if (flaggedAddresses.length === 0) {
    listEl.innerHTML = '<p class="empty-list">No addresses flagged yet. Add one below.</p>';
    saveBtn.style.display = 'none';
    return;
  }

  listEl.innerHTML = flaggedAddresses.map((addr, i) => {
    const isSelf = addr.toLowerCase() === connectedAddress?.toLowerCase();
    const label = isSelf ? ' (connected)' : '';
    return `
      <div class="address-row">
        <span class="address-text">${addr.slice(0, 6)}…${addr.slice(-4)}${label}</span>
        <button class="btn-inline btn-remove" data-index="${i}" title="Remove">✕</button>
      </div>
    `;
  }).join('');

  // Attach remove handlers
  listEl.querySelectorAll('.btn-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      flaggedAddresses.splice(idx, 1);
      renderAddressList();
      markDirty();
    });
  });

  saveBtn.style.display = '';
}

let isDirty = false;

function markDirty() {
  isDirty = true;
  $('btn-save').classList.add('pulse');
  $('unsaved-badge').classList.remove('hidden');
}

function clearDirty() {
  isDirty = false;
  $('btn-save').classList.remove('pulse');
  $('unsaved-badge').classList.add('hidden');
}

// ── Actions ──────────────────────────────────────────────────────────────────

function addAddress() {
  const input = $('address-input');
  const raw = input.value.trim();

  if (!raw) return;

  // Validate
  if (!isAddress(raw)) {
    showToast('Invalid Ethereum address', 'error');
    return;
  }

  const checksummed = getAddress(raw);

  // Check duplicate
  if (flaggedAddresses.includes(checksummed)) {
    showToast('Address already in list', 'error');
    return;
  }

  flaggedAddresses.push(checksummed);
  input.value = '';
  renderAddressList();
  markDirty();
  showToast('Address added to list', 'success', 2000);
}

function addConnectedAddress() {
  if (!connectedAddress) return;

  if (flaggedAddresses.includes(connectedAddress)) {
    showToast('Connected address already in list', 'error');
    return;
  }

  flaggedAddresses.push(connectedAddress);
  renderAddressList();
  markDirty();
  showToast('Connected address added', 'success', 2000);
}

async function saveToProfile() {
  const btn = $('btn-save');
  setLoading(btn, true, 'Saving to profile');

  try {
    const newDesc = buildDescription(currentProfile?.description, flaggedAddresses);
    await updateProfile({ description: newDesc });

    if (currentProfile) currentProfile.description = newDesc;
    clearDirty();
    showToast('Flagged addresses saved to profile', 'success');
  } catch (err) {
    console.error('Save failed:', err);
    const msg = err.message?.includes('rejected')
      ? 'Transaction cancelled'
      : `Failed: ${err.message || err}`;
    showToast(msg, 'error');
  } finally {
    setLoading(btn, false, 'Save to Profile');
  }
}

// ── Initialisation ───────────────────────────────────────────────────────────

async function initializeApp(address) {
  showView('loading-view');

  try {
    const runner = createRunner(address);
    sdk = new Sdk(undefined, runner);

    let profile = null;
    try {
      profile = await sdk.rpc.profile.getProfileByAddress(address);
    } catch (err) {
      console.warn('Profile fetch failed:', err);
    }

    if (!profile) {
      showView('no-avatar-view');
      return;
    }

    currentProfile = profile;
    flaggedAddresses = parseFlaggedAddresses(profile.description);
    isDirty = false;

    showView('connected-view');
    renderAddressList();
    clearDirty();
  } catch (err) {
    console.error('Init error:', err);
    showToast('Failed to load profile', 'error');
    showView('disconnected-view');
  }
}

// ── Wallet connection ────────────────────────────────────────────────────────

onWalletChange(async (address) => {
  if (!address) {
    connectedAddress = null;
    sdk = null;
    currentProfile = null;
    flaggedAddresses = [];
    isDirty = false;
    $('wallet-status').textContent = 'Not connected';
    showView('disconnected-view');
    return;
  }

  connectedAddress = getAddress(address);
  $('wallet-status').textContent = `${connectedAddress.slice(0, 6)}…${connectedAddress.slice(-4)}`;
  await initializeApp(connectedAddress);
});

// ── Event listeners ──────────────────────────────────────────────────────────

$('btn-add')?.addEventListener('click', addAddress);
$('btn-add-self')?.addEventListener('click', addConnectedAddress);
$('btn-save')?.addEventListener('click', saveToProfile);

$('address-input')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addAddress();
});
