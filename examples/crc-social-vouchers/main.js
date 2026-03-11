/**
 * CRC Social Vouchers - Gift vouchers redeemable for Circles
 * 
 * Features:
 * - Create vouchers with CRC amount and message
 * - Generate shareable links/QR codes
 * - Redeem vouchers for CRC via Hub V2 transfer
 */
import { onWalletChange, sendTransactions } from './miniapp-sdk.js';
import { Sdk } from '@aboutcircles/sdk';
import { createPublicClient, http, getAddress, encodeFunctionData, parseUnits, formatUnits } from 'viem';
import { gnosis } from 'viem/chains';

const HUB_V2_ADDRESS = '0xc12C1E50ABB450d6205Ea2C3Fa861b3B834d13e8';
const RPC_URL = 'https://rpc.aboutcircles.com/';

const HUB_TRANSFER_ABI = [{
  type: 'function',
  name: 'safeTransferFrom',
  inputs: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'id', type: 'uint256' },
    { name: 'value', type: 'uint256' },
    { name: 'data', type: 'bytes' },
  ],
}];

let connectedAddress = null;
let userProfile = null;
let userBalance = 0n;
let vouchers = [];
let pendingVoucherId = null;

const publicClient = createPublicClient({
  chain: gnosis,
  transport: http(RPC_URL),
  cacheTime: 60_000,
  batch: { multicall: { wait: 50 } },
});

const sdk = new Sdk(RPC_URL, null);

const $ = (id) => document.getElementById(id);

function showView(id) {
  document.querySelectorAll('.view').forEach((el) => el.classList.add('hidden'));
  $(id)?.classList.remove('hidden');
}

function showToast(message, type = 'info', ms = 5000) {
  document.querySelector('.toast')?.remove();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), ms);
}

function formatCrc(wei) {
  const value = typeof wei === 'bigint' ? wei : BigInt(wei || 0);
  return parseFloat(formatUnits(value, 18)).toFixed(2);
}

