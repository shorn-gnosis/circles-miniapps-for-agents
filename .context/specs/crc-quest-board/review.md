# CRC Quest Board — App Review

**Review Date**: 12 March 2026  
**Reviewer**: Automated Code Review  
**Overall Verdict**: 🟡 Partially Functional — significant CRC transfer and data persistence issues

---

## 1. Spec Compliance

### Functional Requirements

| Req | Description | Status | Notes |
|-----|-------------|--------|-------|
| FR1 | Create quests with title, description, reward, deadline | ✅ Implemented | Form validates all fields |
| FR2 | Balance validation before posting | ✅ Implemented | Compares `parseUnits(reward)` against `userBalance` |
| FR3 | Unique identifier + timestamp | ✅ Implemented | `quest_${Date.now()}_${random}` |
| FR4 | Optional trust level filter | ✅ Implemented | Trust slider 0–100 |
| FR5 | Browse open quests sorted by reward/recency | ✅ Implemented | Sort dropdown: newest, reward-high, deadline-soon |
| FR6 | Filter by reward range, deadline, trust | 🟡 Partial | Only trust filter + sort; no reward range slider |
| FR7 | Quest list shows creator, reward, deadline, status | ✅ Implemented | |
| FR8 | Claim quest (first-come-first-serve) | ✅ Implemented | |
| FR9 | Submit completion with proof | ✅ Implemented | Textarea for proof |
| FR10 | Creator approve/reject | ✅ Implemented | |
| FR11 | Auto CRC transfer on approval | 🔴 **Critical Issue** | See CRC Transfer section below |
| FR12 | User profile shows completed count + earned | ✅ Implemented | Stats bar at top |
| FR13 | Trust network score affects visibility | 🟡 Partial | Trust filter exists but `sdk.data.getTrustRelations` may not work as expected |
| FR14 | Quest history queryable via CirclesRPC | ❌ Not Implemented | No CirclesRPC query for transfer history |
| FR15 | Quest states: OPEN, CLAIMED, PENDING_REVIEW, COMPLETED, CANCELLED | ✅ Implemented | |
| FR16 | Creator can cancel unclaimed quests | ✅ Implemented | |
| FR17 | Expired quests auto-closed | ✅ Implemented | On load, expired OPEN quests → CANCELLED |

### Non-Functional Requirements

| Req | Description | Status | Notes |
|-----|-------------|--------|-------|
| NFR1 | Loads inside iframe | ✅ | Uses miniapp-sdk.js postMessage bridge |
| NFR2 | Works with passkey-based Safe accounts | 🟡 | Has passkey error detection but untested |
| NFR3 | Transaction values in hex | ✅ | Uses `'0x0'` for value |
| NFR4 | localStorage for quest data | ✅ | Key: `crc_quest_board_quests` |
| NFR5 | Mobile responsive (375px) | 🟡 | CSS exists but not verified at 375px |
| NFR6 | Load < 3s on 3G | ❌ Unknown | Heavy SDK imports; unlikely on 3G |
| NFR7 | No backend required | ✅ | Pure client-side |

---

## 2. Critical Issues (Blockers)

### 🔴 CRITICAL: CRC Transfer Will Likely Fail

**Location**: `window.approveCompletion()` function

```javascript
const tokenId = BigInt(quest.creator);  // creator's address as token ID
const data = encodeFunctionData({
  abi: HUB_TRANSFER_ABI,
  functionName: 'safeTransferFrom',
  args: [quest.creator, quest.claimer, tokenId, amountWei, '0x'],
});
```

**Problem**: The `safeTransferFrom` call uses the **creator's address** as the token ID. In Circles v2, personal CRC tokens are indeed identified by the avatar address cast to `uint256`, so the token ID is technically correct.

However, this call is executed by the **quest creator** (who is the connected wallet approving the quest). The `from` field is the creator's address, and the transaction is sent from the creator's wallet via `sendTransactions`. This should work because:
- The creator IS the `from` address
- The creator owns their own personal CRC tokens
- The tx is sent from the creator's wallet

