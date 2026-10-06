# Issue: A failed carry-in attempt can take 6 to 13 seconds, and its retries repeat it

**ID:** `Ref_20261006_failed_carry_in_attempts_slow`
**Ref:** `ISS-009`
**Date:** 2026-10-06
**Severity:** High
**Status:** Open
**Component:** `src/session/failure-ladder.ts`
**Affects:** `src/domain/generation/orchestration/generation-orchestrator.ts`,
`src/domain/generation/orchestration/search-ledger.ts`, `src/session/session-engine.ts`,
`src/generation-worker/generation-worker-client.ts`

---

## Summary

During a session, a carry-in generation attempt that fails can run for 6 to 13 seconds before it
reports its failure. That happens when its window is searched to exhaustion or its search
allowance (250,000 fuel units) runs out. The failure ladder then makes three more carry-in
attempts with the same carry-in and fresh seeds, and each one fails the same way in the same time.
The standalone rung comes only after that. The app has one generation worker, so the phrase misses
its deadline and is repeated, and later phrases wait behind the attempts still running.
Definition-of-done item 1 asks that, for every seed and supported setting, every phrase after the
first be generated before its deadline at 60, 120 and 240 BPM. For seven of the 568 sweep cases, listed below, it is not.
Successful attempts are fast, 280 ms at most, so the published latency figures, which measure
successes, do not show this.

---

## Technical Description

### Background

Each look-ahead phrase climbs the failure ladder: a carry-in attempt, three carry-in retries, then
one standalone attempt. If no valid phrase exists at the deadline, the phrase before is repeated.
The deadline is three measures after the request: 3 s at 240 BPM, 6 s at 120 and 12 s at 60.
Phrase 2's deadline is one measure. At the deadline the engine drops the attempt in flight, but the
worker keeps computing it, and the next request queues behind it.

### The Problem Scenario

Case #344 of the item-1 sweep, run at 60 BPM: Eighth, Heavily varied, Sparse, Active displacement,
Settled tension; seed 7; E♭ alto; Low register; C Mixolydian; Neutral profile; no session flags.

```
look-ahead request for phrase N (deadline 12 s later at 60 BPM)
  carry-in attempt 0  ── 12.8 s ── window_search_limit_exceeded   (deadline already passed)
  carry-in retry 1    ── 12.9 s ── window_search_limit_exceeded
  carry-in retry 2    ── 12.9 s ── window_search_limit_exceeded
  carry-in retry 3    ── 12.7 s ── window_search_limit_exceeded
  standalone retry 4  ── fast   ── success
```

The worker is busy for about 51 s. Phrase N is a repeat, and so are the phrases whose requests
queue behind these attempts. After the second repeat in a row the struggling notice shows.

### Where This Pattern Exists Today

- `src/session/failure-ladder.ts`: `LADDER` puts three carry-in retries before the standalone rung,
  and a retry keeps the carry-in. A window found exhausted is searched again in full.
- `src/domain/generation/orchestration/search-ledger.ts`: `DEFAULT_WINDOW_SEARCH_FUEL = 250_000`,
  the v1 allowance, applies to carry-in attempts too. The successful attempts measured used at most
  71,551 units.
- `src/session/session-engine.ts`: at the deadline the attempt in flight is dropped. The generation
  worker (`src/generation-worker/generation-worker-client.ts`) is not told and keeps computing.

---

## Risk Assessment

| Factor              | Value                                                                                                                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Likelihood          | Low per phrase: in a sweep of 568 six-phrase sessions timed at real cost, 7 sessions miss at least one deadline. The settings are deterministic, so a player who keeps such settings meets it again. |
| Impact if triggered | Medium: the session keeps running, but several phrases in a row are repeats and the struggling notice shows. Item 1 of the definition of done is not met for those settings.                         |
| Detectability       | Low in normal use. The fake-clock tests answer every attempt at once, and the latency measurements only time successes. Only a sweep that times failed attempts shows it.                            |
| Current mitigant    | The failure ladder: the session never stops, and the standalone rung succeeds.                                                                                                                       |

---

## Recommended Fix

**Short term:** Decide whether v2.0 is tagged with this as a known limitation in the release notes,
or waits for the fix. The fixes below change the failure ladder's behaviour and its STABLE atom
`rule_session_generation_failure_ladder`. They need the spec owner first.

**Medium term:** Stop repeating a search that has already failed for good:

- When a carry-in attempt fails because its window was searched to exhaustion, skip the remaining
  carry-in retries and go straight to the standalone rung. If the seed only reorders the search,
  another seed cannot succeed.
- Give carry-in attempts a smaller fuel allowance than the v1 default, above the 71,551 units the
  slowest measured success used. Standalone and Idle generation keep the v1 allowance, so their
  output stays byte-identical to v1.
- Check how fuel maps to time: the measured cost ranges from 2 µs to 51 µs per fuel unit, so a
  fuel cap alone does not bound the time.

**Long term:** Let the engine cancel an attempt it has dropped: restart the worker, or check a
cancellation flag between windows. Then a dropped attempt no longer delays the next request.

---

## Extra Data

On 2026-10-06 every attempt of the item-1 sweep was timed: the 568 cases (all 284 supported rhythm
settings × seeds 7 and 13, other controls round-robin), six-phrase sessions at 60 BPM, real
generator in Node, load average about 1.5.

- 2,612 attempts in total: 2,520 succeeded and 92 failed (80 `window_exhausted`, 12
  `window_search_limit_exceeded`).
- Successes took 280 ms at most, p99 68 ms. They used at most 71,551 fuel units, p99 5,606.
- Failures took p50 83 ms, and 16 failures took more than 1 s, four attempts in each of four
  sequences:
  - #344, the case above: 4 × 12.8 s, `search_limit_exceeded`.
  - #349 (Eighth, Heavily varied, Sparse, Active displacement, Build; seed 13; C keyboard; Varying
    register; F♯ Ionian; Jazz; Vary settings and Tension across phrases on), two sequences:
    4 × 5.9 s `exhausted`, and 4 × 12.8 s `search_limit_exceeded`.
  - #354 (Eighth, Heavily varied, Conversational, Straight, Lift; seed 7; B♭ tenor; High
    register; B Major; Neutral; both flags on): 4 × 6.8 s, `exhausted`.
- Two more sequences took about 0.5 s per attempt and fit every deadline: #205 and #407.
- In each sequence the four attempts take the same time, to within about 2 %.
- The window outcomes above (`window_exhausted`, `window_search_limit_exceeded`) reach the session
  as the generation failure codes `no_legal_pitch_plan` and `search_limit_exceeded`.

The same day the full sweep was run with each attempt timed at its real cost: each attempt was
charged its measured generation time plus 0.1 s for the worker round trip and engraving, on one
serial worker that keeps computing a dropped attempt. That is the `test:sweep` script on branch
`gate-sweep-density`, not merged. The machine was not idle: load average 2 to 4. Real costs change
which phrases repeat, and so which requests follow, and more cases miss a deadline:

| Case | Tempos       | Phrase numbers repeated at their deadline | Slow attempts                                                                      |
| ---- | ------------ | ----------------------------------------- | ---------------------------------------------------------------------------------- |
| #344 | 60, 120, 240 | 6                                         | 12.25 s, `search_limit_exceeded`                                                   |
| #349 | 60, 120, 240 | 3 to 6                                    | 5.8 s and 2.7 s `no_legal_pitch_plan`, then 12.3 to 14.6 s `search_limit_exceeded` |
| #354 | 60, 120, 240 | 6                                         | 5.8 to 6.7 s, `no_legal_pitch_plan`                                                |
| #498 | 60; 120, 240 | 3 and 4; 3 to 6                           | one attempt of 27.96 s, `search_limit_exceeded`                                    |
| #527 | 60, 120, 240 | 5 and 6                                   | 6.2 to 6.5 s, `no_legal_pitch_plan`                                                |
| #466 | 120, 240     | 4 to 6                                    | 2.1 to 6.1 s, `no_legal_pitch_plan`                                                |
| #474 | 240          | 4                                         | three of 0.84 to 0.92 s, `search_limit_exceeded`, over the 3 s window              |

Every Quarter case met every deadline at every tempo. Seven of the 568 cases miss at least one
deadline, all at Eighth or Sixteenth density.

---

## References

- `specs/versions/v2/master-spec.md` §11 item 1 and §4, the look-ahead and the failure ladder.
- `docs/rule_look_ahead_deadline.atom.md`, `docs/rule_session_generation_failure_ladder.atom.md`
- `tests/unit/session/session-deadline-sweep-failures.spec.ts`, the injected-failure ladder at 60,
  120 and 240 BPM.
- `docs/generation-latency.md`: the timing of successful generations.
