# Requirements — Social Attestation Miniapp

## Overview

A miniapp that allows users to create self-signed attestations for their social accounts (GitHub, Twitter, Discord) and store them in their Circles profile.

## Core Requirements

1. **Wallet Connection** — User connects their Circles wallet via the host's postMessage bridge
2. **Self-Attestation** — User signs a message claiming ownership of a social handle
   - Platform selection: Twitter, GitHub, Discord
   - Handle input
   - Message signing via Safe wallet
3. **Profile Storage** — Attestation stored in Circles profile metadata
   - Uses `location` field as JSON store (SDK strips `extensions`)
   - Stored on IPFS, CID registered on NameRegistry v2
4. **Display** — Show existing attestations from profile

## User Journey

1. User opens miniapp in Circles host
2. Wallet auto-connects via postMessage bridge
3. User selects platform (Twitter/GitHub/Discord)
4. User enters their username/handle
5. User signs attestation message with wallet
6. Preview shows attestation details
7. User clicks "Add to Profile"
8. Profile updated on IPFS + NameRegistry
9. Attestation visible in profile

## Technical Constraints

- **OAuth blocked** — sandboxed iframes block popups/new tabs
- Self-attestation approach: trust based on wallet signature
- Profile fields limited: `name`, `description`, `previewImageUrl`, `imageUrl`, `location`, `geoLocation`
- `extensions` field NOT persisted by SDK (despite TypeScript interface)
- Workaround: `location` field stores JSON array of attestations

## Implementation Notes

- NameRegistry v2: `0xA27566fD89162cC3D40Cb59c87AAaA49B85F3474`
- `updateMetadataDigest(bytes32)` for profile updates
- `cidV0ToHex()` from `@aboutcircles/sdk-utils` converts CID to digest

## Success Criteria

- [x] Self-attestation signing works
- [x] Attestations persist in user profiles
- [ ] Verify attestation display after storage