**BUT**: The transfer uses `safeTransferFrom` on the **Hub V2 contract directly**. In Circles v2, direct `safeTransferFrom` on the Hub may require the sender to have previously minted/received tokens. The correct approach for transferring CRC between users is typically via the **pathfinder** and `transferThrough` (path transfers), not direct `safeTransferFrom`, because:

1. The creator may not have sufficient **personal** CRC (their tokens specifically) — they might hold a mix of different people's CRC tokens
2. `safeTransferFrom` transfers a specific token ID (the creator's personal CRC), but the creator's balance may be composed of many different token IDs received through trust

**Impact**: Transfer will fail if the creator doesn't hold enough of their OWN personal CRC tokens. In practice, users often hold a mix of others' tokens.

**Recommendation**: Use the SDK's `transferCrc` method or the pathfinder API for transfers, which handles multi-hop path transfers automatically.

### 🔴 CRITICAL: localStorage is Per-Origin, Not Shared

**Problem**: All quest data is stored in `localStorage`. Since miniapps run inside iframes, the localStorage origin depends on the miniapp's deployment URL. This means:

1. **Different users cannot see each other's quests** — each user's browser has its own localStorage
2. **Quest claiming is meaningless** — only the creator can ever see their own quests
3. **The entire marketplace concept breaks** — there's no shared state

**Impact**: The app is fundamentally a single-user demo, not a functioning marketplace.

**Recommendation**: Need a shared backend (even a simple one like a Supabase/Firebase instance, or IPFS-based shared state) for quests to be visible across users.

---

## 3. Medium Issues

### 🟡 Trust Score Calculation May Fail

```javascript
const relations = await sdk.data.getTrustRelations(address);
userTrustScore = relations.length;
```

The `sdk.data.getTrustRelations()` method may not exist or may have a different signature in the current SDK version. The SDK's data module typically uses `getAggregatedTrustRelations` or similar. If this call fails, `userTrustScore` stays at 0, which means trust-gated quests would be invisible to everyone.

### 🟡 Balance Calculation Uses `attoCircles`

```javascript
const balances = await avatar.balances.getTokenBalances();
userBalance = balances.reduce((sum, b) => sum + BigInt(b.attoCircles || 0n), 0n);
```

The field name `attoCircles` may not match the actual SDK response. The Circles SDK balance objects typically use `circles` (as a string in atto denomination) or similar fields. If the field name is wrong, balance will always be 0n, and quest creation will always fail with "insufficient balance".

### 🟡 `confirm()` Dialog Blocked in Iframe

```javascript
if (!confirm('Are you sure you want to cancel this quest?')) return;
```

The `confirm()` dialog may be blocked by iframe sandbox restrictions. This would silently fail, making quest cancellation impossible.

### 🟡 Global Window Functions

Quest actions are attached to `window` (e.g., `window.claimQuest`, `window.approveCompletion`). While this works, it's fragile and could conflict with other scripts.

---

## 4. Minor Issues

- **No pagination**: Quest list renders all quests at once (design spec mentions pagination of 20)
- **No profile caching**: Design spec mentions 5-min TTL cache for profiles; not implemented
- **Missing reward range filter**: FR6 mentions reward range filtering; only sort exists
- **No IPFS pinning**: Design mentions optional IPFS; not implemented (expected for MVP)
- **No quest search**: Out of scope per spec, correctly omitted
- **Character limits not enforced in UI**: Title has no maxlength; description shows char count but no max

---

## 5. Likelihood of Working As Expected

| Scenario | Likelihood | Reason |
|----------|-----------|--------|
| User creates a quest | ✅ High | Form + localStorage works fine solo |
| Another user sees the quest | 🔴 0% | localStorage is per-browser |
| CRC transfer on approval | 🟡 Low-Medium | Direct `safeTransferFrom` may fail if user doesn't hold own personal CRC |
| Quest state management | ✅ High | State machine logic is correct |
| Mobile layout | 🟡 Medium | CSS exists but untested |

**Overall Rating**: **3/10** — Works as a single-user demo of the quest lifecycle UI, but fundamentally broken as a marketplace due to localStorage isolation and likely CRC transfer issues.