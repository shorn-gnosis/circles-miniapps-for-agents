# Tasks — Social Attestation Miniapp

## Phase 1: Core Infrastructure

- [x] Scaffold miniapp folder structure
- [x] Create basic UI with platform selection buttons
- [x] Implement wallet connection handling
- [x] Integrate `@aboutcircles/sdk` for profile operations

## Phase 2: Self-Attestation Flow (OAuth abandoned)

- [x] Platform selection UI (GitHub, Twitter, Discord)
- [x] Handle input form
- [x] Message signing via Safe wallet
- [x] Attestation preview display

## Phase 3: Profile Storage

- [x] Fetch current profile via SDK
- [x] Store attestations in `location` field (JSON)
- [x] Pin updated profile to IPFS via `sdk.profiles.create()`
- [x] Update NameRegistry via `updateMetadataDigest(bytes32)`

## Phase 4: Display & UX

- [x] Load existing attestations from profile
- [x] Show attestation list
- [x] Error handling and loading states
- [x] Mobile responsive design

## Phase 5: Deploy

- [x] Build and deploy to Vercel
- [x] Register in `static/miniapps.json`
- [ ] Verify end-to-end flow works

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| OAuth abandoned | Sandboxed iframes block popups/new tabs |
| Self-attestation | User signs claim, trust based on wallet ownership |
| `location` field | SDK strips `extensions`, only core fields persist |
| NameRegistry v2 | Correct contract for profile metadata updates |

## Current Status

**Deployed**: https://circles-social-attestation-i17on5nc4-circles-personal.vercel.app

**Pending**: Verify attestations persist correctly after transaction
