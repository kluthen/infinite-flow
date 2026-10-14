---
id: req_your_data
status: DRAFT
human_name: Your Data
tags: [v3, release-v3.0, storage, privacy, changes-in-v3.1]
notes: Synced 2026-10-14 at the v3.0 wave-3 post-task sync, same version 0.1: build plan chunk 5's save policy (merge 9f01f7f; module_save_policy, src/storage/save-policy.ts and save-policy-requests.ts) passes on the space estimate and whether the storage is persistent, and offers Delete everything, for Your data. The Your data screen waits for its chunk. Links and linked tests (save-policy-your-data.spec.ts) checked and right. Built in storage and not wired yet: no app code uses the policy until build plan chunk 7, so the running app does not yet behave so. Text and status unchanged (DRAFT). Earlier: v3.1 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): it also lists the player presets, with their number. Text and status unchanged on purpose: it still describes the running code. Revise it in the change that builds that behaviour, per docs/release/v3.1-v3.2-intent-change-set.md. Earlier: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls within the vision since version 0.8 (2026-10-08, spec D246).
dependents:
  - [[module_on_device_database]]
  - [[module_save_policy]]
  - [[rule_delete_everything]]
type: REQUIREMENT
layer: BUSINESS
version: 0.1
priority: 1
parents:
  - [[req_on_device_storage]]
---

# Your Data

## INTENT
Let the player see everything the app keeps about them, and remove it.

## THE RULE / LOGIC
From v3.0, one place in the app, called Your data here (its name and place are a design choice), lists what the app keeps on the device, shows how much space it uses, says whether the browser protects that storage from automatic clearing, and offers Delete everything. It also offers deleting every kept session and deleting every session's kept played notes. Each kept item's own deletion is offered where that item is shown.

## TECHNICAL INTERFACE
A Your data view lists the kept data and the space it uses, states whether storage is protected, and offers the all-at-once deletions.

## EXPECTATION
- Your data lists what is kept, the space it uses, and whether storage is protected.
- Your data offers Delete everything, deleting every kept session, and deleting every kept played note.
