# Test Account Flagger — Design

## Architecture

Single-page vanilla JS miniapp running in the Circles MiniApp host iframe. Uses the dual-SDK pattern:
- `miniapp-sdk.js` for wallet operations (sendTransactions)
- `@aboutcircles/sdk` + `viem` for reading profiles and encoding transactions

### Data Flow
1. Wallet connects → `onWalletChange` fires with address
2. Fetch profile via `sdk.rpc.profile.getProfileByAddress(address)`
3. Parse description for `##TEST_ACCOUNT##` marker
4. Display current flag status
5. On flag/unflag:
   a. Build updated profile (preserve all fields, add/remove marker)
   b. Pin to IPFS via `sdk.profiles.create(updatedProfile)`
   c. Convert CID to hex digest
   d. Encode `updateMetadataDigest(bytes32)` call to NameRegistry v2
   e. Send tx via `sendTransactions()`
   f. Poll for receipt
   g. Update UI with result

## File Structure
```
examples/test-account-flagger/
├── index.html
├── main.js
├── style.css
├── miniapp-sdk.js
├── package.json
├── vite.config.js
├── vercel.json
├── .gitignore
└── README.md
```

## Key SDK Calls
- `sdk.rpc.profile.getProfileByAddress(address)` — read current profile
- `sdk.profiles.create(profileObject)` — pin updated profile to IPFS, returns CID
- `encodeFunctionData({ abi, functionName: 'updateMetadataDigest', args: [digest] })` — encode NameRegistry tx
- `sendTransactions([{ to: nameRegistry, data, value: '0x0' }])` — send via host wallet

## State Machine

| State | UI |
|---|---|
| `disconnected` | "Connect your wallet" message |
| `loading` | Spinner while fetching profile |
| `connected-unflagged` | Profile info + "Flag as Test Account" button |
| `connected-flagged` | Profile info + flag badge + "Remove Test Flag" button |
| `no-avatar` | Warning: address has no Circles avatar registered |
| `submitting` | Disabled button + spinner during tx |
| `success` | Toast confirmation + updated status |
| `error` | Toast with decoded error message |

## Data Model

### Profile marker format
```
<existing description text>

##TEST_ACCOUNT##
{"flaggedAt":"2026-03-16T12:00:00Z","reason":"self-flagged"}
```

### Marker detection
```javascript
const TEST_MARKER = '##TEST_ACCOUNT##';
const isFlagged = profile?.description?.includes(TEST_MARKER);
```

## Contract Interaction
- **NameRegistry v2**: `0xA27566fD89162cC3D40Cb59c87AAaA49B85F3474`
- **Function**: `updateMetadataDigest(bytes32 metadataDigest)`
- **CID conversion**: `cidV0ToHex()` from social-attestation pattern
