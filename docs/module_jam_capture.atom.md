---
id: module_jam_capture
status: DRAFT
human_name: The Jam Capture's States
parents:
  - [[rule_doodle_capture_start]]
  - [[rule_doodle_ends_by_length]]
  - [[rule_doodle_ends_by_silence]]
  - [[rule_doodle_quantized_to_sixteenths]]
  - [[rule_jam_live_view_never_shows_doodle]]
  - [[rule_jam_phrase_one_deadline]]
  - [[rule_jam_without_doodle_note_ends]]
  - [[rule_notes_after_doodle_belong_nowhere]]
  - [[rule_two_measures_before_jam_phrase_one]]
dependents: []
version: 0.1
tags: [v3, release-v3.2, jam, session]
type: MODULE
layer: ARCHITECTURE
priority: 1
---

# The Jam Capture's States

## INTENT
Turn a fresh Jam's notes, from its count-in to phrase 1, into its doodle and into the moments its phrase 1 is attempted, shown and sounded, on the beat grid the click sets.

## THE RULE / LOGIC
A pure state machine inside Jam's code, driven by timed events on the injected audio clock (the played notes, after the very-short-note filter, and ticks) and by the click plan's beat grid, four beats to a measure at Jam's tempo, which does not change before phrase 1. Its states, in order: count-in, capture, tentative generation measure, generation measure, extended wait, read-in.

Count-in to capture. The count-in is one measure; the capture begins at its end. A note belongs by its snapped start: a note snapping onto the first beat after the count-in is a doodle note, one snapping earlier belongs to the count-in and to nothing. The doodle's first measure is the measure holding its first note. When no doodle note has come 30 seconds after the count-in's end, the machine ends the Jam, with the cause no note played.

The end by silence. At each barline after the end of the doodle's first measure where no doodle note is sounding, the machine hands the doodle as it stands, quantized, as a candidate end, and enters the tentative generation measure, where phrase 1's ladder starts an attempt from it. A doodle note starting inside that measure voids the candidate end, the ladder cancelling its attempt, and the measure joins the doodle: back to capture. A measure that stays silent is the generation measure, and the doodle ended at its start: the candidate end is the doodle. A measure beginning with a note still sounding is never silent.

The end by length. When the doodle's fourth measure ends, the doodle ends whatever is sounding, a held note cut at that barline, and the next measure is the generation measure.

The doodle is quantized at each candidate end and at an end by length, by the one quantizer, the same way each time (module_doodle_quantizer), so the quantized doodle is the one handed at its end; nothing quantizes note by note. Notes after the doodle's end belong to nothing.

To phrase 1. The ladder tells the machine when phrase 1 is ready. Phrase 1 is shown at the first barline at or after that moment; until then the wait extends by whole measures (extended wait). The read-in measure follows the barline phrase 1 is shown at, and phrase 1 starts sounding at its end, which the machine tells the session. The machine gives the ladder the time the generation measure begins, from which phrase 1's deadline is counted; ending the Jam at the deadline is the ladder's.

The machine publishes its state as the Jam's phase, with the beat it is on, which the row above the staff reads. It never puts the doodle on the staff.

## TECHNICAL INTERFACE
src/jam/jam-capture.ts holds the machine and src/jam/jam-phase.ts the phase it publishes, both inside Jam's code (module_jam_code_boundary). It reads the click plan's grid (createClickPlan, beatAt, countInEndsAt in src/audio/click-track.ts), the very-short-note filter (withoutVeryShortNotes, src/domain/played-notes/stray-notes.ts) and the quantizer (quantizeDoodle, src/jam/doodle-quantizer.ts, given each end it chooses), and drives the session through its start without phrase 1 (module_session_start_without_phrase_one). The notes it reads still reach the session history as played notes, the doodle's raw notes marked as the doodle's, with the quantized doodle and its capture tempo. Not built yet; the names of its states, events and outputs are written in when built.

## EXPECTATION
- A note snapping onto the first beat after the count-in belongs to the doodle; one snapping earlier belongs to nothing.
- A doodle ends by silence after one, two or three measures, at the start of the silent measure, which is the generation measure; a doodle note inside a tentative generation measure voids the candidate end and extends the doodle; a measure beginning with a held note that ends at once is not silent.
- A doodle ends after four measures whatever sounds, a held note cut at the barline.
- With no doodle note 30 seconds after the count-in the Jam ends; at 29.9 seconds it still runs.
- Phrase 1 is shown at the first barline at or after it is ready and sounds one measure later.
- The same notes at the same times always give the same doodle and the same states.
