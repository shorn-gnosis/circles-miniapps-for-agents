# Trust Network Explorer — Requirements

## User Story
As a Circles user, I want to explore trust relationships in the ecosystem so I can understand who trusts whom and discover new connections.

## Functional Requirements
- FR1: Display connected wallet's trust network (incoming and outgoing trust)
- FR2: Show profile information for each trusted address (name, avatar)
- FR3: Allow searching for any address or name to view their trust network
- FR4: Display trust counts (number of trusters, number trusting)
- FR5: Show recent trust events from the CirclesRPC index
- FR6: Allow clicking on any address to navigate to their trust network

## Non-Functional Requirements
- NFR1: Must load inside an iframe
- NFR2: Must work with passkey-based Safe accounts
- NFR3: All RPC queries must use fallback URLs for reliability
- NFR4: Mobile responsive (works at 375px width)
- NFR5: Load time under 3 seconds for initial trust data

## Out of Scope
- Adding/removing trust relationships (read-only for v1)
- Trust pathfinding algorithms
- Graph visualisation with D3/sigma.js (use simple list view)

## Acceptance Criteria
- [ ] Wallet connection shown on load with address badge
- [ ] Connected user's trust network displays correctly
- [ ] Search by address or name returns results
- [ ] Clicking a profile loads their trust network
- [ ] Error states handled gracefully (no profile, network errors)
- [ ] Loading states shown during data fetches
