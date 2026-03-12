# Backer Voting — App Review

**Review Date**: 12 March 2026  
**Reviewer**: Automated Code Review  
**Note**: No formal spec exists for this app. Review assesses functionality against the app's stated purpose.  
**Overall Verdict**: 🔴 Non-Functional — envio indexer schema unverified, governance backend missing

---

## 1. Purpose & Stated Features

The Backer Voting miniapp demonstrates governance for Circles backers:
- Query the envio indexer to determine if the connected address is a direct backer
- Query indirect backer status through trust relationships
- Browse and vote on governance proposals
- Signature-based vote submission

---

## 2. Architecture Review

### Envio Indexer Queries

The app queries `https://gnosis-e702590.dedicated.hyperindex.xyz` via GraphQL. This is the right pattern for reading indexed blockchain events, but all queries depend on the indexer having the correct schema.

**Direct Backer Query**:
```graphql
query GetBackerStatus($address: String!) {
  backingCompleteds(
    where: { backer: $address }
    orderBy: blockTimestamp
    orderDirection: desc
    first: 1
  ) {
    id
    backer
    backingInstance
    backingAsset
    personalCircles
    blockTimestamp
    transactionHash
  }
}
```

**Indirect Backer Query**:
```graphql
query GetIndirectBackerStatus($address: String!) {
  trustRelations(
    where: { 
      trustee: $address,
      truster_isBacker: true 
    }
    first: 1
  ) {
    id
    truster
    trustee
    truster_isBacker
  }
}
```

**Proposals Query**:
```graphql
query GetActiveProposals($now: BigInt!) {
  proposals(
    where: { endTime_gte: $now }
    ...
  )
}
```

---

## 3. Critical Issues (Blockers)

### 🔴 CRITICAL: Envio Indexer Schema Unverified

The GraphQL entities queried (`backingCompleteds`, `trustRelations` with `truster_isBacker`, `proposals`, `voteCasts`) are **assumed** to exist in the indexer schema. The actual Circles Gnosis hyperindex schema may not include:

1. **`backingCompleteds`** — The Circles v2 Hub has a `BackingCompleted` event. If the indexer is indexing this event, the entity should exist. However the exact field names (`backingInstance`, `backingAsset`, `personalCircles`) need to match the indexer's schema.

2. **`trustRelations` with `truster_isBacker`** — This is a derived/computed field. Standard trust indexing tracks `truster`/`trustee` relationships, but a computed boolean `truster_isBacker` requires either:
   - A custom field in the indexer schema that cross-references the backing data
   - A custom Envio handler that computes and stores this
   
   This is a **significant assumption** — standard Envio indexers don't automatically add computed fields like `truster_isBacker`. Without this field, the indirect backer query will fail with a GraphQL error.

3. **`proposals` and `voteCasts`** — These entities strongly suggest an **on-chain governance contract** that emits `ProposalCreated` and `VoteCast` events. No such governance contract has been deployed in the Circles ecosystem. These queries will return empty results or schema errors.

**Impact**: The app likely shows the "Not a Backer" screen for all users (due to empty/error responses being treated as null), and shows an empty proposals list.

### 🔴 CRITICAL: No Governance Infrastructure Exists

The entire proposals and voting system depends on:
- An on-chain governance contract deployed to Gnosis Chain
- The envio indexer configured to index that contract's events
- A backend to receive and verify signed votes

None of this infrastructure exists. The `proposals`, `voteCasts`, and vote submission logic are entirely speculative. The vote submission code:

```javascript
const { signature } = await signMessage(message);
// In a real implementation, you would submit this to your backend
console.log('Vote signed:', { proposalId, support, signature });
```

Even acknowledges this limitation with a comment — the signature is just logged to console. There is no mechanism to actually record or count votes.

### 🔴 CRITICAL: GraphQL Filter Syntax May Be Wrong

The queries use Envio-specific filter syntax (e.g., `where: { backer: $address }`, `orderBy: blockTimestamp`). The actual Envio hyperindex GraphQL API may use different filter conventions — for instance, some deployments use `where: { backer_eq: $address }` or `filter: { backer: { eq: $address } }`. If the filter syntax is wrong, queries return all records instead of filtered results, or return errors.

---

## 4. Medium Issues

### 🟡 Backer Check Always Returns "Not a Backer"

Given the above, `getBackerStatus()` will likely return null for every address (either because the entity doesn't exist, or no records match), and `getIndirectBackerStatus()` will also return false. The app will then call `showView('not-backer-view')` for all users.

This means **the backer voting features are inaccessible to all users** in practice, regardless of actual backer status.

### 🟡 `backingCompleteds` Field: `backer` vs `signer`

In the Hub V2 contract, the `BackingCompleted` event may not have a `backer` field by that name. The actual field could be `signer`, `operator`, or similar. This depends on the exact event definition in the Gnosis Circles Hub V2 contract.

### 🟡 Backer Status Rendering

```javascript
function renderBackerStatus(status) {
  $('backing-instance').textContent = shortenAddress(status.backingInstance);
  $('backing-asset').textContent = shortenAddress(status.backingAsset);
  $('personal-circles').textContent = shortenAddress(status.personalCircles);
  $('completed-at').textContent = formatDate(status.completedAt);
}
```

If `status.backingInstance`, `status.backingAsset`, or `status.personalCircles` are null/undefined (e.g., for indirect backers where `status = { isBacker: true, isIndirect: true }`), `shortenAddress(undefined)` will return `'-'`. The UI will show dashes for all backing details for indirect backers, which may be confusing.

---

## 5. What Works

- **Wallet connection**: Standard postMessage bridge works correctly
- **GraphQL query pattern**: The `queryEnvioIndexer()` function is well-structured for reuse
- **Indirect backer fallback logic**: Code correctly falls back from direct to indirect backer check
- **Proposal UI**: The proposal list and detail views are fully built and would render correctly if data were available
- **Vote signing**: The `signMessage` call would work for obtaining a signature (even if there's nowhere to send it)
- **Standalone mode banner**: Correctly detects and warns when running outside an iframe host

---

## 6. Likelihood of Working As Expected

| Scenario | Likelihood | Reason |
|----------|-----------|--------|
| Wallet connects | ✅ High | Standard postMessage bridge |
| Direct backer status detected | 🔴 Very Low | Indexer entity/schema unverified |
| Indirect backer status detected | 🔴 Very Low | `truster_isBacker` field likely doesn't exist |
| Proposals load | 🔴 0% | No governance contract deployed |
| Voting works | 🔴 0% | No backend to receive votes |
| UI renders backer info | 🟡 Medium | Works if data loads; dashes for indirect backers |

**Overall Rating**: **2/10** — The app is well-structured and demonstrates a compelling concept, but it depends on infrastructure (envio schema, governance contract, voting backend) that doesn't yet exist. It's better understood as a **design mockup / proof-of-concept** for what a backer governance UI could look like, rather than a functional miniapp. The most valuable parts are the envio indexer query patterns, which could be adapted once the correct schema is confirmed.