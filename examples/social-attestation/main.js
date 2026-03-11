import { onWalletChange, sendTransactions, signMessage } from './miniapp-sdk.js';
import { Sdk } from '@aboutcircles/sdk';
import { getAddress, encodeFunctionData } from 'viem';
import { cidV0ToHex } from '@aboutcircles/sdk-utils';

let connectedAddress = null;
let sdk = null;
let currentAttestation = null;

const $ = (id) => document.getElementById(id);
const ATTESTATION_MARKER = '##ATTESTATIONS##';

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

function showResult(type, html) {
  const el = $('result');
  el.className = `result result-${type}`;
  el.innerHTML = html;
  el.classList.remove('hidden');
}

function hideResult() {
  $('result').classList.add('hidden');
}

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

async function loadExistingAttestations() {
  try {
    const profile = await sdk.rpc.profile.getProfileByAddress(connectedAddress);
    let attestations = [];
    
    // Parse attestations from description field
    if (profile?.description?.includes(ATTESTATION_MARKER)) {
      try {
        const attestationJson = profile.description.split(ATTESTATION_MARKER)[1].trim();
        attestations = JSON.parse(attestationJson);
      } catch (e) {
        console.error('Failed to parse attestations:', e);
      }
    }
    
    const listEl = $('my-attestations-list');
    if (!attestations || attestations.length === 0) {
      listEl.innerHTML = '<p class="empty-attestations">No attestations yet. Create one above.</p>';
    } else {
      listEl.innerHTML = attestations.map(att => `
        <div class="attestation-item">
          <span class="att-platform ${att.platform}">${att.platform}</span>
          <span class="att-handle">@${att.handle}</span>
          <span class="att-date">${new Date(att.timestamp).toLocaleDateString()}</span>
        </div>
      `).join('');
    }
    $('my-attestations-card').classList.remove('hidden');
  } catch (err) {
    console.error('Failed to load attestations:', err);
    $('my-attestations-card').classList.add('hidden');
  }
}

function showAttestationForm(platform) {
  $('platform-input').value = platform;
  $('handle-input').value = '';
  $('attestation-form').classList.remove('hidden');
  $('handle-input').focus();
  $('handle-input').placeholder = `Enter your ${platform} username`;
}

function hideAttestationForm() {
  $('attestation-form').classList.add('hidden');
}

