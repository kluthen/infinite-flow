# Infinite Flow: First-Release Master Specification

Status: draft v1.6 - ready for implementation handoff

## Objective

Build a client-side web application that generates one coherent, staff-notated four-measure musical proposal for a selected first-release instrument profile. The player selects musical controls and explicitly regenerates the entire phrase to hear and see a different variation. The product's immediate value is a musically legible proposal, not playback, accompaniment, scoring, or an endless autonomous session.

## Scope

### Included

- Generate exactly four measures in 4/4 at a user-selected stable BPM.
- Render the complete proposal in conventional staff notation with chord labels or harmonic context.
- Support the phrase workspace on mobile and tablet devices in landscape orientation and on desktop when sufficient width is available. Portrait mobile and tablet views show a rotate-device notice instead of an interactive score.
- Generate and retain one concert-pitch event timeline for every phrase.
- Support declarative C MIDI keyboard, B-flat tenor saxophone, and E-flat alto saxophone instrument profiles. Each supplies an explicit inclusive active concert range and register-window policy to generation.
- Let the player redraw the same phrase as Concert, B-flat, or E-flat notation. B-flat is the first-load display mode. Display transposition never changes generated pitches, harmony, the seed, or the active range policy.
- Follow the operating-system light/dark preference on first load, with a manual light or dark override available to the player.
- Offer a style-neutral default profile and an optional jazz profile, each with the defined first-release preset values.
- Offer controls for tonal center, scale or mode, harmonic motion, tension, note density, syncopation, silence density, contour, register, leapiness, and arpeggio chaos.
- Regenerate all four measures from the same controls with a new random seed. Retain the seed so a result can be exactly reproduced internally.
- Optionally accept MIDI controller input only to validate connection and provide gentle visual match or mismatch indication. Never display an unmatched played pitch.

### Explicitly Excluded

- Generated lead-line playback.
- Required backing or accompaniment. BPM-aligned backing may be added only as a non-blocking enhancement.
- Microphone capture, audio-to-note transcription, and acoustic pitch detection.
- Continuous generation, a rolling staff, seed-phrase capture, automatic key detection, phrase adaptation, or long-term personalization.
- Tempo variation, meters other than 4/4, pulse-feel controls, direct chord-progression authoring, altered dominants, substitutions, modulation, and altissimo.
- Performance scores, grades, rankings, or a pass/fail interpretation of player input.
- Persistence. Sessions are ephemeral; later work may capture and export them.

## Player Controls

- **Tempo:** one stable BPM for the entire phrase, selectable from 60 through 240 BPM in 10 BPM increments. The default is 90 BPM.
- **Tonal context:** one of all twelve concert-pitch pitch classes plus a collection. The display label follows the first-release enharmonic-spelling rule. The default is C Ionian.
- **Collection:** major, minor, Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, or Locrian. The seven named church modes are all available; major and Ionian, and minor and Aeolian, remain separately selectable labels.
- **Harmonic motion:** static, gentle diatonic motion, or active diatonic motion. The player does not enter chord progressions.
- **Tension arc:** `Settled`, `Lift`, `Build`, or `Edge`, defaulting to `Lift`. It schedules permitted diatonic instability and local resolution across the phrase; it is not an objective tension score and cannot relax another selected control's limits.
- **Note density:** quarter notes, eighth notes, sixteenth notes, or mixed subdivisions.
- **Syncopation:** straight, occasional offbeat placement, or active displacement.
- **Silence density:** sparse rests, conversational space, or breath-heavy phrasing.
- **Contour:** rising, falling, arch, or wandering.
- **Register:** `Low`, `Middle`, `High`, or `Varying` within the selected instrument profile's active concert range and register-window policy. `Varying` is a player-selectable value, not a separate range: for each generation request, the seeded planner selects one eligible `Low`, `Middle`, or `High` register policy for the complete phrase. An eligible policy is one that can produce a phrase within the profile-derived active range while satisfying the selected contour, musical profile, leapiness, and recovery rules. If no eligible policy can produce a valid phrase, generation fails explicitly rather than relaxing a hard constraint.
- **Leapiness:** `Smooth`, `Shaped`, `Leaping`, or `Angular`, defaulting to `Shaped`. It sets adjacent-interval caps, a phrase leap budget, and recovery obligations.
- **Arpeggio chaos:** predictable nearby chord-tone order through reordered chord tones and stronger interval contrast. It never allows pitches outside the selected musical profile or ignores contour, range, and resolution constraints.
- **Musical profile preset:** neutral by default or jazz. This is distinct from the selected instrument profile. The neutral preset's complete bundle is static harmonic motion, quarter-note density, straight syncopation, sparse rests, arch contour, and `Middle` register. The jazz preset's complete bundle is gentle diatonic harmonic motion, eighth-note density, occasional offbeats, conversational space, wandering contour, and `Varying` register. Selecting either preset replaces all six preset-controlled controls with that complete bundle, regardless of their current values.
- **Custom configuration after a preset:** A manual change to any preset-controlled control after selecting a preset creates a custom current configuration. It preserves the selected musical profile's grammar while using the manually selected control values; it does not mutate either preset definition. Selecting neutral or jazz again discards the custom values and reapplies that preset's complete bundle.

