# Social Attestation Miniapp — App Review

**Review Date**: 12 March 2026  
**Reviewer**: Automated Code Review  
**Overall Verdict**: 🟢 Mostly Functional — core flow works with a few caveats

---

## 1. Spec Compliance

### Core Requirements

| Req | Description | Status | Notes |
|-----|-------------|--------|-------|
| 1 | Wallet connection via postMessage bridge | ✅ Implemented | `onWalletChange` from miniapp-sdk.js |
| 2 | Self-attestation — sign message claiming social handle | ✅ Implemented | `signMessage()` used correctly |
| 3 | Profile storage on IPFS + NameRegistry | ✅ Implemented | `sdk.profiles.create()` → `cidV0ToHex()` → `updateMetadataDigest()` |
| 4 | Display existing attestations from profile | ✅ Implemented | `loadExistingAttestations()` on init |

### User Journey

| Step | Status | Notes |
|------|--------|-------|
| Open miniapp, wallet auto-connects | ✅ | `onWalletChange` fires immediately |
| Select platform | ✅ | GitHub, Twitter, Discord buttons |
| Enter handle | ✅ | Input with Enter key support |
| Sign attestation message | ✅ | Via `signMessage()` |
| Preview attestation | ✅ | Preview card shown before profile update |
| "Add to Profile" | ✅ | Triggers full profile update flow |
| Profile updated on IPFS + NameRegistry | ✅ | Correct contract + function |
| Attestation visible in profile | 🟡 | See spec mismatch below |

---

## 2. Spec vs Implementation Divergence

### 🟡 Storage Field: `location` vs `description`

**Spec says**:
> Uses `location` field as JSON store (SDK strips `extensions`)

**Implementation uses**:
```javascript
if (profile?.description?.includes(ATTESTATION_MARKER)) {
  const attestationJson = profile.description.split(ATTESTATION_MARKER)[1].trim();
  attestations = JSON.parse(attestationJson);
}
```

The code stores attestations in the `description` field, not `location`. This is actually a **beneficial deviation** — the `location` field approach was likely tried first but `description` was found to work better. The spec should be updated to reflect this.

**Risk**: The `description` field has a 500-character limit. The implementation handles this with compact array format `[platform, handle, unixTimestamp]` and smart truncation, which mitigates the risk.

### 🟡 Signature Not Persisted

The spec implies attestations should be verifiable by others. The implementation:
- Signs a message to prove intent at time of creation
- But does **not store the signature** in the profile (only `[platform, handle, timestamp]`)
- The signature is discarded after the signing step

This means attestations are self-declared but **not cryptographically verifiable** by a third party reading the profile. Anyone could manually craft the JSON and update their profile to claim any handle without having signed anything.

**Assessment**: For a "self-attestation" MVP, this is acceptable — the spec notes it's trust-based on wallet signature. The spec acknowledges OAuth was blocked by iframe sandboxing. This is a known trade-off, not a bug.

---

## 3. Medium Issues

### 🟡 `description` Field Pollution

Using the `description` field to store machine-readable JSON is a workaround. The description is what displays on user profiles in the Gnosis Circles wallet — users will see their description truncated by the attestation marker and JSON payload. Example:

```
"I'm a developer in Berlin\n\n##ATTESTATIONS##\n[["github","myhandle",1741780000]]"
```

This raw JSON will be visible in profile listings that show the description. Not ideal for UX.

**Recommendation**: Use the `location` field for attestation data to keep the `description` clean.

### 🟡 Profile Overwrite Risk

The update flow fetches the current profile, modifies the description, and writes it back:

```javascript
const updatedProfile = {
  name: profile?.name || '',
  description: updatedDescription.trim(),
  previewImageUrl: profile?.previewImageUrl,
};
```

Fields not included in the update object (`imageUrl`, `location`, `geoLocation`) are not preserved. If a user has these fields set, they will be **silently deleted** when adding an attestation.

### 🟡 Truncation May Break JSON

The hard truncation safety net is potentially destructive:

```javascript
if (updatedDescription.length > 500) {
  updatedDescription = updatedDescription.slice(0, 497) + '...';
}
```

If this truncation hits mid-JSON, the stored attestation data will be unparseable JSON. The earlier "remove older attestations" loop is the right approach, but the final hard truncation could still corrupt data in edge cases where even a single attestation + marker exceeds 500 chars.

---

## 4. Minor Issues

- **No attestation deletion**: Once added, a user cannot remove an individual attestation without editing raw profile data
- **Platform limited to 3**: GitHub, Twitter, Discord — no way to add others (e.g., Farcaster, Telegram)
- **No attestation date display for old format**: Object-format attestations with ISO timestamp (`att.timestamp`) would display incorrect date since `new Date(timestamp * 1000)` expects unix seconds, but ISO string `* 1000` would produce a huge invalid date
  ```javascript
  // Bug: if timestamp is ISO string "2024-01-01T00:00:00Z", not unix int
  new Date(timestamp * 1000).toLocaleDateString() // NaN
  ```
- **Standalone mode notice**: A banner is shown when not in iframe but only for backer-voting, not social-attestation (minor inconsistency)
- **No loading state on initial profile fetch**: The app shows the connected view immediately but `loadExistingAttestations()` runs async; attestation list may flash "no attestations" before loading

---

## 5. Likelihood of Working As Expected

| Scenario | Likelihood | Reason |
|----------|-----------|--------|
| Wallet connects | ✅ High | Standard postMessage bridge |
| User signs attestation message | ✅ High | `signMessage()` works with Safe passkey wallets |
| Profile updates to IPFS | ✅ High | Correct SDK + NameRegistry flow |
| Attestations persist and reload | ✅ High | `description` field is preserved by SDK |
| 500-char limit handled | ✅ High | Compact format + truncation logic |
| Third-party verification | 🔴 Not possible | Signature not stored |
| Profile description looks clean | 🔴 No | Raw JSON visible in description |

**Overall Rating**: **7/10** — The core attestation flow works end-to-end. The main concerns are the UX impact of JSON in the profile description and the loss of non-included profile fields on update. These are fixable. The fundamental self-attestation mechanism is sound for an MVP.