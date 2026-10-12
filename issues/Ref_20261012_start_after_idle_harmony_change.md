# Issue: Start throws when a harmony setting changed at Idle after phrase 1 was generated

**ID:** `Ref_20261012_start_after_idle_harmony_change`
**Ref:** `ISS-011`
**Date:** 2026-10-12
**Severity:** High
**Status:** Open
**Component:** `src/session/session-engine.ts`
**Affects:** `src/components/workspace/workspace-session-start.ts`, `src/session/session-pregeneration.ts`, `src/components/workspace/workspace-pregeneration.ts`

---

## Summary

At Idle, an ordinary control edit never regenerates the phrase on screen, and Start freezes the
current controls as the session's settings while phrase 1 stays the Idle phrase. When the player
changes a harmony setting (for example the tonal center) after phrase 1 was generated and then
presses Start, the session engine opens phrase 2 as if phrase 1 had been generated under the new
settings (`lastDecidedSettings` is the start settings), so it builds a carry-in from a phrase in the
old key under the new harmony settings. The carry-in validation throws `CarryInError` ("The carried
chord is not one these harmony settings end a phrase on.") and the start is abandoned. It shows at
any tempo where phrase 2's first attempt is a carry-in (60 and 120 BPM); at 240 BPM phrase 2 starts
from the standalone rung and the session starts.

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
| Current mitigant    | Regenerating after the change; 240 BPM sessions are not affected                         |

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
test: `CarryInError: The carried chord is not one these harmony settings end a phrase on.` The
engine's start logic is unchanged since v2.0, so v2.0 likely has it too (not checked on the tag).
Found by chunk 24's pre-generation work.

---

## References

- `src/session/session-engine.ts`
- `src/session/session-settings-change.ts` (`lookAheadBasis`)
- `src/domain/generation/carry-in/carry-in-fit.ts`
- `src/components/workspace/workspace-session-start.ts`
- `docs/rule_setting_change_rechecks_pitch_carry_in.atom.md`, `docs/rule_phrase_one_is_idle_phrase.atom.md`