function formatAddress(address) {
  if (!address) return 'Unknown';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
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
  return msg.includes('passkey') || msg.includes('auto connect') || 
         (msg.includes('wallet address') && msg.includes('retrieve'));
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function loadVouchers() {
  try {
    const stored = localStorage.getItem('crc_vouchers');
    vouchers = stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error('Failed to load vouchers:', err);
    vouchers = [];
  }
}

function saveVouchers() {
  try {
    localStorage.setItem('crc_vouchers', JSON.stringify(vouchers));
  } catch (err) {
    console.error('Failed to save vouchers:', err);
    showToast('Failed to save voucher data', 'error');
  }
}

function generateVoucherId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function getVoucherUrl(voucherId) {
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?voucher=${voucherId}`;
}

async function loadUserProfile(address) {
  try {
    const profile = await sdk.rpc.profile.getProfileByAddress(address);
    const avatar = await sdk.getAvatar(address);
    
    userProfile = {
      address,
      name: profile?.name || profile?.registeredName || formatAddress(address),
    };
    
    if (avatar) {
      const balances = await avatar.balances.getTokenBalances();
      userBalance = balances.reduce((sum, b) => sum + BigInt(b.attoCircles || 0n), 0n);
    } else {
      userBalance = 0n;
    }
    
    updateBalanceDisplay();
  } catch (err) {
    console.error('Failed to load profile:', err);
    userProfile = { address, name: formatAddress(address) };
    userBalance = 0n;
  }
}

function updateBalanceDisplay() {
  const balanceEl = $('user-balance');
  const hintEl = $('balance-hint');
  if (balanceEl) balanceEl.textContent = `${formatCrc(userBalance)} CRC`;
  if (hintEl) hintEl.textContent = `${formatCrc(userBalance)} CRC available`;
}

function renderCreateForm() {
  return `
    <div class="card">
      <h2>Create a Gift Voucher</h2>
      <p style="color: var(--muted); margin-bottom: 16px; font-size: 14px;">
        Create a voucher that anyone can redeem for your CRC.
      </p>
      
      <form id="voucher-form">
        <div class="field">
          <label for="voucher-amount">Amount (CRC)</label>
          <input type="number" id="voucher-amount" step="0.01" min="0.01" placeholder="5.00" required />
        </div>
        
        <div class="field">
          <label for="voucher-message">Message (optional)</label>
          <textarea id="voucher-message" rows="2" placeholder="Happy birthday! Enjoy some CRC..."></textarea>
        </div>
        
        <div class="field">
          <label for="voucher-expiry">Expiry (optional)</label>
          <input type="datetime-local" id="voucher-expiry" />
        </div>
        
        <div id="balance-hint" style="font-size: 12px; color: var(--muted); margin: 8px 0 12px;">
          ${formatCrc(userBalance)} CRC available
        </div>
        
        <button type="submit" class="btn">Create Voucher</button>
      </form>
    </div>
    
    <div class="card">
      <h2>My Vouchers</h2>
      <div id="my-vouchers-list"></div>
    </div>
  `;
}

function renderRedeemView(voucher) {
  const isExpired = voucher.expiresAt && voucher.expiresAt < Date.now();
  const isClaimed = !!voucher.claimedBy;
  
  let statusClass = '';
  let statusText = '';
  
  if (isClaimed) {
    statusClass = 'badge-warn';
    statusText = 'Already Redeemed';
  } else if (isExpired) {
    statusClass = 'badge-error';
    statusText = 'Expired';
  } else {
    statusClass = 'badge-success';
    statusText = 'Available';
  }
  
  return `
    <div class="card voucher-display">
      <div style="text-align: center; margin-bottom: 20px;">
        <div class="voucher-amount">${voucher.amountDisplay}</div>
        <div class="voucher-label">CRC Gift Voucher</div>
      </div>
      
      ${voucher.message ? `
        <div class="voucher-message">
          <p>"${escapeHtml(voucher.message)}"</p>
        </div>
      ` : ''}
      
      <div class="voucher-info">
        <div class="voucher-info-row">
          <span>From</span>
          <span>${voucher.creatorName}</span>
        </div>
        ${voucher.expiresAt ? `
          <div class="voucher-info-row">
            <span>Expires</span>
            <span>${new Date(voucher.expiresAt).toLocaleDateString()}</span>
          </div>
        ` : ''}
        <div class="voucher-info-row">
          <span>Status</span>
          <span class="badge ${statusClass}">${statusText}</span>
        </div>
      </div>
      
      <div id="redeem-action"></div>
    </div>
  `;
}

function renderVoucherCard(voucher, isCreator = false) {
  const isExpired = voucher.expiresAt && voucher.expiresAt < Date.now();
  const isClaimed = !!voucher.claimedBy;
  
  let statusBadge = '';
  if (isClaimed) {
    statusBadge = `<span class="badge badge-warn">Redeemed by ${formatAddress(voucher.claimedBy)}</span>`;
  } else if (isExpired) {
    statusBadge = `<span class="badge badge-error">Expired</span>`;
  } else {
    statusBadge = `<span class="badge badge-success">Active</span>`;
  }
  
  return `
    <div class="voucher-card" data-voucher-id="${voucher.id}">
      <div class="voucher-card-header">
        <span class="voucher-card-amount">${voucher.amountDisplay}</span>
        ${statusBadge}
      </div>
      ${voucher.message ? `<p class="voucher-card-message">"${escapeHtml(voucher.message.slice(0, 50))}${voucher.message.length > 50 ? '...' : ''}"</p>` : ''}
      <div class="voucher-card-meta">
        <span>ID: ${voucher.id}</span>
        <span>${new Date(voucher.createdAt).toLocaleDateString()}</span>
      </div>
      ${!isClaimed && !isExpired && isCreator ? `
        <button class="btn btn-secondary btn-inline copy-link-btn" data-voucher-id="${voucher.id}">
          Copy Link
        </button>
      ` : ''}
    </div>
  `;
}

function renderMyVouchers() {
  const myVouchers = vouchers.filter(v => v.creator === connectedAddress);
  
  if (myVouchers.length === 0) {
    $('my-vouchers-list').innerHTML = '<div class="empty-state">You haven\'t created any vouchers yet.</div>';
    return;
  }
  
  const sorted = myVouchers.sort((a, b) => b.createdAt - a.createdAt);
  $('my-vouchers-list').innerHTML = sorted.map(v => renderVoucherCard(v, true)).join('');
  
  document.querySelectorAll('.copy-link-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const voucherId = btn.dataset.voucherId;
      const url = getVoucherUrl(voucherId);
      navigator.clipboard.writeText(url).then(() => {
        showToast('Link copied to clipboard!', 'success');
      }).catch(() => {
        showToast('Failed to copy link', 'error');
      });
    });
  });
}

function renderCreatedSuccess(voucher) {
  const url = getVoucherUrl(voucher.id);
  
  return `
    <div class="card">
      <div style="text-align: center;">
        <div style="font-size: 48px; margin-bottom: 12px;">🎁</div>
        <h2 style="font-size: 20px; margin-bottom: 8px;">Voucher Created!</h2>
        <p style="color: var(--muted); margin-bottom: 20px;">
          Share this link with the recipient:
        </p>
        
        <div class="voucher-link-box">
          <input type="text" value="${url}" readonly id="voucher-link-input" />
          <button class="btn btn-inline btn-secondary" onclick="window.copyVoucherLink()">Copy</button>
        </div>
        
        <div class="qr-container">
          <div id="qr-code"></div>
        </div>
        
        <button class="btn btn-secondary" onclick="window.backToCreate()" style="margin-top: 16px;">
          Create Another
        </button>
      </div>
    </div>
  `;
}

window.copyVoucherLink = function() {
  const input = $('voucher-link-input');
  input.select();
  navigator.clipboard.writeText(input.value).then(() => {
    showToast('Link copied!', 'success');
  }).catch(() => {
    showToast('Failed to copy', 'error');
  });
};

window.backToCreate = function() {
  showCreateMode();
};

function showCreateMode() {
  $('connected-view').innerHTML = renderCreateForm();
  setupCreateForm();
  renderMyVouchers();
}

function setupCreateForm() {
  const form = $('voucher-form');
  const expiryInput = $('voucher-expiry');
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  expiryInput.min = tomorrow.toISOString().slice(0, 16);
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const amountStr = $('voucher-amount').value;
    const message = $('voucher-message').value.trim();
    const expiryStr = $('voucher-expiry').value;
    
    const amount = parseUnits(amountStr, 18);
    
    if (amount > userBalance) {
      return showToast(`Insufficient balance. You have ${formatCrc(userBalance)} CRC`, 'error');
    }
    
    if (amount <= 0n) {
      return showToast('Amount must be greater than 0', 'error');
    }
    
    const expiresAt = expiryStr ? new Date(expiryStr).getTime() : null;
    if (expiresAt && expiresAt <= Date.now()) {
      return showToast('Expiry must be in the future', 'error');
    }
    
    const voucher = {
      id: generateVoucherId(),
      creator: connectedAddress,
      creatorName: userProfile?.name || formatAddress(connectedAddress),
      amount: amount.toString(),
      amountDisplay: `${amountStr} CRC`,
      message,
      expiresAt,
      createdAt: Date.now(),
      claimedBy: null,
      claimedAt: null,
      txHash: null,
    };
    
    vouchers.push(voucher);
    saveVouchers();
    
    $('connected-view').innerHTML = renderCreatedSuccess(voucher);
    generateQRCode(getVoucherUrl(voucher.id));
  });
}

function generateQRCode(text) {
  const qrContainer = $('qr-code');
  if (!qrContainer) return;
  
  const size = 150;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  canvas.style.borderRadius = '12px';
  
  import('https://esm.sh/qrcode-generator@1.4.4').then(QR => {
    const qr = QR.default(0, 'M');
    qr.addData(text);
    qr.make();
    
    const cellSize = size / qr.getModuleCount();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    
    ctx.fillStyle = '#05061a';
    for (let row = 0; row < qr.getModuleCount(); row++) {
      for (let col = 0; col < qr.getModuleCount(); col++) {
        if (qr.isDark(row, col)) {
          ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
      }
    }
    
    qrContainer.innerHTML = '';
    qrContainer.appendChild(canvas);
  }).catch(() => {
    qrContainer.innerHTML = '<p style="color: var(--muted); font-size: 12px;">QR code unavailable</p>';
  });
}

async function showRedeemMode(voucherId) {
  loadVouchers();
  const voucher = vouchers.find(v => v.id === voucherId);
  
  if (!voucher) {
    $('connected-view').innerHTML = `
      <div class="card">
        <div class="empty-state">
          <div style="font-size: 48px; margin-bottom: 12px;">❓</div>
          <h2>Voucher Not Found</h2>
          <p style="color: var(--muted);">This voucher doesn't exist or has been removed.</p>
        </div>
      </div>
    `;
    return;
  }
  
  $('connected-view').innerHTML = renderRedeemView(voucher);
  
  const isExpired = voucher.expiresAt && voucher.expiresAt < Date.now();
  const isClaimed = !!voucher.claimedBy;
  const isOwnVoucher = voucher.creator === connectedAddress;
  
  const actionContainer = $('redeem-action');
  
  if (isClaimed) {
    actionContainer.innerHTML = `
      <div class="result result-warn">
        This voucher was already redeemed by ${formatAddress(voucher.claimedBy)}.
      </div>
    `;
  } else if (isExpired) {
    actionContainer.innerHTML = `
      <div class="result result-error">
        This voucher has expired and can no longer be redeemed.
      </div>
    `;
  } else if (isOwnVoucher) {
    actionContainer.innerHTML = `
      <div class="result result-warn">
        You cannot redeem your own voucher.
      </div>
      <button class="btn btn-secondary" onclick="window.location.href=window.location.pathname" style="margin-top: 12px;">
        Go to My Vouchers
      </button>
    `;
  } else if (connectedAddress) {
    pendingVoucherId = voucherId;
    actionContainer.innerHTML = `
      <button class="btn" onclick="window.redeemVoucher()">
        Redeem ${voucher.amountDisplay}
      </button>
    `;
  }
}

window.redeemVoucher = async function() {
  if (!pendingVoucherId || !connectedAddress) return;
  
  const voucher = vouchers.find(v => v.id === pendingVoucherId);
  if (!voucher) return showToast('Voucher not found', 'error');
  
  const redeemBtn = document.querySelector('#redeem-action .btn:not(.btn-secondary)');
  if (redeemBtn) {
    redeemBtn.disabled = true;
    redeemBtn.textContent = 'Processing...';
  }
  
  try {
    const amountWei = BigInt(voucher.amount);
    const tokenId = BigInt(voucher.creator);
    
    const data = encodeFunctionData({
      abi: HUB_TRANSFER_ABI,
      functionName: 'safeTransferFrom',
      args: [voucher.creator, connectedAddress, tokenId, amountWei, '0x'],
    });
    
    const tx = {
      to: HUB_V2_ADDRESS,
      data,
      value: '0x0',
    };
    
    const hashes = await sendTransactions([tx]);
    const txHash = hashes[0];
    
    voucher.claimedBy = connectedAddress;
    voucher.claimedAt = Date.now();
    voucher.txHash = txHash;
    saveVouchers();
    
    const actionContainer = $('redeem-action');
    actionContainer.innerHTML = `
      <div class="result result-success">
        <strong>Success!</strong> You received ${voucher.amountDisplay} from ${voucher.creatorName}.
      </div>
      <a href="https://gnosisscan.io/tx/${txHash}" target="_blank" class="btn btn-secondary btn-inline" style="margin-top: 12px;">
        View Transaction
      </a>
    `;
    
    showToast('Voucher redeemed successfully!', 'success');
  } catch (err) {
    if (redeemBtn) {
      redeemBtn.disabled = false;
      redeemBtn.textContent = `Redeem ${voucher.amountDisplay}`;
    }
    
    if (isPasskeyAutoConnectError(err)) {
      showToast('Passkey connection failed. Please reconnect your wallet.', 'error');
    } else {
      showToast(`Redemption failed: ${decodeError(err)}`, 'error');
    }
  }
};

function checkUrlForVoucher() {
  const params = new URLSearchParams(window.location.search);
  return params.get('voucher');
}

async function initializeApp(address) {
  try {
    await loadUserProfile(address);
    
    const voucherId = checkUrlForVoucher();
    
    if (voucherId) {
      showRedeemMode(voucherId);
    } else {
      showCreateMode();
    }
  } catch (err) {
    console.error('Init error:', err);
    showToast('Failed to load app data', 'error');
  }
}

onWalletChange(async (address) => {
  if (!address) {
    connectedAddress = null;
    userProfile = null;
    userBalance = 0n;
    
    $('wallet-status').textContent = 'Not connected';
    $('wallet-status').className = 'badge';
    showView('disconnected-view');
    return;
  }
  
  connectedAddress = getAddress(address);
  $('wallet-status').textContent = `${connectedAddress.slice(0, 6)}…${connectedAddress.slice(-4)}`;
  $('wallet-status').className = 'badge badge-success';
  
  showView('connected-view');
  await initializeApp(connectedAddress);
});
