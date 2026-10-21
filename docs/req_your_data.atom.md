---
id: req_your_data
status: STABLE
human_name: Your Data
tags: [v3, release-v3.0, storage, privacy]
dependents:
  - [[module_kept_session_changes]]
  - [[module_kept_session_reach]]
  - [[module_on_device_database]]
  - [[module_save_policy]]
  - [[rule_delete_everything]]
type: REQUIREMENT
layer: BUSINESS
version: 0.2
priority: 1
parents:
  - [[req_on_device_storage]]
---

# Your Data

## INTENT
Let the player see everything the app keeps about them, and remove it.

## THE RULE / LOGIC
From v3.0, one place in the app, called Your data here (its name and place are a design choice), lists what the app keeps on the device, the player presets and their number included, shows how much space it uses, says whether the browser protects that storage from automatic clearing, and offers Delete everything. It also offers deleting every kept session and deleting every session's kept played notes. Each kept item's own deletion is offered where that item is shown.

## TECHNICAL INTERFACE
A Your data view lists the kept data and the space it uses, the player presets with their number and each one's own deletion after a confirmation, states whether storage is protected, and offers the all-at-once deletions.

## EXPECTATION
- Your data lists what is kept, the player presets and their number included, the space it uses, and whether storage is protected.
- Your data offers Delete everything, deleting every kept session, and deleting every kept played note.
