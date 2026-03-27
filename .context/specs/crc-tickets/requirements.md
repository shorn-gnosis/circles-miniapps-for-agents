# CRC Tickets — Requirements

## User Story
As a Circles user attending an event, I want to pay for a ticket with CRC and receive an NFT ticket to my wallet and a confirmation to my email, so that I have verifiable proof of my ticket purchase.

## Functional Requirements
- FR1: Attendee connects wallet via Circles MiniApp SDK
- FR2: Attendee enters their email address
- FR3: Attendee pays a configurable CRC amount to an org/payment gateway address
- FR4: After payment confirmation, a backend grants an Unlock Protocol NFT key to the attendee's wallet via `grantKeys`
- FR5: Attendee sees a success screen with ticket details and tx hashes

## Non-Functional Requirements
- NFR1: Must load inside an iframe (Circles MiniApp host)
- NFR2: Must work with passkey-based Safe accounts
- NFR3: All transaction values in hex for the MiniApp SDK
- NFR4: No secrets or private keys on the client

## Out of Scope (PoC)
- Lock creation (pre-existing lock assumed)
- Payment gateway creation (pre-existing gateway assumed)
- Email delivery (Unlock Protocol infrastructure or separate service)
- Multiple ticket types / pricing tiers
- Refunds

## Configuration (set by event organiser)
- `LOCK_ADDRESS`: Unlock Protocol lock on Gnosis Chain
- `ORG_ADDRESS`: Circles org/payment gateway address receiving CRC
- `TICKET_PRICE_CRC`: Price in CRC (human-readable, e.g. "5")

## Acceptance Criteria
- [ ] Wallet connection shown on load
- [ ] Email input with basic validation
- [ ] CRC payment executes via Hub V2 safeTransferFrom
- [ ] Payment confirmation displayed
- [ ] grantKeys call documented / implemented via API route
- [ ] Error states handled gracefully (disconnected, rejected tx, passkey error)
