# CRC Social Vouchers

> A Circles MiniApp for creating gift vouchers redeemable for CRC.

## Overview

Create transferable gift vouchers worth CRC that can be shared with friends and community members via link or QR code. Recipients can redeem vouchers for actual Circles tokens. Perfect for gifts, community rewards, and promotions - leveraging Circles' personal currency model for social gifting.

## Features

- Create vouchers with custom CRC amounts and messages
- Optional expiry dates for time-limited gifts
- Generate shareable links and QR codes
- Recipients view voucher details before redeeming
- One-time use - vouchers marked claimed after redemption
- View your created vouchers and their redemption status

## Development

```bash
npm install
npm run dev
```

Load it in the Circles MiniApp host via the Advanced tab at `https://circles.gnosis.io/miniapps`.

## Deployment

```bash
# From repo root:
./scripts/deploy-miniapp.sh examples/crc-social-vouchers
```

## Architecture

- **Wallet bridge**: `miniapp-sdk.js` — postMessage protocol for transactions and signing
- **Circles reads**: `@aboutcircles/sdk` — profiles, trust, balances, RPC queries
- **Chain**: Gnosis Chain (ID 100)
- **Storage**: localStorage (client-side for demo; could use off-chain backend for persistence)
