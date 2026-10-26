---
id: module_rhythm_change_draw
status: REVIEW
layer: ARCHITECTURE
tags: [v3, release-v3.2, rhythm-lock, generation, determinism]
version: 0.2
priority: 1
human_name: The Rhythm Change Draw
parents:
  - [[entity_request_rhythm_lock]]
  - [[rule_allowed_rhythm_changes]]
  - [[rule_rhythm_change_kinds]]
  - [[rule_rhythm_change_lasts_one_phrase]]
  - [[rule_rhythm_change_share]]
dependents: []
type: MODULE
---

# The Rhythm Change Draw

## INTENT
Decide inside generation, from the phrase's own seed, whether a locked phrase makes one allowed rhythm change and which candidates carry it, so the change replays from the request alone.

## THE RULE / LOGIC
The draw is made only when the request's rhythm lock group holds both locked bars and at least one allowed change; otherwise nothing is drawn and nothing about a change is recorded. Phrase 1 never holds locked bars, so it never draws.

Whether the phrase changes. The project's 32-bit FNV-1a hash over the versioned tie-key prefix `infinite-flow/rhythm-change/v1` and the phrase's own seed gives a 32-bit value, and the phrase changes when that value falls under the share: 1 in 4, or 1 in 2 when the request marks the phrase a tenser one, each share a numerator over a power of two. Phrase seeds come from the session's seed plan, over which the shares hold; raw consecutive seeds cluster in the hash's top bits (seeds 0 to 7 never draw), so a measure or a test of the shares uses seed-plan seeds. The draw uses integer operations only, never floating point, and no pseudorandom stream: it is a hash tie key of its own, so no other draw or order shifts it and it shifts none. It is computed inside generation, so a phrase generated ahead draws exactly as the session would.

Which change. When the phrase changes, its candidates are the phrase's rhythm candidates whose written bars differ from the locked bars by exactly one change of an allowed kind, always measured from the locked bars and never from the previous phrase, every allowed kind pooled, in seeded order. A candidate that also differs by a tie added or removed elsewhere is not one change and is not among them. They are looked up among the candidates sharing the locked bars' other measures (three of them for a change inside one measure, two for a change of a repeated measure), grouped once per domain on first use, never by scanning the whole domain for each phrase. They take the first tier of the lock's order, before the locked bars (module_rhythm_lock_order).

The record. When the phrase takes one of the drawn candidates, the draw's record names the kind of change it made; when the phrase draws a change and no candidate exists, or none of its candidates makes a phrase, the record says no change was available and the phrase keeps the lock's order, the locked bars or, failing them, a forced bend. The record is present exactly when the phrase drew a change. The record goes into the generation result's provenance, which the session history keeps, and never into the timeline; nothing the player sees marks a change.

## TECHNICAL INTERFACE
src/domain/rhythm/rhythm-change-draw.ts holds the draw. rhythmChangeHash(seed) is fnv1a32 (src/domain/random/hash32.ts) over RHYTHM_CHANGE_TIE_KEY_PREFIX, `infinite-flow/rhythm-change/v1`, a separator and the seed's documented string encoding; isRhythmChangeDrawn(seed, tenserPhrase) keeps the phrase when the hash's top RHYTHM_CHANGE_SHARE_BITS (16) bits fall under RHYTHM_CHANGE_SHARE (16,384, 1 in 4) or TENSER_RHYTHM_CHANGE_SHARE (32,768, 1 in 2). rhythmChangeCandidates(input) gives the candidates one allowed change away from the locked bars, as RhythmChangeCandidate values (the rhythm and its kind), in seeded order, looked up through a per-domain index of bar keys built on first use and kept in a WeakMap keyed by the frozen domain list; it reads the change kinds of src/domain/rhythm/rhythm-change-kinds.ts and the bar key of src/domain/rhythm/rhythm-bars.ts. drawRhythmChange(input) gives undefined without an allowed change (the orchestrator calls it only for a request holding locked bars), else a RhythmChangeDraw: { changes: false }, or { changes: true, candidates }, the list empty when none exists. The generation orchestrator draws once per request and hands the draw to makeRhythmLockOrder (src/domain/rhythm/rhythm-lock-order.ts), whose first tier it takes; the record is GenerationProvenance.rhythmChange (RhythmChangeRecord: a change kind or no_change_available), declared in src/domain/generation/orchestration/orchestration-types.ts and validated by the generation worker protocol.

## EXPECTATION
- Over many seed-plan seeds, the share of phrases that change is near 1 in 4, and near 1 in 2 on tenser phrases.
- No phrase makes more than one change; each is of an allowed kind and measured from the locked bars.
- The draw uses no floating-point operation; a fixed seed list gives golden draws.
- Without locked bars or without an allowed kind, no draw is made and the phrase is the one the lock alone gives.
- When a phrase draws a change and no candidate exists, or none makes a phrase, it keeps the lock's order and its provenance records no change available.
- The same request and seed always draw the same change.
