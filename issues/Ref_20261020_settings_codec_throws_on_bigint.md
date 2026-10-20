# Issue: The settings codec throws on a stored BigInt or circular control value

**ID:** `Ref_20261020_settings_codec_throws_on_bigint`
**Ref:** `ISS-014`
**Date:** 2026-10-20
**Severity:** Low
**Status:** Resolved
**Component:** `src/storage/records/settings-record.ts`
**Affects:** `src/storage-bootstrap.ts` (`loadSavedData`), `src/main.ts` (the app's mount)

---

## Summary

`decodeSettings`, the tolerant reader of the saved settings, can throw on what was stored, which
its own contract forbids ("Never throws for what was stored"). A control record whose value is a
BigInt or a circular object reaches `validateControlValue`, whose refusal message calls
`JSON.stringify(value)`; that throws a `TypeError` instead of the `GenerationControlError` the
codec catches, so the error leaves `decodeSettings`, `loadSavedData` rejects, and the app never
mounts. A v3.0 defect (v3.0 chunk 6's tolerant settings codec); v3.1 chunk 16's preset-record
reader guards against the same case.

---

## Technical Description

### Background

v3.0's tolerant loading reads each stored setting on its own: a missing, damaged, newer or
invalid record gives that setting its default, silently, and never disturbs another one. IndexedDB
stores values by structured clone, which keeps a BigInt and a circular object as written, so a
record can hold a value no JSON encoder can write.

### The Problem Scenario

```
stored record: { key: 'controls.collection', value: 10n }   // or a circular object

decodeSettings
  read('controls.collection', controlValue(COLLECTIONS, 'Collection'), fallback)
    controlValue -> refusedAs(() => validateControlValue(COLLECTIONS, 10n, 'Collection'),
                              GenerationControlError)
      validateControlValue: 10n is not in the catalog
        throw new GenerationControlError(`... ${JSON.stringify(10n)}.`)
          JSON.stringify(10n) -> TypeError: Do not know how to serialize a BigInt
    refusedAs: TypeError is not a GenerationControlError -> rethrown
  -> decodeSettings throws

loadSavedData -> rejects ("a defect, left unhandled")
main.ts       -> createApp(...).mount never runs: the page shows only its background,
                 on every visit, until the record is removed
```

Every parser built with `controlValue` in `CONTROL_PARSERS` has this shape (the twelve catalog
controls, and the instrument through `readInstrument`). The figure levels (`oneOf`), the mix
volumes (`typeof` first) and the switches are not affected.

### Where This Pattern Exists Today

- `src/storage/records/settings-record.ts`: `controlValue`, used by `CONTROL_PARSERS` and
  `readInstrument`; `refusedAs` rethrows anything but the named refusal.
- `src/domain/controls/generation-controls.ts`: `validateControlValue` writes the refused value
  with `JSON.stringify`.
- Guarded already: `src/storage/records/preset-record.ts`, `heldControl` (v3.1 chunk 16) returns
  the first-load value for any non-string before calling the validator.

---

## Risk Assessment

| Factor              | Value                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Likelihood          | Very low: the app writes only catalog strings; it takes a hand-edited (devtools) or corrupted database                    |
| Impact if triggered | High for that browser: the app shows a blank page on every visit, and Delete everything, inside the app, can't be reached |
| Detectability       | Low: an unhandled rejection in the console, nothing on the page                                                           |
| Current mitigant    | No code path writes a non-string control value; clearing the site's data in the browser recovers                          |

Severity is Low for the likelihood; the impact, should it happen, would argue for Medium.

---

## Recommended Fix

**Short term:** in `controlValue` (and so `readInstrument`), return unreadable for any value that
is not a string before calling `validateControlValue`, as chunk 16's `heldControl` does, with a
unit test of `decodeSettings` over a stored BigInt and a circular object for a control (that
setting gets its default, every other setting still loads).

**Medium term:** make `validateControlValue`'s refusal message safe for any value (write it with
a guarded formatter, or `String(value)` inside a `try`), so no caller depends on its own pre-check.

**Long term:** one shared rule, tested once, that a tolerant reader turns every throw of a domain
validator on stored data into unreadable, or an `@spec-link` test over every tolerant reader with
values JSON cannot write.

---

## Extra Data

Found by v3.1 chunk 16 (16a, 12d6422), whose preset-record reader guards against it; routed by
`spec-writer` to this tracker (spec D380): the defect is v3.0's, and no v3.1 chunk owns the
settings codec's control parsers. The atom it breaks is `rule_saved_settings_load_tolerantly`.

---

## References

- `src/storage/records/settings-record.ts`
- `src/domain/controls/generation-controls.ts`
- `src/storage/records/preset-record.ts`
- `src/storage-bootstrap.ts`
- `src/main.ts`
- [v3.1 build plan, chunk 16](../specs/versions/v3/build-plan-v3.1.md#chunk-16--presets-and-levels-on-the-device)

---

## Change Log

- **2026-10-20**: Resolved before v3.1 wave 3's merge, the owner's "Fix before merging" (spec
  D383), in e4c6a9b on `v3.1-w3`, outside any chunk. `controlValue`
  (`src/storage/records/settings-record.ts`), and through it `readInstrument`, refuses any value
  that is not a string before calling `validateControlValue`, the same guard as chunk 16's
  `heldControl`, so that control falls back to its first-load value and every other setting still
  loads. Unit tests in `tests/unit/storage/settings-record-unserializable.spec.ts`: a stored BigInt
  and a circular value, every control holding one at once, and `loadSavedData` resolving. The
  medium- and long-term fixes are not taken.
