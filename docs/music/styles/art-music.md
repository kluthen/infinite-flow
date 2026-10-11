# Style Atlas: Western Art Music

Status: research (2026-10-11), style atlas groundwork; not settled policy.

## Purpose

This page describes twelve styles, ten from Western art music and two functional genres that grew
up beside it (march and waltz), in terms Infinite Flow's generator could use. Each style gets the
same short entry: what makes it recognisable, the closest settings that exist today, and what a
future style layer would need, split into **tuning** (soft weights: "more often"), **restriction**
(hard constraints: "never" or "only") and **manipulation** (transformations and planned material:
sequences, cadence formulas, stored rhythm cells). These are the families of the
[draft identity schema](../identity-modelling.md#draft-identity-schema-inference). Each entry ends
with the v4 accompaniment roles the style would use
([role catalogue](../arranging-and-roles.md#role-catalogue)), the capability ids it needs, and an
honest fidelity rating. The catalogue extends the nine
[candidate presets](../preset-catalogue.md#candidate-built-in-presets) (the Baroque entry here
builds on [candidate 9](../preset-catalogue.md#9-baroque) and does not contradict it), and it doubles
as a roadmap hint: the capabilities that recur most are the best ones to build first.

**How to read it.**

- **Fidelity** uses the brief's scale. With today's generator: **none** (the style cannot be
  heard), **hint** (one or two traits are there), **recognisable**. With the listed capabilities:
  **hint**, **recognisable**, **convincing** (a listener who knows the style would accept a
  four-bar fragment as a plausible excerpt).
- Facts carry a source id in brackets, such as `(S271)` or `(S70)`, registered in
  [research-sources.md](../research-sources.md). Statements marked **(inference)** are this
  researcher's judgment, not sourced fact.
- "Today" means v3.0 as built: Neutral and Jazz grammars, nine collections, Static / Gentle /
  Active harmonic templates of root-position triads, four 4/4 bars, an
  [open ending](../lexicon.md#open-ending) on every phrase, and a backing of bass plus block chords
  on whole beats ([preset catalogue](../preset-catalogue.md#what-a-built-in-preset-can-set-today)).
- Everything stays procedurally generated. The recurring loss is the same for every entry and is
  stated once here: human intent, text (for the vocal styles), long-range form, live
  instrumental colour and expressive timing. Each entry names only its own specific losses.

## Styles covered

| #   | Style                                | Family / era                                | Fidelity today | Fidelity with capabilities |
| --- | ------------------------------------ | ------------------------------------------- | -------------- | -------------------------- |
| 1   | Gregorian chant                      | Medieval sacred monophony, c. 800–1200      | hint           | recognisable               |
| 2   | Renaissance polyphony (Palestrina)   | Renaissance sacred vocal, 16th century      | hint           | recognisable               |
| 3   | Baroque                              | Baroque instrumental, c. 1680–1750          | hint           | recognisable               |
| 4   | Classical period                     | Classical instrumental, c. 1760–1810        | hint           | convincing                 |
| 5   | Romantic                             | 19th-century instrumental and song          | hint           | recognisable               |
| 6   | Impressionism                        | French, c. 1890–1920                        | hint           | recognisable               |
| 7   | Epic film orchestral (late Romantic) | Hollywood and game scores, 1930s–today      | hint           | recognisable               |
| 8   | Minimalism                           | American, 1960s–today                       | hint           | convincing                 |
| 9   | Neoclassical and modernist (tonal)   | 20th century, interwar onward               | hint           | recognisable               |
| 10  | March and fanfare                    | Military and ceremonial, 18th century–today | hint           | convincing                 |
| 11  | Waltz (and minuet)                   | Dance in triple metre, 18th–19th century    | none           | convincing                 |
| 12  | Chorale and hymn                     | Protestant sacred, 16th century–today       | hint           | convincing                 |

No style reaches "recognisable" today. The reasons repeat: every phrase ends open, the minor
collection never has a major dominant, chords are root-position triads changing at most twice a
bar, the metre is 4/4 only, and the backing is the same block chords for every style. Those are
exactly the capabilities that lift most entries by one or two steps.

## Style entries

### 1. Gregorian chant

- **Family / place / era:** medieval sacred song of the Roman church, written down from the 9th
  century. **One line:** one unaccompanied voice singing a Latin text on a smooth, modal line,
  with no fixed beat (S267).
- **Recognise it by:** a single line with no harmony ([monophony](../lexicon.md#monophony)) (S267);
  stepwise motion inside a mode, ending on the mode's [final](../lexicon.md#final) (S268, S70);
  long stretches on one repeated pitch, the [reciting tone](#lexicon-candidates) (S269); groups of
  many notes on one syllable, **melismas**, in the ornate chants (S267); free, speech-led rhythm,
  whose exact performance is still debated (S267).
- **Today's controls:** Neutral; Collection Dorian, Phrygian, Lydian or Mixolydian (the modes on
  the four finals D, E, F and G, S268; Aeolian and Ionian were added to the system only in 1547, S268);
  Harmonic motion Static; Note density Quarter; Rhythmic
  variety Slightly varied; Syncopation Straight; Silence density Conversational; Contour Arch;
  Leapiness Smooth; Arpeggio chaos Predictable; Register Middle; Tension Settled.
- **Tuning:** steps strongly favoured, thirds sometimes, fourths and fifths rare (inference, in line
  with S70's mode profiles); repeated notes favoured on the reciting tone; quarter and half values
  only; degree points on the final and the reciting tone (a fifth above the final, a sixth in
  the Phrygian mode, S268, S269).
- **Restriction:** the collection only (the B-flat that chant could use is out of scope); range
  about one octave: final to octave above (authentic) or fourth below to fifth above (plagal)
  (S268); the last note is
  the final; no chords, no syncopation, no sixteenths.
- **Manipulation:** the recitation formula: an opening rise (intonation), a held reciting tone, a
  small bend at mid-phrase (the mediant) and a closing formula to the final (S269); melisma as a
  stepwise run of 4–8 notes inside a held "syllable" span (inference).
- **Accompaniment (v4 roles):** none in the pure style. An **organum** variant adds a second voice
  in parallel fourths or fifths, starting and ending on a unison, or a sustained bass note
  (bourdon) (S270): roles [parallel doubling](../arranging-and-roles.md#parallel-thirds-and-sixths)
  at a fourth or fifth, and [drone](../arranging-and-roles.md#pedal-point-and-drone). Timbre:
  men's voices, organ; large reverberant room. No drums.
- **Capabilities needed:** `closed-endings`, `modal-harmony`, `drone-pedal`, `parallel-harmony`,
  `accompaniment-roles`, `timbre-presets`, `NEW:unmeasured-rhythm`.
- **Fidelity:** today **hint** (the mode and smooth line are right; the block-chord backing, the
  bar accents and the open ending all contradict chant). With capabilities **recognisable**. Lost:
  the Latin text that shapes every rhythm and melisma, and the real formula repertoire.

### 2. Renaissance polyphony (Palestrina style)

- **Family / place / era:** sacred vocal music of 16th-century Rome; Palestrina is the textbook
  model. **One line:** four to six equal voices, each a smooth singable line, entering one after
  another with the same short idea and meeting in soft, consonant cadences (S271).
- **Recognise it by:** **points of imitation**, where each voice enters with the same opening
  figure (S271); conjunct lines with contrary motion between voices (S271);
  [suspensions](../lexicon.md#suspension) at cadences, prepared, dissonant on the strong beat,
  resolving down a step (S271); a calm half-note pulse with quarter-note motion starting on weak
  beats (S271); modal sound with a raised leading note at the cadence (S271).
- **Today's controls:** Neutral; Collection Dorian, Aeolian or Ionian (modal templates); Harmonic
  motion Gentle diatonic; Note density Quarter; Rhythmic variety Slightly varied; Syncopation
  Straight; Silence density Conversational; Contour Arch; Leapiness Smooth (Shaped for variety);
  Arpeggio chaos Predictable; Register Middle; Tension Settled.
- **Tuning:** steps first; thirds, fourths, fifths and octaves allowed; the rising minor sixth
  occasional (S271); after a leap, a step back the other way (S271); note-value points: half +2,
  quarter +1, eighths only as a weak-beat pair (the last is inference).
- **Restriction (S271):** no melodic sevenths or tritones, not even outlined by two leaps or by a
  gesture's high and low points; descending sixths banned; no two leaps in the same direction (or
  the larger one lower); each voice within about an octave, never beyond a twelfth; the final
  approached by step.
- **Manipulation:** a point of imitation at the phrase start (the lead's first bar answered by
  another voice a bar later, at the octave, fifth or fourth); a 4–3 or 7–6 suspension into the
  last chord; a closed cadence on the final with the leading note raised except in Phrygian (S271).
- **Accompaniment (v4 roles):** two or three independent vocal-range lines
  ([counterpoint](#lexicon-candidates)) using
  [echo, imitation and canon](../arranging-and-roles.md#echo-imitation-and-canon) and
  [counter-melody](../arranging-and-roles.md#counter-melody), under the
  [voice-leading minimum rules](../arranging-and-roles.md#voice-leading-minimum-rules) (no parallel
  fifths or octaves, S145). Timbre: choir, or viols and organ. No drums.
- **Capabilities needed:** `counterpoint`, `motif-repetition-development`, `closed-endings`,
  `accompaniment-roles`, `timbre-presets`, `NEW:suspensions-ties`, `NEW:cadential-leading-tone`.
- **Fidelity:** today **hint** (a smooth modal line over triads). With capabilities
  **recognisable**. Lost: the text, and phrases that overlap across voices instead of stopping
  every four bars.

### 3. Baroque

- **Family / place / era:** European instrumental music, c. 1680–1750 (Bach, Handel, Vivaldi).
  **One line:** a busy, driving melodic line spun out of one small motif, over a bass that never
  stops, ornamented at the cadences. This entry is preset
  [candidate 9](../preset-catalogue.md#9-baroque) seen from the style side; its settings are reused
  as they stand.
- **Recognise it by:** steady "motor" rhythm in sixteenths (preset candidate 9);
  [sequences](../lexicon.md#sequence), a figure restated a step lower or higher, as the engine of
  **Fortspinnung** (spinning out) (S109, S110); a continuously moving bass with chords filled in
  above it, the **basso continuo** (S272); trills and other ornaments, mostly on the beat (S111);
  minor keys with a major dominant at the cadence.
- **Today's controls:** preset candidate 9 as published: Neutral; Collection Minor; Harmonic
  motion Active diatonic; Note density Sixteenth; Rhythmic variety Slightly varied; Syncopation
  Straight; Silence density Sparse; Contour Falling; Register Middle; Tension Edge; Leapiness
  Leaping; Arpeggio chaos Varied.
- **Tuning:** as candidate 9 (accented passing tone and appoggiatura favoured strongly; passing and
  neighbour favoured); arpeggiated figures and scale runs favoured (embellishment
  [18](../embellishment-catalogue.md#18-arpeggiated-figure) and
  [19](../embellishment-catalogue.md#19-scale-run-fill)); chord points for a falling-fifths chain
  (vi–ii–V–I) (S110); tempo suggestion 60–90 BPM.
- **Restriction:** [harmonic minor](../lexicon.md#harmonic-minor) at the cadence (major V); one
  rhythmic texture per phrase, no syncopation except a suspension's tie; metre fixed by the dance
  (below).
- **Manipulation:** the Fortspinnung plan over four bars: motif (bar 1), sequence of it one step
  down (bars 2–3), cadence (bar 4) (S109; the four-bar mapping is inference); the
  [mutation catalogue's sequence](../mutation-catalogue.md#sequence-diatonic-or-real) is the
  transform; a cadential trill on the note before the last (S111); the Rule of the Octave, a stock
  harmonisation of a stepwise bass using chord inversions (S276).
- **Dance-movement variants:** the suite's core dances are allemande, courante, sarabande and gigue
  (S273). Only the allemande and bourrée-like duple dances fit 4/4. Courante, sarabande and minuet
  are in triple metre, with a **hemiola** (two bars of three heard as three of two) at the cadence
  (S275); the gigue is in compound metre and often starts as an imitation between voices (S274).
- **Accompaniment (v4 roles):** continuo: a bass line plus chords realised above it, today
  typically cello and harpsichord (S272); a [walking bass](../lexicon.md#walking-bass) of even notes,
  which is common in Baroque music (S132); a second voice in imitation for gigue-like phrases. No
  drums.
- **Capabilities needed:** `sequences`, `harmonic-minor`, `symbol-ornaments`, `closed-endings`,
  `accompaniment-roles`, `motif-repetition-development`, `counterpoint`, `triple-meter`,
  `compound-meter`, `NEW:suspensions-ties`, `NEW:chord-inversions`, `NEW:fast-harmonic-rhythm`.
- **Fidelity:** today **hint** (candidate 9's "thin"). With capabilities **recognisable**; a
  prelude-like motor-rhythm phrase over a walking bass may come close to convincing (inference).
  Lost: fugue and imitation across a whole movement, and the player-improvised ornaments.

### 4. Classical period

- **Family / place / era:** Viennese instrumental music, c. 1760–1810 (Haydn, Mozart, early
  Beethoven), growing out of the galant style. **One line:** a clear, balanced tune in short
  phrases over a light chordal accompaniment, with plain, strong cadences (S277).
- **Recognise it by:** [homophony](../lexicon.md#homophony), one melody over a subordinate chordal
  accompaniment (S277); short phrases, typically four bars (S277), paired as a **period**
  (antecedent ending on a half cadence, consequent ending on a full cadence) or built as a
  **sentence** (S45, S43); the **Alberti bass**, a broken chord played lowest–highest–middle–highest
  (S278); clear cadences on I and V (S3).
- **Today's controls:** Neutral; Collection Major (tonal templates); Harmonic motion Gentle
  diatonic; Note density Eighth; Rhythmic variety Slightly varied; Syncopation Straight; Silence
  density Conversational; Contour Arch; Leapiness Shaped; Arpeggio chaos Predictable; Register
  Middle; Tension Lift.
- **Tuning:** appoggiaturas favoured (the "sigh" on a strong beat, S6); arpeggiated figures
  favoured; chord points on I, IV, V, ii; dotted rhythms and repeated-note figures as rhythm points
  (inference); tempo suggestion 80–120 BPM.
- **Restriction:** four-bar phrases (already true); in minor, a major V (harmonic minor); cadences
  only on I or V; mostly diatonic.
- **Manipulation:** the period across two phrases: phrase A ends on V, which today's Gentle
  template already does ([tonal templates](../harmony-planner-policy.md#tonal-motion-candidates)
  end on degree 5 in bar 4), and phrase B repeats A's opening and closes on I (S45, needs
  `closed-endings`); the sentence: a two-bar idea, its repetition, then a faster continuation to
  the cadence (S43); galant **schemas** as progression templates, such as the Prinner (melody
  6–5–4–3 over bass 4–3–2–1) (S279); the cadential 6/4 before V (needs inversions).
- **Accompaniment (v4 roles):** Alberti bass (S278, S279) as an
  [ostinato](../arranging-and-roles.md#ostinato-riff-and-vamp) pattern on each chord; a simple
  root bass for orchestral textures; occasional
  [parallel thirds](../arranging-and-roles.md#parallel-thirds-and-sixths). Timbre: fortepiano,
  strings, light winds. No drums.
- **Capabilities needed:** `closed-endings`, `phrase-length`, `accompaniment-roles`,
  `motif-repetition-development`, `progression-templates`, `harmonic-minor`, `seventh-chords`
  (V7), `articulation-dynamics`, `NEW:chord-inversions`.
- **Fidelity:** today **hint**, the closest of all entries: Major plus Gentle already gives a
  four-bar phrase ending on a half cadence, but block chords and the missing answer phrase keep it
  generic. With capabilities **convincing** (an eight-bar period over an Alberti bass is a very
  formulaic target, inference). Lost: sonata-scale form and the wit of surprise.

### 5. Romantic

- **Family / place / era:** 19th-century piano music, song and opera (Schubert, Chopin,
  Schumann, Brahms, Tchaikovsky). **One line:** a long, singing melody over rich, more chromatic
  harmony and a flowing accompaniment, shaped by swells of loudness and flexible time (S280).
- **Recognise it by:** increased chromaticism (S280); chords borrowed from the parallel minor
  (**modal mixture**), most often in major keys (S281); **chromatic mediants**, chords a third
  apart that keep one common tone, rare before and common in Romantic music (S283, S282);
  [appoggiaturas](../lexicon.md#appoggiatura) and suspensions as expressive "sighs"; a wide
  melodic range with a climax high in the phrase (inference).
- **Today's controls:** Neutral; Collection Major or Minor; Harmonic motion Active diatonic; Note
  density Eighth; Rhythmic variety Slightly varied; Syncopation Occasional offbeats; Silence density
  Conversational; Contour Arch; Leapiness Leaping; Arpeggio chaos Varied; Register Varying;
  Tension Build.
- **Tuning:** appoggiatura and chromatic passing tone favoured; leaps of a sixth and octave on the
  way to the climax, then stepwise descent (inference); chord points for ii7, IV, iv (mixture),
  V7; tempo suggestion 60–90 BPM.
- **Restriction:** a range wider than one octave (today one window); chromatic notes allowed as
  melody notes, not only as approaches.
- **Manipulation:** an arch with one planned high point in bar 3 (inference); a borrowed iv or
  flat-VI before the cadence (S281); a chromatic-mediant move in place of a plain V (S282);
  [motif](../lexicon.md#motif) repetition with changed harmony underneath.
- **Accompaniment (v4 roles):** broken-chord accompaniment spread over two octaves (nocturne
  style), a [pad](../arranging-and-roles.md#pad-sustained-harmony) of sustained strings, a
  [counter-melody](../arranging-and-roles.md#counter-melody) in the cello range. Timbre: piano,
  strings, horn. No drums.
- **Capabilities needed:** `seventh-chords`, `extended-altered-chords` (mixture, secondary
  dominants), `modulation`, `articulation-dynamics`, `accompaniment-roles`, `symbol-ornaments`,
  `closed-endings`, `timbre-presets`, `NEW:wide-range`, `NEW:chromatic-mediants`, `NEW:suspensions-ties`, `NEW:chord-inversions`.
- **Fidelity:** today **hint**. With capabilities **recognisable**. Lost: rubato (stretching the
  beat), which a timed sight-reading app cannot ask for, and long modulating paragraphs.

### 6. Impressionism

- **Family / place / era:** French music c. 1890–1920 (Debussy, Ravel). **One line:** music that
  paints a mood with colour: modal and non-diatonic scales, parallel chords and blurred, unresolved
  harmony (S284).
- **Recognise it by:** whole-tone and pentatonic scales (S284, S285); **planing**, whole chords
  moving in parallel, which weakens the sense of progression (S286); large unresolved chords
  (ninths, elevenths) (S284); ambiguous tonality and modes (S284); emphasis on timbre (S284).
- **Today's controls:** Neutral; Collection Lydian, Dorian or Mixolydian; Harmonic motion Static or
  Gentle diatonic; Note density Eighth; Rhythmic variety Slightly varied; Syncopation Occasional
  offbeats; Silence density Breath-heavy; Contour Wandering; Leapiness Leaping; Arpeggio chaos
  Varied; Register Varying; Tension Lift.
- **Tuning:** the mode's colour note favoured (Lydian's raised fourth, S288); pentatonic-shaped
  figures; long held notes and rests favoured; tempo suggestion 50–80 BPM (below today's 60 floor
  only at the slow end).
- **Restriction:** a whole-tone collection variant (six notes, only augmented triads, no clear
  home note, S287, S285); a pentatonic variant (S285); no strong V–I cadence (inference).
- **Manipulation:** planing of the backing chord shape along the melody (S286); a pedal note held
  under changing chords; repetition of a short figure at different registers (inference).
- **Accompaniment (v4 roles):** [pedal point and drone](../arranging-and-roles.md#pedal-point-and-drone),
  parallel-chord pad, harp-like arpeggios. Timbre: piano with sustain, harp, flute, muted
  strings, celesta; reverb. No drums.
- **Capabilities needed:** `exotic-scales` (whole-tone), `pentatonic-scales`, `parallel-harmony`,
  `extended-altered-chords` (ninths), `modal-harmony`, `drone-pedal`, `accompaniment-roles`,
  `timbre-presets`,
  `articulation-dynamics`, `tempo-range`.
- **Fidelity:** today **hint** (Lydian over Static harmony is already Debussy-adjacent). With
  capabilities **recognisable**. Lost: the piano pedal's blur and orchestral colour, which carry
  much of the style (S284).

### 7. Epic film orchestral (late Romantic)

- **Family / place / era:** Hollywood and game scores in the late-Romantic tradition (Korngold to
  John Williams and beyond). **One line:** heroic leaping themes for characters, Lydian or
  chromatic chord moves for wonder, driving string ostinatos and brass for action.
- **Recognise it by:** themes tied to characters and ideas, the [leitmotif](../lexicon.md#leitmotif)
  idea (S289, S155, S157); chromatically related chords for wonder, including a cadence that lands
  on the tonic of an unexpected key a third away (S290); the Lydian raised fourth for awe (S219, a
  practitioner trope); the major tritone progression for outer space (S209); heroic brass leaps of
  a fourth, fifth or octave (inference).
- **Today's controls:** Neutral; Collection Lydian (the modal plan's colour chord in bar 2 or 3 can
  be the major II, giving the I–II "wonder" move, per the
  [modal templates](../harmony-planner-policy.md#modal-motion-candidates)) or Major; Harmonic
  motion Gentle diatonic; Note density Quarter; Rhythmic variety Slightly varied; Syncopation
  Straight; Silence density Conversational; Contour Rising; Leapiness Leaping; Arpeggio chaos
  Predictable; Register Varying; Tension Build.
- **Tuning:** leaps of a fifth and octave at phrase starts, steps afterwards; long notes on
  arrivals; chord points for I, II (Lydian), flat-VI and flat-VII (mixture); tempo by scene.
- **Restriction:** a wide range; triads as the main sound, with chromatic triads allowed.
- **Manipulation:** the leitmotif as stored, placed material, transformed by situation (minor for
  danger, slow for grief, S206); a chromatic-mediant cadence (S290); the subtonic half cadence
  (flat-VII) for Western scenes (S290); a planned climax.
- **Accompaniment (v4 roles):** string [ostinato](../arranging-and-roles.md#ostinato-riff-and-vamp)
  in eighths or sixteenths, brass [pad](../arranging-and-roles.md#pad-sustained-harmony) and
  [stabs](../arranging-and-roles.md#rhythmic-punctuation-stabs-hits-kicks), low pedal, timpani and
  orchestral percussion. Timbre: full orchestra, choir pads.
- **Capabilities needed:** `motif-repetition-development`, `accompaniment-roles`, `drums`,
  `timbre-presets`, `extended-altered-chords` (mixture), `modulation`, `articulation-dynamics`,
  `NEW:chromatic-mediants`, `NEW:wide-range`.
- **Fidelity:** today **hint**. With capabilities **recognisable**; this is the natural home of the
  RPG's character themes ([musical identity](../musical-identity.md#leitmotif-and-character-themes)).
  Lost: picture synchronisation and the orchestra's weight.

### 8. Minimalism

- **Family / place / era:** American music from the 1960s (La Monte Young, Riley, Reich, Glass,
  later Adams). **One line:** short consonant patterns repeated many times over a steady pulse,
  changing slowly by strict rules (S291, S115).
- **Recognise it by:** repetitive patterns or pulses, drones, consonant harmony (S115); **process**:
  change by a rule applied step by step (S115); **phasing**, two players on the same loop drifting
  one note apart (S291), as in Reich's _Piano Phase_ with its twelve-note figure (S292); Glass's
  **additive process**, a figure growing or shrinking by one unit at a time (S293); very slow
  harmonic change (S115).
- **Today's controls:** Neutral; Collection Ionian, Dorian or Mixolydian; Harmonic motion Static;
  Note density Eighth (Sixteenth for Reich-like); Rhythmic variety Strict; Syncopation Straight;
  Silence density Sparse; Contour Wandering; Leapiness Shaped; Arpeggio chaos Predictable;
  Register Middle; Tension Settled.
- **Tuning:** a small pitch set (five or six notes) favoured; arpeggio and broken-chord figures
  (Glass); no rests inside the cell; tempo suggestion 100–160 BPM.
- **Restriction:** one cell of 6–12 notes repeated within the phrase; harmony changes at most once
  per phrase.
- **Manipulation:** the cell as planned material; across phrases, a deterministic process: add one
  note (additive), remove one (subtractive), rotate the cell by one note (a phase step, S291's
  "inserting or removing a note" variant) (inference for the mapping).
- **Accompaniment (v4 roles):** a second voice playing the same cell phased against the lead,
  marimba-like [ostinato](../arranging-and-roles.md#ostinato-riff-and-vamp), sustained
  [drone](../arranging-and-roles.md#pedal-point-and-drone). Timbre: marimba, piano, electric organ,
  soft synth. Optional pulse percussion.
- **Capabilities needed:** `motif-repetition-development`, `accompaniment-roles`, `drone-pedal`,
  `phrase-length`, `timbre-presets`, `NEW:process-music`.
- **Fidelity:** today **hint** (static harmony and steady eighths, but no repetition between
  phrases). With capabilities **convincing**: rule-driven process suits a seeded generator
  (inference). Lost: the time scale; minimalism's effect needs minutes of repetition, and repetition
  works against the P2 reading drill (D59,
  [preset catalogue](../preset-catalogue.md#considered-not-proposed)).

### 9. Neoclassical and modernist (tonal side)

- **Family / place / era:** 20th-century music that kept tonal centres while changing the rules:
  Stravinsky's and Hindemith's neoclassicism, Bartók, Copland, Prokofiev. **One line:** clear,
  economical textures with "wrong-note" diatonic harmony, chords in fourths, symmetric scales and
  restless metres (S294).
- **Recognise it by:** order, balance, clarity and restraint borrowed from 18th-century models
  (S294); **pandiatonicism**, free use of all notes of a diatonic scale without functional chords
  ("white-note music") (S295); **quartal chords**, stacks of fourths in which any note can act as the
  root (S296); the **octatonic** scale of alternating whole and half steps (S297, S285); changing and
  asymmetric metres and ostinatos (S298).
- **Today's controls:** Neutral; Collection Ionian or Lydian; Harmonic motion Active diatonic; Note
  density Eighth; Rhythmic variety Heavily varied; Syncopation Active displacement; Silence density
  Conversational; Contour Wandering; Leapiness Angular; Arpeggio chaos Chaotic; Register Varying;
  Tension Edge.
- **Tuning:** fourths, fifths and sevenths favoured; staccato articulation favoured; accents off
  the beat.
- **Restriction:** a diatonic collection without functional cadences (pandiatonic), or an octatonic
  collection (exotic-scales); no seventh-chord "jazz" voicings.
- **Manipulation:** quartal chord vocabulary; an ostinato under shifting accents (S298); a motif
  displaced by an eighth on repetition
  ([mutation catalogue](../mutation-catalogue.md#shift-the-whole-motif-metric-displacement)).
- **Accompaniment (v4 roles):** ostinato, quartal [pad](../arranging-and-roles.md#pad-sustained-harmony),
  [stabs](../arranging-and-roles.md#rhythmic-punctuation-stabs-hits-kicks). Timbre: dry winds,
  piano, pizzicato strings, snare.
- **Capabilities needed:** `exotic-scales` (octatonic), `odd-meter`, `parallel-harmony`,
  `articulation-dynamics`, `accompaniment-roles`, `rhythm-cells-timelines`, `NEW:quartal-chords`.
- **Fidelity:** today **hint** (angular and syncopated, but every chord is a functional triad).
  With capabilities **recognisable** for the neoclassical side. Atonal and twelve-tone music (S48)
  is outside a tonal phrase generator and is not attempted.

### 10. March and fanfare

- **Family / place / era:** military and ceremonial music; the concert march (Sousa) and the brass
  fanfare. **One line:** a square, strutting tune at walking pace, in major, over a bass on the
  strong beats, snare drum and brass (S299).
- **Recognise it by:** 4/4, 2/2 or 6/8 metre at about 120 beats per minute, the pace of soldiers
  in step (S299); a heavy downbeat bass alternating with off-beat chords, the **oom-pah** (S300);
  snare drum, brass and woodwinds (S299); sections called **strains**, with a modulation to the
  subdominant for the trio (S299); fanfare figures: short brass flourishes on the notes of the
  major triad (S223).
- **Today's controls:** Neutral; Collection Major; Harmonic motion Gentle diatonic; Note density
  Eighth; Rhythmic variety Slightly varied; Syncopation Straight; Silence density Sparse; Contour
  Rising; Leapiness Leaping; Arpeggio chaos Predictable; Register Middle or High; Tension Lift.
  Tempo 120 BPM sits inside today's range.
- **Tuning:** triad arpeggios and repeated notes favoured; dotted eighth–sixteenth pairs as a
  rhythm point (inference); chord points on I, IV, V.
- **Restriction:** major key (minor for a funeral march at about 60 BPM, S299); a closed cadence at
  the end of each strain; strains of 16 bars (inference: common practice, not in the sources read).
- **Manipulation:** a "dogfight" strain where high and low instruments alternate statement and
  response (S299), a natural call-and-response; trio modulation to IV (S299); a fanfare variant
  restricted to the notes a natural trumpet plays (root, third, fifth), with triplet pickups
  (inference).
- **Accompaniment (v4 roles):** oom-pah: [root bass](../arranging-and-roles.md#bass-roles-root-two-feel-walking-pedal)
  on beats 1 and 3, chord stabs on 2 and 4 (S300); snare and bass drum
  ([groove and drums](../arranging-and-roles.md#groove-and-drums)); a trombone or horn
  [counter-melody](../arranging-and-roles.md#counter-melody) in the trio (S130). Timbre: brass
  band.
- **Capabilities needed:** `drums`, `accompaniment-roles`, `closed-endings`, `phrase-length`,
  `modulation`, `rhythm-cells-timelines`, `compound-meter` (6/8 marches), `triplets-tuplets`,
  `call-and-response-form`, `timbre-presets`.
- **Fidelity:** today **hint** (the whole-beat backing already marches, but has no drums or
  off-beat chords). With capabilities **convincing**: march accompaniment is formulaic (inference).
  Lost: the band's swagger and the stepping crowd.

### 11. Waltz (and minuet)

- **Family / place / era:** the 19th-century Viennese dance (Strauss, Chopin's concert waltzes,
  Tchaikovsky); the minuet is its 17th–18th-century courtly ancestor in the same metre. **One
  line:** a lilting melody in three, one chord per bar, over "oom-pah-pah" (S301).
- **Recognise it by:** triple metre, written 3/4 (S301); one chord per bar with the root on beat 1
  and the upper notes on beats 2 and 3 (S301, S300); a melody of long notes on beat 1 and turning
  figures (inference); the minuet in binary form of two repeated eight-bar halves (S303).
- **Today's controls:** none close: the app is 4/4 only. Collection Major and Harmonic motion
  Gentle diatonic would set the colour.
- **Tuning:** dotted half and half-plus-quarter values favoured; appoggiaturas on beat 1; chord
  points on I and V7; tempo about 84–108 BPM (S301), the fast Viennese waltz about 180 (S302); both
  inside today's 60–240 range.
- **Restriction:** 3/4 metre; harmonic rhythm of one chord per bar; phrases of four and eight bars.
- **Manipulation:** a hemiola before the cadence for the minuet (S275); the period of the Classical
  entry applied to 3/4.
- **Accompaniment (v4 roles):** oom-pah-pah: bass on 1, chord on 2 and 3 (S301); strings or piano.
  Light percussion only.
- **Capabilities needed:** `triple-meter`, `accompaniment-roles`, `seventh-chords`,
  `closed-endings`, `phrase-length`, `timbre-presets`.
- **Fidelity:** today **none**. With capabilities **convincing**: the waltz is mostly metre plus
  accompaniment (inference). Lost: the Viennese lilt, where the second beat is played slightly
  early.

### 12. Chorale and hymn

- **Family / place / era:** the Lutheran chorale from the 16th century, Bach's four-part
  harmonisations, and the Protestant hymn tune. **One line:** a plain, singable tune in even notes,
  harmonised in four voices, chord after chord, with a pause at each line's end (S304).
- **Recognise it by:** homophonic four-part harmony for soprano, alto, tenor and bass (S304, S126);
  a fast harmonic rhythm, chords changing frequently (S305); stepwise melody in quarter notes;
  phrase ends marked by a hold (fermata) and a cadence; in minor, a major final chord, the
  **Picardy third** (S306).
- **Today's controls:** Neutral; Collection Major or Minor; Harmonic motion Active diatonic; Note
  density Quarter; Rhythmic variety Strict; Syncopation Straight; Silence density Conversational;
  Contour Arch; Leapiness Smooth; Arpeggio chaos Predictable; Register Middle; Tension Settled.
- **Tuning:** steps strongly favoured; passing eighths in the inner voices only; chord points on
  I, IV, V, vi, ii6.
- **Restriction:** quarter-note pulse, one chord per beat; no syncopation; closed cadences at line
  ends; the [voice-leading rules](../lexicon.md#voice-leading): no
  [parallel fifths or octaves](../lexicon.md#parallel-fifths-and-octaves) (S145), spacing limits
  (S146).
- **Manipulation:** a two-bar line ending on a fermata, so a four-bar phrase holds two lines
  (inference); a Picardy third on a minor-key final (S306); passing-tone and suspension decoration
  in the alto and tenor.
- **Accompaniment (v4 roles):** four-part block harmony, one chord per beat, voice-led: the
  [pad](../arranging-and-roles.md#pad-sustained-harmony) role with strict voice leading, and a
  bass that moves as a melody. Timbre: organ, choir, brass choir. No drums.
- **Capabilities needed:** `closed-endings`, `harmonic-minor`, `accompaniment-roles`,
  `articulation-dynamics` (fermata), `timbre-presets`, `NEW:four-part-voice-leading`,
  `NEW:suspensions-ties`,
  `NEW:chord-inversions`, `NEW:fast-harmonic-rhythm`, `NEW:cadential-leading-tone`.
- **Fidelity:** today **hint** (the whole-beat block backing is already homophonic, but chords
  change too slowly and stay in root position). With capabilities **convincing**: four-part
  harmonisation is a classic rule-based and machine-learning task (S143). Lost: the sung text and
  the congregation.

## Capability notes

**Most needed by this atlas** (entries out of twelve): `accompaniment-roles` (12),
`timbre-presets` (9), `closed-endings` (8), `articulation-dynamics` (6),
`motif-repetition-development` (5), then `NEW:suspensions-ties`, `NEW:chord-inversions` and
`phrase-length` (4 each). Closed endings stand out: eight of the twelve styles end
their phrases on the home chord at least at section ends, and today's generator never does
([lexicon: final](../lexicon.md#final)), by the deliberate choice D28. A style-scoped closed ending
(open for an antecedent, closed for a consequent) is the single biggest lift for this family
(inference).

**New capability ids** (definitions proposed here):

| Id                            | Definition                                                                                                                                                                                                                | Styles                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `NEW:unmeasured-rhythm`       | Notes grouped in twos and threes without a metre's strong and weak beats; written without regular bar accents (approximated on the 4/4 grid at first)                                                                     | Gregorian chant                                                            |
| `NEW:suspensions-ties`        | A prepared note tied over a strong beat, dissonant there, resolving down a step; embellishment [10](../embellishment-catalogue.md#10-suspension) and [11](../embellishment-catalogue.md#11-retardation), deferred by D233 | Renaissance, Baroque, Romantic, chorale                                    |
| `NEW:cadential-leading-tone`  | Raise degree 7 only in the cadence approach of a minor or modal collection (musica ficta, the harmonic-minor dominant), keeping the collection pure elsewhere; a style-scoped exception to D11                            | Renaissance, chorale (Baroque and Classical get it from `harmonic-minor`)  |
| `NEW:chord-inversions`        | Triads and sevenths with the third or fifth in the bass (first and second inversion), chosen for a smooth bass line                                                                                                       | Baroque, Classical, Romantic, chorale                                      |
| `NEW:fast-harmonic-rhythm`    | Up to one chord per beat, beyond today's two per bar                                                                                                                                                                      | Baroque, chorale (and Classical cadences)                                  |
| `NEW:four-part-voice-leading` | A four-voice accompaniment realised under voice-leading rules (no parallel fifths or octaves, spacing, common tones kept)                                                                                                 | Chorale (Renaissance lines and Romantic pads could reuse it)               |
| `NEW:chromatic-mediants`      | Progressions between triads a third apart outside the collection, sharing one common tone and the same quality (S282, S283)                                                                                               | Romantic, film (Impressionism could reuse it)                              |
| `NEW:wide-range`              | A melodic window wider than one octave, with a planned climax note                                                                                                                                                        | Romantic, film (and Baroque compound lines)                                |
| `NEW:quartal-chords`          | A chord vocabulary of stacked fourths, alongside or instead of triads (S296)                                                                                                                                              | Neoclassical/modernist (Impressionism and the Modal preset could reuse it) |
| `NEW:process-music`           | A deterministic, gradual transformation of one stored cell across successive phrases: add or remove a note, rotate by one (phase step)                                                                                    | Minimalism                                                                 |

Two clashes with today's rules (inference): **planing** (Impressionism) and **organum** (chant)
are made of the parallel fifths and octaves that the
[voice-leading minimum rules](../arranging-and-roles.md#voice-leading-minimum-rules) forbid, so a
style must be able to switch that rule off; and **closed endings** and **raised leading tones**
reverse two v1 decisions (D28, D11), which a style pack can do only as a scoped, versioned
capability ([generation breadth review](../generation-breadth-review.md#recommendation-inference)).

## Open questions

1. **Closed endings by style.** Should a style pack turn on closed endings per phrase position (a
   period's consequent, a strain's last phrase), or per style everywhere? D28 chose open endings to
   invite continuing.
2. **Periods across two generated phrases.** Could the opt-in four-phrase cycle (D99) carry an
   antecedent–consequent pair, so an eight-bar period appears without a longer phrase?
3. **The raised leading tone.** D11 cut it ("never gain a raised leading tone"). Is a
   style-scoped `NEW:cadential-leading-tone` acceptable, or should it wait for full
   `harmonic-minor`?
4. **Triple metre first?** Waltz, minuet, sarabande and courante all need it; is it the first
   metre to build after 4/4?
5. **Chant without bars.** Is an unbarred, unmeasured line compatible with the acknowledgement
   windows, or is "even quarters, no accents" the honest limit?
6. **Independent voices.** Imitation and counterpoint put a second melody next to the player's.
   Is that readable for P1 at speed, and must the player ever play it?
7. **Repetition versus reading.** Minimalism (and the leitmotif) repeat material on purpose; how
   does that sit with D59's unmemorisable material for P2?
8. **Expressive time.** Romantic rubato and the Viennese early second beat cannot be asked of a
   player on a timed grid; leave them as stated losses?

## Lexicon candidates

Merged into the [lexicon](../lexicon.md) on 2026-10-11, together with the candidates of the other
style atlas files: [Gregorian chant](../lexicon.md#gregorian-chant), [Melisma](../lexicon.md#melisma), [Reciting tone](../lexicon.md#reciting-tone), [Organum](../lexicon.md#organum), [Basso continuo](../lexicon.md#basso-continuo), [Fortspinnung](../lexicon.md#fortspinnung), [Hemiola](../lexicon.md#hemiola), [Alberti bass](../lexicon.md#alberti-bass), [Period](../lexicon.md#period), [Sentence](../lexicon.md#sentence), [Galant schema](../lexicon.md#galant-schema), [Modal mixture](../lexicon.md#modal-mixture), [Chromatic mediant](../lexicon.md#chromatic-mediant), [Planing](../lexicon.md#planing), [Whole-tone scale](../lexicon.md#whole-tone-scale), [Octatonic scale](../lexicon.md#octatonic-scale), [Quartal harmony](../lexicon.md#quartal-harmony), [Phasing](../lexicon.md#phasing), [Additive process](../lexicon.md#additive-process), [Oom-pah](../lexicon.md#oom-pah), [Strain](../lexicon.md#strain), [Chorale](../lexicon.md#chorale), [Picardy third](../lexicon.md#picardy-third), [Fermata](../lexicon.md#fermata), [Chord inversion](../lexicon.md#chord-inversion), [Waltz](../lexicon.md#waltz) and [March](../lexicon.md#march). Counterpoint stays an alias of [Polyphony](../lexicon.md#polyphony) and ostinato of [Riff](../lexicon.md#riff); the point of imitation is covered by [Imitation](../lexicon.md#imitation). Pandiatonicism is explained only in this document.

## Sources

This document's sources are registered in [research sources](../research-sources.md), in the block
[Style Atlas: Western Art Music](../research-sources.md#style-atlas-western-art-music) (merged on 2026-10-11).
They are reference only: no text is copied or closely paraphrased. Open Music Theory pages are cited through the LibreTexts mirror of the second edition (CC BY-SA). All URLs resolved on 2026-10-11.

- New for this document: S267–S306.
- Already in the register and cited above: S3 (cadences), S6 (appoggiaturas), S43 (sentence), S45 (phrase archetypes, period), S48 (twelve-tone basics), S70 (chant mode profiles), S109 (Fortspinnung), S110 (sequence), S111 (ornaments), S115 (minimal music), S126 (homophony), S130 (countermelody), S132 (walking bass), S143 (Coconet, Bach chorales), S145 (objectionable parallels), S146 (spacing), S155 and S206 (leitmotif), S157 (_Star Wars_ themes), S209 (major tritone progression), S219 (Lydian and wonder) and S223 (fanfare).
