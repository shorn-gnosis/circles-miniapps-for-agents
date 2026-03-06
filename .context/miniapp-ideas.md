# MiniApp Ideas
_Generated: 2025-03-06_

## Trust Network Explorer
**Score**: 22/25
**Feasibility**: 5/5
**Novelty**: 5/5
**User value**: 5/5
**Complexity**: 4/5 (4 = moderate)
**SDK fit**: 3/5
**New contracts needed**: No
**Description**: Visualise your Circles trust graph. See who trusts you (incoming trust), who you trust (outgoing trust), and explore other users' trust networks. Search by address or name to discover trust relationships across the ecosystem.
**Patterns used**: CirclesRPC queries, profile search, trust relations, avatar info
**Status**: Built

---

## CRC Gift Sender
**Score**: 21/25
**Feasibility**: 5/5
**Novelty**: 3/5
**User value**: 4/5
**Complexity**: 4/5 (4 = moderate)
**SDK fit**: 5/5
**New contracts needed**: No
**Description**: Send CRC to anyone with a personal message attached. Messages are pinned to IPFS, creating a permanent record of your gift. View your sent and received gift history.
**Patterns used**: CRC transfer, IPFS pinning, profile queries
**Status**: Unbuilt

---

## Balance Dashboard
**Score**: 21/25
**Feasibility**: 5/5
**Novelty**: 2/5
**User value**: 4/5
**Complexity**: 5/5 (5 = simplest)
**SDK fit**: 5/5
**New contracts needed**: No
**Description**: Comprehensive view of all your CRC holdings. Shows balances across personal currencies, groups, and organisations. Visualise your CRC portfolio with charts and historical data.
**Patterns used**: Avatar balances, token queries
**Status**: Unbuilt

---

## Personal Currency Explorer
**Score**: 20/25
**Feasibility**: 4/5
**Novelty**: 4/5
**User value**: 4/5
**Complexity**: 3/5
**SDK fit**: 5/5
**New contracts needed**: No
**Description**: Browse all personal currencies in Circles. See who holds each currency, their trust networks, and recent transfers. Discover interesting profiles and their trust connections.
**Patterns used**: CirclesRPC queries, profile search, balance queries
**Status**: Unbuilt

---

## CRC Airdrop Tool
**Score**: 22/25
**Feasibility**: 5/5
**Novelty**: 4/5
**User value**: 4/5
**Complexity**: 4/5
**SDK fit**: 5/5
**New contracts needed**: No
**Description**: Distribute CRC to multiple recipients at once. Add addresses manually or paste a list, specify amounts, and send batch transfers. Perfect for community rewards or distributions.
**Patterns used**: CRC transfer, batch transactions, address validation
**Status**: Unbuilt

---

## Trust Score Dashboard
**Score**: 18/25
**Feasibility**: 4/5
**Novelty**: 4/5
**User value**: 3/5
**Complexity**: 3/5
**SDK fit**: 4/5
**New contracts needed**: No
**Description**: Calculate and display a "trust score" based on your trust network. Factors include number of trusters, their own trust scores, and trust depth. Track changes over time.
**Patterns used**: Trust relations, recursive queries, profile data
**Status**: Unbuilt

---

## Selection Rationale

**Selected: Trust Network Explorer**

This is the highest-impact app that fills a clear gap in the ecosystem. Users currently have no easy way to visualise their trust relationships - they can only see them in the main Circles UI as part of profile pages. A dedicated explorer provides:

1. Clear visualisation of incoming/outgoing trust
2. Search functionality to explore other users' networks
3. Pure read operations (no complex transaction flows)
4. Immediate value to every Circles user

The app is achievable in a single session and uses well-documented SDK patterns (CirclesRPC queries, profile search, trust relations). No new contracts or backend required.
