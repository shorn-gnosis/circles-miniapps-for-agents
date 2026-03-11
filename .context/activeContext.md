# Active Context

## Current Focus
Social Attestation miniapp deployed and functional.

## Recent Changes
- **OAuth abandoned** - sandboxed iframes block popups/new tabs
- **Self-attestation approach**: user signs message claiming social handle ownership
- **Profile storage**: using `location` field as JSON store (SDK strips `extensions`)
- Deployed to Vercel: https://circles-social-attestation-i17on5nc4-circles-personal.vercel.app
- Registered in `static/miniapps.json`

## Technical Discoveries
- `sdk.profiles.create()` strips unknown fields - only `name`, `description`, `previewImageUrl`, `imageUrl`, `location`, `geoLocation` preserved
- `extensions` field in TypeScript interface NOT persisted by SDK
- Workaround: store custom data as JSON in `location` field
- Profile update flow: `sdk.profiles.create()` → CID → `cidV0ToHex()` → `updateMetadataDigest(bytes32)` on NameRegistry v2 (`0xA27566fD89162cC3D40Cb59c87AAaA49B85F3474`)

## Next Steps
- Test end-to-end attestation flow
- Verify attestations persist correctly on IPFS
- Consider cleaner storage solution (namespaces?) for production
