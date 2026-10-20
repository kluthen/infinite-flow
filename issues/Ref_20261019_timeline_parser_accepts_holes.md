# Issue: The timeline parser accepts a hole in its measures

**ID:** `Ref_20261019_timeline_parser_accepts_holes`
**Ref:** `ISS-013`
**Date:** 2026-10-19
**Severity:** Low
**Status:** Open
**Component:** `src/domain/events/timeline-parser.ts`
**Affects:** `src/storage/records/kept-session-body.ts` (a kept phrase's timeline),
`src/generation-worker/generation-worker-protocol.ts` (a worker result's timeline)

---

## Summary

`parseConcertEventTimeline`, the boundary parser for an untrusted timeline, accepts a
`measures` array with a hole (for example `[m0, , m2, m3]`) and returns a frozen timeline whose
second measure is `undefined`, instead of refusing it with a `TimelineParseError`. A kept
session's body read from the device goes through it, so a damaged body with such a hole reads as
a valid session and fails later, when it is drawn, instead of being reported as unreadable. v3.1
chunk 9 made the storage readers refuse kept arrays with holes (`kept-record-shape.ts`), but the
timeline is handed to this domain parser as it is.

---

## Technical Description

### Background

A boundary parser either returns a whole, valid value or throws its typed error, never a partial
value. The kept-session readers rely on that to report a damaged record as unreadable rather than
crash on it (v3.0's tolerant reading).

### The Problem Scenario

```
input: { measures: [m0, <hole>, m2, m3] }        // length 4, index 1 missing

measures.map(parseMeasure)      -> [p0, <hole>, p2, p3]   // map skips the hole, keeps it
makeConcertEventTimeline(...)
  length === 4                  -> passes
  measures.forEach(check index) -> skips the hole, passes
  [first, second, third, fourth] = measures   // second is undefined
  deepFreeze({ measures: [...] })            -> returned as valid

caller: kept-session-body.ts readPhrase -> session reads as readable
later:  the review engraves measure 1 -> TypeError on undefined
```

Probed on `v3.1-w2` (2026-10-19) with a real timeline from
`tests/fixtures/replay-keys/v3.0-neutral-jazz.json`: the sparse copy was accepted and
`measures[1]` was `undefined`.

### Where This Pattern Exists Today

- `src/domain/events/timeline-parser.ts`, `parseConcertEventTimeline`: `measures.map(...)`.
- `src/domain/events/timeline.ts`, `makeConcertEventTimeline`: the length check and
  `forEach` both pass a hole.
- `src/domain/events/measure-parser.ts`, `parseMeasure`: `events.map(...)` has the same shape;
  whether `makeMeasure`'s tiling check refuses a hole there is not checked yet.

---

## Risk Assessment

| Factor              | Value                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| Likelihood          | Low: the app never writes a sparse array; it takes a damaged or foreign write to the device's store  |
| Impact if triggered | Medium: opening that kept session fails when drawn instead of the session being listed as unreadable |
| Detectability       | Medium: a thrown error at engraving time, not at the read where the damage is                        |
| Current mitigant    | Structured clone keeps arrays as written, and no code path writes a hole; worker results are our own |

---

## Recommended Fix

**Short term:** refuse a hole in `parseConcertEventTimeline` (every index of `measures` present,
`Object.hasOwn`), as `TimelineParseError`, with a unit test; check `parseMeasure`'s `events` the
same way and add the test either way.

**Medium term:** look over the other hand-written boundary parsers under `src/domain/` and
`src/generation-worker/` for `map` or `forEach` over an untrusted array, and refuse holes there too.

**Long term:** one shared "dense array" guard for every boundary parser, so the rule is stated
once (storage has its own in `kept-record-shape.ts`).

---

## Extra Data

Found by v3.1 chunk 9 (merged dee61a7) and sent to `spec-writer`, who routed it here (spec D375):
no v3.1 chunk owns the timeline parser, and the fix changes no v3.1 behaviour. It is a
domain-boundary fix with no `@spec-link` change beyond `entity_concert_event_timeline`.

---

## References

- `src/domain/events/timeline-parser.ts`
- `src/domain/events/timeline.ts`
- `src/domain/events/measure-parser.ts`
- `src/storage/records/kept-session-body.ts`
- `src/storage/records/kept-record-shape.ts`
- [v3.1 build plan, chunk 9](../specs/versions/v3/build-plan-v3.1.md#chunk-9--kept-sessions-hold-the-levels-and-the-preset-label)
