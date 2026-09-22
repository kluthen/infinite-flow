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

## Candidate order, failure, and validation

Step 6 exposes an immutable finite `RhythmCandidateDomain` (or a lazy iterator with a provably finite equivalent domain), not one rhythm selected in isolation. It does not inspect harmony or pitch. Enumerate nominal cells in chronological order, shorter nominal durations before merged durations, notes before rests where both remain within the silence budget, and undisplaced before displaced variants. Serialize each surviving skeleton/transform set into a stable structural identity, preserve expansion order, and assign contiguous zero-based `candidateIndex` values independent of seed. Step 7 may rank candidates by requested rhythm-policy scores and apply a named rhythm-stream key only among equal-ranked candidates; canonical index is the key-collision fallback and remains available for exhaustion diagnostics.

Validation is independent of generation and checks:

- exactly four measures, each tiling `[0,16)` and total duration `64` ticks;
- legal nominal-grid provenance, density attack band, and Mixed duration-class coverage;
- exact phrase rest budget and rest-shape rules;
- syncopation count/type; correct signed boundary algebra for every `note -> note`, paired `note -> rest -> note`, and tied-sustain case; positive durations; exact bar tiling; unchanged attack count; and unchanged phrase rest ticks;
- at least one tick-0-or-8 sounding attack per bar and the active anchor ratio;
- valid tie chains and gesture/answer recurrence plus variation;
- deterministic annotations and ordering for the same request and seed.

If no candidate survives structural rhythm validation, return typed `no_legal_rhythm_plan` with failed invariants. If orchestration later rejects a rhythm candidate for tension binding, tie/harmony compatibility, or pitch feasibility, advance without replacement by stable ranked order; after every harmony/rhythm pair is exhausted, return the downstream typed generation failure. Never return a partial bar, move to triplets, relax a budget, or mutate harmony/pitch constraints.

## Calibration questions

Attack bands, silence bands, and answer similarity are explicit hypotheses. Listening tests should compare one control at a time at slow, default, and fast BPMs. Tempo does not currently alter policy, so any future tempo-conditioned density would require a product decision rather than an undocumented implementation tweak.
