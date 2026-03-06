# Circles Miniapp Ideas - Brainstorm

A collection of miniapp concepts that align with Circles' values: micro-economics, circular economy, trust networks, and community interaction. All ideas are scoped for PoC (proof of concept) level - quick to prototype, easy to understand.

---

## Category 1: Paid Listings & Classifieds

### 1.1 CRC Classifieds (Craigslist-style)
**Concept**: A local classifieds board where posting and contacting costs CRC.

| Action | Cost |
|--------|------|
| Post listing | 10 CRC |
| Contact seller | 5 CRC |
| Feature/boost listing | 20 CRC |

**Why it works**:
- Small friction prevents spam
- CRC cost feels natural in Circles ecosystem
- Local/community focus aligns with trust networks

**MVP Scope**:
- Post text listings (title, description, price in CRC or barter)
- Browse listings (no aggregation needed - just fetch from namespace)
- Pay-to-reveal contact info

**Technical**: Namespace for listings, CRC transfer to classifieds org address

---

### 1.2 Skill Exchange Board
**Concept**: Post skills you offer or need, pay CRC to connect.

| Action | Cost |
|--------|------|
| Post "I offer..." | 5 CRC |
| Post "I need..." | Free |
| Connect/contact | 10 CRC |

**Why it works**:
- Encourages circular economy (services for CRC)
- Trust network helps verify skill claims
- Low barrier to request help

**MVP Scope**:
- Simple skill tags (developer, designer, gardener, etc.)
- Location optionally
- CRC payment reveals contact

---

## Category 2: Games & Entertainment

### 2.1 CRC Lottery Pool
**Concept**: Weekly lottery where everyone pools CRC, winner takes all.

**Mechanics**:
- Buy tickets: 1 CRC = 1 ticket (max 100 per person)
- Drawing: Random selection from ticket holders
- Winner receives: pool - 5% fee (goes to treasury/org)

**Why it works**:
- Simple, familiar concept
- Creates excitement and engagement
- Demonstrates CRC transfers

**MVP Scope**:
- Buy tickets (CRC transfer to lottery org)
- View current pool size
- Random winner selection (verifiable on-chain or simple hash-based)

**Technical**: Org address holds pool, drawing can be client-side with block hash for randomness

---

### 2.2 Prediction Polls
**Concept**: Bet CRC on binary outcomes (yes/no questions).

**Mechanics**:
- Create poll: "Will BTC hit $100k by Dec 2026?" (costs 5 CRC)
- Vote YES or NO: 1-10 CRC
- Winners split the pool proportionally

**Why it works**:
- Engaging, social
- No oracle needed for subjective questions
- Community resolves disputes

**MVP Scope**:
- Create binary polls
- Vote with CRC
- Manual resolution (creator marks outcome)

---

### 2.3 CRC Raffle
**Concept**: Creator offers an item, users buy raffle tickets with CRC.

**Mechanics**:
- Creator lists item + ticket price + max tickets
- Users buy tickets (CRC transfer)
- When max reached or deadline: random draw

**Why it works**:
- Simple giveaway mechanism
- Works for digital or physical items
- Creator can fundraise

**MVP Scope**:
- Create raffle (item description, ticket price, max tickets)
- Buy tickets
- Random draw

---

### 2.4 Trivia for CRC
**Concept**: Daily trivia questions, correct answers split a CRC pool.

**Mechanics**:
- Daily question posted (sponsored or community)
- Pay 1 CRC to answer
- Correct answers split the pool

**Why it works**:
- Daily engagement hook
- Educational (can be Circles-related questions)
- Small stakes = fun, not stressful

**MVP Scope**:
- Display question + multiple choice
- Pay to submit answer
- Reveal correct answer, distribute pool

---

## Category 3: Micro-Finance & Circular Economy

### 3.1 Rotating Savings Group (ROSCA)
**Concept**: Group of trusted friends pool CRC monthly, one person receives the pot each round.

