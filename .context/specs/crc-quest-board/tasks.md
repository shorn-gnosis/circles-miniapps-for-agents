# CRC Quest Board — Tasks

## Phase 1: Scaffold & Setup (15 min)
- [ ] Run `./scripts/new-miniapp.sh crc-quest-board "CRC Quest Board"`
- [ ] Install dependencies: `npm install`
- [ ] Copy CSS design system from template
- [ ] Set up basic index.html structure with navigation tabs
- [ ] Add Google Fonts (Space Grotesk, JetBrains Mono)
- [ ] Verify `miniapp-sdk.js` is copied correctly
- [ ] Test dev server runs: `npm run dev`

## Phase 2: Wallet Integration (20 min)
- [ ] Import `onWalletChange` from miniapp-sdk
- [ ] Implement wallet connection handler
- [ ] Show connected address and profile name
- [ ] Handle disconnect state gracefully
- [ ] Add passkey auto-connect error detection
- [ ] Display wallet status badge in header
- [ ] Test with mock wallet connection

## Phase 3: Profile & Balance Loading (20 min)
- [ ] Initialize Circles SDK for reads
- [ ] Fetch user profile on wallet connect
- [ ] Load avatar and token balances
- [ ] Calculate total CRC balance
- [ ] Query trust relations for trust score
- [ ] Cache profile data in localStorage
- [ ] Show user stats (completed quests, earned CRC)
- [ ] Handle missing profile gracefully (show address only)

## Phase 4: Quest Data Model & Storage (15 min)
- [ ] Define Quest data structure
- [ ] Implement localStorage CRUD operations
- [ ] Add quest ID generation (UUID or timestamp-based)
- [ ] Implement quest state transitions
- [ ] Add validation for quest fields
- [ ] Test quest creation and retrieval

## Phase 5: Quest List UI (30 min)
- [ ] Create quest card component HTML/CSS
- [ ] Render quest list from localStorage
- [ ] Add sorting options (newest, reward, deadline)
- [ ] Add filter dropdown (reward range, trust requirement)
- [ ] Show quest state badges (OPEN, CLAIMED, etc.)
- [ ] Display creator profile (name or address)
- [ ] Add deadline countdown timer
- [ ] Implement pagination or lazy loading
- [ ] Add empty state for no quests

## Phase 6: Quest Creation Form (25 min)
- [ ] Create quest form HTML with all fields
- [ ] Add title input with character limit
- [ ] Add description textarea with character limit
- [ ] Add reward input with CRC suffix
- [ ] Validate reward against user balance
- [ ] Add deadline date-time picker
- [ ] Add min trust slider (0-100)
- [ ] Implement form validation
- [ ] Show preview before submission
- [ ] Save quest to localStorage on submit
- [ ] Show success toast and navigate to quest list

## Phase 7: Quest Detail View (20 min)
- [ ] Create quest detail page HTML
- [ ] Show full quest information
- [ ] Display creator profile with trust score
- [ ] Show claim status and claimer info (if claimed)
- [ ] Add back navigation to quest list
- [ ] Implement deep linking by quest ID
- [ ] Add share quest button (copy link)

## Phase 8: Quest Claiming (20 min)
- [ ] Add "Claim Quest" button (only if OPEN)
- [ ] Validate trust requirement before claiming
- [ ] Update quest state to CLAIMED
- [ ] Set claimer address and timestamp
- [ ] Show claimed quests in "My Quests" tab
- [ ] Prevent claiming own quests
- [ ] Show error if already claimed by others

## Phase 9: Quest Completion Flow (30 min)
- [ ] Add "Submit Completion" button (only for claimer)
- [ ] Create completion proof textarea
- [ ] Update quest state to PENDING_REVIEW
- [ ] Store completion proof text
- [ ] Show pending quests to creator
- [ ] Add "Approve" and "Reject" buttons for creator
- [ ] On reject, reset to CLAIMED state
- [ ] Show toast notifications for actions

