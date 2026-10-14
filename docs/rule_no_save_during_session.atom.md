---
id: rule_no_save_during_session
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.2
priority: 1
tags: [v3, release-v3.0, storage, session]
parents:
  - [[req_on_device_storage]]
notes: Synced 2026-10-14 at the v3.0 wave-3 post-task sync, same version 0.2: build plan chunk 5's save policy (merge 9f01f7f; module_save_policy, src/storage/save-policy.ts and save-policy-requests.ts) builds its storage half: between hold and release nothing reaches the database, and the held changes are flushed once, in one transaction, at the release. Links and linked tests (save-policy.spec.ts, save-policy-reports.spec.ts, save-policy-your-data.spec.ts) checked and right. Built in storage and not wired yet: no app code uses the policy until build plan chunk 7, so the running app does not yet behave so. Text and status unchanged (DRAFT). Earlier: Revised 2026-10-07 to version 0.2 (still DRAFT) by the re-sync to the v3.0 master spec v1.3, approved by the product owner: a setting the player changes during a session is saved with the session's end; the sentence on settings changed outside a session moved to rule_settings_saved_on_change. Earlier: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls within the vision since version 0.8 (2026-10-08, spec D246).
human_name: No Saving During a Session
dependents:
  - [[module_save_policy]]
---

# No Saving During a Session

## INTENT
Keep saving out of a running session, whose timing comes first.

## THE RULE / LOGIC
From v3.0, nothing is written to the device's store between a session's start and its end. What a session produces, and any setting the player changed while it ran, is saved once, when it ends. A session cut short by closing or reloading the page is therefore lost, as before v3.0.

## TECHNICAL INTERFACE
Every write to the device's store happens outside the span from a session's start to its end.

## EXPECTATION
- No storage write happens between Start and the session's end.
- A session cut short by closing or reloading the page is not kept.
