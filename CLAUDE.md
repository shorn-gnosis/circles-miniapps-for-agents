# Circles MiniApps — Claude Code Instructions

## Memory Bank

At the start of every session, read all `.context` files and emit:
- `[Memory Bank: Active]` — files read successfully
- `[Memory Bank: Missing]` — warn user and suggest initialisation

Read in order:

1. `.context/projectbrief.md`
2. `.context/productContext.md`
3. `.context/systemPatterns.md`
4. `.context/techContext.md`
5. `.context/activeContext.md`
6. `.context/progress.md`
7. `.context/miniappDevelopmentGuide.md` ← critical 37KB reference

Also read any relevant `.context/specs/<feature>/` subdirectories.

---

## Autonomous Build Mode

If your task is to **build a miniapp autonomously**, follow `AGENT.md` at the repo root. That document is the complete workflow — do not improvise the process.

---

## Key Conventions

- **Network**: Gnosis Chain only (chain ID 100)
- **Language**: British English in all docs and comments
- **Miniapp structure**: `index.html` + `main.js` + `style.css` + `miniapp-sdk.js`
- **SDK split**:
  - `miniapp-sdk.js` = postMessage bridge for wallet ops (transactions, signing) only
  - `@aboutcircles/sdk` + `viem` = read Circles state (profiles, trust, avatars, balances)
- **Deployment**: Vercel (use `scripts/deploy-miniapp.sh`)
- **PR target**: `master` on `aboutcircles/CirclesMiniapps`

## Context7

Fetch from Context7 before writing any Circles SDK code. Never rely on training data for SDK APIs.

| Resource | Context7 ID |
|---|---|
| Circles SDK v2 | `/aboutcircles/sdk` |
| Circles docs | `/aboutcircles/circles-docs` |
| Starter Kit | `/aboutcircles/circles-gnosisapp-starter-kit` |

## Security

Before any commit: no API keys, no hardcoded credentials, no PII. Use env vars.
