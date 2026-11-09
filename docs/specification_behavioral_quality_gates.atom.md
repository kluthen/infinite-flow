---
id: specification_behavioral_quality_gates
status: REVIEW
dependents: []
human_name: Behavioral Quality Gates
version: 0.3
type: SPECIFICATION
layer: ARCHITECTURE
priority: 1
tags: verification,behavioral-quality,release-gate,v2,release-v2.0,revised-for-v2
parents:
  - [[req_four_measure_phrase]]
  - [[req_rolling_practice_session]]
  - [[user_story_controlled_phrase_generation]]
---

# Behavioral Quality Gates

## INTENT
Verify release readiness through observable player behavior rather than generic tooling success.

## THE RULE / LOGIC
The behavioral quality-gate boundary checks a release against its definition of done, one criterion at a time, through the player behavior each criterion describes, failure states included. For v2.0 that is the whole practice workflow: the v1 workflow still holding (control selection, explicit generation and regeneration, a complete four-measure result, visible handling of a generation or notation failure, presentation changes kept apart from phrase generation); rolling phrases generated and engraved before their deadlines, with a session that keeps running through a generation failure; joins between phrases, settings locked during a session, the backing, click and count-in; MIDI acknowledgement, the controller check, and a controller lost or away; the review, export and privacy; the settings-mutation flag, played notes in the review and their export, adaptive tempo and the multi-phrase tension arc; and the checks that need the reference hardware, the reference machine or a real program other than the browser. Each later version's definition of done adds the behavior that version brings, every earlier criterion still holding unless the definition of done changes it; for v3.2, session mode's rhythm lock with its allowed rhythm changes and Vary settings' allowed groups, Jam mode with its doodle, its kept doodle and its key and mode suggestion, kept Jam sessions and their exports, and the guide playback.

Each criterion is backed either by automated tests that the project's quality command runs and that pass, or by a hand check or measurement on the reference machine or hardware, written down with its date and result. Generic command or configuration success alone is not acceptance evidence. The release is tagged only when every criterion holds as written. The only exceptions are the hand and listening checks the definition of done explicitly allows to follow the tag, or the product owner's ruling at the release gate does: for v2.0, exports opened in real programs and the checks that need a USB keyboard; for v3.0, the checks its definition of done names; for v3.1 and v3.2, every hand and listening check still owed at the release gate. A criterion whose check follows the tag has its automated tests as its evidence at the tag; the check is listed as owed after the tag and recorded on a later patch update, and a finding becomes a patch fix.

## TECHNICAL INTERFACE
Release verification receives the supported browser workflow, the observable workspace and session states, the results of the automated tests run by the quality command, and the dated hand-check records from the reference machine and hardware. It produces one evidence entry per definition-of-done criterion, naming the tests or the hand check behind it and whether the criterion holds.

## EXPECTATION
- A release gate shows, for every criterion of the release's definition of done, the tests or the dated hand check that demonstrate the player behavior, failure states included, and whether the criterion holds.
- Passing a generic build, static analysis or configuration check without that behavior evidence does not satisfy this boundary.
- The release is not tagged while any criterion does not hold as written, apart from the hand and listening checks the definition of done or the product owner's ruling allows to follow the tag, which are listed as owed after the tag, the criterion's automated tests being its evidence at the tag.
