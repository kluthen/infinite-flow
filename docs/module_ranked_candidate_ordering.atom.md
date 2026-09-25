---
id: module_ranked_candidate_ordering
status: DRAFT
layer: ARCHITECTURE
human_name: Ranked Candidate Ordering
type: MODULE
priority: 1
version: 0.1
tags: generation
parents:
  - [[entity_concert_event_timeline]]
dependents: []
---

# Ranked Candidate Ordering

## INTENT
Turn a harmony or rhythm candidate domain into one deterministic, seed-dependent search order, so orchestration always visits candidates in the same reproducible sequence for a given seed without scoring or preferring any candidate over another.

## THE RULE / LOGIC
Under current policy every candidate within one harmony or rhythm domain is musically equal-ranked, so ordering is entirely the seeded tie key already computed for each candidate, with the canonical candidateIndex as the tiebreaker on a key collision; sorting never mutates its input and is stable and explicit about both comparison terms. Ranking a harmony candidate domain sorts the given candidates by their harmony tie key ascending, then candidateIndex ascending. Ranking rhythm candidates accepts an already-materialized candidate list — a lazy rhythm candidate domain's iterator is fully drained into a list exactly once by a separate entry point before ranking — sorts it the same way by rhythm tie key, and freezes the result together with its grammar version and domain size into a reusable ranked cache, so the same ranked order can be reused across every register window of one operation without re-expanding or re-ranking the grammar.

## TECHNICAL INTERFACE
Callers supply a harmony candidate list and a seed to receive a frozen, ranked harmony candidate list. Callers supply a rhythm grammar version, an already-materialized rhythm candidate list, and a seed to receive a frozen RankedRhythmCache; a separate entry point accepts a raw lazy RhythmCandidateDomain and a seed and produces the same cache after draining the domain's iterator exactly once. Neither entry point re-derives a tie key; both consume tie keys already exposed by the candidate domain's own tie-key functions.

## EXPECTATION
Ranking the same candidate list under the same seed always produces the same order. Every candidate in the input appears exactly once in the output, with none lost or duplicated. A rhythm domain materialized through the lazy-domain entry point yields the same ranked order and domain size as ranking its fully-drained candidate list directly.
