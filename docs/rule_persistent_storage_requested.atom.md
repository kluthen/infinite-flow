---
id: rule_persistent_storage_requested
status: DRAFT
parents:
  - [[req_on_device_storage]]
dependents: []
layer: BUSINESS
version: 0.2
priority: 1
notes: v3.1 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): saving a player preset, as new or by saving changes, joins the triggers of the request. Text and status unchanged on purpose: it still describes the running code. Revise it in the change that builds that behaviour, per docs/release/v3.1-v3.2-intent-change-set.md. Earlier: Revised 2026-10-07 to version 0.2 (still DRAFT) by the re-sync to the v3.0 master spec v1.3, approved by the product owner: persistent storage is asked for once per visit, unless already granted; asking again on a later visit is harmless. Earlier: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls within the vision since version 0.8 (2026-10-08, spec D246).
type: RULE
human_name: Persistent Storage Requested When Something Is Worth Keeping
tags: [v3, release-v3.0, storage, changes-in-v3.1]
---

# Persistent Storage Requested When Something Is Worth Keeping

## INTENT
Protect what the player chose to keep from being silently cleared by the browser.

## THE RULE / LOGIC
By default a site's storage is best-effort: the browser may clear it under storage pressure without warning. From v3.0, once per visit, the first time the player keeps something they would miss (pins a session, marks a favorite or saves their own instrument), the app asks the browser to make its storage persistent, unless it already is. Asking again on a later visit is harmless and gives the browser another chance to grant it. The browser grants or refuses this on its own; the app reports in Your data whether its storage is protected, and promises nothing it cannot keep.

## TECHNICAL INTERFACE
The first pin, favorite or saved instrument of each visit triggers one request for persistent storage, unless it is already granted; Your data shows whether it is granted.

## EXPECTATION
- In each visit, persistent storage is requested once, on the first pin, favorite or saved instrument, unless it is already granted.
- Your data reports whether it was granted.
