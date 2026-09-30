# Issue: Every stem is drawn up, high notes included

**ID:** `Ref_20260929_every_stem_drawn_up`
**Ref:** `ISS-006`
**Date:** 2026-09-29
**Severity:** Medium
**Status:** Open
**Component:** `src/notation/vexflow-mapping.ts`
**Affects:** `src/notation/vexflow-engraver.ts`, `src/notation/vexflow-two-system-engraver.ts`, `src/notation/notation-layout-policy.ts` (the staff placement's measured ink reach), the notation visual baselines

---

## Summary

The engraver never gives a note a stem direction, so VexFlow's default applies to every note: stem
up. Standard notation points the stem down for a note on or above the staff's middle line (B4 in
treble clef) and up below it, and a beamed group takes one direction from its notes as a whole.
Every phrase with notes on or above B4 therefore shows stems on the wrong side. It also makes the
staff taller than it needs to be: the stem of a high note rises 3.5 staff spaces over it and its
chord symbol sits over the stem's tip, so the ink over the saxophones' written C6 reaches about 7.2
spaces above the staff instead of about 4. That is what set each system position at 16 staff
spaces rather than 15, and a landscape phone's minimum small-viewport height at about 286 px rather
than about 276 px.

---

## Technical Description

### Background

A note's stem goes down when the notehead sits on or above the middle line and up when it sits
below; the notes of a beamed group share one direction, set by the group's notes taken together.
In VexFlow, `new StaveNote({ keys, duration })` gets `Stem.UP` unless the note struct sets
`autoStem: true` or a `stemDirection`, and `new Beam(notes)` keeps its notes' directions unless its
second argument, `autoStem`, is `true`.

### The Problem Scenario

```ts
// src/notation/vexflow-mapping.ts
const struct: StaveNoteStruct = {
  keys: [isRest ? restKey(event.duration) : mapPitchKey(event.pitch)],
  duration: mapDurationCode(event.duration, isRest),
} // no autoStem, no stemDirection: every stem up
...
return measure.beamGroups.map((group) => new Beam(group.map((index) => glyphs[index]!)))
// no autoStem: the group keeps the notes' (up) direction
```

1. A B-flat tenor saxophone phrase starts on written C6 under a chord symbol.
2. C6's stem is drawn up, 3.5 spaces above the notehead; the chord symbol is placed over the stem
   tip, about 7.2 spaces above the staff's top line.
3. Between the notehead and the chord symbol the stem fills the room the start marker would take,
   so the marker has to sit above the chord symbol, about 8.7 spaces above the top line.
4. The system position has to hold that, plus the saxophones' low C4 below, plus about one space at
   each end: 16 staff spaces.

### Where This Pattern Exists Today

- `src/notation/vexflow-mapping.ts`, `buildStaveNote` and `buildMeasureBeams`.
- `src/notation/notation-layout-policy.ts`, `NOTATION_HIGH_NOTE_INK_ABOVE_UNITS` (52 units: the
  up-stem plus the chord symbol) and `NOTATION_SYSTEM_POSITION_UNITS` (160).

---

## Risk Assessment

| Factor | Value |
|---|---|
| Likelihood | High: every phrase with a note on or above B4 |
| Impact if triggered | Medium: the score stays readable, but its stems break a basic notation convention, and the staff takes about 2 spaces more height per system than needed |
| Detectability | High: visible on the staff and in the visual baselines |
| Current mitigant | None; the system position is sized for the taller ink |

---

## Recommended Fix

**Short term:** Set stem directions by the middle-line rule, either in the written model (the
display transform decides it, as it decides every other engraving choice, and the mapping passes
it on as `stemDirection`) or in the adapter (`autoStem: true` on each note and `new Beam(notes,
true)`).

**Medium term:** Re-run the notation calibration (`CALIBRATE=1`, see `docs/notation-engraving.md`),
re-derive `NOTATION_HIGH_NOTE_INK_ABOVE_UNITS` and the other ink-reach constants from the new ink,
and see whether the system position can return to 15 spaces (two systems from about 276 px of
small-viewport height), keeping the start marker's room and about one space at each end.

**Long term:** Carry the stem direction in `WrittenPhrase`, so the engraving adapter draws it and
never re-decides it.

---

## Extra Data

Height calibration on 2026-09-29 (all stems up, 16-space position): the saxophones' highest ink
is a chord symbol about 7.2 spaces above the top line, over an up-stem from written C6; in the tenor
saxophone's High register, phrases starting on their highest note leave only about 0.6 space
between the stem tip and the chord symbol, so the start marker's reserved room lies above the
chord symbol.

2026-09-30 (note identity and session overlays): with every stem up, the drawn start marker never
fits between its note and the chord symbol and is always drawn above the chord symbol (25 of 25
first attacks measured across the three profiles and three registers).

---

## References

- `src/notation/vexflow-mapping.ts`
- `src/notation/notation-layout-policy.ts`
- `tests/e2e/notation/notation-calibration.spec.ts`
- `docs/notation-engraving.md`

---

## Change Log

- **2026-09-30**: Extra Data gains the start marker placement measured once the marker is drawn.
