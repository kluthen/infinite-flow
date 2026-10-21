---
id: rule_jam_starting_note_is_home_note
status: DRAFT
parents:
  - [[req_jam]]
dependents: []
type: RULE
layer: BUSINESS
version: 0.3
priority: 1
human_name: A Jam's Starting Note Is the Home Note
tags: [v3, release-v3.2, session, jam, midi, session-start]
---

# A Jam's Starting Note Is the Home Note

## INTENT
Let the player start a Jam without leaving the instrument, when there is no phrase on screen to take a first note from.

## THE RULE / LOGIC
At Jam mode's Idle without a kept doodle, a Jam starts on a Start click or on its starting note: the home note of Jam's key (the note the music feels settled on), in written pitch, in the octave nearest the middle of the instrument's written range, the lower one if two are equally near, matched at its exact concert pitch as the starting note always is. The line that names the starting note names it. The starting note only starts the count-in and belongs to no doodle; unlike the starting note in session mode, it does not start the session's silence timer. With a kept doodle, the starting note is phrase 1's first note, as in session mode. While tap-in listens, every controller note is a tap, the starting note included, and no note starts a Jam; a Start click still does. Playing the home note at Jam mode's Idle starts a Jam; this is the accepted risk of any starting note, and the line naming it makes it visible.

## TECHNICAL INTERFACE
At Jam mode's Idle without a kept doodle, the starting-note line names the home note in the computed octave.

## EXPECTATION
- At Jam mode's Idle without a kept doodle, only the home note in that octave, at its exact concert pitch, starts a Jam from the controller.
- The starting note belongs to no doodle, and the home note that starts a Jam does not start the silence timer.
- While tap-in listens, no note starts a Jam.
