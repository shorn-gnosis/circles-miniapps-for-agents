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

  // Ticket price in CRC (human-readable)
  ticketPriceCrc: '5',

  // Event name
  eventName: 'Community Meetup',

  // API endpoint for granting tickets (Vercel serverless function)
  grantApiUrl: '/api/grant-ticket',
};

// ── Constants ───────────────────────────────────────────────────────────────
const HUB_V2_ADDRESS = '0xc12C1E50ABB450d6205Ea2C3Fa861b3B834d13e8';
const CRC_DECIMALS = 18;

const HUB_TRANSFER_ABI = [
  {
    type: 'function',
    name: 'safeTransferFrom',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'id', type: 'uint256' },
      { name: 'value', type: 'uint256' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [],
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
function buildCrcPaymentTx(from, gatewayAddress, amountCrc) {
  const amountWei = BigInt(amountCrc) * 10n ** BigInt(CRC_DECIMALS);
  const tokenId = BigInt(from); // personal CRC token ID = sender address

  const data = encodeFunctionData({
    abi: HUB_TRANSFER_ABI,
    functionName: 'safeTransferFrom',
    args: [from, gatewayAddress, tokenId, amountWei, '0x'],
  });

  return formatTxForHost({
    to: HUB_V2_ADDRESS,
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
    // Step 1: Send CRC payment to gateway
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
    } else {
      $('success-token').textContent = grantResult.message || 'NFT ticket grant pending.';
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

function showExistingTicket(ticket) {
  $('existing-ticket-event').textContent = CONFIG.eventName;
  $('existing-ticket-id').textContent = ticket.tokenId
    ? `Token ID: #${ticket.tokenId} (${ticket.totalKeys} ticket${ticket.totalKeys > 1 ? 's' : ''} held)`
    : `${ticket.totalKeys} ticket${ticket.totalKeys > 1 ? 's' : ''} held`;
  $('existing-ticket-link').innerHTML =
    `<a href="https://gnosisscan.io/token/${CONFIG.lockAddress}" target="_blank" rel="noopener" style="color:var(--accent)">View on Gnosisscan ↗</a>`;
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
