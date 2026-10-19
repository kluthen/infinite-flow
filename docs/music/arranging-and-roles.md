# Arranging and Accompaniment Roles

Status: research (2026-10-11), groundwork for v4 accompaniment with roles; not settled policy.

## Purpose

v4 adds **accompaniment with roles**: side instruments that, in the owner's words, **highlight,
contrast and respond to** the player's line, going beyond v2's bass and block chords
([v4 README](../../specs/versions/v4/README.md)). It is also the first step toward the
[endgame](../../specs/vision/endgame.md), where companions and antagonists are voices played by the
system.

This document collects what composers and arrangers already know about giving several parts
distinct jobs, so that the v4 spec session can choose with that knowledge in hand. It covers:

1. [How composers and arrangers work](#how-composers-and-arrangers-work): the usual process, and
   how varied it is.
2. [Texture](#texture): the standard names for how several parts fit together.
3. [The role catalogue](#role-catalogue): the accompaniment roles arrangers name, each with the notes
   and rhythms it uses and a line on how this app could generate it.
4. [The owner's three roles mapped](#the-owners-three-roles-mapped) onto that catalogue.
5. [Voice-leading minimum rules](#voice-leading-minimum-rules) for 2 to 4 voices.
6. [Balance and density](#balance-and-density): how arrangers keep parts from cluttering.
7. [Endgame mapping](#endgame-mapping): how composers turn characters, teams, places and actions
   into music.
8. [Open questions](#open-questions-for-the-v4-spec-session),
   [lexicon candidates](#lexicon-candidates) and [sources](#sources).

Nothing here is decided. How to read it:

- A sentence with a source id such as **[S131]** or **[S40]** reports what that source says. The
  sources are registered in [research sources](research-sources.md) (see [Sources](#sources)).
- A paragraph or line marked **(inference)** is this researcher's reading for Infinite Flow: a
  suggestion for the spec session, not a fact about music.
- Terms are defined in plain words the first time they appear. Terms the [lexicon](lexicon.md)
  already has are linked to it.

## How this was gathered

- **Repository.** The v2 backing renderer
  ([backing-renderer.ts](../../src/domain/backing/backing-renderer.ts)), the harmony types
  ([harmony-types.ts](../../src/domain/harmony/harmony-types.ts)), the
  [rhythm policy](rhythm-phrase-structure.md), the [instrument ranges](saxophone-profile-ranges.md),
  the [lexicon](lexicon.md), the [v4 README](../../specs/versions/v4/README.md) and the
  [endgame](../../specs/vision/endgame.md).
- **Music theory.** The two open textbooks the project already uses (Music Theory for the
  21st-Century Classroom, "MT21C", and Open Music Theory, "OMT"), Rimsky-Korsakov's orchestration
  manual, Britannica and Wikipedia for standard term definitions.
- **Perception.** Four studies by David Huron on how listeners follow several voices: the evidence
  behind the voice-leading and density rules.
- **Arranging practice.** Jazz and pop arranging material: comping, walking bass, big-band
  backgrounds, the "functional layers" model of pop texture, a record producer's rules of thumb.
- **Generation precedent.** Three systems that generate accompaniment from chords or melody:
  Impro-Visor, Band-in-a-Box and Coconet.
- **Game and film music.** Leitmotif, Prokofiev's _Peter and the Wolf_, the _Star Wars_ themes,
  _Final Fantasy VI_, _Super Mario World_, adaptive game music and stingers.

## What the app has to work with today

Every role below has to be built from what the generator already knows. As of v3.0
(read from the code, so these are facts about the app, not inference):

- **Harmony.** The phrase's harmony is a list of **harmony events**
  ([harmony-types.ts](../../src/domain/harmony/harmony-types.ts)). Each event carries a
  [triad](lexicon.md#triad) (a three-note chord: root, third and fifth) given as pitch classes, its
  scale degree, its quality (major, minor or diminished) and a **role** (`tonic`,
  `tonic_prolongation`, `predominant`, `open_arrival` or `modal_color`), close to the
  [harmonic function](lexicon.md#harmonic-function) of the chord.
  - _Correction to the brief:_ the harmony does **not** change every quarter note. An event starts
    on beat 1 or beat 3 (`startBeat: 0 | 2`) and lasts an even number of beats, so a chord lasts at
    least half a measure. The [harmonic rhythm](lexicon.md#harmonic-rhythm) (how often the chord
    changes) is at most two chords per measure.
  - The harmony is **triads only**: there are no [seventh chords](lexicon.md#seventh-chord). The
    seventh of each chord is not stored, though it can be derived from the scale (the collection)
    the phrase uses.
- **The lead.** The player's line is a list of notes and rests on a grid of
  [ticks](lexicon.md#tick), one sixteenth note each, 64 ticks per four-measure phrase. For each note
  the app knows its onset, length, pitch and whether it is a chord tone or a non-chord tone.
- **Register.** The lead stays inside one **register window** of its instrument profile for the
  whole phrase: concert MIDI 48–72 for keyboard, 46–70 for tenor saxophone, 51–75 for alto
  saxophone, narrowed to a Low, Middle or High window ([ranges](saxophone-profile-ranges.md)).
- **The v2 backing.** The [backing renderer](../../src/domain/backing/backing-renderer.ts) plays a
  bass in MIDI 36–47 (the root, plus the fifth on beat 3 when a chord fills the measure) and
  close-position block chords whose top note is at most E4 (MIDI 64). Both attack at every chord
  change and every downbeat, and nowhere else. It is pure arithmetic: no random draw.
- **Tension.** The [Tension](lexicon.md#tension) control (Settled, Lift, Build, Edge) schedules at
  most one melodic tension figure, and _tension across phrases_ moves it along a session.
- **Randomness.** Every draw comes from named, seeded streams, so a session replays from its
  [seed](lexicon.md#seed).
- **No drums.** There is a click and a count-in, but no drum part.

**(inference)** One fact matters for every role below: the v2 chords already sit inside the lead's
register (a chord top of E4 = 64 is inside every lead window). Any new voice has to find room in a
space that is already partly used.

## How composers and arrangers work

### Composer, arranger, orchestrator

- **Composing** is making the music itself: its melodies, harmonies, rhythms and form.
- **Arranging** is adapting an existing piece: changing its harmony (_reharmonization_), reshaping
  its melody, adding introductions, transitions and endings, and choosing who plays what. One
  definition calls it "the art of giving an existing melody musical variety" **[S120]**.
- **Orchestration** is the narrower job of assigning the notes to instruments **[S120]**.

**(inference)** For accompaniment, **Infinite Flow is an arranger, not a composer.** The generator
already composes a melody and a harmony plan: together they are a _lead sheet_ (a melody with chord
symbols, the usual starting point for jazz and pop players). v4's job is to arrange that lead sheet
for a few side instruments, one phrase at a time.

### The usual stages, which are not a fixed recipe

Textbooks and arrangers describe roughly these stages. Real work loops back and forth between them.

1. **Material.** A small idea to grow from: a [motif](lexicon.md#motif) (the smallest recognizable
   melodic idea) **[S40]**, a groove (a repeating rhythmic feel, often bass and drums), or a chord
   progression.
2. **Development.** The idea is repeated, varied and extended: sequence, fragmentation, inversion
   and the rest of the toolbox in the [mutation catalogue](mutation-catalogue.md#motif-development-transformations).
   Classical teaching builds phrases this way, for example the _sentence_ (an idea, its repetition,
   then a continuation) **[S43]**.
3. **Form.** The order of the larger sections. A swing-era big-band chart, for example, states the
   melody in the first chorus (one pass through the tune's form), then develops it in later choruses
   through solos, written ensemble passages and a climactic _shout chorus_, with introductions,
   interludes and endings added around them **[S122]**.
4. **Harmony.** Choosing or changing the chords under the melody.
5. **Texture and arrangement.** Deciding how many parts play, which job each one has, and how this
   changes from section to section (see [Texture](#texture)).
6. **Orchestration.** Choosing instruments and registers. Rimsky-Korsakov's rule for this stage is
   that a melody "should always stand out in relief from the accompaniment", either through loudness
   or, better, through contrasting timbre (tone colour), doubling, or register **[S129]**.
7. **Revision.** Listening, cutting and rewriting.

The process is not linear. A three-year study that tracked one composer in real time found work
"chunked" at small and large scales, with problems multiplying and being solved one after another,
"not only in a linear manner but also recursively", and with moments of insight that restructured
the problem **[S123]**.

### Top-down and bottom-up

- **Bottom-up** work starts from a small idea and lets the piece grow from it: a motif, a riff, a
  groove found by playing.
- **Top-down** work starts from a plan: a form, a dramatic outline, a timing sheet for a film scene,
  and fills it in.
- Most composers mix the two **[S123]**. The labels are a convenience, not two schools.

### The variety across traditions

- **Jazz head arrangements.** A _head arrangement_ is "a memorized (unwritten) arrangement" worked
  out by the players themselves in rehearsal; Count Basie's early band was known for many of them
  **[S121]**. Behind a soloist, the band typically improvises short repeated figures called
  [riffs](lexicon.md#riff) **[S83]**.
- **Written big-band charts.** The arranger plans the form, then writes **backgrounds** for the
  soloists. In one published chart, the backgrounds stay the same behind each soloist: short hits on
  the A sections and sustained pads on the bridge **[S154]**. Berklee's horn-arranging course teaches
  "background lines" built from voice-led common tones and 3rds and 7ths moving toward target notes
  **[S153]**.
- **Pop production.** A pop arrangement is often described as stacked **functional layers**: a beat
  layer, a bass layer, a harmonic filler and a melodic layer (see [Texture](#texture)) **[S127]**.
  Parts are added or dropped between verse and chorus to shape the energy.
- **Classical writing.** The composer writes every note of every part, usually from a sketch (often
  melody and bass) that is orchestrated later **[S129]**.
- **Game music.** A score is often built from layers or segments that the game turns on, off or
  reorders while it runs (see [Endgame mapping](#endgame-mapping)) **[S159]**.

**(inference)** The app's own process is closest to the big-band arranger writing backgrounds
behind a soloist: the soloist (the player) is fixed and central, the form is a stream of four-bar
phrases, and the accompaniment's job is to support the soloist without getting in the way.

## Texture

**Texture** is how the simultaneous parts of music relate: how many there are and whether they move
together or independently. OMT names four main types and notes that most pieces move between them
**[S124]**.

| Texture         | What it is                                                                                                                                                                                                                               | Everyday example                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Monophony**   | One unaccompanied line; several players in unison or octaves still count.                                                                                                                                                                | A solo flute; a crowd singing one tune.                                                                |
| **Heterophony** | Several players perform the same tune at once, each varying it a little (ornaments, rhythm). **[S124] [S125]**                                                                                                                           | A singer and a fiddler playing the same folk tune, each decorating it differently; Indonesian gamelan. |
| **Homophony**   | Several parts move together harmonically. Two kinds: **homorhythm** (all parts share the rhythm, as in a hymn) and **melody and accompaniment** (one clear melody over parts with their own, usually simpler, rhythm). **[S124] [S126]** | Most pop songs: a voice over guitar chords.                                                            |
| **Polyphony**   | Several independent melodic lines, each with its own rhythm, that together make harmony. **Counterpoint** is the craft of writing them. **[S124]**                                                                                       | A fugue; a jazz front line where trumpet and saxophone improvise lines at once.                        |

Two more ideas matter for this project.

- **Functional layers (pop).** Allan Moore found the four classical terms say little about pop, and
  described pop texture by the job each layer does **[S127]**:
  - **explicit beat layer**: drums and percussion, which state the pulse and meter;
  - **functional bass layer**: the lowest part, closely tied to chord roots;
  - **harmonic filler layer**: keyboards, guitars or synths filling the middle register;
  - **melodic layer**: the voice or lead instrument, usually on top and the most memorable part.
  - Megan Lavengood adds an optional fifth, the **novelty layer**: a melodic part that "works in
    opposition to the melodic layer through call-and-response gestures or interjections", usually
    in intros and interludes or in the gaps the vocal leaves, often with a timbre that stands out
    from the band **[S127] [S128]**.
- **Texture changes over time.** A piece can open with one voice and add accompaniment later
  **[S124]**. Arrangers thin the texture to let a soloist through and thicken it for a climax; game
  composers add and remove whole layers as the situation changes **[S159]**.

**(inference)** Where the app stands:

- Today a session is **melody and accompaniment**: the player's line over a bass and homorhythmic
  block chords.
- v4's roles each push the texture somewhere else: doubling the lead moves toward monophony or
  heterophony, a counter-melody toward polyphony, and a responding voice is Lavengood's novelty
  layer.
- Moore's layers are a better map for v4 than the four classical words, because they already name
  parts by their **job**, which is what "roles" means.

## Role catalogue

The table names each role as arrangers do. The subsections that follow define each one, say which
notes and rhythms it uses relative to the harmony and to the lead, and end with a line on how
Infinite Flow could generate it. The "Family" column groups roles by their relation to the lead
**(inference)**: **foundation** (supports the harmony and time), **highlight** (reinforces the lead),
**contrast** (a second, independent idea), **respond** (answers the lead).

| Role                                                      | Family                 | Notes it uses                                           | Rhythm relative to the lead               | Typical register                           |
| --------------------------------------------------------- | ---------------------- | ------------------------------------------------------- | ----------------------------------------- | ------------------------------------------ |
| [Unison and octave doubling](#unison-and-octave-doubling) | highlight              | the lead's own pitches                                  | identical                                 | the lead's, or an octave away              |
| [Parallel thirds and sixths](#parallel-thirds-and-sixths) | highlight              | the scale tone a third or sixth from the lead           | identical                                 | just below (or above) the lead             |
| [Heterophonic doubling](#heterophonic-doubling)           | highlight              | the lead's pitches, decorated or simplified             | nearly identical                          | the lead's, or an octave away              |
| [Counter-melody](#counter-melody)                         | contrast               | chord tones on strong beats, steps between              | complementary: moves when the lead holds  | above or below the lead, never crossing it |
| [Pad](#pad-sustained-harmony)                             | foundation             | chord tones, voice-led                                  | long notes, few attacks                   | middle, below the lead                     |
| [Guide-tone line](#guide-tone-line)                       | foundation / contrast  | the 3rd and 7th of each chord                           | one note per chord, slow                  | middle, below the lead                     |
| [Pedal point and drone](#pedal-point-and-drone)           | foundation             | one held note, usually the tonic or the fifth           | held or repeated                          | usually bass; can be high                  |
| [Ostinato, riff and vamp](#ostinato-riff-and-vamp)        | foundation / contrast  | a short fixed figure, adjusted to the chord             | its own repeating pattern                 | any                                        |
| [Comping](#comping)                                       | foundation             | chord voicings, often 3rd and 7th                       | sparse, syncopated, in the lead's gaps    | middle, below the lead                     |
| [Bass roles](#bass-roles-root-two-feel-walking-pedal)     | foundation             | roots and fifths; chord and scale tones; approach notes | steady (root, two-feel, walking)          | lowest                                     |
| [Stabs and hits](#rhythmic-punctuation-stabs-hits-kicks)  | highlight / foundation | short chords                                            | on accents, often with the lead's accents | middle                                     |
| [Fills](#fills)                                           | respond                | chord tones, scale runs, approach notes                 | only in the lead's rests                  | near the lead, but not on it               |
| [Call and response](#call-and-response-answering-trading) | respond                | a phrase related to the call                            | alternates with the lead                  | its own                                    |
| [Echo, imitation and canon](#echo-imitation-and-canon)    | respond / contrast     | the lead's figure, delayed, maybe transposed            | the lead's rhythm, shifted later          | an octave or a few steps away              |
| [Groove and drums](#groove-and-drums)                     | foundation             | unpitched                                               | the beat, backbeat, subdivisions          | not pitched                                |

### Unison and octave doubling

- **What it does.** A second instrument plays the lead's melody at the same pitch (unison) or an
  octave away. It makes the melody louder, richer in tone colour and easier to hear; doubling is
  one of Rimsky-Korsakov's natural means of making a melody "stand out in relief" **[S129]**. His
  manual has whole sections on melody in unison and "doubling in octaves" for every instrument group
  **[S129]**.
- **Notes.** Exactly the lead's pitches, or the lead plus or minus 12 semitones.
- **Rhythm.** Identical to the lead.
- **Register.** Unison doubling only works when the two timbres differ, or it simply sounds louder.
  Octave doubling is usually above (brightness) or below (weight).
- **Voice-leading note.** Octave doubling is _not_ the "parallel octaves" error of classical
  theory: that rule concerns two independent voices, and a deliberate doubling is one voice
  thickened **[S147]**.
- **How the app could generate it.** Copy the lead's notes, shift by 0 or ±12 semitones, and drop
  the result if it leaves the voice's range. No random draw is needed; a seeded draw could choose
  which bars are doubled (doubling only the [signature figure](lexicon.md#signature-figure) or only
  the last bar is a classic way to underline it).

### Parallel thirds and sixths

- **What it does.** A second line follows the melody a third or a sixth away, the sound of a
  harmony vocal or of two horns playing together. Thirds and sixths are consonant intervals that can
  move in parallel freely (MT21C lists parallel 3rds, 4ths and 6ths as acceptable) **[S145]**, and
  orchestration manuals give "melody in thirds and sixths" its own sections **[S129]**.
- **Notes.** The scale tone a diatonic third below (or above) each lead note, so the line stays in
  the key: the thirds are sometimes major, sometimes minor. A sixth below is the same note as a
  third above, an octave lower.
- **Rhythm.** Identical to the lead.
- **Register.** Usually just below the lead, so that the melody stays on top.
- **Pitfall.** A strictly parallel third can land on a note that clashes with the chord (for
  example a non-chord tone in the lead whose third is also outside the chord, against a held pad).
  Arrangers switch to a sixth, a different chord tone, or a unison for that note.
- **How the app could generate it.** For each lead note, take the scale tone two scale steps below
  in the phrase's collection. On a strong beat, if that note is not in the current triad, try the
  sixth below, then the nearest chord tone below. Never let it cross the lead or the bass.

### Heterophonic doubling

- **What it does.** A second player plays "the same" tune but varies it: adds a turn or a grace
  note, or simplifies a run into one long note. This is the texture of heterophony **[S125]**.
- **Notes.** The lead's pitches, with ornaments added or passing notes removed.
- **Rhythm.** Mostly identical, diverging around the decorations.
- **How the app could generate it.** Take the lead, then either remove its non-chord tones
  (merging their time into the previous chord tone) or add ornaments from the
  [embellishment catalogue](embellishment-catalogue.md). **(inference)** For a sight-reading
  player, a voice that almost but not quite matches their line may be distracting: worth a
  listening test.

### Counter-melody

- **What it does.** A second melody, subordinate to the lead but a real melody of its own, not
  just a harmony part. Adding one turns melody-and-accompaniment into polyphony **[S130]**. In
  marches it often goes to trombones or horns **[S130]**; in jazz arranging it is the "counterline"
  or "background line" **[S153]**.
- **Notes.** Chord tones on strong beats, scale steps and approach notes between them, as in any
  melody **[S7]**. It should not double the lead's important notes, since that would merge the two
  lines.
- **Rhythm: complementary.** The counter-melody is most audible when it **moves while the lead
  holds or rests, and holds while the lead moves**. The perceptual evidence: Huron found that Bach
  kept simultaneous note onsets between voices below chance, and that listeners separate two lines
  more easily when their notes start at different times **[S150]**.
- **Motion.** Mostly **contrary** (opposite direction) and **oblique** (one voice holds, the other
  moves) motion against the lead keeps the two lines independent **[S144]**.
- **Register.** Entirely above or entirely below the lead, without crossing it: listeners lose track
  of voices that cross **[S149]**. A counter-melody above the lead is called a **descant**.
- **How the app could generate it.** Plan it like a second, sparser lead: take the lead's onsets,
  find the spans where the lead holds a long note or rests, and place most counter-melody attacks
  there; on each chord's first beat choose a chord tone that is a third, sixth or tenth from the
  lead note sounding then (consonant), moving opposite to the lead's contour where possible; fill
  between with steps. A seeded draw picks among the candidates. This is the hardest role to
  generate well and the one most likely to need the [minimum voice-leading
  rules](#voice-leading-minimum-rules).

### Pad (sustained harmony)

- **What it does.** Long held chords that give a bed of harmony under the melody: string pads,
  organ, a synth pad. It is the "harmonic filler" layer **[S127]**, and the "sustained pads" an
  arranger puts behind a soloist on the bridge of a tune **[S154]**.
- **Notes.** Chord tones of each triad (often without the root, which the bass already plays),
  moved to the next chord by the smallest steps possible ("voice-led"), so that common tones stay
  put.
- **Rhythm.** One attack per chord, held; it does not compete rhythmically with the lead.
- **Register.** Middle register, below the lead, adjacent notes within an octave of each other
  **[S146]**.
- **How the app could generate it.** This is v2's block chords with two changes: hold each chord for
  its whole harmony event instead of re-attacking every downbeat, and choose each next voicing by
  smallest total movement from the previous one rather than by the highest top note. No random draw
  is needed.

### Guide-tone line

- **What it does.** A slow single line made of each chord's **guide tones**, the 3rd and 7th
  (sometimes the 9th), which say most about a chord's quality; it moves mostly by step from chord to
  chord and outlines the harmony with very few notes **[S131]**. Horn players comp this way **[S131]**,
  and Berklee teaches it as background lines "using 7ths and 3rds" **[S153]**.
- **Notes.** For each chord, its 3rd or its 7th, whichever is closer to the previous note.
- **Rhythm.** One note per chord, or a held note with a small move.
- **Register.** Middle, below the lead.
- **App limit.** The app's harmony has no sevenths. The 3rd is available; the 7th can be derived
  from the collection (the scale tone six steps above the root). Using it would add a sound the v2
  backing never plays, so it may suit the Jazz profile first.
- **How the app could generate it.** For each harmony event, list its 3rd and its (derived) 7th in
  the guide-tone register; pick the one closest to the previous note, preferring a held common tone
  or a step. No random draw is needed except to break ties.

### Pedal point and drone

- **What it does.** A **pedal point** is a note held (or repeated) while the chords above it change,
  usually the tonic or the dominant (the fifth scale degree), most often in the bass; held in the
  top part it is an _inverted pedal_ **[S134]**. It builds tension because the changing chords clash
  with it, and it pulls the music back toward its root **[S134]**. A **drone** is the same idea
  stretched over a whole piece: a note or an open fifth sounding continuously, as on bagpipes or the
  Indian tanpura; it fixes the tonal centre on which the rest is built **[S135]**.
- **Notes.** One pitch class (the tonic or the fifth), or both (an open fifth).
- **Rhythm.** Held, or re-struck in a steady rhythm.
- **Register.** Usually the bass. A high held note (inverted pedal) is also possible.
- **(inference)** A drone suits the app's modal collections (Dorian, Mixolydian and the others),
  where a strong tonic centre is what makes the mode audible.
- **How the app could generate it.** Hold the tonic (or tonic plus fifth) for the whole phrase in
  the bass register. A dominant pedal under the last bar could follow the tension setting (Build
  and Edge) as a way to raise expectation.

### Ostinato, riff and vamp

- **What it does.** An **ostinato** (Italian for "stubborn") is a short motif or phrase repeated
  persistently, usually in the same voice and at the same pitch **[S136]**. Jazz and pop call the
  same idea a [riff](lexicon.md#riff); a [vamp](lexicon.md#vamp) is a repeated, harmonically sparse
  figure or section **[S136]**. A repeated bass line under changing upper parts is a _ground bass_
  **[S136]**. Ostinatos unify a texture and, in modal music, confirm the modal centre **[S136]**.
- **Notes.** A short fixed figure (one or two beats, or one bar). When the chord changes it is
  either kept as is (if it fits), or shifted to the new chord's tones.
- **Rhythm.** Its own pattern, independent of the lead's.
- **Register.** Anywhere; bass ostinatos and middle-register riffs are common.
- **How the app could generate it.** Generate (or draw from a small library) one bar of figure
  expressed as chord-relative steps (root, third, fifth, a scale step above), then repeat it every
  bar, mapping each step onto the current triad. A seed fixes the figure for the phrase or the whole
  session. **(inference)** A session-long ostinato fits the [rhythm lock](lexicon.md#rhythm-lock)'s
  idea of stability and Jam's motif (it could even _be_ a fragment of the player's motif).

### Comping

- **What it does.** **Comping** (from "accompanying" or "complementing") is the jazz rhythm
  section's chordal accompaniment behind a soloist, on piano, guitar or organ **[S131]**. Old-style
  comping struck a chord on every beat; modern comping leaves more space and places chords at
  rhythmically interesting moments, responding to the soloist **[S131]**. How busy it is varies by
  player: Oscar Peterson comped busily, Count Basie sparsely **[S131]**.
- **Notes.** Chord voicings that usually include the 3rd and 7th, and often leave out the root
  (the bassist plays it) and the fifth; for some soloists just the 3rd and 7th **[S131]**.
- **Rhythm.** Short chords, often syncopated (off the beat), placed in the soloist's gaps. The
  "Charleston" rhythm (beat 1 and the "and" of 2) is a standard example **[S131]**.
- **Register.** Middle, below the lead.
- **Precedent.** Impro-Visor generates comping from a list of rhythm patterns (strike the chord for
  a duration, or rest), each with a **weight**: a pattern with weight _w_ out of a total _s_ is
  chosen with probability _w/s_, and a pattern can be "pushed" ahead of the beat (anticipated)
  **[S141]**. Band-in-a-Box builds whole piano, guitar, bass, drum and string parts from chord
  symbols and a chosen style **[S142]**.
- **How the app could generate it.** Exactly Impro-Visor's method: a small weighted list of
  one-bar or half-bar comping rhythms per profile, drawn from a seeded stream; voice each attack with
  the triad's 3rd and 5th (or 3rd and derived 7th for Jazz) near the previous voicing. Prefer
  patterns whose attacks fall in the lead's rests (score each pattern by how many of its attacks
  coincide with lead onsets, and down-weight those).

### Bass roles: root, two-feel, walking, pedal

- **Root bass** (today's v2 backing): the chord root on the chord's first beat, sometimes the fifth
  on beat 3. Moore's functional bass layer is "closely tied to chord roots" **[S127]**.
- **Two-feel**: two notes per bar, typically root and fifth on beats 1 and 3: what v2 already plays
  when a chord fills a measure. (Common jazz term; the v2 pattern is from the code.)
- **Walking bass**: steady, unsyncopated quarter notes (a "four feel") that move through scale
  tones, chord tones and chromatic passing notes to outline the progression **[S132]**. A common
  teaching recipe, bar by bar: the root on beat 1; a chromatic **approach note** a half step above
  or below the _next_ chord's root on beat 4; a second approach note or an enclosure on beat 3; a
  scale or chord tone on beat 2 **[S133]**. Impro-Visor's bass patterns use the same categories:
  bass note, random chord tone, random scale tone, and "a tone that Approaches the next bass note by
  a chromatic half-step" **[S141]**.
- **Pedal bass**: a held or repeated tonic or dominant under changing chords (see
  [Pedal point](#pedal-point-and-drone)) **[S134]**.
- **Ostinato bass / ground bass**: a repeated bass figure (see [Ostinato](#ostinato-riff-and-vamp)).
- **How the app could generate it.** Walking bass fits the app's harmony neatly because each chord
  lasts an even number of beats and the next chord's root is always known: for every beat, beat 1
  of a chord gets its root, the last beat before a change gets an approach note to the next root
  (a half step above or below, or the next root's fifth), the beats between get chord or scale tones
  chosen by a seeded draw, kept stepwise and inside MIDI 36–47 (or a little higher). The Jazz
  profile already allows [chromatic approaches](lexicon.md#chromatic-approach) in the melody, so the
  vocabulary is familiar.

### Rhythmic punctuation: stabs, hits, kicks

- **What it does.** A **stab** is a single short, detached note or chord that punctuates the music,
  usually on one beat: horn stabs, or a sampled "orchestra hit" **[S138]**. Jazz bands play rhythmic
  chords called **hits** behind a drum solo **[S131]**, and arrangers write "short hits" behind
  soloists **[S154]**. A funk arranger's point is that the silence between hits builds anticipation
  **[S138]**.
- **Notes.** A short chord (the current triad), or a single accented note.
- **Rhythm.** Few attacks, on accents. Two opposite uses: **with** the lead's accents (highlighting
  its rhythm) or **between** them (answering it).
- **Register.** Middle, a bright timbre.
- **How the app could generate it.** Pick one to three moments per phrase: the lead's syncopated
  attacks (an [anticipation](lexicon.md#anticipation) or a note off the beat) to highlight it, or
  the first beat after a lead rest to punctuate it. Voice it as a short triad.

### Fills

- **What it does.** A **fill** is a short passage that keeps the music moving "during breaks
  between melodic phrases", in a moment where nothing else is happening, or that signals the end of
  a phrase; unlike a riff, it is not repeated throughout **[S137]**. Lead guitar, bass, organ, drums,
  strings and horns all play fills **[S137]**. Lavengood's novelty layer interjects in exactly these
  gaps **[S128]**.
- **Notes.** Chord tones, scale runs, approach notes into the lead's next note; anything that
  sounds like a short answer.
- **Rhythm.** Only in the lead's rests (or its long held notes), ending before the lead starts
  again.
- **Register.** Near the lead's register so it sounds like an answer, but out of the lead's way;
  often a contrasting timbre **[S128]**.
- **How the app could generate it.** The rhythm planner already writes real rests; find every lead
  rest (or held note) at least a quarter note long, and fill part of it with a short figure (an
  [arpeggio](lexicon.md#arpeggio), a [scale run](lexicon.md#scale-run), an
  [approach](lexicon.md#approach-note) into the lead's next note) generated from the current triad
  and the next lead note. The Silence control then directly sets how much room fills get.

### Call and response, answering, trading

- **What it does.** One part plays a phrase (the call) and another answers it (the response)
  **[S52]**; see [call and response](lexicon.md#call-and-response). Jazz players
  [trade fours](lexicon.md#trading-fours): they alternate four-bar solos **[S81]**. Inside a
  big-band chart, sections answer each other; in pop, the novelty layer answers the vocal **[S128]**.
- **Scale.** Differs from a fill by size: a fill answers inside the lead's phrase, a response is a
  phrase of its own, so the two take turns.
- **Notes and rhythm.** Related to the call: the same rhythm with new pitches, the same contour,
  a transposition, or a completion that resolves what the call left open.
- **How the app could generate it.** **(inference)** Two scales:
  - _Within a phrase_: the generator already builds a rhythmic [gesture and
    answer](lexicon.md#gesture-and-answer). A system voice could take the "answer" half while the
    player plays the gesture, but that changes what the player reads.
  - _Across phrases_: the system voice plays a whole response phrase between two player phrases.
    This is the shape of the endgame's fights and of Jam. It changes the session's timing (the
    player waits), so it is a session-structure decision, not just a voice.

### Echo, imitation and canon

- **What it does.** **Imitation** is a second voice repeating a motive of the first after a delay.
  A **canon** is strict imitation: the follower copies the leader's rhythms and intervals (exactly or
  transformed) at a fixed delay and pitch offset; a **round** is a canon in which all voices are the
  same tune ("Frère Jacques") **[S140]**. An **echo** is a short, often softer imitation.
- **Notes.** The lead's figure, transposed (an octave, or a scale step or third, kept in the key).
- **Rhythm.** The lead's rhythm delayed by a fixed offset (a beat, two beats, a bar).
- **Register.** An octave or more away, so the two are not confused.
- **Risk.** A strict canon needs the leader to be written so that it fits against its own delayed
  copy; generating a free melody and copying it later will often clash. Echoing only short figures
  that land in the lead's rests avoids this.
- **How the app could generate it.** Take the lead's last figure before a rest (one to four notes)
  and replay it in the rest, an octave lower or higher, adjusted so its notes are chord tones of the
  chord now sounding. This is an echo-fill, and is far safer than a full canon.

### Groove and drums

- **What it does.** The **explicit beat layer** states the pulse and meter, mostly on drums
  **[S127]**; with the bass it makes the song's **groove** (its rhythmic feel) **[S128]**. The
  **backbeat** is the accent on beats 2 and 4 of a 4/4 measure, usually on the snare drum **[S139]**.
- **Notes.** Unpitched: kick drum, snare, hi-hat or ride cymbal.
- **Rhythm.** Patterns per style; Impro-Visor writes drum parts as concurrent patterns per drum,
  each pattern weighted like its comping patterns **[S141]**.
- **How the app could generate it.** A small weighted set of one-bar patterns per profile (straight
  or swing), with a fill in the last bar of the phrase. The v4 sound-library spike lists drum
  synths (`MembraneSynth`, `NoiseSynth`, `MetalSynth`), so the sound side is planned
  ([v4 README](../../specs/versions/v4/README.md)). **(inference)** Drums would replace the click
  for the player's sense of time, which may matter for the timing judgements the app makes.

## The owner's three roles mapped

> ℹ️ **Music theory:** "highlighting", "contrasting" and "responding" are good plain descriptions
> of what a side part can do, but they are not the names arrangers use. Arrangers name a part by its
> **technique** (doubling, counter-melody, fill, pad, comping) or by its **layer** (bass, harmonic
> filler, melody, novelty). Each of the owner's words covers several of these techniques, and the
> spec will be clearer if it picks the technique names.

| Owner's word     | Standard terms it covers                                                                                                                                                                                                                     | Where the word is ambiguous                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Highlighting** | [unison and octave doubling](#unison-and-octave-doubling), [parallel thirds and sixths](#parallel-thirds-and-sixths), [heterophonic doubling](#heterophonic-doubling), [stabs](#rhythmic-punctuation-stabs-hits-kicks) on the lead's accents | "Highlight" can mean _play along with the lead_ (doubling) or _frame the lead_ by getting out of its way (a pad that thins, a comping part that leaves space). The two are opposite in sound. "Doubling" or "reinforcing" is the standard word for the first.                                                                                                                                                                                     |
| **Contrasting**  | [counter-melody](#counter-melody) (descant, counterline), [guide-tone line](#guide-tone-line), [ostinato or riff](#ostinato-riff-and-vamp)                                                                                                   | Contrast in _what_? Direction (contrary motion), rhythm (complementary rhythm), register, or timbre. A counter-melody contrasts in all four but must still _fit_ the harmony: it is a partner, not an opponent. "Contrasting" also sounds like the endgame's antagonist, who might _oppose_ the player; that is a different idea (see [Endgame mapping](#endgame-mapping)). The standard term is **counter-melody**.                              |
| **Responding**   | [fills](#fills), [call and response](#call-and-response-answering-trading), [echo and imitation](#echo-imitation-and-canon), Lavengood's novelty layer                                                                                       | "Responding" can be **inside** a phrase (a fill in the lead's rest) or **between** phrases (a whole answering phrase, trading). It can also mean responding to what the player _actually played_ (live, needs [played-pattern recognition](played-pattern-recognition.md)) or to the phrase the app _generated_ for them (planned, available today). The standard terms are **fill** (inside) and **call and response** or **trading** (between). |

**(inference)** Two observations.

1. **All three words describe a voice's relation to the lead.** None covers the **foundation**
   jobs: the bass, the harmonic filler (pad or comping) and the groove. v2 already plays a crude
   version of two of them. A complete v4 role list probably needs four families: **foundation**,
   **highlight**, **contrast**, **respond**.
2. **The roles live at different time scales**, which matters for the generator's structure:
   - _note-by-note_: doubling, parallel thirds (derived directly from the lead's notes);
   - _phrase-planned_: counter-melody, fills, echo (planned against the whole lead phrase);
   - _chord-by-chord_: pad, guide tones, comping, bass, stabs (planned from the harmony, adjusted to
     the lead);
   - _session-level_: ostinato, groove, call and response between phrases.

## Voice-leading minimum rules

**Voice leading** is how each part moves from one note to the next as the chords change.
**Counterpoint** is the craft of combining independent lines. Classical voice-leading rules are
strict because they were made for four independent vocal parts; Huron argued that most of them
follow from how hearing works (a voice is easiest to follow when it moves by small steps, does not
cross another voice, does not fuse with another voice into one sound, and is not masked by another
in the same pitch zone) **[S148]**. That gives a principled way to keep only the rules that matter
for this app.

### Motion types

Between two voices **[S144]**:

- **Contrary motion**: the voices move in opposite directions.
- **Oblique motion**: one voice holds its note while the other moves.
- **Similar motion**: both move in the same direction, by different intervals.
- **Parallel motion**: both move in the same direction by the same interval.

Contrary and oblique motion keep two lines most clearly separate; parallel motion makes them sound
like one thickened line. That is a fault for a counter-melody and the whole point of a doubling.

### Which parallels matter

- In classical part-writing, **parallel perfect fifths, octaves and unisons** between two voices are
  avoided because they "destroy the independence of the voices"; parallel 3rds and 6ths are fine
  **[S145]**.
- They are fine **outside** that situation: power chords in rock are parallel fifths, and "no
  independent voices are intended"; doubling a part at the octave is standard orchestration, not an
  error **[S147]**.
- **(inference)** For this app, the rule applies between two parts that are meant to be
  _independent_ (the lead and a counter-melody; a counter-melody and the bass), and not inside a
  doubling, a pad's own voicing, or a stab.

### A minimum rule set for a rule-based generator (inference, built on the sources)

These are proposed starting rules, from the most to the least important. Each names its basis.

1. **Never cross the lead.** A system voice stays entirely above or entirely below the lead's
   current note. Basis: listeners lose track of crossing voices, and Bach avoided crossing more as
   textures thickened **[S149]**.
2. **Keep out of the lead's way.** No independent voice may sound the lead's pitch, or a pitch a
   semitone or whole tone from it, at the same onset; keep at least a third of distance where
   possible. Basis: Huron's "minimum masking" principle **[S148]**. (Doublings are the deliberate
   exception.)
3. **No parallel fifths or octaves between independent lines** (lead and counter-melody,
   counter-melody and bass). Basis: **[S145] [S147]**.
4. **Prefer contrary and oblique motion against the lead**, and cap the number of consecutive
   parallel moves (for example at three), so a counter-melody does not turn into a doubling.
   Basis: **[S144]**.
5. **Move by step where possible.** Inner and background lines should mostly move by step or hold
   common tones. Basis: pitch proximity **[S148]** and the rules of melody **[S7]**.
6. **Spacing.** Adjacent upper parts within an octave; the bass may be further from the part above
   it **[S146]**. Close intervals in the low register sound muddy (common arranging advice, not
   checked against a source here).
7. **Complementary rhythm for independent lines.** Few shared onsets between the lead and a
   counter-melody, fill or echo. Basis: **[S150]**.
8. **Respect the lead's tension.** When the lead holds a non-chord tone (the [Tension](lexicon.md#tension)
   control's appoggiatura or approach), no other voice should sound its resolution note at the same
   time, or the clash loses its point. (Standard classical practice for suspensions and
   appoggiaturas; not separately checked here.)
9. **Stay inside each voice's register band** and inside the instrument's range, the same way the
   lead stays inside its window.

**What can be relaxed (inference).** In the Jazz profile, chords may move in parallel inside a pad
or comping voicing (it is heard as one sound), and the 7th may be added. In both profiles, doubling
and stabs ignore rules 3 and 4 by design.

## Balance and density

**Balance** is how loud and prominent each part is; **density** is how much is going on at once.
Arrangers agree on the aim (the melody must be clear) and offer several tools.

- **Keep the melody in relief.** "Melody should always stand out in relief from the
  accompaniment", by dynamics, or better by contrasting timbre, doubling or register **[S129]**.
- **Limit the number of parts.** Huron found that listeners count up to three concurrent voices
  well; with a fourth voice of similar timbre their accuracy drops sharply, mostly by
  under-counting **[S151]**. A record producer's rule of thumb agrees: "no more than four elements
  should be playing at the same time", three often works, five rarely does **[S152]**.
- **Give each part its own register.** Each instrument should sit in its own frequency range; if two
  clash, change one's sound, move it an octave, or make them play at different times **[S152]**.
  Moore's layers already separate by register: bass low, harmonic filler middle, melody on top
  **[S127]**.
- **Give each part its own time.** Parts that attack at different moments separate more easily
  **[S150]**; fills and novelty-layer interjections go in the melody's gaps **[S137] [S128]**.
- **Give each part its own timbre.** The novelty layer uses marked, non-blending timbres; the core
  layers use blending ones **[S128]**.
- **Less is more.** Modern comping leaves space; Basie's sparse comping is the classic example
  **[S131]**. Funk arrangers rely on the silence between hits **[S138]**. A soloist's backgrounds can
  alternate short hits and sustained pads rather than play all the time **[S154]**.

**(inference) What this suggests for Infinite Flow.**

- **The player is the soloist.** Every role should be judged by whether it helps the player hear
  and play their own line. The player also plays an acoustic saxophone or a keyboard in the room,
  so system voices must not mask the player's own sound, not only the app's audio.
- **A density budget.** With lead + bass already present, Huron's three-voice limit leaves room
  for roughly **one or two more active voices** at a time. A pad is cheap (it rarely attacks); a
  counter-melody and a fills voice compete for the same gaps and should probably not run together.
- **Activity inverse to the lead's.** A simple rule: the busier the lead in a bar (note density,
  sixteenths), the sparser the accompaniment in that bar; the more rest, the more room for fills.
- **Register lanes.** Assign each role a lane relative to the lead's window: bass below MIDI 48,
  pad and comping just under the lead's window, counter-melody or descant above it, fills near the
  lead but only in its rests. The v2 chord top (E4) already overlaps the lead, so v4 may need to
  move it.
- **Sight-reading load.** Only the lead is notated today. A busy system voice still draws attention
  away from reading; listening tests should include sight-reading players, not only listeners.

## Endgame mapping

The [endgame](../../specs/vision/endgame.md) makes characters, locations and events restrictive
presets, fights call-and-response exchanges, and companions and antagonists system voices. Composers
already have techniques for each of these. Observations only.

### Characters: themes and timbres

- **Leitmotif.** A [leitmotif](lexicon.md#leitmotif) is a recurring theme tied to a character or a
  dramatic element, used to reinforce the action and give insight into the characters; the
  technique is associated with Wagner **[S155] [S82]**. John Williams's _Star Wars_ scores are a
  modern example: Frank Lehman's catalogue lists dozens of leitmotifs, and Kylo Ren alone has three
  ("aggressive", "hesitant", "menacing") reflecting a conflicted character **[S157]**. _Final
  Fantasy VI_ gave each playable character a theme **[S158]**.
- **Timbre as identity.** In Prokofiev's _Peter and the Wolf_, every character is an instrument with
  its own tempo and manner: the bird a flute with short detached notes, the duck an oboe, the cat a
  clarinet "in a low register", the grandfather a heavy, accented bassoon, the wolf three horns with
  accented chords, Peter the strings **[S156]**. The point of the piece was to teach children to
  recognize instruments by their sound **[S156]**.
- **(inference) Mapping.** A character preset ("loves trills, hates G, dark low notes with sharp
  high spikes") already describes a **melodic signature**. As a system voice, the same character
  also needs a **timbre** (the sound library's job), a **preferred role** (a companion who doubles,
  one who fills, one who keeps an ostinato), and a **signature motif** it can drop into fills and
  responses, the way a leitmotif recurs.

### Team: adding and removing layers

- **Vertical layering.** Adaptive game music adds or removes synchronized layers to change texture
  and intensity; _Dead Space 2_ mixes four layers by the player's distance from enemies **[S159]**.
- **A companion is a layer.** In _Super Mario World_, riding Yoshi adds a bongo percussion layer to
  every level theme it can enter **[S160]**: the companion is heard as an added part.
- **(inference) Mapping.** Recruiting a companion adds a role-layer; losing one removes it. The
  density budget above caps how many can be heard at once: a party of four companions plus the
  player is already past Huron's three-voice limit, so a large team may need to take turns (only
  the companions "in play" sound), or share layers.

### Locations: texture, register and arrangement

- **One theme, many arrangements.** _Super Mario World_'s ground theme is "reused and rearranged" as
  the athletic, underwater and castle themes **[S160]**: the place changes the arrangement (tempo,
  instruments, texture), not the melody.
- **Drones and pedals as place.** Open fifths and drones are used to evoke a rustic or archaic
  mood **[S135]**.
- **(inference) Mapping.** A location preset could fix the **foundation layers**: the groove,
  the bass style (walking in a city, a drone in the mountains), the pad or comping density, the
  register lanes and the instrument palette, while the characters bring the melodic roles.

### Antagonists: contrast and interruption

- **Marked harmony and timbre.** Lehman describes the _Imperial March_ progression as chromatic,
  using notes outside the scale to mark "the strange, the other", moving in a "snakelike" way that
  maps onto evil characters **[S157]**. Prokofiev's wolf is three horns with accented chords
  **[S156]**.
- **Opposition in the texture.** Lavengood's novelty layer "works in opposition to the melodic
  layer" through call-and-response and interjections, with timbres that resist blending **[S128]**.
- **(inference) Mapping.** An antagonist voice is the **contrast** and **respond** families pushed
  to an edge: a counter-melody that moves against the player, stabs that interrupt the player's
  rests, responses that bend the player's motif toward chromatic or "forbidden" notes. A fight is
  [call and response](#call-and-response-answering-trading) between phrases, or
  [trading fours](lexicon.md#trading-fours). The open tension the endgame records (RPG battles have
  winners and losers; the app never penalizes) applies here too: an antagonist's voice can sound
  hostile without making the player's task harder to read.

### Actions: stingers, fills and transformations

- **Stingers.** A sting is a short musical phrase used as punctuation: to mark the end of a scene,
  signal a climax or build tension ("dun dun duuun") **[S161]**.
- **Musically timed changes.** Adaptive music changes at musically sensible points: after the
  current phrase ends ("phrase branching") or through a written bridge **[S159]**.
- **Transformations.** The motif-development toolbox (augmentation, inversion, fragmentation,
  sequence) in the [mutation catalogue](mutation-catalogue.md#motif-development-transformations)
  is how a theme is "acted upon" while staying recognizable.
- **(inference) Mapping.** A player's skill choice or an event could trigger a **stinger or fill**
  in the next lead rest (quantized to the beat, never interrupting a note the player is reading), or
  a **transformation** of a character's motif in their next response (a heal as an augmented,
  calmer version; an attack as a fragmented, accented one).

### Summary table (inference)

| Endgame element       | Composer's technique                          | Role families used                                       |
| --------------------- | --------------------------------------------- | -------------------------------------------------------- |
| Character (companion) | leitmotif + timbre + preferred role           | highlight, contrast or respond, as the character's "job" |
| Team growing          | vertical layering                             | adds foundation or support layers                        |
| Location              | same theme, new arrangement; drone or groove  | foundation (bass style, pad, groove, register lanes)     |
| Antagonist            | marked harmony, opposing layer, interruptions | contrast and respond, pushed to opposition               |
| Fight                 | call and response, trading                    | respond, between phrases                                 |
| Action, event         | stinger, fill, motif transformation           | respond (fill), or a transformation of a leitmotif       |

## Open questions for the v4 spec session

1. **Which roles first?** A small first set could cover one role per family: a **pad** (foundation,
   easy), **parallel thirds** or **octave doubling** (highlight, easy), a **counter-melody**
   (contrast, hard), **fills** (respond, medium). Or does v4 start with foundation roles only
   (walking bass, comping, drums) and leave the three relation roles for later?
2. **How many system voices at once?** Is there a fixed density budget (for example lead + bass +
   two roles), and does it differ on a phone?
3. **Is a role a setting, part of a profile, or drawn by the seed?** Can Vary settings change it?
   Can the player pick per-voice roles, or only an overall "accompaniment style"?
4. **Planned or live responding?** Do responding voices answer the phrase the app generated
   (available now) or what the player actually played (needs
   [played-pattern recognition](played-pattern-recognition.md) and real-time generation)?
5. **Between-phrase responses** change session timing (the player waits). Are they in v4, or kept
   for Jam and the endgame?
6. **Sevenths.** Guide tones and jazz comping want the chord's 7th, which the harmony does not
   store. Derive it for the Jazz profile only, for all, or not at all?
7. **Register lanes.** Do new voices get fixed lanes relative to the lead's window? Does the v2
   chord ceiling (E4) move down to clear room?
8. **Drums.** Are drums a v4 role? Do they replace or join the click?
9. **Notation and export.** Are system voices ever shown on screen (a second staff)? Are they added
   to the MIDI and MusicXML exports (the v4 README keeps exports on the pure renderer)?
10. **Should system voices react to tension?** For example a dominant pedal or denser comping under
    Build and Edge, sparser parts under Settled.
11. **Listening tests.** Which roles need one (counter-melody and heterophonic doubling especially),
    and should sight-reading players take part?
12. **Owner's vocabulary.** Keep "highlight, contrast, respond" as player-facing family names, with
    the standard technique names underneath, or use the standard names throughout?

## Lexicon candidates

Merged into the [lexicon](lexicon.md) on 2026-10-11, mostly in its new [Texture and arranging](lexicon.md#texture-and-arranging) category: [Texture](lexicon.md#texture), [Monophony](lexicon.md#monophony), [Heterophony](lexicon.md#heterophony), [Homophony](lexicon.md#homophony) (with melody and accompaniment), [Polyphony](lexicon.md#polyphony) (with counterpoint), [Accompaniment](lexicon.md#accompaniment), [Accompaniment role](lexicon.md#accompaniment-role), [Arrangement](lexicon.md#arrangement) (with orchestration), [Functional layer](lexicon.md#functional-layer) (with the novelty layer), [Doubling](lexicon.md#doubling), [Parallel thirds and sixths](lexicon.md#parallel-thirds-and-sixths), [Counter-melody](lexicon.md#counter-melody) (with descant), [Pad](lexicon.md#pad), [Guide tone](lexicon.md#guide-tone), [Pedal point](lexicon.md#pedal-point), [Drone](lexicon.md#drone), [Comping](lexicon.md#comping), [Walking bass](lexicon.md#walking-bass) (with the two-feel), [Stab](lexicon.md#stab), [Fill](lexicon.md#fill), [Imitation](lexicon.md#imitation) (with echo and canon), [Groove](lexicon.md#groove), [Backbeat](lexicon.md#backbeat), [Voice leading](lexicon.md#voice-leading), [Types of motion](lexicon.md#types-of-motion), [Parallel fifths and octaves](lexicon.md#parallel-fifths-and-octaves), [Stinger](lexicon.md#stinger), [Vertical layering](lexicon.md#vertical-layering). Ostinato stays an alias of [Riff](lexicon.md#riff), and voice crossing is explained only in this document. The existing entries [Riff](lexicon.md#riff), [Leitmotif](lexicon.md#leitmotif), [Call and response](lexicon.md#call-and-response), [Head](lexicon.md#head) and [Vamp](lexicon.md#vamp) gained sources or related links.

## Sources

This document's sources are registered in [research sources](research-sources.md), in the block
[Arranging and Accompaniment Roles (v4)](research-sources.md#arranging-and-accompaniment-roles-v4)
(merged on 2026-10-11). They are reference only: no text is copied or closely paraphrased. All URLs
were checked on 2026-10-11.

- New for this document: S120–S161. Of these, S130, S131, S137, S143, S148, S159 and S161 are also
  cited by [accompaniment systems and adaptive music](accompaniment-systems.md).
- Already in the register and cited above: S7 (rules of melody), S40 (motive), S43 (the sentence),
  S52 (call and response), S81 (trading fours), S82 (motif, leitmotif and cue notes) and S83 (lick,
  riff and head).
