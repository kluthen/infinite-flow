---
id: rule_session_data_never_sent_or_stored
status: REVIEW
layer: BUSINESS
human_name: Session Data Never Sent, Stored Only as Kept
version: 0.2
priority: 1
tags: [v2, release-v2.0, privacy, session, changes-in-v3.0]
parents:
  - [[req_browser_only_first_release]]
  - [[rule_ephemeral_session_state]]
dependents:
  - [[module_review_export_pipeline]]
  - [[service_session_history]]
  - [[specification_browser_only_operation_verification]]
type: RULE
---

# Session Data Never Sent, Stored Only as Kept

## INTENT
Keep everything about a session off the network, and let it reach storage only as what v3.0 keeps, written by the app's storage code once the session has ended.

## THE RULE / LOGIC
Nothing about a session, whether generated material, played notes, acknowledgements, settings or history, is ever sent in any network request. From v3.0, it reaches browser storage only through the app's storage code, in the app's one IndexedDB database, and only once the session has ended: the session itself as its kept session, holding only what a kept session holds, its played notes only after the player opts in and never its acknowledgements, the generator's provenance or its diagnostics; and any setting the player changed while it ran, as a saved setting. Nothing is written while the session runs, and nothing at all while saving is off. localStorage, sessionStorage, cookies and the Cache API never hold any of it. Session data leaves the player's machine only as an export file the player explicitly triggered, delivered as a local browser download. This holds by construction, not by policy.

## TECHNICAL INTERFACE
No code path sends session data over the network. Only the storage code writes it, after the session's end, as the kept session's records and the saved settings; exports are local downloads.

## EXPECTATION
Under a network and storage spy across a full session, its review and every export, no session data is sent over the network; nothing is written while the session runs; afterwards only the app's database is written, with the kept session's summary and body (played notes only after the opt-in) and the saved settings, and no acknowledgement, provenance or diagnostics.
