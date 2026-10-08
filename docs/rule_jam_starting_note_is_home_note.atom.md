---
id: rule_jam_starting_note_is_home_note
status: DRAFT
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls within the vision since version 0.8 (2026-10-08, spec D246). Revised the same day (version 0.1 to 0.2) after the spec settled that the home note does not start the silence timer (rule_jam_silence_timer_from_phrase_one).
parents:
  - [[req_jam]]
dependents: []
type: RULE
layer: BUSINESS
version: 0.2
priority: 1
human_name: A Jam's Starting Note Is the Home Note
tags: [v3, release-v3.2, session, jam, midi, session-start]
---

# A Jam's Starting Note Is the Home Note

## INTENT
Let the player start a Jam without leaving the instrument, when there is no phrase on screen to take a first note from.

## THE RULE / LOGIC
In Jam mode without a held doodle, a Jam starts on a Start click or on its starting note: the home note of the selected key (the note the music feels settled on), in written pitch, in the octave nearest the middle of the instrument's written range, the lower one if two are equally near, matched at its exact concert pitch as the starting note always is. The line that names the starting note names it. The starting note only starts the count-in and belongs to no doodle; unlike the starting note outside Jam mode, it does not start the session's silence timer. With a held doodle, the starting note is phrase 1's first note, as outside Jam mode. Playing the home note at Idle starts a Jam; this is the accepted risk of any starting note, and the line naming it makes it visible.

## TECHNICAL INTERFACE
In Jam mode the starting-note line names the home note in the computed octave.

## EXPECTATION
- In Jam mode without a held doodle, only the home note in that octave, at its exact concert pitch, starts a session from MIDI.
- The starting note belongs to no doodle.
- The home note that starts a Jam does not start the silence timer.
