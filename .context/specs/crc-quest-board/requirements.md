# CRC Quest Board — Requirements

## User Story

As a Circles user, I want to post and complete community tasks with CRC rewards so that I can earn CRC by helping others or get things done by rewarding my community.

## Functional Requirements

### Quest Creation
- FR1: Users can create quests with a title, description, reward amount (in CRC), and deadline
- FR2: Quest creators must have sufficient CRC balance (validated before posting)
- FR3: Each quest gets a unique identifier and timestamp
- FR4: Quest creators can specify required trust level (optional filter)

### Quest Discovery
- FR5: Users can browse all open quests sorted by reward or recency
- FR6: Users can filter quests by reward range, deadline, or trust requirements
- FR7: Quest list shows creator profile, reward, deadline, and claim status

### Quest Claiming & Completion
- FR8: Users can claim a quest (first-come-first-serve basis)
- FR9: Quest claimers can mark quests as completed with optional proof/description
- FR10: Quest creators can approve or reject completion
- FR11: On approval, CRC reward is automatically transferred to claimer

### Reputation & Trust
- FR12: User profiles show completed quests count and total earned
- FR13: Trust network score affects quest visibility (trusted users' quests highlighted)
- FR14: Quest history is queryable via CirclesRPC

### State Management
- FR15: Quests have states: OPEN, CLAIMED, PENDING_REVIEW, COMPLETED, CANCELLED
- FR16: Quest creators can cancel unclaimed quests
- FR17: Expired quests (past deadline) are automatically closed

## Non-Functional Requirements

- NFR1: Must load inside an iframe with no external dependencies beyond CDN
- NFR2: Must work with passkey-based Safe accounts
- NFR3: All transaction values in hex format (0x...)
- NFR4: Quest data stored client-side (localStorage) with optional IPFS pinning for persistence
- NFR5: Mobile-responsive design (works at 375px width)
- NFR6: Load time < 3 seconds on 3G connection
- NFR7: No backend server required for MVP (all state in localStorage + on-chain)

## Out of Scope (for MVP)

- Quest escrow/smart contracts (rewards paid directly on approval)
- Dispute resolution mechanism
- Quest categories/tags
- Multi-player quests
- Recurring quests
- Backend API/database
- Quest search by keyword

## Acceptance Criteria

- [ ] Wallet connection shown on load with user profile
- [ ] Users can create quests with all required fields
- [ ] Quest list displays all open quests with filters
- [ ] Users can claim open quests
- [ ] Claimers can submit completion
- [ ] Creators can approve/reject completion
- [ ] CRC transfer happens automatically on approval
- [ ] Quest history shows completed quests
- [ ] Error states handled gracefully (disconnect, insufficient balance, network errors)
- [ ] Mobile-responsive UI
- [ ] Matches Gnosis wallet design language
