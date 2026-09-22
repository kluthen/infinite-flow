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
- Diatonic approach: one or two collection-step notes immediately preceding a chord-tone target.

Jazz inherits all Neutral candidates and adds:

- Chromatic approach: exactly one pitch one semitone above or below a target chord tone; the next sounding event is the target, with no intervening rest, harmony change, or attack.
- Chromatic enclosure: exactly two consecutive short attacks around one target chord tone, one above and one below in either order, followed immediately by the target. At least one enclosure pitch is outside the collection; each approach interval to the target side is one semitone. All three attacks are contiguous with no rest or harmony change.

Approach/enclosure attacks must be no longer than their target, must fit the selected rhythm without adding attacks, and cannot overlap another ornament. An enclosure requires three available sounding attacks; it is unavailable on Quarter density unless the actual rhythm already supplies those attacks. The target is always a chord tone. No chromatic pitch may be reclassified as a chord extension, altered harmony, or scale member. The final sounding event cannot be chromatic or an ornament target that leaves another obligation unresolved.

## Contour checkpoints

Choose each bar's checkpoint as its first metrical-anchor attack; if both beat 1 and beat 3 qualify, use beat 1. Compare checkpoint MIDI values, not every decorative note.

- Rising: checkpoints are non-decreasing and checkpoint 4 is above checkpoint 1.
- Falling: checkpoints are non-increasing and checkpoint 4 is below checkpoint 1.
- Arch: the unique highest checkpoint is in bar 2 or 3; checkpoints do not decrease before it or increase after it; the final checkpoint is below the peak.
- Wandering: checkpoint motion contains at least one change of direction and no monotonic run spans all four checkpoints; equal adjacent checkpoints are neutral and do not count as a direction.

Decorative notes may move contrary to checkpoint direction. Before accepting a pitch, forward-check that remaining checkpoint domains can still satisfy the selected contour and open endpoint. If not, reject the pitch. A contour with no feasible checkpoint assignment fails explicitly; it is not weakened to wandering.

## Leap, recovery, and arpeggio state

Measure adjacent sounding-note intervals in semitones; rests do not interrupt adjacency. A step is `1-2`, skip `3-4`, leap `5-6`, and large leap `7-12`. Apply the exact level caps and budgets in [Melodic Control Models: Leap budgets](melodic-control-models.md#leap-budgets-preserve-direction-within-the-selected-register-window).

Planner state includes total leaps, total large leaps, per-bar/phrase arpeggio runs, pending recovery direction, and active arpeggio run. After a large leap, require an opposite-direction `1-2` step or `3-4` short contrary move on the next sounding note. A recognized arpeggio contains `2-3` consecutive sounding chord-tone notes under one unchanged harmony, connected by `1-2` adjacent same-direction skip/leap intervals. Every note must be a chord tone; chromatic ornaments and non-chord tones cannot join it. A two-note recognized run has one interval. Two same-direction skip/leap intervals necessarily require three sounding chord-tone notes and must be recognized as that complete three-note run before the second interval is committed; otherwise the second interval is invalid. A recognized run defers any recovery debt until its final note.

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

## Independent whole-result validation

Validation reconstructs facts from the immutable result rather than trusting planner annotations:

- exactly four tiled 4/4 bars and one deterministic event order;
- every note/rest/tie and harmony boundary is valid;
- every source pitch is within the active range and resolved whole-phrase window;
- every Neutral pitch is in collection; every Jazz exception forms a complete immediate approach/enclosure to a chord tone;
- every tie repeats pitch and remains legal across harmony;
- contour checkpoints, leap caps/budgets, recovery debts, and arpeggio-run limits pass;
- every scheduled local tension resolves before the final sounding event;
- final sounding pitch/harmony satisfy [open-ending policy](harmony-planner-policy.md#open-ending);
- same outer intent and seed reproduce successful-window set, resolved core request/register, harmony/rhythm iteration, pitch tie keys, timeline, annotations, and failure if any.

Tests should include boundary MIDI values for all adopted windows, every collection/profile/contour/leapiness combination in representative seed matrices, and regression seeds for every discovered failure. Include Varying fixtures for every successful-window subset, no-success, and search-limit indeterminacy. Statistical musical quality is not an invariant: evaluate template weights, candidate variety, and control perceptibility in listening tests.

## Calibration questions

The candidate-role ordering, contour strictness, arpeggio-chaos ranking, search ceiling, and relative frequency of optional ornaments remain empirical calibration. Keep these values visible and versioned. Listening may alter rankings or probabilities inside the settled legal envelope; it cannot authorize Neutral chromaticism, Jazz harmonic chromaticism, unresolved ornaments, range escape, closed endings, or nondeterministic fallback.
