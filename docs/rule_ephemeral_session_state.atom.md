---
id: rule_ephemeral_session_state
status: REVIEW
tags: [persistence, session, browser-state, changes-in-v3.0]
parents:
  - [[req_four_measure_phrase]]
layer: BUSINESS
version: 0.2
dependents:
  - [[module_session_tension_across_phrases_flag]]
  - [[module_session_vary_settings_flag]]
  - [[rule_session_data_never_sent_or_stored]]
  - [[service_idle_generation_session]]
  - [[service_workspace_session_flow]]
  - [[specification_ephemeral_state_verification]]
human_name: Ephemeral Session State
type: RULE
priority: 1
notes: Owner confirmed 2026-10-12 (wave-1 sign-off, relayed by the coordinator) the exact Part D wording applied at version 0.2; text unchanged. Status stays REVIEW; the changes-in-v3.0 tag stays for chunk 7's full revision. Earlier: Revised 2026-10-12 at the v3.0 wave-1 post-task sync (previous version 0.1) with the Part D revision of v3.0 build plan chunk 3, which the owner confirmed on 2026-10-09 (spec D256): the never-stored clause gets the one-directory wording, browser storage written or read only by the storage code under src/storage/, and localStorage, sessionStorage, cookies and user-state cache entries never used, the storage code included. The exact wording is drafted by documentalist and awaits the owner's check. Status unchanged (REVIEW). The full v3.0 revision, what is kept and restored, stays with chunk 7, so the changes-in-v3.0 tag stays. Earlier: v3.0 change pending (2026-10-07, v3.0 spec ingestion): the approved v3.0 scope, not yet built, changes this atom. From v3.0 the player's settings, own instrument, remembered controller, kept sessions, favorites, comments and opted-in played notes are kept on the device (req_on_device_storage and its rules), so the rule that user and session state is never written to or restored from browser storage no longer holds; that nothing is saved while a session runs stays (rule_no_save_during_session), and the offline cache of static files is unchanged. Text and status unchanged on purpose: it still describes the running v2.0 code. Revise it in the change that builds the v3.0 behaviour, per docs/release/v3.0-intent-change-set.md.
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
