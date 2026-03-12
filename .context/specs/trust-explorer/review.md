# Trust Explorer — App Review

**Review Date**: 12 March 2026  
**Reviewer**: Automated Code Review  
**Note**: No formal spec exists for this app. Review assesses functionality against the app's stated purpose.  
**Overall Verdict**: 🟡 Partially Functional — SDK config issues and API method uncertainty

---

## 1. Purpose & Stated Features

The Trust Explorer is a read-only miniapp for browsing Circles trust relationships:
- View trust relationships for the connected wallet
- See who trusts you (incoming) and who you trust (outgoing)
- Search for other Circles users by name or address
- Navigate the trust graph by clicking through profiles

---

## 2. Architecture Review

### SDK Initialisation

```javascript
const SDK_CONFIG = {
  circlesRpcUrl: 'https://staging.circlesubi.network/',
  pathfinderUrl: 'https://pathfinder.aboutcircles.com',
  profileServiceUrl: 'https://rpc.aboutcircles.com/profiles/',
  referralsServiceUrl: 'https://staging.circlesubi.network/referrals',
  ...
};

sdk = new Sdk(SDK_CONFIG, null);
```

**Issue**: The `Sdk` constructor is being passed a full config object as the first parameter. Looking at how other miniapps use the SDK, the constructor signature appears to be `new Sdk(rpcUrl: string, runner)`. Passing an object where a string is expected may cause the SDK to fail to initialise correctly.

The other miniapps (crc-quest-board, crc-social-vouchers) use:
```javascript
const sdk = new Sdk(RPC_URL, null); // 'https://rpc.aboutcircles.com/'
```

However, the Trust Explorer may be using a different overloaded constructor form. If the SDK supports passing a config object, this could work — but it's inconsistent and potentially broken.

**Additional concern**: `circlesRpcUrl` points to `https://staging.circlesubi.network/` which is a staging/test environment, not production. This means:
- Trust data may be from a test network
- Profiles may not match production profiles
- The app may appear empty for most mainnet users

### Trust Query Methods

```javascript
async function getTrusts(address) {
  const trusts = await s.rpc.trust.getTrusts(address);
  return trusts || [];
}

async function getTrustedBy(address) {
  const trustedBy = await s.rpc.trust.getTrustedBy(address);
  return trustedBy || [];
}
```

**Risk**: `sdk.rpc.trust.getTrusts()` and `sdk.rpc.trust.getTrustedBy()` may not be valid method paths in the `@aboutcircles/sdk`. The SDK's RPC module structure needs verification. If these methods don't exist, the app will silently return empty arrays (due to the `catch` + return `[]` pattern) and show "No trust relationships found" for every user.

### Profile Search

```javascript
const results = await s.rpc.profile.searchByAddressOrName(query, 10, 0);
```

`searchByAddressOrName` with `(query, limit, offset)` signature — this needs to match the actual SDK API. If the signature differs, search will silently fail and show no results.

---

## 3. Critical Issues

### 🔴 Staging RPC URL

The `circlesRpcUrl: 'https://staging.circlesubi.network/'` points to a staging environment. This is likely the wrong endpoint for a production miniapp. Users on the main Circles wallet would not see their actual trust relationships.

**Correct production URL** used by other miniapps: `https://rpc.aboutcircles.com/`

### 🔴 SDK Constructor Likely Wrong

Passing a full config object to `new Sdk()` instead of the RPC URL string may cause SDK initialisation failure. All subsequent calls to `s.rpc.*` would throw errors that are silently caught, making the entire app appear to work (shows empty states) but return no data.

---

## 4. Medium Issues

### 🟡 Rendering Trust Relationship Data Shape

```javascript
list.innerHTML = relations.map((rel) => `
  <div class="trust-item" data-address="${rel.trustee || rel.truster}">
    <div class="trust-item-name">${rel.name || shortenAddress(rel.trustee || rel.truster)}</div>
    ...
  </div>
`).join('');
```

The code accesses `rel.trustee`, `rel.truster`, and `rel.name` directly on the relation object. The actual shape of objects returned by `getTrusts()` / `getTrustedBy()` may differ (e.g., it could be `rel.user`, `rel.avatar`, or require a separate profile lookup). If the field names don't match, all trust items would show as `shortenAddress(undefined)` = `"undef…ned"`.

### 🟡 No Trust Relationship Timestamps

The trust display shows no metadata about when trust was established or whether it's expired/expiring. Circles v2 trust has an expiry mechanism, and displaying trust without indicating expiry status could mislead users.

### 🟡 Search Minimum Length Check

```javascript
if (query.length < 2) {
  searchResults.classList.add('hidden');
  return;
}
```

The minimum search length of 2 characters is fine for text queries but the code also checks `query.startsWith('0x') && query.length >= 40` for address lookups. A user pasting a full 42-char address (e.g. `0x1234...`) would skip the length check, but addresses with length 41-43 due to mixed case wouldn't be caught. Minor but worth noting.

### 🟡 No Wallet-Free Mode

The Trust Explorer is read-only — it doesn't need a wallet connection to explore trust relationships. However, it shows "Connect your wallet" and only loads data after wallet connection. It would be more useful to allow browsing any address without requiring a connected wallet, falling back to a search interface.

---

## 5. Minor Issues

- **No "copy address" button** on trust items — navigating to an address is available but copying the full address is not
- **Back-to-self button always hidden on initial load** — `isSelf` is true on init, so the button is hidden. It only appears when you navigate to another profile. Correct behaviour.
- **Search dropdown doesn't close on outside click** — only closes on blur with a 200ms delay; clicking on other UI elements may not close it reliably
- **No link to Gnosis Scan or profile page** — viewing a trust relationship shows address/name but no way to see more about that user
- **Debug console.log statements left in production code** — multiple `[DEBUG]` logs throughout (`loadProfile`, `getTrusts`, `getProfile`) should be removed

---

## 6. Likelihood of Working As Expected

| Scenario | Likelihood | Reason |
|----------|-----------|--------|
| Wallet connects | ✅ High | Standard postMessage bridge |
| SDK initialises | 🔴 Unknown | Config object vs string constructor ambiguity |
| Trust data loads | 🔴 Low | Wrong RPC URL (staging) + uncertain method names |
| Profile name loads | 🟡 Medium | Profile service URL is production; name may load even if trusts don't |
| Address search works | 🟡 Medium | Direct address lookup is more likely to work than name search |
| Trust list renders correctly | 🟡 Medium | Depends on actual relation object shape from SDK |
| Navigation between profiles | ✅ High | `loadProfile(addr)` is self-contained |

**Overall Rating**: **4/10** — The UI and navigation logic are well-structured and the app concept is sound. The two critical issues (wrong SDK constructor / staging URL) likely prevent any trust data from loading in practice. With the correct RPC URL and SDK initialisation, the core read-only browsing functionality could work. No wallet transactions are involved, so there are no CRC transfer risks.