## Musical Behavior

### Shared Constraints

- The output is one short phrase, not four independently random measures.
- Every measure fills exactly four beats using the selected subdivision grid.
- All generated source pitches are inside the selected profile's inclusive active concert range. The generation boundary obtains this active range and the selected register-window policy explicitly from the validated instrument profile.
- Phrase regeneration must be deterministic for a given complete request and seed.
- With `Varying` register, the seed deterministically selects one eligible non-varying register policy for the whole phrase. It must not change policies between measures or individual notes, and it must not extend or otherwise relax the profile-derived active range, contour, musical profile, leapiness, or recovery rules.
- The four-bar phrase ends open so the player can continue playing. A closed tonic ending is a later option.
- The request contains the selected values, including musical profile preset, tension arc, and leapiness. Applying a theme or changing display transposition is not a generation request and cannot alter the phrase.

### Tension Arc

- `Settled` prioritizes chord tones on metrically strong locations and resolves an active scale degree by the next strong onset.
- `Lift` permits a small amount of active diatonic motion in measures 2-3 and one resolution deferred to the following beat or bar.
- `Build` concentrates active notes and permits one limited two-note diatonic approach in the middle of the phrase.
- `Edge` places the greatest permitted instability in measure 3 and uses the latest valid local resolution.
- At every level, local dissonances, appoggiaturas, jazz approaches, and jazz enclosures resolve before the final sounding event. The endpoint remains open: use a final dominant chord tone when generated tonal motion ends on dominant; with static tonic prolongation or modal material, use a profile-approved non-final tonic-area continuation such as scale degree 5, never an asserted tonic closure.
- Tension ranks only legal candidates. In priority order, hard feasibility and cadence policy; profile, tonal collection, range, and contour; density and silence budgets; syncopation onset plan; leapiness and arpeggio-chaos candidates; tension ranking; then the seeded deterministic tie-break decide the phrase. Tension cannot add onsets, remove rests, change register, exceed leap limits, or turn syncopation into a monotonic tension control.

### Leapiness

- Measure intervals between adjacent sounding notes only; intervening rests do not count. A step is 1-2 semitones, a skip 3-4, a leap 5-6, and a large leap 7-12. No adjacent interval may exceed an octave.
- `Smooth` permits intervals up to 4 semitones and no leaps; arpeggio chaos cannot create one.
- `Shaped` permits intervals up to 7 semitones, at most 2 leaps, and at most 1 large leap. A large leap recovers immediately; one recognized two-note chord-tone skip pair is permitted.
- `Leaping` permits intervals up to 10 semitones, at most 4 leaps, and at most 2 large leaps. Each large leap recovers immediately or after one recognized same-direction chord-tone run of no more than 3 notes.
- `Angular` permits intervals up to 12 semitones, at most 6 leaps, and at most 3 large leaps, with the same recovery rule. It permits no more than one 3-note arpeggio run per measure or two per phrase.
- These are ceilings, not quotas. After a large leap or recognized run, recovery is an opposite-direction step of 1-2 semitones or short contrary motion of 3-4 semitones. A recognized arpeggio is a coherent 2-3-note same-direction chord-tone run under one harmony; an unrecognized chain of two same-direction leaps is invalid. The planner reserves enough range to satisfy selected contour and recovery before accepting an outward leap.

### Neutral Profile