**Mechanics**:
- Create group: 5-10 trusted members
- Monthly contribution: X CRC each
- Rotation: Each month, different member receives total
- Trust required: Only invite trusted connections

**Why it works**:
- Classic circular economy pattern
- Builds on trust network
- Helps with cash flow/lumpy expenses

**MVP Scope**:
- Create group (set contribution amount, member list)
- Track contributions
- Display whose turn it is

**Technical**: No automatic transfers - just tracking + reminders. Manual CRC transfers.

---

### 3.2 CRC Crowdfunding
**Concept**: Simple crowdfunding for community projects.

**Mechanics**:
- Create campaign (goal amount, deadline, description)
- Contribute CRC (non-refundable)
- If goal met: creator receives funds
- If not met: contributors can withdraw (optional)

**Why it works**:
- Community-driven
- Supports circular economy projects
- Simple UI, clear progress bar

**MVP Scope**:
- Create campaign
- Contribute CRC
- View progress
- Withdraw (if unsuccessful)

---

### 3.3 Micro-Bounties
**Concept**: Post small tasks with CRC rewards.

**Mechanics**:
- Post bounty: "Write a poem about Circles - 50 CRC"
- Claim: Someone marks as "working on it"
- Submit: Provide proof/link
- Approve: Creator releases CRC

**Why it works**:
- Micro-economy of services
- Low stakes experimentation
- Can be creative or practical tasks

**MVP Scope**:
- Post bounty (title, description, CRC reward)
- Claim bounty
- Submit work
- Approve/reject + CRC transfer

---

### 3.4 Trust-Based Lending IOU
**Concept**: Track informal loans between trusted contacts.

**Mechanics**:
- Record IOU: "Alice owes Bob 100 CRC"
- Both parties sign (confirm)
- Track repayment
- Optional: trust score impact for defaults

**Why it works**:
- Informal lending already happens
- Recording makes it trackable
- Trust network = natural credit limit

**MVP Scope**:
- Create IOU (amount, due date optional)
- Confirm IOU (other party signs)
- Mark as repaid
- View outstanding IOUs

**Technical**: Namespace for IOU records, signatures for confirmation

---

## Category 4: Social & Community

### 4.1 CRC Tipping Jar
**Concept**: Send micro-tips to content creators or helpful community members.

**Mechanics**:
- Enter address or select from profile
- Send 1-100 CRC with optional message
- Recipient sees tips in their jar

**Why it works**:
- Simple gratitude mechanism
- Encourages helpful behavior
- Very easy to build

**MVP Scope**:
- Input recipient address
- Amount + message
- View received tips

---

### 4.2 Community Potluck Planner
**Concept**: Organise potlucks with CRC contribution for shared costs.

**Mechanics**:
- Create event (date, location, expected attendees)
- RSVP + contribute CRC for supplies
- Organiser receives pool for venue/food

**Why it works**:
- Real-world community building
- CRC helps with shared costs
- Trust network = invite list

**MVP Scope**:
- Create event
- RSVP + contribute
- View attendee list
- Organiser withdraws

---

### 4.3 Mutual Aid Request Board
**Concept**: Request help from community (no repayment expected).

**Mechanics**:
- Post request (what you need, why)
- Community can donate CRC
- No obligation, pure mutual aid

**Why it works**:
- Aligns with Circles UBI ethos
- Trust network prevents abuse
- Simple, direct giving

**MVP Scope**:
- Post request
- Donate CRC
- View requests

---

## Category 5: Creative & Collectibles

### 5.1 CRC Meme Gallery
**Concept**: Post memes, tip with CRC, weekly top tip earns spotlight.

**Mechanics**:
- Post meme (image IPFS)
- Community tips CRC
- Weekly leaderboard

**Why it works**:
- Fun, low-stakes
- Encourages creativity
- Social engagement

**MVP Scope**:
- Upload meme (IPFS)
- View gallery
- Tip with CRC
- Leaderboard

---

### 5.2 Personal Badge Minting
**Concept**: Create on-chain badges for achievements, pay CRC to mint.

