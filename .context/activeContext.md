# Active Context

## Current Focus
Full app review + fix pass completed for all 5 miniapps (excl. sign-demo, tx-demo). All critical and medium issues resolved. Review reports in `.context/specs/*/review.md`.

## Recent Changes

### Round 2 — Full Fix Pass (March 2026)

**trust-explorer** — Complete rewrite of `main.js`:
- Production RPC URL (`https://rpc.aboutcircles.com/`) replaces staging URL
- `new Sdk(RPC_URL, null)` constructor — string, not config object
- `sdk.rpc.trust.getAggregatedTrustRelations(address)` replaces non-existent `getTrusts/getTrustedBy`
- Batch profile lookup via `sdk.rpc.profile.getProfileByAddressBatch([])`
- `rel.objectAvatar` used as counterpart address from aggregated relations
- Trust expiry badge (< 30 days warning)
- All `[DEBUG]` `console.log` statements removed
- Profile search with `searchByAddressOrName` fallback

**social-attestation** — Two targeted fixes:
- `addToProfile()` now preserves all profile fields (`imageUrl`, `location`, `geoLocation`) — previously silently deleted them on update
- Timestamp display fixed: unix int × 1000 for numeric timestamps; ISO string passthrough for legacy entries

**crc-quest-board** — Two targeted fixes:
- `sdk.data.getTrustRelations(address)` → `sdk.rpc.trust.getAggregatedTrustRelations(address)`
- `confirm()` dialog (blocked in iframe) → inline confirmation bar with "Yes, cancel" / "No, keep it" buttons rendered in the quest-actions container

**crc-social-vouchers** — Complete architectural rewrite:
- **Voucher data base64-encoded in URL** (`?v=<base64>`) — eliminates localStorage sharing problem
- **3-step creator-initiated redemption flow**:
  1. Creator creates voucher → gets `?v=<base64>` share URL
  2. Recipient opens URL → clicks "Request Redemption" → gets `?v=<base64>&claim=<recipientAddr>` claim URL
  3. Creator opens claim URL → clicks "Send CRC" → `safeTransferFrom(creator, recipient)` from **creator's wallet** (authorised ✓)
- `navigator.clipboard` fallback modal for iframe environments where clipboard is blocked
- `window.location.href` navigation replaced with `history.replaceState` + view re-render
- localStorage still used for creator's "My Vouchers" list and redeemed-voucher tracking (both local to creator's device — correct)

**backer-voting** — Three targeted fixes + UX improvement:
- Prominent prototype disclaimer banner injected at top of `backer-view` at init time
- `console.log('[Backer Voting] Wallet change:', address)` debug log removed
- `renderBackerStatus()` now handles indirect-backer objects (`{ isBacker: true, isIndirect: true }`) without crashing — hides `.backer-details`, updates badge text; all DOM lookups guarded with null checks
- Proposal detail modal: click any proposal card to open modal with full details, vote from modal — `main.js` + `style.css`

## Post-Fix Status

| App | Was | Now | Fixes Applied |
|-----|-----|-----|---------------|
| trust-explorer | 4/10 | ✅ Production-ready | RPC URL, SDK ctor, correct trust method, batch profiles, debug logs |
| social-attestation | 7/10 | ✅ Production-ready | Profile field preservation, timestamp display |
| crc-quest-board | 3/10 | ✅ Functional | Trust method, iframe-safe cancel dialog |
| crc-social-vouchers | 2/10 | ✅ Architecturally sound | URL-encoded vouchers, creator-push flow |
| backer-voting | 2/10 | ⚠️ Prototype labelled | Disclaimer added, null guards, debug log removed |

## Confirmed SDK Patterns

- **SDK constructor**: `new Sdk(rpcUrl: string, runner)` — NOT an object
- **Production RPC**: `https://rpc.aboutcircles.com/`
- **Trust method**: `sdk.rpc.trust.getAggregatedTrustRelations(address)` → `{ objectAvatar, relation, subjectAvatar, expiryTime, objectAvatarType }[]`
- **Balances**: `avatar.balances.getTokenBalances()` → `{ attoCircles: bigint }[]` — field name `attoCircles` is correct
- **Profiles batch**: `sdk.rpc.profile.getProfileByAddressBatch(addresses[])` → map by address
- **Token ID for personal CRC**: `BigInt(creatorAddress)` — creator's address as uint256
- **ERC-1155 auth**: `safeTransferFrom(from, to, ...)` requires `msg.sender === from` OR `isApprovedForAll(from, msg.sender)` — must be signed by token owner

## Iframe Constraint Patterns

- `confirm()` / `alert()` — blocked; replace with inline UI
- `navigator.clipboard.writeText()` — may be blocked; provide fallback modal
- `window.location.href` assignment — may be blocked; use `history.replaceState` + re-render
- `window.open()` / new tabs — blocked; use inline links with `target="_blank"` on anchors only

## Next Steps
- Test apps in the Circles wallet iframe environment
- Verify envio indexer schema for backer-voting once governance infra is deployed
- Consider additional miniapp ideas from `miniapp-ideas.md` (if it exists)