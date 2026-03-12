# CRC Tickets — Design

## Architecture

```
┌─────────────────────────────────────────┐
│  Circles MiniApp Host (iframe)          │
│  ┌───────────────────────────────────┐  │
│  │  CRC Tickets Client               │  │
│  │                                    │  │
│  │  1. Connect wallet                 │  │
│  │  2. Enter email                    │  │
│  │  3. Pay CRC → org gateway          │  │
│  │  4. POST /api/grant-ticket         │  │
│  │  5. Show success + NFT ticket      │  │
│  └────────────┬──────────────────────┘  │
│               │ postMessage              │
│  ┌────────────▼──────────────────────┐  │
│  │  Wallet Bridge (sendTransactions)  │  │
│  └────────────────────────────────────┘  │
└─────────────────────────────────────────┘
         │                    │
         ▼                    ▼
  ┌──────────────┐    ┌──────────────────┐
  │ Gnosis Chain │    │ Vercel API Route │
  │ Hub V2       │    │ /api/grant-ticket│
  │ (CRC payment)│    │ → grantKeys()   │
  └──────────────┘    └──────────────────┘
                             │
                             ▼
                      ┌──────────────┐
                      │ Unlock Lock  │
                      │ (Gnosis Chain)│
                      │ NFT ticket   │
                      └──────────────┘
```

## File Structure

```
examples/crc-tickets/
├── index.html          # Main UI
├── main.js             # Application logic
├── style.css           # Gnosis design system
├── miniapp-sdk.js      # Host bridge (copied)
├── api/
│   └── grant-ticket.js # Vercel serverless function (grantKeys)
├── package.json        # Dependencies
├── vite.config.js      # Build config
├── vercel.json         # Vercel routing config
└── README.md           # Documentation
```

## UI States

1. **Disconnected** — "Connect your wallet" message
2. **Connected** — Email form + ticket info + "Buy Ticket" button
3. **Paying** — Loading spinner, "Sending CRC payment..."
4. **Confirming** — "Payment confirmed, granting ticket..."
5. **Success** — Ticket NFT ID, tx hashes, "Ticket granted!" message
6. **Error** — Error message with recovery guidance

## Key SDK/Contract Calls

### CRC Payment (client-side)
- `Hub V2.safeTransferFrom(from, to, tokenId, amount, data)` — ERC1155 transfer
- tokenId = sender's address (their personal CRC token)
- to = org/gateway address

### Grant Ticket (server-side API route)
- `PublicLock.grantKeys([recipient], [expiry], [keyManager])` — mint NFT ticket
- Called by key granter EOA (private key in env var)

## Data Flow
1. User connects wallet → `onWalletChange` fires
2. User enters email + clicks "Buy Ticket"
3. Client sends CRC via `sendTransactions([safeTransferFrom tx])`
4. Client waits for receipt (multi-RPC polling)
5. Client calls POST `/api/grant-ticket` with { address, email, txHash }
6. API route verifies tx on-chain, calls grantKeys
7. Client shows success with NFT token ID
