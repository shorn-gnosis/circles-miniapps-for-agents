/**
 * CRC Tickets — PoC
 *
 * Flow: connect wallet → enter email → pay CRC → grant NFT ticket (Unlock Protocol)
 *
 * SDK pattern:
 *   miniapp-sdk.js  — wallet bridge (transactions, signing)
 *   @aboutcircles/sdk + viem  — read Circles state
 */
import { onWalletChange, sendTransactions } from './miniapp-sdk.js';
import { Sdk } from '@aboutcircles/sdk';
import {
  createPublicClient,
  http,
  getAddress,
  encodeFunctionData,
  parseAbiItem,
} from 'viem';
import { gnosis } from 'viem/chains';

// ── Configuration (event organiser sets these) ──────────────────────────────
const CONFIG = {
  // Unlock Protocol lock address on Gnosis Chain
  lockAddress: '0x5d05639b565a9e1d62dd02d48ecd3ae4f673d0f8',

  // Circles org address
  orgAddress: '0x943186fbcfd74fd575bcf9aa76a53f56b2f06aba',

  // Payment gateway address (CRC payments route through here)
  gatewayAddress: '0xe6637450017a86038498e515889d235a467c1baf',

  // Gnosis group CRC token address (ERC1155 on Hub V2)
  groupTokenAddress: '0xc19bc204eb1c1d5b3fe500e5e5dfabab625f286c',

  // Ticket price in CRC (human-readable)
  ticketPriceCrc: '0.1',

  // Event name
  eventName: 'Community Meetup',

  // API endpoint for granting tickets (Vercel serverless function)
  grantApiUrl: '/api/grant-ticket',
};

// ── Constants ───────────────────────────────────────────────────────────────
const CRC_DECIMALS = 18;

// Wrapped ERC20 group CRC (s-gCRC) — this is what wallets actually hold
const GROUP_ERC20_WRAPPER = '0xeef7b1f06b092625228c835dd5d5b14641d1e54a';

