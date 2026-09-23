# Rhythm and Phrase-Structure Policy

Status: first-release implementation policy

## Authority and evidence

The [first-release master specification](../../specs/first-release-master-spec.md) requires exactly four 4/4 measures, explicit density/syncopation/silence controls, real rests, at least one metrical anchor per bar, and one related gesture/answer phrase. The [generator contract](../../specs/generator-contract.md) assigns starts, durations, ties, and rests to the rhythm planner.

**Evidence:** In simple meter, notes/rests partition measured time, ties sustain rather than reattack, syncopation can attack weak positions or sustain across stronger positions, and repeated material can be varied to create phrase-level relation. See [research sources S1 and S8](research-sources.md).

**Project policy:** Four bars contain exactly 64 sixteenth-note ticks. Density selects a nominal rhythmic vocabulary and attack-count band; silence reserves actual rest time; syncopation transforms onset placement without changing attack count; every bar preserves a pulse anchor.

**Implementation inference:** The exact grids and budgets below are deterministic first-release policy, not universal definitions of quarter/eighth/sixteenth density. Their perceptual spacing needs listening tests at representative tempos.

## Exact time model and grids

Use integer sixteenth-note ticks: one quarter beat is `4` ticks and each 4/4 bar is half-open interval `[0,16)`. Across the phrase, bar starts are `0,16,32,48`; no event crosses tick `64`. Adjacent note/rest events tile every bar with no gap or overlap.

Build a nominal skeleton before syncopation:

| Density | Nominal boundaries and durations | Sounding attacks per bar |
| --- | --- | --- |
| Quarter | starts on `0,4,8,12`; durations are positive multiples of `4` | `2-4` |
| Eighth | starts on even ticks; durations are positive multiples of `2` | `4-8` |
| Sixteenth | starts on any integer tick; durations are positive integer ticks | `8-16` |
| Mixed | sixteenth lattice; each bar uses at least two of nominal durations `1,2,4`, and all three occur somewhere in the phrase | `4-12` |

Longer notes/rests are formed by merging adjacent nominal cells. A merged duration remains legal for its density. For Mixed, merged values do not count as a new nominal class: the unmerged source cells establish whether `1`, `2`, and `4` are present. Tuplets and durations below one sixteenth are excluded.

The attack band is measured after rests and ties are applied. A tie continuation is not an attack. Every bar must meet its density band; silence therefore cannot be implemented by merely deleting attacks while leaving unrepresented time.

## Silence budgets and interaction

Measure silence as total rest ticks across the complete phrase:

| Silence setting | Required phrase rest ticks | Additional shape rule |
| --- | --- | --- |
| Sparse rests | `4-8` | At least one rest event; no required long breath. |
| Conversational space | `12-20` | At least two rest events in different two-bar halves; at least one rest is `>=2` ticks. |
| Breath-heavy phrasing | `24-32` | At least one rest in every bar; at least two rests are `>=4` ticks. |

No bar may be all rest, and no single rest may exceed `8` ticks. Rest starts/durations follow the nominal density grid before syncopation; Mixed may use any allowed nominal cell. A rest placed at a gesture boundary is preferred over splitting a sounding event, but all table requirements are hard.

Construct density and silence jointly. Reject a skeleton if its per-bar sounding-attack band, phrase rest budget, anchor rule, or answer relationship cannot all hold. Do not clamp silence, lower density, fill rests for tension, or convert a requested rest into a held note. The numerical rest bands are calibration policy; retain regression fixtures if later listening changes them.

## Syncopation and ties

Syncopation transforms a legal nominal skeleton and preserves its number of sounding attacks, total rest ticks, and total duration. Let adjacent events be `L=[a,b)` and `R=[b,c)`. Moving their shared boundary by signed integer `delta` gives `b' = b + delta`, `duration(L)' = duration(L) + delta`, and `duration(R)' = duration(R) - delta`. A positive `delta` moves `R`'s start later; a negative `delta` moves it earlier. The transform is legal only when every resulting duration is a positive integer and all affected boundaries remain inside the bar.

