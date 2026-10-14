# Issue: The review host looks up the instrument name by id, which throws for my instrument

**ID:** `Ref_20261014_review_host_my_instrument_name`
**Ref:** `ISS-012`
**Date:** 2026-10-14
**Severity:** Medium
**Status:** Open
**Component:** `src/components/workspace/use-review-host.ts`
**Affects:** the review of a session played with my instrument (its title's instrument name); v3.0 build plan chunks 10 (fix) and 17 (makes such a session playable)

---

## Summary

The review host names the reviewed session's instrument with `getInstrumentProfile(id)`, a
lookup over the built-in profiles that throws for `my-instrument` by design (my instrument's
profile travels as data). Once a session can be played with my instrument (v3.0 chunk 17), its
review would throw when it computes the instrument name, so the review of that session would
crash. Latent today, not reachable: no session can be played with my instrument yet. It predates
wave 3 (same code on `main` 488d9e0).

---

## Technical Description

### Background

Since v3.0 chunk 16, a generation intent carries my instrument's profile as data, and the built-in
lookup refuses `my-instrument`. Everything that needs the profile should read it from the data the
session holds: each phrase's intent has its own `instrumentProfile` (the exports already read it
there), and chunk 9's kept-session summary holds `instrument: { id, displayName }`.

### The Problem Scenario

1. Chunk 17 lands: a session can be played with my instrument.
2. The session ends and its review opens.
3. The review host's `instrumentName` computed runs:

```ts
// src/components/workspace/use-review-host.ts:94
return history === null ? '' : getInstrumentProfile(history.instrumentProfileId).displayName

// src/domain/generation/generation-intent.ts:78-81 (for MY_INSTRUMENT_ID)
throw new GenerationIntentError(`"${MY_INSTRUMENT_ID}" has no built-in profile to look up: its profile travels as data beside the controls.`)
```

4. The computed throws while the review renders.

### Where This Pattern Exists Today

- `src/components/workspace/use-review-host.ts:92-95` (`instrumentName`, the review's title).
- Not affected: the exports (`src/session/session-history-export.ts:36-44` reads
  `record.intent.instrumentProfile`).
- Other by-id lookups that would refuse my instrument exist in the controls
  (`src/components/controls/FoundationControls.vue:157`, `src/components/workspace/WorkspaceShell.vue:166`)
  and `src/session/carry-in-adaptation.ts:96`; they belong to chunks 17 and 20's scope, not to this
  issue.

---

## Risk Assessment

| Factor | Value |
|---|---|
| Likelihood | High once chunk 17 lands (every my-instrument session's review); nil before |
| Impact if triggered | High: the review of the session, and its exports, cannot be reached |
| Detectability | High: an uncaught `GenerationIntentError` on opening the review |
| Current mitigant | No session can be played with my instrument yet (the instrument control offers the built-ins only; `buildAttemptIntent` refuses `my-instrument`) |

---

## Recommended Fix

**Short term:** in v3.0 chunk 10 (wave 5, beside chunk 17), read the review's instrument name from
the session's own data, never by id: the phrase intent's `instrumentProfile.displayName` for the
session that just ended, the kept summary's `instrument.displayName` for a kept session. Unit test
with a `my-instrument` history.

**Medium term:** chunk 17 and chunk 20 remove the other by-id lookups that a my-instrument session
or control value reaches.

**Long term:** keep `getInstrumentProfile` for built-ins only, and route every view of a session's
instrument through the profile the session holds.

---

## Extra Data

Found during the v3.0 wave 3 (chunk 9 review), confirmed by reading the code on `v3.0-w3`
(fcabf7f) and on `main` 488d9e0.

---

## References

- `src/components/workspace/use-review-host.ts`
- `src/domain/generation/generation-intent.ts`
- `src/storage/records/kept-session-summary.ts` (`KeptSessionInstrument`)
- `specs/versions/v3/build-plan.md` (chunk 10, chunk 17)
