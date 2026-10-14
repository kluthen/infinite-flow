---
id: rule_kept_session_holds_no_acknowledgements
status: DRAFT
human_name: Kept Sessions Hold No Acknowledgement
parents:
  - [[rule_kept_session_content]]
  - [[rule_no_grading_or_mismatch_signal]]
dependents:
  - [[entity_kept_session_record]]
tags: [v3, release-v3.0, storage, non-scoring]
notes: Synced 2026-10-14 at the v3.0 wave-3 post-task sync, same version 0.1: build plan chunk 9's kept-session codec (merge fcabf7f; entity_kept_session_record, module_kept_session_codec, src/storage/records/kept-*.ts) copies every field by name onto allowlisted shapes, so no acknowledgement reaches a record, and decoding makes none up. Links and linked tests (kept-session-record.spec.ts) checked and right. Built in storage and not wired yet: nothing saves or opens a kept session until build plan chunk 10. Text and status unchanged (DRAFT). Earlier: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls within the vision since version 0.8 (2026-10-08, spec D246).
type: RULE
layer: BUSINESS
version: 0.1
priority: 1
---

# Kept Sessions Hold No Acknowledgement

## INTENT
Make counting the player's hits impossible by construction in anything the app keeps.

## THE RULE / LOGIC
From v3.0, a kept session never holds which expected notes were acknowledged. Without that record, nothing kept can be used to count hits, grade or score the player, in any view, at any time.

## TECHNICAL INTERFACE
The kept-session record has no field for acknowledgements.

## EXPECTATION
- No kept session holds any acknowledgement.
