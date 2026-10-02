---
id: rule_only_note_on_counts_as_played
status: DRAFT
layer: BUSINESS
version: 0.1
priority: 1
human_name: Only Note-On Counts as a Played Note
tags: [v2, release-v2.0, midi]
parents:
  - [[req_midi_controller_input]]
dependents: []
type: RULE
notes: Recorded 2026-10-01 in v2 chunk 12 (MIDI input); rule text unchanged. A note-off, or a zero-velocity note-on, for a pitch that is not held ends nothing and is ignored, for example a key already down when the controller was connected. Since no note-off can follow, a held note also ends when its controller is lost (at the time its port reports the loss) or another input is selected (at the current audio time), and the session controller ends every held note at the session end (wired in v2 chunk 17, before the end closes the history); so every played note gets a release. Messages from the selected input keep their arrival order on the audio clock, so a release never lands before its onset.
---

# Only Note-On Counts as a Played Note

## INTENT
Count only real note attacks as playing.

## THE RULE / LOGIC
Only a note-on with non-zero velocity counts as a played note. Breath and other control-change data, pitch bend, aftertouch and system-exclusive messages are all ignored, because the reference controller's own breath signal is not accurate enough to build a feature on. A note-off, or a note-on with zero velocity, is read for one purpose only: to know when a played note ends. It is never a played note and never counts as activity. A new note-on for a pitch that is still held ends the earlier one.

## TECHNICAL INTERFACE
MIDI input handling keeps note-on (non-zero velocity) as played notes and note-off only as note ends.

## EXPECTATION
- Only non-zero-velocity note-on messages produce played notes or count as activity.
- Control change, pitch bend, aftertouch and system-exclusive messages have no effect.
- A note ends at its note-off, its zero-velocity note-on, or a new note-on for the same pitch.
