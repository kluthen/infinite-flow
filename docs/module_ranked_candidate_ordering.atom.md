---
id: module_ranked_candidate_ordering
status: REVIEW
layer: ARCHITECTURE
human_name: Ranked Candidate Ordering
type: MODULE
priority: 1
version: 0.3
tags: generation
parents:
  - [[entity_concert_event_timeline]]
dependents: []
notes: Revised 2026-10-08 (version 0.2 to 0.3) as a precision fix found by the v3.1 and v3.2 spec ingestion: the rhythm tie-key batch visits candidate identities in UTF-16 code-unit order, not a lexicographic order, the order adopted after the locale-dependent candidate order issue (src/domain/generation/orchestration/rhythm-tie-key-batch.ts, buildRhythmTieKeyPlan). The ranked result is unchanged; status unchanged. Pending for v3.2: the doodle distance order, the rhythm lock order and the forced bend order prefer rhythm candidates, so the no-preference wording must change when v3.2 is built.
---

# Ranked Candidate Ordering

## INTENT
Turn a harmony or rhythm candidate domain into one deterministic, seed-dependent search order, so orchestration always visits candidates in the same reproducible sequence for a given seed without scoring or preferring any candidate over another.

## THE RULE / LOGIC
Under current policy every candidate within one harmony or rhythm domain is musically equal-ranked, so ordering is entirely the seeded tie key of each candidate, with the canonical candidateIndex as the tiebreaker on a key collision; sorting never mutates its input and is stable and explicit about both comparison terms. Ranking a harmony candidate domain sorts the given candidates by their harmony tie key ascending, then candidateIndex ascending. Ranking rhythm candidates accepts an already-materialized candidate list — a lazy rhythm candidate domain's iterator is fully drained into a list exactly once by a separate entry point before ranking — sorts it the same way by rhythm tie key, and freezes the result together with its grammar version and domain size into a reusable ranked cache, so the same ranked order can be reused across every register window of one operation without re-expanding or re-ranking the grammar.

Rhythm ranking computes the rhythm tie keys itself, with an incremental 32-bit FNV-1a equivalent to hashing each candidate's full tie-key string: it hashes the versioned prefix `infinite-flow/rhythm-tie/v1|<seed encoding>|<grammar version>|` once per ranking call, then continues that hash state over each candidate's identity characters, building no concatenated string per candidate. It may visit the identities in the UTF-16 code-unit order of their strings (a plain string comparison, independent of the locale), precomputed once per domain, resuming each identity from the hash state checkpointed at the prefix it shares with the previous identity in that order. Every key computed this way equals the key the per-candidate rhythm tie-key function gives for the same seed and candidate, so the ranked order is unchanged; the visiting order affects only how the keys are computed, never the sort.

## TECHNICAL INTERFACE
Callers supply a harmony candidate list and a seed to receive a frozen, ranked harmony candidate list. Callers supply a rhythm grammar version, an already-materialized rhythm candidate list, and a seed to receive a frozen RankedRhythmCache; a separate entry point accepts a raw lazy RhythmCandidateDomain and a seed and produces the same cache after draining the domain's iterator exactly once. Harmony ranking consumes the harmony tie key already exposed by the candidate domain's own tie-key function. Rhythm ranking computes its keys incrementally as described above; the per-candidate rhythm tie-key function `rhythmTieKey` stays the reference definition those keys must equal bit for bit.

## EXPECTATION
Ranking the same candidate list under the same seed always produces the same order. Every candidate in the input appears exactly once in the output, with none lost or duplicated. A rhythm domain materialized through the lazy-domain entry point yields the same ranked order and domain size as ranking its fully-drained candidate list directly. For every rhythm candidate and seed, the tie key rhythm ranking computes equals the per-candidate rhythm tie-key function's key, and the ranked rhythm order equals sorting by that function's keys, then candidateIndex.
