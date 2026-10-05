---
id: module_notation_engraving_anchors
status: REVIEW
tags: [v2, release-v2.0, part-v2.1, notation, review]
parents:
  - [[rule_review_played_notes_toggle]]
dependents: []
type: MODULE
version: 0.1
human_name: Notation Engraving Measure Anchors
notes: Captured 2026-10-04 before code in v2 chunk 23 (pre-code architecture capture), for the review played-notes lane.
layer: ARCHITECTURE
priority: 1
---

# Notation Engraving Measure Anchors

## INTENT
Report where each written event and each closing barline of an engraved phrase sits horizontally, so a view can place things on the score's own time axis without changing the drawn score.

## THE RULE / LOGIC
Measure anchors. Besides the geometry it already reports, the engraved score reports measure anchors: one entry per drawn measure, in phrase order. Each entry holds the measure's index, the index of the system that draws it (the top system, or in the split layout the bottom one for its second half), the inline start of every written event of the measure, notes and rests alike, in event order, and the inline position of the measure's closing barline. A note's inline start is its notehead's inline start; a rest's is the rest glyph's inline start. Every position is in CSS px, relative to the SVG of the system that draws the measure.

Source. The anchors are read from the glyphs as the engraving library formatted them, after formatting and with the same scale the drawn system uses, so they match where the glyphs are drawn.

Reporting only. Computing the anchors changes nothing that is drawn: the SVG is the same with or without them, so the idle rendering stays pixel-identical.

Out of scope. What a view places on these anchors, and how it maps time between them, is not this module's job.

## TECHNICAL INTERFACE
src/notation/engraving-anchors.ts computes the measure anchors of a system from its formatted glyphs, its measure boxes and the system's scale. src/notation/vexflow-engraver.ts: EngravedScore gains measureAnchors, a list in phrase order of { measureIndex, systemIndex, eventStartsPx (one per written event, notes and rests, the notehead or rest inline start), barlinePx }, in CSS px relative to the measure's system SVG; a single EngravedSystem carries its own measures' measureAnchors the same way.

## EXPECTATION
Every engraved score reports one anchor entry per drawn measure, in phrase order, each naming its measure and the system that draws it, in both the single-system and the split layout. Each entry has exactly one event start per written event of its measure, notes and rests included, at the notehead or rest inline start, and the closing barline's position, all relative to its own system's SVG. Within a measure the event starts increase in event order and all lie before the closing barline. The drawn SVG, and so the idle rendering, is pixel-identical with or without the anchors.
