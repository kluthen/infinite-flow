---
id: rule_my_instrument_range_limits
status: REVIEW
type: RULE
version: 0.1
parents:
  - [[req_my_instrument]]
dependents:
  - [[entity_my_instrument]]
layer: BUSINESS
priority: 1
human_name: My Instrument Obeys the Profile Range Rules
tags: [v3, release-v3.0, instrument-profile, range]
notes: Pending, 2026-10-12 (spec D293, master spec Part A v1.9, section 14): a bound on my instrument's written range per clef (written C2 to C7 in treble clef, E0 to E5 in bass clef, a range refused live with its reason, and a change of clef checking the range again) was proposed, then approved by the owner on 2026-10-12 (relayed by the coordinator) but not yet recorded by spec-writer. Not added until spec-writer records it: this rule states only the recorded two-octave minimum. Text, version and status unchanged. Earlier: Status DRAFT to REVIEW on 2026-10-12 with the owner's agreement (v3.0 wave-1 sign-off), same version: chunk 16's code (src/domain/profile/my-instrument.ts, merge d49e559) matches the logic and expectation, with its linked tests. Earlier: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls within the vision since version 0.8 (2026-10-08, spec D246).
---

# My Instrument Obeys the Profile Range Rules

## INTENT
Hold a player-made instrument to the same rules as the built-in profiles, so it cannot break phrase generation.

## THE RULE / LOGIC
From v3.0, My instrument obeys the rules every instrument profile already obeys. Its range endpoints are whole-number pitches, and it spans at least two octaves (24 semitones); a range under two octaves is refused, with the reason. Its Low, Middle and High register windows are derived from its range by the same method as the built-in profiles', never set by hand. Every generated pitch stays inside its range and the register window chosen for the phrase, exactly as for a built-in profile, and its transposition only converts between written and concert pitch.

## TECHNICAL INTERFACE
Saving My instrument validates its range and derives its three register windows from it.

## EXPECTATION
- A range under two octaves is refused, with the reason.
- My instrument's register windows are derived from its range, never entered.
- Every phrase generated for My instrument stays inside its range and the phrase's register window.