- **Straight:** every attack remains on a nominal grid boundary. Quarter attacks are on quarter beats; Eighth attacks are on eighth boundaries; Sixteenth/Mixed attacks may use their full lattice. No note is tied across beat 1 or beat 3 solely to create displacement.
- **Occasional offbeat placement:** exactly `1-2` bars contain a syncopated event. In each selected bar, move one eligible attack later by `2` ticks (the eighth-note offbeat) or sustain one note across beat 3. Preserve all rest/density budgets and the bar anchor.
- **Active displacement:** every bar contains `1-2` syncopated events and the phrase contains at least one offbeat attack plus one tied sustain across a quarter-beat boundary. An attack may move by `1` or `2` ticks. No bar may contain more syncopated attacks than anchored attacks.

Apply the boundary algebra by event-kind transition:

| Boundary case | Legal transform and invariants |
| --- | --- |
| `note -> note` | Move the second note's attack from `b` to `b'`. For later displacement `delta > 0`, lengthen the first note by `delta` and shorten the second by `delta`; for earlier displacement, reverse those transfers. Attack count and rest ticks are unchanged. |
| `note -> rest` | This boundary has no attack to displace and cannot move independently because that would change total rest ticks. It may move only as the first boundary of an interior-rest translation paired with the following `rest -> note` boundary by the same `delta`. |
| `rest -> note` | This boundary is a note attack. To move it while preserving rest ticks, translate the entire interior rest: for `note [a,b), rest [b,c), note [c,d)`, set `b'=b+delta` and `c'=c+delta`. The left note changes by `+delta`, the rest keeps duration `c-b`, and the attacked note changes by `-delta`. A leading or trailing rest lacking both movable boundaries is not eligible for this transform. |
| tied sustain | To syncopate by sustaining across strong tick `q`, split one sounding note `[a,c)` with `a < q < c` into `[a,q)` and `[q,c)` carrying one tie-chain ID and one future pitch. The split at `q` is a notation continuation, not an attack; summed duration, attack count, and rest ticks are unchanged. Do not convert two separately attacked notes into a tie, because that would reduce attack count. |

Every displacement annotation records the original boundary or note span, signed `delta` (zero for a tied split), transformed boundaries, and case. Quarter and Eighth density may therefore have off-grid rendered boundaries after displacement; nominal-grid provenance and unchanged attack count retain the selected density semantics. After all transforms, events must still tile `[0,16)` exactly, all durations must be positive integer ticks, and phrase total rest ticks must equal the pre-syncopation budget.

A tie joins adjacent note segments of the same future pitch and produces one sounding attack. The rhythm planner may emit a tie intent before pitch assignment; pitch planning must give all segments in that tie chain one pitch. A tie cannot cross a harmony change unless that pitch is legal as a sustained common tone under both harmonies. The orchestrator rejects or replans the rhythm candidate rather than silently breaking such a tie.

## Metrical anchors

Each bar must contain at least one sounding attack at tick `0` or `8` (beat 1 or 3). A tie continuing through that tick, a rest beginning there, or an attack moved away from it does not count. For active displacement, anchored attacks must be at least as numerous as syncopated attacks in that bar.

This exact definition is project policy for testability. It is narrower than every musical meaning of metric accent, but it prevents the selected syncopation from erasing 4/4 orientation.

## Four-bar gesture and answer

Bars 1-2 are gesture `A`; bars 3-4 are answer `A'`. Represent each bar as ordered tokens `(kind, nominalDuration, attackClass)`, where kind is note/rest and attack class is anchor/on-grid/offbeat/tie-continuation.

