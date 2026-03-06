# Product Context

## Why This Project Exists

Mini apps need a reliable host for the Circles ecosystem that works inside the Gnosis app and offers a standard wallet bridge. This host handles Safe smart account connection and exposes the minimal capabilities required by mini apps.

## Problems It Solves

1. **Wallet connection** — Centralises passkey-based Safe account access.
2. **Transaction approval** — Provides a consistent approval UI for send/sign requests.
3. **App discovery** — Lists available mini apps from `static/miniapps.json`.
4. **Embedding constraints** — Ensures apps load safely inside iframes.

## User Journey

1. User opens `/miniapps` and sees available apps.
2. User connects their Safe wallet (passkey).
3. User launches a mini app, which can request address or transaction approval via postMessage.
4. The host mediates approvals and sends responses back to the app.

## UX Goals

- Fast launch with minimal friction.
- Clear approval prompts and safe defaults.
- Works on mobile and inside in-app browsers.
