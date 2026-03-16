# Test Account Flagger — Tasks

## Phase 1: Scaffold
- [ ] Run `new-miniapp.sh test-account-flagger "Test Account Flagger"`
- [ ] Verify directory structure and install deps

## Phase 2: Wallet Integration
- [ ] Import onWalletChange from miniapp-sdk.js
- [ ] Handle connect/disconnect states
- [ ] Show address when connected

## Phase 3: Core Feature — Read Flag Status
- [ ] Fetch profile on connect
- [ ] Parse description for ##TEST_ACCOUNT## marker
- [ ] Display current flag status (flagged/unflagged)
- [ ] Handle no-avatar case gracefully

## Phase 4: Core Feature — Write Flag
- [ ] Implement flag operation (add marker to description, pin, update on-chain)
- [ ] Implement unflag operation (remove marker, pin, update on-chain)
- [ ] Implement CID-to-hex conversion
- [ ] Implement receipt polling
- [ ] Preserve all existing profile fields

## Phase 5: Polish
- [ ] Error handling (passkey, RPC, no avatar)
- [ ] Loading states and disabled buttons during tx
- [ ] Toast notifications
- [ ] Responsive layout

## Phase 6: Deploy
- [ ] npm run build
- [ ] Deploy to Vercel
- [ ] Disable deployment protection
- [ ] Register in miniapps.json
- [ ] Open PR
