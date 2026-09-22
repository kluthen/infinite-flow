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
  - [[rule_instrument_profile_range]]
  - [[rule_presentation_preference_preserves_phrase]]
  - [[user_story_controlled_phrase_generation]]
dependents:
  - [[module_named_stream_pseudorandomness]]
---

# Generation Request Construction

## INTENT
Construct a generation intent from player-selected musical controls only when the player explicitly requests generation.

## THE RULE / LOGIC
The control boundary normalizes the selected musical controls, selected instrument profile, and a generation seed into GenerationIntent when the player invokes Generate or Regenerate. It renews the seed for regeneration while retaining the selected controls. Theme choice, notation display choice, browser capability state, and other presentation or browser state are excluded from GenerationIntent and cannot themselves create a generation request.

## TECHNICAL INTERFACE
The boundary accepts selected musical controls, a selected instrument profile, and an explicit Generate or Regenerate action. It emits GenerationIntent for orchestration and exposes presentation and browser state separately.

## EXPECTATION
Each explicit generation action produces an intent containing the selected generation controls and profile. Presentation or browser-state changes neither alter an existing generation intent nor issue a new one.
