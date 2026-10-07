# Issue: Candidate, transform and failure-detail order used locale collation

**ID:** `Ref_20261007_locale_dependent_candidate_order`
**Ref:** `ISS-010`
**Date:** 2026-10-07
**Severity:** Low
**Status:** Resolved
**Component:** `src/domain/pitch/pitch-candidates.ts`
**Affects:** `src/domain/rhythm/rhythm-expansion-memo.ts` (`descriptorOrder`),
`src/domain/validation/generation-result-validator.ts` (`ordered`)

---

## Summary

Three sorts that decide generated output compared strings with locale collation (`localeCompare`
or a default `Intl.Collator`): the canonical order of pitch candidates, the order of a phrase's
rhythm transforms, and the order of validation failure details. Collation follows the runtime's
locale, so in theory the same seed and settings could give different phrases in browsers set to
different locales. Owner ruling 2026-10-07: switch to plain code-unit order before the v2.0 tag.

---

## Technical Description

### Background

Generation is deterministic: one intent gives one phrase, byte for byte, in every runtime. Every
sort that feeds the search order or the result must therefore use a comparison that does not
depend on the environment.

### The Problem Scenario

```ts
// src/domain/pitch/pitch-candidates.ts (before)
const DEFAULT_COLLATOR = new Intl.Collator() // the browser's default locale
collate(a.role, b.role) || collate(a.obligation, b.obligation) || ...

// src/domain/rhythm/rhythm-expansion-memo.ts (before)
left.case.localeCompare(right.case)

// src/domain/validation/generation-result-validator.ts (before)
(a.detail ?? '').localeCompare(b.detail ?? '')
```

1. Two browsers run the same intent, one with an English or French locale, one with a Czech
   locale, whose collation sorts `ch` after `h`: `diatonic_approach_one` before `chord_tone`.
2. The candidate lists are enumerated in different orders, so `enumerationIndex` differs.
3. The search visits candidates in a different order and can select a different phrase.

### Where This Pattern Exists Today

Nowhere after this change: the three sites above, and the test oracles that mirror them, now use
`a < b ? -1 : a > b ? 1 : 0`. `grep -rn "localeCompare\|Intl.Collator" src tests` is empty.

---

## Risk Assessment

| Factor              | Value                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Likelihood          | Low: the compared strings are ASCII identifiers. Czech collation (`ch` after `h`) does reorder candidate roles, but changed none of the 1,197 sampled outputs |
| Impact if triggered | Medium: the same seed and settings would give a different phrase, which breaks determinism and replay keys                                                    |
| Detectability       | Low: no error; only a cross-locale comparison would show it                                                                                                   |
| Current mitigant    | None before this change                                                                                                                                       |

---

## Recommended Fix

**Short term:** Order these strings by UTF-16 code unit. Done in this change; generated output is
byte-identical.

**Medium term:** None needed.

**Long term:** Keep locale collation out of every comparison that can reach generated output.

---

## Extra Data

Checked on 2026-10-07 in Node, default locale fr-FR, against main before this change:

- Identity: 1,197 generated outputs hashed before and after, all equal: the 62 slow failed
  carry-in intents, phrase one of all 568 item-1 sweep cases (567 successes, 1 failure) and the
  567 carry-in phrase twos.
- Comparator agreement: an instrumented copy ran the old locale comparator next to the new one on
  every comparison made while generating the same 1,197 outputs. Pitch candidates: 8,137,955
  comparisons (14,656,747 string comparisons) and 845,510 sorted lists, all equal. Transform
  descriptors: 240,360 comparisons, none reached the case name. Over the pitch, rhythm and
  validation unit tests: 533,872 pitch, 1,404,776 transform (1,556 case-name) and 169 validator
  (140 detail) comparisons. Zero disagreements in all of them.
- Over 12 locales (en-US, fr-FR, de-DE, sv-SE, da-DK, tr-TR, lt-LT, cs-CZ, es-ES, ja-JP, zh-CN,
  ar), the five transform case names order the same as code units. The eight pitch roles do too,
  except in cs-CZ (16 of 832 ordered pairs differ). Main run under cs-CZ still gave the same 1,197
  outputs: the candidate order changed there, but no selected phrase did.
- Speed: the pitch candidate sort is about 4x faster (1,500 captured lists, median 63.5 ms to
  15.0 ms), since the code-unit guess, its collator confirmation and the order hint are gone. The 62
  slow failed carry-in intents went from 68.7 s and 70.6 s to 41.5 s and 42.3 s.

---

## References

- `src/domain/pitch/pitch-candidates.ts` (`compareCanonical`)
- `src/domain/rhythm/rhythm-expansion-memo.ts` (`descriptorOrder`), atom
  `docs/api_rhythm_domain_expansion.atom.md`
- `src/domain/validation/generation-result-validator.ts` (`ordered`)
- `tests/unit/domain/pitch/pitch-candidates.spec.ts`, `tests/unit/domain/pitch/pitch-planner.spec.ts`,
  `tests/unit/domain/rhythm/rhythm-prefilter-oracle.ts`: the oracles, now in code-unit order

---

## Change Log

- **2026-10-07**: Filed from the owner ruling and resolved in the same change.
