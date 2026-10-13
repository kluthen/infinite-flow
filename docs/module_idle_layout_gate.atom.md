---
id: module_idle_layout_gate
status: REVIEW
human_name: Idle Layout Gate
tags: workspace,session,notation
parents:
  - [[rule_session_end_generates_next_phrase_one]]
  - [[rule_session_layout_fixed_at_start]]
  - [[service_workspace_session_flow]]
dependents: []
type: MODULE
layer: ARCHITECTURE
version: 0.2
priority: 1
notes: Revised 2026-10-13 to version 0.2 (previous version 0.1) at the v3.0 wave-2 post-task sync, for build plan chunk 24 (merge 0b744ae); stays REVIEW. The gate's port gains observeInputs, a passive observer of every layout-input report, at Idle and during a session alike, used by the Idle pre-generation queue's layout re-check; the gate is otherwise unchanged. This is what the merged code does, with linked tests (idle-layout-gate.spec.ts). The chunk 24 change pending below is done. Earlier: v3.0 change pending (2026-10-12, pre-code architecture capture for build plan chunk 24): a passive observer of the staff's layout reports at Idle joins the gate's port, for the pre-generation queue's window re-check (module_idle_pregeneration_queue); the gate is otherwise unchanged. Text and status unchanged on purpose: it still describes the running code. Revise it at chunk 24's post-task sync. Earlier: Split out on 2026-10-05 from service_workspace_session_flow (version 1.6) during documentation debt paydown; the text is moved unchanged in meaning and keeps its DRAFT status.
---

# Idle Layout Gate

## INTENT
Keep the staff's reports from reaching the Idle machinery while a practice session runs, and give the Idle machinery the latest of them back when it ends.

## THE RULE / LOGIC
An idle layout gate, kept in the entry chunk with no session logic, sits between the staff's reports (its layout inputs and each engraving's outcome) and the Idle machinery and always keeps the latest layout inputs; while a session runs, its end watchers divert the reports to themselves, so the Idle fit retries, room notice, regeneration and notation-error capture never act on phrase 1 during it, and at its end the reports are handed back and the latest inputs, then the last engraving outcome held, are re-applied to the Idle machinery. The staff's own session failure travels through the same gate but only ever to the session diverting the reports; with no session diverting it is dropped, never reaching the Idle machinery. The gate also tells passive observers of every layout-input report, after its receiver, at Idle and during a session alike; an observer receives nothing else and changes nothing the gate does. The Idle pre-generation queue observes it this way for its layout re-check.

## TECHNICAL INTERFACE
The session controller is built over the idle layout gate's port. The staff's reports reach the Idle machinery through the idle layout gate's handlers, which the workspace exposes as handleLayoutInputs, handleEngraved, handleNotationError and handleSessionStaffFailed. The port's `observeInputs(listener)` adds a passive observer of layout-input reports and returns its stop; a listener already observing is not added again, and stopping one twice throws (`src/components/workspace/idle-layout-gate.ts`).

## EXPECTATION
While a session runs no staff report reaches the Idle machinery; at its end the latest layout inputs and the held engraving outcome are re-applied. A passive observer hears every layout-input report, at Idle and during a session, and adding or stopping one changes nothing the gate does.
