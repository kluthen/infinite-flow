# Issue: A rising up-stemmed beam can run through a chord symbol

**ID:** `Ref_20261005_chord_symbol_through_rising_beam`
**Ref:** `ISS-008`
**Date:** 2026-10-05
**Severity:** Medium
**Status:** Open
**Component:** `src/notation/vexflow-mapping.ts`
**Affects:** `src/notation/vexflow-two-system-engraver.ts` (draw order), `src/notation/vexflow-engraver.ts` (draws every system through it), `src/notation/notation-layout-policy.ts` (the staff placement's ink reach above the staff), the start marker overlay, the notation calibration and visual baselines

---

## Summary

In a beam group stemmed up whose beam rises above the staff's text line, the chord symbol on the
group's first note is drawn through the beam. VexFlow places a chord symbol from its own note's
stem tip, before beams lengthen the stems, so it never accounts for the beam over it. With a
sixteenth group's double beam the chord symbol can become unreadable, and the start marker over the
same first note can touch the beam. The problem predates ISS-006: every stem was up then, and
up-stemmed groups are unchanged by that fix. ISS-006 made it rarer, since groups now stemmed down
no longer collide.

---

## Technical Description

### Background

A chord symbol should sit clear of everything the staff draws under it: noteheads, stems and
beams. VexFlow 5.0.0's `ChordSymbol.draw` places a symbol above the highest of three things: its
own note's notehead, the note's stem tip as it stands at that moment
(`note.checkStem().getExtents().topY`), or the staff's text line (one space above the top line). A
`Beam` lengthens the stems of its notes to reach the beam only in `Beam.postFormat`, which runs
when the beam is drawn.

### The Problem Scenario

```ts
// src/notation/vexflow-two-system-engraver.ts, drawing one measure
new Formatter().joinVoices([voice]).formatToStave([voice], stave)
voice.draw(context, stave) // notes and their chord symbols: each symbol over its note's
//                            unextended stem tip
for (const beam of measureBeams) {
  beam.setContext(context).draw() // only now: postFormat extends the stems, beam drawn
}
```

1. A measure starts with a beam group stemmed up whose last notes are higher than its first, such
   as [E4 C5], [F4 D5] or [F4 A4 E5]. The group's note farthest from the middle line is below it,
   so the whole group is stemmed up.
2. `voice.draw` draws E4 with its unextended up-stem, and its chord symbol just above the staff's
   text line, since E4's stem tip is lower.
3. The beam is then drawn from E4's lengthened stem to C5's, rising to the right. Over the first
   note it already lies above the text line, so it runs through the chord symbol.
4. With two beams (sixteenths, for example [E4 C5 F4]) most of the chord symbol is hidden: in an
   `Am7` measured on 2026-10-05, only the bottom of the letters showed under the beams. The start
   marker over that first attack sat right on the upper beam.

### Where This Pattern Exists Today

- `src/notation/vexflow-two-system-engraver.ts`: the measure draw, voice before beams.
  `src/notation/vexflow-engraver.ts` draws every system through it (`drawSystemMeasures`), so the
  Idle score, the session's rolling staff and the Review all share the order.
- `src/notation/vexflow-mapping.ts`: builds the chord symbols as modifiers of their note
  (`buildStaveNote`) and the beams (`buildMeasureBeams`).
- `src/notation/notation-layout-policy.ts`: the ink reach above the staff assumes a chord symbol
  over an up-stemmed note inside a beam group sits on that note's own stem tip (about 4.7 spaces
  above the top line for the saxophones, about 3.7 for the keyboard, 5.2 with the start marker).

---

## Risk Assessment

| Factor | Value |
|---|---|
| Likelihood | Medium: needs an up-stemmed beam group carrying a chord symbol, with its beam rising over the text line; arpeggio and stepwise figures that start low and climb produce it |
| Impact if triggered | Medium: the chord symbol, which the player reads to improvise, can be partly or mostly hidden; the score stays otherwise correct |
| Detectability | High: visible on the staff; no current test asserts that a chord symbol and a beam do not overlap |
| Current mitigant | ISS-006's stem directions: groups stemmed down no longer collide |

---

## Recommended Fix

**Short term:** Run each beam's `postFormat` before the voice is drawn, so the stems are already
lengthened when the chord symbols are placed. Then place each chord symbol above the beam's
highest point within the symbol's horizontal span (VexFlow alone only reads its own note's stem
tip, so the adapter has to supply that height).

**Medium term:** Draw the chord symbols on one common line per system, above every stem and beam
in it, as many lead sheets do. Either fix raises the ink above the staff: the keyboard's worst case
becomes the start marker over a chord symbol over a beam. Re-run the notation calibration
(`CALIBRATE=1`, see `docs/notation-engraving.md`) and re-check the staff placement and the
16-space system position in `src/notation/notation-layout-policy.ts`.

**Long term:** Carry the chord symbols' vertical placement in the written model, so the
engraving adapter draws it and never re-decides it, like stem directions since ISS-006.

---

## Extra Data

2026-10-05 (ISS-006 recalibration): the collision shows in [E4 C5] eighths and in [E4 C5 F4]
sixteenths at the start of a measure, chord symbol `Am7` on E4, with the start marker on the first
attack. In the eighth case the beam crosses the upper half of the letters; in the sixteenth case
the two beams cover most of them and the marker touches the upper beam.

---

## References

- `src/notation/vexflow-two-system-engraver.ts`
- `src/notation/vexflow-engraver.ts`
- `src/notation/vexflow-mapping.ts`
- `src/notation/notation-layout-policy.ts`
- `tests/e2e/notation/notation-calibration.spec.ts`
- [ISS-006](Ref_20260929_every_stem_drawn_up.md)
- VexFlow 5.0.0: `ChordSymbol.draw` (`src/chordsymbol.ts`), `Beam.postFormat` (`src/beam.ts`)
