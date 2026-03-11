# Progress

## What Works
- Agent-ready template scaffolded
- miniapp-sdk.js postMessage bridge
- SvelteKit shell with iframe loader
- Example miniapps: sign-demo, tx-demo
- **CRC Quest Board**: Full bounty marketplace implementation
- **CRC Social Vouchers**: Gift voucher system with QR codes
- **Social Attestation**: Self-signed attestations for social accounts
  - Self-attestation: user signs message claiming handle ownership
  - Stored in Circles profile via NameRegistry
  - Deployed to Vercel

## Remaining
- Verify attestation persistence works end-to-end
- Consider namespaces for cleaner data storage

## Known Issues
- SDK `profiles.create()` strips `extensions` field despite TypeScript interface
- Workaround: using `location` field for JSON storage
