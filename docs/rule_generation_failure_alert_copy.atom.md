---
id: rule_generation_failure_alert_copy
status: DRAFT
layer: ARCHITECTURE
priority: 2
tags: error-handling,alert-copy,accessibility
human_name: Generation Failure Alert Copy
type: RULE
version: 0.1
parents:
  - [[service_workspace_session_flow]]
dependents: []
---

# Generation Failure Alert Copy

## INTENT
Show the player one calm, fixed sentence naming what went wrong with a generation attempt, instead of a raw failure code or a developer-oriented message string concatenated onto a generic prefix.

## THE RULE / LOGIC
A generation failure the workspace session captured as its generationError maps to exactly one fixed, player-facing alert string. A typed generation failure carries one of six failure codes -- no_legal_harmony_plan, no_legal_rhythm_plan, no_legal_pitch_plan, no_eligible_register_window, search_limit_exceeded, or result_validation_failed -- and each resolves to its own dedicated sentence naming the affected settings and, where useful, a suggested kind of change, without ever naming the settings that are fine. Every other error -- a generation-Worker crash, a Worker transport failure, or any other unrecognized error -- resolves to one shared generic fallback sentence. The mapping never reuses the underlying error's own developer-facing message and never exposes the raw failure code to the player; a developer-facing message including a "Generation failed:" prefix remains available separately for logs and devtools, never for this player-facing text.

## TECHNICAL INTERFACE
The mapping accepts the Error the workspace session exposes as generationError and returns one player-facing alert string. It has no dependency on Vue, the DOM, or the workspace session itself; the score panel renders whatever string this mapping returns in its error alert region.

## EXPECTATION
Each of the six typed failure codes maps to its own exact sentence naming the affected settings; every other error maps to the shared generic fallback sentence. The returned text never contains the raw failure code and never contains a "Generation failed:" prefix.
