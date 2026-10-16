# Issue: Start throws when a harmony or register setting changed at Idle after phrase 1 was generated

**ID:** `Ref_20261012_start_after_idle_harmony_change`
**Ref:** `ISS-011`
**Date:** 2026-10-12
**Severity:** High
**Status:** In Progress
**Component:** `src/session/session-engine.ts`
**Affects:** `src/components/workspace/workspace-session-start.ts`, `src/session/session-pregeneration.ts`, `src/components/workspace/workspace-pregeneration.ts`

---

## Summary

At Idle, an ordinary control edit never regenerates the phrase on screen, and Start freezes the
current controls as the session's settings while phrase 1 stays the Idle phrase. When the player
changes the Written key (any other key), the Collection (any change, even Ionian to Major) or the
Register (Middle to Low or High) after phrase 1 was generated, and then presses Start, the session
engine opens phrase 2 as if phrase 1 had been generated under the new settings
(`lastDecidedSettings` is the start settings), so it builds a carry-in from a phrase made under
the old settings. The carry-in validation throws `CarryInError` ("The carried chord is not one
these harmony settings end a phrase on." or "The carried window is the Middle window, but the
register choice is Low.") and the start is abandoned: nothing visible happens, and the only trace
is the console error. A Harmonic motion change triggers it sometimes, depending on phrase 1. It
shows at every tempo from 60 to 220 BPM, where phrase 2's first attempt is a carry-in; at 230 and
240 BPM phrase 2 starts from the standalone rung and the session starts. Tension, Note density,
Contour, Leapiness, Arpeggio chaos, Silence density, the tempo, and the Jazz profile (Register
Varying) never trigger it.

---

## Technical Description

### Background

Mid-session settings changes adapt the carry-in to the change (`lookAheadBasis` →
`adaptCarryIn`, `rule_setting_change_rechecks_pitch_carry_in`,
`rule_key_change_drops_harmonic_carry_in`). At Start nothing adapts it: the engine assumes phrase 1
was generated under the settings the session starts with.

### The Problem Scenario

1. Idle shows phrase 1, generated in C major.
2. The player changes the tonal center to F♯ (no regeneration: ordinary edits never generate).
3. The player presses Start at 60 BPM.
4. `createSessionEngine` → `requestNextPhrase` → `lookAheadBasis(phraseOne, settings, settings, carryIn)`:
   same settings object, so no adaptation.
5. `buildAttemptIntent` → `makeCarryInGenerationIntent` → carry-in fit check throws `CarryInError`.
6. `workspace-session-start.ts` abandons the start and rethrows; no session starts.

```ts
createSessionEngine(deps, {
  settings: { controls: { ...controls, tonalCenter: 'F#', tempo: 60 } },
  phraseOne: phraseOneGeneratedIn('C'),
  /* ... */
}) // throws CarryInError
```

### Where This Pattern Exists Today

- `src/session/session-engine.ts` `createSessionEngine`: `lastDecidedSettings: settings`.
- v3.0 chunk 24's pre-generation plan (`src/session/session-pregeneration.ts`, `initialCourse`) makes
  the same assumption on purpose, so that its phrases equal the session's; its orchestrator treats
  the `CarryInError` as "nothing to pre-generate for this phrase 1 under these settings" until the
  queue's key changes, so the defect stays where it was (at Start) and adds no error at Idle.

---

## Risk Assessment

| Factor              | Value                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------- |
| Likelihood          | Medium: changing the key and pressing Start without regenerating is an ordinary sequence |
| Impact if triggered | High: the session does not start; the error goes to the console                          |
| Detectability       | Medium: an uncaught error from the Start click; nothing on screen explains it            |
| Current mitigant    | Regenerating after the change; 230 and 240 BPM sessions are not affected                 |

---

## Recommended Fix

**Short term:** Ask `spec-writer` which behaviour holds when settings changed at Idle after phrase
1: adapt the carry-in at Start as a mid-session change does (phrase 1 treated as generated under its
own settings), or make Start (or the start conditions) require phrase 1 to match the settings.

**Medium term:** Implement the ruling in the session layer, shared by the engine and the
pre-generation plan (`openNextPhrase` / the initial course), with an engine test for each harmony,
register and collection change at Idle.

**Long term:** Derive "the settings a phrase was generated under" from the phrase record itself
everywhere, instead of carrying a parallel settings value.

---

## Extra Data

Reproduced on 2026-10-12 on commit aec8f63 (v3.0 wave 2, before chunk 24) with a direct engine
test: `CarryInError: The carried chord is not one these harmony settings end a phrase on.` Found
by chunk 24's pre-generation work. Reproduced on v2.0.0 on 2026-10-12 (the production build,
driven through the interface): triggered by a Written key, Collection or Register change at Idle
(sometimes Harmonic motion), at every tempo from 60 to 220 BPM; not at 230 or 240 BPM.

