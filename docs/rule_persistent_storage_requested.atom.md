---
id: rule_persistent_storage_requested
status: DRAFT
parents:
  - [[req_on_device_storage]]
dependents: []
layer: BUSINESS
version: 0.1
priority: 1
notes: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed v3 revision of the vision is confirmed.
type: RULE
human_name: Persistent Storage Requested When Something Is Worth Keeping
tags: [v3, release-v3.0, storage]
---

# Persistent Storage Requested When Something Is Worth Keeping

## INTENT
Protect what the player chose to keep from being silently cleared by the browser.

## THE RULE / LOGIC
By default a site's storage is best-effort: the browser may clear it under storage pressure without warning. From v3.0, the app asks the browser to make its storage persistent the first time the player keeps something they would miss: the first time they pin a session, mark a favorite or save their own instrument. The browser grants or refuses this on its own; the app reports in Your data whether its storage is protected, and promises nothing it cannot keep.

## TECHNICAL INTERFACE
The first pin, favorite or saved instrument triggers one request for persistent storage; Your data shows whether it was granted.

## EXPECTATION
- Persistent storage is requested on the first pin, favorite or saved instrument.
- Your data reports whether it was granted.