- Stay entirely inside the selected major, minor, or modal collection.
- Use mostly diatonic chord movement. Static motion sustains tonic or tonic prolongation; gentle and active motion introduce diatonic departure and return. In tonal material, active motion may use tonic, predominant, dominant, then an open dominant arrival. Modal material must not invent a raised leading tone merely to force a dominant cadence.
- Prefer chord tones on beat 1 and at chord changes.
- Use diatonic passing and neighbor tones as controlled movement. At increased tension, allow an accented diatonic appoggiatura that resolves by step; keep it limited and resolution-directed.
- Build bars 1-2 as a rhythmic gesture and bars 3-4 as a related answer that varies an ending, onset, or contour.
- Preserve at least one metrical anchor per bar. Syncopation moves selected events to offbeats or sustains across stronger beats; it does not erase the pulse.
- Use actual rests as phrase boundaries and breath opportunities, not merely lower event count.
- Prefer steps and diatonic thirds. Larger leaps must satisfy the selected leapiness policy, register, contour, range reservation, and recovery rule. Consecutive leaps must form a recognized arpeggio rather than arbitrary zig-zags.

### Jazz Profile

- Reuse the neutral profile's diatonic harmonic plan and phrase construction.
- Permit a one-note chromatic approach from one semitone above or below a target chord tone, immediately resolving to that target.
- Permit a two-note chromatic enclosure around a target chord tone only when the subdivision gives the resolution enough room to be heard.
- Keep approaches and enclosures brief, resolution-directed, and limited. They must not form a new chord, target a non-chord tone, remain unresolved at phrase end, or imply altered harmony.

## Architecture and Boundaries

Generation uses a stable, serializable request/result boundary. The request contains the measure count, meter, BPM, tonal context, normalized controls, musical profile preset, selected instrument-profile identity, its explicit active concert range and register-window policy, optional future phrase context, and deterministic seed. The generation boundary consumes the profile-derived range/register policy rather than branching on an instrument identity or display convention. It does not contain notation transposition, theme preference, browser state, audio state, or mutable session data.

The result is an immutable concert-pitch timeline of measures, chord events, note events, rests, and optional musical annotations. It contains no staff-rendering symbols, written pitches, audio scheduling timestamps, MIDI device messages, or scoring state. A result either satisfies the requested meter and selected-profile hard range constraints or fails explicitly; it must not return an invalid phrase.

Separate components own control mapping, harmony planning, rhythm planning, pitch planning, notation rendering, optional backing arrangement, MIDI input, and later evaluation. A component consumes explicit data from another component rather than internal state. Instrument profiles are validated declarative data: adding a valid profile supplies its identity, concert-pitch range, register-window policy, and metadata without conditional changes to melodic, harmonic, rhythm, or notation-rendering logic. The first-release profiles and inclusive windows are C MIDI keyboard `48-72` with Low `48-60`, Middle `54-66`, and High `60-72`; B-flat tenor saxophone `46-70` with Low `46-58`, Middle `52-64`, and High `58-70`; and E-flat alto saxophone `51-75` with Low `51-63`, Middle `57-69`, and High `63-75`. `Varying` deterministically selects one feasible complete-phrase window from Low, Middle, and High; it never changes window mid-phrase. Musical profiles supply musical policy; neither profile type owns user-interface widgets, browser APIs, scheduling, or persistence.

## MIDI and Notation

MIDI is optional in this release and has no timing role. If enabled, a received pitch that matches a proposed staff note may highlight that proposal note. Any other received pitch produces a gentle mismatch indication without showing the received pitch. MIDI input never changes generation, advances the phrase, evaluates timing, or yields a score.

Notation renders standard staff notation from the concert-pitch timeline in treble G2 clef. Concert, B-flat, and E-flat are independently selected display conventions only; B-flat is selected on first load. The original phrase must remain identical after any display switch. A display switch cannot mutate the concert timeline, the selected instrument profile, its range/register policy, or any generation control. Concert-to-written transforms are Concert `+0 chromatic/+0 diatonic`, B-flat tenor `+14 chromatic/+8 diatonic` (major ninth), and E-flat alto `+9 chromatic/+5 diatonic` (major sixth). Apply the selected transform to note spelling, key, tonal-center label, chord root, and slash bass, but preserve chord quality, alterations, extensions, additions, and omissions.

Switching the selected instrument profile validates every unchanged concert event against the new profile's active range. If all events fit, retain the current phrase and redraw it using the selected display convention. If any event does not fit, retain the current controls, select a fresh seed, and regenerate the complete phrase under the new profile. Never transpose source events to fit a profile.

