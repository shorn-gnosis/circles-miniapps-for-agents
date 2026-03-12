# Progress

## What Works

### Shell & SDK
- Agent-ready template scaffolded
- `miniapp-sdk.js` postMessage bridge
- SvelteKit shell with iframe loader
- Example miniapps: sign-demo, tx-demo

### Trust Explorer ✅ Production-ready
- Correct production RPC URL (`https://rpc.aboutcircles.com/`)
- `new Sdk(RPC_URL, null)` constructor pattern
- Trust list via `sdk.rpc.trust.getAggregatedTrustRelations(address)` (correct V2 method)
- Counterpart address read from `rel.objectAvatar`
- Batch profile resolution via `sdk.rpc.profile.getProfileByAddressBatch([])`
- Trust expiry warning badge (< 30 days)
- Profile search with address/name fallback
- No debug logs in production

### Social Attestation ✅ Production-ready
- Self-attestation: user signs message claiming social handle ownership
- Stored in Circles profile description field with `##ATTESTATIONS##` marker
- Compact array format `[platform, handle, unixTimestamp]` — fits in 500 char limit
- Backwards compatible with both array and object formats
- Smart truncation when approaching limit
- **Profile field preservation**: `addToProfile()` preserves `imageUrl`, `location`, `geoLocation`
- **Timestamp display fixed**: numeric unix × 1000; ISO string passthrough for legacy

### CRC Quest Board ✅ Functional (localStorage-scoped)
- Full bounty marketplace implementation
- Quest creation, claiming, submission, approval/rejection flows
- Automatic CRC transfer on approval via `safeTransferFrom` from creator's wallet
- Trust-score gating on quests
- **Correct trust method**: `sdk.rpc.trust.getAggregatedTrustRelations(address)`
- **Iframe-safe cancel dialog**: inline "Yes, cancel / No, keep it" bar replaces blocked `confirm()`
- Note: localStorage is user-local — quest board visible only to quest creator's browser. Acceptable for single-user usage; needs a backend for true multi-user sharing.

### CRC Social Vouchers ✅ Architecturally sound
- Voucher data base64-encoded in URL (`?v=<base64>`) — no shared storage needed
- QR code generation for voucher URL
- **3-step creator-initiated redemption flow** (solves ERC-1155 auth):
  1. Creator: fill form → get `?v=<base64>` share link
  2. Recipient: open link → connect wallet → copy `?v=<base64>&claim=<addr>` claim URL → send to creator
  3. Creator: open claim URL → click "Send CRC" → `safeTransferFrom(creator, recipient)` from creator's wallet ✓
- `navigator.clipboard` fallback modal (iframe-safe)
- `history.replaceState` for navigation (avoids blocked `window.location.href`)
- localStorage used correctly: creator's voucher list + redeemed-voucher tracking (both device-local, both correct)

### Backer Voting ⚠️ Prototype / Concept
- Direct backer detection via envio indexer `backingCompleteds` query
- Indirect backer detection via `trustRelations` with `truster_isBacker` flag
- Proposal listing and detail views
- Signature-based vote submission (off-chain only)
- **Prototype disclaimer banner** displayed at top of backer view
- **Null-safe `renderBackerStatus()`**: handles indirect-backer objects cleanly
- Uses envio hyperindex endpoint: `https://gnosis-e702590.dedicated.hyperindex.xyz`
- Note: governance contract (proposals, vote tallying) not yet deployed — votes are signed messages only, no on-chain effect

## Remaining / Future Work
- Test all 5 miniapps in the Circles wallet iframe environment with a real connected wallet
- Verify envio indexer schema once Circles governance infra is deployed (`truster_isBacker` field TBC)
- Quest board: consider a lightweight shared backend (Vercel KV, Supabase) for true multi-user quest visibility
- Consider adding additional miniapps from any planned feature list

## Known Issues & Constraints

| Issue | Affected Apps | Status |
|-------|--------------|--------|
| `confirm()`/`alert()` blocked in iframe | quest-board | ✅ Fixed — inline UI |
| `navigator.clipboard` blocked in iframe | vouchers | ✅ Fixed — fallback modal |
| `window.location.href` blocked in iframe | vouchers | ✅ Fixed — `history.replaceState` |
| localStorage not shared between users | quest-board, vouchers | quest-board: accepted limitation; vouchers: ✅ fixed with URL encoding |
| ERC-1155 `safeTransferFrom` auth | vouchers (original) | ✅ Fixed — creator-initiated push flow |
| Profile fields silently deleted on update | social-attestation | ✅ Fixed — all fields preserved |
| Staging RPC URL | trust-explorer | ✅ Fixed — production URL |
| SDK constructor wrong (object vs string) | trust-explorer | ✅ Fixed |
| Wrong trust SDK method | trust-explorer, quest-board | ✅ Fixed |
| Governance infra not deployed | backer-voting | ⚠️ Labelled as prototype |
| Envio `truster_isBacker` schema unverified | backer-voting | ⚠️ TBC — fails gracefully |