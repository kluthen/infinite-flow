---
id: rule_session_data_never_sent_or_stored
status: DRAFT
layer: BUSINESS
human_name: Session Data Never Sent or Stored
version: 0.1
priority: 1
tags: [v2, release-v2.0, privacy, session]
parents:
  - [[req_browser_only_first_release]]
  - [[rule_ephemeral_session_state]]
dependents:
  - [[specification_browser_only_operation_verification]]
type: RULE
---

# Session Data Never Sent or Stored

## INTENT
Keep everything about a session off the network and out of storage.

## THE RULE / LOGIC
Nothing about a session, whether generated material, played notes, acknowledgements, settings or history, is ever sent in any network request or written to any browser storage (localStorage, IndexedDB, the Cache API or any other). Session data leaves the player's machine only as an export file the player explicitly triggered, delivered as a local browser download. This holds by construction, not by policy.

## TECHNICAL INTERFACE
No code path sends session data over the network or persists it; exports are local downloads.

## EXPECTATION
Under a network and storage spy across a full session, its review and every export, no session data is sent over the network or written to browser storage.
