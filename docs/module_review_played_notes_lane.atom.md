---
id: module_review_played_notes_lane
status: REVIEW
notes: Captured 2026-10-04 before code in v2 chunk 23 (pre-code architecture capture).
dependents: []
layer: ARCHITECTURE
version: 0.1
parents:
  - [[rule_no_grading_or_mismatch_signal]]
  - [[rule_review_played_notes_toggle]]
type: MODULE
priority: 1
human_name: Review Played Notes Lane
tags: [v2, release-v2.0, part-v2.1, review, midi, non-scoring]
---

# Review Played Notes Lane

## INTENT
Show, in the review, the notes the player actually played beside each phrase's engraving, unquantized and neutral, on the engraved score's own time axis, only while the player's played-notes toggle is on.

## THE RULE / LOGIC
Source. The lane draws the played notes of the session history's records, which already hold only the notes whose onset falls in a phrase. A played note's beat is (time - the record's start) * the record's tempo / 60, from 0 to 16 beats, the phrase's four 4/4 measures; its onset and its release each map this way. A written event's beat is its measure index * 4 + its start tick / 4, start ticks being measure-relative sixteenth ticks.

Time axis. The lane uses the engraved score's measure anchors as its time axis. The anchors are every written note and rest, at its beat and at its glyph's notehead or rest inline start, plus each measure's closing barline, at the measure's end beat. Inside a measure, time maps linearly between consecutive anchors. The gap from a barline to the next measure's first note takes no time: an onset exactly on a downbeat sits at the next measure's first note, and a release exactly on it sits at the closing barline. Nothing is snapped to any grid or written note, and the mapping from time to position is strictly increasing.

Cuts. A played note's bar is cut at the phrase end. In the split layout it is also cut at the break between the two systems: a note crossing the break is drawn in both lanes, up to the top system's last barline and from the bottom system's first note.

Pitch scale. The vertical position is one scale for the whole session: from the lowest to the highest pitch over every played note of the session, widened equally on both sides to at least 12 semitones when narrower. A note's position on that scale is a fraction from 0 to 1, exposed to the view as the --played-note-pitch custom property.

Look. Every played note has the same colour. No note is marked as matched or unmatched, and the lane shows no velocity and no text.

Visibility and space. A phrase's lane is drawn only together with that phrase's engraving, never before it. While the toggle is on, the lane's block space is reserved for every phrase, so the review does not shift as engravings arrive.

Toggle state. Whether the toggle is on is held in memory by the review host for the page session, never stored, and gone on reload.

Split. The geometry (beats, the time-to-position mapping, the cuts and the pitch scale) is a pure module with no DOM; the view draws it.

## TECHNICAL INTERFACE
src/components/review/played-notes-lane-geometry.ts: pure geometry from the session history records' played notes and the engraved score's measureAnchors to each lane's note bars (inline start and end per system, cut at the phrase end and at the split layout's break) and each note's pitch fraction, on a session-wide pitch scale. src/components/review/played-notes-lane-view.ts turns that geometry into each lane's accessible name and its dividers' and bars' inline styles, shifted by each system's inline offset; a lane with no engraving to draw against is blank. src/components/review/ReviewPhrase.vue keeps the anchors of its last successful engraving, draws a phrase's lanes with it and sets --played-note-pitch on each note; src/components/review/ReviewPanel.vue shows the toggle only when a record of the session holds a played note, computes the session-wide pitch scale, and has the lanes drawn and their block space reserved only while that holds and the toggle is on. src/components/workspace/use-review-host.ts holds the toggle state in memory for the page session.

## EXPECTATION
- With the toggle off no lane is drawn and no lane space is reserved; with it on, each phrase's lane appears with its engraving and its space is reserved before that.
- Each played note is placed from its unquantized onset and release through the anchors: linear between consecutive anchors, an onset on a downbeat at the next measure's first note, a release on it at the barline, never snapped, and strictly increasing in time.
- A note running past the phrase end is cut there; in the split layout a note crossing the break is drawn in both lanes.
- The pitch scale spans the session's lowest to highest played pitch, widened equally to at least 12 semitones, and each note exposes its 0 to 1 fraction as --played-note-pitch.
- Every played note has the same colour, with no matched or unmatched marking, no velocity and no text.
- The toggle state is never written to browser storage and is gone on reload.
