---
id: module_idle_fresh_run
status: DRAFT
type: MODULE
layer: ARCHITECTURE
version: 0.1
priority: 1
tags: [v2, release-v2.0, idle, notation, generation]
parents:
  - [[module_idle_fit_round]]
  - [[rule_session_end_generates_next_phrase_one]]
  - [[rule_staff_needs_room_notice]]
  - [[rule_unsupported_rhythm_gives_way_to_no_phrase]]
dependents: []
human_name: Idle Fresh Run
notes: Split out on 2026-10-05 from module_idle_fit_round (version 0.4) during documentation debt paydown; the text is moved unchanged in meaning and keeps its DRAFT status.
---

# Idle Fresh Run

## INTENT
Generate the fresh Idle phrase a practice session end asks for once phrase 1 has sounded, from the current controls, without ever showing a phrase of the ended session again.

## THE RULE / LOGIC
A session end once phrase 1 has sounded asks for a fresh run. As it starts, the phrase on screen leaves at once, with no score shown meanwhile, and a too-many-notes notice is dropped; a no-room notice already showing stays, and is not announced again. Before any attempt, the run checks the rhythm-settings combination at the width now (when it blocks generation, the run ends with no phrase and nothing generated), then runs the phrase-independent room check with the key signature the next phrase would have: with no room it ends on the notice with its no-room cause, nothing generated, and the phrase comes once the notice clears: under the no-room notice, a change of the staff's layout inputs or of a setting the phrase is generated from other than an instrument-profile switch runs the phrase-independent room check, and once there is room the notice clears and a run starts with no score shown. With room, its attempts run as in any other run, from the current controls with fresh seeds and no carry-in. Only in a fresh run, a staff that is not laid out yet (it has no width, as behind the rotate-device notice: the notation-container-unavailable error) counts as no room at every step, the room check, an attempt's fit check and its draw, and ends the run on the no-room notice; in every other run that error stays the retryable notation error. A fresh run supersedes a run still generating, whose late answer then changes nothing; asking for one while a phrase is being drawn is a caller defect, refused at once. Apart from this, a fresh run is an Idle fit run like any other: at most four attempts, each checked against the staff's room before anything is drawn.

## TECHNICAL INTERFACE
A run starts in one of three ways (FitRunStart: 'keep_screen', 'no_score' or 'fresh'); the fresh run's room check reaches the runner as its checkRoom dependency, and the workspace session exposes the fresh run as its startFreshPhrase() action, which resolves true when the run leaves a phrase as the result and throws a SessionUsageError while a phrase is being drawn.

## EXPECTATION
A fresh run drops the phrase on screen at once and a too-many-notes notice with it; under a blocked combination it generates nothing and leaves no phrase; with no room it generates nothing and ends on the no-room notice (one already showing stays, not announced again), the new phrase coming once the notice clears; otherwise it runs its attempts like any run. A staff not laid out counts as no room only in a fresh run, at the room check, the fit check and the draw alike; anywhere else it stays the retryable notation error.