### Enharmonic Spelling

- In each display mode, first derive the written tonal center and collection from the unchanged concert-pitch timeline and that mode's transposition. Choose the enharmonic representation that requires the fewest accidentals for that written tonal center and collection. If two representations require the same fewest number of accidentals, choose the sharp representation.
- Apply that one representation consistently to the displayed tonal-center label, key signature, written note accidentals, and chord symbols. No displayed item may use a different enharmonic convention solely because another equivalent spelling is possible.
- Switching among Concert, B-flat, and E-flat recalculates written spellings under this rule for the selected display mode only. It must not change concert pitches, harmony, seed, active range policy, or any generation control.

## Definition of Done

- A user can select every chromatic tonal center; major, minor, and each church mode; a 60-240 BPM tempo in 10 BPM increments; and all other first-release controls, then generate a complete four-measure 4/4 phrase. First load uses 90 BPM, C Ionian, the neutral preset, `Lift` tension, and `Shaped` leapiness.
- Selecting neutral sets harmonic motion, note density, syncopation, silence density, contour, and register to neutral's complete bundle; selecting jazz sets each of those six controls to jazz's complete bundle. The selection replaces every one of the six values even when one or more values were manually changed beforehand.
- After a preset selection, manually changing one or more of those six controls produces a custom current configuration without changing either preset's defined bundle or the selected profile's musical grammar. A later selection of neutral or jazz restores every value in the newly selected preset's complete bundle. Jazz applies `Varying`; for a given complete request and seed, it selects exactly one eligible `Low`, `Middle`, or `High` policy for the complete phrase while retaining all hard musical constraints. The workspace supports landscape mobile and tablet views; a portrait mobile or tablet view shows a rotate-device notice instead of interactive phrase controls.
- Every generated measure is complete, and every generated concert pitch falls inside the selected profile's inclusive active range: C MIDI keyboard `48-72`, B-flat tenor saxophone `46-70`, or E-flat alto saxophone `51-75`. The selected whole-phrase register window is respectively one of C Low `48-60`, Middle `54-66`, High `60-72`; B-flat Low `46-58`, Middle `52-64`, High `58-70`; or E-flat Low `51-63`, Middle `57-69`, High `63-75`.
- Every result satisfies the selected tension-arc and leapiness caps, budgets, arpeggio-run rules, recovery rules, local-resolution requirement, and open-ending requirement.
- The neutral profile contains no chromatic pitches outside its selected collection, substitutions, altered dominants, or chromatic enclosures.
- The jazz preset sets gentle diatonic harmonic motion. The jazz profile adds only bounded chromatic approaches and enclosures that immediately resolve to chord-tone targets; its harmony remains diatonic.
- Re-generating changes the seed while preserving controls; supplying the same full request and seed reproduces the same result.
- For every supported tonal center, collection, and Concert, B-flat, or E-flat display mode, standard staff notation uses treble G2 clef and the enharmonic spelling requiring the fewest accidentals; equal minima use sharps. The resulting tonal-center label, key signature, note accidentals, chord roots, and slash bass use the same spelling convention; chord quality remains unchanged. B-flat notation is selected on first load, and changing display modes changes only these written display values; it cannot change the concert timeline or the profile-derived generator policy.
- Switching instrument profiles retains the unchanged concert phrase when every event fits the new active range; otherwise it retains the controls, uses a fresh seed, and regenerates all four measures under the new profile. It never transposes source events to force a fit.
- The initial theme uses the system preference, and a manual light or dark override changes presentation without changing the phrase request or result.
- If the optional MIDI indicator is enabled, it never exposes an unmatched incoming pitch and never calculates or displays a performance score.
- The application operates entirely in the browser for its required first-release behavior, without server dependency.

## Deferred Work and Visible Gaps

- Optional backing has no decided role yet. If added, it must read the generated harmony and BPM without changing lead generation.
- The exact mechanism by which a later planner may repair a previous planner's voice-leading or playability decision remains open. Any future repair must preserve the component boundaries above.
- Step two will accept one or two MIDI measures, retain the player-selected tonal context, transform phrase character, and append measures to a rolling staff. It does not yet define automatic key detection.
- Later work may add additional instrument profiles or player-selected range variants through separately validated declarative range/register definitions, as well as phrase-end controls, playback, session export, and non-scoring descriptive practice feedback.