1. Select a one- or two-beat source cell from bar 1 that contains at least one sounding attack.
2. Recur that cell once in bar 2 at the same or another quarter-beat boundary. It may be exact or use one legal duration/rest substitution.
3. Seed bar 3 from bar 1 and bar 4 from bar 2 before applying answer transforms.
4. Apply one answer transform for Settled/Lift tension and one or two for Build/Edge: change one rest boundary, displace one eligible onset within the requested syncopation, augment/diminish one cell while preserving its total span, or vary the final cell's attack/rest pattern.
5. Preserve at least half of the gesture's sounding-attack positions in the answer before permitted displacement, with a minimum of two shared positions across bars 3-4. Bar 4 must differ from bar 2 in its final non-rest cell or trailing-rest pattern.

Pitch contour is not a rhythm transform. The rhythm plan exposes phrase-position and recurrence annotations so pitch planning can relate melodic content without changing starts, durations, rests, or ties.

## Versioned MVP construction grammar

The first implementation uses grammar version `rhythm-mvp-v1`. This is a deliberately bounded construction catalog, not an assertion that it contains every valid rhythm on the sixteenth lattice. A complete v1 domain contains every unique candidate reachable through the productions below and no rhythms invented outside them. The public expansion input includes the grammar version; callers that omit it during the first release receive `rhythm-mvp-v1` explicitly in the returned domain.

Grammar terminals are nominal source cells `N(d)` and `R(d)`, where `d` is the cell duration in ticks and `N` starts one sounding note. Adjacent `N` cells remain separate attacks unless a merge production removes their shared attack boundary. The following ordered beat-cell catalogs are exhaustive for v1:

| Density | Beat cells, in canonical order |
| --- | --- |
| Quarter | `N4`; `R4` |
| Eighth | `N2 N2`; `N2 R2`; `R2 N2`; `R2 R2` |
| Sixteenth | `N1 N1 N1 N1`; `N1 N1 N1 R1`; `R1 N1 N1 N1`; `N1 R1 N1 R1`; `R1 N1 R1 N1`; `N1 N1 R1 R1`; `R1 R1 N1 N1`; `R1 R1 R1 R1` |
| Mixed | `N4`; `R4`; `N2 N2`; `N2 R2`; `R2 N2`; `R2 R2`; `N2 N1 N1`; `N2 N1 R1`; `N2 R1 N1`; `R2 N1 N1`; `N1 N1 N2`; `N1 R1 N2`; `R1 N1 N2`; `N1 N1 R2` |

Let `x` and `y` be beat cells from the selected density catalog. A nominal first bar is expanded in this production order:

```text
Bar1 ::= x x x x
       | x x x y
       | x x y y
       | x y x y
       | x y y x
```

For the first production enumerate `x` in catalog order. For the other productions enumerate ordered pairs `(x,y)` lexicographically by catalog index with `x != y`. Flatten the four beats into source cells and reject hard-invariant failures immediately.

Bar 2 begins as a cell-for-cell copy of bar 1. Its recurrence witness is the earliest beat of bar 1 that contains a sounding attack; v1 source and target spans are exactly one beat and the target has the same beat offset in bar 2. Enumerate the exact recurrence first. Then enumerate one substitution for each nominal cell in that target beat, in cell order: replace `N(d)` with `R(d)` or `R(d)` with `N(d)` without changing `d`, boundaries, or any other cell. The witness records grammar version, source bar/beat and source-cell sequence, target bar/beat, `exact` or `substitute`, and, for substitution, the target cell offset plus before/after terminal. These fields are semantic because pitch planning may use the witness to relate melodic material.

After both gesture bars exist, enumerate a merge plan: no merge first, followed by exactly one removable shared boundary between adjacent `N` cells in chronological order across bars 1-2. V1 permits at most one such merge in the two-bar gesture; copying it into the answer does not consume another grammar choice. A merge creates one longer sounding event with one attack and retains the ordered nominal source cells as provenance. A recurrence substitution that removed either adjacent `N` terminal simply makes that merge option ineligible; the implementation never moves or deletes a selected merge to repair a later stage.

