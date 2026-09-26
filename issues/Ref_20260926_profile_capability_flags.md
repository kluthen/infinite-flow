# Issue: Planner behavior is gated by musical-profile name instead of a capability flag

**ID:** `Ref_20260926_profile_capability_flags`
**Ref:** `ISS-005`
**Date:** 2026-09-26
**Severity:** Low
**Status:** Open
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
  - there is a unit test for a test-only profile that has the flag but a different name;
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
