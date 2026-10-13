---
id: rule_midi_starting_note
status: STABLE
dependents:
  - [[module_session_starting_note]]
  - [[rule_starting_note_named]]
  - [[rule_starting_note_only_starts_count_in]]
  - [[service_workspace_session_flow]]
type: RULE
priority: 1
tags: [v2, release-v2.0, session, session-start, midi]
parents:
  - [[req_midi_controller_input]]
  - [[rule_session_start_conditions]]
layer: BUSINESS
version: 0.5
human_name: Only One Note Starts a Session From MIDI
notes: Revised 2026-10-13 to version 0.5 (previous version 0.4) with the explicit confirmation of the product owner, given on 2026-10-13 and relayed to documentalist (spec D297 and its ruling note; master spec Part A v1.12, sections 10 and 16; change set docs/release/v3.0-intent-change-set.md, part J1), of the accepted wording, ruled a MAJOR change, together with the CONTRACT 5.0 MAJOR bump; stays STABLE. The technical interface gains the owner's sentence word for word: with the phrase on screen out of date, the starting note first asks, as the Start button does, whether to make a new phrase or use this one, and the count-in starts only if the player uses it; while it is asking, no note starts anything. The rule mirrors it and the expectation gains one line, adding no meaning. The guarantee loses a case, hence MAJOR. Pending implementation: v3.0 build plan chunk 24b. Until it lands the running code does not hold the new clause: on a stale phrase 1 the starting note starts the count-in without asking, or the start fails at most tempos (ISS-011). Earlier: Revised 2026-10-08 to version 0.4 (previous version 0.3) with the explicit confirmation of the product owner, given on 2026-10-08 (spec D246), of contract change set part A (docs/release/v3.1-v3.2-intent-change-set.md, A6), together with the CONTRACT 3.0 MAJOR bump; stays STABLE. In Jam mode with no phrase on screen, the home note of the selected key, in written pitch in the octave nearest the middle of the instrument's written range, starts the session instead of phrase 1's first note. Earlier: Status REVIEW to STABLE on 2026-10-07 with the product owner's approval, together with the matching CONTRACT 1.5 MINOR bump. Backed by the v2.0 gate tests linked to it, among them tests/e2e/session/session-midi-start.spec.ts (only phrase 1 first note at its exact pitch, octave included, starts the count-in; the count-in it starts is checked in eab0519), tests/e2e/controller/controller-connection-close.spec.ts (notes during the connection step and the transposition check start nothing) and tests/unit/components/workspace/workspace-session-controller-review.spec.ts (nothing starts while the Review shows).
---

# Only One Note Starts a Session From MIDI

## INTENT
Let the player start a session from Idle without leaving their instrument, by playing one known note: the note the phrase begins with or, in a Jam with no phrase yet, the home note.

## THE RULE / LOGIC
Only one MIDI note can start a session at a time. When a phrase is on screen at Idle, it is the note phrase 1 starts on, that is, the first attacked note of that phrase. In Jam mode, when no phrase is on screen because the Jam's phrase 1 will be written from a doodle not yet played, it is the home note of the selected key (the note the music feels settled on), in written pitch, in the octave nearest the middle of the instrument's written range, the lower one when two are equally near. Either way it must be that exact note, octave included: its position on the staff fixes its octave, so C4 and C5 (12 half steps apart) are different notes here. The match uses the same rule as expected-note acknowledgement: the exact concert pitch of that written note under the instrument profile's transposition. Any other note played at Idle starts nothing, and while the last session's review shows, no note starts anything, that one included. Nothing played while the player is connecting a controller or running its transposition check can start a session, not even that same note, and no note starts one while a session cannot start at all. When the phrase on screen is out of date (made under settings that differ from the current ones), the starting note first asks, as the Start button does, whether to make a new phrase or use this one, and the count-in starts only if the player uses it; while it is asking, no note starts anything. A note that starts nothing changes nothing on screen: there is no mismatch hint.

## TECHNICAL INTERFACE
With a controller attached at Idle, outside the review, playing the starting note at its exact concert pitch starts the count-in: phrase 1's first note or, in Jam mode with no phrase on screen, the home note in the octave stated above. When the phrase on screen is out of date (made under settings that differ from the current ones), the starting note first asks, as the Start button does, whether to make a new phrase or use this one, and the count-in starts only if the player uses it; while it is asking, no note starts anything.

## EXPECTATION
- From MIDI, only the starting note at its exact concert pitch, octave included, starts a session (phrase 1's first note when a phrase is on screen, the home note in Jam mode when none is), and only at Idle while a session can start and outside the connection step.
- Every other note, any note played while the review shows, and any note played during the connection step or the transposition check, starts nothing and changes nothing on screen.
- When the phrase on screen is out of date, the starting note first asks, as the Start button does, whether to make a new phrase or use this one, and starts nothing by itself; the count-in starts only if the player uses the phrase, and while the question shows, no note starts anything.
