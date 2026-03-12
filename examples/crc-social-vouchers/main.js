/**
 * CRC Social Vouchers - Gift vouchers redeemable for Circles
 *
 * Voucher data is base64-encoded in the URL — no backend or shared storage needed.
 *
 * Flow:
 *   1. Creator fills form → voucher JSON encoded as base64 in ?v= param → share link
 *   2. Recipient opens URL → sees voucher → connects wallet →
 *      clicks "Request Redemption" → gets a CLAIM URL (?v=...&claim=recipientAddress)
 *   3. Recipient shares claim URL with creator (copy button)
 *   4. Creator opens claim URL → sees recipient → clicks "Send CRC" →
 *      safeTransferFrom(creator → recipient) signed by creator's wallet ✓
 *
 * This design solves both critical issues from the original:
 *   - No localStorage sharing problem (voucher data is in the URL)
 *   - No ERC-1155 auth error (creator's wallet signs the transfer, not recipient's)
 */
import { onWalletChange, sendTransactions } from './miniapp-sdk.js';
import { Sdk } from '@aboutcircles/sdk';
import { createPublicClient, http, getAddress, encodeFunctionData, parseUnits, formatUnits } from 'viem';
import { gnosis } from 'viem/chains';

// ── Constants ─────────────────────────────────────────────────────────────
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

// ── State ──────────────────────────────────────────────────────────────────
let connectedAddress = null;
let userProfile = null;
let userBalance = 0n;

const sdk = new Sdk(RPC_URL, null);

createPublicClient({
  chain: gnosis,
  transport: http(RPC_URL),
  cacheTime: 60_000,
  batch: { multicall: { wait: 50 } },
});

// ── UI Helpers ─────────────────────────────────────────────────────────────
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

function showProcessing(message = 'Processing...') {
  const overlay = $('processing-overlay');
  const msg = $('processing-message');
  if (msg) msg.textContent = message;
  if (overlay) overlay.classList.remove('hidden');
}

function hideProcessing() {
  $('processing-overlay')?.classList.add('hidden');
}

function formatCrc(wei) {
  const value = typeof wei === 'bigint' ? wei : BigInt(wei || 0);
  return parseFloat(formatUnits(value, 18)).toFixed(2);
}

function formatAddress(address) {
  if (!address) return 'Unknown';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = String(text || '');
  return div.innerHTML;
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

// ── Copy helper (works in iframe where navigator.clipboard may be blocked) ─
async function copyToClipboard(text, successMsg = 'Copied!') {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMsg, 'success');
    return true;
  } catch {
    // Fallback: show a modal with the text for manual copy
    showCopyFallback(text);
    return false;
  }
}

