# Issue: Beamed eighths and sixteenths are drawn with flags as well as beams

**ID:** `Ref_20260925_beamed_notes_draw_flags`
**Ref:** `ISS-002`
**Date:** 2026-09-25
**Severity:** High
**Status:** Resolved
**Component:** `src/notation/vexflow-engraver.ts`
**Affects:** `src/notation/vexflow-two-system-engraver.ts`, `src/notation/vexflow-mapping.ts` (`buildMeasureBeams`), every phrase with eighth or shorter values

---

## Summary

When eighth or sixteenth notes are beamed (the single or double bar joining the stems, not the tie or slur), each note still shows its individual flag. Beamed notes must show a plain stem with no flag. The result is incorrect notation on every Eighth, Sixteenth or Mixed density phrase. Reported by the user during manual testing.

---

## Technical Description

### Background

In VexFlow, `new Beam(notes)` calls `note.setBeam(beam)` on every note, and a beamed note skips drawing its flag. The notes must therefore be attached to their beam **before** they are drawn. The standard order is: build the notes, build the beams, format, draw the voice, draw the beams.

### The Problem Scenario

Both engravers construct the beams only after the voice has already been drawn:

```ts
// src/notation/vexflow-engraver.ts, drawOneSystem (≈ line 189)
stave.setContext(context).draw()
new Formatter().joinVoices([voice]).formatToStave([voice], stave)
voice.draw(context, stave)                       // 1. notes drawn: no beam yet, so flags are painted
for (const beam of buildMeasureBeams(...)) {     // 2. new Beam(...) → setBeam() too late
  beam.setContext(context).draw()                // 3. beam painted over flagged stems
}
```

The same order is used in `src/notation/vexflow-two-system-engraver.ts` `drawMeasureGroup` (≈ line 58).

### Where This Pattern Exists Today

- `src/notation/vexflow-engraver.ts`: `drawOneSystem`
- `src/notation/vexflow-two-system-engraver.ts`: `drawMeasureGroup`
- `src/notation/vexflow-mapping.ts:151`: `buildMeasureBeams` constructs `new Beam(...)`

---

## Risk Assessment

| Factor              | Value                                                                          |
| ------------------- | ------------------------------------------------------------------------------ |
| Likelihood          | High: every beamed group                                                       |
| Impact if triggered | Medium: the notation is wrong and cluttered, though durations stay readable    |
| Detectability       | Low: the notation tests check structure and geometry, not the absence of flags |
| Current mitigant    | None                                                                           |

---

## Recommended Fix

**Short term:** In both engravers, call `buildMeasureBeams` before `Formatter`/`voice.draw`, keep the returned beams, and draw them after the voice. Beam stem directions are then applied before formatting too.

**Medium term:** Add a notation-harness test for an eighth-note phrase. Assert that no flag glyph is rendered for a note that belongs to a beam group (VexFlow flags carry a `vf-flag` class or a flag glyph code point), and that unbeamed eighths still have one.

**Long term:** Wrap the construction order (notes → beams → ties → format → draw) in a single helper shared by the one- and two-system engravers, so they cannot drift.

---

## Extra Data

Root cause found by reading the code (2026-09-25). It has not yet been reproduced in a test.

---

## References

- `src/notation/vexflow-engraver.ts`
- `src/notation/vexflow-two-system-engraver.ts`
- `src/notation/vexflow-mapping.ts`
- VexFlow `Beam` / `StemmableNote.setBeam` (`node_modules/vexflow/build/esm/src/beam.js`, `stavenote.js`)

## Change Log

- **2026-09-25**: Fix started on branch `release-followups`, after the v1.0-rc1 tag.
- **2026-09-25**: Resolved. Both engravers build beams (`buildPhraseBeams`) before formatting and `voice.draw()`, so `shouldDrawFlag()` sees the beam and skips the flag; beams are still drawn after the voice. Covered by `tests/e2e/notation/notation-flags.spec.ts` (only the unbeamed eighth keeps a flag). The notation-visual snapshots were regenerated.
