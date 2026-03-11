# CRC Quest Board — Design

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────┐
│  Quest Board MiniApp (Iframe)                        │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐                │
│  │  Quest List  │  │ Quest Detail │                │
│  │    View      │  │     View     │                │
│  └──────────────┘  └──────────────┘                │
│         │                  │                         │
│         └──────────┬───────┘                         │
│                    │                                 │
│         ┌──────────▼──────────┐                     │
│         │  State Manager      │                     │
│         │  (localStorage)     │                     │
│         └──────────┬──────────┘                     │
│                    │                                 │
│    ┌───────────────┼───────────────┐                │
│    │               │               │                │
│  ┌─▼────┐    ┌────▼────┐    ┌────▼────┐          │
│  │Wallet│    │ Circles │    │ Circles │          │
│  │Bridge│    │   SDK   │    │  RPC    │          │
│  └──────┘    └─────────┘    └─────────┘          │
└─────────────────────────────────────────────────────┘
                      │
                      ▼
          Gnosis Chain (ID 100)
```

### Data Flow

1. **Quest Creation**: User fills form → validate balance → store in localStorage → broadcast to network (optional IPFS)
2. **Quest Discovery**: Load quests from localStorage → filter/sort → render list
3. **Quest Claim**: Update quest state in localStorage → show in "My Claims"
4. **Completion**: Claimer submits proof → quest state = PENDING_REVIEW
5. **Approval**: Creator approves → execute CRC transfer → quest state = COMPLETED

## File Structure

```
examples/crc-quest-board/
├── index.html           # Main UI with quest list, detail, and form views
├── main.js              # Application logic, state management, SDK integration
├── style.css            # Gnosis wallet design system styling
├── miniapp-sdk.js       # PostMessage bridge (copied from examples/)
├── package.json         # Dependencies: @aboutcircles/sdk, viem
├── vite.config.js       # Vite build config with node polyfills
└── README.md            # Documentation
```

## Key SDK Calls

### Wallet Connection
```javascript
import { onWalletChange } from './miniapp-sdk.js';
onWalletChange(async (address) => {
  if (!address) return showDisconnected();
  connectedAddress = getAddress(address);
  await loadUserProfile();
  await loadQuests();
});
```

### Profile & Balance Check
```javascript
import { Sdk } from '@aboutcircles/sdk';
const sdk = new Sdk('https://rpc.aboutcircles.com/', null);
const profile = await sdk.rpc.profile.getProfileByAddress(address);
const avatar = await sdk.getAvatar(address);
const balances = await avatar.balances.getTokenBalances();
const totalCrc = balances.reduce((sum, b) => sum + BigInt(b.attoCircles || 0n), 0n);
```

### Trust Network Query
```javascript
const relations = await sdk.data.getTrustRelations(address);
const trustScore = relations.length; // Simple trust score for MVP
```

### CRC Transfer (on quest approval)
```javascript
import { encodeFunctionData } from 'viem';
const HUB_V2 = '0xc12C1E50ABB450d6205Ea2C3Fa861b3B834d13e8';
const tokenId = BigInt(creatorAddress);
const amountWei = parseUnits(rewardAmount, 18);

const data = encodeFunctionData({
  abi: HUB_TRANSFER_ABI,
  functionName: 'safeTransferFrom',
  args: [creatorAddress, claimerAddress, tokenId, amountWei, '0x'],
});

await sendTransactions([{ to: HUB_V2, data, value: '0x0' }]);
```

### Quest History (CirclesRPC)
```javascript
const transfers = await circlesQuery(
  'CrcV2', 'Transfer',
  ['from', 'to', 'value', 'timestamp'],
  [{ column: 'to', value: address.toLowerCase() }],
  [{ Column: 'timestamp', SortOrder: 'DESC' }]
);
```

## State Machine

### Quest States

```
OPEN ──claim──> CLAIMED ──submit──> PENDING_REVIEW ──approve──> COMPLETED
  │                │                      │                         │
  │                │                      └──reject──> CLAIMED      │
  │                │                                  (retry)       │
  └──cancel──> CANCELLED                                              
```

### UI States

1. **Disconnected**: Show connect wallet prompt
2. **Connected - Browse**: Quest list with filters
3. **Connected - Quest Detail**: Single quest view with actions
4. **Connected - Create**: Quest creation form
5. **Connected - My Quests**: User's created and claimed quests
6. **Processing**: Transaction pending overlay
7. **Error**: Error message with retry/dismiss

## Data Model

### Quest Object
```javascript
{
  id: string,              // UUID
  title: string,           // Max 100 chars
  description: string,     // Max 500 chars
  reward: string,          // CRC amount in wei (as string)
  rewardDisplay: string,   // Human-readable (e.g., "10 CRC")
  creator: string,         // Checksummed address
  creatorName: string,     // Profile name or truncated address
  deadline: number,        // Unix timestamp
  minTrust: number,        // Minimum trust score (0 = no requirement)
  state: 'OPEN' | 'CLAIMED' | 'PENDING_REVIEW' | 'COMPLETED' | 'CANCELLED',
  claimer: string | null,  // Checksummed address or null
  claimerName: string | null,
  completionProof: string | null,  // Description/proof from claimer
  createdAt: number,       // Unix timestamp
  claimedAt: number | null,
  completedAt: number | null,
  txHash: string | null    // Transaction hash of reward transfer
}
```

### User Profile Cache
```javascript
{
  address: string,
  name: string,
  trustScore: number,
  completedQuests: number,
  totalEarned: string  // Total CRC earned (wei as string)
}
```

### LocalStorage Keys
- `crc_quest_board_quests` - Array of all quests
- `crc_quest_board_user_{address}` - User profile cache
- `crc_quest_board_filters` - Current filter settings

## UI Components

### Quest Card
- Title, reward amount (prominent), deadline countdown
- Creator avatar (blockie or profile image)
- Trust badge if minTrust > 0
- Claim/View button based on state

### Quest Detail View
- Full description, requirements
- Creator profile with trust score
- Action buttons (Claim, Submit Completion, Approve, Reject)
- Completion proof textarea
- Transaction status indicator

### Quest Form
- Title input (required, max 100 chars)
- Description textarea (required, max 500 chars)
- Reward input (CRC amount, validates balance)
- Deadline picker (date-time input)
- Min trust slider (0-100)
- Create button (disabled if insufficient balance)

### Filter Bar
- Reward range slider
- Sort dropdown (Newest, Highest Reward, Deadline Soon)
- Trust filter checkbox

### Navigation
- Tabs: Browse | My Quests | Create
- Wallet status badge (top right)
- User stats: completed quests, total earned

## Error Handling

### Insufficient Balance
- Check before quest creation
- Show error: "Insufficient CRC balance. You need X CRC but have Y CRC."

### Quest Expired
- Auto-update state on load
- Show "Expired" badge
- Prevent claiming

### Transaction Failed
- Show error with retry button
- Log tx hash for debugging
- Quest state remains PENDING_REVIEW

### Network Errors
- Retry RPC calls with fallback URLs
- Show "Network error. Retrying..." toast
- Cache last known state

### Passkey Auto-Connect Error
- Detect with `isPasskeyAutoConnectError()`
- Show: "Passkey connection failed. Please reconnect your wallet."

## Performance Optimizations

- Lazy load quest descriptions
- Paginate quest list (20 per page)
- Cache profile data in localStorage (5 min TTL)
- Debounce filter changes
- Preload next page of quests
- Use virtual scrolling for long lists (if needed)
