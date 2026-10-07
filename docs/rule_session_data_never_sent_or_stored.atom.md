---
id: rule_session_data_never_sent_or_stored
status: REVIEW
layer: BUSINESS
human_name: Session Data Never Sent or Stored
version: 0.1
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
notes: v3.0 change pending (2026-10-07, v3.0 spec ingestion): the approved v3.0 scope, not yet built, changes this atom. Its never-stored half no longer holds from v3.0: kept sessions, favorites, comments, settings and, after opt-in, played notes are written to the device's store (req_on_device_storage, rule_kept_session_content, rule_played_notes_kept_only_after_opt_in); acknowledgements are still never stored (rule_kept_session_holds_no_acknowledgements). Its never-sent half, and exports as the only way out, stay unchanged. Text and status unchanged on purpose: it still describes the running v2.0 code. Revise it in the change that builds the v3.0 behaviour, per docs/release/v3.0-intent-change-set.md.
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
