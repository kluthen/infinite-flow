---
id: module_ranked_candidate_ordering
status: REVIEW
layer: ARCHITECTURE
human_name: Ranked Candidate Ordering
type: MODULE
priority: 1
version: 0.5
tags: generation
parents:
  - [[entity_concert_event_timeline]]
  - [[rule_forced_bend]]
  - [[rule_rhythm_lock_strict]]
dependents: []
---

# Ranked Candidate Ordering

## INTENT
Turn a harmony or rhythm candidate domain into one deterministic, seed-dependent search order, so orchestration always visits candidates in the same reproducible sequence for a given request and seed, and prefers one candidate over another only when the request itself asks for it.

## THE RULE / LOGIC
A candidate's place in a harmony or rhythm order is a tuple compared term by term: its preference rank, then its seeded tie key, then its canonical candidateIndex, every key and identity compared in UTF-16 code-unit order, never by locale. Sorting never mutates its input and is stable and explicit about every term.

Without a preference. Every harmony candidate, and every rhythm candidate of a request holding neither the rhythm lock's locked bars nor a steering block, has the same preference rank, so its place is the seeded tie key, then candidateIndex: the order this module gave before the preference rank existed, so such a request is searched exactly as before. Ranking a harmony candidate domain always sorts this way.

The preference seam. Rhythm ranking takes a preference rank for each candidate, computed inside generation from the request alone, never from the app's state. Under the rhythm lock with locked bars (module_rhythm_lock_order), the drawn rhythm change's candidates come first when the phrase draws one (module_rhythm_change_draw), then the candidates whose written bars equal the locked bars, then every other candidate in the forced bend's order. A steering block orders rhythm candidates through the same seam. A preference is an order, never a filter: every candidate of the domain stays in the order exactly once, so every phrase possible without the preference stays possible.

Rhythm ranking accepts an already-materialized candidate list (a lazy rhythm candidate domain's iterator is fully drained into a list exactly once by a separate entry point before ranking), sorts it by preference rank, then rhythm tie key, then candidateIndex, and freezes the result together with its grammar version and domain size into a reusable ranked cache, so the same ranked order can be reused across every register window of one operation without re-expanding or re-ranking the grammar.

Rhythm ranking computes the rhythm tie keys itself, with an incremental 32-bit FNV-1a equivalent to hashing each candidate's full tie-key string: it hashes the versioned prefix `infinite-flow/rhythm-tie/v1|<seed encoding>|<grammar version>|` once per ranking call, then continues that hash state over each candidate's identity characters, building no concatenated string per candidate. It may visit the identities in the UTF-16 code-unit order of their strings (a plain string comparison, independent of the locale), precomputed once per domain, resuming each identity from the hash state checkpointed at the prefix it shares with the previous identity in that order. Every key computed this way equals the key the per-candidate rhythm tie-key function gives for the same seed and candidate, so the ranked order is unchanged; the visiting order affects only how the keys are computed, never the sort.

## TECHNICAL INTERFACE
Callers supply a harmony candidate list and a seed to receive a frozen, ranked harmony candidate list. Callers supply a rhythm grammar version, an already-materialized rhythm candidate list, and a seed to receive a frozen RankedRhythmCache; a separate entry point accepts a raw lazy RhythmCandidateDomain and a seed and produces the same cache after draining the domain's iterator exactly once. Harmony ranking consumes the harmony tie key already exposed by the candidate domain's own tie-key function. Rhythm ranking computes its keys incrementally as described above; the per-candidate rhythm tie-key function `rhythmTieKey` stays the reference definition those keys must equal bit for bit. All of this lives in src/domain/generation/orchestration/candidate-ranking.ts. orderRhythmByPreference(seeded, rankOf), in the same file, takes the preference rank: it orders a seeded rhythm order by each candidate's rank, then its seeded position, so each candidate is placed by (preference rank, seeded tie key, candidateIndex), every candidate kept once, and returns a frozen list; equal ranks give the seeded order back. src/domain/rhythm/rhythm-lock-order.ts computes the ranks under the lock (module_rhythm_lock_order); without a preference, the ranked order is the seeded key's.

## EXPECTATION
- Ranking the same candidate list under the same request and seed always produces the same order.
- Every candidate in the input appears exactly once in the output, with none lost or duplicated, whatever the preference.
- Without the rhythm lock's locked bars and without a steering block, the ranked order is the seeded tie key, then candidateIndex, as before the preference rank existed, and every recorded corpus replays unchanged.
- Under the lock, the drawn change's candidates come before the locked bars' candidates, which come before every other candidate.
- Keys and identities are compared in code-unit order, never by locale.
- A rhythm domain materialized through the lazy-domain entry point yields the same ranked order and domain size as ranking its fully-drained candidate list directly.
- For every rhythm candidate and seed, the tie key rhythm ranking computes equals the per-candidate rhythm tie-key function's key, and with no preference the ranked rhythm order equals sorting by that function's keys, then candidateIndex.
