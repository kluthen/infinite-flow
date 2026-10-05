---
id: module_notation_stem_direction
status: DRAFT
type: MODULE
human_name: Notation Stem Direction
tags: notation
notes: Captured 2026-10-05 before code (pre-code architecture capture). DRAFT pending review.
layer: ARCHITECTURE
parents:
  - [[rule_notation_display_preserves_phrase]]
priority: 1
version: 0.1
dependents: []
---

# Notation Stem Direction

## INTENT
The written phrase decides the stem direction of every written note, so the engraver never chooses a stem direction itself.

## THE RULE / LOGIC
The written phrase, built by the pure display transform from the concert phrase, assigns every written note a stem direction, up or down; rests carry no stem direction, and the concert phrase is left unchanged. A note outside any beam group takes its direction from its own staff position, computed from its written letter and octave rather than its MIDI number: on or above the treble staff's middle line (B4) the stem points down, below it the stem points up. All notes of one beam group share a single direction, decided by the note farthest from the middle line: farthest above gives down, farthest below gives up. When the farthest note above and the farthest note below are equally far, the side holding more of the group's notes decides; when that count is also equal, the stems point down. This is standard engraving practice; it can differ from summing the notes' offsets from the middle line when one far note faces several near ones, and the farthest-note rule is the one used. Rationale: every other engraving choice is already decided in the written model, so keeping stem direction there leaves the engraving adapter a pure mapper and lets the layout policy reserve ink reach for rest positions on a known rule.

## TECHNICAL INTERFACE
Each written note in the written phrase exposes a required stem direction field with the values up or down; written rests have none. The engraving adapter passes that value unchanged to the engraving library as the note's stem direction, never enables automatic stemming on a note, and builds each beam so that it keeps its notes' preset directions instead of recomputing one.

## EXPECTATION
A single written note on B4 or higher is stemmed down and one below B4 is stemmed up, whatever its accidental or MIDI number. Every note of a beam group carries the same direction, set by the note farthest from the middle line, then by the majority side, then down. The rendered stems match the written phrase's directions exactly, and the concert phrase and its events are identical before and after the transform.
