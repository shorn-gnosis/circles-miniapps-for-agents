# System Patterns

## Architecture Overview

SvelteKit app with a single host surface:

```
/miniapps           → list of apps
/miniapps/<slug>    → iframe view of app
```

Wallet connectivity and signing live in a shared store (`src/lib/wallet.svelte.ts`) and are used across pages.

## Key Technical Decisions

- **Cometh Connect SDK** for passkey-based Safe smart accounts.
- **postMessage bridge** for app → host requests and host → app responses.
- **Sandboxed iframes** for security (scripts and forms allowed).
- **Static adapter** for simple hosting.

## Critical Paths

1. **Wallet connection** → passkey resolution → Safe address → account client.
2. **postMessage handling** → request validation → approval UI → response.
3. **App list** → JSON fetch from `static/miniapps.json` → render list.

## Component Map

- `src/routes/miniapps/+page.svelte` — app list and iframe view with bridge
- `src/routes/miniapps/[slug]/+page.svelte` — dedicated iframe view for a single app
- `src/lib/wallet.svelte.ts` — wallet connection and transaction/sign methods
- `src/lib/ApprovalPopup.svelte` — approval UI for sign/tx requests

## Miniapp Development

For comprehensive miniapp development patterns, architecture, and best practices, see:
**`.context/miniappDevelopmentGuide.md`**

This guide covers:
- PostMessage bridge protocol
- Runner bridge patterns (basic + Safe owner)
- Circles SDK integration
- Receipt polling with multi-RPC fallback
- Org-manager design system
- State machine patterns
- CirclesRPC queries
- Development workflow
- Reference implementations
- Troubleshooting guide

**Reference implementation**: `examples/vendor-offer-setup/` — production-ready miniapp with all patterns
