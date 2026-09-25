# Issue: Note density needs a variety setting (allow longer values in eighth and sixteenth modes)

**ID:** `Ref_20260925_note_density_variety_setting`
**Ref:** `ISS-004`
**Date:** 2026-09-25
**Severity:** Low
**Status:** Open
**Component:** `src/domain/rhythm`
**Affects:** `src/domain/controls/generation-controls.ts` (`NOTE_DENSITIES`, new control), musical profile presets (`profile-selection.ts`), `specs/first-release-master-spec.md` §Note density, rhythm grammar / prefilter, `ui_ux/` controls

---

## Summary

Note density (`Quarter`, `Eighth`, `Sixteenth`, `Mixed`) behaves almost as a strict grid in the eighth and sixteenth modes. In quarter mode, occasional dotted quarters, eighths and even half notes already appear. The user asks for a second dimension: a **variety** setting that, at a given density, lets longer values appear with a controlled, rarer frequency. Proposed levels are Strict (only the selected value), Slightly varied (current quarter-mode feel) and Heavily varied. This is a feature request from manual testing.

---

## Technical Description

### Background

- `specs/first-release-master-spec.md:42`: "Note density: quarter notes, eighth notes, sixteenth notes, or mixed subdivisions."
- `:57`: "Every measure fills exactly four beats using the selected subdivision grid."
- The density, silence and syncopation budgets feed the rhythm enumeration and prefilter. Six density, silence and syncopation combinations are already unsupported under the v1 rhythm grammar.

### The Problem Scenario

```
Density = Eighth   →  today: nearly every onset is an eighth (beamed pairs)
Requested:
  Strict           →  eighths only (plus rests/ties from silence and syncopation)
  Slightly varied  →  mostly eighths, occasional quarter / dotted quarter
  Heavily varied   →  eighths dominant, but quarters and dotted values common, rare half notes
```

The variety setting should be a ratio or weight on longer values, not a switch to `Mixed`.

### Where This Pattern Exists Today

- `src/domain/controls/generation-controls.ts:37`: `NOTE_DENSITIES`
- `src/domain/rhythm/*`: enumeration, the density budget and the prefilter soundness specs
- `src/domain/controls/profile-selection.ts`: preset bundles (neutral: Quarter, jazz: Eighth)

---

## Risk Assessment

| Factor              | Value                                                                          |
| ------------------- | ------------------------------------------------------------------------------ |
| Likelihood          | n/a (feature request)                                                          |
| Impact if triggered | Low: the phrases are valid but rhythmically monotonous at the higher densities |
| Detectability       | High: audible and visible in practice                                          |
| Current mitigant    | Use `Mixed` density, which is less controllable                                |

---

## Recommended Fix

**Short term:** Spec decision (spec-writer):

- the name and levels of the control
- its default (probably "Slightly varied", matching today's quarter-mode feel)
- whether presets set it
- how it interacts with `Mixed`, silence density and syncopation
- whether it changes the set of unsupported combinations
- its position in the tie-break priority (spec L71)

**Medium term:** Implement it as a weight on longer rhythm cells within the selected grid, in the rhythm planner's budget and ranking. Keep enumeration deterministic and the prefilter sound. Hold the latency budget (warm p95 ≤ 250 ms, cold p90 ≤ 500 ms) and extend the seed and golden matrices.

**Long term:** Generalize density into a distribution over note values (a "rhythmic palette") that musical profiles can supply.

---

## Extra Data

User wording (2026-09-25): "in eights or sixteenth mode, appearance of longer notes are still possible, if rarer. We could provide a setting for this (strict … slightly varied … to heavily varied)."

---

## References

- `specs/first-release-master-spec.md` (lines 42, 49, 57, 71, 110)
- `src/domain/controls/generation-controls.ts`
- `src/domain/rhythm/`
- `src/domain/controls/profile-selection.ts`
