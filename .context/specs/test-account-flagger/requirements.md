# Test Account Flagger — Requirements

## User Story
As a Circles user, I want to flag my account as a test/bot account so that analytics dashboards and TMSs can filter it out, improving data quality for the entire ecosystem.

## Functional Requirements
- FR1: Show the connected wallet's current test-account flag status (flagged or not)
- FR2: Allow the user to flag their connected address as a test account by writing a marker into their Circles extensible profile metadata
- FR3: Allow the user to remove the test flag from their profile
- FR4: The flag operation must require an on-chain transaction (updateMetadataDigest on NameRegistry v2) to prove account ownership
- FR5: Preserve all existing profile fields (name, description, imageUrl, previewImageUrl, location, geoLocation) when updating
- FR6: Display the user's Circles profile info (name, avatar) when connected
- FR7: Show transaction status (pending, confirmed, failed) during flag/unflag operations

## Non-Functional Requirements
- NFR1: Must load inside an iframe (Circles MiniApp host)
- NFR2: Must work with passkey-based Safe accounts
- NFR3: All transaction values in hex format
- NFR4: Follow Gnosis wallet design system (Space Grotesk, brand colours, pill buttons)
- NFR5: Handle passkey auto-connect errors gracefully (Pattern M)

## Storage Approach
The test flag is stored as a JSON object in the profile's `description` field, separated by a `##TEST_ACCOUNT##` marker — the same pattern used by social-attestation. This approach:
- Is queryable by the profile service (TMSs/analytics can check description for the marker)
- Requires an on-chain tx (proves ownership)
- Is separate from the blacklist functionality
- Is reversible (user can remove the flag)

## Out of Scope
- Bulk flagging from a single wallet (each address must connect and flag separately — ownership proof requires per-address tx)
- Flagging addresses you don't own
- Backend/analytics dashboard filtering (separate task CRC-1612)
- TMS integration (depends on backend)
- Invite bot batch processing

## Acceptance Criteria
- [ ] Wallet connection shown on load
- [ ] Current flag status displayed when connected
- [ ] User can flag their address as a test account
- [ ] User can remove the test flag
- [ ] Profile fields preserved during update
- [ ] Transaction confirmation shown
- [ ] Error states handled gracefully (no avatar, passkey errors, RPC failures)
- [ ] Works inside the Circles MiniApp host iframe
