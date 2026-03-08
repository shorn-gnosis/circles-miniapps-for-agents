# CRC Quest Board

A community bounty marketplace for Circles where users post tasks/quests with CRC rewards and others complete them for payment.

## Overview

CRC Quest Board creates a gig economy layer on top of Circles personal currencies. Users can post bounties for tasks they need completed, and community members can claim and complete these tasks to earn CRC rewards. The app leverages the Circles trust network for reputation and automatically handles CRC payments on quest completion.

## Features

- **Create Quests**: Post tasks with CRC rewards, deadlines, and optional trust requirements
- **Browse & Filter**: Discover open quests sorted by reward, deadline, or recency
- **Claim Quests**: Claim open quests to start working on them (first-come-first-serve)
- **Submit Completion**: Provide proof of completion for quest creator review
- **Approve & Pay**: Quest creators approve completion and automatically transfer CRC rewards
- **Reputation**: Track completed quests and total CRC earned

## How It Works

1. **Connect Wallet**: Connect your Circles wallet via the Gnosis host
2. **Browse Quests**: View all open quests or filter by reward/trust
3. **Claim Quest**: Click to claim an open quest
4. **Complete Task**: Do the work described in the quest
5. **Submit Proof**: Describe how you completed the quest
6. **Get Paid**: Creator approves and CRC is transferred automatically

## Quest Lifecycle

```
OPEN → CLAIMED → PENDING_REVIEW → COMPLETED
  ↓       ↓            ↓
CANCELLED   (rejected back to CLAIMED)
```

## Development

```bash
cd examples/crc-quest-board
npm install
npm run dev
```

Load it in the Circles MiniApp host via the Advanced tab at `https://circles.gnosis.io/miniapps`.

## Deployment

```bash
npm run build
vercel --prod
```

**Important**: Disable Vercel Deployment Protection in project settings for iframe compatibility.

## Architecture

- **Wallet bridge**: `miniapp-sdk.js` — postMessage protocol for transactions and signing
- **Circles reads**: `@aboutcircles/sdk` — profiles, trust, balances, RPC queries
- **Chain**: Gnosis Chain (ID 100)
- **Storage**: localStorage (MVP) — quest data persisted locally

## Contract Addresses (Gnosis Chain)

- Hub V2: `0xc12C1E50ABB450d6205Ea2C3Fa861b3B834d13e8`

## Known Limitations (MVP)

- Quest data stored locally (lost on browser clear)
- No dispute resolution mechanism
- First-come-first-serve claiming (no bidding system)
- No quest categories or advanced search
- No backend API or database

## Future Enhancements

- IPFS storage for quest data persistence
- Quest categories and tags
- Dispute resolution with community voting
- Multi-player collaborative quests
- Quest templates
- Recurring quests
- Advanced search and filtering
- Quest bidding system

## Technical Details

### CRC Transfer (on approval)

```javascript
const tokenId = BigInt(creatorAddress);
const amountWei = parseUnits(reward, 18);
const data = encodeFunctionData({
  abi: HUB_TRANSFER_ABI,
  functionName: 'safeTransferFrom',
  args: [creator, claimer, tokenId, amountWei, '0x'],
});
await sendTransactions([{ to: HUB_V2, data, value: '0x0' }]);
```

### Trust Score

Simple trust score based on number of trust relations from Circles SDK.

## Built With

- Circles SDK (`@aboutcircles/sdk`)
- Viem for Ethereum interactions
- Gnosis wallet design system
- Space Grotesk & JetBrains Mono fonts
