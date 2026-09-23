---
id: module_generation_request_construction
status: DRAFT
human_name: Generation Request Construction
type: MODULE
layer: ARCHITECTURE
version: 0.1
priority: 1
tags: controls,generation-request,action-boundary
parents:
  - [[module_generation_control_catalog]]
  - [[rule_instrument_profile_range]]
  - [[rule_presentation_preference_preserves_phrase]]
  - [[user_story_controlled_phrase_generation]]
dependents:
  - [[module_named_stream_pseudorandomness]]
  - [[service_workspace_session_flow]]
---

# Generation Request Construction

## INTENT
Construct one outer generation intent from normalized generation controls only when the player explicitly requests generation.

## THE RULE / LOGIC
The GenerationIntent factory constructs an outer request boundary from normalized generation-only controls, the selected instrument-profile policy, player register intent including unresolved Varying, an injected seed, and an injected request identity. Theme, notation display choice, browser capability state, mutable workspace session state, audio state, UI state, and prior results are structurally excluded. Generate and Regenerate are the only actions that invoke the factory; Regenerate retains the current controls while using a renewed injected seed and request identity. The existing resolved GenerationRequest remains unchanged. Step 7 orchestration, not this factory, owns Varying feasibility and planner-facing resolution.

## TECHNICAL INTERFACE
Generate and Regenerate supply normalized catalog controls, the selected instrument-profile policy, an injected seed, and an injected request identity to produce GenerationIntent. Consumers receive GenerationIntent separately from presentation state; core planners continue to accept only the existing resolved GenerationRequest.

## EXPECTATION
Changing presentation, browser, session, audio, or UI state cannot alter or construct GenerationIntent. Every emitted intent has normalized generation controls, one selected profile policy, one register intent, one seed, and one request identity. An unresolved Varying selection never reaches the existing resolved GenerationRequest through this factory.
