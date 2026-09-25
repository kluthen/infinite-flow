# Harmony Planner Policy

Status: first-release implementation policy

## Authority and evidence

The [first-release master specification](../../specs/first-release-master-spec.md) is authoritative when this document differs from general theory or older research notes. The [generator contract](../../specs/generator-contract.md) assigns chord events and phrase-level harmonic roles to the harmony planner. The [generator architecture](../../specs/generator-architecture.md) requires Neutral and Jazz to share a diatonic harmonic plan.

**Evidence:** Diatonic triads are built by stacking collection members in thirds. In tonal major/minor, tonic, tonic-prolongation, predominant, and dominant are useful functional categories; an ending on dominant can remain open. These are conventions, not rules for every modal tradition. See [research sources S1-S4](research-sources.md#phrase-function-and-cadence).

**Project policy:** First release always produces an open four-bar phrase, keeps harmony inside the selected collection, and gives Neutral and Jazz the same harmony. It excludes altered dominants, secondary dominants, substitutions, borrowed chords, modulation, and profile-specific Jazz harmony.

**Implementation inference:** The finite candidate vocabulary and templates below operationalize that policy. They are deliberately conservative and should be changed only as versioned planner policy after listening tests, not presented as universal theory.

## Collection and chord vocabulary

Represent a collection as seven ordered pitch classes relative to the selected concert tonic. Use these semitone sets:

| Selection | Ordered offsets |
| --- | --- |
| Major, Ionian | `0, 2, 4, 5, 7, 9, 11` |
| Minor, Aeolian | `0, 2, 3, 5, 7, 8, 10` |
| Dorian | `0, 2, 3, 5, 7, 9, 10` |
| Phrygian | `0, 1, 3, 5, 7, 8, 10` |
| Lydian | `0, 2, 4, 6, 7, 9, 11` |
| Mixolydian | `0, 2, 4, 5, 7, 9, 10` |
| Locrian | `0, 1, 3, 5, 6, 8, 10` |

Build the triad on degree `d` from collection degrees `d`, `d+2`, and `d+4`, wrapping modulo seven. Store degree and pitch classes; derive the displayed quality from those pitch classes. Do not alter a collection degree to manufacture a major dominant or leading tone. Major and Minor use the tonal template family; the seven explicitly named church modes, including Ionian and Aeolian, use the modal family so their separately selectable labels retain distinct planning behavior.

The first-release chord vocabulary is root-position diatonic triads only. Inversions, sevenths, suspensions, slash chords, and non-triad sonorities are outside this policy even when they could be diatonic.

## Harmonic event rules

- A harmony event starts on a quarter-note boundary (`0`, `1`, `2`, or `3` beats within a bar), lasts until the next harmony event, and never crosses the four-bar boundary.
- Static and gentle plans use at most one event per bar. Active plans use one event per bar and may split bars 2 or 3 into two two-beat events; no other split is legal.
- Adjacent identical triads merge into one sustained event in the serialized plan while retaining per-bar phrase-role annotations.
- Every event records collection degree, derived chord pitch classes/quality, start, duration, role, and template identifier. Harmony is concert-pitch context, not a notation spelling decision.
- Jazz and Neutral expose exactly the same harmony-candidate domain for the same harmony-affecting controls. Profile-specific melodic ornaments are not part of harmony enumeration.

## Tonal motion candidates

For Major and Minor, use `T` = degree 1, `TP` = degree 3 or 6, `PD` = degree 2 or 4, and `5` = the degree-5 open-arrival role. In Minor all chords remain natural-minor diatonic, so degree 5 derives as minor (`v`), not a raised-leading-tone common-practice dominant. Degree 7 is excluded from first-release templates because its diminished/major quality varies and adds no required behavior.

Templates list one role per bar. A set such as `{ii, IV}` is expanded in the written order for seed-independent canonical indexing; Step 7 applies any musical ranking and seeded equal-rank tie key without changing those identities/indices.

| Motion | Legal four-bar templates |
| --- | --- |
| Static | `I | I | I | I` |
| Gentle | `I | I | {ii, IV} | 5`; `I | {iii, vi} | I | 5`; `I | {iii, vi} | {ii, IV} | 5` |
| Active | `I | {iii, vi} | {ii, IV} | 5`; `I | {ii, IV} | 5 | 5`; `I | {iii, vi} | {ii, IV}->5 | 5`; `I | {iii, vi}-> {ii, IV} | 5 | 5` |

`A->B` means two two-beat events in that bar. The final tonal harmony is collection degree 5 for gentle and active motion: `V` in Major and `v` in natural Minor. This is an open degree-5 arrival policy, not a claim that natural-minor `v` has common-practice dominant force. Static remains on `I`; its melodic endpoint must still satisfy the open-ending pitch rule below. No template returns to `I` in bar 4.

## Modal motion candidates

Modal planning describes collection-relative color, not common-practice dominant function. Define a mode's color degree as Ionian `4`, Dorian `6`, Phrygian `2`, Lydian `4`, Mixolydian `7`, Aeolian `6`, and Locrian `5`. A `C` chord is any diatonic triad other than degree 1 that contains the mode's color degree. Canonically enumerate `C` candidates by degree; Step 7 may apply a seeded key only among candidates equal on the complete musical rank.

| Motion | Legal four-bar templates |
| --- | --- |
| Static | `i/I | i/I | i/I | i/I` |
| Gentle | `i/I | i/I | C | i/I`; `i/I | C | i/I | i/I` |
| Active | `i/I | C1 | C2 | i/I`; `i/I | C1 | C2->C1 | i/I`; `i/I | C1->C2 | C1 | i/I` |

`C1` and `C2` must be different degrees. A candidate is illegal if no required color chord exists or if it repeats degree 1 in a `C` slot. Ending modal harmony on the modal tonic is permitted because openness is enforced melodically: the final sounding pitch must be a non-final continuation target, normally collection degree 5, and not degree 1. Locrian's diminished degree-1 triad is still the collection's tonic-area reference; the planner must not replace it with a chromatic major/minor tonic.

## Abstract tension requirements

The harmony planner describes tension requirements without reading a rhythm plan or naming concrete onsets. Each harmony candidate carries a finite abstract requirement record with an allowed bar region, maximum resolution delay, permitted figure kinds, required/maximum figure count, and the rule that every obligation must resolve before the final sounding event. Step 7 binds that record to each independently enumerated rhythm candidate and rejects only that harmony/rhythm pair when the rhythm has no legal realization.

| Arc | Scheduled policy |
| --- | --- |
| Settled | `required=0`; optional active figure must target the next abstract metrically strong sounding onset. |
| Lift | `required=0, maximum=1`, region bars 2-3; maximum delay is the next beat or next bar. |
| Build | `required=1, maximum=1`, region bars 2-3; permit one two-note diatonic approach; target must follow within the allowed region/delay. |
| Edge | `required=1, maximum=1`, region bar 3; prefer the latest legal local resolution that still precedes the final sounding event. |

Binding makes the delay concrete: every figure member and its target are consecutive sounding attacks under one harmony event, each starting no later than the next beat boundary (Lift, Build, Edge) or the next strong-onset boundary on beat 1 or 3 (Settled) after the previous attack ends. Rests may fall inside that delay, and a rest may separate the preparation note from the figure. See [Pitch Planner and Validation Policy](pitch-planner-validation.md#neutral-and-jazz-vocabulary).

An active diatonic pitch is a collection member outside the current triad. Passing tones and neighbors resolve by collection step into a chord tone. An appoggiatura is entered by leap and resolves by collection step into a chord tone. A Jazz approach/enclosure follows the stricter rules in [Pitch Planner and Validation Policy](pitch-planner-validation.md#neutral-and-jazz-vocabulary). The harmony candidate is valid with abstract requirements alone; only a bound harmony/rhythm pair needs concrete target onsets. A failed binding does not mutate either candidate and does not remove a required figure.

Tension ranks legal realizations; it does not select a different harmonic-motion level. The precedence is: meter and open-ending feasibility; collection/profile legality; instrument range and resolved window; contour; density and silence; syncopation; leap/recovery/arpeggio policy; tension preference; seeded tie-break.

## Open ending

- Tonal gentle/active: the final harmony is collection degree 5 and the final sounding pitch is a chord tone of it; natural Minor uses an open `v`/degree-5 arrival without implying raised-leading-tone dominant force.
- Tonal static: the final harmony remains degree 1 and the final sounding pitch is degree 5, not degree 1.
- Modal: the final sounding pitch is degree 5 over the final modal-tonic area. If degree 5 is infeasible under hard pitch constraints, another non-degree-1 chord tone may be used; degree 1 is never legal as the final sounding pitch.
- Every local non-chord tone, appoggiatura, Jazz approach, or enclosure resolves before that final event. The final event itself cannot carry a recovery debt or unresolved ornament role.
- A trailing rest is allowed. Endpoint validation examines the final sounding event, not the last timeline event.

These are product continuation cues, not claims that degree 5 is universally open in every mode or unaccompanied context. Audition the modal endpoint hierarchy and tonal static endpoint with players; do not silently replace them with tonic closure.

## Candidate domain, indexing, and failure

Step 5 returns one immutable `HarmonyCandidateDomain`, not one selected plan. It contains every structurally legal harmony candidate plus its abstract tension requirements.

1. Validate the normalized harmony-affecting controls and construct the exact collection/triads.
2. Expand templates in document order, chord alternatives by ascending collection degree, and optional split variants unsplit before split.
3. Reject candidates that violate motion, collection, event-count, profile-parity, or endpoint policy. Do not inspect rhythm, register, contour, or concrete pitch feasibility here.
4. Serialize each survivor into a stable structural identity consisting of collection, motion, template position, expanded degree sequence/event boundaries, and tension-requirement record.
5. Preserve expansion order and assign contiguous zero-based `candidateIndex` values. The same harmony-affecting controls always produce the same finite list and indices, independent of seed, rhythm, register, profile identity, object iteration order, or later candidate success.
6. Return `no_legal_harmony_plan` only when this structural domain is empty. Do not fall back to static motion, another collection, chromatic harmony, or a closed ending.

Step 7 may rank candidates with the requested tension preference and a stable seed-derived key, but it iterates without replacement and retains `candidateIndex` for diagnostics. For each harmony candidate it iterates the finite rhythm domain; a failed abstract-tension binding skips that pair, and an exhausted pitch search advances to the next rhythm candidate, then the next harmony candidate. Only exhaustion of every ordered harmony/rhythm pair for the resolved window produces downstream no-plan failure.

Final harmony validation reconstructs each triad from the selected collection, checks event boundaries/motion limits, confirms Neutral/Jazz domain parity, verifies abstract requirement shape, and checks endpoint class. Fixed harmony-affecting controls must reproduce the candidate identities and indices; fixed complete intent and seed must reproduce Step 7's iteration and selected result or failure.

## Calibration questions

The template order, frequency of two-event bars, modal color-chord preference, and perceived spacing among tension arcs are implementation hypotheses. Listening tests may tune rankings within the legal vocabulary. They may not expand harmony, change control ownership, or weaken the open-ending and deterministic-failure contracts without a product-policy decision.
