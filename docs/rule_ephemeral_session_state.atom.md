---
id: rule_ephemeral_session_state
status: REVIEW
tags: [persistence, session, browser-state, changes-in-v3.0]
parents:
  - [[req_four_measure_phrase]]
layer: BUSINESS
version: 0.1
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
notes: v3.0 change pending (2026-10-07, v3.0 spec ingestion): the approved v3.0 scope, not yet built, changes this atom. From v3.0 the player's settings, own instrument, remembered controller, kept sessions, favorites, comments and opted-in played notes are kept on the device (req_on_device_storage and its rules), so the rule that user and session state is never written to or restored from browser storage no longer holds; that nothing is saved while a session runs stays (rule_no_save_during_session), and the offline cache of static files is unchanged. Text and status unchanged on purpose: it still describes the running v2.0 code. Revise it in the change that builds the v3.0 behaviour, per docs/release/v3.0-intent-change-set.md.
---

# Ephemeral Session State

## INTENT
Keep first-release user and session state ephemeral for the active browser session.

## THE RULE / LOGIC
First-release user and session state remains in memory only for the active session. The application never writes that state to or restores it from localStorage, sessionStorage, IndexedDB, or user-state cache entries. Precaching immutable application assets is permitted and does not make user or session state persistent.

## TECHNICAL INTERFACE
The browser client exposes no persisted user- or session-state storage or restoration interface. Its PWA cache may contain immutable application assets only.

## EXPECTATION
Reloading or starting a later browser session does not restore prior user or session state. Required first-release behavior does not depend on browser persistence APIs, while immutable application assets may be available from the PWA cache.
