# Trust Network Explorer — Design

## Architecture

Single-page app with three main views:
1. **Disconnected** - Prompt to connect wallet
2. **Connected (Self)** - Your trust network
3. **Connected (Other)** - Another user's trust network (via search)

```
┌─────────────────────────────────────┐
│  Header: App Name + Wallet Badge    │
├─────────────────────────────────────┤
│  Search Bar (address or name)       │
├─────────────────────────────────────┤
│  Profile Card (viewing user)        │
│  - Name, address, trust counts      │
├─────────────────────────────────────┤
│  Tabs: Incoming | Outgoing          │
├─────────────────────────────────────┤
│  Trust List                         │
│  - Profile cards for each truster   │
│  - Click to navigate to their view  │
└─────────────────────────────────────┘
```

## File Structure
```
examples/trust-explorer/
├── index.html          # Main UI shell
├── main.js             # Application logic
├── style.css           # Org-manager design system
├── miniapp-sdk.js      # PostMessage bridge (copied)
├── package.json        # Dependencies
├── vite.config.js      # Build config
└── README.md           # Documentation
```

## Key SDK Calls

### Profile Search
```javascript
sdk.rpc.profile.searchByAddressOrName(query, limit, offset)
```

### Get Profile by Address
```javascript
sdk.rpc.profile.getProfileByAddress(address)
```

### Get Trust Relations
```javascript
sdk.data.getTrustRelations(address)
// Returns: { trusting: [...], trustedBy: [...] }
```

### CirclesRPC Trust Events
```javascript
sdk.circlesRpc.call('circles_query', [{
  Namespace: 'CrcV2',
  Table: 'Trust',
  Columns: ['canSendTo', 'user', 'timestamp'],
  Filter: [{ Column: 'user', Value: address.toLowerCase() }]
}])
```

## State Machine

```
┌──────────────┐
│ disconnected │ ← onWalletChange(null)
└──────┬───────┘
       │ onWalletChange(address)
       ▼
┌──────────────┐
│   loading    │ ← fetch trust data
└──────┬───────┘
       │ data loaded
       ▼
┌──────────────┐     search query     ┌──────────────┐
│ viewing_self │ ──────────────────→ │   loading    │
└──────────────┘                     └──────┬───────┘
       ▲                                    │
       │              data loaded           ▼
       │                            ┌──────────────┐
       └────────────────────────────│ viewing_other│
              back to self button   └──────────────┘
```

## Data Model

```javascript
// Trust Relation
{
  address: '0x...',      // checksummed
  name: 'Alice',         // from profile
  avatarUrl: 'https://...' // optional
}

// Viewing State
{
  mode: 'self' | 'other',
  address: '0x...',
  profile: { name, description, ... },
  trusting: TrustRelation[],    // who they trust
  trustedBy: TrustRelation[],   // who trusts them
  activeTab: 'incoming' | 'outgoing'
}

// App State
{
  connectedAddress: '0x...' | null,
  viewing: ViewingState | null,
  searchQuery: '',
  loading: boolean,
  error: string | null
}
```

## Error Handling

1. **No profile found** - Show "No profile registered" with option to search again
2. **Network error** - Retry with fallback RPCs, show toast
3. **Passkey error** - Specific message per Pattern M
4. **Empty trust list** - Friendly "No trust relationships yet" message
