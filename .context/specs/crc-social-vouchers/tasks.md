# CRC Social Vouchers — Tasks

## Phase 1: Scaffold
- [x] Create directory structure
- [x] Copy miniapp-sdk.js
- [x] Set up package.json with deps
- [x] Basic index.html shell

## Phase 2: Wallet Integration
- [x] Import onWalletChange
- [x] Handle connect / disconnect states
- [x] Show address when connected

## Phase 3: Core Feature - Create Voucher
- [x] Create voucher form UI
- [x] Generate unique voucher ID
- [x] Store voucher in localStorage
- [x] Generate shareable link
- [x] Display QR code for link

## Phase 4: Core Feature - Redeem Voucher
- [x] Parse voucher ID from URL
- [x] Load voucher from storage
- [x] Show voucher details (amount, message, creator)
- [x] Validate voucher (not expired, not claimed)
- [x] Execute CRC transfer via Hub V2
- [x] Mark voucher as claimed

## Phase 5: My Vouchers View
- [x] List created vouchers
- [x] Show redemption status
- [x] Copy/share link functionality

## Phase 6: Polish
- [x] Error handling
- [x] Loading states
- [x] Responsive layout
- [x] Expiry handling

## Phase 7: Deploy
- [x] Run deploy script
- [x] Capture Vercel URL
- [x] Register in miniapps.json
- [x] Open PR