Bars 3 and 4 start as exact copies of the fully merged bars 1 and 2. Enumerate answer-transform lists of length exactly one for Settled/Lift and length one before length two for Build/Edge. Lists are strictly increasing in descriptor order, cannot repeat a descriptor, and must satisfy these v1 productions:

| Descriptor | Exact precondition and algebra |
| --- | --- |
| `translate_interior_rest` | In bars 3-4, choose independent (untied) `note [a,b), rest [b,c), note [c,d)`. Set `b'=b+delta`, `c'=c+delta`; the left note changes by `+delta`, the rest remains `c-b`, and the attacked note changes by `-delta`. All three durations stay positive. For Straight, enumerate `-quantum` before `+quantum` and require both transformed boundaries to remain nominal-grid boundaries; this is answer variation, not syncopation. For Occasional, only `delta=+2` is legal. For Active, use the signed-delta order below. |
| `displace_attack` | In bars 3-4, choose an untied `note -> note` boundary `b` whose right note is an independent attack and which is not used by another descriptor. Set `b'=b+delta`, changing the left duration by `+delta` and right duration by `-delta`; both stay positive. The transform is unavailable for Straight, uses only `delta=+2` for Occasional, and uses the Active signed-delta order below. |
| `redistribute_note_pair` | In bars 3-4, choose two consecutive independent attacked note events spanning `[a,b)` and `[b,c)`. Set `b'=b+delta`, changing the left duration by `+delta` and right duration by `-delta`; enumerate `delta=-quantum` before `+quantum`, keep `b'` on the selected density's nominal grid, and require both durations positive. This preserves span, attack count, event kinds, and rest ticks and is not a syncopation event. For Mixed the quantum is one tick, but `b'` must coincide with a boundary admitted by the flattened Mixed source-cell provenance. |
| `swap_final_pattern` | In bar 4, choose two equal-duration source cells with opposite kinds, one of them in the final beat, neither touched by a merge or prior transform, and exchange `N` and `R`. Boundaries, attack count, and rest ticks are unchanged. |

An off-grid `translate_interior_rest` or any `displace_attack` is both an answer transform and a syncopation transform: one descriptor is stored once, applied once, and counted once in each applicable checklist. A Straight `translate_interior_rest`, `redistribute_note_pair`, and `swap_final_pattern` are answer-only transforms. Enumerate potential descriptors by answer bar, original left boundary, kind in the table order, then delta. To bound v1, retain only the first legal target for each `(kind,delta)` pair; `swap_final_pattern` retains its first legal cell pair in lexicographic address order. Apply answer-only descriptors first in descriptor order, then apply the complete syncopation set as described below. All addresses refer to the immutable pre-transform nominal source coordinates; a list is illegal if an earlier transform would make a later descriptor's recorded algebra false, with no fallback to a later target.

After answer transforms, at least half of the gesture attack positions, and at least two positions, must still be shared before syncopation-only displacement. The final non-rest cell or trailing-rest pattern of bar 4 must differ from bar 2. A recurrence substitution is not an answer transform, and a syncopation applied correspondingly to gesture and answer does not by itself satisfy the answer-transform count.

### Bounded catalog and iterator

Expansion is a replayable depth-first iterator, not a four-bar Cartesian product and not an eager array. Its nested order is grammar version; bar form; beat-cell indices; recurrence variant; merge plan; answer-transform count and descriptors; syncopation form and descriptors. Validate and prune after each stage using only invariants that can no longer be repaired: bar shape after a bar is built, phrase rest range after the answer exists, then complete rhythm validation. Keep a per-expansion set of normalized identity payloads and yield only the first occurrence.

The largest beat-cell catalog has 14 entries, and v1 has five bar forms, one canonical recurrence location, at most five recurrence variants, at most one gesture merge, at most two answer transforms, and a finite syncopation-template catalog defined below. Implementations must derive finite loop bounds from those catalogs and must not impose a time-, seed-, or arbitrary candidate-count cutoff. Tests may consume a prefix only when testing iterator behavior; domain golden tests consume the complete iterator. Catalog arrays and their order are code constants owned by the grammar version, never object-key iteration.

## Transform descriptors and syncopation order

Descriptors are immutable data, separate from the function that applies them. The implementation may use equivalent TypeScript names, but each descriptor must carry `grammarVersion`, `case`, original bar-local span/boundary, signed `delta`, transformed boundaries, and ordered `roles`. A tied split additionally carries its strong tick and stable tie-chain ID. Construction functions take one immutable skeleton plus one descriptor and return a new immutable skeleton or a typed transform failure; they do not choose another descriptor on failure. A registry keyed by grammar version owns descriptor enumeration and application so later versions can add cases without changing v1.

The public seam should have this responsibility split (names may follow repository conventions, but the data and ownership may not be collapsed):

```ts
type RhythmGrammarVersion = 'rhythm-mvp-v1'

