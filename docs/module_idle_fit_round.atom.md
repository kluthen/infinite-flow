---
id: module_idle_fit_round
status: REVIEW
type: MODULE
layer: ARCHITECTURE
parents:
  - [[rule_idle_phrase_too_dense_is_replaced]]
  - [[rule_retry_round_window_changes]]
  - [[rule_session_end_generates_next_phrase_one]]
  - [[rule_staff_needs_room_notice]]
  - [[rule_staff_notice_gives_way_to_new_phrase]]
  - [[rule_too_dense_notice_retry_rounds]]
  - [[rule_unsupported_rhythm_gives_way_to_no_phrase]]
  - [[rule_unsupported_rhythm_settings_block_generation]]
dependents:
  - [[module_idle_fresh_run]]
  - [[module_idle_room_notice]]
version: 0.5
priority: 1
human_name: Idle Fit Round
tags: [v2, release-v2.0, idle, notation, generation]
notes: Split on 2026-10-05 during documentation debt paydown (previous version 0.4): the fresh run and the room notice (layout failures at Idle, the rules under the notice and its exposed state) moved unchanged in meaning into child atoms; this atom keeps the fit run itself and indexes its children. Status stays DRAFT.
---

# Idle Fit Round

## INTENT
Run every Idle phrase generation as one fit run that checks each generated attempt against the staff's current room before anything is drawn and replaces a too-wide attempt with fresh-seed retries, so an Idle generation ends in a shown phrase, the "staff needs more room" notice, the unsupported-rhythm empty workspace, or a generation-failure banner, and never in a notation error for lack of room.

## THE RULE / LOGIC
Runs and attempts. Every Idle generation is one fit run: Generate, Regenerate, Retry generation, the regeneration an instrument-profile switch runs, the new phrase generated when the no-room notice clears, the replacement for a phrase on screen that a window change leaves too wide, a round started under the too-many-notes notice, and the fresh phrase a session end asks for once phrase 1 has sounded (the fresh run). A run is the first attempt plus up to three retries, at most four attempts, whatever started it. Each attempt draws one fresh seed and one fresh request identity from the injected providers and builds its intent with the note density the window's width gives at that moment. One run is one operation with one Loading: the generation status announces "Generating phrase" once when the run starts and "Phrase ready" once, only when the run ends with a phrase shown (never when it ends on the notice, a notation error or no phrase); while the last session's Review shows over the staff, neither is announced.

Fit before drawing. Each generated attempt is checked against the staff's current layout inputs (the container width and, below the tablet-landscape layout's width, the height budget) with the engraver's own planning path, the same planning code drawing uses, run as a pure check with no drawing. Only an attempt that fits is published to the staff; a too-wide attempt is never drawn. A phrase kept on screen during a run stays visible and untouched until the run publishes its replacement or ends. If the window changes between the check and the draw, a draw that fails because the notes are too wide counts as a too-wide attempt (the score is dropped and the run goes on), a draw that finds no room ends the run on the notice with its no-room cause, and any other draw failure keeps that attempt with the retryable notation error.

How a run ends. The first attempt that fits is shown, with its own seed, and any notice clears. When every attempt is too wide, the notice shows with its notes-too-wide cause. When an attempt's check finds no room for the staff (the window narrowed during the run), the run ends on the notice with its no-room cause, with no further attempt. A generation failure ends the run with the generation-failure banner, and is not a counted retry: over the notice if one shows, with the kept phrase if one stayed on screen, and with no phrase if the Loading showed none. A check that itself fails with a notation error (the engraver or its fonts did not load, or the staff has not yet reported its layout inputs) keeps that attempt as the result with the retryable notation error, and starts no retry, except that in the fresh run a session end asks for, a staff not laid out yet (no width, the notation-container-unavailable error) counts as no room and ends the run on the no-room notice.

A blocked rhythm-settings combination during a run. Before each attempt, and once the last attempt is too wide, the run checks the combination at the width now: when it blocks generation, the run ends with no phrase and the unsupported-rhythm alert, instead of another attempt or the notice. When a crossing of the tablet-landscape layout's width makes the combination one that blocks generation while an attempt is being generated or checked, the run stops at once only while retries are running (an attempt of the run was already too wide, or the run is a round under the too-many-notes notice) or no score is kept (a first generation from no phrase, or a run started with no score shown): the operation returns to idle, the in-flight worker response is discarded on arrival (the worker has no cancel), and the workspace shows no phrase with the unsupported-rhythm alert, the kept phrase, the notice and any generation-failure banner all gone. During the first attempt of a run that keeps a phrase on screen (Generate, Regenerate or an instrument-profile switch from a shown phrase), the attempt carries on and the kept phrase stays: if the attempt fits it is drawn, and the phrase shows with the unsupported-rhythm alert; if it is too wide, the check before the next attempt ends the run with no phrase. A phrase that passed its check and is being drawn is drawn. A window getting wider while a run is active starts nothing and queues nothing.

Out of scope. The notice's wording and look, and a session's own look-ahead fit and failure handling, are not this module's job.

Parts. The fresh run a session end asks for, and the "staff needs more room" notice with the layout failures at Idle that lead to it, each have their own child atom: [[module_idle_fresh_run]] and [[module_idle_room_notice]].

## TECHNICAL INTERFACE
Planned homes. The run loop lives in a sibling module of src/composables/use-generation-session.ts (src/composables/generation-session-fit-round.ts), driven through the workspace session's existing Generate, Regenerate, Retry generation, profile-switch and injected seed, request-identity, window-width and generation seams, with a run token that discards a stopped run's late worker response. The fit check and the phrase-independent room check, and the forwarding of the staff's layout inputs (container width, viewport and height budget) from PhraseScore.vue, go through src/composables/use-notation-coordinator.ts. The pure checks are exported by src/notation (notation-layout-policy.ts and vexflow-engraver.ts), from the same planning code the drawing uses, and return fits, no room, or notes too wide. A run starts in one of three ways (FitRunStart: 'keep_screen', 'no_score' or 'fresh').

## EXPECTATION
Every Idle generation, whatever started it, makes at most four attempts, each with its own fresh seed and request identity from the injected providers and the note density the width gives at that attempt, within one operation that announces "Generating phrase" once and "Phrase ready" at most once, only when the run ends with a phrase shown, and neither while the last session's Review shows. No too-wide attempt is ever drawn, and a kept phrase stays untouched through the Loading. The first attempt that fits is shown with its own seed; four too-wide attempts end on the notes-too-wide notice; an attempt checked with no room ends on the no-room notice; a generation failure ends with the banner and consumes no retry; a fit check that fails with a notation error keeps the attempt with the retryable notation error, outside a fresh run's staff not laid out. A width crossing that blocks the rhythm-settings combination stops the run at once, draws nothing from it and leaves no phrase with the unsupported-rhythm alert while retries are running or no score is kept; during the first attempt of a run from a shown phrase the attempt is drawn if it fits (the phrase shows with the alert) and otherwise the run ends with no phrase; a run whose last attempt is too wide under a blocked combination ends with no phrase, never the notice. A widening of the window during a run starts or queues nothing.
