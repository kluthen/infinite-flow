---
id: module_jam_idle_notes
status: DRAFT
tags: [v3, release-v3.2, jam, midi, idle]
dependents: []
type: MODULE
version: 0.1
priority: 1
human_name: Jam's Idle Note Routing
parents:
  - [[rule_jam_start_conditions]]
  - [[rule_jam_starting_note_is_home_note]]
  - [[rule_jam_tap_in_listening]]
layer: ARCHITECTURE
---

# Jam's Idle Note Routing

## INTENT
Decide in one place what a controller note played at Jam mode's Idle does, so the starting note, a kept doodle's starting note and tap-in never compete for one note.

## THE RULE / LOGIC
At Jam mode's Idle every controller note goes to one module of Jam's code, which gives it at most one meaning. Session mode's starting note stays in its own module; which of the two hears the notes follows the mode.

Without a kept doodle, the starting note is the home note of Jam's key, in written pitch, in the octave nearest the middle of the instrument's written range, the lower one when two are equally near, matched at its exact concert pitch under the instrument's transposition. The module names it for the starting-note line; played, it starts a Jam under the same start conditions as the Start click. It belongs to no doodle and does not start the silence timer. Any other note is ignored, and no note played at Idle is ever part of a doodle.

No note starts anything while the review shows, while the player is connecting a controller or its transposition check runs, or while a Jam cannot start; and, as in session mode, the starting note starts nothing until the page's first click, tap or key press.

The routing that comes later joins this module rather than a second one: with a kept doodle, the starting note is that doodle's phrase 1's first note; while tap-in listens, every controller note is a tap, the starting note included, and no note starts a Jam. Not built yet.

## TECHNICAL INTERFACE
src/jam/jam-idle-notes.ts, inside Jam's code and loaded with it (module_jam_code_boundary): it hears the controller's notes at Jam mode's Idle, reads Jam's key and mode (session mode's until Jam's own settings exist) and the selected instrument, and publishes the starting note the starting-note line names, or none. The kept doodle's starting note and tap-in extend this module. Session mode's starting note stays in src/components/workspace/workspace-session-starting-note.ts (module_session_starting_note). Not built yet.

## EXPECTATION
- At Jam mode's Idle without a kept doodle, the starting-note line names the home note with its octave, and only that note at its exact concert pitch can start a Jam from the controller.
- Every other note played at Jam mode's Idle changes nothing, and none is ever part of a doodle.
- No note starts anything while the review shows, while a controller is being connected or checked, or before the page's first click, tap or key press.
