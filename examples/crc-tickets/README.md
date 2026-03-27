# CRC Tickets

A Circles MiniApp proof-of-concept for selling event tickets paid in CRC, with NFT tickets issued via Unlock Protocol on Gnosis Chain.

## Flow

1. Attendee connects wallet via Circles host
2. Enters their email address
3. Pays CRC to the event organiser's address (via Hub V2 `safeTransferFrom`)
4. Backend verifies payment and calls `grantKeys` on the Unlock Protocol lock
5. NFT ticket minted to attendee's wallet

## Architecture

- **Client**: Vanilla JS miniapp using `miniapp-sdk.js` (postMessage bridge) + `viem` for tx encoding
- **Backend**: Vercel serverless function (`/api/grant-ticket`) that calls `grantKeys` using a key granter EOA
- **Contracts**: Hub V2 (CRC payment) + Unlock Protocol PublicLock (NFT ticket)
- **Chain**: Gnosis Chain (ID 100)

## Configuration

### Client (`main.js` CONFIG object)

| Key | Description |
|-----|-------------|
| `lockAddress` | Unlock Protocol lock address on Gnosis Chain |
| `orgAddress` | Circles org/payment gateway address receiving CRC |
| `ticketPriceCrc` | Ticket price in CRC (human-readable) |
| `eventName` | Display name of the event |

### Server (Vercel environment variables)

| Variable | Description |
|----------|-------------|
| `KEY_GRANTER_PRIVATE_KEY` | EOA private key with KeyGranter role on the lock |
| `LOCK_ADDRESS` | Fallback lock address (overridden by client request) |

## Setup

### 1. Create an Unlock Protocol Lock

1. Go to [Unlock Protocol Dashboard](https://app.unlock-protocol.com/locks/create)
2. Deploy a lock on **Gnosis Chain** (chain ID 100)
3. Set key price to 0 (free) — CRC payment is handled separately
4. Note the lock address

### 2. Add Key Granter

1. Create a new EOA (e.g. via MetaMask)
2. In the Unlock dashboard, go to Lock Settings > Roles
3. Add the EOA as a **Key Granter**
4. Fund the EOA with a small amount of xDAI for gas

### 3. Configure the MiniApp

1. Update `CONFIG` in `main.js` with your lock and org addresses
2. Set `KEY_GRANTER_PRIVATE_KEY` as a Vercel environment variable
3. Deploy to Vercel

## Development

```bash
npm install
npm run dev
```

Load it in the Circles MiniApp host via the Advanced tab at `https://circles.gnosis.io/miniapps`.

## Deployment

```bash
npm run build
# From repo root:
./scripts/deploy-miniapp.sh examples/crc-tickets
```

After deploying, disable Vercel Deployment Protection in project settings.

## Next Steps (beyond PoC)

- Integrate with Circles Marketplace Payment Gateway for payment monitoring
- Set key metadata (email) via Unlock Locksmith API for email delivery
- Add event creation flow (deploy new locks)
- Support multiple ticket types / pricing tiers
- Add refund mechanism
