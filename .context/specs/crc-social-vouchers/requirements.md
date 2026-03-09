# CRC Social Vouchers — Requirements

## User Story
As a Circles user, I want to create gift vouchers that others can redeem for my CRC so that I can share value with friends and community members easily.

## Functional Requirements
- FR1: User can create a voucher with amount, message, and optional expiry
- FR2: Voucher generates a shareable link/QR code
- FR3: Recipient can view voucher details before redeeming
- FR4: Recipient with connected wallet can redeem voucher for CRC
- FR5: Creator can view their created vouchers and redemption status
- FR6: Vouchers are one-time use - marked claimed after redemption
- FR7: Expired vouchers cannot be redeemed

## Non-Functional Requirements
- NFR1: Must load inside an iframe
- NFR2: Must work with passkey-based Safe accounts
- NFR3: All values in hex for transaction data
- NFR4: Voucher data stored client-side (localStorage for demo, could be off-chain later)

## Out of Scope
- Backend persistence (using localStorage for MVP)
- Voucher trading/transfer after creation
- Partial redemption
- Voucher NFTs

## Acceptance Criteria
- [ ] Wallet connection shown on load
- [ ] Create voucher form works with amount/message/expiry
- [ ] Shareable link generated with voucher ID
- [ ] Redeem page shows voucher details
- [ ] CRC transfer on redemption via Hub V2
- [ ] Error states handled gracefully
