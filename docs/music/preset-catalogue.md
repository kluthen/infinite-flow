# Preset Catalogue

Status: research v1 (2026-10-07)

## Purpose

This catalogue prepares the v3.1 spec session on
[presets](../../specs/versions/v3/README.md#presets) (D210, D211, scoped down by D217). The owner
asked for "a few more" built-in presets, proposed by research, next to the presets players will
save themselves. It answers three questions:

1. What can a built-in preset set today, and what can it not express?
2. Which styles are worth a built-in preset, and with which exact settings?
3. What would each style later want from **gimmicks** (signature figures: a short melodic idea
   that marks a style, such as a riff or a lick) and from **stored rhythm patterns** (a fixed
   rhythm the app would keep and reuse)? Both are later features, not v3.1
   ([v3 README](../../specs/versions/v3/README.md#presets)).

A **preset** here is a named set of starting values for the generation controls. The app today
calls its only presets the [musical profile preset](lexicon.md#musical-profile-preset): Neutral
and Jazz. A **style** is a family of music with recognisable habits (blues, bebop, a folk reel).
A preset can only imitate the habits the generator can produce; this document says how far each
one gets. Statements marked **(proposed)** are this researcher's judgment, not settled policy.

## How this was gathered

- **Code reading.** What a preset holds was read from `PROFILE_BUNDLES` and
  `MUSICAL_PROFILE_CAPABILITIES` in
  [profile-selection.ts](../../src/domain/controls/profile-selection.ts), the control catalogs in
  [generation-controls.ts](../../src/domain/controls/generation-controls.ts), the blocked rhythm
  list in [unsupported-rhythm-settings.ts](../../src/domain/controls/unsupported-rhythm-settings.ts),
  the phone step-down in [generated-note-density.ts](../../src/domain/controls/generated-note-density.ts),
  the backing in [backing-renderer.ts](../../src/domain/backing/backing-renderer.ts) and
  [backing-track.ts](../../src/audio/backing-track.ts), and the acknowledgement timing in
  [acknowledgement-window.ts](../../src/domain/acknowledgement/acknowledgement-window.ts). Policy was
  checked against [harmony-planner-policy.md](harmony-planner-policy.md),
  [rhythm-phrase-structure.md](rhythm-phrase-structure.md), [neutral-profile.md](neutral-profile.md),
  [jazz-profile.md](jazz-profile.md), the [embellishment catalogue](embellishment-catalogue.md) and
  the [mutation catalogue](mutation-catalogue.md).
- **Feasibility check of every candidate.** A throwaway script (session scratchpad, not committed)
  loaded the real domain modules through Vite's `runnerImport`, as `scripts/replay-phrase.mjs`
  does. For each candidate it:
  1. built the controls with `makeGenerationControls`, which throws on any value outside the
     closed catalogs, so every value below is valid;
  2. called `isUnsupportedRhythmSetting` on the rhythm setting as chosen, and again with a chosen
     Sixteenth stepped down to Eighth (what a phone below the tablet-landscape width generates,
     `resolveGeneratedNoteDensity`). No candidate is blocked in either case;
  3. generated 100 phrases with `generatePhrase`
     (`src/domain/generation/orchestration/generation-orchestrator.ts`): written key C, B-flat
     tenor, seeds `7919 × 1…100`. It recorded success, time, attacks per phrase, the share of
     notes outside the collection, and leaps of 5 semitones or more. The numbers are in
     [Sample results](#sample-results). They are a sample, not a proof.
- **Style research.** Style traits come from Open Music Theory (pop schemas and phrasing), Music
  Theory for the 21st-Century Classroom (jazz scales, S9), Wikipedia pages used as pointers for
  genre facts, and two practitioner pages on modes and ornaments in Irish music. See
  [Sources](#sources) (S100–S115; S9 and S46 are already in [research-sources.md](research-sources.md)).
- **Personas.** Fit is judged against [personas.md](../../specs/personas.md): P1 G1 (vocabulary by
  exposure), P1 G2 (real-time reading and dexterity), P2 S1 (endless fresh material at a rising
  BPM), P3 C1–C3 (review, take out, grow an idea).

## What a built-in preset can set today

### The exact contents

A built-in preset today is two things
([profile-selection.ts](../../src/domain/controls/profile-selection.ts)):

1. **A grammar** (the note vocabulary): the profile name, `Neutral` or `Jazz`
   (`MUSICAL_PROFILES` in [generation-controls.ts](../../src/domain/controls/generation-controls.ts)).
   The generator never reads the name itself; it reads one capability,
   `allowsChromaticApproach` (false for Neutral, true for Jazz). That one switch adds chromatic
   approaches and chromatic enclosures ([jazz-profile.md](jazz-profile.md)).
2. **Seven controls** (`ProfileControlledValues`), each from a closed list:

| Control          | Allowed values                                     | Neutral         | Jazz                |
| ---------------- | -------------------------------------------------- | --------------- | ------------------- |
| Harmonic motion  | Static, Gentle diatonic, Active diatonic           | Gentle diatonic | Gentle diatonic     |
| Note density     | Quarter, Eighth, Sixteenth                         | Quarter         | Eighth              |
| Rhythmic variety | Strict, Slightly varied, Heavily varied            | Slightly varied | Slightly varied     |
| Syncopation      | Straight, Occasional offbeats, Active displacement | Straight        | Occasional offbeats |
| Silence density  | Sparse, Conversational, Breath-heavy               | Sparse          | Conversational      |
| Contour          | Rising, Falling, Arch, Wandering                   | Arch            | Wandering           |
| Register         | Low, Middle, High, Varying                         | Middle          | Varying             |

### What a preset does not set today

These controls exist, with closed value lists, but no preset touches them
([generation-controls.ts](../../src/domain/controls/generation-controls.ts),
`DEFAULT_GENERATION_CONTROLS` in [profile-selection.ts](../../src/domain/controls/profile-selection.ts)):

| Control                    | Allowed values                                                               | First-load default |
| -------------------------- | ---------------------------------------------------------------------------- | ------------------ |
| Collection (scale or mode) | Major, Minor, Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian | Ionian             |
| Tension                    | Settled, Lift, Build, Edge                                                   | Lift               |
| Leapiness                  | Smooth, Shaped, Leaping, Angular                                             | Shaped             |
| Arpeggio chaos             | Predictable, Varied, Chaotic                                                 | Varied             |
| Tempo                      | 60 to 240 BPM in steps of 10                                                 | 90                 |
| Written key, instrument    | 12 keys; the adopted instrument profiles                                     | C; B-flat tenor    |

**Finding.** Most of what makes a style recognisable sits in controls a preset cannot set today,
above all **Collection**. A "Blues" or "Dorian" preset that leaves the collection at the player's
Ionian is not that style. The spec session's open question "what a preset holds"
([v3 README](../../specs/versions/v3/README.md#presets)) therefore decides whether most candidates
below are possible. Proposed: a built-in preset also holds Collection, Tension, Leapiness and
Arpeggio chaos; it never holds the written key or the instrument (they belong to the player and to
"my instrument"); it gives tempo only as a suggestion, because a playable tempo depends on the
player, not on the style (proposed).

### What no setting can express today

| Missing                                 | Evidence                                                                                                                                                                                      | Styles that need it                      |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Swing (long-short eighths)              | The app writes even eighths and has no swing setting ([lexicon: swing](lexicon.md#swing)); swing is central to jazz and blues (S102)                                                          | Blues, Bebop                             |
| Seventh chords and richer chords        | Root-position diatonic triads only ([harmony-planner-policy.md](harmony-planner-policy.md#collection-and-chord-vocabulary)); jazz, blues and bossa use sevenths and beyond (S101, S103, S112) | Blues, Bebop, Modal jazz, Bossa          |
| Five-note and six-note scales           | `COLLECTIONS` holds seven-note scales only; no pentatonic or blues scale (S100, S9)                                                                                                           | Blues, Pop, Folk, Rock                   |
| Raised leading tone, harmonic minor     | "never gain a raised leading tone" ([neutral-profile.md](neutral-profile.md#four-measure-harmonic-plan))                                                                                      | Baroque, Classical, Klezmer              |
| Held blue notes                         | A chromatic note must resolve at once ([embellishment catalogue, entry 21](embellishment-catalogue.md#21-blue-note-written))                                                                  | Blues                                    |
| Chord progressions beyond the templates | Fixed four-bar templates per motion level; degree 5 only in bar 4 or bars 3-4 ([harmony-planner-policy.md](harmony-planner-policy.md#tonal-motion-candidates))                                | Blues (I–IV–V), Pop (I–V–vi–IV)          |
| Forms longer than four bars             | Every phrase is four 4/4 measures ([rhythm-phrase-structure.md](rhythm-phrase-structure.md#authority-and-evidence)); a 12-bar blues or a 32-bar reel is longer (S101, S106)                   | Blues, Folk                              |
| Other meters, tuplets                   | 4/4 only, tuplets excluded ([rhythm-phrase-structure.md](rhythm-phrase-structure.md#exact-time-model-and-grids))                                                                              | Jigs, waltzes; triplets in folk and jazz |
| Specific rhythm patterns                | Rhythms are drawn from a construction grammar, never from a stored pattern ([rhythm-phrase-structure.md](rhythm-phrase-structure.md#versioned-mvp-construction-grammar))                      | Bossa (clave), Blues (shuffle), Baroque  |
| Signature figures (gimmicks)            | Nothing stores a melodic figure; motif repetition is limited to the gesture/answer rhythm relation ([rhythm-phrase-structure.md](rhythm-phrase-structure.md#four-bar-gesture-and-answer))     | All, mostly Blues (riffs), Bebop (licks) |
| Ornaments (trills, rolls, scoops)       | Family 2 of the [embellishment catalogue](embellishment-catalogue.md#family-2--ornaments-written-as-a-symbol-or-small-notes), not built                                                       | Baroque, Folk, Blues                     |
| A style-specific backing                | The backing is a bass line and block chords on whole beats, the same for every preset ([backing-renderer.ts](../../src/domain/backing/backing-renderer.ts))                                   | All                                      |

Two facts soften this list:

- **The player can swing, and is still acknowledged.** The backing and click sound only on whole
  beats ([backing-track.ts](../../src/audio/backing-track.ts) throws off a whole beat), so nothing
  contradicts a swung line. A played offbeat eighth swung in the usual triplet feel (S102) lands at
  two thirds of the beat. The boundary with the next note sits at the later of 150 ms before it and
  the midpoint, which is always at or after three quarters of the beat
  ([acknowledgement-window.ts](../../src/domain/acknowledgement/acknowledgement-window.ts)), so the
  swung note stays inside its own window at every tempo from 60 to 240 BPM (worked from the code
  constants, not tested live).
- **Bossa nova and reels are played straight**, without swing (S112, S106), so the even eighths
  already fit them.

### Today's chromatic notes are barely audible

With the Jazz grammar, notes outside the collection were **1.1–1.5 % of all notes**, and **14–28 %
of phrases** had any at all ([Sample results](#sample-results)). The embellishment catalogue found
the same: "allowed" is not "favored", because chord tones are tried first
([embellishment catalogue](embellishment-catalogue.md#how-often-figures-appear-today)). So without
v3.1 weights, a Blues, Bebop or Bossa preset built on the Jazz grammar sounds nearly diatonic.
Weights are what will make these presets differ from Neutral.

## Candidate built-in presets

Nine candidates follow. They were chosen for fit with the personas and for what the generator can
honestly do today; [Considered, not proposed](#considered-not-proposed) lists the ones left out.

**How to read each entry.**

- **Settings today** lists the grammar and the seven controls a preset already sets.
- **Would also set** lists values from controls a preset does not hold today; they need the spec
  decision above. All values are valid catalog values.
- **Rhythm check**: the rhythm setting (note density + rhythmic variety + silence density +
  syncopation) was tested with `isUnsupportedRhythmSetting`, as chosen and with Sixteenth stepped
  down to Eighth. Eighth is never blocked; Heavily varied never blocks anything
  ([lexicon](lexicon.md#unsupported-rhythm-combination)).
- **Figures and preferences** use the numbered entries of the
  [embellishment catalogue](embellishment-catalogue.md#summary-table) and a proposed four-step
  preference: **favor strongly**, **favor**, **default** (allowed, chord tones first, as today),
  **off**. A figure marked _(new)_ does not exist in the generator yet. Preferences are
  preferences, not quotas ([v3 README](../../specs/versions/v3/README.md#embellishment-flags)).
- **Fidelity today**: **good** (a player of the style would recognise it), **fair** (the main
  traits are there, one or two signature traits missing), **thin** (a hint of the style),
  **poor**.

### Summary table

| #   | Preset (working name) | Grammar | Collection (would set) | Note density | Fidelity today            | Serves       | Short list  |
| --- | --------------------- | ------- | ---------------------- | ------------ | ------------------------- | ------------ | ----------- |
| 1   | Gentle                | Neutral | Major                  | Quarter      | good (a practice purpose) | P1 G1, G2    | yes         |
| 2   | Speed drill           | Neutral | player's own           | Sixteenth    | good (a practice purpose) | P2 S1, P1 G2 | yes         |
| 3   | Folk reel             | Neutral | Mixolydian             | Eighth       | fair                      | P2 S1, P1 G2 | yes         |
| 4   | Pop song              | Neutral | Major                  | Eighth       | fair                      | P1 G1, P3    | yes         |
| 5   | Modal (Dorian)        | Neutral | Dorian                 | Eighth       | fair                      | P1 G1, P3 C3 | yes         |
| 6   | Bebop                 | Jazz    | Major                  | Eighth       | thin, fair with weights   | P1 G1, G2    | after flags |
| 7   | Blues                 | Jazz    | Mixolydian             | Eighth       | thin                      | P1 G1, P3 C3 | later       |
| 8   | Bossa                 | Jazz    | Major                  | Eighth       | thin                      | P1 G1, G2    | later       |
| 9   | Baroque               | Neutral | Minor                  | Sixteenth    | thin                      | P2 S1, P1 G2 | later       |

### 1. Gentle

**The idea.** Not a style but a way in: slow, stepwise, one chord, plenty of room. For a player
new to improvising or to the app, or a warm-up. The owner suggested it by name.

- **Settings today.** Grammar Neutral. Harmonic motion Static; Note density Quarter; Rhythmic
  variety Strict; Syncopation Straight; Silence density Conversational; Contour Arch; Register
  Middle.
- **Would also set.** Collection Major; Tension Settled; Leapiness Smooth; Arpeggio chaos
  Predictable. Suggested tempo 60–70 BPM.
- **Rhythm check.** Quarter + Strict + Conversational + Straight: supported (the blocked Quarter
  cases all need Active displacement).
- **Figures and preferences.** Passing tone (1) and neighbor tone (4): default. Appoggiatura (7):
  off. Everything chromatic: off. Favoring nothing keeps the line on chord tones, which is the
  point.
- **Fidelity today: good** for its purpose. In the sample every move was a step (largest interval
  2 semitones), about 12 notes per phrase. That may be too plain after a while; Leapiness Shaped is
  the natural next step (proposed).
- **Later.** No gimmick needed. Stored rhythm patterns could offer a few simple ones (long-short,
  a held note and a rest) as a reading ladder (proposed).
- **Serves.** P1 G1 at the start, P1 G2 at the player's own pace; a warm-up for P2.

### 2. Speed drill

**The idea.** A reading drill for P2: dense, varied, unpredictable material that cannot be
memorised (D59, [personas.md](../../specs/personas.md)), played as the tempo rises.

- **Settings today.** Grammar Neutral. Harmonic motion Active diatonic; Note density Sixteenth;
  Rhythmic variety Heavily varied; Syncopation Occasional offbeats; Silence density Sparse;
  Contour Wandering; Register Varying.
- **Would also set.** Collection: the player's own (reading in many keys is part of the drill;
  Vary settings can move it); Tension Lift; Leapiness Leaping; Arpeggio chaos Chaotic. Rising tempo
  On would suit it, but it is a session option, not a generation control
  ([lexicon](lexicon.md#rising-tempo)). Suggested start 80–100 BPM.
- **Rhythm check.** Sixteenth + Heavily varied + Sparse + Occasional offbeats: supported; on a
  phone it generates as Eighth + Heavily varied, also supported.
- **Figures and preferences.** Passing (1), accented passing (2), neighbor (4), appoggiatura (7):
  favor, for more varied shapes to read. Diatonic enclosure (16) _(new)_ and double neighbor (6)
  _(new)_: favor when they exist. Chromatic approach (13): favor if the spec lets flags add
  chromatic notes to a Neutral preset (catalogue question 2), because reading accidentals is part of
  sight-reading (proposed).
- **Fidelity today: good** for its purpose. Sample: about 46 notes per phrase (26 on a phone);
  median 14 ms, slowest 175 ms to generate, the slowest of all candidates.
- **Later.** Wants **no** stored rhythm patterns or gimmicks: repetition helps memorising, which
  defeats the drill. It might later want "reading families" (dotted rhythms, ties across the beat)
  chosen on purpose (proposed).
- **Serves.** P2 S1 directly; P1 G2.

### 3. Folk reel

**The idea.** A reel is a fast dance tune in 4/4 or 2/2, mostly running eighth notes, accented on
beats 1 and 3, played even rather than swung, in eight-bar parts made of four-bar phrases (S106).
Irish and Scottish tunes favor Ionian, Mixolydian and Dorian (S107).

- **Settings today.** Grammar Neutral. Harmonic motion Gentle diatonic; Note density Eighth;
  Rhythmic variety Strict; Syncopation Straight; Silence density Sparse; Contour Arch; Register
  Middle.
- **Would also set.** Collection Mixolydian (Dorian and Major are equally typical, S107); Tension
  Settled; Leapiness Shaped; Arpeggio chaos Varied. Suggested tempo 80–100 BPM (proposed; dancers
  play reels much faster).
- **Rhythm check.** Eighth: never blocked.
- **Figures and preferences.** Neighbor (4) and passing (1): favor. Arpeggiated figure (18):
  default. Scale run (19): favor once runs of several outside notes are allowed. Chromatic: off.
  Later, family 2: grace note (23) as the Irish **cut**, turn (26) as the **roll** (S108).
- **Fidelity today: fair**, the most faithful of the style candidates. Even eighths, four-bar
  phrases, beat 1 and 3 anchors and the modes all match (S106, S107; [rhythm-phrase-structure.md](rhythm-phrase-structure.md#metrical-anchors)).
  Sample: 29 notes per phrase, 7 % leaps. Missing: the ornaments that define the sound (cuts,
  taps, rolls, S108), triplets (tuplets are excluded), and the AABB tune form.
- **Later.** Gimmicks: rolls and cuts on long notes; a recurring "tune figure" repeated across
  phrases. Stored rhythms: a few stock reel bars (a quarter note followed by eighths, the
  three-note "triplet" figure once tuplets exist) (proposed).
- **Serves.** P2 S1 (a steady stream of eighths to read); P1 G2 (finger dexterity).

### 4. Pop song

**The idea.** A singable melody over the four most common pop chords, I, IV, V and vi (S113),
with a pushed note now and then. Pop phrases typically last four bars (S114).

- **Settings today.** Grammar Neutral. Harmonic motion Gentle diatonic; Note density Eighth;
  Rhythmic variety Heavily varied; Syncopation Occasional offbeats; Silence density
  Conversational; Contour Arch; Register Middle.
- **Would also set.** Collection Major; Tension Lift; Leapiness Shaped; Arpeggio chaos Varied.
  Suggested tempo 90–110 BPM.
- **Rhythm check.** Eighth: never blocked.
- **Figures and preferences.** Neighbor (4), passing (1): default. Appoggiatura (7): favor (typical
  of pop ballads, [catalogue](embellishment-catalogue.md#7-appoggiatura)). Anticipation (9)
  _(new)_: favor strongly when it exists; it is pop's "push" (S46). Chromatic: off.
- **Fidelity today: fair.** One of the Gentle tonal templates, `I | {iii, vi} | {ii, IV} | 5`, can
  yield I–vi–IV–V, the doo-wop schema (S113); the others sound pop-like but less specific. The
  singer/songwriter order I–V–vi–IV cannot occur, because degree 5 comes only at the end
  ([harmony-planner-policy.md](harmony-planner-policy.md#tonal-motion-candidates)). Missing: a
  drum backbeat, a repeated hook, and the anticipation figure. Sample: about 18 notes per phrase.
- **Later.** Gimmicks: a hook, a short figure repeated in phrase after phrase. Stored rhythms:
  common pop syncopations such as the 3 + 3 + 2 grouping (S46). The SRDC sentence form (S114) needs
  more than one phrase.
- **Serves.** P1 G1 (the most familiar idiom); P3 C1–C3 (song-like ideas are the ones a player
  keeps and exports).

### 5. Modal (Dorian)

**The idea.** Modal jazz puts one mode in front instead of a chain of changing chords, with chords
held for a long time ("So What", _Kind of Blue_, 1959, S104). A two-chord Dorian vamp, i and IV,
is also a rock and Latin staple ("Oye Como Va", S105). A **vamp** is a short chord pattern
repeated under a solo.

- **Settings today.** Grammar Neutral. Harmonic motion Gentle diatonic; Note density Eighth;
  Rhythmic variety Slightly varied; Syncopation Occasional offbeats; Silence density
  Conversational; Contour Wandering; Register Varying.
- **Would also set.** Collection Dorian; Tension Lift; Leapiness Leaping; Arpeggio chaos Varied.
  Suggested tempo 90–110 BPM.
- **Rhythm check.** Eighth: never blocked.
- **Figures and preferences.** Neighbor (4), passing (1): favor, so the raised 6th (Dorian's
  color note, [lexicon](lexicon.md#characteristic-note)) is heard as a melody note. Octave
  displacement (22) _(new)_: favor later. Chromatic: off, to keep the mode audible (proposed).
- **Fidelity today: fair.** The mode is exact, and the modal plan's one color chord in bar 2 or 3
  always contains the 6th, so it can be the IV of the classic vamp; it can also be ii or the
  diminished vi ([harmony-planner-policy.md](harmony-planner-policy.md#modal-motion-candidates)).
  A **Static** variant is closer to "So What". Missing: seventh chords and chords in fourths
  (S104), a looping vamp in the backing. Sample: about 22 notes per phrase, largest leap 10.
- **Later.** Gimmicks: figures built in fourths, pentatonic shapes over the mode. Stored rhythms:
  a vamp's riff rhythm the player can lock (ties to Jam, v3.2).
- **Serves.** P1 G1 (hearing what a mode sounds like); P3 C3 (a vamp is the easiest bed to
  doodle on).

### 6. Bebop

**The idea.** Bebop (1940s; Charlie Parker, Dizzy Gillespie) is fast, with quick chord changes and
long, angular eighth-note lines full of chromatic notes (S103). Bebop scales add one chromatic
passing note so chord tones fall on the beats (S9).

- **Settings today.** Grammar Jazz. Harmonic motion Active diatonic; Note density Eighth;
  Rhythmic variety Strict; Syncopation Occasional offbeats; Silence density Sparse; Contour
  Wandering; Register Varying.
- **Would also set.** Collection Major; Tension Build; Leapiness Leaping; Arpeggio chaos Varied.
  Suggested start 120 BPM, rising (proposed).
- **Rhythm check.** Eighth: never blocked.
- **Figures and preferences.** Chromatic approach (13) and chromatic enclosure (15): favor
  strongly. Arpeggiated figure (18): favor. Later: double chromatic approach (14), mixed enclosure
  (17), bebop-scale passing tone (20), octave displacement (22), all _(new)_.
- **Fidelity today: thin**, likely **fair** once weights exist. Strict eighths give the long
  lines, and Active diatonic includes a ii to V move (`I | {ii, IV} | 5 | 5`). But chromatic notes
  are rare without weights (28 % of phrases, 1.5 % of notes in the sample), chords are triads, and
  the eighths are not swung (S102, S103). It overlaps today's Jazz preset; weights are what would
  make it distinct.
- **Later.** Gimmicks: licks (stock bebop phrases) and enclosure patterns. Stored rhythms: lines
  that start or end off the beat (proposed).
- **Serves.** P1 G1 and G2. The owner plays tenor saxophone ([personas.md](../../specs/personas.md)), one of the two saxophones of the classic bebop group (S103).

### 7. Blues

**The idea.** The blues uses I, IV and V, usually as seventh chords, over twelve bars, with
melodies in an AAB call-and-response shape (S101). Its melodies lean on blue notes, the lowered
3rd, 5th and 7th, and on the minor pentatonic and blues scales (S9, S100), usually swung (S102).

- **Settings today.** Grammar Jazz. Harmonic motion Gentle diatonic; Note density Eighth;
  Rhythmic variety Heavily varied; Syncopation Occasional offbeats; Silence density Breath-heavy
  (room for call and response); Contour Falling; Register Middle.
- **Would also set.** Collection Mixolydian (the lowered 7th is in the scale); Tension Lift;
  Leapiness Shaped; Arpeggio chaos Varied. Suggested tempo 80–100 BPM. A "minor blues" variant
  would use Dorian, which holds every note of the minor pentatonic.
- **Rhythm check.** Eighth: never blocked.
- **Figures and preferences.** Chromatic approach from below (13): favor strongly; aimed at the
  3rd of the chord it gives the lowered-3rd-to-3rd move, the classic blues slide written as two
  notes. Blue note, written (21) _(new)_: favor strongly once a held blue note is allowed.
  Enclosure (15): default. Later, family 2: grace note (23), scoop (29), fall (27).
- **Fidelity today: thin.** In Mixolydian the modal plan's color chord is the flat-VII, the minor
  v or the diminished iii, never the IV or V of a blues
  ([harmony-planner-policy.md](harmony-planner-policy.md#modal-motion-candidates)); Major with
  Gentle gives I–I–IV–V instead, but loses the lowered 7th. Blue notes appear only as passing
  approaches (14 % of phrases had any outside note). No swing, no sevenths, no 12-bar form, no
  held lowered 3rd ([catalogue, entry 21](embellishment-catalogue.md#21-blue-note-written)).
- **Later.** Gimmicks: a riff repeated AAB style, the lowered-3rd slide, a held blue note.
  Stored rhythms: the shuffle (swung eighths) and riff rhythms. Most of this needs harmony and
  scale work beyond flags (a blues scale collection, dominant sevenths).
- **Serves.** P1 G1 (the minor pentatonic behind the blues is a common first improvising scale, S100); P3 C3 (riffs are gimmicks).

### 8. Bossa

**The idea.** Bossa nova (Rio de Janeiro, late 1950s; João Gilberto, Tom Jobim) is syncopated
but played without swing, over rich jazz-like chords, with a clave-like guitar pattern (S112).

- **Settings today.** Grammar Jazz. Harmonic motion Gentle diatonic; Note density Eighth;
  Rhythmic variety Slightly varied; Syncopation Active displacement; Silence density
  Conversational; Contour Falling; Register Middle.
- **Would also set.** Collection Major; Tension Lift; Leapiness Shaped; Arpeggio chaos Varied.
  Suggested tempo 100–120 BPM.
- **Rhythm check.** Eighth + Active displacement: supported (Eighth is never blocked; the blocked
  Active displacement cases are all Quarter or Sixteenth).
- **Figures and preferences.** Chromatic approach (13): favor. Appoggiatura (7): favor.
  Anticipation (9) _(new)_: favor strongly; notes pushed ahead of the beat and across the bar line
  are the style's feel (S46, S112).
- **Fidelity today: thin.** Straight eighths and heavy syncopation fit (S112). Missing: the bossa
  rhythm pattern, seventh and ninth chords, the guitar backing, and the 2/4 notation the style is
  usually written in (S112). Chromatic notes in 18 % of phrases.
- **Later.** Stored rhythms are the heart of it: the bossa clave and the guitar pattern (S112).
  Gimmick: the long-held note after a run of short pushed notes (proposed).
- **Serves.** P1 G1 (a new feel) and G2 (reading syncopation).

### 9. Baroque

**The idea.** Late-Baroque instrumental lines run in steady sixteenths (a "motor rhythm"),
develop one short motif by spinning it out, **Fortspinnung** (S109), mostly through
**sequences**, a figure repeated at stepwise different pitches (S110), and are ornamented by the
player with trills, mordents and appoggiaturas, mostly on the beat (S111).

- **Settings today.** Grammar Neutral. Harmonic motion Active diatonic; Note density Sixteenth;
  Rhythmic variety Slightly varied; Syncopation Straight; Silence density Sparse; Contour
  Falling; Register Middle.
- **Would also set.** Collection Minor; Tension Edge; Leapiness Leaping; Arpeggio chaos Varied.
  Suggested tempo 60–70 BPM.
- **Rhythm check.** Sixteenth + Slightly varied + Sparse + Straight: supported; stepped down to
  Eighth on a phone: supported.
- **Figures and preferences.** Accented passing tone (2) and appoggiatura (7): favor strongly
  (both on the beat, S111). Passing (1), neighbor (4): favor. Escape tone (8) and suspension (10)
  _(new)_: favor later. Family 2 later: trill (25), mordent (24). Chromatic: off.
- **Fidelity today: thin.** The steady sixteenths and minor key are right. Missing: sequences, the
  style's main device; the raised leading tone of harmonic minor (none in the app); trills at
  cadences. Sample: about 48 notes per phrase (26 on a phone), median 14 ms. With Arpeggio chaos
  Predictable instead of Varied, Leaping produced no leap at all at this density (largest interval
  4 semitones), so Varied is needed for the broken-chord figures the style uses.
- **Later.** Gimmick: the sequence (a motif repeated a step lower), which the mutation catalogue
  already lists as a motif transformation ([mutation catalogue](mutation-catalogue.md#sequence-diatonic-or-real)).
  Stored rhythms: motor-rhythm cells. A cadential trill needs O47's ornament symbols.
- **Serves.** P2 S1 (dense reading); P1 G2.

### Sample results

100 phrases each, all generated successfully (no failure of any kind). Written key C, B-flat
tenor. "Outside" means outside the collection. Neutral and Jazz are today's presets at their
first-load values, for comparison.

| Preset               | Phrases ok | Notes per phrase | Phrases with an outside note | Outside notes | Leaps (5+ semitones) | Largest interval | Median / slowest ms |
| -------------------- | ---------- | ---------------- | ---------------------------- | ------------- | -------------------- | ---------------- | ------------------- |
| Neutral (today)      | 100        | 12.5             | 0 %                          | 0 %           | 15.2 %               | 7                | 1 / 15              |
| Jazz (today)         | 100        | 21.6             | 21 %                         | 1.2 %         | 9.0 %                | 7                | 6 / 50              |
| 1 Gentle             | 100        | 12.0             | 0 %                          | 0 %           | 0 %                  | 2                | 2 / 5               |
| 2 Speed drill        | 100        | 46.2             | 0 %                          | 0 %           | 8.8 %                | 9                | 14 / 175            |
| 2 Speed drill, phone | 100        | 26.1             | 0 %                          | 0 %           | 15.6 %               | 9                | 9 / 61              |
| 3 Folk reel          | 100        | 29.0             | 0 %                          | 0 %           | 7.0 %                | 7                | 1 / 18              |
| 4 Pop song           | 100        | 18.3             | 0 %                          | 0 %           | 10.3 %               | 7                | 5 / 60              |
| 5 Modal (Dorian)     | 100        | 21.6             | 0 %                          | 0 %           | 16.7 %               | 10               | 4 / 6               |
| 6 Bebop              | 100        | 27.0             | 28 %                         | 1.5 %         | 13.8 %               | 10               | 9 / 35              |
| 7 Blues              | 100        | 15.2             | 14 %                         | 1.1 %         | 12.4 %               | 7                | 1 / 30              |
| 8 Bossa              | 100        | 21.7             | 18 %                         | 1.2 %         | 9.4 %                | 7                | 7 / 89              |
| 9 Baroque            | 100        | 47.6             | 0 %                          | 0 %           | 8.3 %                | 9                | 14 / 153            |
| 9 Baroque, phone     | 100        | 26.0             | 0 %                          | 0 %           | 13.9 %               | 10               | 2 / 28              |

Timings are single runs on the owner's development machine, for comparison only.

### Considered, not proposed

- **Minimalist** (repetition, steady pulse, diatonic, slow harmony, S115): feasible with Static
  harmony and Strict eighths, and Vary settings mimics its slow change. Left out because repetition
  works against P2's need for unmemorisable material (D59), and its core, a repeated cell, is a
  gimmick the app cannot store yet.
- **Rock, pentatonic pop, Appalachian folk:** they need five-note collections (S100); the closest
  today is Mixolydian or Dorian, which the Folk reel and Modal candidates already cover.
- **Klezmer, flamenco, "Middle-Eastern":** they need scales such as harmonic minor or Phrygian
  dominant, which `COLLECTIONS` does not hold.
- **Jig, waltz:** 6/8 and 3/4; the app is 4/4 only.
- **Classical (chorale or minuet):** too close to Neutral without suspensions, closed cadences and
  a raised leading tone; Baroque covers the same reader with more contrast.

## Recommended short list for v3.1 (proposed)

1. **Gentle** (proposed). The only candidate aimed at a first-time improviser, faithful to its
   purpose today, and the cheapest: it needs nothing new.
2. **Speed drill** (proposed). The only preset aimed at P2, the persona with no preset of its
   own; it bundles what P2 wants (density, variety, unpredictability) in one click.
3. **Folk reel** (proposed). The most faithful style today (even eighths, four-bar phrases, the
   typical modes), and a new sound next to Neutral and Jazz.
4. **Pop song** (proposed). The most familiar idiom for most players, with a real pop progression
   among its templates, and good material for P3 to keep.
5. **Modal (Dorian)** (proposed). Teaches what a mode sounds like, the app's strongest harmonic
   feature (nine collections with modal chord plans), and gives P3 a vamp to grow ideas on.

**Next, once flags and weights ship:** Bebop, because weights on chromatic approaches and
enclosures are exactly what would separate it from today's Jazz. **Later:** Blues, Bossa and
Baroque, whose signature traits (blue notes and dominant sevenths, the bossa rhythm pattern,
sequences and trills) need harmony, stored rhythms, gimmicks or ornaments, not just settings.

Every short-list preset except Gentle needs the spec to let a built-in preset set the
**collection**; Gentle and Speed drill also use Tension, Leapiness and Arpeggio chaos. If the spec
keeps presets to today's seven controls, only Gentle and Speed drill keep their character, and
only partly (proposed).

## Proposed lexicon entries

Merged into the [lexicon](lexicon.md) on 2026-10-07: [Pentatonic scale](lexicon.md#pentatonic-scale), [Blues scale](lexicon.md#blues-scale), [Twelve-bar blues](lexicon.md#twelve-bar-blues), [Vamp](lexicon.md#vamp), [Reel](lexicon.md#reel), [Bossa nova](lexicon.md#bossa-nova), [Built-in preset](lexicon.md#built-in-preset), [Player preset](lexicon.md#player-preset), [Signature figure](lexicon.md#signature-figure).

## Sources

New sources for this catalogue use the reserved block S100–S115, in the format of
[research-sources.md](research-sources.md) (merged on 2026-10-07; S116–S119 were reserved and not used). They are reference only: no
text is copied or closely paraphrased. Wikipedia pages are used as pointers for widely documented
genre facts. Already in research-sources.md and cited above: S9 (jazz scales, blues and bebop
scales) and S46 (rhythm and meter in pop music, the 3 + 3 + 2 grouping and early "pushes").

### Scales and harmony

- **S100 - Pentatonic scale.** Wikipedia: https://en.wikipedia.org/wiki/Pentatonic_scale
  - Useful for: major and minor pentatonic contents; the minor pentatonic as the basis of the blues scale and of blues and rock soloing; its use in Scottish, Irish and Appalachian folk; why it suits improvisers.
  - Applied in: [What no setting can express today](#what-no-setting-can-express-today), Blues, Considered, the pentatonic-scale and blues-scale lexicon drafts.
- **S101 - Twelve-bar blues.** Wikipedia: https://en.wikipedia.org/wiki/Twelve-bar_blues
  - Useful for: the I–IV–V twelve-bar pattern, seventh-chord variants, the AAB melodic shape.
  - Applied in: Blues, the twelve-bar-blues lexicon draft.
- **S113 - Four-chord schemas.** Open Music Theory 2e (Gotham et al.), LibreTexts mirror, CC BY-SA: https://human.libretexts.org/Bookshelves/Music/Music_Theory/Open_Music_Theory_2e_(Gotham_et_al.)/07%3A_Popular_Music/7.09%3A_Four-Chord_Schemas
  - Useful for: I, IV, V and vi as pop's most common chords; the doo-wop schema I–vi–IV–V (1950s–60s) and the singer/songwriter schema I–V–vi–IV (from the mid-1990s).
  - Applied in: Pop song.
- **S114 - Melody and phrasing in pop music.** Open Music Theory 2e (Gotham et al.), LibreTexts mirror, CC BY-SA: https://human.libretexts.org/Bookshelves/Music/Music_Theory/Open_Music_Theory_2e_(Gotham_et_al.)/07%3A_Popular_Music/7.03%3A_Melody_and_Phrasing
  - Useful for: a pop phrase typically lasting four bars; the SRDC (statement, response, departure, conclusion) sentence form.
  - Applied in: Pop song.

### Jazz and Latin styles

- **S102 - Swing.** Wikipedia: https://en.wikipedia.org/wiki/Swing_(jazz_performance_style)
  - Useful for: unequal eighths, the triplet (2:1) approximation, the ratio narrowing at faster tempos, the styles that swing.
  - Applied in: What no setting can express today (swing, acknowledgement of swung notes), Bebop, Blues.
- **S103 - Bebop.** Wikipedia: https://en.wikipedia.org/wiki/Bebop
  - Useful for: fast tempos, quick and complex chord changes, angular lines, extended and altered chords; early-1940s origin with Parker and Gillespie.
  - Applied in: Bebop, What no setting can express today.
- **S104 - Modal jazz.** Wikipedia: https://en.wikipedia.org/wiki/Modal_jazz
  - Useful for: modes in front instead of changing chords; "So What" and _Kind of Blue_ (1959); D Dorian in "So What"; chords voiced in fourths.
  - Applied in: Modal (Dorian), the vamp lexicon draft.
- **S105 - "Oye Como Va".** Ethan Hein, blog post: https://ethanhein.com/wp/2021/oye-como-va/
  - Useful for: a whole tune in A Dorian on a two-chord i–IV vamp, and the raised 6th as the source of its color.
  - Applied in: Modal (Dorian), the vamp lexicon draft. A practitioner blog, used for one well-known example.
- **S112 - Bossa nova.** Wikipedia: https://en.wikipedia.org/wiki/Bossa_nova
  - Useful for: late-1950s Rio de Janeiro origin (Gilberto, Jobim); the guitar pattern and clave-like percussion; syncopation; played without swing; complex chords; usual 2/4 notation.
  - Applied in: Bossa, What no setting can express today, the bossa-nova lexicon draft.

### Folk and Baroque styles

- **S106 - Reel.** Wikipedia: https://en.wikipedia.org/wiki/Reel_(dance)
  - Useful for: 4/4 or 2/2; mostly eighth-note movement accented on beats 1 and 3; played even, without swing; eight-bar parts divisible into four-bar phrases; AABB form.
  - Applied in: Folk reel, the reel lexicon draft.
- **S107 - Modes in Irish and Scottish music.** John Chambers, "A Brief Tutorial on Musical Modes", ABC notation pages at MIT: https://trillian.mit.edu/~jc/doc/abc/Modes.html
  - Useful for: Dorian and Mixolydian as very common in Irish and Scottish tunes; a "minor" tune often being Dorian.
  - Applied in: Folk reel.
- **S108 - Irish ornamentation.** The Celtic Room, "Irish music ornamentation": https://thecelticroom.org/playing-irish-music/irish-music-ornamentation.html
  - Useful for: the cut (a grace note above), the tap or strike (below), the long and short roll, the cran; ornaments varied freely by the player.
  - Applied in: Folk reel, the reel lexicon draft. A practitioner page, cross-checked against the ornament entries of the [embellishment catalogue](embellishment-catalogue.md).
- **S109 - Fortspinnung.** Wikipedia: https://en.wikipedia.org/wiki/Fortspinnung
  - Useful for: "spinning out" a motif through sequences, repetition and variation; the opening–development–cadence shape; Baroque usage.
  - Applied in: Baroque.
- **S110 - Sequence.** Wikipedia: https://en.wikipedia.org/wiki/Sequence_(music)
  - Useful for: a passage restated at another pitch level; the descending-fifths sequence; its strong association with Baroque music and Vivaldi.
  - Applied in: Baroque.
- **S111 - Ornament (music).** Wikipedia: https://en.wikipedia.org/wiki/Ornament_(music)
  - Useful for: Baroque performers improvising trills, mordents and appoggiaturas; most Baroque ornaments falling on the beat.
  - Applied in: Baroque.
- **S115 - Minimal music.** Wikipedia: https://en.wikipedia.org/wiki/Minimal_music
  - Useful for: repetition, process, steady pulse, consonant diatonic harmony with slow harmonic rhythm.
  - Applied in: Considered, not proposed.

## Questions for the spec session

1. **What a built-in preset holds.** Today: grammar plus seven controls. Proposed: add Collection,
   Tension, Leapiness and Arpeggio chaos; never the written key or instrument; tempo as a
   suggestion only. Without Collection, Folk reel, Pop song, Modal, Blues and Bebop cannot exist.
2. **Preset versus grammar.** The profile name travels in the generation intent and in the phrase
   replay key (`src/generation-worker/phrase-replay-key.ts`), and the generator reads only its
   capability. Should a new built-in preset be a layer above the grammar (each preset names
   Neutral or Jazz, or a set of embellishment flags) so replay keys and the generator stay
   unchanged? (proposed: yes)
3. **Presets and flags.** Does a preset carry embellishment flags and weights (catalogue question
   8)? If yes, do Neutral and Jazz become two flag sets, and may a Neutral-based preset turn on a
   chromatic figure (catalogue question 2; Speed drill would use it)?
4. **"Custom" and Vary settings.** Changing one control shows "Custom" today, and Vary settings
   switches the profile name between Neutral and Jazz only
   ([mutation catalogue](mutation-catalogue.md#which-settings-it-touches)). With more presets, what
   does Vary settings do to the preset (keep it, or step among presets)? May it drift a style
   preset away from its style, for example Folk reel's collection to Lydian?
5. **Short list.** Ship Gentle, Speed drill, Folk reel, Pop song and Modal (Dorian) in v3.1, with
   Bebop once weights exist? Or fewer?
6. **Names.** "Gentle", "Speed drill", "Folk reel", "Pop song", "Modal (Dorian)" are working
   names. Should practice-purpose presets (Gentle, Speed drill) be grouped apart from style
   presets in the picker?
7. **Session options in presets.** Speed drill wants Rising tempo on. Can a preset turn on a
   session option, or only generation controls?
8. **Honest labels.** Should a style preset's popup say what it cannot do yet (for example "even
   eighths: swing them if you like"), as the lexicon already does for swing?
9. **Later needs recorded now.** Blues needs a blues or pentatonic collection and dominant
   sevenths; Bossa needs stored rhythm patterns; Baroque needs sequences and harmonic minor. Should
   these go to the roadmap as named candidates?
