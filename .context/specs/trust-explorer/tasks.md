# Trust Network Explorer — Tasks

## Phase 1: Scaffold
- [x] Run `./scripts/new-miniapp.sh trust-explorer "Trust Explorer"`
- [x] Install dependencies
- [x] Copy miniapp-sdk.js

## Phase 2: Wallet Integration
- [x] Import onWalletChange from miniapp-sdk
- [x] Handle connect/disconnect states
- [x] Show connected address in badge
- [x] Add passkey error handling

## Phase 3: Profile & Trust Queries
- [x] Create read-only SDK instance
- [x] Implement getProfile(address) function
- [x] Implement getTrustRelations(address) function
- [x] Implement searchProfiles(query) function
- [x] Add loading states

## Phase 4: UI Components
- [x] Profile card component (name, address, counts)
- [x] Trust list component (trusting/trustedBy tabs)
- [x] Trust item card (clickable to navigate)
- [x] Search bar with results dropdown
- [x] Back to self button when viewing other

## Phase 5: Polish
- [x] Error handling for all edge cases
- [x] Empty states (no profile, no trust)
- [x] Loading spinners
- [x] Mobile responsive layout
- [x] Toast notifications

## Phase 6: Deploy
- [ ] Run `npm run build` locally
- [ ] Deploy with `./scripts/deploy-miniapp.sh`
- [ ] Disable Vercel Deployment Protection
- [ ] Add entry to static/miniapps.json
- [ ] Open PR

## Phase 7: Final Verification
- [ ] Test wallet connect/disconnect
- [ ] Test search functionality
- [ ] Test navigation between profiles
- [ ] Verify mobile responsive
- [ ] Check all error states
