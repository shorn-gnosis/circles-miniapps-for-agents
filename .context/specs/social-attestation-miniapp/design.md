# Design — Social Attestation Miniapp

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Miniapp (Iframe)                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  UI: Platform buttons → OAuth redirect → Attestation preview││
│  │                          ↓ postMessage                       ││
│  │  Wallet: Get address → Sign profile update                   ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────────┐
│   Backend API (Vercel)   │     │     OAuth Providers             │
│  • /oauth/{platform}     │────▶│  • Twitter OAuth 2.0            │
│  • /oauth/callback       │◀────│  • GitHub OAuth                 │
│  • /attest               │     │  • Discord OAuth 2.0            │
│  • /verify               │     └─────────────────────────────────┘
│  • JWT signing (Ed25519) │
└─────────────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│  Circles Profile (IPFS)          │
│  {                               │
│    name: "...",                  │
│    attestations: [               │
│      {                           │
│        platform: "github",       │
│        handle: "username",       │
│        jwt: "eyJ...",           │
│        verifiedAt: "2024-..."    │
│      }                           │
│    ]                             │
│  }                               │
└─────────────────────────────────┘
```

## Attestation JWT Structure

```json
{
  "header": {
    "alg": "EdDSA",
    "typ": "JWT"
  },
  "payload": {
    "iss": "circles-attestation-service",
    "sub": "0x1234...abcd",
    "platform": "github",
    "handle": "shorn-keld",
    "iat": 1699999999,
    "exp": 1731535999
  },
  "signature": "..."
}
```

## API Endpoints

### `GET /api/oauth/{platform}`
Initiates OAuth flow. Returns redirect URL.

### `GET /api/oauth/callback/{platform}`
Handles OAuth callback. Exchanges code for token, fetches user info, stores session.

### `POST /api/attest`
Creates signed attestation JWT.
```json
{
  "address": "0x...",
  "platform": "github",
  "sessionToken": "..."
}
```
Returns:
```json
{
  "jwt": "eyJ...",
  "platform": "github",
  "handle": "username"
}
```

### `POST /api/verify`
Verifies an attestation JWT.
```json
{
  "jwt": "eyJ..."
}
```
Returns:
```json
{
  "valid": true,
  "payload": { ... }
}
```

## State Management

```javascript
const state = {
  connectedAddress: null,
  pendingPlatform: null,
  oauthSession: null,
  attestations: [],
  currentAttestation: null
};
```

## Profile Update Flow

1. Fetch current profile via SDK
2. Merge new attestation into `attestations` array
3. Pin updated profile to IPFS
4. Update on-chain profile metadata digest

## File Structure

```
examples/social-attestation/
├── index.html
├── main.js
├── style.css
├── miniapp-sdk.js
├── package.json
└── api/
    ├── oauth/
    │   └── [platform].ts      # Vercel serverless functions
    ├── callback/
    │   └── [platform].ts
    ├── attest.ts
    └── verify.ts
```

## Security Considerations

- OAuth secrets stored in Vercel environment variables
- JWT signing key (Ed25519 private) in Vercel env
- Session tokens are short-lived (5 minutes)
- Attestations expire after 1 year
- Frontend never sees OAuth tokens
