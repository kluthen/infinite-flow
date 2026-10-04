---
id: module_tension_arc_cycle
status: DRAFT
version: 0.1
priority: 1
tags: [v2, release-v2.2, session, tension]
type: MODULE
layer: ARCHITECTURE
human_name: Tension Arc Cycle
parents:
  - [[module_generation_control_catalog]]
  - [[req_multi_phrase_tension_arc]]
  - [[rule_multi_phrase_tension_arc_cycle]]
notes: Captured 2026-10-04 before code in v2 chunk 29 (pre-code architecture capture) from the coding leader plan. Completed 2026-10-04 in the v2 chunk 29 post-task sync: the interface names filled in as built. Related architecture - service_session_engine (applies it in the look-ahead basis and carry-in adaptation), module_settings_mutation (the cycle steps around a mutated tension arc), module_phrase_replay_key (unchanged format). Pending owner sign-off - running the carry-in adaptation across an arc step between two phrases needs the wording of rule_harmony_change_drops_unfit_harmonic_carry_in, rule_setting_change_rechecks_pitch_carry_in (both worded for a setting change) and rule_join_carry_in_limited (nothing else crosses the join) extended. Status stays DRAFT.
dependents:
  - [[service_session_engine]]
---

# Tension Arc Cycle

## INTENT
Derive, from a session phrase's number alone, the tension arc that phrase is generated with under the multi-phrase tension arc, applying it only to what each phrase is generated from and never to the settings in effect.

## THE RULE / LOGIC
A pure, deterministic module with no seed stream, clock, browser, Vue or session-state access, which gives the settings a session phrase is generated under.

Cycle step. From the session phrase number n alone, the phrase's position in its group of four is (n - 1) mod 4, and the step at positions 0 to 3 is, in order, none (the tension arc as chosen), one step tenser, none, and one step calmer. A step moves along the order of the tension-arc vocabulary, Settled, Lift, Build, Edge, from calmest to tensest, and is clamped at both ends: a step tenser from Edge stays Edge and a step calmer from Settled stays Settled. Phrase 1, generated at Idle, is at position 0 and so is generated with the tension arc as chosen.

Generated-under settings. From the flag, the settings in effect and a phrase number, the module returns the settings that phrase is generated under: the settings in effect themselves, the same object, when the flag is off or the clamped step leaves the tension arc unchanged; otherwise a frozen copy in which only the tension-arc control is replaced by the stepped value.

Engine use. The session engine keeps the settings in effect, which a mutation draws from and settings changed reports, free of the step: the arc never changes them and never outputs a settings change, so the tension-arc control keeps showing the player's choice. Only the look-ahead basis, from which every attempt's generation intent is built, carries the stepped tension. The step is applied after a mutation landing on that phrase, so the cycle steps around the value then in effect, and again, by that phrase's own number, when a settings change requests a pending phrase again. A repeat keeps the earlier phrase exactly as it was generated, while the cycle position still counts by session phrase number; a standalone retry and a phrase requested again use the step of their own phrase number.

Carry-in across a step. The settings the previous phrase was generated under, its stepped tension included, are the before side of the carry-in adaptation, so a step between two consecutive phrases goes through the same adaptation as a tension change: the carried harmony is dropped when it no longer fits the stepped tension, and the pitch part is re-checked with the same predicates the generation intent's own carry-in check uses, so every join is valid by construction.

Flag. Whether the arc runs is a boolean of the session start, checked when the engine starts (anything but a boolean throws at once) and kept unchanged for the whole session. Until the player-facing toggle exists, every session the workspace starts runs with it off.

Replay. The stepped value is the generation intent's own tension-arc control, so a session phrase's replay key holds it with no change to the key format, and the key replays the phrase as it was generated.

## TECHNICAL INTERFACE
`src/session/tension-arc-cycle.ts` exports `TensionArcCycleStep` (`-1 | 0 | 1`), `tensionArcCycleStep(phraseNumber)` giving a session phrase number's cycle step, `steppedTensionArc(tension, phraseNumber)` giving the clamped stepped tension arc, `settingsGeneratedUnder(multiPhraseTensionArc, phraseNumber, settingsInEffect)` giving the settings that phrase is generated under, and `requireTensionArcFlag(multiPhraseTensionArc)` checking the start's flag; a phrase number that is not an integer from 1, a tension arc outside the vocabulary or a non-boolean flag throws `SessionEngineError`. It reads the order Settled, Lift, Build, Edge from `TENSION_ARCS` in `src/domain/controls/generation-controls.ts`. `SessionStart` (`src/session/session-types.ts`) gains `multiPhraseTensionArc: boolean`, checked by `createSessionEngine` at start through `requireTensionArcFlag` and kept in `EngineContext.multiPhraseTensionArc` (`src/session/session-engine-state.ts`). The session engine applies `settingsGeneratedUnder` when it builds a look-ahead basis, after any mutation landing on that phrase, and when a settings change requests a pending phrase again; the result is the basis's settings, which become the engine state's `lastDecidedSettings` once the phrase is decided, and so the before side `adaptCarryIn` (`src/session/carry-in-adaptation.ts`) gets for the next phrase. The workspace's `startWorkspaceSessionRunner` (`src/components/workspace/workspace-session-runner.ts`) passes `false` until the toggle is built. The `ifk1.` replay key format is unchanged.

## EXPECTATION
- With the flag on, session phrases 1 to 8 are generated with the tension arc in effect, one step tenser, the tension arc in effect, one step calmer, and again, never past Settled or Edge.
- With the flag off, every phrase is generated under the settings in effect themselves, the same object, so the session is generated exactly as without the arc.
- The settings in effect, and every settings changed output, never carry a stepped tension, and the arc never outputs a settings change.
- After a mutation of the tension arc lands on a phrase, that phrase and later ones step around the mutated value.
- A phrase requested again after a settings change, a standalone retry and the phrase after a repeat use the step of their own phrase number; a repeat is the earlier phrase unchanged.
- Across a step, a carried harmony that no longer fits the stepped tension is dropped and the pitch part is re-checked, so every carried-in phrase passes the generation intent's own carry-in check.
- A session start whose flag is not a boolean throws when the engine starts.
- A session phrase's replay key holds the stepped tension under the unchanged `ifk1.` format and replays that phrase as generated.
- The same seeds and event list give the same session.
