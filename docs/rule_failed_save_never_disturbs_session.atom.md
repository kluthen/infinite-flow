---
id: rule_failed_save_never_disturbs_session
status: DRAFT
tags: [v3, release-v3.0, storage, session]
parents:
  - [[req_on_device_storage]]
notes: Synced 2026-10-14 at the v3.0 wave-3 post-task sync, same version 0.1: build plan chunk 5's save policy (merge 9f01f7f; module_save_policy, src/storage/save-policy.ts and save-policy-requests.ts) builds its storage half: a refused save never rejects, resolves as failed, and is reported with its kind, quota or other, to one listener, once per run of refusals; nothing kept is deleted. The notice itself is build plan chunk 8. Links and linked tests (save-policy.spec.ts, save-policy-reports.spec.ts) checked and right. Built in storage and not wired yet: no app code uses the policy until build plan chunk 7, so the running app does not yet behave so. Text and status unchanged (DRAFT). Earlier: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls within the vision since version 0.8 (2026-10-08, spec D246).
type: RULE
layer: BUSINESS
dependents:
  - [[module_save_policy]]
version: 0.1
priority: 1
human_name: A Failed Save Never Disturbs a Session
---

# A Failed Save Never Disturbs a Session

## INTENT
Make sure a save that fails never gets in the way of playing.

## THE RULE / LOGIC
From v3.0, a save the browser refuses, whether because storage is full or for any other reason, never stops, interrupts or delays a session. The app keeps working with what it holds in memory, and tells the player that the save failed once no session is running; a running session never asks the player for anything. Nothing already kept is deleted to make room for a save.

## TECHNICAL INTERFACE
A refused save leaves the app running from memory and produces a notice shown only outside a running session.

## EXPECTATION
- A refused save never interrupts or delays a session.
- The player is told about the failed save after the session, never during it.
- Nothing already kept is deleted automatically to make room.
