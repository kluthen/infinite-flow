---
id: rule_ephemeral_session_state
status: REVIEW
tags: [persistence, session, browser-state]
parents:
  - [[req_four_measure_phrase]]
layer: BUSINESS
version: 0.2
dependents:
  - [[module_on_device_database]]
  - [[module_session_tension_across_phrases_flag]]
  - [[module_session_vary_settings_flag]]
  - [[rule_session_data_never_sent_or_stored]]
  - [[service_idle_generation_session]]
  - [[service_workspace_session_flow]]
  - [[specification_ephemeral_state_verification]]
human_name: Ephemeral Session State
type: RULE
priority: 1
---

# Ephemeral Session State

## INTENT
Keep user and session state out of browser storage everywhere except the app's one storage layer.

## THE RULE / LOGIC
User and session state is written to or restored from browser storage only by the app's storage code, which lives in one place apart from the rest of the app; everywhere else that state stays in memory for the active browser session. Only that storage code may use IndexedDB or the browser's storage manager. localStorage, sessionStorage, cookies and user-state cache entries are never used, the storage code included. State the storage code does not keep stays in memory only and is gone after a reload. Precaching immutable application assets is permitted and does not make user or session state persistent.

## TECHNICAL INTERFACE
IndexedDB and `navigator.storage` are allowed only under `src/storage/`; `localStorage`, `sessionStorage`, `caches`, `document.cookie` and `cookieStore` are banned everywhere, `src/storage/` included. The ESLint boundary rules (`eslint.config.js`) and `scripts/verify-boundaries.mjs` both enforce this. No other part of the browser client exposes a persisted user- or session-state storage or restoration interface. Its PWA cache may contain immutable application assets only.

## EXPECTATION
No code outside the storage code reads or writes browser storage, and no code at all uses localStorage, sessionStorage, cookies or user-state cache entries. Reloading or starting a later browser session restores no user or session state that the storage code does not keep. Required behavior does not depend on any browser persistence API outside the storage code, while immutable application assets may be available from the PWA cache.
