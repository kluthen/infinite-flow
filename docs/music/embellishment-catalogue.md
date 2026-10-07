# Embellishment Catalogue

Status: research v1 (2026-10-07)

## Purpose

This catalogue prepares the v3.1 spec session on
[embellishment flags](../../specs/versions/v3/README.md#embellishment-flags) (D210). The owner asked
for "embellishments flags for generators … many ways to support or alter in minor ways what's
expected to be played". For each figure, the player would choose **allowed or not**, plus a
**weight**. Weights are preferences, not quotas: the generator tries a favored figure first, but
it never has to reach a share of them.

An **embellishment** (also called an ornament or decoration) is a note, or a small group of notes,
that decorates a more important note without changing the harmony underneath. The
[lexicon](lexicon.md#non-chord-tone) calls most of them non-chord tones: melody notes that do not
belong to the chord sounding at that moment.

One entry below covers one figure (or one family of directions, such as upper and lower). Each
entry gives the name, a plain definition, a small example, the styles it is typical of, its
family, what it needs from the rhythm, its harmonic rule, what a player would play for it to be
acknowledged, and what the generator does today. Statements marked **(proposed)** are this
researcher's judgment, not settled policy.

The two **families** come from the v3 README:

1. **Family 1, written as ordinary notes.** The figure is ordinary notes on the existing
   quarter/eighth/sixteenth grid ([rhythm grid](rhythm-phrase-structure.md#exact-time-model-and-grids)).
   It is acknowledged like any other expected note.
2. **Family 2, ornaments written as a symbol or as small notes.** Grace notes, mordents, trills,
   turns and jazz articulations. They do not fit the grid, need new notation and have no
   acknowledgement rule yet. Open question O47 covers this family.

## How this was gathered

- **Code reading.** The figure vocabulary was read from the pitch planner, mainly
  `src/domain/pitch/pitch-figures.ts`, `src/domain/pitch/pitch-candidates.ts`,
  `src/domain/pitch/pitch-policy.ts`, `src/domain/pitch/pitch-ranking.ts`,
  `src/domain/pitch/pitch-search.ts`, `src/domain/harmony/harmony-planner.ts` (tension
  requirements) and `src/domain/controls/profile-selection.ts` (profile bundles and capabilities).
  It was checked against the policy in [pitch-planner-validation.md](pitch-planner-validation.md),
  [neutral-profile.md](neutral-profile.md) and [jazz-profile.md](jazz-profile.md).
- **Sampling today's output.** A throwaway script (not committed; it lived in the session
  scratchpad) called `generatePhrase` from
  `src/domain/generation/orchestration/generation-orchestrator.ts` with an instrumented copy of the
  pitch planner. It recorded the role of every note in the accepted phrase. Settings: C Ionian,
  B-flat tenor, Middle register, 90 BPM, Arpeggio chaos Varied, the Neutral or Jazz bundle
  otherwise, seeds 1–100 or 1–200 per setting, about 5,200 phrases in all. The counts are in
  [How often figures appear today](#how-often-figures-appear-today). They are a sample, not a
  proof.
- **Sources.** Classical non-chord-tone definitions come from Music Theory for the 21st-Century
  Classroom and Open Music Theory. Jazz vocabulary comes from Music Theory for the 21st-Century
  Classroom's jazz-scales chapter, The Jazz Piano Site and a journal article on target notes in
  jazz saxophone. Ornament and articulation notation comes from the MusicXML 4.0 reference, the
  ABC 2.1 standard and the Dorico manual. Wikipedia is used only as a secondary pointer. See
  [Sources](#sources) (S18–S39; S4–S9 are already in [research-sources.md](research-sources.md)).
- **Notation library.** The app draws scores with VexFlow 5.0.0 (`package.json`). Its ornament
  table (`node_modules/vexflow/build/esm/src/tables.js`) and its grace-note classes
  (`node_modules/vexflow/build/esm/src/gracenote.js`, `gracenotegroup.js`) were checked for what
  it can already draw.

## Summary table

"Today" means what the generator writes now: **Neutral + Jazz** (both profiles), **Jazz**, **Jazz,
incidental** (it can occur as a side effect of a Jazz figure, but nothing aims for it), or **no**.
The cost is a rough size for this app, from S (small) to L (large), and is **(proposed)**.

| #   | Figure                                                                        | Family                             | Typical styles                           | Today                                 | Cost |
| --- | ----------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------- | ------------------------------------- | ---- |
| 1   | [Passing tone, diatonic](#1-passing-tone-diatonic)                            | 1                                  | every tonal style                        | Neutral + Jazz                        | S    |
| 2   | [Accented passing tone](#2-accented-passing-tone)                             | 1                                  | classical, romantic, jazz                | Neutral + Jazz (unaimed)              | S    |
| 3   | [Chromatic passing tone](#3-chromatic-passing-tone)                           | 1                                  | romantic, jazz, bebop                    | Jazz, incidental                      | S    |
| 4   | [Neighbor tone, upper and lower](#4-neighbor-tone-upper-and-lower)            | 1                                  | every tonal style, folk                  | Neutral + Jazz                        | S    |
| 5   | [Chromatic neighbor tone](#5-chromatic-neighbor-tone)                         | 1                                  | romantic, jazz, blues                    | Jazz, incidental                      | S    |
| 6   | [Double neighbor](#6-double-neighbor)                                         | 1                                  | classical, jazz                          | no (chromatic form: Jazz, incidental) | M    |
| 7   | [Appoggiatura](#7-appoggiatura)                                               | 1                                  | classical, romantic, pop ballads         | Neutral + Jazz (rare)                 | S    |
| 8   | [Escape tone](#8-escape-tone)                                                 | 1                                  | baroque, classical cadences              | no                                    | M    |
| 9   | [Anticipation](#9-anticipation)                                               | 1                                  | classical cadences, jazz, pop "pushes"   | no                                    | M    |
| 10  | [Suspension](#10-suspension)                                                  | 1                                  | baroque, classical, ballads              | no                                    | L    |
| 11  | [Retardation](#11-retardation)                                                | 1                                  | classical (rare)                         | no                                    | L    |
| 12  | [Diatonic approach](#12-diatonic-approach)                                    | 1                                  | every style                              | Neutral + Jazz (Build only)           | S    |
| 13  | [Chromatic approach, above and below](#13-chromatic-approach-above-and-below) | 1                                  | jazz, bebop, blues, funk                 | Jazz                                  | S    |
| 14  | [Double chromatic approach](#14-double-chromatic-approach)                    | 1                                  | bebop                                    | no                                    | M    |
| 15  | [Enclosure, chromatic](#15-enclosure-chromatic)                               | 1                                  | bebop, jazz                              | Jazz                                  | S    |
| 16  | [Enclosure, diatonic](#16-enclosure-diatonic)                                 | 1                                  | classical (as double neighbor), jazz     | no                                    | M    |
| 17  | [Enclosure, mixed and longer](#17-enclosure-mixed-and-longer)                 | 1                                  | bebop                                    | no (one half-step form: Jazz)         | M    |
| 18  | [Arpeggiated figure](#18-arpeggiated-figure)                                  | 1                                  | every style                              | Neutral + Jazz                        | S    |
| 19  | [Scale run (fill)](#19-scale-run-fill)                                        | 1                                  | every style, jazz fills                  | partly (alternating only)             | M    |
| 20  | [Bebop-scale passing tone](#20-bebop-scale-passing-tone)                      | 1                                  | bebop                                    | Jazz, incidental                      | M    |
| 21  | [Blue note, written](#21-blue-note-written)                                   | 1                                  | blues, jazz, rock, soul                  | Jazz, incidental (as approach only)   | M    |
| 22  | [Octave displacement](#22-octave-displacement)                                | 1                                  | jazz, modern classical                   | no                                    | M    |
| 23  | [Grace note (acciaccatura)](#23-grace-note-acciaccatura)                      | 2                                  | every style; folk, blues, jazz           | no                                    | M    |
| 24  | [Mordent, upper and lower](#24-mordent-upper-and-lower)                       | 2                                  | baroque, classical, folk                 | no                                    | M    |
| 25  | [Trill](#25-trill)                                                            | 2                                  | baroque, classical; jazz "shake"         | no                                    | M    |
| 26  | [Turn](#26-turn)                                                              | 2                                  | baroque, classical, romantic; folk rolls | no                                    | M    |
| 27  | [Fall](#27-fall)                                                              | 2                                  | jazz, big band, soul                     | no                                    | M    |
| 28  | [Doit](#28-doit)                                                              | 2                                  | jazz, big band                           | no                                    | M    |
| 29  | [Scoop and plop](#29-scoop-and-plop)                                          | 2                                  | jazz, blues, big band                    | no                                    | M    |
| 30  | [Glissando](#30-glissando)                                                    | 2 (two family-1 notes plus a line) | jazz, classical, rock                    | no                                    | M    |
| 31  | [Slide](#31-slide)                                                            | 2                                  | folk, blues                              | no                                    | M    |

## The current vocabulary in one paragraph

Today the generator knows two kinds of figures ([pitch-planner-validation.md](pitch-planner-validation.md#neutral-and-jazz-vocabulary)):

- **Free figures**: diatonic passing and neighbor tones, available anywhere except a phrase's
  first and last note (`src/domain/pitch/pitch-candidates.ts:331-345`), plus, in Jazz only,
  chromatic approaches and chromatic enclosures
  (`src/domain/pitch/pitch-candidates.ts:165-197`, `:254-272`).
- **One bound figure**, scheduled by the Tension control
  (`src/domain/harmony/harmony-planner.ts:93-138`): a passing or neighbor tone or an appoggiatura
  (allowed under Settled and Lift, required under Edge), or a two-note diatonic approach (required
  under Build).

Two facts shape everything below:

- **"Allowed" is not "favored" today.** The search tries chord tones before every other note at
  every attack (`src/domain/pitch/pitch-ranking.ts:20-30`, tried in that order by
  `src/domain/pitch/pitch-search.ts:81`). A free figure appears only when the chord-tone choices
  run into a dead end later (contour, leap or range limits). The [sample](#how-often-figures-appear-today)
  confirms this: at Neutral's defaults a free passing tone appears in about 1 phrase in 100.
- **Free figures resolve one at a time.** A free outside note must resolve on the very next note
  (`src/domain/pitch/pitch-figures.ts:159-161`, `free_tone_unresolved`). So two outside notes in a
  row exist only inside a figure that is written as one path: the bound two-note approach and the
  Jazz enclosure.

## Family 1 — figures written as ordinary notes

The examples name notes in concert pitch over a chord in C major unless stated. Small examples are
also given in [ABC notation](https://abcnotation.com/wiki/abc:standard:v2.1) (S32): capitals are
the octave from middle C upward, lowercase is the next octave up, `^` is a sharp, `_` a flat, and
a comma after a letter lowers it an octave, `-` is a tie, `"C"` is a chord symbol, and with
`L:1/8` a plain letter is an eighth note and `2` doubles it.

### 1. Passing tone, diatonic

- **Aliases:** passing note, unaccented passing tone. Lexicon: [passing tone](lexicon.md#passing-tone).
- **What it is:** a scale note outside the chord that fills the gap between two notes by step and
  keeps going in the same direction (S5, S25).
- **Example:** over C: E–F–G, with F on the weak half of the beat. `K:C L:1/8 | "C" E F G2 |`
- **Styles:** every tonal style (S4, S25).
- **Family:** 1.
- **Rhythm needs:** three consecutive notes. Usually on a weak beat or the weak half of a beat
  (S25). Any density works; at Quarter density it takes a whole beat.
- **Harmonic rule:** starts on a note one step away; lands by a step in the same direction on a
  chord tone (S5). In the app: steps of 1–2 semitones between collection notes
  (`src/domain/pitch/pitch-figures.ts:66-89`).
- **Acknowledgement:** today's rule unchanged: the exact pitch inside the note's timing window
  (`src/domain/acknowledgement/note-matching.ts`, `acknowledgement-window.ts`).
- **Generator today:** Neutral + Jazz. Free form: `src/domain/pitch/pitch-figures.ts:168-177`
  (opened), `:159-161` (resolved). Bound form: `src/domain/pitch/pitch-candidates.ts:151-152`.
  Rare in the free form (see the sample).
- **Weights:** the main lever. Today the weight is in effect zero, because chord tones are always
  tried first. A weight would let the search try this outside note ahead of some chord tones
  (proposed).

### 2. Accented passing tone

- **Aliases:** none in common use.
- **What it is:** a passing tone placed on a strong beat or the strong half of a beat, so the clash
  with the chord lands where the ear expects stability (S25 describes passing tones as normally
  weak; this is the strong-beat variant).
- **Example:** over C, beat 1: F on the beat, then E. `K:C L:1/8 | G2 | "C" F E C2 |` (G–F–E).
- **Styles:** classical, romantic, jazz lines.
- **Family:** 1.
- **Rhythm needs:** the outside note on beat 1 or 3. The app counts beats 1 and 3 as strong
  (`src/domain/pitch/pitch-policy.ts:119-121`).
- **Harmonic rule:** as for the passing tone; only its metric placement differs.
- **Acknowledgement:** unchanged.
- **Generator today:** Neutral + Jazz, but never aimed for. No rule forbids a free outside note on
  a strong beat; the ranking only puts it last on beat 1 and at a chord change
  (`src/domain/pitch/pitch-ranking.ts:21`). The sample shows a few on beat 1.
- **Weights:** this figure needs its own flag, separate from the unaccented passing tone, because
  it sounds much tenser (proposed). Its weight should also be read by the Tension control's
  meaning: Settled players may want it off.

### 3. Chromatic passing tone

- **Aliases:** chromatic passing note.
- **What it is:** a passing tone outside the key that fills a whole step with two half steps
  (S5 includes chromatic examples).
- **Example:** over C: F–F♯–G. `K:C L:1/8 | "C" F ^F G2 |`
- **Styles:** romantic, jazz, bebop (S9, S26).
- **Family:** 1.
- **Rhythm needs:** three consecutive notes; the outside note is usually short and passed through
  quickly (S26).
- **Harmonic rule:** approached by a half step and left by a half step in the same direction, onto
  a chord tone.
- **Acknowledgement:** unchanged.
- **Generator today:** Jazz, incidental. A Jazz chromatic approach has no entry rule
  (`src/domain/pitch/pitch-figures.ts:110-119`), so when the note before it is a step away in the
  same direction, the result is a chromatic passing tone. Nothing aims for it. Neutral never
  writes an outside note ([neutral-profile.md](neutral-profile.md)).
- **Weights:** if the player allows it in a Neutral-based preset, that breaks "Neutral is entirely
  diatonic" ([pitch-planner-validation.md](pitch-planner-validation.md#authority-and-ownership)).
  The spec must say whether flags may cross profile rules.

### 4. Neighbor tone, upper and lower

- **Aliases:** neighbor note, auxiliary note. Lexicon: [neighbor tone](lexicon.md#neighbor-tone).
- **What it is:** a note one step above (upper) or below (lower) a main note, which returns
  straight to that main note (S18, S25).
- **Example:** upper: over C, E–F–E. Lower: over C, C–B–C. `K:C L:1/8 | "C" E F E2 | C B, C2 |`
- **Styles:** every tonal style; very common in folk tunes (S18).
- **Family:** 1.
- **Rhythm needs:** three notes, usually with the neighbor on a weak position (S25).
- **Harmonic rule:** leaves a chord tone by step and returns to the same pitch by step (S18). In
  the app the main note must be a chord tone (`src/domain/pitch/pitch-figures.ts:88`).
- **Acknowledgement:** unchanged.
- **Generator today:** Neutral + Jazz, both directions, free and bound. It is the most frequent
  outside note in the sample.
- **Weights:** upper and lower should be two flags (proposed). The code already knows the
  direction from the pitch values, so splitting them is cheap.

### 5. Chromatic neighbor tone

- **Aliases:** chromatic auxiliary.
- **What it is:** a neighbor tone a half step away that lies outside the key.
- **Example:** over C: G–F♯–G. `K:C L:1/8 | "C" G ^F G2 |`
- **Styles:** romantic, jazz, blues.
- **Family:** 1.
- **Rhythm needs:** as for the neighbor tone.
- **Harmonic rule:** half step away and back to the same chord tone.
- **Acknowledgement:** unchanged.
- **Generator today:** Jazz, incidental: a chromatic approach whose previous note is its own
  target (`src/domain/pitch/pitch-candidates.ts:165-178`).
- **Weights:** same profile question as the chromatic passing tone.

### 6. Double neighbor

- **Aliases:** changing tones, neighbor group, cambiata in some older texts (S20). The
  [lexicon's enclosure entry](lexicon.md#enclosure) already points at this name.
- **What it is:** the main note, then its upper and its lower neighbor (in either order), then the
  main note again (S20).
- **Example:** over C: E–F–D–E. `K:C L:1/16 | "C" E F D E4 |` A chromatic form: E–F–D♯–E.
- **Styles:** classical; in jazz the same shape is the enclosure (S20, S26).
- **Family:** 1.
- **Rhythm needs:** four notes, the two neighbors short and contiguous.
- **Harmonic rule:** starts and ends on the same chord tone; the two neighbors are one step above
  and one step below.
- **Acknowledgement:** unchanged.
- **Generator today:** no in its diatonic form: two outside notes in a row are rejected
  (`src/domain/pitch/pitch-figures.ts:159-161`). The chromatic form appears in Jazz when a
  chromatic enclosure happens to follow its own target (`src/domain/pitch/pitch-candidates.ts:181-197`).
- **Weights:** needs a new path kind, like the enclosure paths. Proposed: make it the diatonic
  enclosure (entry 16) preceded by its target, so one flag covers both names.

### 7. Appoggiatura

- **Aliases:** leaning note. As a small note it is also a family-2 ornament (S39). Lexicon:
  [appoggiatura](lexicon.md#appoggiatura).
- **What it is:** an outside note reached by a leap, placed on a strong beat, that resolves by step
  to a chord tone (S6, S25).
- **Example:** over C: C–F–E, with F on beat 1. `K:C L:1/8 | C2 | "C" F2 E2 |`
- **Styles:** classical, romantic, ballads (S6, S39).
- **Family:** 1 here; family 2 when written as a small note.
- **Rhythm needs:** a strong beat for the outside note (`src/domain/pitch/pitch-policy.ts:148`),
  and a note before it to leap from.
- **Harmonic rule:** entered by a jump of 3 or more semitones
  (`src/domain/pitch/pitch-figures.ts:117-118`), resolved by one collection step to a chord tone
  (`src/domain/pitch/pitch-candidates.ts:149-150`). S25 adds that the resolution usually goes in
  the opposite direction to the leap; the app does not require that.
- **Acknowledgement:** unchanged.
- **Generator today:** Neutral + Jazz, bound only, and in practice very rare. Under Settled and
  Lift the "no figure" binding is tried first; under Edge, passing and neighbor bindings come
  before it (`src/domain/pitch/pitch-policy.ts:169-180`, `src/domain/harmony/harmony-planner.ts:105, 135`).
  It did not appear once in about 5,200 sampled phrases. The lexicon says "Both presets use it",
  which is true of the rules but not of the output.
- **Weights:** a weight would reorder the binding domain or make it a free figure (proposed).
  This is the clearest case where a flag "allowed" gives the player nothing today.

### 8. Escape tone

- **Aliases:** échappée, escape note; one kind of "incomplete neighbor" (S24).
- **What it is:** an outside note reached by step from a chord tone, then left by a leap in the
  opposite direction (S19, S25).
- **Example:** over C: E–F–C. `K:C L:1/8 | "C" E F C2 |`
- **Styles:** baroque and classical, often just before a cadence (S19).
- **Family:** 1.
- **Rhythm needs:** usually a weak, short note (S25).
- **Harmonic rule:** step in, leap out the other way, onto a chord tone.
- **Acknowledgement:** unchanged.
- **Generator today:** no. A free outside note must leave by step
  (`src/domain/pitch/pitch-figures.ts:86`).
- **Weights:** the leap out counts in the Leapiness budget and may trigger recovery
  ([melodic-control-models.md](melodic-control-models.md#leap-budgets-preserve-direction-within-the-selected-register-window));
  it should be unavailable under Smooth when the leap is 5 semitones or more (proposed).

### 9. Anticipation

- **Aliases:** none common; jazz players speak of a "push" for the rhythmic side.
- **What it is:** a note of the next chord played just before that chord arrives, usually repeated
  or held when the chord comes (S21, S25).
- **Example:** G chord to C chord: B–C on the last beat, then C on beat 1 under C.
  `K:C L:1/8 | "G" D2 G2 B3 c- | "C" c4 G4 |` (the C is pushed onto the last offbeat and tied over).
- **Styles:** classical cadences (S21); in jazz and pop, syncopated pushes before the bar line
  (S21 notes that syncopation can create anticipations).
- **Family:** 1.
- **Rhythm needs:** a weak position just before a chord change, often an offbeat tied over the bar
  line (S21).
- **Harmonic rule:** the note belongs to the next chord, not the current one; it is left by
  repetition or tie.
- **Acknowledgement:** unchanged. A tied anticipation is one sounding note
  ([rhythm-phrase-structure.md](rhythm-phrase-structure.md#exact-time-model-and-grids)).
- **Generator today:** no. A free outside note must leave by step, not by repetition, and a tie
  may cross a chord change only on a common tone (`docs/music/rhythm-phrase-structure.md`, line 76).
- **Weights:** it needs a look-ahead to the next chord, which the free-tone rule does not have
  today (proposed). It pairs well with the Syncopation control: a push could be a natural
  anticipation.

### 10. Suspension

- **Aliases:** none common.
- **What it is:** a chord tone held (or repeated) while the chord changes under it, so it becomes
  an outside note on the strong beat, then resolves down by step (S22, S25). Theory names its three
  stages preparation, suspension and resolution.
- **Example:** F chord to C chord: F held over the bar, then down to E.
  `K:C L:1/8 | "F" A2 c2 F4- | "C" F2 E2 C4 |`
- **Styles:** baroque, classical, ballads (S22).
- **Family:** 1.
- **Rhythm needs:** a note held or tied across a chord change onto a strong beat (S22).
- **Harmonic rule:** prepared as a chord tone of the old chord; outside the new chord; resolves
  down by step.
- **Acknowledgement:** unchanged (the tied note is one expected note).
- **Generator today:** no. A tie across a chord change must be a common tone
  (`docs/music/rhythm-phrase-structure.md`, line 76), so the rhythm and harmony planners would
  need to agree on it, not only the pitch planner.
- **Weights:** a weight on a figure that needs a tie also depends on the rhythm candidate having a
  tie there. Large cost because three planners are involved (proposed).

### 11. Retardation

- **Aliases:** upward suspension.
- **What it is:** like a suspension, but it resolves up by step (S23, S25).
- **Example:** G chord to C chord: B held over, then up to C. `K:C L:1/8 | "G" D2 G2 B4- | "C" B2 c2 G4 |`
- **Styles:** classical, mostly at cadences in slow movements (S23).
- **Family:** 1.
- **Rhythm needs, harmonic rule, acknowledgement, today:** as for the suspension, but the
  resolution goes up.
- **Weights:** could share one flag with the suspension, with direction as a sub-choice (proposed).

### 12. Diatonic approach

- **Aliases:** approach note, approach tone. Lexicon: [approach note](lexicon.md#approach-note).
- **What it is:** one or two scale notes moving by step straight into an important note.
- **Example:** two notes into C: A–B–C. `K:C L:1/8 | "C" A B c2 |`
- **Styles:** every style; jazz teaching calls the goal a "target note" (S26, S28).
- **Family:** 1.
- **Rhythm needs:** two or three consecutive attacks under one chord; rests are allowed between
  them within the resolution deadline ([pitch-planner-validation.md](pitch-planner-validation.md#neutral-and-jazz-vocabulary)).
- **Harmonic rule:** in the app, two same-direction collection steps whose second note is outside
  the chord, then a chord tone (`src/domain/pitch/pitch-candidates.ts:116-125, 153-160`).
- **Acknowledgement:** unchanged.
- **Generator today:** Neutral + Jazz, but only as the one figure Build requires
  (`src/domain/harmony/harmony-planner.ts:119-128`). Every Build phrase in the sample had one.
- **Weights:** if a player switches it off, Build cannot be met. The spec must say which wins
  (see [questions](#questions-for-the-spec-session)).

### 13. Chromatic approach, above and below

- **Aliases:** chromatic approach note. Lexicon: [chromatic approach](lexicon.md#chromatic-approach).
- **What it is:** one note a half step above or below a target chord tone, from outside the key,
  played just before it (S26, S28).
- **Example:** below: over C, D♯–E. Above: over C, A♭–G. `K:C L:1/8 | "C" ^D E3 _A G3 |`
- **Styles:** jazz, bebop, blues, funk (S26, S28).
- **Family:** 1.
- **Rhythm needs:** two back-to-back attacks under one chord, the approach no longer than its
  target (`src/domain/pitch/pitch-candidates.ts:213-222`).
- **Harmonic rule:** the approach is outside the collection (`src/domain/pitch/pitch-candidates.ts:169`);
  the target is a chord tone. A half step that is inside the key (F to E) is a diatonic neighbor
  or passing tone in the app, not a chromatic approach.
- **Acknowledgement:** unchanged.
- **Generator today:** Jazz (`src/domain/pitch/pitch-candidates.ts:165-178`), gated by the
  capability `allowsChromaticApproach` (`src/domain/controls/profile-selection.ts:31-45`). In the
  sample: 4–20% of Jazz phrases.
- **Weights:** "above" and "below" should be two flags (proposed).

### 14. Double chromatic approach

- **Aliases:** chromatic approach from a whole step.
- **What it is:** two half steps in a row into the target, from the same side.
- **Example:** over C: A–A♭–G. `K:C L:1/8 | "C" A _A G2 |`
- **Styles:** bebop.
- **Family:** 1.
- **Rhythm needs:** three contiguous attacks under one chord.
- **Harmonic rule:** the first note is a whole step from the target (often a scale note), the
  second the half step between.
- **Acknowledgement:** unchanged.
- **Generator today:** no as a figure. It appears in Jazz only when a chromatic approach follows a
  scale note a whole step from its target.
- **Weights:** close to the chromatic passing tone; one flag may cover both (proposed).

### 15. Enclosure, chromatic

- **Aliases:** surround, encircling. Lexicon: [enclosure](lexicon.md#enclosure).
- **What it is:** two notes on either side of a target, one above and one below in either order,
  then the target (S26, S28). The app's form uses a half step on each side.
- **Example:** over C: D♭–B–C, or F–D♯–E. `K:C L:1/8 | "C" _D B, C2 F ^D E2 |`
- **Styles:** bebop and later jazz (S26, S28).
- **Family:** 1.
- **Rhythm needs:** three contiguous attacks under one chord, no rest, the two outer notes no
  longer than the target (`src/domain/pitch/pitch-candidates.ts:230-246`). Rare at Quarter
  density ([pitch-planner-validation.md](pitch-planner-validation.md#neutral-and-jazz-vocabulary));
  the sample found none at Quarter.
- **Harmonic rule:** half step above and half step below; at least one of them outside the key;
  target a chord tone (`src/domain/pitch/pitch-candidates.ts:181-197`).
- **Acknowledgement:** unchanged.
- **Generator today:** Jazz. In the sample: 6–16% of Jazz phrases at Eighth or Sixteenth density.
- **Weights:** a weight cannot create the three attacks; under Quarter density the figure stays
  rare whatever its weight (proposed).

### 16. Enclosure, diatonic

- **Aliases:** double neighbor (classical name, entry 6).
- **What it is:** the scale note above and the scale note below, then the target.
- **Example:** over C: F–D–E. `K:C L:1/8 | "C" F D E2 |`
- **Styles:** classical (as a double neighbor), jazz.
- **Family:** 1.
- **Rhythm needs:** as entry 15.
- **Harmonic rule:** both outer notes inside the key, one step from the target.
- **Acknowledgement:** unchanged.
- **Generator today:** no. The enclosure path skips the case where both outer notes are in the key
  (`src/domain/pitch/pitch-candidates.ts:188`), and free outside notes cannot follow each other.
- **Weights:** the only enclosure Neutral could use without leaving the key (proposed).

### 17. Enclosure, mixed and longer

- **Aliases:** bebop enclosure.
- **What it is:** the most common bebop forms mix a scale note on one side with a half step on the
  other, or add notes: for example scale step above, then half step above, then half step below
  (S26 shows D♭–B–C; S28 describes enclosures in Parker's playing).
- **Example:** mixed, over C: A–F♯–G (scale step above, half step below). Longer: D–D♭–B–C.
  `K:C L:1/8 | "C" A ^F G2 | d _d B c |`
- **Styles:** bebop.
- **Family:** 1.
- **Rhythm needs:** three or four contiguous attacks.
- **Harmonic rule:** the last note before the target is a half step or a step away; the target is
  a chord tone.
- **Acknowledgement:** unchanged.
- **Generator today:** only the forms where both sides are a half step. F–D♯–E counts, because F
  is a half step above E; A–F♯–G does not.
- **Weights:** a cheap extension of the existing enclosure paths, but each new shape adds
  candidates at every eligible attack (proposed; see [cost](#pitch-search-cost)).

### 18. Arpeggiated figure

- **Aliases:** broken chord, arpeggio. Lexicon: [arpeggio](lexicon.md#arpeggio), [run](lexicon.md#run).
- **What it is:** chord notes played one after another.
- **Example:** over C: C–E–G–C. `K:C L:1/8 | "C" C E G c |`
- **Styles:** every style.
- **Family:** 1.
- **Rhythm needs:** none special.
- **Harmonic rule:** chord tones only; in the app, two same-direction jumps must form a recognized
  three-note run ([pitch-planner-validation.md](pitch-planner-validation.md#leap-recovery-and-arpeggio-state)).
- **Acknowledgement:** unchanged.
- **Generator today:** Neutral + Jazz, and the default material: chord tones are always tried
  first (`src/domain/pitch/pitch-ranking.ts:20-30`).
- **Weights:** this is the "unembellished" baseline. Raising other weights is, in effect, lowering
  this one (proposed).

### 19. Scale run (fill)

- **Aliases:** scalar run, fill, lick (informal).
- **What it is:** several notes in a row moving by step through a scale, several of them outside
  the chord.
- **Example:** over C: C–D–E–F–G–A–B–c. `K:C L:1/8 | "C" C D E F G A B c |`
- **Styles:** every style; jazz fills between phrases.
- **Family:** 1.
- **Rhythm needs:** many short contiguous attacks: Eighth or Sixteenth density.
- **Harmonic rule:** stepwise in one direction; ends on a chord tone.
- **Acknowledgement:** unchanged.
- **Generator today:** partly. Steps alternating chord tone and outside note work (C–D–E–F–G),
  but two outside notes in a row (A–B over C) are rejected
  (`src/domain/pitch/pitch-figures.ts:159-161`). The internal term "run" means a three-note
  arpeggio ([lexicon](lexicon.md#run)), so this figure needs another name in the UI (proposed:
  "scale run").
- **Weights:** needs chains of passing tones, a change to the free-tone obligation model (proposed).

### 20. Bebop-scale passing tone

- **Aliases:** bebop passing tone.
- **What it is:** an added half step in a scale so that, in a line of even eighth notes, chord
  tones land on the beats. The dominant bebop scale is Mixolydian with an added major seventh,
  used as a chromatic passing tone on the way down (S9).
- **Example:** over G7: G–F♯–F–E–D–C–B–A, with G, F, D and B on the beats.
  `K:C L:1/8 | "G7" G ^F =F E D C B, A, |`
- **Styles:** bebop (S9).
- **Family:** 1.
- **Rhythm needs:** a run of even eighths starting on a beat (S9).
- **Harmonic rule:** chord tones on the beats, the added note between two scale notes.
- **Acknowledgement:** unchanged.
- **Generator today:** Jazz, incidental (a chromatic approach between two scale notes). But the
  app's chords are triads only ([neutral-profile.md](neutral-profile.md#four-measure-harmonic-plan)),
  and the bebop scale's logic targets seventh chords (S9).
- **Weights:** meaningful only with long eighth-note runs and, ideally, seventh chords (proposed).

### 21. Blue note, written

- **Aliases:** blues third, blues fifth.
- **What it is:** the lowered third, fifth or seventh played against a major-sounding chord; in
  the blues scale, ♭3 and ♭5 are the blue notes (S9).
- **Example:** in C: E♭ sliding to E over C, or a held E♭ for color.
  `K:C L:1/8 | "C" _E =E G2 |`
- **Styles:** blues, jazz, rock, soul (S9).
- **Family:** 1 when written as a plain note. Players often bend it, which is family 2
  (see [scoop](#29-scoop-and-plop)).
- **Rhythm needs:** none special; often on a strong beat, held.
- **Harmonic rule:** scale-based, not chord-based: it may be held without resolving (S9). This
  clashes with the app's rule that every outside note resolves at once.
- **Acknowledgement:** unchanged when written; a bent note on a MIDI keyboard is played as its
  written pitch.
- **Generator today:** Jazz, incidental, only as a chromatic approach resolving at once (E♭–E).
  Neutral never.
- **Weights:** a "Blues" preset would need a blues collection or a held-outside-note rule, a
  profile-level choice rather than a figure flag (proposed).

### 22. Octave displacement

- **Aliases:** pivoting (Barry Harris's term, reported by S27).
- **What it is:** one note of a line moved up or down an octave, with the line continuing in the
  new octave (S27).
- **Example:** a falling line G–F–E–D–C becomes G–F–E–d–c. `K:C L:1/8 | "C" G F E d c2 |`
- **Styles:** jazz, modern classical (S27).
- **Family:** 1.
- **Rhythm needs:** works best when the displaced note is on an offbeat (S27).
- **Harmonic rule:** pitch classes unchanged; the jump goes against the line's direction (S27).
- **Acknowledgement:** unchanged (the octave is part of the exact pitch,
  `src/domain/acknowledgement/note-matching.ts`).
- **Generator today:** no as a figure. Displacing a step makes a 10–11 semitone jump: legal only under Leaping or
  Angular, counts as a large leap that needs recovery
  ([melodic-control-models.md](melodic-control-models.md#leap-budgets-preserve-direction-within-the-selected-register-window)),
  and must fit the one-octave register window
  ([saxophone-profile-ranges.md](saxophone-profile-ranges.md#overlapping-windows-preserve-route-for-contour-and-recovery)).
- **Weights:** limited by those rules whatever the weight (proposed).

## Family 2 — ornaments written as a symbol or small notes

These do not take time on the grid as written: the 64-tick grid excludes durations below a
sixteenth ([rhythm-phrase-structure.md](rhythm-phrase-structure.md#exact-time-model-and-grids)).
Today a note event allows only `kind`, `duration`, `pitch`, `tieContinuation` and `annotations`
(`src/domain/events/measure-event-parser.ts:96`), so every ornament needs a new field in the event
model. The acknowledgement rules below are all **(proposed)**.

### 23. Grace note (acciaccatura)

- **Aliases:** crushed note, short appoggiatura; "grace" in MusicXML (S30).
- **What it is:** a small note, usually with a slash through its stem, played very quickly just
  before the main note (S30, S37).
- **Example:** a D♯ crushed into E. `K:C L:1/8 | "C" {/^D}E2 G2 |`
- **Styles:** every style; very common in folk, blues and jazz (S37).
- **Family:** 2.
- **Rhythm needs:** none on the grid: it takes no notated time. MusicXML can say whether it steals
  time from the note before or after (S30).
- **Harmonic rule:** usually a step or half step from the main note; it does not need to belong to
  the chord.
- **Acknowledgement (proposed):** only the main note is expected; the grace note is optional and
  never acknowledged on its own. Today's matcher already ignores a note that matches nothing
  (`src/domain/acknowledgement/note-matching.ts`), so a played grace note does no harm.
- **Generator today:** no. VexFlow 5 can draw grace notes (`gracenote.js`, `gracenotegroup.js`).
- **Weights:** cheapest family-2 figure: one pitch beside a normal note.

### 24. Mordent, upper and lower

- **Aliases:** upper mordent: pralltriller, inverted mordent (in 19th-century usage). Lower
  mordent: mordent (in baroque usage) (S34).
- **What it is:** one quick alternation with the note above (upper: main–upper–main) or below
  (lower: main–lower–main) (S34).
- **Example:** on E: upper E–F–E, lower E–D–E. `K:C L:1/8 | "C" !uppermordent!E2 !lowermordent!E2 |`
- **Styles:** baroque, classical, folk.
- **Family:** 2.
- **Rhythm needs:** the main note long enough to hold three quick notes: at least an eighth at
  moderate tempo (proposed).
- **Harmonic rule:** the auxiliary note is the next scale note.
- **Acknowledgement (proposed):** the main note only, in its usual window.
- **Generator today:** no. VexFlow 5 draws both (`tables.js`: `mordent`, `mordentInverted`).
- **Names warning:** the names are contradictory across traditions (S34), MusicXML and SMuFL
  disagree on which sign is "inverted" (S29), and VexFlow's `mordent` uses the SMuFL short-trill
  (upper) glyph (`tables.js`). The app should label them "upper" and "lower" (proposed).

### 25. Trill

- **Aliases:** "tr". Jazz horn players call a wide trill a "shake" (common usage, not checked
  against the sources here).
- **What it is:** fast alternation of a note with the next note above, for the length of the note
  (S35).
- **Example:** on E: E–F–E–F… `K:C L:1/8 | "C" !trill!E4 |`
- **Styles:** baroque (often starting on the upper note), classical and later (starting on the
  main note) (S35).
- **Family:** 2.
- **Rhythm needs:** a long main note, a quarter or longer (proposed).
- **Harmonic rule:** the upper note is a step above (whole or half, by the scale) (S35).
- **Acknowledgement (proposed):** the main note only. A baroque trill starting on the upper note
  may make the main note arrive late; the 200 ms late grace
  (`src/domain/acknowledgement/acknowledgement-window.ts`) usually covers it. Risk: if the next
  expected note is the trill's upper note, a trill note played near the end may acknowledge it
  early.
- **Generator today:** no. VexFlow 5 draws `tr`.

### 26. Turn

- **Aliases:** gruppetto. Folk "rolls" in ABC (`~`) are a related ornament (S32).
- **What it is:** four notes around the main note: upper, main, lower, main (S36). An inverted turn
  starts below. A turn placed between two notes (delayed turn) is played after the main note (S36).
- **Example:** on E: F–E–D–E. `K:C L:1/8 | "C" !turn!E2 G2 |`
- **Styles:** baroque, classical, romantic (S36).
- **Family:** 2.
- **Rhythm needs:** at least an eighth at moderate tempo (proposed).
- **Harmonic rule:** neighbors by scale step; they may be chromatically altered (S36).
- **Acknowledgement (proposed):** the main note only.
- **Generator today:** no. VexFlow 5 draws `turn` and `turnInverted`.

### 27. Fall

- **Aliases:** falloff (MusicXML `falloff`, S31).
- **What it is:** a drop in pitch at the end of a note, to no definite pitch (S33).
- **Example:** a long G with a fall: the player lets the pitch slide down at its release.
- **Styles:** jazz, big band, soul (S33).
- **Family:** 2.
- **Rhythm needs:** usually on a long note or the last note of a phrase (proposed).
- **Harmonic rule:** none: it ends on no definite pitch.
- **Acknowledgement (proposed):** the main note only; the fall itself cannot be checked from MIDI
  notes. A keyboard player can ignore it.
- **Generator today:** no. VexFlow 5 draws `fall` and `fallLong`; MusicXML has `falloff` (S31).

### 28. Doit

- **Aliases:** none.
- **What it is:** a rise in pitch at the end of a note, to no definite pitch (S33).
- **Example:** a short G with a doit: the pitch flicks up at its release.
- **Styles:** jazz, big band (S33).
- **Family:** 2.
- **Rhythm needs, harmonic rule, acknowledgement:** as for the fall.
- **Generator today:** no. VexFlow 5 draws `doit` and `doitLong`; MusicXML has `doit` (S31).

### 29. Scoop and plop

- **Aliases:** scoop: lift (smooth form), bend into. Plop: drop into (S33).
- **What it is:** a scoop slides into a note from below; a plop drops into it from above (S33).
- **Example:** a scoop into E: the player starts a little under E and slides up to it.
- **Styles:** jazz, blues, big band (S33).
- **Family:** 2.
- **Rhythm needs:** before the note; usually on an accented note (proposed).
- **Harmonic rule:** none: the start pitch is not definite.
- **Acknowledgement (proposed):** the main note only.
- **Generator today:** no. VexFlow 5 draws `scoop`; it has no plop in its table. MusicXML has both
  (S31).

### 30. Glissando

- **Aliases:** gliss., glide.
- **What it is:** a glide from one note to another through the pitches between, either as distinct
  notes (keyboard) or as a continuous slide (voice, trombone, saxophone) (S38).
- **Example:** from C up to G, a line between the two notes marked "gliss."
- **Styles:** jazz, classical, rock (S38).
- **Family:** both: the two end notes are ordinary family-1 notes; the line is a symbol.
- **Rhythm needs:** two notes; the glide takes the first note's time.
- **Harmonic rule:** the end notes follow the normal rules; the notes between are not checked.
- **Acknowledgement (proposed):** the two end notes as usual; notes played in between are ignored
  (they match nothing).
- **Generator today:** no.

### 31. Slide

- **Aliases:** in ABC a decoration `!slide!` (S32); in folk and blues a short slide into a note.
- **What it is:** a short glide into a note, usually from below; the word overlaps with scoop and
  glissando, and its use varies by tradition (S32, S33).
- **Example:** a slide into G from F♯.
- **Styles:** folk, blues.
- **Family:** 2.
- **Rhythm needs, harmonic rule, acknowledgement:** as for the scoop (proposed).
- **Generator today:** no.
- **Weights:** the app could offer one "slide into" flag covering scoop and slide (proposed).

## Ties to the app

### Profiles and presets as figure sets

Today the two profiles are, in effect, two fixed figure sets
([v3 README](../../specs/versions/v3/README.md#presets)):

| Figure set           | Neutral                                                                                     | Jazz                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Free figures         | diatonic passing tone, diatonic neighbor (upper and lower)                                  | Neutral's, plus chromatic approach (above, below) and chromatic enclosure                |
| Tension's one figure | passing or neighbor, appoggiatura (Settled, Lift, Edge); two-note diatonic approach (Build) | same                                                                                     |
| Incidental only      | accented passing tone                                                                       | plus chromatic passing and neighbor, chromatic double neighbor, bebop-style passing tone |

The only per-profile switch in code is one boolean capability, `allowsChromaticApproach`
(`src/domain/controls/profile-selection.ts:31-45`). ISS-005 made it data, so per-figure flags and
weights fit the same place (proposed). The profile bundles also differ in rhythm: Neutral uses
Quarter density, Jazz Eighth (`src/domain/controls/profile-selection.ts:49-68`). That alone keeps
enclosures out of default Neutral phrases.

Built-in presets the catalogue suggests (all proposed):

- **Classical:** passing (accented and not), neighbors, appoggiatura, escape tone, suspension; later
  the trill, mordent and turn.
- **Bebop:** chromatic approaches, all enclosures, bebop-scale passing tones, arpeggios, octave
  displacement; Eighth density.
- **Blues:** blue notes, chromatic approach from below, grace notes, scoops and falls. It needs a
  collection or held-outside-note rule first.
- **Folk:** neighbors, passing tones, grace notes, rolls and turns, slides.

### Rhythm-grammar interactions

- **Contiguous attacks.** Chromatic approaches need two back-to-back attacks, enclosures three,
  under one chord and with no rest (`src/domain/pitch/pitch-candidates.ts:213-246`). The rhythm
  candidate decides whether they exist. The pitch planner cannot add an attack
  ([pitch-planner-validation.md](pitch-planner-validation.md#planner-input-and-output)).
- **Strong beats.** "Accented" means beat 1 or 3 in the app (`src/domain/pitch/pitch-policy.ts:119-121`).
  Accented passing tones and appoggiaturas need one; most other figures prefer a weak position.
- **Ties across chord changes.** Suspensions, retardations and tied anticipations need a tie across
  a chord change onto an outside note. Today that tie is legal only on a common tone
  (`docs/music/rhythm-phrase-structure.md`, line 76).
- **Syncopation.** The Syncopation control already moves onsets and adds ties
  ([rhythm-phrase-structure.md](rhythm-phrase-structure.md#exact-time-model-and-grids)). A push
  over the bar line is where an anticipation would naturally go (S21).
- **Family 2 needs room, not ticks.** A trill or turn needs a long enough main note, which the
  rhythm chooses before the pitch. A grace note needs nothing.
- **The later "sequence writing" idea** (rhythm grammar set up front, v4–v6) is separate
  ([roadmap](../../specs/roadmap.md#candidates-not-committed)).

### How often figures appear today

Share of phrases containing at least one of each figure. The bound figure is the Tension control's
one figure; "free" figures are the others. Settings as in [How this was gathered](#how-this-was-gathered).

| Setting (seeds)                        | Free passing | Free neighbor | Bound figure              | Chromatic approach | Chromatic enclosure | Appoggiatura |
| -------------------------------------- | ------------ | ------------- | ------------------------- | ------------------ | ------------------- | ------------ |
| Neutral, Lift, Shaped, Quarter (200)   | 1%           | 14%           | none                      | –                  | –                   | 0%           |
| Neutral, Lift, Shaped, Sixteenth (200) | 5%           | 11%           | none                      | –                  | –                   | 0%           |
| Neutral, Settled, Angular (200)        | 6%           | 41%           | none                      | –                  | –                   | 0%           |
| Neutral, Build, Shaped (100)           | 4%           | 15%           | two-note approach 100%    | –                  | –                   | 0%           |
| Neutral, Edge, Shaped (200)            | 2%           | 11%           | neighbor 70%, passing 30% | –                  | –                   | 0%           |
| Jazz, Lift, Shaped, Quarter (200)      | 4%           | 4%            | none                      | 11%                | 0%                  | 0%           |
| Jazz, Lift, Shaped, Eighth (200)       | 2%           | 7%            | none                      | 4%                 | 6%                  | 0%           |
| Jazz, Settled, Angular (200)           | 3%           | 49%           | none                      | 20%                | 16%                 | 0%           |
| Jazz, Edge, Shaped (200)               | 0%           | 4%            | neighbor 70%, passing 30% | 6%                 | 8%                  | 0%           |

Reading: free figures appear mostly when Leapiness is high, because the extra leaps leave the
search more dead ends to escape by step. The phrases are overwhelmingly chord tones. A player who
turns a figure "on" today would hear little change; weights are what would make figures audible.

### Pitch-search cost

The pitch search is the generator's most expensive step; ISS-009
([issue](../../issues/Ref_20261006_failed_carry_in_attempts_slow.md)) was about failed attempts
that spend the 250,000-unit search allowance before giving up. The cost of each kind of change
differs (this analysis is proposed):

- **Weights as ordering are cheap when a phrase exists.** Search order is a ranking
  (`src/domain/pitch/pitch-ranking.ts`), and tie order is already seeded per candidate. A weight can
  move favored figures ahead of some chord tones at each attack, seeded so it stays reproducible.
  This does not change which phrases are legal, so it does not change the size of a search that
  fails. It can slow a search that succeeds: a favored outside note opens an obligation that may
  dead-end, and the search must back out.
- **New allowed figures enlarge every search.** Each new path shape adds candidates at every
  eligible attack. A setting with no legal phrase must exhaust a larger space before it fails,
  which is exactly the ISS-009 risk. Shapes with three or four members (enclosures, double
  chromatic approach, double neighbor) multiply candidates the most.
- **Required figures are the most expensive.** The Tension control's figure is a separate
  "binding"; each binding runs a whole pitch search charged to the same allowance
  (`src/domain/generation/orchestration/window-search.ts:154-206`). A quota ("at least two
  enclosures") would multiply bindings. That is why weights must stay preferences.
- **Figures that look across a chord change** (anticipation, suspension, retardation) touch the
  rhythm planner and the orchestrator's tie rules, not only the pitch search.
- **Family 2 costs almost nothing in the search.** An ornament decorates a note already chosen,
  so it can be added after the search (proposed), with checks on note length and the auxiliary
  pitch staying inside the instrument range.

### Open question O47: ornament representation

O47 asks whether a trill or mordent is "an expanded event figure, or a notated symbol with
playback expansion" ([register](../../specs/open-questions.md#later-and-governance-o47o49)).

- **Expanded figure:** write the mordent as three real notes. It needs durations below a sixteenth,
  which the grid excludes ([rhythm-phrase-structure.md](rhythm-phrase-structure.md#exact-time-model-and-grids)),
  and every added note becomes an expected note the player must hit.
- **Symbol plus playback expansion:** the note keeps its grid duration and gains an ornament mark.
  MusicXML has native elements for all of them: `ornaments` (S29), `grace` (S30), and `scoop`,
  `plop`, `doit` and `falloff` under `articulations` (S31). VexFlow 5 draws them. Acknowledgement
  checks only the main note. The backing's playback and the MIDI export would expand or omit them.
- **Leaning (proposed):** the symbol form, with the main-note-only acknowledgement rule. It keeps
  the grid, the matcher and the search unchanged and puts the cost in notation, playback and the
  two exports.

## Proposed lexicon entries

Merged into the [lexicon](lexicon.md) on 2026-10-07: [Accented passing tone](lexicon.md#accented-passing-tone), [Anticipation](lexicon.md#anticipation), [Bebop scale](lexicon.md#bebop-scale), [Blue note](lexicon.md#blue-note), [Chromatic passing tone](lexicon.md#chromatic-passing-tone), [Double neighbor](lexicon.md#double-neighbor), [Embellishment](lexicon.md#embellishment), [Escape tone](lexicon.md#escape-tone), [Octave displacement](lexicon.md#octave-displacement), [Retardation](lexicon.md#retardation), [Scale run](lexicon.md#scale-run), [Suspension](lexicon.md#suspension), [Doit](lexicon.md#doit), [Fall](lexicon.md#fall), [Glissando](lexicon.md#glissando), [Grace note](lexicon.md#grace-note), [Jazz articulation](lexicon.md#jazz-articulation), [Mordent](lexicon.md#mordent), [Ornament](lexicon.md#ornament), [Plop](lexicon.md#plop), [Scoop](lexicon.md#scoop), [Slide](lexicon.md#slide), [Trill](lexicon.md#trill), [Turn](lexicon.md#turn).

## Sources

These follow the format of [research-sources.md](research-sources.md) and use the reserved block
S18–S39, to be merged there later. They are reference only: no text is copied or closely
paraphrased. Existing sources cited above: S4 (non-chord tones), S5 (passing tones), S6
(appoggiaturas) and S9 (jazz scales).

### Non-chord tones

- **S18 - Neighbor tones.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/NeighborTones.html
  - Useful for: upper and lower neighbor definitions and their step-away, step-back shape.
  - Applied in: this catalogue (entries 4 and 5).
- **S19 - Escape tone.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/EscapeTone.html
  - Useful for: the step-in, leap-out-opposite shape and its cadential use.
  - Applied in: this catalogue (entry 8, escape-tone lexicon draft).
- **S20 - Double neighbor.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/DoubleNeighbor.html
  - Useful for: the upper-and-lower neighbor group around one main note.
  - Applied in: this catalogue (entries 6 and 16, double-neighbor lexicon draft).
- **S21 - Anticipation.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/Anticipation.html
  - Useful for: a next-chord note sounding early, at cadences and through syncopation.
  - Applied in: this catalogue (entry 9, rhythm interactions, anticipation lexicon draft).
- **S22 - Suspension.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/Suspension.html
  - Useful for: preparation, accented suspension and stepwise downward resolution; optional tie.
  - Applied in: this catalogue (entry 10, suspension lexicon draft).
- **S23 - Retardation.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/Retardation.html
  - Useful for: the upward-resolving counterpart of the suspension.
  - Applied in: this catalogue (entry 11, retardation lexicon draft).
- **S24 - Incomplete neighbor.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/IncompleteNeighbor.html
  - Useful for: the catch-all label for neighbor figures missing one side, and its note on incomplete double neighbors in jazz.
  - Applied in: this catalogue (entry 8 aliases).
- **S25 - Embellishing tones.** John Peterson, Open Music Theory, version 2, VIVA Pressbooks, CC BY-SA: https://viva.pressbooks.pub/openmusictheory/chapter/embellishing-tones/ (mirror read for this research: https://human.libretexts.org/Bookshelves/Music/Music_Theory/Open_Music_Theory_2e_(Gotham_et_al.)/04%3A_Diatonic_Harmony_Tonicization_and_Modulation/4.04%3A_Embellishing_Tones)
  - Useful for: one table of approach, departure and metric placement for passing, neighbor, appoggiatura, escape, suspension, retardation and anticipation; usual downward direction of appoggiaturas and escape tones.
  - Applied in: this catalogue (most family-1 entries and lexicon drafts).

### Jazz vocabulary

- **S26 - Passing notes and target notes.** The Jazz Piano Site: https://www.thejazzpianosite.com/jazz-piano-lessons/jazz-improvisation/passing-notes/
  - Useful for: diatonic and chromatic passing notes leading to a chord-tone target, and the D-flat, B, C enclosure example.
  - Applied in: this catalogue (entries 3, 12, 13, 15, 17).
- **S27 - Octave displacement and pivot arpeggios.** The Jazz Piano Site: https://www.thejazzpianosite.com/jazz-piano-lessons/jazz-improvisation/octave-displacement-pivot-arpeggios/
  - Useful for: displacing a note by an octave and continuing there; offbeat placement and jumping against the line's direction; the term "pivoting".
  - Applied in: this catalogue (entry 22, octave-displacement lexicon draft).
- **S28 - The concept of target notes for jazz improvisation.** Teerus Laohverapanich, Mahidol Music Journal 7(1), 2024: https://so04.tci-thaijo.org/index.php/mmj/article/view/270580
  - Useful for: target notes reached by chord tones, chromatic approach and enclosure, shown in the playing of four jazz saxophonists including Charlie Parker.
  - Applied in: this catalogue (entries 12, 13, 15, 17). Read at abstract level only.

### Ornaments and notation

- **S29 - MusicXML 4.0 ornaments and mordent.** W3C Music Notation Community Group: https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/ornaments/ and https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/mordent/
  - Useful for: the export vocabulary for trills, turns and mordents, and the warning that MusicXML and SMuFL disagree on which mordent is "inverted".
  - Applied in: this catalogue (entries 24–26, O47 discussion).
- **S30 - MusicXML 4.0 grace.** W3C Music Notation Community Group: https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/grace/
  - Useful for: grace notes as notes without notated duration, slashed (acciaccatura) or not, with time stolen from the previous or following note.
  - Applied in: this catalogue (entry 23, O47 discussion).
- **S31 - MusicXML 4.0 articulations.** W3C Music Notation Community Group: https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/articulations/
  - Useful for: `scoop`, `plop`, `doit` and `falloff` as export elements.
  - Applied in: this catalogue (entries 27–29, O47 discussion).
- **S32 - ABC notation standard 2.1.** abcnotation.com: https://abcnotation.com/wiki/abc:standard:v2.1
  - Useful for: the example syntax; grace notes in braces with `/` for acciaccatura; decorations `!trill!`, `!uppermordent!`, `!lowermordent!`, `!turn!`, `!slide!` and the roll `~`.
  - Applied in: this catalogue (examples, entries 26 and 31).
- **S33 - Jazz articulations.** Steinberg, Dorico 2 operation manual: https://archive.steinberg.help/dorico/v2/en/dorico/topics/notation_reference/notation_reference_jazz_articulations_c.html
  - Useful for: plop and scoop before the note, doit and fall after it; their bend and smooth forms; that they change pitch rather than length or attack.
  - Applied in: this catalogue (entries 25, 27–31, jazz-articulation lexicon drafts).

### Secondary pointers

These Wikipedia pages were used only to cross-check names and history; each claim they support is
also standard textbook knowledge.

- **S34 - Mordent.** Wikipedia: https://en.wikipedia.org/wiki/Mordent
  - Useful for: upper and lower forms, their signs, and the historical swap of the names.
  - Applied in: this catalogue (entry 24, mordent and ornament lexicon drafts).
- **S35 - Trill.** Wikipedia: https://en.wikipedia.org/wiki/Trill_(music)
  - Useful for: trill interval, start on the upper note (baroque) or main note (later), the closing dip.
  - Applied in: this catalogue (entry 25, trill lexicon draft).
- **S36 - Turn.** Wikipedia: https://en.wikipedia.org/wiki/Turn_(music)
  - Useful for: the four-note order, delayed and inverted turns.
  - Applied in: this catalogue (entry 26, turn lexicon draft).
- **S37 - Grace note.** Wikipedia: https://en.wikipedia.org/wiki/Grace_note
  - Useful for: acciaccatura versus appoggiatura as small notes; grace notes not counting in the bar.
  - Applied in: this catalogue (entry 23, grace-note lexicon draft).
- **S38 - Glissando.** Wikipedia: https://en.wikipedia.org/wiki/Glissando
  - Useful for: discrete versus continuous glissando and its notation.
  - Applied in: this catalogue (entry 30, glissando lexicon draft).
- **S39 - Appoggiatura.** Wikipedia: https://en.wikipedia.org/wiki/Appoggiatura
  - Useful for: the appoggiatura written either as a small note or in full size, and its strong-beat placement.
  - Applied in: this catalogue (entry 7).

Licence note: Music Theory for the 21st-Century Classroom (S18–S24) is © 2017 Robert Hutchinson,
GNU Free Documentation License 1.2 or later; Open Music Theory (S25) is CC BY-SA. Both are cited
for verification only.

## Questions for the spec session

1. **Flags versus the Tension control.** Build requires a two-note approach and Edge a passing,
   neighbor or appoggiatura figure. If the player switches those off, which wins: the flag, or
   Tension? (Today explicit controls outrank tension,
   [pitch-planner-validation.md](pitch-planner-validation.md#authority-and-ownership).)
2. **Flags versus profile rules.** May a flag add an outside-the-key figure (chromatic passing tone,
   blue note) to a Neutral-based preset, or do chromatic flags stay Jazz-only?
3. **What a weight does.** Proposed: a weight moves a figure ahead of chord tones at a seeded share
   of attacks. Is "chord tones first" kept as the default (weight 0)? Should one "embellishment
   amount" slider sit above the per-figure weights?
4. **The appoggiatura today.** It is allowed but never chosen in the sample. Make it a free figure,
   reorder the bindings, or leave it until weights exist? The lexicon's "Both presets use it"
   should be corrected either way.
5. **First set for v3.1.** Proposed: family 1 only, starting with what exists (passing, accented
   passing, neighbors split by direction, appoggiatura, approaches split by direction, chromatic
   enclosure), then cheap additions (diatonic and mixed enclosures, double neighbor, chromatic
   passing). Escape tone, anticipation, suspension, scale runs and octave displacement later.
6. **O47.** Symbol plus playback expansion with main-note-only acknowledgement, or expanded notes?
7. **Search budget.** Should each new figure ship with a measured cost check on the ISS-009 sweep
   settings, so that a larger vocabulary never brings back slow failures?
8. **Built-in presets.** Which style presets (Classical, Bebop, Blues, Folk) are worth shipping,
   given that the harmony stays diatonic triads?
