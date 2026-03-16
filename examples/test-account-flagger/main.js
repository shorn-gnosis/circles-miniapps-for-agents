/**
 * Test Account Flagger
 *
 * Lets Circles users flag their own account as a test/bot account
 * by writing a ##TEST_ACCOUNT## marker into their profile metadata.
 * The flag is stored on IPFS and referenced on-chain (NameRegistry v2),
 * so analytics dashboards and TMSs can filter these accounts.
 */
import { onWalletChange, sendTransactions } from './miniapp-sdk.js';
import { Sdk } from '@aboutcircles/sdk';
import { getAddress, encodeFunctionData } from 'viem';
import { cidV0ToHex } from '@aboutcircles/sdk-utils';

// ── Constants ────────────────────────────────────────────────────────────────
const TEST_MARKER = '##TEST_ACCOUNT##';
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
let isFlagged = false;
let currentProfile = null;

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

/** Check if a profile description contains the test account marker. */
function hasTestFlag(profile) {
  return profile?.description?.includes(TEST_MARKER) || false;
}

/** Strip the test marker from description text. */
function stripTestFlag(description) {
  if (!description) return '';
  return description.replace(TEST_MARKER, '').replace(/\n{3,}/g, '\n\n').trim();
}

/** Add the test marker to description text, preserving existing content. */
function addTestFlag(description) {
  const clean = stripTestFlag(description);
  return clean ? `${clean}\n\n${TEST_MARKER}` : TEST_MARKER;
}

/** Pin updated profile to IPFS and update the on-chain CID. */
async function updateProfile(updatedFields) {
  // Preserve all existing profile fields
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

function renderStatus() {
  const badge = $('status-badge');
  const text = $('status-text');
  const desc = $('status-description');
  const btnFlag = $('btn-flag');
  const btnUnflag = $('btn-unflag');

  if (isFlagged) {
    badge.className = 'status-badge flagged';
    text.textContent = 'Flagged as test account';
    desc.textContent = 'This account is marked as a test account. It will be excluded from analytics and TMS group additions.';
    btnFlag.style.display = 'none';
    btnUnflag.style.display = '';
  } else {
    badge.className = 'status-badge unflagged';
    text.textContent = 'Not flagged';
    desc.textContent = 'This account is not flagged. If this is a test or bot account, flag it to keep analytics clean.';
    btnFlag.style.display = '';
    btnUnflag.style.display = 'none';
  }

  $('action-result').classList.add('hidden');
}

// ── Actions ──────────────────────────────────────────────────────────────────

async function flagAccount() {
  const btn = $('btn-flag');
  setLoading(btn, true, 'Flagging');

  try {
    const newDesc = addTestFlag(currentProfile?.description);
    await updateProfile({ description: newDesc });

    isFlagged = true;
    // Update local profile cache
    if (currentProfile) currentProfile.description = newDesc;

    renderStatus();
    showToast('Account flagged as test account', 'success');
  } catch (err) {
    console.error('Flag failed:', err);
    const msg = err.message?.includes('rejected') ? 'Transaction cancelled' : `Failed: ${err.message || err}`;
    const resultEl = $('action-result');
    resultEl.className = 'result result-error';
    resultEl.textContent = msg;
    resultEl.classList.remove('hidden');
  } finally {
    setLoading(btn, false, 'Flag as Test Account');
  }
}

async function unflagAccount() {
  const btn = $('btn-unflag');
  setLoading(btn, true, 'Removing flag');

  try {
    const newDesc = stripTestFlag(currentProfile?.description);
    await updateProfile({ description: newDesc });

    isFlagged = false;
    if (currentProfile) currentProfile.description = newDesc;

    renderStatus();
    showToast('Test flag removed', 'success');
  } catch (err) {
    console.error('Unflag failed:', err);
    const msg = err.message?.includes('rejected') ? 'Transaction cancelled' : `Failed: ${err.message || err}`;
    const resultEl = $('action-result');
    resultEl.className = 'result result-error';
    resultEl.textContent = msg;
    resultEl.classList.remove('hidden');
  } finally {
    setLoading(btn, false, 'Remove Test Flag');
  }
}

// ── Initialisation ───────────────────────────────────────────────────────────

async function initializeApp(address) {
  showView('loading-view');

  try {
    const runner = createRunner(address);
    sdk = new Sdk(undefined, runner);

    // Fetch profile
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
    isFlagged = hasTestFlag(profile);

    showView('connected-view');
    renderStatus();
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
    isFlagged = false;
    $('wallet-status').textContent = 'Not connected';
    showView('disconnected-view');
    return;
  }

  connectedAddress = getAddress(address);
  $('wallet-status').textContent = `${connectedAddress.slice(0, 6)}…${connectedAddress.slice(-4)}`;
  await initializeApp(connectedAddress);
});

// ── Event listeners ──────────────────────────────────────────────────────────

$('btn-flag')?.addEventListener('click', flagAccount);
$('btn-unflag')?.addEventListener('click', unflagAccount);
