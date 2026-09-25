# Issue: The tonal-center selection should be the written key of the displayed instrument

**ID:** `Ref_20260925_tonal_center_in_written_key`
**Ref:** `ISS-003`
**Date:** 2026-09-25
**Severity:** Medium
**Status:** Open
**Component:** `src/domain/notation/pitch-spelling.ts`
**Affects:** `src/domain/controls/generation-controls.ts` (tonal-center control), `src/components/controls/*` (tonal-center picker labels), `src/notation/vexflow-engraver.ts` (key signature), `specs/first-release-master-spec.md` §Tonal context / §Notation, `ui_ux/` control docs

---

## Summary

A player on a B-flat instrument who selects "C" and "Ionian" expects to practice C major on their instrument: a written C major staff with an empty key signature. Today the selection is a **concert** tonal center, so C Ionian concert is written in D major with two sharps in B-flat display. The user wants the tonal-center and scale selection to be read in the instrument's written key, with the scale dictating the key signature, as is customary. This knowingly changes the first-release spec (the user noted the contradiction), so it needs a spec decision before code.

---

## Technical Description

### Background

The current spec, `specs/first-release-master-spec.md`, says:

- L38: "Tonal context: one of all twelve **concert-pitch** pitch classes plus a collection… The default is C Ionian."
- L18/L120: display transposition (Concert, B-flat, E-flat) is a pure redraw that "never changes generated pitches, harmony, the seed…". B-flat is written a major ninth up, E-flat a major sixth up.
- L126: the written key is derived from the concert tonal center plus the display transform, with the fewest-accidentals spelling.

### The Problem Scenario

```
Player (B-flat display) selects  Tonal center = C, Scale = Ionian
Today:     concert C Ionian  --(+14 chromatic / +8 diatonic)-->  written D Ionian  →  key signature: F#, C#
Expected:  written C Ionian  (concert B-flat Ionian)             →  key signature: none
```

### Where This Pattern Exists Today

- `src/domain/controls/generation-controls.ts`: `PITCH_CLASSES`, `COLLECTIONS` (concert pitch classes)
- `src/domain/notation/pitch-spelling.ts`: `spellWrittenKey`. The key signature already follows the collection's parent-major signature (`ionianTonic`), so a mode such as D Dorian gets the signature of its parent major. The "scale dictates the signature" part therefore mainly depends on the tonal center being read in the written key.
- `src/notation/vexflow-engraver.ts`, `measureLeadingWidth` and `buildStaves`: `addKeySignature(mapKeySpec(phrase.key.signature.ionianTonic))`

---

## Risk Assessment

| Factor              | Value                                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Likelihood          | High: every B-flat or E-flat user meets it on first load, since B-flat is the default display                     |
| Impact if triggered | Medium: the phrase is valid, but the key is not the one the player asked for, which defeats key-targeted practice |
| Detectability       | High: the user sees it immediately                                                                                |
| Current mitigant    | Mentally transpose the selection: pick B-flat for written C on a B-flat instrument                                |

---

## Recommended Fix

**Short term:** Decide the semantics (spec-writer, then ux-writer). Open questions:

1. Is the tonal center read in the **display mode's** written key or in the **instrument profile's** transposition? Display mode and instrument profile are independent today; for example a keyboard profile can be viewed in B-flat.
2. When the display mode changes, does the phrase stay concert-identical, so the written key changes as it does today? Or is the selected written key kept, so the concert key changes and a regeneration is needed?
3. Does Concert display keep today's behavior (written equals concert)?
4. How is the picker labelled, e.g. "C (written for B♭)"?

**Medium term:** Convert the written selection to the concert tonal center at request construction (`createGenerationIntent`), so the generator stays concert-only and display-agnostic, as the architecture requires. Spell the written key from the selection itself rather than re-deriving it from concert pitch. Update the spec's L38, L120 and L126 and the acceptance criteria at L140, and add tests for C Ionian in B-flat (empty signature), in E-flat and in Concert.

**Long term:** Model "player key" as a first-class control-layer concept distinct from the concert tonal context. That leaves room for per-instrument practice sets later.

---

## Extra Data

A B-flat-display screenshot at default settings (C Ionian concert) shows a two-sharp signature (written D major). This matches the current spec and is the behavior the user wants changed.

---

## References

- `specs/first-release-master-spec.md` (lines 18, 38, 120, 126-128, 140)
- `src/domain/notation/pitch-spelling.ts`
- `src/domain/controls/generation-controls.ts`
- `src/notation/vexflow-engraver.ts`
