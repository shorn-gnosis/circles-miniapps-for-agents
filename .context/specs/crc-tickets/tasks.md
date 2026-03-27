# CRC Tickets — Tasks

## Phase 1: Scaffold
- [ ] Run scripts/new-miniapp.sh crc-tickets
- [ ] Copy miniapp-sdk.js
- [ ] Set up package.json with deps (+ unlock-js or direct ABI)
- [ ] npm install

## Phase 2: Wallet Integration
- [ ] Import onWalletChange from miniapp-sdk
- [ ] Handle connect / disconnect states
- [ ] Show address badge when connected

## Phase 3: Email + Payment UI
- [ ] Email input with validation
- [ ] Ticket info display (event name, price)
- [ ] "Buy Ticket" button
- [ ] Loading/spinner states

## Phase 4: CRC Payment
- [ ] Build safeTransferFrom calldata for Hub V2
- [ ] Execute via sendTransactions
- [ ] Wait for receipt (multi-RPC polling)
- [ ] Show payment confirmation

## Phase 5: Grant Ticket (API Route)
- [ ] Create api/grant-ticket.js serverless function
- [ ] Verify payment tx on-chain
- [ ] Call grantKeys on Unlock lock
- [ ] Return NFT token ID

## Phase 6: Polish
- [ ] Error handling (passkey, rejected tx, network errors)
- [ ] Loading states throughout
- [ ] Responsive layout (560px)
- [ ] Success screen with all details

## Phase 7: Deploy
- [ ] npm run build
- [ ] Deploy to Vercel
- [ ] Register in miniapps.json
- [ ] Open PR