**Mechanics**:
- Define badge (name, description, image)
- Mint to your address (costs 5 CRC)
- Display on profile

**Why it works**:
- Personal expression
- Simple NFT-like experience
- CRC burn/fee

**MVP Scope**:
- Create badge from template
- Mint (CRC transfer)
- View your badges

**Technical**: Could use simple on-chain registry or just namespace records

---

## Category 6: Tools & Utilities

### 6.1 CRC Subscription Manager
**Concept**: Set up recurring CRC payments to creators/orgs.

**Mechanics**:
- Define subscription (recipient, amount, interval)
- Manual trigger each period (reminder)
- Track subscription history

**Why it works**:
- Sustainable creator support
- Simple, transparent
- No auto-debit (user confirms each time)

**MVP Scope**:
- Create subscription entry
- View due subscriptions
- One-click pay

---

### 6.2 Multi-Send CRC
**Concept**: Send CRC to multiple addresses in one transaction.

**Mechanics**:
- Paste list of addresses + amounts
- Preview total
- Single approval for all transfers

**Why it works**:
- Useful for airdrops, payroll, tips
- Demonstrates batch transactions
- Simple utility

**MVP Scope**:
- Input address + amount pairs
- Preview
- Batch send

**Technical**: Use batched transactions through host

---

### 6.3 CRC Voucher Creator
**Concept**: Create CRC vouchers that recipients can redeem.

**Mechanics**:
- Create voucher (amount, secret code)
- Share code with recipient
- Recipient enters code → receives CRC

**Why it works**:
- Gift CRC easily
- Off-chain code distribution
- Simple claim flow

**MVP Scope**:
- Create voucher (CRC escrowed)
- Generate shareable link/code
- Claim voucher

---

## Category 7: Trust & Reputation Experiments

### 7.1 Trust Weighted Voting
**Concept**: Create polls where voting power = trust connections.

**Mechanics**:
- Create poll
- Only trusted connections can vote
- Vote weight = trust duration or mutual connections

**Why it works**:
- Sybil-resistant voting
- Trust network = legitimacy
- Community governance experiments

**MVP Scope**:
- Create poll
- Vote (check trust relation)
- Display results

---

### 7.2 Circle of Trust Visualiser
**Concept**: Explore and visualise your trust network (already exists as trust-graph-explorer).

**Extension Ideas**:
- Find shortest trust path to any address
- Identify trusted intermediaries
- Trust strength heatmap

---

## Quick Wins: Easiest to Build

Based on complexity and existing patterns:

| Difficulty | Miniapp | Time Estimate |
|------------|---------|---------------|
| 🟢 Easiest | CRC Tipping Jar | 2-3 hours |
| 🟢 Easiest | Multi-Send CRC | 2-3 hours |
| 🟢 Easiest | CRC Voucher Creator | 3-4 hours |
| 🟡 Medium | CRC Lottery Pool | 4-6 hours |
| 🟡 Medium | Trivia for CRC | 4-6 hours |
| 🟡 Medium | CRC Raffle | 4-6 hours |
| 🟡 Medium | CRC Classifieds | 6-8 hours |
| 🟡 Medium | Micro-Bounties | 6-8 hours |
| 🔴 Harder | ROSCA Savings Group | 8-12 hours |
| 🔴 Harder | Crowdfunding | 8-12 hours |

---

## Common Technical Patterns

### CRC Payment Flows
All these miniapps need:
1. Display CRC amount input
2. Transfer via `avatar.transfer.advanced(recipient, amount)`
3. Receipt polling
4. Success/error UI

### Namespace for Listings
Many need append-only lists:
1. Pin content to IPFS
2. Add link to namespace
3. Stream to read all entries

### Simple Org Treasury
Most need a central address to collect fees/pools:
1. Create org for miniapp
2. Users transfer CRC to org address
3. Org distributes (via runner) when conditions met

---

## Tags

#brainstorm #ideas #miniapp #crc #micro-economics #circular-economy #games #community