const ERC20_TRANSFER_ABI = [
  {
    type: 'function',
    name: 'transfer',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
];

// ── RPC clients (multi-RPC for reliability) ─────────────────────────────────
const RPC_URLS = [
  'https://rpc.aboutcircles.com/',
  'https://rpc.gnosischain.com',
  'https://1rpc.io/gnosis',
];

const publicClient = createPublicClient({
  chain: gnosis,
  transport: http(RPC_URLS[0]),
  cacheTime: 60_000,
  batch: { multicall: { wait: 50 } },
});

const receiptClients = RPC_URLS.map((url) =>
  createPublicClient({ chain: gnosis, transport: http(url) })
);

const sdk = new Sdk(RPC_URLS[0], null);

// ── State ───────────────────────────────────────────────────────────────────
let connectedAddress = null;

// ── UI helpers ──────────────────────────────────────────────────────────────
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

function showResult(type, html) {
  const el = $('result-area');
  el.className = `result result-${type}`;
  el.innerHTML = html;
  el.classList.remove('hidden');
}

function clearResult() {
  const el = $('result-area');
  el.className = 'hidden';
  el.innerHTML = '';
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

function toHexValue(value) {
  return value ? `0x${BigInt(value).toString(16)}` : '0x0';
}

function formatTxForHost(tx) {
  return {
    to: tx.to,
    data: tx.data || '0x',
    value: toHexValue(tx.value || 0n),
  };
}

// ── Receipt polling (multi-RPC + UserOp fallback) ───────────────────────────
const POLL_MS = 3000;
const TIMEOUT_MS = 12 * 60 * 1000;
const ENTRYPOINT = '0x0000000071727de22e5e9d8baf0edac6f37da032';
const LOOKBACK = 5000n;

async function waitForReceipts(hashes) {
  return Promise.all(hashes.map(waitForReceiptFromAnyRpc));
}

async function waitForReceiptFromAnyRpc(hash) {
  const deadline = Date.now() + TIMEOUT_MS;
  let round = 0;
  while (Date.now() < deadline) {
    round++;
    for (const client of receiptClients) {
      try {
        const r = await client.getTransactionReceipt({ hash });
        if (r) return r;
      } catch {}
    }
    if (round % 2 === 0) {
      for (const client of receiptClients) {
        const r = await tryResolveUserOp(client, hash);
        if (r) return r;
      }
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  throw new Error(`Timed out waiting for ${hash}`);
}

async function tryResolveUserOp(client, userOpHash) {
  try {
    const latest = await client.getBlockNumber();
    const fromBlock = latest > LOOKBACK ? latest - LOOKBACK : 0n;
    const logs = await client.getLogs({
      address: ENTRYPOINT,
      event: parseAbiItem(
        'event UserOperationEvent(bytes32 indexed userOpHash, address indexed sender, address indexed paymaster, uint256 nonce, bool success, uint256 actualGasCost, uint256 actualGasUsed)'
      ),
      args: { userOpHash },
      fromBlock,
      toBlock: latest,
    });
    if (logs.length > 0) {
      return await client.getTransactionReceipt({
        hash: logs.at(-1).transactionHash,
      });
    }
  } catch {}
  return null;
}

// ── CRC Payment ─────────────────────────────────────────────────────────────
function parseAmountToWei(amountStr) {
  // Handle decimal amounts like '0.1' safely with BigInt
  const parts = amountStr.split('.');
  const whole = BigInt(parts[0] || '0') * 10n ** BigInt(CRC_DECIMALS);
  if (parts[1]) {
    const decimals = parts[1].padEnd(CRC_DECIMALS, '0').slice(0, CRC_DECIMALS);
    return whole + BigInt(decimals);
  }
  return whole;
}

function buildCrcPaymentTx(from, gatewayAddress, amountCrc) {
  const amountWei = parseAmountToWei(amountCrc);

  const data = encodeFunctionData({
    abi: ERC20_TRANSFER_ABI,
    functionName: 'transfer',
    args: [gatewayAddress, amountWei],
  });

  return formatTxForHost({
    to: GROUP_ERC20_WRAPPER,
    data,
    value: 0n,
  });
}

// ── Check existing ticket (on-chain) ────────────────────────────────────────
const LOCK_ABI = [
  {
    type: 'function',
    name: 'getHasValidKey',
    inputs: [{ name: '_user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalKeys',
    inputs: [{ name: '_keyOwner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'tokenOfOwnerByIndex',
    inputs: [
      { name: '_owner', type: 'address' },
      { name: '_index', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
];

async function checkExistingTicket(address) {
  try {
    const hasKey = await publicClient.readContract({
      address: CONFIG.lockAddress,
      abi: LOCK_ABI,
      functionName: 'getHasValidKey',
      args: [address],
    });

    if (!hasKey) return null;

    // Get the latest token ID for this owner
    const totalKeys = await publicClient.readContract({
      address: CONFIG.lockAddress,
      abi: LOCK_ABI,
      functionName: 'totalKeys',
      args: [address],
    });

    let tokenId = null;
    if (totalKeys > 0n) {
      try {
        tokenId = await publicClient.readContract({
          address: CONFIG.lockAddress,
          abi: LOCK_ABI,
          functionName: 'tokenOfOwnerByIndex',
          args: [address, totalKeys - 1n],
        });
      } catch {
        // tokenOfOwnerByIndex may not be available on all lock versions
      }
    }

    return { hasKey: true, tokenId, totalKeys: Number(totalKeys) };
  } catch (err) {
    console.warn('Could not check existing ticket:', err.message);
    return null;
  }
}

// ── Grant ticket (calls backend API) ────────────────────────────────────────
async function requestGrantTicket(address, email, paymentTxHash) {
  try {
    const res = await fetch(CONFIG.grantApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientAddress: address,
        email,
        paymentTxHash,
        lockAddress: CONFIG.lockAddress,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Grant API error (${res.status}): ${text}`);
    }

    return await res.json();
  } catch (err) {
    // For PoC: if the API route isn't deployed, return a placeholder
    console.warn('Grant ticket API not available:', decodeError(err));
    return {
      success: false,
      message:
        'Payment confirmed on-chain. NFT ticket grant pending — the backend API route needs to be configured with a key granter private key.',
      tokenId: null,
    };
  }
}

// ── Main purchase flow ──────────────────────────────────────────────────────
async function purchaseTicket(email) {
  showView('paying-view');
  $('paying-status').textContent = 'Sending CRC payment...';

  try {
    // Step 1: Send ERC20 group CRC to payment gateway
    const paymentTx = buildCrcPaymentTx(
      connectedAddress,
      CONFIG.gatewayAddress,
      CONFIG.ticketPriceCrc
    );

    const hashes = await sendTransactions([paymentTx]);
    const paymentTxHash = hashes[0];

    $('paying-status').textContent = 'Confirming payment on-chain...';

    // Step 2: Wait for receipt
    const receipts = await waitForReceipts(hashes);
    const receipt = receipts[0];

    if (receipt.status !== 'success') {
      throw new Error('CRC payment transaction reverted');
    }

    $('paying-status').textContent = 'Payment confirmed! Granting NFT ticket...';

    // Step 3: Request ticket grant via backend
    const grantResult = await requestGrantTicket(
      connectedAddress,
      email,
      paymentTxHash
    );

    // Step 4: Show success
    showView('success-view');
    $('success-email').textContent = `Email: ${email}`;
    $('success-tx').textContent = `Payment tx: ${paymentTxHash.slice(0, 10)}…${paymentTxHash.slice(-8)}`;

    if (grantResult.tokenId) {
      $('success-token').textContent = `NFT Token ID: #${grantResult.tokenId}`;
      renderTicketImage('success-ticket-image', grantResult.tokenId);
    } else {
      $('success-token').textContent = grantResult.message || 'NFT ticket grant pending.';
      renderTicketImage('success-ticket-image', null);
    }

    showToast('Ticket purchased!', 'success');
  } catch (err) {
    showView('connected-view');

    if (isPasskeyAutoConnectError(err)) {
      showResult(
        'error',
        'Passkey auto-connect failed. Re-open wallet connect and choose your wallet again.'
      );
    } else {
      showResult('error', `Purchase failed: ${decodeError(err)}`);
    }
  }
}

// ── Initialisation ──────────────────────────────────────────────────────────
async function initializeApp(address) {
  try {
    // Display event info
    $('event-name').textContent = CONFIG.eventName;
    $('ticket-price-display').textContent = `${CONFIG.ticketPriceCrc} CRC`;

    // Check if wallet already holds a ticket
    const existing = await checkExistingTicket(address);
    if (existing?.hasKey) {
      showExistingTicket(existing);
      return;
    }

    showView('connected-view');
    clearResult();
  } catch (err) {
    console.error('Init error:', err);
    showToast('Failed to load app data', 'error');
  }
}

function renderTicketImage(containerId, tokenId) {
  const container = $(containerId);
  if (!container) return;

  if (tokenId) {
    // Unlock Protocol generates an SVG for each token at this URL
    const imgUrl = `https://locksmith.unlock-protocol.com/lock/${CONFIG.lockAddress}/icon?id=${tokenId}`;
    container.innerHTML = `<img src="${imgUrl}" alt="NFT Ticket #${tokenId}" class="ticket-nft-img" onerror="this.parentElement.innerHTML='<div class=\\'ticket-placeholder\\'>🎫</div>'" />`;
  } else {
    container.innerHTML = '<div class="ticket-placeholder">🎫</div>';
  }
}

function showExistingTicket(ticket) {
  $('existing-ticket-event').textContent = CONFIG.eventName;
  $('existing-ticket-id').textContent = ticket.tokenId
    ? `Token ID: #${ticket.tokenId} (${ticket.totalKeys} ticket${ticket.totalKeys > 1 ? 's' : ''} held)`
    : `${ticket.totalKeys} ticket${ticket.totalKeys > 1 ? 's' : ''} held`;
  $('existing-ticket-link').innerHTML =
    `<a href="https://gnosisscan.io/token/${CONFIG.lockAddress}" target="_blank" rel="noopener" style="color:var(--accent)">View on Gnosisscan ↗</a>`;
  renderTicketImage('existing-ticket-image', ticket.tokenId);
  showView('has-ticket-view');
}

// ── Event listeners ─────────────────────────────────────────────────────────
$('buy-btn').addEventListener('click', async () => {
  const email = $('email-input').value.trim();

  if (!email || !email.includes('@') || !email.includes('.')) {
    showResult('error', 'Please enter a valid email address.');
    return;
  }

  if (CONFIG.orgAddress === '0x0000000000000000000000000000000000000000') {
    showResult(
      'warn',
      'This is a demo. Set a valid org address and lock address in the app configuration to enable real purchases.'
    );
    return;
  }

  clearResult();
  await purchaseTicket(email);
});

$('buy-another-btn').addEventListener('click', () => {
  $('email-input').value = '';
  showView('connected-view');
  clearResult();
});

$('buy-additional-btn').addEventListener('click', () => {
  $('email-input').value = '';
  showView('connected-view');
  clearResult();
});

// ── Standalone mode warning ─────────────────────────────────────────────────
if (window.parent === window) {
  console.warn('Not running inside the Circles MiniApp host.');
  document.body.insertAdjacentHTML(
    'afterbegin',
    '<div style="background:var(--warn-bg);padding:8px 16px;font-size:12px;text-align:center;color:var(--warn-ink)">' +
      'Running in standalone mode — wallet operations will not work. ' +
      'Load via https://circles.gnosis.io/miniapps to test fully.</div>'
  );
}

// ── Wallet connection ───────────────────────────────────────────────────────
onWalletChange(async (address) => {
  if (!address) {
    connectedAddress = null;
    $('wallet-status').textContent = 'Not connected';
    $('wallet-status').className = 'badge';
    showView('disconnected-view');
    return;
  }

  connectedAddress = getAddress(address);
  $('wallet-status').textContent = `${connectedAddress.slice(0, 6)}…${connectedAddress.slice(-4)}`;
  $('wallet-status').className = 'badge badge-success';
  await initializeApp(connectedAddress);
});