function showCopyFallback(text) {
  const existing = $('copy-fallback-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'copy-fallback-modal';
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;
    display:flex;align-items:center;justify-content:center;padding:16px;
  `;
  modal.innerHTML = `
    <div style="background:var(--surface,#1a1b2e);border-radius:12px;padding:20px;width:100%;max-width:420px;">
      <p style="font-size:14px;color:var(--muted);margin-bottom:10px;">
        Tap below and copy the full URL manually:
      </p>
      <input id="copy-fallback-input" type="text" readonly
        value="${escapeHtml(text)}"
        style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border,#333);
               background:var(--bg,#0d0e1f);color:var(--text,#fff);font-size:12px;
               word-break:break-all;" />
      <button onclick="document.getElementById('copy-fallback-input').select()"
        class="btn btn-secondary" style="margin-top:10px;width:100%;">
        Select All
      </button>
      <button onclick="document.getElementById('copy-fallback-modal').remove()"
        class="btn" style="margin-top:8px;width:100%;">
        Done
      </button>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => {
    const input = $('copy-fallback-input');
    if (input) { input.focus(); input.select(); }
  }, 50);
}

// ── URL / Voucher encoding ─────────────────────────────────────────────────
function encodeVoucher(voucher) {
  const json = JSON.stringify(voucher);
  return btoa(unescape(encodeURIComponent(json)));
}

function decodeVoucher(b64) {
  try {
    const json = decodeURIComponent(escape(atob(b64)));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function buildVoucherUrl(voucher) {
  const base = window.location.origin + window.location.pathname;
  return `${base}?v=${encodeVoucher(voucher)}`;
}

function buildClaimUrl(voucher, recipientAddress) {
  const base = window.location.origin + window.location.pathname;
  return `${base}?v=${encodeVoucher(voucher)}&claim=${recipientAddress}`;
}

function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const v = params.get('v');
  const claim = params.get('claim');
  return {
    voucher: v ? decodeVoucher(v) : null,
    rawV: v,
    claimAddress: claim || null,
  };
}

// ── localStorage — track redeemed vouchers (on creator's device only) ─────
function getRedeemedVouchers() {
  try {
    return JSON.parse(localStorage.getItem('crc_vouchers_redeemed') || '{}');
  } catch { return {}; }
}

function markVoucherRedeemed(voucherId, txHash) {
  const redeemed = getRedeemedVouchers();
  redeemed[voucherId] = { txHash, at: Date.now() };
  try {
    localStorage.setItem('crc_vouchers_redeemed', JSON.stringify(redeemed));
  } catch { /* ignore */ }
}

function isVoucherRedeemed(voucherId) {
  return !!getRedeemedVouchers()[voucherId];
}

// ── localStorage — creator's own voucher list (for "My Vouchers") ─────────
function getMyVouchers() {
  try {
    return JSON.parse(localStorage.getItem('crc_my_vouchers') || '[]');
  } catch { return []; }
}

function saveMyVoucher(voucher) {
  const list = getMyVouchers();
  list.unshift(voucher);
  try {
    localStorage.setItem('crc_my_vouchers', JSON.stringify(list.slice(0, 50)));
  } catch { /* ignore */ }
}

// ── Profile & Balance ──────────────────────────────────────────────────────
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
  const el = $('balance-hint');
  if (el) el.textContent = `${formatCrc(userBalance)} CRC available`;
}

// ── View: Create form ──────────────────────────────────────────────────────
function showCreateMode() {
  // Clear URL params without reloading (avoids blocked window.location.href)
  if (window.history?.replaceState) {
    window.history.replaceState({}, '', window.location.pathname);
  }

  $('connected-view').innerHTML = `
    <div class="card">
      <h2>Create a Gift Voucher</h2>
      <p style="color:var(--muted);margin-bottom:16px;font-size:14px;">
        Create a voucher that a specific recipient can request — you'll send the CRC when you approve.
      </p>

      <form id="voucher-form">
        <div class="field">
          <label for="voucher-amount">Amount (CRC)</label>
          <input type="number" id="voucher-amount" step="0.01" min="0.01" placeholder="5.00" required />
        </div>

        <div class="field">
          <label for="voucher-message">Message (optional)</label>
          <textarea id="voucher-message" rows="2" placeholder="Happy birthday! Enjoy some CRC…"></textarea>
        </div>

        <div class="field">
          <label for="voucher-expiry">Expiry (optional)</label>
          <input type="datetime-local" id="voucher-expiry" />
        </div>

        <div id="balance-hint" style="font-size:12px;color:var(--muted);margin:8px 0 12px;">
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
    };

    saveMyVoucher(voucher);
    showCreatedSuccess(voucher);
  });
}

function generateVoucherId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 8; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
  return id;
}

function renderMyVouchers() {
  const list = getMyVouchers().filter(v => v.creator === connectedAddress);
  const redeemed = getRedeemedVouchers();

  if (list.length === 0) {
    $('my-vouchers-list').innerHTML = '<div class="empty-state">You haven\'t created any vouchers yet.</div>';
    return;
  }

  $('my-vouchers-list').innerHTML = list.map(v => {
    const isRedeemed = !!redeemed[v.id];
    const isExpired = v.expiresAt && v.expiresAt < Date.now();
    let badge = isRedeemed
      ? `<span class="badge badge-warn">Redeemed</span>`
      : isExpired
        ? `<span class="badge badge-error">Expired</span>`
        : `<span class="badge badge-success">Active</span>`;

    return `
      <div class="voucher-card">
        <div class="voucher-card-header">
          <span class="voucher-card-amount">${v.amountDisplay}</span>
          ${badge}
        </div>
        ${v.message ? `<p class="voucher-card-message">"${escapeHtml(v.message.slice(0, 50))}${v.message.length > 50 ? '…' : ''}"</p>` : ''}
        <div class="voucher-card-meta">
          <span>ID: ${v.id}</span>
          <span>${new Date(v.createdAt).toLocaleDateString()}</span>
        </div>
        ${!isRedeemed && !isExpired ? `
          <button class="btn btn-secondary btn-inline copy-voucher-link"
            data-voucher='${escapeHtml(JSON.stringify(v))}'>
            Copy Voucher Link
          </button>
        ` : ''}
      </div>
    `;
  }).join('');

  document.querySelectorAll('.copy-voucher-link').forEach(btn => {
    btn.addEventListener('click', () => {
      try {
        const v = JSON.parse(btn.dataset.voucher);
        copyToClipboard(buildVoucherUrl(v), 'Voucher link copied!');
      } catch { showToast('Failed to build link', 'error'); }
    });
  });
}

function showCreatedSuccess(voucher) {
  const url = buildVoucherUrl(voucher);
  $('connected-view').innerHTML = `
    <div class="card">
      <div style="text-align:center;">
        <div style="font-size:48px;margin-bottom:12px;">🎁</div>
        <h2 style="font-size:20px;margin-bottom:8px;">Voucher Created!</h2>
        <p style="color:var(--muted);margin-bottom:6px;font-size:14px;">
          Share this link. The recipient will use it to request the CRC — you'll then approve the payout.
        </p>
        <p style="color:var(--muted);margin-bottom:20px;font-size:13px;">
          ⚠️ You must open the <strong>claim URL</strong> the recipient sends back to complete the transfer.
        </p>

        <div class="voucher-link-box" style="margin-bottom:16px;">
          <input type="text" value="${escapeHtml(url)}" readonly
            id="voucher-link-input"
            style="font-size:11px;padding:8px;flex:1;" />
          <button class="btn btn-inline btn-secondary" id="copy-voucher-btn">Copy</button>
        </div>

        <div class="qr-container">
          <div id="qr-code"></div>
        </div>

        <button class="btn btn-secondary" id="create-another-btn" style="margin-top:16px;">
          Create Another
        </button>
      </div>
    </div>
  `;

  $('copy-voucher-btn').addEventListener('click', () => {
    copyToClipboard(url, 'Voucher link copied!');
  });
  $('create-another-btn').addEventListener('click', () => showCreateMode());
  generateQRCode(url, 'qr-code');
}

// ── View: Recipient sees voucher ──────────────────────────────────────────
function showRecipientView(voucher, rawV) {
  const isExpired = voucher.expiresAt && voucher.expiresAt < Date.now();
  const isOwnVoucher = voucher.creator === connectedAddress;
  const isRedeemed = isVoucherRedeemed(voucher.id);

  let statusBadge = isRedeemed
    ? `<span class="badge badge-warn">Already Redeemed</span>`
    : isExpired
      ? `<span class="badge badge-error">Expired</span>`
      : `<span class="badge badge-success">Available</span>`;

  $('connected-view').innerHTML = `
    <div class="card voucher-display">
      <div style="text-align:center;margin-bottom:20px;">
        <div class="voucher-amount">${escapeHtml(voucher.amountDisplay)}</div>
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
          <span>${escapeHtml(voucher.creatorName || formatAddress(voucher.creator))}</span>
        </div>
        ${voucher.expiresAt ? `
          <div class="voucher-info-row">
            <span>Expires</span>
            <span>${new Date(voucher.expiresAt).toLocaleDateString()}</span>
          </div>
        ` : ''}
        <div class="voucher-info-row">
          <span>Status</span>
          <span>${statusBadge}</span>
        </div>
      </div>

      <div id="recipient-action" style="margin-top:16px;"></div>
    </div>
  `;

  const actionEl = $('recipient-action');

  if (isRedeemed) {
    actionEl.innerHTML = `<div class="result result-warn">This voucher has already been redeemed.</div>`;
    return;
  }
  if (isExpired) {
    actionEl.innerHTML = `<div class="result result-error">This voucher has expired.</div>`;
    return;
  }
  if (isOwnVoucher) {
    actionEl.innerHTML = `
      <div class="result result-warn">You cannot redeem your own voucher.</div>
      <button class="btn btn-secondary" id="go-home-btn" style="margin-top:12px;">
        Go to My Vouchers
      </button>
    `;
    $('go-home-btn').addEventListener('click', () => showCreateMode());
    return;
  }

  // Recipient requests redemption: generate claim URL for creator
  const claimUrl = buildClaimUrl(voucher, connectedAddress);
  actionEl.innerHTML = `
    <p style="font-size:13px;color:var(--muted);margin-bottom:12px;">
      To receive this voucher, copy the <strong>claim URL</strong> below and send it to
      <strong>${escapeHtml(voucher.creatorName || formatAddress(voucher.creator))}</strong>.
      They will open it with their wallet to send you the CRC.
    </p>
    <div class="voucher-link-box" style="margin-bottom:12px;">
      <input type="text" value="${escapeHtml(claimUrl)}" readonly
        id="claim-url-input" style="font-size:11px;padding:8px;flex:1;" />
      <button class="btn btn-inline" id="copy-claim-btn">Copy Claim URL</button>
    </div>
    <p style="font-size:12px;color:var(--muted);">
      ℹ️ Send this URL to the creator. Once they open it and approve, you'll receive
      ${escapeHtml(voucher.amountDisplay)}.
    </p>
  `;

  $('copy-claim-btn').addEventListener('click', () => {
    copyToClipboard(claimUrl, 'Claim URL copied! Send it to the voucher creator.');
  });
  generateQRCode(claimUrl, null); // No QR needed here — text copy is sufficient
}

// ── View: Creator approves claim ──────────────────────────────────────────
function showCreatorClaimView(voucher, recipientAddress) {
  const isExpired = voucher.expiresAt && voucher.expiresAt < Date.now();
  const isRedeemed = isVoucherRedeemed(voucher.id);

  $('connected-view').innerHTML = `
    <div class="card voucher-display">
      <div style="text-align:center;margin-bottom:20px;">
        <div class="voucher-amount">${escapeHtml(voucher.amountDisplay)}</div>
        <div class="voucher-label">Redemption Request</div>
      </div>

      <div class="voucher-info">
        <div class="voucher-info-row">
          <span>Your voucher</span>
          <span>ID: ${escapeHtml(voucher.id)}</span>
        </div>
        <div class="voucher-info-row">
          <span>Recipient</span>
          <span>${formatAddress(recipientAddress)}</span>
        </div>
        <div class="voucher-info-row">
          <span>Amount to send</span>
          <span>${escapeHtml(voucher.amountDisplay)}</span>
        </div>
      </div>

      <div id="creator-claim-action" style="margin-top:16px;"></div>
    </div>
  `;

  const actionEl = $('creator-claim-action');

  if (isRedeemed) {
    actionEl.innerHTML = `<div class="result result-warn">This voucher has already been redeemed.</div>`;
    return;
  }
  if (isExpired) {
    actionEl.innerHTML = `<div class="result result-error">This voucher has expired and cannot be redeemed.</div>`;
    return;
  }

  actionEl.innerHTML = `
    <p style="font-size:13px;color:var(--muted);margin-bottom:16px;">
      Clicking "Send CRC" will transfer ${escapeHtml(voucher.amountDisplay)} of your personal CRC
      to the recipient's wallet.
    </p>
    <button class="btn" id="send-crc-btn">Send ${escapeHtml(voucher.amountDisplay)} CRC</button>
    <button class="btn btn-secondary" id="decline-claim-btn" style="margin-top:8px;">Decline</button>
  `;

  $('send-crc-btn').addEventListener('click', () => executeCreatorTransfer(voucher, recipientAddress));
  $('decline-claim-btn').addEventListener('click', () => showCreateMode());
}

async function executeCreatorTransfer(voucher, recipientAddress) {
  showProcessing('Sending CRC…');

  try {
    const amountWei = BigInt(voucher.amount);
    // Token ID for personal CRC = BigInt(creatorAddress)
    const tokenId = BigInt(voucher.creator);

    const data = encodeFunctionData({
      abi: HUB_TRANSFER_ABI,
      functionName: 'safeTransferFrom',
      args: [voucher.creator, recipientAddress, tokenId, amountWei, '0x'],
    });

    const hashes = await sendTransactions([{ to: HUB_V2_ADDRESS, data, value: '0x0' }]);
    const txHash = hashes[0];

    markVoucherRedeemed(voucher.id, txHash);

    hideProcessing();

    const actionEl = $('creator-claim-action');
    if (actionEl) {
      actionEl.innerHTML = `
        <div class="result result-success">
          <strong>Done!</strong> Sent ${escapeHtml(voucher.amountDisplay)} to ${formatAddress(recipientAddress)}.
        </div>
        <a href="https://gnosisscan.io/tx/${txHash}" target="_blank"
          class="btn btn-secondary btn-inline" style="margin-top:12px;">
          View Transaction
        </a>
        <button class="btn btn-secondary" id="back-home-after-send" style="margin-top:8px;">
          Back to My Vouchers
        </button>
      `;
      $('back-home-after-send').addEventListener('click', () => showCreateMode());
    }

    showToast('CRC sent successfully!', 'success');
  } catch (err) {
    hideProcessing();
    if (isPasskeyAutoConnectError(err)) {
      showToast('Passkey connection failed. Please reconnect your wallet.', 'error');
    } else {
      showToast(`Transfer failed: ${decodeError(err)}`, 'error');
    }
  }
}

// ── QR Code generation ─────────────────────────────────────────────────────
function generateQRCode(text, containerId) {
  const qrContainer = containerId ? $(containerId) : $('qr-code');
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
    qrContainer.innerHTML = '<p style="color:var(--muted);font-size:12px;">QR unavailable</p>';
  });
}

// ── Initialisation ─────────────────────────────────────────────────────────
async function initializeApp(address) {
  try {
    await loadUserProfile(address);

    const { voucher, rawV, claimAddress } = getUrlParams();

    if (voucher && claimAddress) {
      // Creator opening a claim URL sent by recipient
      if (voucher.creator?.toLowerCase() === address.toLowerCase()) {
        showCreatorClaimView(voucher, getAddress(claimAddress));
      } else {
        // Wrong wallet — show who the voucher belongs to
        showView('connected-view');
        $('connected-view').innerHTML = `
          <div class="card">
            <div class="empty-state">
              <div style="font-size:48px;margin-bottom:12px;">🔒</div>
              <h2>Wrong Wallet</h2>
              <p style="color:var(--muted);">
                This claim URL is for the voucher creator
                (${escapeHtml(voucher.creatorName || formatAddress(voucher.creator))}).
                Please switch to their wallet and try again.
              </p>
            </div>
          </div>
        `;
      }
    } else if (voucher) {
      // Recipient opening a voucher URL
      showRecipientView(voucher, rawV);
    } else {
      // No voucher param — show create mode
      showCreateMode();
    }
  } catch (err) {
    console.error('Init error:', err);
    showToast('Failed to load app data', 'error');
    showCreateMode();
  }
}

// ── Wallet Connection ───────────────────────────────────────────────────────
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