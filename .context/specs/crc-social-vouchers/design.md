# CRC Social Vouchers — Design

## Architecture
Single-page app with two modes:
1. **Create Mode** - Creator makes voucher, gets shareable link
2. **Redeem Mode** - Recipient opens link, sees voucher, redeems for CRC

URL pattern: `?voucher=<id>` triggers redeem mode

## File Structure
```
examples/crc-social-vouchers/
├── index.html
├── main.js
├── style.css
├── miniapp-sdk.js
├── package.json
├── vite.config.js
└── README.md
```

## Key SDK Calls
- `sdk.rpc.profile.getProfileByAddress()` - get creator/recipient profiles
- `sdk.getAvatar().balances.getTokenBalances()` - check CRC balance
- `sendTransactions()` - Hub V2 safeTransferFrom for redemption

## State Machine
```
┌─ Disconnected ─┐
│                │
└───────┬────────┘
        │ connect
        ▼
┌─────────────────┐     voucher ID in URL    ┌──────────────┐
│   Create Mode   │ ───────────────────────► │  Redeem Mode │
│  (default)      │                          │              │
└────────┬────────┘                          └──────┬───────┘
         │                                          │
         │ create                                   │ redeem
         ▼                                          ▼
┌─────────────────┐                          ┌──────────────┐
│  Voucher Link   │                          │   Transfer   │
│  Generated      │                          │   Complete   │
└─────────────────┘                          └──────────────┘
```

## Data Model
```javascript
Voucher {
  id: string,           // unique ID
  creator: address,     // checksummed address
  creatorName: string,  // profile name or truncated address
  amount: string,       // wei as string
  amountDisplay: string,// human readable "5 CRC"
  message: string,      // gift message
  expiresAt: number,    // timestamp or null
  createdAt: number,    // timestamp
  claimedBy: address,   // null until redeemed
  claimedAt: number,    // null until redeemed
  txHash: string        // null until redeemed
}
```

Storage: localStorage with key `crc_vouchers`