## Phase 10: CRC Transfer on Approval (40 min)
- [ ] Import `sendTransactions` from miniapp-sdk
- [ ] Import `encodeFunctionData` from viem
- [ ] Define HUB_V2 transfer ABI
- [ ] Calculate tokenId from creator address
- [ ] Convert reward amount to wei
- [ ] Encode safeTransferFrom call
- [ ] Show processing overlay during transaction
- [ ] Execute transaction via sendTransactions
- [ ] Wait for transaction receipt (use multi-RPC polling)
- [ ] Update quest state to COMPLETED
- [ ] Store transaction hash
- [ ] Show success message with tx link
- [ ] Handle transaction failures gracefully
- [ ] Update user's earned CRC total

## Phase 11: Quest Cancellation (15 min)
- [ ] Add "Cancel Quest" button (only for creator, only if OPEN)
- [ ] Update quest state to CANCELLED
- [ ] Remove from open quests list
- [ ] Show in "My Quests" with CANCELLED badge
- [ ] Prevent cancellation if claimed

## Phase 12: Quest History & Stats (20 min)
- [ ] Query completed quests from localStorage
- [ ] Calculate user stats (completed count, total earned)
- [ ] Display stats in user profile section
- [ ] Show quest history timeline
- [ ] Add transaction links to block explorer
- [ ] Optional: Query CirclesRPC for transfer verification

## Phase 13: Error Handling & Edge Cases (25 min)
- [ ] Add error boundary for unexpected errors
- [ ] Handle insufficient balance errors
- [ ] Handle expired quests (auto-close)
- [ ] Handle network errors with retry
- [ ] Handle passkey auto-connect errors
- [ ] Add validation for all user inputs
- [ ] Show helpful error messages
- [ ] Add retry buttons where appropriate
- [ ] Test all error scenarios

## Phase 14: Polish & UX (20 min)
- [ ] Add loading spinners for async operations
- [ ] Add toast notifications for all actions
- [ ] Improve empty states with illustrations
- [ ] Add tooltips for trust score and other metrics
- [ ] Implement smooth transitions between views
- [ ] Add confirmation dialogs for destructive actions
- [ ] Improve mobile responsiveness
- [ ] Test on mobile viewport (375px)
- [ ] Add keyboard navigation support

## Phase 15: Testing (30 min)
- [ ] Test wallet connect/disconnect flows
- [ ] Test quest creation with various inputs
- [ ] Test quest claiming (own vs others)
- [ ] Test completion submission
- [ ] Test approval and CRC transfer
- [ ] Test rejection flow
- [ ] Test quest cancellation
- [ ] Test filters and sorting
- [ ] Test expired quest handling
- [ ] Test insufficient balance scenarios
- [ ] Test mobile responsiveness
- [ ] Test error recovery

## Phase 16: Documentation (15 min)
- [ ] Write README.md with usage instructions
- [ ] Document quest states and transitions
- [ ] Add screenshots to README
- [ ] Document known limitations
- [ ] Add future enhancement ideas

## Phase 17: Build & Deploy (15 min)
- [ ] Run `npm run build` in examples/crc-quest-board
- [ ] Verify build succeeds with no errors
- [ ] Run `./scripts/deploy-miniapp.sh examples/crc-quest-board`
- [ ] Capture Vercel deployment URL
- [ ] Disable Vercel Deployment Protection
- [ ] Test deployed miniapp in browser
- [ ] Test miniapp inside Gnosis wallet iframe

## Phase 18: Register & PR (10 min)
- [ ] Add entry to `static/miniapps.json` with deployment URL
- [ ] Run `./scripts/open-pr.sh crc-quest-board "CRC Quest Board" "Community bounty marketplace for Circles"`
- [ ] Verify PR opened successfully
- [ ] Update `.context/miniapp-ideas.md` (mark quest board as Built)
- [ ] Update `.context/activeContext.md` with completion status

## Total Estimated Time: ~5.5 hours
