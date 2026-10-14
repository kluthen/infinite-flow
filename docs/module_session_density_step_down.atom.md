---
id: module_session_density_step_down
status: REVIEW
layer: ARCHITECTURE
version: 0.1
priority: 1
tags: session,look-ahead,density
type: MODULE
human_name: Session Density Step-Down
parents:
  - [[rule_generated_density_follows_window_width]]
  - [[rule_session_density_only_steps_down]]
  - [[service_session_engine]]
dependents: []
---

# Session Density Step-Down

## INTENT
Resolve the note density of every session request from the settings in effect, the window's width and the session's memory of a step-down, so a session that has stepped down never steps back up.

## THE RULE / LOGIC
Each request's note density is resolved when the request is built, from the density in the settings in effect, the window-width reading at that moment and the session's step-down memory. The memory is set as soon as any attempt's request is built with Eighth for a chosen Sixteenth, whether or not that attempt succeeds, and holds until the session ends. Phrase 1 never sets it; phrase 2's request is built at start from the window then.

## TECHNICAL INTERFACE
The window-width reading is the engine's injected `viewport`, exposing only `isBelowTabletLandscape()`; requests are built through the engine's `IntentSeams` (its providers and viewport) in `src/session/session-intents.ts`.

## EXPECTATION
Once any request is built with Eighth for a chosen Sixteenth, every later request of the session uses Eighth.
