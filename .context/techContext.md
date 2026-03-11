# Tech Context

## Stack
- SvelteKit (host shell — serves miniapps via iframe)
- Vanilla JS miniapps (index.html + main.js + style.css + miniapp-sdk.js)
- Viem for on-chain reads
- @aboutcircles/sdk for Circles protocol
- Vercel for deployment

## Network
- Gnosis Chain only (chain ID 100)

## Key Constraints
- Miniapps are sandboxed iframes — no direct wallet access
- All wallet ops go via postMessage bridge (miniapp-sdk.js)
- No npm in miniapps — CDN imports only (esm.sh or unpkg)
- OAuth blocked in sandboxed iframes (no popups/new tabs)

## Key Contract Addresses (Gnosis Chain)
- **NameRegistry v2**: `0xA27566fD89162cC3D40Cb59c87AAaA49B85F3474` — profile metadata updates
- **Hub V2**: `0xc12C1E50ABB450d6205Ea2C3Fa861b3B834d13e8`
