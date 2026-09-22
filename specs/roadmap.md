# Infinite Flow Roadmap

Status: draft v0.1

## Purpose

This roadmap orders established work without adding a delivery date, implementation commitment, or new product behavior. First Release is the current delivery target. MIDI is removed from that target and becomes the immediate next roadmap item.

## Ordered Delivery Stages

### 1. First Release (Current Delivery Target)

**Intent:** Deliver the browser-based, client-side four-measure phrase generator and readable notation workspace as a complete, non-evaluative product loop.

**Scope:**

- Generate one coherent four-measure 4/4 phrase from the settled musical controls, selected instrument profile, and deterministic seed.
- Render conventional staff notation with harmonic context from the immutable concert-pitch event timeline, with independent Concert, B-flat, and E-flat display conventions.
- Support the settled C MIDI keyboard, B-flat tenor saxophone, and E-flat alto saxophone profiles; their range and phrase-wide register-window rules; neutral and jazz presets; explicit whole-phrase regeneration; landscape mobile/tablet and sufficiently wide desktop layouts; and system/manual theme preference.
- Keep generated lead playback, required backing, microphone capture, continuation, persistence, scoring, and MIDI integration out of this delivery target.

**Dependencies:**

- The settled first-release generator contract, profile range and register policy, notation-display boundary, musical-profile rules, and validated phrase-workspace design.
- Required behavior remains browser-local and has no server dependency.

### 2. Minimal MIDI Integration (Immediate Next Item)

**Intent:** Add the smallest non-evaluative MIDI integration after First Release proves the core generation and notation loop.

**Scope:**

- Validate MIDI controller connection.
- Provide quiet visual match or mismatch feedback against a proposed staff note; a matching note may highlight the proposal.
- Do not display the played or unmatched incoming pitch.
- Do not evaluate timing, create a score, change generation, advance the phrase, or introduce MIDI-seeded continuation.

**Dependencies:**

- A completed First Release with a visible proposed staff note and the established immutable concert-pitch phrase model.
- The existing MIDI privacy and non-scoring boundary.
- A dedicated MIDI-feedback flow and states, which the current UI/UX set explicitly defers.

### 3. MIDI-Seeded Continuation

**Intent:** Move from connection feedback to player-material-informed phrase continuation while retaining the same generator seams.

**Scope:**

- Accept one or two MIDI measures, retain the player-selected tonal context, transform phrase character, and periodically append generated measures to a rolling staff.
- Use the supplied material initially for rhythm, contour, and interval character rather than automatic key detection.
- Continue to defer acoustic microphone pitch capture and automatic key detection.

**Dependencies:**

- Minimal MIDI integration and the stable generation request/result boundary.
- The phrase transformer and rolling notation behavior described as later generator seams.
- A settled approach to any planner repair authority before coupling planner stages.

### 4. Later Enhancements (Unscheduled)

**Intent:** Keep established later candidates visible without treating them as committed delivery scope.

**Scope:**

- Optional BPM-aligned backing that reads generated harmony and BPM without changing lead generation.
- Generated lead playback, session capture/export, additional instrument or range profiles, phrase-end controls, long-term personalization, and descriptive non-scoring practice feedback.

**Dependencies:**

- Separate decisions for each enhancement; none is required by First Release, minimal MIDI integration, or MIDI-seeded continuation.

## Explicitly Unresolved Decisions

- **Backing role:** If backing is added, its limited form remains undecided.
- **Planner authority:** It remains undecided whether a later planner may revise an earlier planner's decision to repair voice leading or playability, and how that would preserve decoupled boundaries.
- **Later MIDI continuation details:** The established direction defines one or two captured measures, rolling continuation, and player-selected tonal context, but does not settle the complete continuation interaction or event schema.
- **Later enhancement sequencing:** No order or commitment is established among playback, session export, additional profiles/range variants, phrase-end controls, personalization, or descriptive practice feedback.
