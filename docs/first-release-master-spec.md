# Infinite Flow: First-Release Master Specification

Status: draft v1.0 - ready for implementation handoff

## Objective

Build a client-side web application that generates one coherent, staff-notated four-measure musical proposal for a tenor saxophone player. The player selects musical controls and explicitly regenerates the entire phrase to hear and see a different variation. The product's immediate value is a musically legible proposal, not playback, accompaniment, scoring, or an endless autonomous session.

## Scope

### Included

- Generate exactly four measures in 4/4 at a user-selected stable BPM.
- Render the complete proposal in conventional staff notation with chord labels or harmonic context.
- Generate and retain one concert-pitch event timeline for every phrase.
- Let the player redraw the same phrase as Concert, B-flat, or E-flat notation. Display transposition never changes generated pitches, harmony, the seed, or the active range policy.
- Offer a style-neutral profile and an optional jazz profile.
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

- **Tempo:** one stable BPM for the entire phrase.
- **Tonal context:** a selected concert-pitch tonal center plus a major, minor, or modal scale or mode.
- **Harmonic motion:** static, gentle diatonic motion, or active diatonic motion. The player does not enter chord progressions.
- **Tension:** settled through greater melodic and rhythmic pull. This maps to observable musical choices rather than an objective tension number.
- **Note density:** quarter notes, eighth notes, sixteenth notes, or mixed subdivisions.
- **Syncopation:** straight, occasional offbeat placement, or active displacement.
- **Silence density:** sparse rests, conversational space, or breath-heavy phrasing.
- **Contour:** rising, falling, arch, or wandering.
- **Register:** low, middle, or high within the active range.
- **Leapiness:** stepwise through wide intervals.
- **Arpeggio chaos:** predictable nearby chord-tone order through reordered chord tones and stronger interval contrast. It never allows pitches outside the selected profile or ignores contour, range, and resolution constraints.
- **Profile:** neutral by default or jazz.

## Musical Behavior

### Shared Constraints

- The output is one short phrase, not four independently random measures.
- Every measure fills exactly four beats using the selected subdivision grid.
- All generated source pitches are concert MIDI 45 through 58. This is the conservative first-release tenor policy, corresponding to written `B3` through `C5` for B-flat tenor with middle C defined as MIDI 60.
- Phrase regeneration must be deterministic for a given complete request and seed.
- The four-bar phrase ends open so the player can continue playing. A closed tonic ending is a later option.

### Neutral Profile

- Stay entirely inside the selected major, minor, or modal collection.
- Use mostly diatonic chord movement. Low motion sustains tonic or tonic prolongation; higher motion introduces diatonic departure and return. In tonal material, active motion may use tonic, predominant, dominant, then an open dominant arrival. Modal material must not invent a raised leading tone merely to force a dominant cadence.
- Prefer chord tones on beat 1 and at chord changes.
- Use diatonic passing and neighbor tones as controlled movement. At increased tension, allow an accented diatonic appoggiatura that resolves by step; keep it limited and resolution-directed.
- Build bars 1-2 as a rhythmic gesture and bars 3-4 as a related answer that varies an ending, onset, or contour.
- Preserve at least one metrical anchor per bar. Syncopation moves selected events to offbeats or sustains across stronger beats; it does not erase the pulse.
- Use actual rests as phrase boundaries and breath opportunities, not merely lower event count.
- Prefer steps and diatonic thirds. Larger leaps must respect leapiness, register, and a recovery by opposite-direction step or short contrary motion. Consecutive leaps must form a recognizable arpeggio rather than arbitrary zig-zags.

### Jazz Profile

- Reuse the neutral profile's diatonic harmonic plan and phrase construction.
- Permit a one-note chromatic approach from one semitone above or below a target chord tone, immediately resolving to that target.
- Permit a two-note chromatic enclosure around a target chord tone only when the subdivision gives the resolution enough room to be heard.
- Keep approaches and enclosures brief, resolution-directed, and limited. They must not form a new chord, target a non-chord tone, remain unresolved at phrase end, or imply altered harmony.

## Architecture and Boundaries

Generation uses a stable, serializable request/result boundary. The request contains the measure count, meter, BPM, tonal context, normalized controls, profile identity, active tenor range, optional future phrase context, and deterministic seed. It does not contain notation transposition, browser state, audio state, or mutable session data.

The result is an immutable concert-pitch timeline of measures, chord events, note events, rests, and optional musical annotations. It contains no staff-rendering symbols, written pitches, audio scheduling timestamps, MIDI device messages, or scoring state. A result either satisfies the requested meter and hard range constraints or fails explicitly; it must not return an invalid phrase.

Separate components own control mapping, harmony planning, rhythm planning, pitch planning, notation rendering, optional backing arrangement, MIDI input, and later evaluation. A component consumes explicit data from another component rather than internal state. A profile supplies musical policy; it does not own user-interface widgets, browser APIs, scheduling, or persistence.

## MIDI and Notation

MIDI is optional in this release and has no timing role. If enabled, a received pitch that matches a proposed staff note may highlight that proposal note. Any other received pitch produces a gentle mismatch indication without showing the received pitch. MIDI input never changes generation, advances the phrase, evaluates timing, or yields a score.

Notation renders standard staff notation from the concert-pitch timeline. Concert, B-flat, and E-flat are display modes only. The original phrase must remain identical after any display switch.

## Definition of Done

- A user can select all first-release controls and generate a complete four-measure 4/4 phrase.
- Every generated measure is complete, and every generated concert pitch falls inside MIDI 45 through 58.
- The neutral profile contains no chromatic pitches outside its selected collection, substitutions, altered dominants, or chromatic enclosures.
- The jazz profile adds only bounded chromatic approaches and enclosures that immediately resolve to chord-tone targets; its harmony remains diatonic.
- Re-generating changes the seed while preserving controls; supplying the same full request and seed reproduces the same result.
- Standard staff notation renders the phrase, and changing among Concert, B-flat, and E-flat changes only written display values.
- If the optional MIDI indicator is enabled, it never exposes an unmatched incoming pitch and never calculates or displays a performance score.
- The application operates entirely in the browser for its required first-release behavior, without server dependency.

## Deferred Work and Visible Gaps

- Optional backing has no decided role yet. If added, it must read the generated harmony and BPM without changing lead generation.
- The exact mechanism by which a later planner may repair a previous planner's voice-leading or playability decision remains open. Any future repair must preserve the component boundaries above.
- Step two will accept one or two MIDI measures, retain the player-selected tonal context, transform phrase character, and append measures to a rolling staff. It does not yet define automatic key detection.
- Later work may add instrument-specific or player-selected ranges, phrase-end controls, playback, session export, and non-scoring descriptive practice feedback.
