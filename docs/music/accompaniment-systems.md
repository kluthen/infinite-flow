# Accompaniment Systems and Adaptive Music

Status: research (2026-10-11), groundwork for v4 accompaniment with roles and the endgame; not
settled policy.

## Purpose

v4 adds **side instruments with roles** that _highlight_, _contrast with_ and _respond to_ the
player's line ([v4 README](../../specs/versions/v4/README.md)). The
[endgame](../../specs/vision/endgame.md) goes further: companions and antagonists are system
voices, characters, locations and events are restrictive presets, and fights are call-and-response
exchanges of short phrases. This document prepares the v4 spec session on both. It asks:

1. What existing accompaniment and arranging software does, and how far each approach suits a
   browser app that is **deterministic** (the same seed always gives the same music), **seeded**,
   **rule-based** and has **no server**.
2. Which families of techniques can generate an accompaniment voice, and what each costs.
3. How a system voice can **react to a live player**, and what is cheap and robust.
4. What game music already does to adapt to teams, actions, places and enemies.
5. How several voices can be shown on a score to a player who is sight-reading.

Nothing here is decided. Conventions, as in the other research notes:

- A statement about the outside world cites a source id (**S** and a number) from
  [research sources](research-sources.md); the ids this document uses are listed under
  [Sources](#sources).
- A statement about the project cites a repository path.
- The author's own reasoning is marked **(inference)**. It is a proposal for discussion, not a
  finding.

### Terms used here

The owner is learning music theory, so the main terms are defined once here. The
[lexicon](lexicon.md) already has `call-and-response`, `chord-symbol`, `cue`, `leitmotif`, `riff`,
`trading-fours` and `vamp`; the terms below were added to it on 2026-10-11 (see
[lexicon candidates](#lexicon-candidates)).

- **Voice** (also **part**): one line of music played by one instrument or singer, such as the
  melody, the bass line or a second melody. In this document a **system voice** is a voice the app
  plays, as opposed to the player's line.
- **Accompaniment** (or **backing**): the voices that support a main melody. v2's bass and block
  chords are an accompaniment.
- **Role**: what a voice does for the music: lead, foundation (bass and chords), highlighting,
  contrasting, responding. A role is a job, not an instrument: a saxophone can comp and a piano
  can lead.
- **Texture**: how the voices fit together at a moment: how many there are, how busy, in which
  registers (how high or low).
- **Voicing**: which exact notes, in which octave and order, are used to play a chord.
- **Voice leading**: how each voice moves from one chord to the next (by small steps, by leaps,
  holding a common note).
- **Comping**: the chords, rhythms and short counter-lines a rhythm section plays to support a
  soloist (S131).
- **Counter-melody**: a second, less prominent melody played at the same time as the lead
  melody (S130).
- **Fill**: a short passage played in a gap between the melody's phrases (S137).
- **Stinger** (or **sting**): a short musical punctuation, laid over the current music when
  something happens (S181, S161).

## How this was gathered

- **Repository.** Read the [v4 README](../../specs/versions/v4/README.md), the
  [endgame](../../specs/vision/endgame.md), [this folder's README](README.md), the
  [generator architecture](../../specs/generator-architecture.md) (planner stages, the optional
  backing arranger, O10), `src/domain/backing/backing-renderer.ts`, `src/audio/audio-ports.ts`,
  the [personas](../../specs/personas.md), the
  [v2 master spec](../../specs/versions/v2/master-spec.md) (look-ahead phrases),
  [played-pattern recognition](played-pattern-recognition.md) and its sources S93–S96, and the
  VexFlow 5.0.0 type declarations installed in the main checkout
  (`node_modules/vexflow/build/types/src/`).
- **Outside sources,** read on 2026-10-11: PG Music's Band-in-a-Box manual, iReal Pro's help, the
  primary papers for Impro-Visor's active trading (S166), the Continuator (S93, full text), GenJam
  (S95, full text), Music Plus One (S169), MySong (S174, full text) and Chemillier on Steedman's
  grammar (S176); Magenta's pages and its published model files (S143, S170–S173); the iMUSE patent (S180);
  developer interviews and GDC session pages for game audio; Wikipedia for game mechanics and
  notation conventions.
- **Could not be read:** Audiokinetic's Wwise help pages and FMOD's manual refuse automated
  readers, so Wwise rests on Audiokinetic's own tutorial page (S181) and Wikipedia (S159), and FMOD
  is mentioned only in passing. The GDC Vault pages give abstracts only; the talks are behind a
  login.
- **Not done:** no code was run, no listening test was made, no library was tried in the app. The
  model sizes in S171 are the author's arithmetic from Magenta's published weight manifests.

## 1. Where the app is today

- **v2's backing is rendered from the harmony alone.** `renderBacking` in
  `src/domain/backing/backing-renderer.ts` is pure arithmetic: it reads the phrase's harmony
  events, draws no random number and never looks at the melody. The bass plays the chord's root,
  then its fifth on beat 3 when one chord fills a whole measure; the chords are close-position
  triads (three notes stacked as tightly as possible) with their top note at or below E4; both
  attack at every chord change and every downbeat.
- **The voice list is a seam already.** `BackingVoice` in `src/audio/audio-ports.ts` is
  `'bass' | 'chord'`, kept narrow on purpose so v4 can widen it
  ([v4 README](../../specs/versions/v4/README.md)).
- **The architecture already names the stage.** The generator architecture lists an optional
  **backing arranger** that "derives BPM-aligned accompaniment events from the harmony and rhythm
  plans" and "must not be required to create the note proposal"
  ([generator architecture](../../specs/generator-architecture.md)). O10 leaves open how far a
  later stage may revise an earlier one.
- **v4 plans a software sound library** (Tone.js or similar) for distinct timbres and drums,
  dynamic-imported, with the app's own look-ahead scheduler as the only clock and no samples
  ([v4 README](../../specs/versions/v4/README.md)).
- **The staff already reads like a lead sheet.** The app shows one treble-clef staff with chord
  symbols for the harmony ([lexicon](lexicon.md), `staff` and `chord-symbol` entries).
- **Phrases are generated ahead.** During a v2 session the next ("look-ahead") phrase is generated
  and laid out before it sounds, and it can already be partly on screen
  ([v2 master spec](../../specs/versions/v2/master-spec.md)). This matters for any voice that
  must answer what the player _played_ (section 4).

## 2. Prior art

### Comparison

"Fit" is the author's judgment for a browser app that must be deterministic, seeded and
rule-based, with no server. **(inference)** for that column only.

| System                                                       | Approach                                                                                                          | Voices or roles produced                                    | Real time?                                        | Reacts to a live player?                                                       | Fit **(inference)**                                                        |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Band-in-a-Box, MIDI styles (S162)                            | Style templates: short patterns recorded over C7, weighted random choice, transposed and fitted to each chord     | Drums, bass, piano, guitar, strings; A/B sub-styles; fills  | Renders ahead, plays back                         | No                                                                             | **High** for the pattern idea; seed the choice instead of random           |
| Band-in-a-Box, RealTracks (S163)                             | Recorded audio performances that follow the chords                                                                | Same instruments, as audio                                  | Renders ahead                                     | No                                                                             | None: audio assets, banned by `verify:boundaries`                          |
| iReal Pro (S164)                                             | Fixed styles from recorded performances; pattern sets chosen by tempo and by chorus; fills at section ends        | Piano, bass, drums                                          | Plays back                                        | No                                                                             | Ideas only (fills at boundaries, sets per section)                         |
| Impro-Visor (S165, S166)                                     | Style patterns for accompaniment; probabilistic grammar for solos; "active trading" transforms the player's input | Piano, bass, drums; a soloist that trades with the user     | Near real time                                    | Yes, at trade boundaries                                                       | **High** for trading modes (repeat and rectify, modify and rectify)        |
| GenJam (S58, S95)                                            | Genetic algorithm builds a population of measures; in performance, fixed "musically meaningful" mutations         | A trumpet-like soloist                                      | Yes                                               | Yes: trades fours, mutating the human's four in its last 30 ms                 | **High** for the mutation idea; the genetic training is not needed         |
| Continuator (S57, S93, S94)                                  | Variable-order Markov model learnt live from the player, biased by a fitness to external input                    | A continuation in the player's style; an accompaniment mode | Yes (about 30 ms to answer)                       | Yes: answers after about 400 ms of silence                                     | Medium: learns online; deterministic only if seeded and the corpus is kept |
| OMax and Somax2 (S167, S168)                                 | Factor oracle / n-gram navigation of a corpus (MIDI or audio), steered by listening                               | Several improvising agents                                  | Yes                                               | Yes, continuously ("agreement, discord or independence")                       | Low: corpus-driven, Max/Python, hard to explain                            |
| Music Plus One, score following (S169, S96)                  | Hidden Markov model tracks where the soloist is in a known score; a belief network predicts timing                | A pre-recorded orchestra, time-stretched                    | Yes                                               | Yes: follows the soloist's tempo and learns their interpretation in rehearsals | Low: the app's clock is the authority; the score is generated, not fixed   |
| Magenta: Coconet (S143)                                      | Neural network fills in missing notes of four-voice chorales                                                      | Three voices under a melody (Bach chorale style)            | Seconds, in the browser (TensorFlow.js)           | No                                                                             | Low: style-bound, not seedable to the bit, ML runtime in the bundle        |
| Magenta: MusicVAE, Performance RNN, Piano Genie (S170, S171) | Neural sequence models                                                                                            | Melodies, drum and bass loops, expressive piano             | Some in the browser                               | Piano Genie maps 8 buttons to 88 keys live                                     | Low: tens of MB of weights, not explainable                                |
| A.I. Duet (S172)                                             | Neural continuation on a server                                                                                   | A piano answer                                              | Near real time                                    | Yes: answers what you play                                                     | None as built (needs a server); the interaction is a useful precedent      |
| Magenta RealTime, Lyria RealTime (S173)                      | 800-million-parameter transformer streaming audio in 2-second chunks                                              | Whole mixed audio                                           | Yes, on a TPU or an API                           | Steered by text or audio prompts, not by notes                                 | None: audio out, server or TPU, no symbolic voices                         |
| MySong / Songsmith (S174)                                    | Hidden Markov model picks one chord per measure for a sung melody; "happy" and "jazz" sliders bias it             | Chords; a simple piano pattern, or Band-in-a-Box for a band | Chord choice under 5 ms after a 2–3 s analysis    | No (works on a recorded melody)                                                | Medium: a beginner-friendly control model                                  |
| Hookpad and Aria (S175)                                      | Chord suggestions ranked by popularity in a song database; Aria is a fine-tuned transformer                       | Chords, melody, harmony                                     | Editing tool                                      | No                                                                             | Ideas only (a ranked palette)                                              |
| Steedman's grammar (S176)                                    | Rewrite rules that derive jazz blues progressions by chord substitution                                           | Chord sequences                                             | Chemillier: can be made incremental for real time | No                                                                             | Medium, for harmony, not for voices                                        |
| Cope's EMI (S177)                                            | Analyses a composer's works, finds "signatures", recombines fragments                                             | Whole pieces in a style                                     | Offline                                           | No                                                                             | Low; "signature" echoes the endgame's character gimmick                    |
| Pachet and Roy, constraints (S178, S179)                     | Harmonisation as constraint satisfaction; Markov generation with constraints                                      | Four-voice harmonisations; controlled sequences             | Search; slower than greedy generation             | Indirectly                                                                     | Medium: deterministic, but search cost and explainability vary             |

### Notes per system

- **Band-in-a-Box** (PG Music). A style is a set of short patterns per instrument, recorded "based
  on a C7 chord" and transposed to the chord being played (S162). There are rows for 8-, 4-, 2- and
  1-beat patterns, for an A and a B sub-style (verse and chorus feel), and for drum fills. Each
  pattern has a weight from 1 to 8 setting how often it is chosen, and masks restricting it to
  some bars, chord types, or chords a given interval before the next one (S162). PG Music calls the
  program "a random pattern player as opposed to a Multi Track MIDI recorder": patterns are chosen
  at random on each replay (S162). Notes are fitted to the chord by a "voice leading" setting (the
  simplest is "transpose only"; a "riff based" mode keeps a melodic riff's shape), and the bass
  can be limited to scale tones (S162). **RealTracks** replace the MIDI patterns with recorded audio
  that follows the chords (S163). Band-in-a-Box is the clearest example of the _style template_
  family (section 3).
- **iReal Pro.** Fifty built-in styles (90 with packs) decide "what the piano, bass, and drums
  play behind your chords" (S164). The styles "are recorded performances, not patterns you can
  edit". Three details are useful here: a fill is played into a double or final bar line, "most
  times rather than every time, which is what keeps a long form from sounding mechanical"; many
  styles keep a second set of patterns for the first and last chorus; and the four swing styles are
  one style whose pattern set is chosen by tempo (S164).
- **Impro-Visor** (Keller, Harvey Mudd College; open source). It builds piano, bass and drum
  accompaniment from a lead sheet's chords with user-definable style patterns, and generates solos
  from a user-modifiable probabilistic grammar (S165). Its older trading "does not react to what the
  soloist is playing" (S165). **Active trading** (2016) does: the user plays a number of bars on a
  MIDI keyboard, and the program answers in one of several modes (S166):
  - _repeat and rectify_: play the user's line back after "rectification", which moves each note
    that is not a chord tone or colour tone to the nearest one, so the answer "will sound 'inside'
    the chord progression";
  - _modify and rectify_: apply inversion, reversal or time stretching, then rectify, for "modest,
    but recognizable uses of the melody";
  - _abstract melody_: keep the rhythm and the note categories (chord tone, colour tone) and the
    contour, then re-instantiate them over the chords;
  - _transform_: apply transformations learnt from a famous solo;
  - _grammar solo_: ignore the input and generate a fresh phrase.

  Controls are who starts, the length of a trade in bars, and looping (S166). The paper also
  separates a **companion** (answers that reflect the user's line) from a **tutor** (answers more
  complex or simpler than the user's), a distinction worth keeping for the endgame.

- **GenJam** (Biles). A genetic algorithm (a search that breeds and selects candidate measures)
  trains GenJam's vocabulary offline with a human mentor; in performance it trades fours with a
  trumpeter (S95). It listens to the human's four bars through a pitch-to-MIDI converter, keeps
  only the last note-on per eighth-note slot to survive noisy input, and "in the last 30
  milliseconds of the human's four" mutates them by reverse, rotate, invert or transpose (on
  measures) and reverse, rotate, repeat or "sequence phrase" (on the four bars) before playing
  them back (S95).
- **The Continuator** (Pachet). It learns the player's style live as variable-order Markov chains
  (it predicts the next note from as many previous notes as have been seen together before)
  (S93). It answers when the player has been silent for a threshold, about 400 ms in the children
  study (S94), within a 50 ms real-time budget: about 20 ms to detect the end and 20 ms to compute
  (S93). It can also be "attached" to outside input: instead of choosing the next note purely by
  its learnt probability, it weights candidates by a **fitness** to the context, for example
  preferring notes that are in the last 8 notes the pianist played, so it "follows" the harmony
  without being told the chords (S93). In that mode it can play an accompaniment in a fixed tempo
  that balances "stylistic consistency" and "consistency with the external input" (S93).
- **OMax and Somax2** (IRCAM). OMax builds a factor oracle (an automaton for finding repeated
  fragments) over what it hears and improvises by jumping between similar contexts (S167). Somax2
  is trained on a corpus of MIDI files, listens to musicians in real time, and runs several
  interacting agents whose relation to the humans shifts between "agreement, discord or
  independence" (S168). It is written in Max and Python (S168).
- **Score following and Music Plus One.** Score following tracks where a live player is in a
  known score so that an accompaniment can follow (S96). Raphael's Music Plus One has three
  modules: _Listen_, a hidden Markov model that tracks the soloist's progress; _Predict_, a belief
  network of note timings trained in rehearsals; and _Synthesize_, which time-stretches a real
  orchestral recording with a phase vocoder to stay with the soloist (S169).
- **Magenta** (Google). Coconet fills in missing notes of Bach chorales and harmonised 55 million
  user melodies in the browser for the 2019 Bach Doodle (S143). MusicVAE, Performance RNN and Piano
  Genie generate melodies, expressive performances and a live 8-button piano (S170). In the
  browser, `@magenta/music` loads weights at run time: MusicVAE's small 4-bar melody model has
  about 11.8 million parameters (about 24 MB as stored), the 2-bar model about 4.4 million (about
  18 MB), and Coconet about 0.55 million (about 0.6 MB) (S171; author's arithmetic). A.I. Duet
  answers what you play, but its front end sends a MIDI file to a Python server that runs the
  model (S172). Magenta RealTime streams **audio**, not notes: an 800-million-parameter model that
  produces 2-second chunks on a free Colab TPU, steered by text or audio prompts (S173).
- **MySong / Songsmith** (Microsoft Research). A hidden Markov model with one node per measure
  chooses chords for a sung melody, trained on 298 lead sheets (S174). Two sliders are exposed to
  non-musicians: a "happy factor" (major-like or minor-like) and a "jazz factor" (traditional or
  adventurous). Re-choosing chords takes under 5 ms, so the sliders feel instant (S174). Thirteen
  users without music training made accompaniments quickly (S174). The accompaniment itself is a
  simple piano pattern, or Band-in-a-Box for a full band (S174).
- **Hookpad** ranks chord suggestions by how often they are used in real songs, updated as the
  cursor moves; **Aria** is a separate transformer model that proposes alternatives within a
  selection (S175).
- **Steedman's grammar** derives the family of jazz blues progressions from a simple one by
  substitution rules (S176). Chemillier showed how to generate with it incrementally, to make a
  real-time improvisation system "more reactive to the inputs of the user" (S176).
- **Cope's EMI** analyses a composer's works and generates new ones in that style; Cope looked
  for "signatures", recurring patterns that mark a style (S177).
- **Pachet and Roy** survey harmonisation as **constraint satisfaction** (stating rules as
  constraints and searching for notes that satisfy all of them) (S178), and later recast Markov
  generation as constraint satisfaction so a user's controls become extra constraints, "at the
  cost of" more computation than plain left-to-right generation (S179).

## 3. Technique families

Five families cover the systems above. The table rates them against this project's needs; the
ratings are **(inference)**, the descriptions are sourced.

### 3.1 Style templates with harmony fitting

**How it works.** A human writes short patterns for each instrument and role (a walking bass
figure, a comping rhythm, a drum groove, a fill). At play time the program picks one pattern per
slot and fits its notes to the current chord: transpose from the reference chord, then move notes
that clash (S162). Weights and masks steer the choice (S162). Sub-styles and pattern sets give
sections a different feel (S162, S164).

**Examples.** Band-in-a-Box MIDI styles (S162), Impro-Visor styles (S165), iReal Pro (S164), and, in
games, pre-composed segments chosen by a state (section 5).

**For this project (inference).**

- Determinism: replace Band-in-a-Box's random pick with a seeded weighted pick. Fully
  deterministic and cheap.
- Explainability: very high. "The bass plays pattern _walk-2_ because the chord lasts two beats."
- Latency and bundle size: negligible; patterns are small data.
- Testability: excellent; patterns are data, so tests check invariants per pattern and per chord.
- Weakness: a template ignores the melody. Band-in-a-Box fits patterns to chords, not to the
  soloist (S162). Highlighting and contrasting need the lead line, so templates alone are not
  enough.

### 3.2 Rule-based generation with voice-leading constraints

**How it works.** A voice is built note by note (or beat by beat) from rules: which chord tones
are allowed on strong beats, how far a voice may move, which registers it may use, what it must
avoid against other voices. The rules of traditional voice leading are not arbitrary: Huron
derives most of them from six perceptual principles, among them pitch proximity (a voice that
moves by small steps is heard as one line), tonal fusion (two voices an octave or a fifth apart
blend into one sound) and avoiding masking between voices (S148).

**Examples.** The app's own pitch planner is this family. v2's backing renderer is its simplest
case.

**For this project (inference).**

- Determinism, latency, bundle size: as good as templates.
- Explainability: high, if each rule has a plain name ("the second voice moves when you hold").
- Testability: good; rules are invariants.
- Strength: it can read the lead line, so it is the natural home for **highlighting** and
  **contrasting** (section 4.1).
- Huron's principles give a useful switch: a **contrasting** voice should obey them (stay
  perceptually separate), while a **highlighting** voice may break one on purpose, doubling the
  lead an octave below so that the two fuse (S148).

### 3.3 Constraint satisfaction

**How it works.** State the whole voice as variables and constraints, then search for a solution
(S178). It handles "global" requirements that note-by-note rules miss, but proper structuring of
the problem matters for speed (S178), and constraints such as meter are hard to enforce on Markov
sequences (S179).

**For this project (inference).** The app's pitch planner already searches under a budget (the v2
master spec's search allowance). A full constraint solver per voice is more power than v4 needs,
and its failures are hard to explain to a beginner. A small, bounded search (try the few
candidate notes per beat, keep the first that passes) is the useful part.

### 3.4 Markov models and corpus recombination

**How it works.** Learn which note or chord follows which from a corpus (or from the player), then
generate by walking those probabilities (S93, S167, S174). Variants: variable-order Markov chains
(the Continuator), factor oracles (OMax), hidden Markov models (MySong, score following), and
fragment recombination (EMI).

**For this project (inference).**

- Determinism: fine with a seeded generator and a frozen table.
- Explainability: medium: "it plays what usually comes next in this style" is honest but vague.
- Learning online from the player (the Continuator) makes the output depend on everything played
  before, which complicates replay keys and tests.
- Where it fits: a small, **build-time** table (for example, which comping pattern tends to follow
  which) baked as data. MySong's sliders (S174) show how such a table can be steered by beginner
  controls.

### 3.5 Neural models

**How it works.** Train a network on a large corpus; sample from it (S143, S170–S173).

**For this project (inference).** Not a fit for v4:

- weights of 0.6 MB to tens of MB plus the TensorFlow.js runtime (S171), against a bundle the
  project measures closely;
- bit-exact determinism across browsers and GPUs is not guaranteed by these runtimes, so a seed
  may not replay;
- no explanation for a beginner;
- the live models stream audio and need a TPU or an API (S173), against the no-server and
  no-audio-asset rules.

Neural models remain useful as **inspiration** for interaction design (A.I. Duet's answer, Piano
Genie's simplified input).

### Summary

| Family                               | Deterministic and seeded | Explainable to a beginner | Latency     | Bundle | Testable | Reads the lead line     |
| ------------------------------------ | ------------------------ | ------------------------- | ----------- | ------ | -------- | ----------------------- |
| Style templates with harmony fitting | Yes                      | Very                      | Negligible  | Tiny   | Very     | No (chords only)        |
| Rules with voice-leading constraints | Yes                      | Yes                       | Negligible  | Tiny   | Very     | Yes                     |
| Constraint satisfaction              | Yes                      | Partly                    | Bounded     | Small  | Yes      | Yes                     |
| Markov, corpus recombination         | If seeded and frozen     | Partly                    | Low         | Small  | Partly   | Optional (fitness, S93) |
| Neural models                        | Not guaranteed           | No                        | Medium–high | Large  | Hard     | Some                    |

All ratings in this table are **(inference)**.

## 4. Roles, and reacting to the player

### 4.1 What the three roles mean in musicians' practice

The owner's three roles map onto ordinary band practice. Each needs different input.

| Role                      | What players do                                                                                                      | Input needed                                  | Source               |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | -------------------- |
| **Foundation** (v2 today) | Bass and chords state the harmony                                                                                    | Harmony only                                  | backing renderer     |
| **Highlighting**          | Double the melody's important notes (in octaves, or a third or sixth below), punctuate its accents with chord "hits" | The lead line (planned)                       | S148, S131           |
| **Contrasting**           | A counter-melody: a distinct, less prominent line at the same time as the lead                                       | The lead line (planned)                       | S130, S148           |
| **Responding**            | Comping "in the space left by the soloist", fills in the gaps between phrases, echoes and answers                    | The lead's rests (planned) or what was played | S131, S137, S80, S81 |

Comping is the closest real-world description of a responding accompanist: compers adapt to the
soloist, and with a sparse soloist "try to play mainly in the space left by the soloist", filling
"empty spaces" with countermelodies (S131). A fill sits in "a section where nothing else is
happening" and often marks the end of a phrase (S137).

**The key distinction (inference):** most of the "highlighting", "contrasting" and even
"responding" can be computed from the **generated** phrase, which the app knows completely before
it sounds. Only a voice that answers what the player **actually played** needs live input. The
first kind is free of latency and fully deterministic; the second is the hard part.

### 4.2 What the systems do with a live player

| System                      | Turn structure                                       | What the answer is made of                                                                       | Timing                                                | Source   |
| --------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------- | -------- |
| GenJam                      | Fixed: trading fours                                 | The human's four bars, mutated (reverse, rotate, invert, transpose)                              | Computed in the last 30 ms of the human's turn        | S95      |
| Impro-Visor, active trading | Fixed: a set number of bars; who starts is a setting | The user's line repeated, modified, abstracted or transformed, then "rectified" onto chord tones | At each trade boundary                                | S166     |
| Continuator                 | Free: the system answers after a silence             | A Markov continuation in the player's style; the player has priority                             | About 400 ms silence threshold; about 30 ms to answer | S93, S94 |
| Somax2                      | Continuous                                           | Corpus fragments chosen by what it hears                                                         | Continuous                                            | S168     |
| A.I. Duet                   | Free                                                 | A neural continuation                                                                            | Round trip to a server                                | S172     |
| Music Plus One              | Continuous, score known                              | A fixed recording, time-stretched to the player                                                  | Follows tempo note by note                            | S169     |
| _Patapon_                   | Fixed: one drum command per measure                  | The Patapons sing the command back and act                                                       | On the beat; off-beat input loses the combo           | S88      |
| _PaRappa the Rapper_        | Fixed: teacher's line, then yours                    | Rating of your answer                                                                            | Per line                                              | S90      |

### 4.3 What is cheap and robust here (inference)

1. **Fill the planned rests.** A responding voice plays only where the generated lead rests or
   holds a long note. The rests are known before the phrase sounds, so this costs nothing at run
   time and is fully deterministic. It is exactly the comper's "space left by the soloist" (S131).
2. **Echo the planned motif.** In a rest, the responding voice imitates the lead's last figure,
   transposed or varied with the [mutation catalogue](mutation-catalogue.md)'s small changes. Same
   cost and determinism as 1.
3. **Answer the played phrase at a fixed boundary.** For true call and response, follow GenJam and
   Impro-Visor: a fixed turn length (one phrase, or two bars), and an answer computed at the
   boundary from the played notes. Their transformations are cheap: quantise the played notes
   (GenJam's one-note-per-slot filter, S95), then apply a mutation and **rectify** onto the next
   chord's tones (S166). The Continuator shows such an answer can be computed in about 20 ms (S93).
4. **Keep the answer outside the look-ahead phrase.** The player's next phrase is already
   generated and partly on screen when they finish the current one
   ([v2 master spec](../../specs/versions/v2/master-spec.md)). So an answer to _played_ notes must
   be rendered by a fast, separate, pure step (like `renderBacking`), not by regenerating the lead
   phrase. It then sounds in the next phrase's rests, or in a turn where the player is silent.
5. **Make the answer replayable.** Seed the answer from the phrase seed plus a stable hash of the
   quantised played notes. Then the same input gives the same answer, and a replay key can carry
   the played notes (today's `ifk1.` replay key encodes only a phrase's generation input).
6. **Do not follow tempo.** Score following (S96, S169) exists to make an accompaniment wait for a
   soloist. Here the app's scheduler is the only clock (v4 constraint 1), and the player follows
   it. Tempo changes stay explicit (the rising-tempo control).
7. **Be careful with dynamics.** Following loudness is tempting (the Continuator can follow "the
   amplitude", S93), but the reference breath controller sends stray notes at velocity 127
   ([v3 README](../../specs/versions/v3/README.md)), so a velocity-driven voice would react to
   noise. A coarse, smoothed measure over a whole phrase is the most one could use.
8. **Give the player priority.** The Continuator stops and listens when the player plays during
   its answer (S94). A gentler version for a backing that never stops: a responding voice thins
   out (plays fewer notes) while the player is playing, and fills when they stop.

## 5. Adaptive and procedural game music

### 5.1 The vocabulary of adaptive music

- **Vertical layering** (vertical re-orchestration): "musical layers are added and removed in
  response to game events", usually faded in and out (S159). _Dead Space 2_ mixes four layers,
  each tied to a level of fear, by the player's distance from enemies (S159).
- **Horizontal re-sequencing**: switching between pieces "in a 'branching' sequence" in response
  to game events, typically for a change of location or the start of a fight (S159).
- **Transitions** between pieces: a crossfade; **phrase branching**, where "the change to the next
  segment starts when the current musical phrase has ended"; or a **bridge** composed to join the
  two (S159).
- **Stingers**: in Wwise, "brief musical phrases that are superimposed and mixed over the
  currently playing music", played when the game calls a trigger (S181). In broadcasting and film
  a sting punctuates a scene (S161).
- **Decision points, hooks and markers** (iMUSE, LucasArts, 1991; US patent 5,315,057). The
  composer marks places where the music may branch; the game sets values; at a decision point a
  _hook_ can jump to a transition passage, "turn an instrument part on or off", change an
  instrument or transpose a part, and a _marker_ runs commands the game queued, so that "actual
  changes occur at points in the sequence which are aesthetically correct" (S180). In _Monkey
  Island 2_, a theme is replayed with a different instrument each time Guybrush enters a building
  (S180).
- **State-driven containers.** Wwise selects music by game state ("switch containers") and
  manages the moves between them with transition rules (S181). FMOD Studio offers comparable
  transition markers and quantised transition regions; its manual could not be read for this
  note.
- **Procedural (generative) music**: generated live by algorithms instead of only pre-made pieces
  (S159). Examples follow.

### 5.2 Procedural music in games

| Game                             | What generates the music                                                                                          | What it reacts to                                                                 | Source |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------ |
| _Spore_ (2008)                   | A modified Pure Data inside the game; generative music by Kent Jolly, Aaron McLeran, Brian Eno and Peter Chilvers | Mostly the editors, where the player builds creatures and vehicles                | S182   |
| _No Man's Sky_ (2016)            | A procedural engine built by audio director Paul Weir from loops and fragments of 65daysofstatic's album          | Game state; Weir calls it "a glorified random file player" with behaviours on top | S183   |
| _Proteus_ (2013)                 | Each plant and creature "emit[s] unique musical signatures"                                                       | Where the player walks and the season; nearing objects layers in more notes       | S184   |
| _Ape Out_ (2019)                 | A procedural jazz drummer by Maxi Boch, built from thousands of recorded drum sounds                              | Number of enemies, kills (each kill a cymbal crash), the player's speed           | S185   |
| _Rise of the Tomb Raider_ (2015) | Real-time procedural percussion for stealth combat that "never loops"                                             | Game action                                                                       | S186   |

### 5.3 Rhythm games

| Game                        | Is the music fixed?                                                       | How the player's actions meet the music                                                                                                        | Lesson for Infinite Flow **(inference)**                                                      | Source |
| --------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------ |
| _Theatrhythm Final Fantasy_ | Yes: original tracks                                                      | Tap, slide and hold triggers; in battle stages, timing deals damage; reviewers called the party a "visual aid" giving an "illusion of success" | The inspiration's music does not depend on the party. Infinite Flow can make the team audible | S92    |
| _Crypt of the NecroDancer_  | Composed tracks, ordered by rising tempo; custom music with beat tracking | Move or attack only on the beat; missing a beat "does not directly harm" the character; the accuracy window was widened and auto-calibrated    | Forgiving timing and a beat that sets the pace fit the never-penalise principle               | S188   |
| _Hi-Fi Rush_                | Composed and licensed tracks                                              | The world and enemies move to the beat; actions sync automatically; on-beat timing adds damage                                                 | Reward on-beat play without requiring it                                                      | S189   |
| _Rez_                       | Layered track                                                             | Each shot makes a sound quantised to the beat, "regardless of the player's imprecision", adding layers; mistakes become part of the music      | Snap system responses to the grid; absorb errors instead of punishing them                    | S187   |
| _Patapon_                   | Drum chant over a beat                                                    | Four-drum commands on the beat; the Patapons sing back; off-beat input loses the combo and fever                                               | A command played in rhythm, answered in rhythm, is a natural "skill" input                    | S88    |
| _Thumper_                   | Fixed soundtrack by Brian Gibson                                          | Hit lit notes on the track in time; each level has its own time signature                                                                      | Little to borrow                                                                              | S190   |
| _Sayonara Wild Hearts_      | A linear pop album, one song per level                                    | Button presses in time with the song                                                                                                           | Little to borrow                                                                              | S190   |
| _BPM: Bullets Per Minute_   | Fixed metal soundtrack                                                    | Shoot and reload on the beat; guns misfire off the beat                                                                                        | A penalty model the endgame should avoid (D66)                                                | S190   |

### 5.4 What a symbolic generator changes (inference)

Most games above layer or switch **recorded audio**. Infinite Flow generates **notes**, so each
technique becomes cheaper and finer:

- **Vertical layering** becomes adding or removing a **voice generator**, not fading a stem. A new
  voice can enter on any beat, already in the right key and chord.
- **Horizontal re-sequencing** becomes changing the **preset** at the next phrase boundary, which
  is the "phrase branching" transition (S159), and is how the settings-mutation flag (v2.1) applies
  a setting change ([v2 master spec](../../specs/versions/v2/master-spec.md)).
- **Stingers** become short generated figures, built over the current chord and quantised to the
  next beat or bar.
- **iMUSE's hooks** (turn a part on or off, transpose a part, change an instrument, S180) become
  per-voice parameters a game event can set, applied at a musically correct point.

## 6. Endgame mapping

The endgame's needs, the matching game-music technique, and a possible Infinite Flow form. The
"Infinite Flow form" column is **(inference)** throughout.

| Need           | Technique and precedent                                                                                                                                                          | Infinite Flow form **(inference)**                                                                                                                                                                                                                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Team**       | Vertical layering (S159); iMUSE parts on and off (S180); Proteus's objects adding notes as you near them (S184); leitmotif per character (S82)                                   | Each companion is one system voice with a role (foundation, highlight, contrast, respond) and a character preset (register, banned notes, ornaments, signature figure). Recruiting adds a voice at the next bar or phrase, entering with its signature figure; removing one lets it finish its figure and drop out.        |
| **Actions**    | Stingers on a trigger (S181); iMUSE jump hooks to a transition passage (S180); Rez's quantised shots (S187); Patapon's commands sung back (S88)                                  | A skill choice triggers one of: a fill or stinger in a companion's voice, quantised to the next beat or bar; a motif transformation of the next phrase (from the [mutation catalogue](mutation-catalogue.md)); or a role change (a companion switches from contrast to highlight for a phrase).                            |
| **Locations**  | Horizontal re-sequencing (S159); Wwise state switches (S181); No Man's Sky and Proteus music shaped by place (S183, S184)                                                        | A location preset sets texture (how many voices, how busy), instrumentation (which synths), tone (mode or collection, register) and tempo. Changes apply at a phrase boundary, like a phrase-branching transition. Events (D228) are short-lived presets on top.                                                           |
| **Antagonist** | Trading fours (S81) and active trading (S166); Somax2's "agreement, discord or independence" (S168); iMUSE jumps to a fight transition (S180); Ape Out's reactive drummer (S185) | The antagonist is a contrasting voice with its own preset. In a fight it alternates with the player at a fixed turn length: its call is generated, the player's answer is played, and its reply transforms the player's answer (Impro-Visor's modify-and-rectify, S166). "Interrupting" is a stinger at the next bar line. |

Three cautions **(inference)**:

- **Never penalise (D66).** The rhythm games show both options: NecroDancer (missing a beat
  "does not directly harm", S188), Rez (mistakes absorbed into the music, S187) and Hi-Fi Rush
  (on-beat play rewarded, not required, S189) fit the principle; BPM (guns misfire, S190) and
  Theatrhythm's life gauge (S92) do not. The open win-or-lose tension in the
  [endgame](../../specs/vision/endgame.md) remains open.
- **Companion versus tutor.** Impro-Visor separates answers that mirror the player (a companion)
  from answers simpler or more complex than theirs (a tutor) (S166). Companions and antagonists in
  the endgame could use exactly this axis.
- **Recognition stays separate.** Telling a played answer from ordinary playing is the
  [played-pattern recognition](played-pattern-recognition.md) problem; this document assumes
  turns fixed by the form, which needs no recognition.

## 7. Showing several voices

### 7.1 How notation shows melody and accompaniment

- **One staff per instrument**, joined into a system, is the full-score convention. A **grand
  staff** (treble and bass staves joined by a brace) is the keyboard convention.
- **Several voices on one staff**: notation programs allow up to four voices per staff, told
  apart by stem direction (voices 1 and 3 up, 2 and 4 down) (S193).
- **Cue notes**: small notes copying another instrument's line in a player's part, "somewhat
  smaller than normal note size", given "as guidance only", typically to help an entrance after
  rests (S82). MusicXML marks them with a `<cue>` element: "a silent note with no playback"
  (S192).
- **Lead sheet**: the melody on one staff with chord symbols above; the accompanists improvise
  "an appropriate accompaniment based on the chord progression". Wikipedia notes that lead sheets
  "are not intended for novices" (S191).
- **Rhythm games** show each player only their own part; the other parts are heard (S91,
  **(inference)** from the games' design).

### 7.2 VexFlow 5 support (the app's pinned 5.0.0)

From VexFlow's FAQ and the 5.0.0 type declarations (S194):

- Several voices on one stave: create a `Voice` per line and call `Formatter.joinVoices` on the
  voices that share the stave, so simultaneous notes are spaced without colliding.
- Several staves aligned: call `format` with all the aligned voices; the formatter only sets x
  positions, and every voice must start at the same x.
- `System.addStave({ voices: [...] })` builds a multi-stave system, and `System.addConnector`
  draws `brace`, `bracket`, `singleLeft` and other connectors.
- `ChordSymbol` (already used by the engraver) and `GraceNote` (small notes) exist. No dedicated
  "cue size" option was found in the 5.0.0 `StaveNote` declarations; small cue notes would need a
  spike (perhaps scaling or grace-note styling).

**Fit with the current layout (inference).** The engraver draws one `Voice` per measure, and the
layout planner checks height and width before drawing; below `64rem` the phrase already splits
into two systems ([generator architecture](../../specs/generator-architecture.md)). A second
staff roughly doubles the height a system needs, so on a landscape phone it would likely not fit;
on a tablet or laptop it might. Any extra staff must go through the same fit checks, and the
`notation_no_room` outcome would become more frequent.

### 7.3 Should system voices be shown at all? (inference)

- **By default, no.** The player is sight-reading their own line under time pressure (persona P1
  "still struggle[s] to read quickly", [personas](../../specs/personas.md)). An extra staff takes
  attention and space, and rhythm games and play-along apps show only the player's part.
- **The chord symbols already show the foundation.** The staff is a lead sheet in all but name.
- **Show a system voice only when the player needs it to act.** Two candidates:
  - an antagonist's or companion's **call** in a trading exchange, drawn as cue-size notes in the
    player's own staff in the bars before their answer, as cue notes help an entrance (S82);
  - a small, non-notated **"who is playing" indicator** per voice (name and role), which serves
    the endgame's team view without any engraving.
- **Exports can carry everything.** The MIDI and MusicXML exports can hold one part per system
  voice; MusicXML's `<cue>` covers cue notes (S192).
- **Status effects** like blindness act on the display layer
  ([endgame](../../specs/vision/endgame.md)); the system voices still sound, which may help a
  "blind" player.

## 8. What fits Infinite Flow (inference)

This whole section is the author's recommendation for the spec session.

### 8.1 Recommended family: role-based rules over style templates

A **role-based arranger**: one pure, seeded stage after the pitch planner, as the architecture's
"backing arranger" already allows. It combines families 3.1 and 3.2:

1. **Templates for rhythm and gesture.** Each role has a small library of rhythm cells and
   figures (a comping rhythm, a walking-bass cell, a fill figure, a pad held through the bar),
   chosen by a **seeded** weighted pick with masks, like Band-in-a-Box's weights and masks (S162),
   but never random.
2. **Rules for pitch.** Each note is fitted by role-specific rules that read the harmony **and the
   planned lead line**:
   - _foundation_: today's `renderBacking`, unchanged;
   - _highlighting_: double the lead's metrical anchors and long notes an octave or a third or
     sixth below, and add chord "hits" on its accented attacks; fusion with the lead is the goal
     (S148);
   - _contrasting_: a counter-melody with complementary rhythm (it moves when the lead holds or
     rests, holds when the lead moves), in a separate register band, preferring contrary motion
     and avoiding the octaves and unisons that would fuse it with the lead (S148, S130);
   - _responding_: plays only in the lead's planned rests and long notes, with fills and echoes
     of the lead's last figure (S131, S137).
3. **The lead line is the authority.** The arranger never changes the player's phrase (which
   answers O10 for this stage). If a voice cannot fit a beat, it rests there; a rest is always a
   legal accompaniment.
4. **The live answer is a separate small step.** Call and response with played notes uses fixed
   turns and Impro-Visor-style "modify and rectify" or GenJam-style mutations, computed at the
   turn boundary and seeded from the phrase seed plus the quantised played notes (section 4.3).

### 8.2 Why

- **Determinism and replay:** everything is a function of (phrase, seed, preset, role), plus the
  played notes for the live answer. Replay keys and golden tests keep working.
- **Explainability:** every note has a one-line reason a beginner can read ("the second voice
  moves while you hold"), which suits the owner's learning goal and the lexicon's style.
- **Cost:** no runtime library beyond the planned sound library; patterns are data; computation is
  per beat and bounded.
- **Testability:** each role is a set of invariants (register band, chord tones on strong beats,
  silence where the role must be silent, no unison with the lead for a contrasting voice).
- **Growth to the endgame:** a companion is (role, preset, synth); a location is a preset over
  the set of voices; an action is a stinger or a role change; an antagonist is a contrasting
  voice that trades. Nothing in the endgame mapping needs a different engine.
- **What it gives up:** the stylistic richness of corpus and neural systems (the Continuator,
  Somax2, Coconet). A build-time Markov table of pattern successions is a possible later addition
  that keeps determinism.

### 8.3 Smallest useful first step

One extra voice, the **responding** role, filling the generated lead's rests with seeded fills
built from chord tones, in its own register band, with one new synth. It touches no lead-line
code, needs no live input and no new staff, and makes the "several voices" architecture real
(`BackingVoice` widened by one member).

## 9. Open questions for the v4 spec session

1. **Which roles ship first?** Responding (fills in rests) is the cheapest; highlighting and
   contrasting need the lead line; the live answer needs played input. Order?
2. **Are roles voices or settings?** Is "contrasting" a fixed instrument, or a role any companion
   voice can take, and can a voice change role between phrases?
3. **How many system voices at once,** and is the foundation (bass and chords) always present?
4. **Does the player choose roles,** or do presets (later: characters, locations) decide them?
5. **Live answer in v4 or later?** Does call and response with **played** notes belong to v4, to
   v3.2's Jam, or to the endgame?
6. **Turn length** for trading: one phrase (four measures), two bars, or a setting, as in
   Impro-Visor (S166)?
7. **Replay keys:** if an answer depends on played notes, must the replay key carry them?
8. **Display:** audio only by default? Cue notes for a call before the player answers? A "who is
   playing" indicator? Is a second staff ever shown, and on which screen sizes?
9. **Exports:** one MIDI track and one MusicXML part per system voice?
10. **Sound:** which synth per role (this joins the Tone.js spike and O57, the backing's voicing and
    timbre listening test)? Do roles need distinct registers to stay audible on a phone speaker?
11. **Dynamics:** should any voice react to the player's loudness, given the controller's stray
    velocity-127 notes?
12. **Does the arranger see the next phrase?** A fill at the end of a phrase sounds best when it
    leads into the next phrase's first chord; the look-ahead phrase makes that possible.
13. **Wording:** the lexicon already uses "cue" for the session cue row; "cue notes" in the
    notation sense would need care (see `cue` in the [lexicon](lexicon.md)).

## Lexicon candidates

Merged into the [lexicon](lexicon.md) on 2026-10-11: [Accompaniment](lexicon.md#accompaniment), [Voice](lexicon.md#voice), [System voice](lexicon.md#system-voice), [Accompaniment role](lexicon.md#accompaniment-role), [Texture](lexicon.md#texture), [Voicing](lexicon.md#voicing), [Voice leading](lexicon.md#voice-leading), [Comping](lexicon.md#comping), [Counter-melody](lexicon.md#counter-melody) (alias countermelody), [Fill](lexicon.md#fill), [Doubling](lexicon.md#doubling), [Stinger](lexicon.md#stinger), [Vertical layering](lexicon.md#vertical-layering) (which also explains horizontal re-sequencing), [Lead sheet](lexicon.md#lead-sheet), [Grand staff](lexicon.md#grand-staff). Score following and Impro-Visor's rectification are software techniques rather than musical terms, so they are explained only in this document.

## Sources

This document's sources are registered in [research sources](research-sources.md), in the block
[Accompaniment Systems and Adaptive Music (v4)](research-sources.md#accompaniment-systems-and-adaptive-music-v4)
(merged on 2026-10-11). They are reference only: no text is copied or closely paraphrased.

- New for this document: S162–S194.
- Shared with [arranging and accompaniment roles](arranging-and-roles.md) and registered in
  [its block](research-sources.md#arranging-and-accompaniment-roles-v4): S130 (countermelody), S131
  (comping), S137 (fill), S143 (Coconet), S148 (Huron, _Tone and Voice_), S159 (adaptive music) and
  S161 (sting).
- Already in the register: S57, S58, S93, S94 (the Continuator and GenJam), S80 (call and response),
  S81 (trading fours), S82 (motif, leitmotif and cue notes), S88 (_Patapon_), S90 (_PaRappa the
  Rapper_), S91 (_Rock Band_ and _Guitar Hero_), S92 (_Theatrhythm Final Fantasy_), S95 (GenJam
  trading fours) and S96 (score following).
