---
id: module_rhythm_variety_grammar
status: REVIEW
version: 0.2
human_name: Rhythm Variety Grammar
type: MODULE
layer: ARCHITECTURE
priority: 1
tags: rhythm,variety,grammar,rhythm-mvp-v2
parents:
  - [[api_rhythm_domain_expansion]]
  - [[module_rhythm_domain_validation]]
  - [[rule_tension_ranking_respects_constraints]]
  - [[rule_unsupported_rhythm_settings_block_generation]]
  - [[user_story_controlled_phrase_generation]]
dependents: []
---

# Rhythm Variety Grammar

## INTENT
Define the rhythm-mvp-v2 grammar version's rhythmic-variety mechanism: the per density x level value catalog, the dominance validator, the per-variety blocked combination set, and where variety enters candidate selection, replacing the retired Mixed note density.

## THE RULE / LOGIC
grammarVersion `rhythm-mvp-v2` extends the existing versioned rhythm-domain-expansion grammar (governed by [[api_rhythm_domain_expansion]]) to serve the rhythmic-variety control instead of the retired Mixed note density. For each of the three note densities (Quarter = 4 ticks, Eighth = 2 ticks, Sixteenth = 1 tick) and three variety levels (`Strict`, `Slightly varied`, `Heavily varied`), the grammar's beat-cell catalog is today's catalog for that density plus a fixed set of extra beat cells owned by the grammar version, never a tunable table: `Strict` adds nothing at any density; `Slightly varied` adds `[4n]` and `[3n,1n]` at Eighth and `[2n,1n,1n]` and `[1n,1n,2n]` at Sixteenth; `Heavily varied` adds `[2n,2n]`, `[2n,2r]`, `[2r,2n]` at Quarter, the `Slightly varied` additions plus `[2n,1n,1n]` and `[1n,1n,2n]` at Eighth, and the `Slightly varied` additions plus `[2n,1n,1r]` at Sixteenth. Each level also fixes a per-density attack-count-per-bar band (today's band under `Strict`, widened progressively under `Slightly varied` and `Heavily varied`) that the skeleton allocator enforces alongside the catalog. A merge that combines two cells inside a single beat is legal only when it involves a cell longer than the density value q; this excludes a same-length merge that would silently duplicate an existing three-cell provenance path and inflate the domain size, and it is a no-op at Quarter because every Quarter merge already crosses a beat boundary.

The grammar's validator runs one additional hard check, code `rhythmic_variety_violation`, alongside the grammar's existing rhythm invariants (governed by [[module_rhythm_domain_validation]]): the phrase's nominal attack share of the selected density value q (the fraction of attacks, meaning note events that are not tie continuations, whose nominal duration in ticks equals q) must meet a floor for the selected variety level: 1.0 under `Strict`, 0.75 under `Slightly varied`, 0.5 under `Heavily varied`. At the `Heavily varied` floor, a candidate where q ties another value at exactly 50% of attacks passes only when that other value is shorter than q; a tie with a longer value, or falling under the floor, fails the check. This measure is fixed by nominal density value alone, never by sounding time or beat coverage.

Rhythmic variety is a hard filter applied during rhythm-domain expansion, at the same priority tier as the existing note-density and silence-density budgets (governed by [[rule_tension_ranking_respects_constraints]]'s stated priority order): it filters which candidates the domain yields, before syncopation onset planning, leapiness/arpeggio-chaos candidate selection, tension ranking, and the seeded tie-break. It never ranks a candidate, and tension can never trade it away, exactly as tension cannot trade away density or silence.

The per-(density, silence, syncopation) unsupported combinations that [[rule_unsupported_rhythm_settings_block_generation]] names are keyed by variety level under this grammar: the six combinations named for `Strict` are unchanged from today's grammar; four of those six remain unsupported for `Slightly varied` because its extra Sixteenth cells rescue the attack band under active displacement for the other two; none are unsupported for `Heavily varied`. Eighth density is never blocked at any level.

The grammar's prefilter (the gesture-level prune that replaces the retired Mixed-coverage prune) is a subset of the validator by construction: it calls the same dominance predicate the validator's `rhythmic_variety_violation` check calls, over-approximating a gesture's achievable q-share (a transform never changes source cells, and a tie can at best turn a merged head into its first cell), so every candidate the prefilter prunes is one the validator would reject with `rhythmic_variety_violation`, and the domain the grammar yields is identical whether or not the prefilter runs. This preserves the domain-expansion API's existing determinism and replayability guarantee (governed by [[api_rhythm_domain_expansion]]): for identical versioned inputs, the sha256 of the ordered accepted-candidate sequence is the same across repeated materializations and processes.

## TECHNICAL INTERFACE
The grammar registry replaces rhythm-mvp-v1 with rhythm-mvp-v2 as the sole selectable grammarVersion for the existing RhythmExpansionInput/RhythmCandidateDomain boundary ([[api_rhythm_domain_expansion]]), accepting the same four rhythm controls plus the rhythmicVariety control. It exposes no new public API of its own: the per-level catalog, attack bands, dominance predicate, and per-variety blocked-combination list are grammar-version-owned data and logic, read by the skeleton allocator, the validator, and the workspace's blocked-status check, never by a caller directly. rhythm-mvp-v1's Mixed-density catalog and behavior are retired: a caller cannot select rhythm-mvp-v1 or Mixed at all.

## EXPECTATION
For every (density, variety) pair, the grammar's yielded domain's nominal attack values are exactly the union stated for that pair, and every yielded candidate passes rhythmic_variety_violation at the stated floor. Selecting Heavily varied never blocks a (density, silence, syncopation) combination that any level supports. Enabling or disabling the prefilter prune never changes the yielded domain's order or contents. Repeated materialization of the same versioned input yields the identical ordered candidate sequence.
