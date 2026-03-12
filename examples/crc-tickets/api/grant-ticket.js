/**
 * Vercel Serverless Function: Grant Unlock Protocol NFT Ticket
 *
 * After CRC payment is confirmed, this endpoint calls grantKeys
 * on the Unlock Protocol lock to mint an NFT ticket to the buyer.
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

    // TODO: Set key metadata (email) via Unlock Locksmith API
    // This requires the Locksmith API endpoint and authentication
    // For PoC, we log the email association
    console.log(`Ticket granted: ${recipientAddress} | email: ${email} | lock: ${lock} | tokenTx: ${txHash}`);

    return res.status(200).json({
      success: true,
      message: 'NFT ticket granted!',
      grantTxHash: txHash,
      tokenId: grantReceipt.logs?.[0]?.topics?.[3]
        ? parseInt(grantReceipt.logs[0].topics[3], 16)
        : null,
    });
  } catch (err) {
    console.error('Grant ticket error:', err);
    return res.status(500).json({
      error: `Failed to grant ticket: ${err.message || String(err)}`,
    });
  }
}
