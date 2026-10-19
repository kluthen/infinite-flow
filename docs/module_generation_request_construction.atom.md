---
id: module_generation_request_construction
status: REVIEW
human_name: Generation Request Construction
type: MODULE
layer: ARCHITECTURE
version: 0.5
priority: 1
tags: controls,generation-request,action-boundary
parents:
  - [[module_figure_levels]]
  - [[module_generation_control_catalog]]
  - [[rule_figure_draws_reproducible]]
  - [[rule_instrument_profile_range]]
  - [[rule_presentation_preference_preserves_phrase]]
  - [[user_story_controlled_phrase_generation]]
dependents:
  - [[module_named_stream_pseudorandomness]]
  - [[service_idle_generation_session]]
  - [[service_workspace_session_flow]]
---

# Generation Request Construction

## INTENT

Construct one outer generation intent from normalized generation controls only when the player explicitly requests generation.

## THE RULE / LOGIC
The GenerationIntent factory constructs an outer request boundary from normalized generation-only controls, the seven figure levels or the musical profile selection that still stands for them, the selected instrument-profile policy, player register intent including unresolved Varying, an injected seed, and an injected request identity. The intent carries the figure levels as figureLevels, from which the generator reads what it may write, and no musical profile's or preset's name: while the player's choice is still a musical profile selection, the factory's input holds that selection and the factory fills the levels from it with levelsForProfile (module_figure_levels), whatever its customized mark; the selection itself never reaches the intent. Theme, browser capability state, mutable workspace session state, audio state, UI state, and prior results are structurally excluded, except the carry-in the session phrase before hands forward, which the factory checks against the intent. The note density in the controls the factory receives is the density the phrase is generated with, which can differ from the chosen one: the caller resolves the chosen density when the request is made, from whether the window is below the tablet-landscape layout's width and, during a session, whether that session has stepped its density down, and passes the plain result. The window's width reaches the intent only through that resolved density, never as browser state, and the chosen density itself is left unchanged. Generate, Regenerate, Retry generation, and the regeneration an instrument-profile switch runs while a phrase is shown are the only actions that invoke the factory; each retains the current controls and figure levels while using a renewed injected seed and request identity, including Retry generation after a failure, which builds this same fresh intent from the current controls rather than replaying the failed one unchanged. The resolved GenerationRequest is unchanged apart from carrying that carry-in unchanged. Step 7 orchestration, not this factory, owns Varying feasibility and planner-facing resolution.

## TECHNICAL INTERFACE
Generate, Regenerate, Retry generation, and the regeneration an instrument-profile switch runs supply normalized catalog controls, with the note density resolved for the window's width at that moment, the musical profile selection while it stands for the figure levels, the selected instrument-profile policy, an injected seed, and an injected request identity to makeGenerationIntent (src/domain/generation/generation-intent.ts), whose input (GenerationIntentInput) holds that selection and which maps it to the levels through levelsForProfile; the GenerationIntent it produces holds the levels in its figureLevels field and no musical profile. Consumers receive GenerationIntent separately from presentation state; core planners continue to accept only the existing resolved GenerationRequest.

## EXPECTATION
Changing presentation, browser, session, audio, or UI state cannot alter or construct GenerationIntent, except that the note density a newly built intent carries is the one the window's width (and, during a session, the session's step-down) gives at the moment it is built; a crossing of that width never builds an intent or alters one already built. Every emitted intent has normalized generation controls, exactly the seven figure levels, one selected profile policy, one register intent, one seed, and one request identity, and holds no musical profile's or preset's name. An intent built from Neutral carries Neutral's levels and one built from Jazz carries Jazz's, customized or not. An unresolved Varying selection never reaches the existing resolved GenerationRequest through this factory.
