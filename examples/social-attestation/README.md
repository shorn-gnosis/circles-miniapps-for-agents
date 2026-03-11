# Social Attestation

A Circles MiniApp that verifies ownership of social accounts (GitHub, Twitter, Discord) and creates signed attestations that can be added to a user's Circles profile.

## Overview

Users can prove they own a social media account by going through an OAuth flow. The service creates a cryptographically-signed JWT attestation that proves "address X owns account Y on platform Z". This attestation is stored in the user's Circles profile metadata.

## Development

```bash
npm install
npm run dev
```

Load it in the Circles MiniApp host via the Advanced tab at `https://circles.gnosis.io/miniapps`.

## Setup

### 1. Generate Attestation Keypair

```bash
node scripts/generate-keypair.js
```

This outputs a public/private keypair. Store these securely.

### 2. Configure OAuth Apps

Create OAuth applications for each platform:

**GitHub:**
1. Go to https://github.com/settings/developers
2. Create new OAuth App
3. Set callback URL: `https://your-vercel-app.vercel.app/api/oauth/github`

**Twitter:**
1. Go to https://developer.twitter.com/en/portal/dashboard
2. Create new OAuth 2.0 App
3. Set callback URL: `https://your-vercel-app.vercel.app/api/oauth/twitter`

**Discord:**
1. Go to https://discord.com/developers/applications
2. Create new application
3. Add OAuth2 redirect: `https://your-vercel-app.vercel.app/api/oauth/discord`

### 3. Set Environment Variables

In Vercel dashboard, add these environment variables:

```
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
ATTESTATION_PRIVATE_KEY=your_private_key_hex
ATTESTATION_PUBLIC_KEY=your_public_key_hex
```

## Deployment

```bash
./scripts/deploy-miniapp.sh examples/social-attestation
```

**Important:** Disable Deployment Protection in Vercel settings, or the miniapp won't load in the iframe.

## Architecture

- **Frontend**: Svelte-less vanilla JS miniapp with OAuth redirect flow
- **Backend**: Vercel serverless functions for OAuth handling and JWT signing
- **JWT**: EdDSA-signed attestations with 1-year expiry
- **Storage**: Attestations stored in Circles profile metadata (IPFS-pinned)

## Attestation JWT Structure

```json
{
  "header": { "alg": "EdDSA", "typ": "JWT" },
  "payload": {
    "iss": "circles-attestation-service",
    "sub": "0x1234...abcd",
    "platform": "github",
    "handle": "username",
    "iat": 1699999999,
    "exp": 1731535999
  }
}
```

## Verification

Anyone can verify attestations using the public key:

```javascript
import { verifyAttestation } from './api/_jwt.js';

const payload = await verifyAttestation(jwt);
console.log(payload); // { sub, platform, handle, ... }
```

## Chain

Gnosis Chain (ID 100)
