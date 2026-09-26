# Issue: Note density needs a variety setting (allow longer values in eighth and sixteenth modes)

**ID:** `Ref_20260925_note_density_variety_setting`
**Ref:** `ISS-004`
**Date:** 2026-09-25
**Severity:** Low
**Status:** Resolved
**Component:** `src/domain/rhythm`
**Affects:** `src/domain/rhythm/*` (budget, enumeration, prefilter), `src/domain/controls/generation-controls.ts` (`NOTE_DENSITIES`, new control), musical profile presets (`profile-selection.ts`), `specs/first-release-master-spec.md` §Note density, rhythm grammar / prefilter, `ui_ux/` controls

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

## Settled Semantics (2026-09-25, spec-writer session)

Source: `specs/archive/2026-09-25-decisions-D47-D71.md` D59–D60, and the persona P1 in `specs/personas/personas.md`. P1 learns by exposure to possibilities, which argues for variety by default.

1. **Meaning.** Rhythmic variety is the _chance of appearance_ of note values other than the selected density, both **shorter and longer**. (The previous "longer values only" framing is dropped.) At Sixteenth, only longer values are possible, because the v1 grammar has nothing shorter.
2. **Levels.** _Strict_ allows only the selected value, plus the rests and ties produced by silence and syncopation. _Slightly varied_ matches today's Quarter-mode feel. _Heavily varied_ makes other values common, with the selected value still dominant. "Rhythmic variety" is the canonical concept term; ux-writer picks the player-facing label.
3. **Default: Slightly varied.** This is a known behavior change. At the default, Eighth and Sixteenth become somewhat more varied than today, and Quarter + Strict becomes stricter than today's Quarter mode.
4. **Presets.** Neutral and jazz both set _Slightly varied_, consistent with presets replacing the complete rhythm bundle.
5. **Mixed is retired** (D60). Mixed is redundant with _Heavily varied_, so note density offers only Quarter, Eighth and Sixteenth. Control construction and the worker's boundary parser reject `Mixed` as an unknown value. This removes Mixed-specific rhythm code, tests and fixtures (for example `rhythm-prefilter-soundness-mixed.spec.ts`, the Mixed entries of `rhythm-mvp-v1-manifest.json` and of `generation-outcome-golden.v2.ts`).
6. **Feasibility first.** Before any design is committed, a proper review of the rhythm grammar establishes:
   - which values can be introduced at each density without breaking the four-beat fill, the prefilter's soundness or determinism;
   - whether any new rhythm-setting combination would become blocked (goal: none, and ideally _Heavily varied_ never blocks);
   - the effect on the latency budget (warm p95 ≤ 250 ms, cold p90 ≤ 500 ms);
   - where variety sits in the tie-break priority.

   The review goes to the user before implementation.

7. **Later direction (not in scope).** Embellishment and style-figure flags expected in v2/v3 may overlap with this setting or complete it. Variety may later become selective rates, for example "embellishment at 20%". The "rhythmic palette" long-term item below is compatible with that.

---

## Recommended Fix

**Short term:** ~~Spec decision~~ Done; see Settled Semantics above. Next: the feasibility review (item 6), then ux-writer for the control, then coding-leader. The original questions were:

- the name and levels of the control
- its default (probably "Slightly varied", matching today's quarter-mode feel)
- whether presets set it
- how it interacts with `Mixed`, silence density and syncopation
- whether it changes the set of unsupported combinations
- its position in the tie-break priority (spec L71)

**Medium term:** Implement it as a weight on off-density rhythm cells (shorter and longer) within the feasibility review's findings, in the rhythm planner's budget and ranking. Keep enumeration deterministic and the prefilter sound. Hold the latency budget (warm p95 ≤ 250 ms, cold p90 ≤ 500 ms) and extend the seed and golden matrices.

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

---

## Change Log

- **2026-09-25**: The semantics are settled by a spec-writer session (D59). Variety now covers both shorter and longer values. The default is Slightly varied and presets set it. Mixed is retired (D60). A feasibility review is required before implementation. The status stays Open.
- **2026-09-26**: Item 5 was stale (it still said O26 was open). It now reflects D60. The master spec was amended to draft v2.0 (Player Controls → Rhythmic variety / Note density; Definition of Done). The execution plan is in `specs/archive/v1/gate-execution-report.md`.
- **2026-09-26**: Implemented on branch `iss004-rhythmic-variety` per the feasibility review (`specs/archive/v1/iss004-feasibility-review.md`): the rhythm grammar moved to `rhythm-mvp-v2`, `Mixed` note density is retired, `rhythmicVariety` (Strict / Slightly varied / Heavily varied) ships as its own control with a per-density-and-level beat-cell catalog and nominal-attack-share dominance rule, and Strict/Slightly-varied block 6/4 settings respectively while Heavily varied blocks none, matching §4. Status moves to Resolved.
