---
id: rule_persistent_storage_requested
status: STABLE
parents:
  - [[req_on_device_storage]]
dependents:
  - [[entity_my_instrument_record]]
  - [[module_kept_session_reach]]
  - [[module_on_device_database]]
  - [[module_player_presets]]
  - [[module_save_policy]]
layer: BUSINESS
version: 0.3
priority: 1
type: RULE
human_name: Persistent Storage Requested When Something Is Worth Keeping
tags: [v3, release-v3.0, storage, changes-in-v3.1]
---

# Persistent Storage Requested When Something Is Worth Keeping

## INTENT
Protect what the player chose to keep from being silently cleared by the browser.

## THE RULE / LOGIC
By default a site's storage is best-effort: the browser may clear it under storage pressure without warning. From v3.0, once per visit, the first time the player keeps something they would miss (pins a session, marks a favorite, saves their own instrument, or saves a player preset, as a new preset or by saving changes into one), the app asks the browser to make its storage persistent, unless it already is. Asking again on a later visit is harmless and gives the browser another chance to grant it. The browser grants or refuses this on its own; the app reports in Your data whether its storage is protected, and promises nothing it cannot keep.

## TECHNICAL INTERFACE
The first pin, favorite, saved instrument or saved player preset of each visit triggers one request for persistent storage, unless it is already granted; renaming or deleting a player preset triggers none. Your data shows whether it is granted.

## EXPECTATION
- In each visit, persistent storage is requested once, on the first pin, favorite, saved instrument or saved player preset, unless it is already granted.
- Your data reports whether it was granted.
