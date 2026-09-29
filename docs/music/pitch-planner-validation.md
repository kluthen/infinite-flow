# Pitch Planner and Validation Policy

Status: first-release implementation policy

## Authority and ownership

The [first-release master specification](../../specs/first-release-master-spec.md) governs pitch vocabulary, contour, leapiness, open endings, profile ranges/windows, and deterministic behavior. The [generator contract](../../specs/generator-contract.md) assigns concert pitches to the pitch planner; it does not permit that planner to rewrite harmony or rhythm. [Harmony Planner Policy](harmony-planner-policy.md) and [Rhythm and Phrase-Structure Policy](rhythm-phrase-structure.md) define those upstream plans.

**Evidence:** Chord tones, passing/neighbor tones, appoggiaturas, bounded leap recovery, and chromatic approaches/enclosures supply useful candidate roles. They are style-bound conventions rather than universal laws; see [research sources S4-S10](research-sources.md#melody-tension-and-resolution).

**Project policy:** Neutral is entirely diatonic. Jazz adds only brief, immediately resolving chromatic approaches/enclosures to chord-tone targets and shares Neutral harmony. Every pitch stays in the active concert range and one resolved whole-phrase register window. Explicit controls outrank tension. Invalid requests fail rather than relax.

## Planner input and output

Pitch-planner input is an immutable resolved core `GenerationRequest`: selected collection/profile grammar; one harmony candidate whose abstract tension requirements have been bound to one rhythm candidate; tension/contour/leapiness/arpeggio policy; active concert range; one resolved whole-phrase register window; seed; and named stream context. Output assigns one concert MIDI integer and source role to every sounding attack. Tie continuations repeat that attack's MIDI value and are not separate pitch decisions.

The planner cannot add/delete/move an onset, change a duration/rest/tie, alter a chord, select another register window, change profile grammar, or reinterpret display transposition.

## Candidate construction and hard filters

For each sounding attack, construct these role classes. This list defines vocabulary, not canonical enumeration or final musical rank:

1. Active-chord tones.
2. Diatonic passing or neighbor tones whose preparation and stepwise chord-tone resolution are already feasible.
3. A scheduled diatonic appoggiatura/approach permitted by the tension plan with a reserved target.
4. For Jazz only, an authorized chromatic approach or enclosure member with a reserved chord-tone target.

Expand each pitch class into every octave instance inside both the inclusive active range and resolved window using the seed-independent enumeration defined below. Then reject, in order: collection/profile violations; endpoint or reserved-resolution violations; tie/harmony incompatibility; range/window violations; contour infeasibility; adjacent-interval cap and remaining leap budget; recovery/arpeggio-state violations. Rank only survivors.

Pitch candidates are never created by octave-clamping an illegal pitch. If the desired pitch class has no legal octave instance, it is absent. Rests do not reset previous-pitch, leap-budget, recovery, contour, or ornament state.

## Neutral and Jazz vocabulary

Neutral sounding pitches must belong to the selected seven-note collection. A non-chord tone has one of these complete roles:

- Passing: approached and left by collection step in the same direction, ending on a chord tone.
- Neighbor: leaves a chord tone by collection step and returns by collection step to that pitch class.
- Appoggiatura: entered by a permitted leap on an accented/strong onset and resolved by collection step to a chord tone.
- Diatonic approach: one or two collection-step notes immediately preceding a chord-tone target. "Immediately preceding" counts sounding attacks under the same harmony event, not ticks: a rest may separate the approach notes from each other or from the target, as long as each next attack starts within the tension requirement's maximum resolution delay (see below). This also applies to Build's required two-note approach.

**Bound tension figures (passing/neighbor, appoggiatura, two-note approach).** The members of a bound figure and its target are consecutive sounding attacks under one harmony event; rests may separate them. Each attack after the first member must start no later than the resolution deadline measured from the end of the previous attack (tie-inclusive): for Lift, Build, and Edge (`next_beat_or_bar`) the next beat boundary after that end; for Settled (`next_strong_sounding_onset`) the next strong-onset boundary (beat 1 or beat 3) after that end. The preparation note before the first member must be the immediately preceding sounding attack under the same harmony event; a rest may separate it from the figure, and no delay bound applies to it. The planner (`bindingAt`) and the independent validator (`bindingStructureHolds`) enforce the same rule. Jazz chromatic approaches and enclosures keep their stricter no-rest rule below.

Jazz inherits all Neutral candidates and adds:

- Chromatic approach: exactly one pitch one semitone above or below a target chord tone; the next sounding event is the target, with no intervening rest, harmony change, or attack.
- Chromatic enclosure: exactly two consecutive short attacks around one target chord tone, one above and one below in either order, followed immediately by the target. At least one enclosure pitch is outside the collection; each approach interval to the target side is one semitone. All three attacks are contiguous with no rest or harmony change.

Approach/enclosure attacks must be no longer than their target, must fit the selected rhythm without adding attacks, and cannot overlap another ornament. An enclosure requires three available sounding attacks; it is unavailable on Quarter density unless the actual rhythm already supplies those attacks. The target is always a chord tone. No chromatic pitch may be reclassified as a chord extension, altered harmony, or scale member. The final sounding event cannot be chromatic or an ornament target that leaves another obligation unresolved.

## Contour checkpoints

Choose each bar's checkpoint as its first fresh attack on beat 1 or beat 3; if both qualify, use beat 1. A bar whose metrical anchor is only a tie continuation has no such attack; its checkpoint is then the bar's first fresh attack. Every generated bar has at least one attack, and the phrase's first attack is on bar 1, beat 1, so every bar has exactly one checkpoint. Compare checkpoint MIDI values, not every decorative note.

- Rising: checkpoints are non-decreasing and checkpoint 4 is above checkpoint 1.
- Falling: checkpoints are non-increasing and checkpoint 4 is below checkpoint 1.
- Arch: the unique highest checkpoint is in bar 2 or 3; checkpoints do not decrease before it or increase after it; the final checkpoint is below the peak.
- Wandering: checkpoint motion contains at least one change of direction and no monotonic run spans all four checkpoints; equal adjacent checkpoints are neutral and do not count as a direction.

Decorative notes may move contrary to checkpoint direction. Before accepting a pitch, forward-check that remaining checkpoint domains can still satisfy the selected contour and open endpoint. If not, reject the pitch. A contour with no feasible checkpoint assignment fails explicitly; it is not weakened to wandering.

## Leap, recovery, and arpeggio state

Measure adjacent sounding-note intervals in semitones; rests do not interrupt adjacency. A step is `1-2`, skip `3-4`, leap `5-6`, and large leap `7-12`; a repeated pitch (`0`) has no direction. Apply the exact level caps and leap budgets in [Melodic Control Models: Leap budgets](melodic-control-models.md#leap-budgets-preserve-direction-within-the-selected-register-window).

**Recovery debt comes only from a large leap.** A skip, a leap, or an arpeggio run never creates debt on its own. Recovery is the next interval moving in the opposite direction by `1-4` semitones. A repeated pitch does not recover. The final sounding event cannot carry debt.

**Arpeggio run.** A recognized run is exactly three consecutive sounding notes that are all chord tones of one unchanged harmony, connected by two same-direction intervals of `3` or more semitones. A single interval between two chord tones is ordinary motion governed only by the cap and leap budget: it is never counted as a run and never consumes run budget. Two consecutive same-direction intervals of `3` or more semitones are legal only as a recognized run; otherwise that second interval is invalid. A third consecutive same-direction interval of `3` or more semitones is always invalid, because runs have at most three notes. Chromatic ornaments and non-chord tones cannot join a run.

**Deferral.** Where the level permits deferral, a large leap inside a recognized run makes its debt due on the note after the run's final note instead of on the next note. Several large leaps in one run make one debt. Where deferral is not permitted, a large leap must recover on the next note, so a run cannot contain one.

| Level   | Recognized runs                                                                                | Large-leap recovery                               |
| ------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Smooth  | At most 1 per phrase (skip intervals only, because of the 4-semitone cap).                     | Not applicable: no large leaps.                   |
| Shaped  | At most 1 per phrase.                                                                          | Immediate; no deferral.                           |
| Leaping | At most 1 per phrase.                                                                          | Immediate, or deferred to after a recognized run. |
| Angular | At most 2 per phrase and at most 1 per measure; a run counts in the measure of its first note. | Immediate, or deferred to after a recognized run. |

Planner state includes total leaps, total large leaps, per-measure/phrase run counts, the pending recovery (direction and due position), and the open two-note prefix that may still become a run.

Arpeggio chaos ranks only legal chord-tone paths. Lower values prefer nearest chord tone and consistent ordering; higher values prefer reordering and interval contrast within the selected leap/arpeggio ceilings. It cannot turn an unrecognized leap chain into an arpeggio after the fact. Do not begin a recovery debt or arpeggio run unless the remaining range, window, contour, rhythm, harmony, and endpoint domains contain its completion.

## Canonical enumeration, ranking, and deterministic search

Canonical enumeration and musical ranking are separate operations. First enumerate every octave-expanded candidate in a stable seed-independent order by source-role identifier, target/obligation identifier, pitch class, and octave index. Assign a local `enumerationIndex` in that order. MIDI is stored as candidate data but does not define ordinary enumeration or musical preference.

After hard filters, compute this lexicographic musical rank; never use a weighted score that trades away a named control:

1. hard meter/event, open-endpoint, collection/profile, active-range/window, and reserved-resolution feasibility;
2. contour checkpoint feasibility;
3. rhythm-owned density, silence, syncopation, and tie plan;
4. leap cap/budget, recovery, and arpeggio-run legality;
5. chord-tone priority on beat 1 and harmony changes;
6. requested arpeggio-chaos ordering, with low chaos preferring the nearest eligible note and predictable chord-tone direction while higher chaos may prefer legal reorderings/interval contrast;
7. tension role/timing preference among candidates that realize the same bound obligation.

Distance is therefore a musical ranking input only where the selected chaos policy says it is; it is not canonical enumeration. Tension and chaos never change candidate legality.

For candidates equal on the complete musical-rank tuple, derive `tieKey = hash32("infinite-flow/pitch-tie/v1" || seed || decisionIdentity || candidateStableIdentity)` from the named pitch stream. Sort equal-ranked candidates by unsigned `tieKey`; only if keys collide, sort by MIDI, then use `enumerationIndex` if roles with the same MIDI still collide. This tie path must be reachable: do not include `enumerationIndex`, MIDI, or another unique field in the musical-rank tuple merely to avoid ties.

Search depth-first over chronological sounding attacks with forward checking. Never use map/set iteration as order. Backtrack within pitch candidates first. If exhausted, orchestration requests the next bound rhythm/harmony pair in its stable order. A fixed implementation search ceiling may protect the browser, but it must be versioned and return `search_limit_exceeded`, never be reported as proof that the request is musically unsatisfiable.

## Orchestration, Varying resolution, and failure

Two request layers avoid circular feasibility:

- The outer session `GenerationIntent` contains the player register choice (`Low`, `Middle`, `High`, or `Varying`), validated profile, normalized controls, and seed. It is orchestration input, not the core planner contract.
- A core `GenerationRequest` always contains one explicit resolved window, as required by the stable generator boundary. For a fixed register, orchestration constructs one core request. For `Varying`, it constructs one candidate core request per structurally valid window in canonical `Low, Middle, High` order; no core request ever contains unresolved `Varying`.

For each candidate core request, Step 7 runs the same bounded complete pipeline: enumerate the finite harmony domain, enumerate the finite rhythm domain, bind the harmony candidate's abstract tension requirements to the rhythm candidate, run pitch search, and independently validate any result. Preserve each domain's stable zero-based indices. Rank harmony candidates by requested abstract tension preference and rhythm candidates by their explicit rhythm-policy scores; among equal-ranked candidates derive named-stream tie keys from seed plus stable candidate identity, using canonical index only on key collision. Pair iteration is without replacement: exhaust pitch candidates, then advance rhythm candidate, then harmony candidate. A failed binding skips only that pair. The first valid result for a window proves that window eligible and is retained; structural domain exhaustion proves it unsuccessful, while a search ceiling reports `search_limit_exceeded` and does not prove ineligibility.

For `Varying`, evaluate every canonical window to a determinate success/failure outcome. Collect successful `(resolved core request, validated result)` pairs. Derive a stable register-stream key from the outer intent/seed and each successful window identity, choose the pair with the lowest unsigned key, and use canonical `Low, Middle, High` index only as a hash-collision fallback. Return/reuse that already-resolved core request and result. This deterministically selects one eligible complete-phrase policy and never changes window mid-phrase. If no window succeeds after complete searches, return `no_eligible_register_window`. If any window is indeterminate because of a search ceiling, return `search_limit_exceeded` without selecting from an incomplete successful set.

Planners exchange immutable values and do not instantiate or mutate one another. Harmony/rhythm domain identities, bound-pair identities, candidate indices, and window identities remain in diagnostics so fixed intent and seed reproduce the same iteration and outcome.

Typed failures distinguish:

- `invalid_request` or `invalid_profile` before planning;
- `no_eligible_register_window` for Varying only after all three structurally valid window pipelines complete without a valid phrase;
- `no_legal_harmony_plan` only when the structural harmony domain is empty; `no_legal_rhythm_plan` only when the structural rhythm domain is empty; and `no_legal_pitch_plan` for a fixed resolved window only after every canonically ordered harmony/rhythm pair and pitch domain is exhausted;
- `search_limit_exceeded` when an implementation guard stops search before exhaustion;
- `result_validation_failed` if generated output violates an invariant (an implementation defect, not a candidate to return).

No failure path changes the seed, retries nondeterministically, relaxes a control, widens a range/window, removes a rest, changes profile, returns a partial phrase, or substitutes a previous result as a new success.

### Generation search ledger (engineering policy, `generation-search-v1`)

Each window search runs under its own independent, wall-clock-independent fuel ledger: one fresh `FuelLedger` per resolved window, opened under a versioned `GenerationSearchPolicy` whose default allowance (`DEFAULT_WINDOW_SEARCH_FUEL`) is `250_000` units. Spending is 1 unit per visited harmony/rhythm pair, 1 unit per attempted concrete tension binding, plus every pitch search's own `fuelUsed` (its `advance` call count); the pitch search itself is bound to whatever fuel remains in the window's ledger at the time it is invoked. Any refusal of further work — remaining fuel below 1 while candidate space remains, exactly 0 remaining immediately after charging a binding, or the pitch search itself returning `search_limit_exceeded` — resolves the window as `search_limit_exceeded`; only a search that runs out of candidate space to try, never fuel, resolves it as exhausted with no legal plan. This allowance is a calibration value, not musical theory: it is sized from measurement (observed successful-window fuel spend and observed pure-pair-exhaustion bounds), not from any rule about what is or isn't a legal phrase, and it may be revised independently of every other policy in this document.

## Independent whole-result validation

Validation reconstructs facts from the immutable result rather than trusting planner annotations:

- exactly four tiled 4/4 bars and one deterministic event order;
- every note/rest/tie and harmony boundary is valid;
- every source pitch is within the active range and resolved whole-phrase window;
- every Neutral pitch is in collection; every Jazz exception forms a complete immediate approach/enclosure to a chord tone;
- every tie repeats pitch and remains legal across harmony;
- contour checkpoints, leap caps/budgets, recovery debts, and arpeggio-run limits pass;
- every scheduled local tension resolves before the final sounding event;
- final sounding pitch/harmony satisfy [open-ending policy](harmony-planner-policy.md#open-ending), except the settleable debt a phrase generated with carry-in may leave (see [joins between session phrases](#joins-between-session-phrases-v2));
- same outer intent and seed reproduce successful-window set, resolved core request/register, harmony/rhythm iteration, pitch tie keys, timeline, annotations, and failure if any.

The pitch-phrase validator applies these readings, and the planner must match them:

- Free diatonic passing and neighbor tones are ordinary vocabulary and don't count as tension figures.
  - A passing tone is entered and left by collection steps in the same direction and lands on a chord tone.
  - A neighbor leaves a chord tone by a collection step and returns to the same MIDI value.
- Appoggiaturas and two-note approaches are legal only as the bound tension figure. An appoggiatura is entered by a jump of three or more semitones.
- The leap count includes large leaps. Recovery debt applies only as described under [leap, recovery, and arpeggio state](#leap-recovery-and-arpeggio-state).
- Harmony is located by absolute beat. A sounding attack that no harmony event covers is a planner defect, not a validation failure.

Tests should include boundary MIDI values for all adopted windows, every collection/profile/contour/leapiness combination in representative seed matrices, and regression seeds for every discovered failure. Include Varying fixtures for every successful-window subset, no-success, and search-limit indeterminacy. Statistical musical quality is not an invariant: evaluate template weights, candidate variety, and control perceptibility in listening tests.

## Joins between session phrases (v2)

In a session, each phrase after the first is generated with a **carry-in** from the phrase before:
its last sounding pitch with its leap state (the interval that arrived at it, and any large-leap
recovery it still owes), its resolved register window, its final chord with that chord's role and
endpoint class, and its ordinal. A phrase generated without carry-in (the Idle phrase that becomes
phrase 1, the failure ladder's standalone phrase) is exactly the first-release phrase for its
request and seed, and owes nothing at its end.

- **The carried pitch is the note before beat 1.** The first interval meets the leapiness cap and
  counts in the new phrase's leap budget. A chain of skips or leaps arriving at the carried pitch
  stays open, so continuing it across the join in the same direction is invalid: a chain that
  spans the join always spans a harmony change and can never be a recognized run. Tension figures
  stay inside one phrase: the carried pitch never prepares a non-chord tone of the new phrase, so
  the first attack is a chord tone (or a Jazz ornament member), as in the first release.
- **The register window is carried.** `Varying` is resolved once, for phrase 1, and every later
  phrase is searched in that one window. A fixed register must carry its own window.
- **The harmony starts from the carried chord.** Every template opens on the collection's tonic
  (degree 1), so the join always moves from the degree-5 open arrival (tonal gentle and active
  motion) or the tonic area (static and modal harmony) to the tonic. The carried chord must be one
  the same settings end a phrase on.
- **A phrase generated with carry-in may end owing** (owner's decision): the recovery of a large
  leap into its final note, or a tense final note (a scale tone outside the final chord, reached
  by a collection step). It may end owing only what the next phrase can settle inside the carried
  window: a tone of the tonic triad 1-4 semitones back against the leap, or a tonic-triad tone one
  collection step from the tense note. When it ends on a tense note, that note replaces the open
  endpoint chord tone; the phrase still never closes on the tonic.
- **The next phrase settles the debt on its first note, never later.** An owed recovery is repaid
  by the first interval (opposite direction, 1-4 semitones). A tense carried note is resolved by
  the first note: a collection step onto a tone of the first chord.
- **A join made without carry-in settles nothing.** The standalone phrase and a repeated phrase
  are not held to any of these rules, and a debt the phrase before left owing is simply dropped.

The independent validator reads the carry-in from the resolved request and applies the same
interval, chain, budget, recovery and resolution rules to the join, reporting a join failure at
attack 0. The ending allowance is decided in one place,
`src/domain/generation/carry-in/phrase-ending-debt.ts`, which the planner and the validator both
read.

## Calibration questions

The candidate-role ordering, contour strictness, arpeggio-chaos ranking, search ceiling, and relative frequency of optional ornaments remain empirical calibration. Keep these values visible and versioned. Listening may alter rankings or probabilities inside the settled legal envelope; it cannot authorize Neutral chromaticism, Jazz harmonic chromaticism, unresolved ornaments, range escape, closed endings, or nondeterministic fallback.