---

## Settled Semantics (2026-10-13, spec D297)

The owner's ruling, 2026-10-13: "it's not urgent. plan it for the end of v3.0" (no v2 hotfix), and
"i'd say regenerate prior starting session (more like: when starting session says the current
phrase is stale and ask either to regenerate or use it)". Written into `specs/decisions.md` D297
and master spec Part A v1.11 §16 (`specs/versions/v3/master-spec.md`).

1. **Stale:** phrase 1 was generated under settings that differ, in what the generation reads,
   from the current ones. The tempo, Rising tempo, Vary settings, Tension across phrases, the
   mix, the theme, my instrument's clef and name, and the window's width never count.
2. **When Start is pressed (or the starting note played) on a stale phrase 1,** once every start
   condition holds, the app says so and asks: **Regenerate** or **Use it**. Nothing starts before
   the answer.
3. **Use it** starts the session with phrase 1 unchanged. Phrase 2 joins it as after a settings
   change applied at the boundary between phrase 1 and phrase 2 during a session: the existing
   rules adapt the carry-in (`rule_setting_change_rechecks_pitch_carry_in`,
   `rule_key_change_drops_harmonic_carry_in`, `rule_harmony_change_drops_unfit_harmonic_carry_in`,
   `rule_register_change_replaces_carried_window`), so `CarryInError` cannot occur. This is the
   short-term fix's first option, with phrase 1 treated as generated under its own settings.
4. **Regenerate** (the owner's ruling, 2026-10-13, closing spec O182): runs the Idle Regenerate
   and stays at Idle with the new phrase on screen; the player presses Start again.
5. **Pre-generation** keeps running with a stale phrase 1 and builds the phrases Use it plays;
   its quiet stop on `CarryInError` goes.
6. **The starting note asks too:** a STABLE contract wording (`rule_midi_starting_note`), accepted
   by the owner on 2026-10-13 as a MAJOR change (CONTRACT 5.0).

**Planned:** v3.0 build plan v9, chunk 24b, Stale phrase at Start, in wave 9, before the release
gate (chunk 26, wave 10), after the **Stale phrase design** gate (`ux-writer`)
(`specs/versions/v3/build-plan.md`).

---

## References

- `src/session/session-engine.ts`
- `src/session/session-settings-change.ts` (`lookAheadBasis`)
- `src/domain/generation/carry-in/carry-in-fit.ts`
- `src/components/workspace/workspace-session-start.ts`
- `docs/rule_setting_change_rechecks_pitch_carry_in.atom.md`, `docs/rule_phrase_one_is_idle_phrase.atom.md`
- `specs/decisions.md` D297; `specs/versions/v3/master-spec.md` §16; `specs/versions/v3/build-plan.md` chunk 24b

---

## Change Log

- **2026-10-13**: Scope corrected after the reproduction on v2.0.0 (tempo range 60–220 BPM;
  Collection and Register changes trigger it, Harmonic motion sometimes). The owner's ruling
  recorded (spec D297); the fix planned as v3.0 build plan chunk 24b, wave 9. Status stays Open.
- **2026-10-13**: The owner settled both open points the same day: Regenerate stays at Idle (spec
  O182 closed) and the starting-note wording is accepted, MAJOR (CONTRACT 5.0). Status stays Open.
- **2026-10-16**: The fix landed on `v3.0-w9` as v3.0 chunk 24b. 24b-1: the Idle result records the
  settings it was generated under, the session start and the pre-generation plan carry phrase 1's
  own settings, so phrase 2's carry-in is adapted as after a change at the phrase 1/2 boundary
  and no `CarryInError` occurs at any tempo (engine tests over every Written key, Collection,
  Harmonic motion and Register change at 60 to 240 BPM); the queue's quiet stop is gone. 24b-2:
  Start and the starting note open the stale-phrase prompt on a stale phrase 1. Status In
  Progress until the wave-9 gate and hand check H9 pass; then Resolved.
