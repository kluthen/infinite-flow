---
id: specification_ephemeral_state_verification
status: REVIEW
human_name: Ephemeral State Verification
priority: 1
type: SPECIFICATION
layer: ARCHITECTURE
version: 0.3
tags: verification,ephemeral-state,persistence
parents:
  - [[rule_ephemeral_session_state]]
dependents: []
---

# Ephemeral State Verification

## INTENT
Verify independently that user and session state reaches browser storage only through the app's storage code, and that state the storage code does not keep is gone after a reload.

## THE RULE / LOGIC
The ephemeral-state verification boundary checks that localStorage, sessionStorage, cookies and user-state cache entries are never used for user or session state, and that only the storage code reaches IndexedDB and the browser's storage manager. Across the required phrase workflow and a reload, the player's saved settings come back, while state the storage code does not keep, such as a phrase generated outside a session or an in-flight or retryable operation state, is neither written to the app's database nor restored. A session that ended with its review reaches the database only as its kept session, written by the storage code at the session's own save. The session history and export modules touch no browser storage. It distinguishes permitted immutable application-asset precaching from prohibited user and session state persistence.

## TECHNICAL INTERFACE
Release verification observes browser persistence behavior before, during, and after the required phrase workflow and a reload, reading the app's database through the workspace harness's storage seam. The ESLint boundary rules (eslint.config.js) and scripts/verify-boundaries.mjs confine IndexedDB and navigator.storage to src/storage/.

## EXPECTATION
Nothing is written to localStorage, sessionStorage, cookies or user-state cache entries. After a reload the player's saved settings come back, while no phrase generated outside a session, operation state or retryable error does, and the app's database holds no record of them. No code outside the storage code uses IndexedDB or the browser's storage manager, and required behavior does not depend on any browser persistence API outside it.
