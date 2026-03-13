/**
 * Vercel Serverless Function: Grant Unlock Protocol NFT Ticket
 *
 * After CRC payment is confirmed, this endpoint calls grantKeys
 * on the Unlock Protocol lock to mint an NFT ticket to the buyer,
 * then stores the user's email as metadata via the Locksmith API
 * so Unlock can send email notifications.
 *
 * Environment variables required:
 *   KEY_GRANTER_PRIVATE_KEY  — EOA private key with KeyGranter role on the lock
 *   LOCK_ADDRESS             — Unlock Protocol lock address on Gnosis Chain (optional override)
 *
 * The KEY_GRANTER_PRIVATE_KEY EOA must have the KeyGranter role on the lock.
 * Add it via the Unlock dashboard: Lock Settings → Roles → Add Key Granter.
 */
import { createPublicClient, createWalletClient, http, encodeFunctionData } from 'viem';
import { gnosis } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const RPC_URL = 'https://rpc.gnosischain.com';
const LOCKSMITH_BASE = 'https://locksmith.unlock-protocol.com';
const GNOSIS_CHAIN_ID = 100;

/**
 * Get a Locksmith bearer token via SIWE (Sign-In with Ethereum).
 * The lock manager signs a SIWE message and exchanges it for a JWT.
 */
async function getLocksmithToken(account, walletClient) {
  // 1. Fetch nonce from Locksmith
  const nonceRes = await fetch(`${LOCKSMITH_BASE}/v2/auth/nonce`);
  if (!nonceRes.ok) {
    throw new Error(`Failed to get Locksmith nonce (${nonceRes.status})`);
  }
  const nonce = await nonceRes.text();

  // 2. Build SIWE message with server nonce
  const now = new Date().toISOString();
  const siweMessage = [
    `locksmith.unlock-protocol.com wants you to sign in with your Ethereum account:`,
    account.address,
    '',
    'Sign in to Unlock Locksmith',
    '',
    `URI: https://locksmith.unlock-protocol.com`,
    `Version: 1`,
    `Chain ID: ${GNOSIS_CHAIN_ID}`,
    `Nonce: ${nonce}`,
    `Issued At: ${now}`,
  ].join('\n');

  // 3. Sign the message
  const signature = await walletClient.signMessage({
    account,
    message: siweMessage,
  });

  // 4. Exchange for bearer token
  const loginRes = await fetch(`${LOCKSMITH_BASE}/v2/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: siweMessage, signature }),
  });

  if (!loginRes.ok) {
    const errText = await loginRes.text();
    throw new Error(`Locksmith login failed (${loginRes.status}): ${errText}`);
  }

  const { accessToken } = await loginRes.json();
  return accessToken;
}

/**
 * Store user email as protected metadata on the lock via Locksmith API.
 * This enables Unlock to send email notifications for the ticket.
 */
async function setUserEmailMetadata(token, lockAddress, userAddress, email) {
  const url = `${LOCKSMITH_BASE}/v2/api/metadata/${GNOSIS_CHAIN_ID}/locks/${lockAddress}/users/${userAddress}`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      metadata: {
        protected: {
          email,
        },
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`Locksmith metadata update failed (${res.status}): ${errText}`);
    // Non-fatal — ticket is still granted even if email metadata fails
    return false;
  }

  return true;
}

/**
 * Trigger Unlock's ticket confirmation email via Locksmith.
 * Requires email metadata to be stored first (setUserEmailMetadata).
 */
async function sendTicketEmail(token, lockAddress, keyId) {
  const url = `${LOCKSMITH_BASE}/v2/api/ticket/${GNOSIS_CHAIN_ID}/${lockAddress}/${keyId}/email`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`Locksmith email send failed (${res.status}): ${errText}`);
    return false;
  }

  return true;
}

const GRANT_KEYS_ABI = [
  {
    type: 'function',
    name: 'grantKeys',
    inputs: [
      { name: '_recipients', type: 'address[]' },
      { name: '_expirationTimestamps', type: 'uint256[]' },
      { name: '_keyManagers', type: 'address[]' },
    ],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
];

export default async function handler(req, res) {
  // Only POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { recipientAddress, email, paymentTxHash, lockAddress } = req.body;

  // Validate inputs
  if (!recipientAddress || !paymentTxHash) {
    return res.status(400).json({ error: 'Missing recipientAddress or paymentTxHash' });
  }

  const privateKey = process.env.KEY_GRANTER_PRIVATE_KEY;
  if (!privateKey) {
    return res.status(500).json({
      error: 'Server not configured: KEY_GRANTER_PRIVATE_KEY not set',
    });
  }

  const lock = lockAddress || process.env.LOCK_ADDRESS;
  if (!lock) {
    return res.status(500).json({
      error: 'Server not configured: LOCK_ADDRESS not set',
    });
  }

  try {
    // Verify payment transaction exists and succeeded
    const publicClient = createPublicClient({
      chain: gnosis,
      transport: http(RPC_URL),
    });

    const receipt = await publicClient.getTransactionReceipt({
      hash: paymentTxHash,
    });

    if (!receipt || receipt.status !== 'success') {
      return res.status(400).json({ error: 'Payment transaction not confirmed or failed' });
    }

    // Set up wallet client with key granter account
    const account = privateKeyToAccount(privateKey);
    const walletClient = createWalletClient({
      account,
      chain: gnosis,
      transport: http(RPC_URL),
    });

    // Grant key with 1 year expiry
    const oneYearFromNow = BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60);

    const data = encodeFunctionData({
      abi: GRANT_KEYS_ABI,
      functionName: 'grantKeys',
      args: [
        [recipientAddress],         // recipients
        [oneYearFromNow],            // expiration timestamps
        [recipientAddress],          // key managers (recipient manages their own key)
      ],
    });

    const txHash = await walletClient.sendTransaction({
      to: lock,
      data,
      value: 0n,
    });

    // Wait for confirmation
    const grantReceipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    // Extract tokenId from grant receipt logs
    const tokenId = grantReceipt.logs?.[0]?.topics?.[3]
      ? parseInt(grantReceipt.logs[0].topics[3], 16)
      : null;

    // Store email + send confirmation via Locksmith API
    let emailStored = false;
    let emailSent = false;
    if (email) {
      try {
        const token = await getLocksmithToken(account, walletClient);
        emailStored = await setUserEmailMetadata(token, lock, recipientAddress, email);

        // Trigger Unlock's ticket confirmation email
        if (emailStored && tokenId) {
          emailSent = await sendTicketEmail(token, lock, tokenId);
        }
      } catch (metaErr) {
        // Non-fatal — ticket is granted regardless
        console.error('Locksmith email error:', metaErr.message);
      }
    }

    console.log(`Ticket granted: ${recipientAddress} | email: ${email} (stored: ${emailStored}, sent: ${emailSent}) | tokenId: ${tokenId} | lock: ${lock} | tx: ${txHash}`);

    return res.status(200).json({
      success: true,
      message: emailSent
        ? 'NFT ticket granted — confirmation email sent!'
        : emailStored
          ? 'NFT ticket granted — email stored but send failed.'
          : 'NFT ticket granted!',
      grantTxHash: txHash,
      emailStored,
      emailSent,
      tokenId,
    });
  } catch (err) {
    console.error('Grant ticket error:', err);
    return res.status(500).json({
      error: `Failed to grant ticket: ${err.message || String(err)}`,
    });
  }
}