interface RhythmExpansionInput {
  readonly grammarVersion: RhythmGrammarVersion
  readonly noteDensity: NoteDensity
  readonly silenceDensity: SilenceDensity
  readonly syncopation: Syncopation
  readonly tensionArc: TensionArc
}

interface RhythmSkeletonInput {
  readonly noteDensity: NoteDensity
  readonly silenceDensity: SilenceDensity
}

interface RhythmCandidateDomain {
  readonly kind: 'rhythm_candidate_domain'
  readonly grammarVersion: RhythmGrammarVersion
  readonly input: RhythmExpansionInput
  readonly candidates: () => IterableIterator<RhythmCandidate>
}

interface RhythmCandidate {
  readonly candidateIndex: number
  readonly identity: string
  readonly grammarVersion: RhythmGrammarVersion
  readonly bars: readonly [RhythmBar, RhythmBar, RhythmBar, RhythmBar]
  readonly recurrence: RecurrenceWitness
  readonly transforms: readonly RhythmTransformDescriptor[]
}

type RhythmTransformDescriptor =
  | BoundaryTransformDescriptor<'note_to_note'>
  | BoundaryTransformDescriptor<'interior_rest'>
  | BoundaryTransformDescriptor<'redistribute_note_pair'>
  | FinalPatternSwapDescriptor
  | TiedSustainDescriptor

