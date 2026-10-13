---
id: module_notation_stem_direction
status: REVIEW
type: MODULE
human_name: Notation Stem Direction
tags: notation
notes: Synced 2026-10-13 at the v3.0 wave-2 post-task sync, same version 0.2: chunk 19b's code (d6928ec, merge 39cd2a5) reads the middle line of the phrase's clef, B4 in treble clef and D3 in bass clef (noteStemDirection and beamGroupStemDirection in src/domain/notation/stem-direction.ts take the clef), with linked tests (written-phrase-stems.spec.ts); the text matches. The pending note below is done; status stays REVIEW. Earlier: Revised 2026-10-12 to version 0.2 (previous version 0.1) on the owner's ruling D293 (master spec Part A v1.9, sections 7.1 and 11), before code, for v3.0 build plan chunk 19b; stays REVIEW, as the owner agreed the change. The middle line is now the clef's own: B4 in treble clef, D3 in bass clef (my instrument's choice); the rule is otherwise unchanged. Pending implementation: until chunk 19b's code lands the stem rule reads B4 for every phrase, which agrees with this text while no my instrument can choose bass clef. Chunk 19b's post-task sync checks the code against this text. Earlier: Captured 2026-10-05 before code (pre-code architecture capture). Implemented by the ISS-006 fix (39ac8ed, merged aee62af); code and tests checked against the text and promoted DRAFT to REVIEW the same day under the owner's 2026-10-05 allowance.
layer: ARCHITECTURE
parents:
  - [[rule_notation_display_preserves_phrase]]
priority: 1
version: 0.2
dependents: []
---

# Notation Stem Direction

## INTENT
The written phrase decides the stem direction of every written note, so the engraver never chooses a stem direction itself.

## THE RULE / LOGIC
The written phrase, built by the pure display transform from the concert phrase, assigns every written note a stem direction, up or down; rests carry no stem direction, and the concert phrase is left unchanged. A note outside any beam group takes its direction from its own staff position, computed from its written letter and octave rather than its MIDI number: on or above the middle line of the phrase's staff, in its clef (B4 in treble clef, D3 in bass clef), the stem points down, below it the stem points up. All notes of one beam group share a single direction, decided by the note farthest from the middle line: farthest above gives down, farthest below gives up. When the farthest note above and the farthest note below are equally far, the side holding more of the group's notes decides; when that count is also equal, the stems point down. This is standard engraving practice; it can differ from summing the notes' offsets from the middle line when one far note faces several near ones, and the farthest-note rule is the one used. Rationale: every other engraving choice is already decided in the written model, so keeping stem direction there leaves the engraving adapter a pure mapper and lets the layout policy reserve ink reach for rest positions on a known rule.

## TECHNICAL INTERFACE
Each written note in the written phrase exposes a required stem direction field with the values up or down; written rests have none. The engraving adapter passes that value unchanged to the engraving library as the note's stem direction, never enables automatic stemming on a note, and builds each beam so that it keeps its notes' preset directions instead of recomputing one.

## EXPECTATION
A single written note on the middle line of its clef or higher (B4 in treble clef, D3 in bass clef) is stemmed down and one below it is stemmed up, whatever its accidental or MIDI number. Every note of a beam group carries the same direction, set by the note farthest from the middle line, then by the majority side, then down. The rendered stems match the written phrase's directions exactly, and the concert phrase and its events are identical before and after the transform.