async function createAttestation() {
  const platform = $('platform-input').value;
  const handle = $('handle-input').value.trim().replace(/^@/, '');
  
  if (!handle) {
    showToast('Please enter a username', 'error');
    return;
  }
  
  const btn = $('btn-create-attestation');
  btn.disabled = true;
  btn.textContent = 'Signing...';
  
  try {
    const timestamp = new Date().toISOString();
    const message = `Circles Attestation

I attest that I own the account @${handle} on ${platform}

Wallet: ${connectedAddress}
Timestamp: ${timestamp}`;

    const signature = await signMessage(message);
    
    currentAttestation = {
      platform,
      handle,
      timestamp,
      message,
      signature,
    };
    
    $('attestation-preview').innerHTML = `
      <div class="att-preview-content">
        <span class="att-platform ${platform}">${platform}</span>
        <span class="att-handle">@${handle}</span>
      </div>
      <p class="att-desc">Click "Add to Profile" to store this attestation in your Circles profile.</p>
    `;
    $('attestation-card').classList.remove('hidden');
    hideAttestationForm();
    
  } catch (err) {
    console.error('Signing failed:', err);
    if (err.message?.includes('rejected')) {
      showToast('Signing cancelled', 'error');
    } else {
      showToast(`Signing failed: ${err.message || err}`, 'error');
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign Attestation';
  }
}

async function addToProfile() {
  if (!currentAttestation) return;
  
  const btn = $('btn-add-profile');
  btn.disabled = true;
  btn.textContent = 'Adding to profile...';
  
  try {
    const profile = await sdk.rpc.profile.getProfileByAddress(connectedAddress);
    
    // Parse existing attestations from description
    let existingAttestations = [];
    const existingDesc = profile?.description || '';
    if (existingDesc.includes(ATTESTATION_MARKER)) {
      try {
        const attestationJson = existingDesc.split(ATTESTATION_MARKER)[1].trim();
        existingAttestations = JSON.parse(attestationJson);
      } catch (e) {}
    }
    
    // Filter out duplicate for same platform+handle
    const filtered = existingAttestations.filter(
      (a) => !(a.platform === currentAttestation.platform && a.handle === currentAttestation.handle)
    );
    
    const allAttestations = [
      ...filtered,
      {
        platform: currentAttestation.platform,
        handle: currentAttestation.handle,
        timestamp: currentAttestation.timestamp,
        message: currentAttestation.message,
        signature: currentAttestation.signature,
      },
    ];
    
    // Build new description with attestations
    const descWithoutAttestations = existingDesc.split(ATTESTATION_MARKER)[0].trim();
    const updatedDescription = allAttestations.length > 0
      ? `${descWithoutAttestations}\n\n${ATTESTATION_MARKER}\n${JSON.stringify(allAttestations)}`
      : descWithoutAttestations;
    
    const updatedProfile = {
      name: profile?.name || '',
      description: updatedDescription.trim(),
      previewImageUrl: profile?.previewImageUrl,
    };
    
    console.log('Profile to pin:', JSON.stringify(updatedProfile, null, 2));
    
    const profileCid = await sdk.profiles.create(updatedProfile);
    console.log('New CID:', profileCid);
    const metadataDigest = cidV0ToHex(profileCid);
    
    const nameRegistryAddress = '0xA27566fD89162cC3D40Cb59c87AAaA49B85F3474';
    const updateAbi = [{
      type: 'function',
      name: 'updateMetadataDigest',
      inputs: [{ name: 'metadataDigest', type: 'bytes32' }],
      stateMutability: 'nonpayable'
    }];
    
    const data = encodeFunctionData({
      abi: updateAbi,
      functionName: 'updateMetadataDigest',
      args: [metadataDigest],
    });
    
    const runner = createRunner(connectedAddress);
    await runner.sendTransaction([{ to: nameRegistryAddress, data, value: 0n }]);
    
    showResult('success', 'Attestation added to your profile! Others can now see it.');
    $('attestation-card').classList.add('hidden');
    currentAttestation = null;
    
    await loadExistingAttestations();
  } catch (err) {
    console.error('Failed to add attestation:', err);
    showResult('error', `Failed: ${err.message || err}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add to Profile';
  }
}

function setupEventListeners() {
  ['github', 'twitter', 'discord'].forEach((platform) => {
    $(`btn-${platform}`)?.addEventListener('click', () => showAttestationForm(platform));
  });
  
  $('btn-create-attestation')?.addEventListener('click', createAttestation);
  $('btn-cancel-attestation')?.addEventListener('click', hideAttestationForm);
  $('btn-add-profile')?.addEventListener('click', addToProfile);
  $('btn-skip')?.addEventListener('click', () => {
    $('attestation-card').classList.add('hidden');
    currentAttestation = null;
  });
  
  $('handle-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') createAttestation();
    if (e.key === 'Escape') hideAttestationForm();
  });
}

async function initializeApp(address) {
  try {
    const runner = createRunner(address);
    sdk = new Sdk(undefined, runner);
    
    showView('connected-view');
    hideResult();
    
    await loadExistingAttestations();
  } catch (err) {
    console.error('Init error:', err);
    showToast('Failed to load app', 'error');
  }
}

onWalletChange(async (address) => {
  if (!address) {
    connectedAddress = null;
    sdk = null;
    $('wallet-status').textContent = 'Not connected';
    showView('disconnected-view');
    return;
  }
  
  connectedAddress = getAddress(address);
  $('wallet-status').textContent = `${connectedAddress.slice(0, 6)}…${connectedAddress.slice(-4)}`;
  await initializeApp(connectedAddress);
});

setupEventListeners();