interface RhythmGrammar {
  readonly version: RhythmGrammarVersion
  readonly enumerateSkeletons: (input: RhythmSkeletonInput) => IterableIterator<NominalSkeleton>
  readonly enumerateAnswerTransforms: (
    skeleton: NominalSkeleton,
    input: RhythmExpansionInput,
  ) => IterableIterator<readonly RhythmTransformDescriptor[]>
  readonly enumerateSyncopationTransforms: (
    skeleton: NominalSkeleton,
    syncopation: Syncopation,
  ) => IterableIterator<readonly RhythmTransformDescriptor[]>
  readonly applyTransform: (
    skeleton: NominalSkeleton,
    descriptor: RhythmTransformDescriptor,
  ) => TransformResult
  readonly normalizeIdentity: (candidate: UnindexedRhythmCandidate) => string
}
```

`RhythmBar` exposes exact rational starts/durations plus nominal-cell and phrase-position provenance, not mutable raw event indices. Descriptor addresses use stable source-cell addresses; `delta` is the signed integer tick delta required by the algebra, and `roles` records `answer`, `syncopation`, or both in that order without storing the descriptor twice. The skeleton allocator receives only `RhythmSkeletonInput`; tension and syncopation enter only their transform enumerators. Calling `candidates()` twice must replay the same frozen values in the same order. The registry rejects unknown versions and supplies no "latest compatible" fallback.

All displacement descriptors are selected against pre-syncopation coordinates. Their affected source cells and boundaries must be pairwise disjoint within a bar; v1 does not compose overlapping displacement, rest-translation, or tie-split edits. Apply them by bar, original left boundary, case order `note_to_note`, `interior_rest`, `tied_sustain`, and signed delta. Active signed deltas are enumerated in numeric order `-2, -1, +1, +2`; zero is reserved for tied sustain. This order is identity-bearing even if two legal descriptors serialize to the same final events.

For Occasional, enumerate one transformed bar before two, bar-index combinations lexicographically, and one descriptor per selected bar. For each bar set, the selector order is earliest legal `note_to_note` with `delta=+2`, earliest legal `interior_rest` with `delta=+2`, then tied sustain across tick 8; use the same selector in every bar in a two-bar set and reject the form if either bar has no target.

Active uses a deliberately small phrase-template catalog. Enumerate `[tied_sustain, displacement, tied_sustain, displacement]` before `[displacement, tied_sustain, displacement, tied_sustain]`; corresponding gesture/answer bars use the same selector. For `displacement`, enumerate `note_to_note` before `interior_rest`, then delta in Active signed-delta order, and choose the earliest legal target in each bar. These base templates create exactly one syncopation descriptor per bar. An off-grid answer descriptor may add a second disjoint descriptor in bar 3 or 4; no other second-descriptor production exists in v1. A successful Active phrase still must contain an offbeat attacked note and a tied sustain, and each bar's syncopated-event count must not exceed its anchored-attack count. Here an offbeat attack is a displaced attack landing at a tick not divisible by four; merely attacking on the ordinary Sixteenth/Mixed lattice is not sufficient.

A v1 tied sustain may split only one maximal merged sounding event `[a,c)` at `q` where `q` is one of `4,8,12`, `a < q < c`, the event has not already been split or touched by another transform, and `q` is a removed nominal source-cell boundary. It emits `[a,q)` and `[q,c)` under one tie-chain ID derived from `grammarVersion/bar/a/q/c`; the second segment is a continuation, not an attack. Occasional permits only `q=8`; Active permits `4,8,12` in that order. An unmerged `note -> note` boundary is never tie-eligible, and no transform converts two attacks into a tie.

## Normalization, equivalence, and identity

Normalize a survivor before identity and deduplication: serialize four ordered bars; coalesce adjacent rest segments unless a recorded source boundary is referenced; preserve every attacked-note boundary and tie split; sort annotations in descriptor order; and serialize nominal provenance as the ordered `(kind,duration)` source cells mapped to each resulting event. For Mixed, different production routes that normalize to the same source-cell sequence are equivalent. Different Mixed source-cell duration sequences are not equivalent even when they render the same merged note/rest spans, because duration-class coverage and future transform addresses depend on that provenance.

Two candidates are equivalent only when normalized events, tie chains, canonical recurrence witness, transform descriptors/roles, and normalized nominal provenance all match. The earliest production wins when equivalent derivations collide. The identity is the canonical JSON serialization of exactly `{ grammarVersion, density, silence, syncopation, tensionArc, bars, recurrence, transforms, provenance }`, with fixed field order and no `candidateIndex`. Use the JSON string as the v1 identity; a digest may accompany it for fixtures but must not replace it as the collision-free structural identity. Assign contiguous zero-based indices only as unique validated candidates are yielded. Neither identity nor index depends on seed, iteration chunking, consumer backpressure, harmony, pitch, profile, or instrument.

Adding a production, catalog entry, transform, normalization rule, or ordering change requires a new grammar version. Never insert into or reinterpret `rhythm-mvp-v1`. Step 7 ranking keys must include the grammar version and structural identity, while `candidateIndex` remains only the final deterministic collision fallback. Generation replay data and diagnostic fixtures must retain the grammar version; a new application default may move to v2 without changing explicitly requested v1 results.

## Candidate order, failure, and validation

Step 6 exposes an immutable replayable finite `RhythmCandidateDomain`, not one rhythm selected in isolation. It does not inspect harmony or pitch and accepts no seed. V1 follows the exact grammar order above; within any newly introduced same-level choice, nominal cells are chronological, shorter nominal durations precede merged durations, notes precede rests where both remain legal, and an unchanged form precedes a transformed form. Preserve expansion order and assign contiguous zero-based `candidateIndex` values independent of seed. Step 7 may rank candidates by requested rhythm-policy scores and apply a named rhythm-stream key only among equal-ranked candidates; canonical index is the key-collision fallback and remains available for exhaustion diagnostics.

Validation is independent of generation and checks:

- exactly four measures, each tiling `[0,16)` and total duration `64` ticks;
- legal nominal-grid provenance, density attack band, and Mixed duration-class coverage;
- exact phrase rest budget and rest-shape rules;
- syncopation count/type; correct signed boundary algebra for every `note -> note`, paired `note -> rest -> note`, and tied-sustain case; positive durations; exact bar tiling; unchanged attack count; and unchanged phrase rest ticks;
- at least one tick-0-or-8 sounding attack per bar and the active anchor ratio;
- valid tie chains and gesture/answer recurrence plus variation;
- canonical transform order and normalized identity; domain traversal separately checks contiguous indices and byte-equivalent order for the same four rhythm controls and grammar version.

Validation returns all applicable stable codes in the following order and never repairs its input: `invalid_measure_count`, `invalid_measure_tiling`, `invalid_phrase_duration`, `non_positive_duration`, `invalid_nominal_provenance`, `density_attack_band_violation`, `mixed_duration_class_coverage_violation`, `silence_budget_violation`, `silence_shape_violation`, `all_rest_measure`, `rest_duration_limit_violation`, `syncopation_count_violation`, `syncopation_type_violation`, `transform_algebra_violation`, `transform_overlap_violation`, `attack_count_changed`, `rest_total_changed`, `metrical_anchor_missing`, `active_anchor_ratio_violation`, `invalid_tie_chain`, `recurrence_witness_invalid`, `answer_transform_count_violation`, `answer_similarity_violation`, `answer_variation_missing`, `transform_order_violation`, and `candidate_identity_mismatch`. Domain traversal, rather than single-candidate validation, checks duplicate identities, contiguous indices, and reproducible order.

Reject malformed controls or an unsupported grammar version as `invalid_rhythm_planner_input`. If no candidate survives structural rhythm validation, return `no_legal_rhythm_plan` with the normalized input, grammar version, and the union of validation codes observed during complete expansion in the stable order listed above. An empty failure-code list is illegal. If orchestration later rejects a rhythm candidate for tension binding, tie/harmony compatibility, or pitch feasibility, advance without replacement by stable ranked order; after every harmony/rhythm pair is exhausted, return the downstream typed generation failure. Never return a partial bar, move to triplets, relax a budget, or mutate harmony/pitch constraints.

## Verification fixtures

Unit tests cover every beat-cell terminal, bar form, recurrence variant, transform algebra case and signed delta, overlap rejection, tie precondition, normalization collision, and validator code. Table-driven sweeps cover all `4 x 3 x 3 x 4 = 144` density/silence/syncopation/tension combinations. For every combination, consume the complete v1 iterator and assert non-empty success or the exact typed no-plan failure, every hard invariant, immutable values, unique identities, and indices `0..n-1`.

Maintain one checked-in manifest keyed by grammar version and the four control values. Each entry stores candidate count plus SHA-256 of the UTF-8 sequence `identity + "\n"` in traversal order. Also retain readable first/middle/last candidate fixtures for each density and each syncopation setting, focused fixtures for every failure code, and at least one Mixed pair proving equal normalized provenance deduplicates while different source-duration provenance remains distinct. Step 6 has no seed fixture: seed reproduction begins only when Step 7 ranks equal candidates. Any v1 manifest change is a compatibility failure unless it fixes an acknowledged v1 defect with an explicit migration note.

## Calibration questions

Attack bands, silence bands, and answer similarity are explicit hypotheses. Listening tests should compare one control at a time at slow, default, and fast BPMs. Tempo does not currently alter policy, so any future tempo-conditioned density would require a product decision rather than an undocumented implementation tweak.
