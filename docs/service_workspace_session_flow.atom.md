---
id: service_workspace_session_flow
status: REVIEW
layer: ARCHITECTURE
version: 0.1
parents:
  - [[module_generation_request_construction]]
  - [[rule_ephemeral_session_state]]
  - [[rule_presentation_preference_preserves_phrase]]
  - [[user_story_controlled_phrase_generation]]
human_name: Workspace Session Flow
priority: 1
tags: workspace,session-state,operation-flow
dependents:
  - [[rule_generation_failure_alert_copy]]
type: SERVICE
---

# Workspace Session Flow

## INTENT
Coordinate the active phrase workspace as root-created, readonly in-memory session state.

## THE RULE / LOGIC
A root-created Vue composable owns pending controls, current generation intent and result, presentation state kept separate from generation state, operation state, and retryable error state for the active browser session. It exposes explicit control, profile, theme, notation, Generate, Regenerate, retry-generation, and retry-notation actions. Ordinary control, profile, theme, and notation edits never generate. Generate and Regenerate coordinate injected seed, request-identity, generation-outcome, and notation-outcome seams; Regenerate retains pending controls and requests a new seed. Retry-generation is available only while idle with a captured generation error present; it does not require a retained failed intent. It builds a brand-new intent from the current controls and profile with a fresh injected seed and request identity -- the same construction Generate and Regenerate use -- rather than replaying the failed intent unchanged, so an edit made after the failure and before retrying is picked up; it applies the same unsupported-rhythm-settings block as Generate and Regenerate. A captured generation error is cleared only when the next Generate, Regenerate, or Retry-generation attempt starts; it is unaffected by ordinary control, profile, theme, or notation edits made while idle after the failure. At most one generation or notation operation runs at a time. During an operation consumers can read but cannot mutate the exposed state. The composable coordinates outcomes without implementing Step 5 through Step 9 planners, engraving, or components, and never persists or restores user or session state.

## TECHNICAL INTERFACE
The root creates the composable with injected seed, request-identity, generation, and notation outcome seams. Consumers receive readonly pending-control, intent/result, presentation, operation, and error state plus explicit actions; no storage API is part of the interface.

## EXPECTATION
Consumers cannot mutate workspace state directly. Ordinary edits produce no generation request, while Generate and Regenerate issue one intent at a time through injected seams. A regenerate operation preserves controls and uses a renewed seed. Retry generation is available only while idle after a captured generation error, is blocked under an unsupported rhythm setting exactly like Generate and Regenerate, and issues a brand-new intent built from the current controls and profile with a fresh seed and request identity rather than replaying the failed attempt, so a control edit made after the failure and before retrying is reflected in the retried request. The captured generation error remains visible through any control, profile, theme, or notation edit made while idle, and clears only once the next Generate, Regenerate, or Retry-generation attempt begins. Reloading or a later browser session restores no controls, intent, result, presentation preference, operation state, or error.
