# Issue: Planner behavior is gated by musical-profile name instead of a capability flag

**ID:** `Ref_20260926_profile_capability_flags`
**Ref:** `ISS-005`
**Date:** 2026-09-26
**Severity:** Low
**Status:** Resolved
**Component:** `src/domain/pitch/pitch-candidates.ts`
**Affects:** `src/domain/pitch/validation/figure-rules.ts`, `src/domain/controls/generation-controls.ts` (`MUSICAL_PROFILES`), the musical-profile policy passed into pitch planning, atom `rule_jazz_chromatic_resolution`, and later character presets (see `specs/vision/endgame.md`)

---

## Summary

Two places in pitch planning decide whether chromatic approach and enclosure figures are allowed by
comparing the musical profile's **name** against `'Jazz'`. Decision D73 (2026-09-26) says that
planner behavior must be driven by named **capability flags** carried by the musical profile, never
by its name.

The refactor must not change generated output. It is v1.0 gate work, done together with
ISS-003/ISS-004. It is also the first step toward the more restrictive "character" presets of the
long-term vision.

---

## Technical Description

### Background

A musical profile (`MUSICAL_PROFILES = ['Neutral', 'Jazz']`) is a declarative style policy. Adding
a profile, or later a character preset, should mean adding one data entry that declares what it
allows. It should not mean finding every `if (profile === ...)` in the planner.

### The Problem Scenario

```ts
// src/domain/pitch/pitch-candidates.ts:172
if (facts.input.policy.profile !== 'Jazz') return []

// src/domain/pitch/validation/figure-rules.ts:168
if (facts.context.policy.profile !== 'Jazz') {
  failures.push({ code: 'out_of_collection', attackIndex: attack.index })
  continue
}
```

1. Someone adds a third profile (say "Bebop", or a character that also allows chromatic approaches).
2. The new profile silently gets **no** chromatic figures, because it is not literally `'Jazz'`.
3. The validator also rejects any chromatic ornament from it as `out_of_collection`.
4. Nothing fails at compile time. The behavior is simply wrong until someone finds both string checks.

### Where This Pattern Exists Today

- `src/domain/pitch/pitch-candidates.ts:172` (`jazzPaths`, `@spec-link [[rule_jazz_chromatic_resolution]]`)
- `src/domain/pitch/validation/figure-rules.ts:168`
- A sweep of `src/domain` finds no other branch on the profile name. `harmony-planner.ts:80` only validates membership in `MUSICAL_PROFILES`.

---

## Risk Assessment

| Factor              | Value                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| Likelihood          | Low today (two profiles), High as soon as presets are added (v2+ direction)                                   |
| Impact if triggered | Medium: a silent musical-behavior difference, and generation/validation disagree if only one check is updated |
| Detectability       | Low: no error, only a missing figure family                                                                   |
| Current mitigant    | Only two profiles exist, and both checks agree                                                                |

---

## Recommended Fix

**Short term (v1.0):**

- Add a capability to the musical-profile definition. Working name: "chromatic approach and
  enclosure figures allowed", for example `allowsChromaticApproach: boolean`.
- `Jazz` sets it to true and `Neutral` to false.
- Replace both name checks with a read of that flag, and derive the policy's flags from the profile
  table in one place.
- Rename `jazzPaths` to a capability-based name if that is cheap.
- **Acceptance:**
  - golden fixtures and seeded outputs are byte-identical before and after;
  - `grep "'Jazz'"` in `src/domain` finds only the profile table;
  - capability-override unit tests show behavior follows the capability, not the name: Neutral
    with the capability gets chromatic figures, and Jazz without it gets none. `MusicalProfile` is a
    closed union, so the pitch policy accepts an optional capabilities override instead of a
    test-only profile name;
  - before the refactor, confirm that at least one golden or equivalence case actually selects a
    chromatic figure, and add a pinned case if none does;
  - the worker protocol is unchanged, and capabilities are derived in the domain;
  - the latency budget still holds.
- The documentalist updates `rule_jazz_chromatic_resolution` (or the atom that replaces it) so that
  it describes the capability rather than the profile name.

**Medium term:** as embellishment and style-figure flags arrive (v2/v3, D59 note), they are added
as further capabilities on the same table. Rates such as "embellishment at 20%" are a separate,
later question.

**Long term:** musical profiles evolve into restrictive character presets (scale restriction, banned
pitches, ornament preferences, signature gimmick, register tendencies), all declarative (see
`specs/vision/endgame.md`).

---

## Change Log

- **2026-09-26**: Filed from decision D73 (the user's answer to O32). Tracked as a v1.0 gate item
  next to ISS-003 and ISS-004.
- **2026-09-26**: Impact researched. Only the two name checks gate behavior; everything else is data, membership validation or collection-based. Recommended shape: a capability table next to `PROFILE_BUNDLES`, resolved into `PitchPolicy`, with no protocol change. Acceptance refined, and the medium conflict with ISS-004 on `profile-selection.ts` means this lands first. Details are in `specs/archive/v1/gate-execution-report.md` §4.3.
- **2026-09-26**: Resolved. Added `MUSICAL_PROFILE_CAPABILITIES` next to `PROFILE_BUNDLES`
  (`src/domain/controls/profile-selection.ts`); `makePitchPolicy` resolves it once onto a new frozen
  `PitchPolicy.capabilities` field, with an optional test-only override since `MusicalProfile` stays
  a closed union. `jazzPaths` (renamed `chromaticApproachPaths`) and the figure-rules
  out-of-collection check now read `policy.capabilities.allowsChromaticApproach` instead of
  comparing the profile name; the independent `generation-result-validator.ts` derives the same
  capability from the table directly, since it must never import the planner. Before touching code,
  a probe over `planPitchPhrase` confirmed a Jazz seed (seed 11, first Gentle-diatonic harmony
  candidate, first Eighth/Conversational rhythm candidate) actually selects a chromatic enclosure,
  not just offers one as a candidate; that case is now pinned in
  `tests/unit/domain/pitch/chromatic-figure-selection.spec.ts` with its pre-refactor hash
  (`765058683`), which the refactor reproduces byte-for-byte. `generation-outcome-golden.spec.ts`,
  `pitch-search-equivalence.spec.ts`, `generation-seed-matrix.spec.ts`, `pitch-candidates.spec.ts`,
  and `figure-rules.spec.ts` all pass unchanged. New capability-override tests (Neutral with the
  capability gets chromatic candidates/passes validation; Jazz without it gets none and fails
  `out_of_collection`) are in `pitch-candidates.spec.ts` and `figure-rules.spec.ts`.
  `grep -rn "'Jazz'" src/domain` now matches only the `MUSICAL_PROFILES` data table. The worker
  protocol is unchanged.
