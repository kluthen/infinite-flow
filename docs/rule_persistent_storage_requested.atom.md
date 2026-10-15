---
id: rule_persistent_storage_requested
status: DRAFT
parents:
  - [[req_on_device_storage]]
dependents:
  - [[entity_my_instrument_record]]
  - [[module_kept_session_reach]]
  - [[module_on_device_database]]
  - [[module_save_policy]]
layer: BUSINESS
version: 0.2
priority: 1
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
