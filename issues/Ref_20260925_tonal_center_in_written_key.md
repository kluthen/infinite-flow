# Issue: The tonal-center selection should be the written key of the instrument, and transposition should be instrument data

**ID:** `Ref_20260925_tonal_center_in_written_key`
**Ref:** `ISS-003`
**Date:** 2026-09-25
**Severity:** Medium
**Status:** Resolved
**Component:** `src/domain/notation/pitch-spelling.ts`
**Affects:** `src/domain/notation/notation-mode.ts` (closed `NotationMode` set and literal transposition types), `src/domain/profile/instrument-profile(s).ts` (templates gain transposition), `src/composables/generation-session-profile-switch.ts` (switch policy), `src/domain/generation/generation-intent.ts` (written→concert conversion), `src/domain/controls/generation-controls.ts` (tonal-center control), `src/components/controls/*` (tonal-center picker labels), `src/notation/vexflow-engraver.ts` (key signature), `specs/first-release-master-spec.md` §Tonal context / §Notation, `ui_ux/` control docs, ATD atoms `module_notation_display_convention`, `rule_notation_display_preserves_phrase`, `rule_profile_switch_validates_phrase`, `contract_infinite_flow_first_release`

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

## Settled Semantics (2026-09-25, spec-writer session)

These decisions answer the four open questions listed under Recommended Fix. Source: `specs/archive/2026-09-25-decisions-D47-D71.md` D56–D58, and the persona P1 in `specs/personas/personas.md`.

1. **Transposition belongs to the instrument template** (D56a). Keyboard is concert, B-flat tenor is +14/+8, E-flat alto is +9/+5. The separate notation-display selector is removed.
2. **The tonal center and scale are read in the instrument's written pitch** (D56b). C Ionian on tenor is written C major with an empty key signature, which is concert B-flat Ionian. The written selection is converted to the concert tonal center at request construction, so the generator stays concert-only.
3. **Switching instrument keeps the written key** (D56c). The concert key changes and the phrase regenerates. This replaces the keep-the-phrase-if-it-fits switch policy. Switching is expected to be rare.
4. **v1.0 has no Concert-display override** (D56d), and therefore no "(written for B♭)" picker label: the picker simply names the written key.

### Extended scope: adding an instrument preset must be easy (D57)

- **Today (confirmed in code):**
  - `NotationMode` is a closed union: `'Concert' | 'B-flat tenor' | 'E-flat alto'`.
  - `DisplayTransposition` uses literal types: `chromatic: 0 | 9 | 14`, `diatonic: 0 | 5 | 8`.
  - Instrument profiles carry no transposition.
  - So adding, for example, a B-flat clarinet or soprano (+2/+1) or a baritone (+21/+12) would need type changes across notation and controls.
- **Required:**
  - Transposition is a validated data field (chromatic and diatonic interval) on each declarative instrument template.
  - Adding a preset means adding one template entry plus its validation fixtures. It needs no new type members, no enum edits and no per-instrument UI branches.
  - Add a test that proves this: a test-only template with an unusual transposition passes through request construction, spelling and engraving.

### Contract

`contract_infinite_flow_first_release` may be amended for v1.0 (D58). Its STABLE range invariant is unaffected. The clause "notation display transposition never alters those source events or generation constraints" needs rewording once there is no display selector. Documentalist proposes the wording and the version bump, and a human confirms them.

---

## Recommended Fix

**Short term:** ~~Decide the semantics~~ Done; see Settled Semantics above. Next: ux-writer updates the control docs (the display selector is removed and the key picker is labeled in written pitch). Then coding-leader implements. The original questions were:

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

---

## Change Log

- **2026-09-25**: The semantics are settled by a spec-writer session (D56). The scope is extended so that transposition becomes instrument-template data and adding new instrument presets stays easy (D57). The contract may be amended (D58). The status stays Open until implementation.
- **2026-09-26**: The master spec was amended to draft v2.0 for D56/D57 (Scope, Player Controls → Tonal context, Architecture and Boundaries, Application State, Notation, Definition of Done). The line references above predate that amendment. The execution plan is in `specs/versions/v1/gate-execution-report.md`.
- **2026-09-26**: Resolved. `InstrumentProfile` gained an open `transposition: { chromatic: number; diatonic: number }` field (`src/domain/profile/instrument-profile.ts`), validated by `assertConsistentTransposition` (integers, and a chromatic/diatonic pair no more than a double accidental apart from a diatonic-only move) so a new preset is one data entry with no new type members: C keyboard `{0, 0}`, B-flat tenor `{14, 8}`, E-flat alto `{9, 5}`. `NotationMode`, `DisplayTransposition`, `DISPLAY_TRANSPOSITIONS` and the notation-display selector are removed (`src/domain/notation/notation-mode.ts` deleted, `src/domain/generation/profile-switch.ts` deleted along with its "keep the phrase if it fits" policy, since a profile switch now always regenerates when a phrase is shown per D56c). `GenerationIntent` gained `writtenTonalCenter` (the raw written selection) alongside the existing `controls.tonalCenter`, which the generator still reads as concert-only; `createGenerationIntent` converts written to concert via `concert pc = (written pc − chromatic) mod 12` before constructing controls, so the pitch generator and golden fixtures never see a written value. The generation-worker wire protocol (`src/generation-worker/generation-worker-protocol.ts`) does carry `writtenTonalCenter` alongside the derived concert `controls.tonalCenter`: it re-derives concert from the wire's `writtenTonalCenter` and rejects a request whose `writtenTonalCenter` is missing or invalid, or whose `controls.tonalCenter` was tampered out of sync with that re-derivation. The tonal-center control is labelled "Written key" (D38) and the key signature is spelled from the written selection. `transformToWrittenPhrase` still accepts an arbitrary `InstrumentTransposition` directly, so an unforeseen transposition pair (`tests/unit/domain/notation/written-phrase.spec.ts`, "TEST-ONLY instrument transposition") passes end to end with no code change outside that test. `selectInstrumentProfile` (`src/composables/generation-session-profile-switch.ts`) now has exactly three outcomes: apply the control alone with no prior phrase, always regenerate with a fresh seed and identity when a phrase is shown (unconditionally — the switch policy never compares the two profiles' transpositions; no shipped first-release profile pair actually shares one anyway), or clear the phrase without generating when the new controls are themselves an unsupported rhythm setting — covered for every ordered pair of the three first-release profiles in `tests/unit/composables/generation-session-workspace.spec.ts` and at e2e level in `tests/e2e/release/profile-switch.spec.ts`. `generation-outcome-golden.spec.ts`, `pitch-search-equivalence.spec.ts`, `chromatic-figure-selection.spec.ts` and `generation-seed-matrix.spec.ts` all pass with byte-identical hashes (the golden-fixture test harness was updated to pass each case's already-recorded concert value through as its equivalent written value, since `createGenerationIntent` now treats that field as written; the generator's own behavior for a given concert input is unchanged). `grep -rniE "NotationMode|DisplayTransposition|DISPLAY_TRANSPOSITIONS|setNotationMode" src tests` finds only one intentional negative assertion. `npm run typecheck` and `npm run quality` are both green, including the full e2e/a11y/notation suites; `npm run measure:latency` and `measure:latency:browser` show no regression (cold median 33.5ms/p95 288.6ms, worst-case browser cold 324ms/warm 86ms).
