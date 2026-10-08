---
id: rule_embellishment_figures_defined
status: DRAFT
tags: [v3, release-v3.1, generation, figures]
layer: BUSINESS
version: 0.1
priority: 1
parents:
  - [[req_embellishment_figure_levels]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.1 master spec the product owner approved on 2026-10-08. Describes intended v3.1 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
dependents: []
type: RULE
human_name: The Seven Embellishment Figures
---

# The Seven Embellishment Figures

## INTENT
Fix what each of the seven figures is, so a figure level always governs the same musical device.

## THE RULE / LOGIC
A chord tone is a note of the chord sounding at that moment; every figure decorates a chord tone and lands on one. A step moves to the next note of the scale, a half step is the smallest distance between two notes, and a leap is any move larger than a step. Diatonic means using only notes of the current key and mode; chromatic means a note from outside it. In four-beat measures beats 1 and 3 are the strong beats. The seven figures are:

1. passing tone: a scale note outside the chord that fills the gap between two notes, moving by step in one direction (C, D, E over a C major chord);
2. accented passing tone: the same, placed on beat 1 or 3, where the ear expects calm;
3. neighbor tone: a step away from a chord tone and straight back, above or below; one level covers both directions;
4. appoggiatura: a scale note outside the chord, entered by a leap of 3 half steps or more, on beat 1 or 3, that resolves by one scale step onto a chord tone;
5. diatonic enclosure: the scale notes just above and just below a target chord tone, in either order, then the target;
6. chromatic approach: one note from outside the key, a half step above or below a chord tone, just before it; it also covers what theory calls a chromatic passing tone or a chromatic neighbor, seen from the note before it;
7. chromatic enclosure: the notes a half step above and below a target chord tone, at least one of them outside the key, then the target.

The rhythm decides where a figure can go, and a level never adds a note: a chromatic approach needs two back-to-back notes and an enclosure three, back-to-back meaning with no rest between them and no chord change. The arpeggio, the chord's own notes one after another, is the generator's baseline, not a figure, and has no level.

## TECHNICAL INTERFACE
Each figure-level control governs exactly one of these seven figures.

## EXPECTATION
- Every free figure the generator writes is one of the seven figures as defined here.
- A level never adds a note: an enclosure appears only where three back-to-back notes sit under one chord.
