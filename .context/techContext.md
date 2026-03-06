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
