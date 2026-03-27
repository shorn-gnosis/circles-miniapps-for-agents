# Backer Voting Miniapp

A Circles miniapp that allows backers and indirect backers to participate in governance voting.

## Features

- Checks if connected user is a backer or indirect backer
- Displays backer status and voting power
- Lists active and past proposals
- Click any proposal to view full details in a modal
- Vote on proposals directly from the modal (Yes/No)
- Shows real-time voting results with percentages

## Backer Eligibility

- **Backers**: Users who have directly trusted other users in the Circles network
- **Indirect Backers**: Users who are trusted by someone who trusts them (2-hop trust relationship)

## Development

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build