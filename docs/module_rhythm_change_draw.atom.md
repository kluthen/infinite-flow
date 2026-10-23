---
id: module_rhythm_change_draw
status: DRAFT
layer: ARCHITECTURE
tags: [v3, release-v3.2, rhythm-lock, generation, determinism]
version: 0.1
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

Whether the phrase changes. The project's 32-bit FNV-1a hash over the versioned tie-key prefix `infinite-flow/rhythm-change/v1` and the phrase's own seed gives a 32-bit value, and the phrase changes when that value falls under the share: 1 in 4, or 1 in 2 when the request marks the phrase a tenser one, each share a numerator over a power of two. The draw uses integer operations only, never floating point, and no pseudorandom stream: it is a hash tie key of its own, so no other draw or order shifts it and it shifts none. It is computed inside generation, so a phrase generated ahead draws exactly as the session would.

Which change. When the phrase changes, its candidates are the phrase's rhythm candidates whose written bars differ from the locked bars by exactly one change of an allowed kind, always measured from the locked bars and never from the previous phrase, every allowed kind pooled, in seeded order. A candidate that also differs by a tie added or removed elsewhere is not one change and is not among them. They are looked up among the candidates sharing the locked bars' other measures (three of them for a change inside one measure, two for a change of a repeated measure), grouped once per domain on first use, never by scanning the whole domain for each phrase. They take the first tier of the lock's order, before the locked bars (module_rhythm_lock_order).

The record. When the phrase takes one of the drawn candidates, the draw's record names the kind of change it made; when the phrase draws a change and no candidate exists, the record says no change was available and the phrase keeps the locked rhythm. The record goes into the generation result's provenance, which the session history keeps, and never into the timeline; nothing the player sees marks a change.

## TECHNICAL INTERFACE
Not built yet. src/domain/rhythm/rhythm-change-draw.ts holds the draw, hashing with fnv1a32 (src/domain/random/hash32.ts) under the prefix `infinite-flow/rhythm-change/v1`, and the shares RHYTHM_CHANGE_SHARE (1 in 4) and TENSER_RHYTHM_CHANGE_SHARE (1 in 2); it reads the change kinds of src/domain/rhythm/rhythm-change-kinds.ts and the bar key of src/domain/rhythm/rhythm-bars.ts, and hands its candidates to src/domain/rhythm/rhythm-lock-order.ts. Other names are written in when the code exists.

## EXPECTATION
- Over many seeds, the share of phrases that change is near 1 in 4, and near 1 in 2 on tenser phrases.
- No phrase makes more than one change; each is of an allowed kind and measured from the locked bars.
- The draw uses no floating-point operation; a fixed seed list gives golden draws.
- Without locked bars or without an allowed kind, no draw is made and the phrase is the one the lock alone gives.
- When a phrase draws a change and no candidate exists, it keeps the locked rhythm and its provenance records no change available.
- The same request and seed always draw the same change.
