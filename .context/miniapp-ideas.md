# MiniApp Ideas
_Generated: 2026-03-08_

## Selection Rationale

I'm selecting **CRC Quest Board** as it represents a genuinely novel use case for the Circles ecosystem - a community-driven bounty marketplace that leverages both the personal currency model (CRC payments) and the trust network (for reputation and task verification). Unlike existing apps which focus on simple transfers or messaging, this creates a new economic primitive: incentivised community action. It's feasible without new contracts, provides real user value, and extends (rather than competes with) the host wallet.

---

## CRC Quest Board
**Score**: 23/25
**Feasibility**: 4/5 (needs lightweight backend for task state, no new contracts)
**Novelty**: 5/5 (unique bounty system for personal currencies)
**User value**: 5/5 (community engagement, earning opportunities)
**Complexity**: 4/5 (moderate - task lifecycle management)
**SDK fit**: 5/5 (perfect fit with transfers and profiles)
**New contracts needed**: No
**Description**: A community bounty board where users post tasks/quests with CRC rewards. Others can claim and complete tasks for payment. Uses the trust network for reputation scoring and task verification. Creates a gig economy layer on top of Circles personal currencies.
**Patterns used**: CRC payments, profile queries, trust relations for reputation, CirclesRPC for task history
**Status**: Built
**Deployment URL**: https://crc-quest-deploy.vercel.app

---

## CRC Trust Garden
**Score**: 23/25
**Feasibility**: 5/5 (read-only visualisation, no backend needed)
**Novelty**: 5/5 (unique gamified trust visualisation)
**User value**: 4/5 (engaging but less practical utility)
**Complexity**: 4/5 (needs creative visualisation work)
**SDK fit**: 5/5 (trust relations API)
**New contracts needed**: No
**Description**: Visualises your trust network as a growing garden. Each trust relationship is a seed that grows over time. Trust depth and breadth affect plant size and variety. Discover new potential trust connections. Beautiful, engaging, and uniquely Circles.
**Patterns used**: Trust relations queries, profile lookups, visual rendering
**Status**: Unbuilt

---

## CRC Social Vouchers
**Score**: 24/25
**Feasibility**: 5/5 (simple off-chain vouchers, on-chain redemption)
**Novelty**: 5/5 (unique use of personal currencies for gifting)
**User value**: 5/5 (practical gifting and rewards)
**Complexity**: 4/5 (manageable voucher lifecycle)
**SDK fit**: 5/5 (perfect for transfers)
**New contracts needed**: No
**Description**: Create transferable vouchers worth X CRC that can be given to friends off-chain (via link/QR). Recipients redeem for actual CRC. Perfect for gifts, community rewards, promotions. Leverages Circles' personal currency model.
**Patterns used**: CRC transfers, profile queries, link generation
**Status**: Unbuilt

---

## CRC Memory Lane
**Score**: 21/25
**Feasibility**: 5/5 (read-only timeline from CirclesRPC)
**Novelty**: 4/5 (nostalgic but not groundbreaking)
**User value**: 4/5 (engaging personal history)
**Complexity**: 4/5 (timeline construction)
**SDK fit**: 5/5 (CirclesRPC queries)
**New contracts needed**: No
**Description**: A personal timeline showing your Circles journey - first trust given/received, first CRC transfer, trust network growth, milestones and achievements. Nostalgic and engaging way to explore your Circles history.
**Patterns used**: CirclesRPC queries, profile lookups, event parsing
**Status**: Unbuilt

---

## CRC Savings Circle
**Score**: 22/25
**Feasibility**: 4/5 (needs coordination logic)
**Novelty**: 5/5 (modern ROSCA for personal currencies)
**User value**: 5/5 (group savings utility)
**Complexity**: 3/5 (complex rotation logic)
**SDK fit**: 5/5 (transfers and trust)
**New contracts needed**: No
**Description**: Modern rotating savings association adapted for Circles. Groups of friends contribute CRC regularly, with one member receiving the pooled amount each round. Trust network ensures accountability. Great for community savings goals.
**Patterns used**: CRC transfers, trust queries, group coordination
**Status**: Unbuilt

---

## CRC Charity Registry
**Score**: 19/25
**Feasibility**: 5/5 (simple pledge tracking)
**Novelty**: 4/5 (useful but not unique)
**User value**: 4/5 (social good)
**Complexity**: 4/5 (moderate)
**SDK fit**: 4/5 (standard patterns)
**New contracts needed**: No
**Description**: A miniapp where users pledge CRC to community causes. Shows total pledged, top supporters, progress toward goals. Uses trust network for credibility scoring. Great for community fundraising.
**Patterns used**: CRC transfers, profile queries, progress tracking
**Status**: Unbuilt

---

## CRC Reputation Badges
**Score**: 20/25
**Feasibility**: 4/5 (needs badge storage)
**Novelty**: 4/5 (social layer on trust)
**User value**: 4/5 (reputation utility)
**Complexity**: 4/5 (badge issuance logic)
**SDK fit**: 5/5 (trust and profiles)
**New contracts needed**: No
**Description**: On-chain reputation system where users issue badges/endorsements based on trust and transaction history. Badges like "Trusted by 10", "Early adopter", "Active trader". Creates social layer on trust graph.
**Patterns used**: Trust queries, profile metadata, badge issuance
**Status**: Unbuilt

---

## CRC Prediction Markets
**Score**: 16/25
**Feasibility**: 3/5 (needs resolution mechanism)
**Novelty**: 4/5 (interesting use case)
**User value**: 4/5 (speculative engagement)
**Complexity**: 3/5 (complex market logic)
**SDK fit**: 4/5 (transfers)
**New contracts needed**: No
**Description**: Simple yes/no prediction markets using CRC. Users stake CRC on outcomes. Resolution via consensus or oracle. Fun engagement tool for community predictions.
**Patterns used**: CRC transfers, consensus logic, resolution
**Status**: Unbuilt

---

## CRC Time Bank
**Score**: 18/25
**Feasibility**: 4/5 (needs service tracking)
**Novelty**: 4/5 (time-based exchange)
**User value**: 4/5 (service economy)
**Complexity**: 3/5 (hour tracking)
**SDK fit**: 4/5 (transfers)
**New contracts needed**: No
**Description**: Time-based service exchange where users offer services (1 hour of skill X) and exchange using CRC as unit. Track hours given/received. Trust network provides verification.
**Patterns used**: CRC transfers, profile metadata, time tracking
**Status**: Unbuilt

---

## CRC Gift Cards
**Score**: 19/25
**Feasibility**: 5/5 (time-locked transfers)
**Novelty**: 4/5 (practical gifting)
**User value**: 4/5 (useful for gifts)
**Complexity**: 4/5 (manageable)
**SDK fit**: 4/5 (standard transfers)
**New contracts needed**: No
**Description**: Create time-locked CRC gifts that recipients can claim. Generate shareable links or QR codes. Perfect for birthdays, holidays, rewards. Simple but practical.
**Patterns used**: CRC transfers, time locks, link generation
**Status**: Unbuilt
