# Test Account Flagger

> A Circles MiniApp for flagging test and bot accounts.

## Overview

Lets Circles users self-flag their account as a test or bot account by writing a `##TEST_ACCOUNT##` marker into their profile metadata. The flag is stored on IPFS and referenced on-chain via the NameRegistry v2, so analytics dashboards (Dune) and Trust Membership Services (TMSs) can query and filter these accounts. Only the account owner can flag or unflag — the operation requires a signed transaction.

## How it works

1. Connect your Circles wallet
2. The app reads your profile and checks for an existing test flag
3. Click "Flag as Test Account" to add the marker, or "Remove Test Flag" to remove it
4. Sign the on-chain transaction to update your profile metadata digest
5. The flag is now visible to any service reading your Circles profile

## Development

```bash
npm install
npm run dev
```

Load it in the Circles MiniApp host via the Advanced tab at `https://circles.gnosis.io/miniapps`.

## Deployment

```bash
# From repo root:
./scripts/deploy-miniapp.sh examples/test-account-flagger
```

## Architecture

- **Wallet bridge**: `miniapp-sdk.js` — postMessage protocol for transactions
- **Circles SDK**: `@aboutcircles/sdk` — profile reads, IPFS pinning
- **On-chain**: NameRegistry v2 `updateMetadataDigest` — stores CID reference
- **Chain**: Gnosis Chain (ID 100)
- **Storage**: `##TEST_ACCOUNT##` marker in the profile `description` field
