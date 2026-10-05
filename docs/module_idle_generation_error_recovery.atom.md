---
id: module_idle_generation_error_recovery
status: DRAFT
layer: ARCHITECTURE
version: 0.1
priority: 1
notes: Split out on 2026-10-05 from service_workspace_session_flow (version 1.6) during documentation debt paydown; the text is moved unchanged in meaning and keeps its DRAFT status.
dependents: []
type: MODULE
human_name: Idle Generation Error Recovery
tags: workspace,idle,generation,errors
parents:
  - [[rule_unsupported_rhythm_settings_block_generation]]
  - [[service_workspace_session_flow]]
  - [[user_story_controlled_phrase_generation]]
---

# Idle Generation Error Recovery

## INTENT
Let the player retry a failed Idle generation from the current controls, and keep a captured generation error visible until a new generation starts or the workspace gives way to no phrase.

## THE RULE / LOGIC
Retry-generation is available only while idle with a captured generation error present; it does not require a retained failed intent. It builds a brand-new intent from the current controls and profile with a fresh injected seed and request identity -- the same construction Generate and Regenerate use -- rather than replaying the failed intent unchanged, so an edit made after the failure and before retrying is picked up; it applies the same unsupported-rhythm-settings block as Generate and Regenerate.

A captured generation error, and a notation error, are cleared when the next fit run starts, whatever started it. The generation error is also cleared, along with the phrase and the room notice, whenever the workspace gives way to no phrase because the rhythm-settings combination blocks generation: an instrument-profile switch that would regenerate or start a round under a blocked combination, a width crossing that stops a run, and a room-notice change or a phrase left too wide that would need a replacement under a blocked combination. It is unaffected by ordinary control, musical-profile, theme, or notation edits made while idle outside the notice, by an instrument-profile switch made while no phrase and no notice show or under the no-room notice, both of which only change the selection, and by a no-room layout failure of the phrase on screen, which shows the notice with the banner in place.

## TECHNICAL INTERFACE
The Idle composable exposes the retry-generation and retry-notation actions among its explicit actions, and its readonly error state; its intent is built through the same injected seed and request-identity seams Generate and Regenerate use.

## EXPECTATION
Retry generation is available only while idle after a captured generation error, is blocked under an unsupported rhythm setting exactly like Generate and Regenerate, and issues a brand-new intent built from the current controls and profile with a fresh seed and request identity rather than replaying the failed attempt, so a control edit made after the failure and before retrying is reflected in the retried request. The captured generation error remains visible through any control, musical-profile, theme, or notation edit made while idle outside the notice, through an instrument-profile switch made while no phrase and no notice show or under the no-room notice, and through a no-room layout failure of the phrase on screen; it clears once the next fit run begins, whatever started it, or when the workspace gives way to no phrase under a blocked rhythm combination.
