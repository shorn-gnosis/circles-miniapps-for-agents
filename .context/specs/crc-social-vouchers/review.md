# CRC Social Vouchers — App Review

**Review Date**: 12 March 2026  
**Reviewer**: Automated Code Review  
**Overall Verdict**: 🔴 Broken — Voucher redemption mechanism fundamentally flawed

---

## 1. Spec Compliance

### Functional Requirements

| Req | Description | Status | Notes |
|-----|-------------|--------|-------|
| FR1 | Create voucher with amount, message, optional expiry | ✅ Implemented | Form validates all fields |
| FR2 | Generates shareable link/QR code | ✅ Implemented | URL param `?voucher=ID`, QR via esm.sh |
| FR3 | Recipient can view voucher details before redeeming | ✅ Implemented | `showRedeemMode()` renders details |
| FR4 | Recipient with connected wallet can redeem for CRC | 🔴 **Critical Issue** | Transfer will fail — see below |
| FR5 | Creator can view created vouchers + redemption status | ✅ Implemented | My Vouchers list with badges |
| FR6 | Vouchers are one-time use | ✅ Implemented | `claimedBy` set after redemption, checked on load |
| FR7 | Expired vouchers cannot be redeemed | ✅ Implemented | Expiry check in `showRedeemMode()` |

### Non-Functional Requirements

| Req | Description | Status | Notes |
|-----|-------------|--------|-------|
| NFR1 | Loads inside iframe | ✅ | Uses miniapp-sdk.js postMessage bridge |
| NFR2 | Works with passkey-based Safe accounts | 🟡 | Has passkey error detection |
| NFR3 | All values in hex for transaction data | ✅ | Uses `'0x0'` for value |
| NFR4 | Voucher data in localStorage | ✅ | Key: `crc_vouchers` |

---

## 2. Critical Issues (Blockers)

### 🔴 CRITICAL: Voucher Redemption Will Always Fail

**Location**: `window.redeemVoucher()` function

```javascript
const tokenId = BigInt(voucher.creator);

const data = encodeFunctionData({
  abi: HUB_TRANSFER_ABI,
  functionName: 'safeTransferFrom',
  args: [voucher.creator, connectedAddress, tokenId, amountWei, '0x'],
});

const hashes = await sendTransactions([tx]);
```

**The Fatal Problem**: The transaction is sent via `sendTransactions`, which routes through the miniapp SDK's postMessage bridge. The host wallet signs and submits this transaction as the **currently connected user** (the redeemer).

However, the `safeTransferFrom` call specifies:
- `from` = `voucher.creator` (the original voucher creator's address)
- The transaction is signed by `connectedAddress` (the redeemer)

This means the **redeemer is attempting to transfer tokens FROM the creator's account**. ERC-1155 `safeTransferFrom` requires that `msg.sender == from` OR `isApprovedForAll(from, msg.sender)`. Since:
- The redeemer is NOT the creator
- The creator has never approved the redeemer as an operator
- There is no approval step in the flow

**The transaction will revert with an ERC-1155 authorisation error every time.**

**Root Cause**: The design assumes the creator can "pre-fund" a voucher, but the current implementation makes the redeemer attempt to pull funds from the creator — which is an unauthorised transfer.

**To Fix This Properly**:
Option A: Have the creator fund a dedicated escrow contract when creating the voucher (requires a smart contract)
Option B: Have the creator sign an EIP-712 permit/signature that the redeemer can submit (gasless approval)
Option C: Redesign as a "claim request" — when redeemed, notify the creator who then sends the transfer (but this requires the creator to be online)
Option D: Store a pre-signed transaction from the creator at voucher creation time

None of these options can be implemented in the current client-side-only architecture without additional infrastructure.

### 🔴 CRITICAL: localStorage Vouchers Not Shared Between Users

**Same issue as crc-quest-board**: Voucher data is stored in the redeemer's browser localStorage, but the creator's vouchers are stored in the **creator's** browser localStorage. When a redeemer opens the voucher URL, the voucher will not be found in their localStorage.

```javascript
async function showRedeemMode(voucherId) {
  loadVouchers();  // loads from localStorage — recipient's localStorage, not creator's
  const voucher = vouchers.find(v => v.id === voucherId);

  if (!voucher) {
    // This will ALWAYS trigger for any recipient
    // The voucher data lives in the creator's browser, not the recipient's
    ...show "Voucher Not Found"
  }
}
```

**Impact**: The shareable link concept is completely broken. A recipient visiting the voucher URL will always see "Voucher Not Found" because the voucher data only exists in the creator's browser.

**Recommendation**: Voucher data needs to be stored in a shared location (e.g., IPFS, a backend, or encoded in the URL itself).

---

## 3. Medium Issues

### 🟡 Balance Check Uses Potentially Wrong Field

Same as crc-quest-board: `b.attoCircles` may not be the correct field name from the SDK balance response. Balance could always read as 0n, preventing voucher creation.

### 🟡 QR Code Uses External Runtime Import

```javascript
import('https://esm.sh/qrcode-generator@1.4.4').then(QR => { ... })
```

The QR code library is fetched at runtime from `esm.sh`. This adds a network dependency, may fail in offline scenarios, and introduces a potential supply-chain risk. The fallback gracefully hides the QR code, but users won't have a scannable code on network failure.

### 🟡 `window.location.href` Redirect in Iframe

```javascript
<button ... onclick="window.location.href=window.location.pathname">
  Go to My Vouchers
</button>
```

Setting `window.location.href` inside a sandboxed iframe may be blocked depending on the sandbox policy. This button would silently fail.

### 🟡 navigator.clipboard in Iframe

```javascript
navigator.clipboard.writeText(url)
```

Clipboard access requires the `clipboard-write` permission. Sandboxed iframes may not have this permission granted, causing the "Copy Link" button to fail. The error is caught and shows a toast, which is good, but the core functionality is broken.

---

## 4. Minor Issues

- **Voucher ID collision**: `generateVoucherId()` uses a random 8-char alphanumeric string — theoretically possible to have collisions with many vouchers, though unlikely in practice
- **No voucher amount upper limit**: Users could accidentally create vouchers larger than their balance (balance validation exists, but no UI warning)
- **Expiry date min set to "tomorrow"**: The minimum expiry is hard-coded to tomorrow; a user can't create a short-expiry voucher (e.g., expires in 4 hours)
- **Creator cannot cancel a voucher**: Once created, no way to invalidate a voucher short of browser storage manipulation
- **Redeemer doesn't need to be trusted**: No trust requirement option for voucher redemption

---

## 5. Likelihood of Working As Expected

| Scenario | Likelihood | Reason |
|----------|-----------|--------|
| Creator creates voucher and sees it in their "My Vouchers" | ✅ High | localStorage works locally |
| Recipient opens voucher link and sees details | 🔴 0% | Voucher not in recipient's localStorage |
| Voucher redemption succeeds | 🔴 0% | Unauthorised transfer — creator never approved redeemer |
| QR code renders | 🟡 Medium | Depends on esm.sh availability |
| Expiry/claimed status displays correctly | ✅ High | Logic is correct (when voucher is found) |

**Overall Rating**: **2/10** — The UI and voucher creation flow are well-implemented, but the two critical architectural flaws (localStorage isolation + unauthorised ERC-1155 transfer) mean the core feature — redeeming a voucher — cannot work at all.