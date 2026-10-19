# Musical Identity

Status: research (2026-10-11), endgame groundwork (characters, locations, events); not settled policy.

## Purpose

In the [endgame](../../specs/vision/endgame.md), Infinite Flow becomes the music factory of a
rhythm RPG in the spirit of _Theatrhythm Final Fantasy_. Characters (the protagonist, companions,
antagonists), locations and events each carry a **musical identity**: a preset of sound and habits
that steers how the app generates the main melody and the accompaniment voices
([endgame](../../specs/vision/endgame.md#characters-are-restrictive-musical-presets), D228).

The owner's question is: **what could and should make up such a musical identity?** This document
gathers what musicology, music psychology and film and game composers say about it, and turns that
into a catalogue of **constituents**: the separate ingredients an identity could set. It covers:

1. what makes a style or a personal voice recognisable;
2. how film and game composers give characters, places and events their music, and which
   ingredients stay fixed when a theme changes mood;
3. a constituent catalogue, with what the app can already express and what is missing;
4. how few ingredients a listener needs to recognise a theme, and the risk of identities that sound
   alike or are too strict to make music;
5. combining identities, status effects, and learning an identity from the player's own playing;
6. worked examples, open questions, lexicon candidates and sources.

It answers **what** an identity contains. How an identity becomes numbers that steer the generator
is the subject of the sibling document [identity modelling](identity-modelling.md).

How to read it:

- A sentence with a source id such as **[S157]** or **[S206]** reports what that source says. The
  sources are registered in [research sources](research-sources.md) (see [Sources](#sources)).
- A paragraph or line marked **(inference)** is this researcher's reading for Infinite Flow: a
  suggestion for a later spec session, not a fact about music.
- Terms are defined in plain words the first time they appear. Terms the [lexicon](lexicon.md)
  already has are linked to it.

### Wording notes on the brief

These notes clarify a few words from the owner's examples, because the catalogue depends on them.

> **"The A scale".** There is no single "A scale": a scale is named by its home note **and** its
> type. **A major** is A B C♯ D E F♯ G♯ and contains no G at all, only G-sharp, so "hates G" changes
> nothing there. **A natural minor** (A Aeolian) is A B C D E F G, and banning G removes its 7th
> note, leaving a six-note (hexatonic) scale. So the first character is either "A major" (and the
> dislike is about G-sharp or is decorative) or "A minor without its 7th".

> **"Tone".** In music, "tone" has several meanings: a pitched sound, the distance of a whole step,
> or the sound quality of an instrument. The owner's "instrument preference and a tone" means the
> last one. The standard word is **timbre** (said "TAM-ber"): what makes a flute and a violin
> sound different on the same note. Effects such as reverb (an echoing room sound) change it too.
> This document uses "timbre" for the instrument's sound and "tone" only in the owner's sense of
> timbre plus effects.

> **"Cues".** In this project a **cue** is the app signalling the player (the
> [session cue row](lexicon.md#cue)); a pattern the player plays to steer the app is a
> [played signal](lexicon.md#played-signal) (D214). A character's theme heard from the app is a
> cue in the usual musical sense; a pattern the player plays to choose a skill is a played signal.

> **"Gimmick".** The musical words are **signature figure** ([lexicon](lexicon.md#signature-figure)),
> **leitmotif** (a theme tied to a character, [lexicon](lexicon.md#leitmotif)), **lick** (a stock
> phrase a player reuses, [lexicon](lexicon.md#lick)) and **riff** (a short phrase repeated over and
> over, [lexicon](lexicon.md#riff)). They are not the same thing; the catalogue keeps them apart.

> **"Sharp, brief high notes".** Here "sharp" means sudden and cutting, not the ♯ sign (which
> raises a note by a half step). Musicians would describe these notes by their **articulation**
> (how a note is attacked and released: short and detached is _staccato_, stressed is _accented_)
> and their **register** (how high they sit).

## How this was gathered

- **Repository.** The [endgame vision](../../specs/vision/endgame.md), the
  [preset catalogue](preset-catalogue.md) (what a preset holds and cannot express), the
  [lexicon](lexicon.md) entries for v3.1's [built-in presets](lexicon.md#built-in-preset),
  [figure levels](lexicon.md#figure-level) and
  [key and mode restriction](lexicon.md#key-and-mode-restriction), the
  [arranging and roles](arranging-and-roles.md#endgame-mapping) and
  [accompaniment systems](accompaniment-systems.md#6-endgame-mapping) endgame mappings, the
  [embellishment catalogue](embellishment-catalogue.md), the
  [mutation catalogue](mutation-catalogue.md#motif-development-transformations), the
  [played-pattern recognition](played-pattern-recognition.md) note and the
  [v4 README](../../specs/versions/v4/README.md). The audio code was checked for what the app
  sounds today (`src/audio/web-audio-session-bus.ts`, `src/audio/audio-ports.ts`).
- **Style analysis.** LaRue's _Guidelines for Style Analysis_ and Meyer's style theory, through
  reviews and papers that summarise them; jazz vocabulary research (Berliner, Owens, Norgaard, the
  Weimar Jazz Database); computational performer and composer identification.
- **Film and game music.** Wikipedia pages on leitmotif, _The Lord of the Rings_ and _Final
  Fantasy_ music (as pointers), Frank Lehman's _Star Wars_ catalogue, Scott Murphy's article on the
  "tritone progression" in science-fiction films, an analysis of _Undertale_'s leitmotifs, composer
  interviews (Koji Kondo, Masayoshi Soken), and three _Music Theory Online_ and _ACT_ articles
  (Lavengood and Williams on the winter topic, Medina-Gray on modular game music, Brame on Zelda).
- **Music psychology.** Studies of how many notes identify a tune, contour versus intervals versus
  rhythm, recognition from very short sound clips, distinctiveness and "hooks", and congenital
  amusia.
- **Method.** Three narrow web sub-searches were delegated and their results checked: every URL in
  [Sources](#sources) was requested on 2026-10-11. Pages from publishers
  that refuse scripted requests (some DOIs return 403 to a script but resolve in a browser) are
  noted. A claim found only in a search summary, or only second-hand, is marked as such.

## What the app can express today

An identity can only use what the generator can do. As of v3.0 (built) and v3.1 (planned, D228–D235),
read from the [preset catalogue](preset-catalogue.md#what-a-built-in-preset-can-set-today) and the
lexicon:

| Area                   | Built today (v3.0)                                                                                                                                                     | Planned for v3.1                                                           | Not expressible yet                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Timbre and tone        | The app sounds only the click and the v2 backing: a bass on a triangle wave, chords on sine waves, fixed for every preset; the player's own instrument sounds the lead | nothing                                                                    | any per-identity sound; v4 proposes a synth library (Tone.js or similar), synths and effects only, no samples |
| Register               | Register: Low, Middle, High, Varying; one one-octave [register window](lexicon.md#register-window) per phrase                                                          | held by presets                                                            | "spikes" outside the window; per-voice registers                                                              |
| Pitch material         | Collection: 9 seven-note scales and modes; Neutral (in the scale) or Jazz (brief chromatic approaches)                                                                 | key and mode restriction (guides, never blocks); seven figure levels       | banned or favoured pitches; five- and six-note scales; harmonic minor; held blue notes                        |
| Harmony                | Harmonic motion: Static, Gentle diatonic, Active diatonic; root-position triads from fixed four-bar templates                                                          | held by presets                                                            | sevenths; chosen progressions; chromatic progressions; voicings; cadence habits beyond the templates          |
| Melody                 | Contour (4 shapes), Leapiness (4 levels), Arpeggio chaos, Tension (one scheduled tension figure)                                                                       | held by presets; figure levels favour passing tones, enclosures and others | a stored signature motif; interval preferences beyond leap caps                                               |
| Rhythm                 | Note density, Rhythmic variety, Syncopation, Silence density; even eighths; 4/4; sixteenth grid                                                                        | held by presets                                                            | swing; other metres; tuplets; stored rhythm patterns                                                          |
| Ornaments              | none written                                                                                                                                                           | none (representation settled by D216; a later release, grace note first)   | trills, mordents, turns, falls, scoops                                                                        |
| Articulation, dynamics | none: the generated phrase carries no accents, staccato or loudness marks                                                                                              | none                                                                       | all                                                                                                           |
| Tempo                  | 60–240 BPM, the player's own                                                                                                                                           | presets never hold tempo                                                   | an identity's preferred tempo                                                                                 |
| Form                   | four 4/4 measures; a rhythmic gesture-and-answer relation                                                                                                              | none                                                                       | longer forms; melodic repetition or sequence of a motif                                                       |
| Interaction            | backing only; the [system voices](lexicon.md#system-voice) are bass and chords                                                                                         | none                                                                       | roles, answering, interrupting, imitating (v4 and later)                                                      |

**(inference)** Two facts shape everything below:

1. **The lead's timbre belongs to the player.** The player plays the main melody on their own
   instrument; the app does not sound it. So a character's "instrument preference" can only colour
   the **system voices** (companions, antagonists, the location's backing), or a doubling of the
   lead that the app plays along. For the player's own line, identity must come from notes and
   rhythm.
2. **Most of an identity is still missing.** v3.1's presets cover pitch collection, density, leaps
   and a few figures. Timbre, banned pitches, a signature motif, ornaments, articulation, swing,
   metre and roles are all later work. This matches the preset catalogue's finding that most of
   what makes a style recognisable sits outside today's settings
   ([preset catalogue](preset-catalogue.md#what-no-setting-can-express-today)).

## What makes a style recognisable

### Frameworks for describing a style

- **LaRue's SHMRG.** Jan LaRue's _Guidelines for Style Analysis_ (1970) splits the analysis of any
  music into five elements: **Sound** (timbre, range, texture, dynamics), **Harmony**, **Melody**,
  **Rhythm**, and **Growth**, which is how the first four combine into movement and shape over time,
  that is, form **[S195]**. It is a standard teaching framework for "music of any period"; the
  catalogue below follows its order, with ornamentation, tempo and interaction added.
- **Meyer's style theory.** Leonard B. Meyer defines style as "a replication of patterning" that
  "results from a series of choices made within some set of constraints" (_Style and Music_, 1989):
  a pattern becomes style only when it repeats **[S196]**. He sorts the constraints into three levels
  **[S196] [S197]**:
  - **laws**: limits from physics and perception that hold everywhere (a piccolo cannot play a very
    low G);
  - **rules**: the shared norms of a culture or period (Renaissance against Baroque);
  - **strategies**: the choices a composer makes within those rules. "It is in the strategies that
    the music of G. F. Handel differs from the music of G. Ph. Telemann" **[S197]**.
- **Dialect, idiom, idiolect.** Meyer nests styles from large to small: a **dialect** (the style of
  a group, school or region), an **idiom** (one composer's use of the dialect) and the style inside
  a single work (intra-opus style). This hierarchy is reported from secondary summaries; the book
  itself was not read. Later writers use **idiolect**, a word borrowed from linguistics meaning
  one person's own way of speaking, for one musician's personal style.

**(inference) Mapping for Infinite Flow.** The three levels fit the endgame's layers well:

| Meyer's level      | Infinite Flow equivalent                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| Laws               | the generator's fixed rules: the instrument's range, playability, leap recovery, the never-penalise principle |
| Rules (dialect)    | a style or location preset: Reel, Bebop, a "winter" location, a culture's music                               |
| Strategies (idiom) | a character's identity: the personal choices made inside that style                                           |
| Intra-opus style   | the habits of one session: a motif introduced in phrase 1 and developed after                                 |

So a character is best thought of as **strategies inside a style**, not a style of its own: the
same character can visit a winter location and stay recognisable.

### Personal voice and vocabulary in jazz

- **Vocabulary.** Paul Berliner's _Thinking in Jazz_ (1994) describes how jazz players learn
  phrases from recordings and teachers ("getting your vocabulary straight"), then build an
  individual voice beyond their early models **[S198]**.
- **Formulas.** Thomas Owens's 1974 dissertation on Charlie Parker found about 100 short motives,
  or formulas, that Parker reworked from solo to solo, across some 250 transcribed solos
  (second-hand figures; the dissertation was not read) **[S199]**.
- **How much of a solo is reused.** Martin Norgaard (2014) turned 48 Parker solos into sequences
  of intervals: about 83 % of notes began a four-interval pattern that also occurs elsewhere in
  the corpus, and about 58 % began a pattern matching both intervals and rhythm. He concludes that
  improvisers insert pre-formed patterns into new solos **[S200]**.
- **Corpus research.** The Weimar Jazz Database holds 456 transcribed solos from 1925 on; the
  Jazzomat project's book _Inside the Jazzomat_ (2017, open access) and later talks such as
  "Patternology" and "Anatomy of a lick" study melodic patterns in it **[S201]**.

**(inference)** A personal identity in jazz is largely **a store of licks plus how they are
adapted to the chords of the moment**. That is exactly the lexicon's
[signature figure](lexicon.md#signature-figure), stored and re-fitted, rather than a single
fixed melody.

### Performer fingerprints and composer fingerprints

- **Performers** are identified by **how** they play written notes. Stamatatos and Widmer (2005)
  told 22 pianists apart, playing the same Chopin pieces, from small deviations against an
  average performance, with an accuracy they judged human listeners unlikely to match **[S202]**.
  Saunders and colleagues (2008) did it from beat-level changes of tempo and loudness coded as a
  "performance alphabet" **[S203]**. From rhythm features alone, a 2024 study identified which of 10
  jazz pianists was playing in 59 % of cases, six times chance, and found each player's rhythmic
  style stable across their career **[S204]**.
- **Composers** are identified by **what** is written. Van Kranenburg measured "style markers"
  in scores (pitch and harmonic statistics, voice density, dissonance) to tell Bach, Handel,
  Telemann, Mozart and Haydn apart, and to test disputed attributions **[S197]**. The jSymbolic
  toolkit extracts 246 such features (pitch, intervals, chords, rhythm, texture, instruments,
  dynamics) for genre and composer classification **[S205]**.

**(inference)** Infinite Flow has both layers. The **notes the generator writes** are the
composer layer: a character's pitch, interval, rhythm and harmony habits. The **way system voices
are played back** (swing, tiny timing pushes, accents and loudness) is the performer layer, which
v4's sound library could add. Machines detect performer fingerprints better than people do
**[S202]**, so for a game, the composer layer and the timbre will carry most of the recognisable
identity; the performer layer adds life rather than recognition.

### Style as learned expectation

Listeners recognise a style because they have learned what usually comes next in it: Meyer's
"replication of patterning" **[S196]** is something the ear learns by exposure. The preset
catalogue already serves persona P1's goal "vocabulary by exposure" this way
([preset catalogue](preset-catalogue.md#how-this-was-gathered)). **(inference)** An identity heard
many times becomes recognisable even if each phrase differs, as long as its habits repeat.

## Leitmotif and character themes

A [leitmotif](lexicon.md#leitmotif) is a recurring musical idea tied to a character, a place, an
object or an idea **[S155] [S82]**. The technique is associated with Wagner and is now common in
film and game music.

### Concrete examples

| Work                                  | Identity and what carries it                                                                                                                                                                                                                                              | Source               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Wagner, _Ring_ cycle                  | Siegfried's horn call returns broader and richly orchestrated; in "Hagen's Watch" it is darkened over a half-diminished seventh chord (a tense, unstable chord): same melody, new harmony, new meaning                                                                    | [S206]               |
| Prokofiev, _Peter and the Wolf_       | Each character is an instrument with its own manner: bird, flute, short detached notes; cat, clarinet in a low register; grandfather, heavy accented bassoon; wolf, three horns with accented chords                                                                      | [S156]               |
| Shore, _The Lord of the Rings_        | Over 50 themes. Cultures are marked by instrument, metre and mode: Rohan's Hardanger fiddle; Isengard's five-beat rhythm on metal plates, Japanese drums and chains; Mordor's rhaita (a double-reed horn); the Elves' women's voices and the Hijaz scale (an Arabic mode) | [S207]               |
| Shore, the Shire                      | D major, tin whistle and fiddle with Celtic instruments; a folk version and a "hymn" version, which later becomes Frodo's theme                                                                                                                                           | [S208]               |
| Williams, _Star Wars_                 | Dozens of leitmotifs (55 in Episodes I–VIII by Lehman's count); Kylo Ren has three for one conflicted character; the Imperial March's "characteristic progression" between G minor and E-flat minor reads as "sci-fi evil"                                                | [S157]               |
| Science-fiction film harmony          | Two major chords whose roots are a tritone apart (the widest possible distance, such as C and F-sharp) mark outer space; Murphy argues their voice leading suggests "distance, ambiguity, and unfamiliarity"                                                              | [S209]               |
| Uematsu, _Final Fantasy VI_ and _VII_ | Each main character has a theme in VI; in VII "One-Winged Angel" is built around Sephiroth; "Dancing Mad" quotes Kefka's theme in another key as a counter-melody; _Final Fantasy VIII_ deliberately has no character themes                                              | [S158] [S210] [S211] |
| Toby Fox, _Undertale_                 | The main theme is the main melody of at least 13 tracks, re-dressed as chiptune, gentle guitar or lift music, and stands for home; Undyne's battle theme combines one area's pitches with another's rhythm                                                                | [S212]               |
| Soken, _Final Fantasy XIV_            | Area music has day and night versions (a full orchestra by day, a sombre piano at night, same melody); the boss theme "Triumph" turns the expansion theme into a minor-key variation on deep brass                                                                        | [S213] [S214]        |
| Mitsuda, _Chrono Cross_               | Paired tracks for the two parallel worlds carry bright and dark moods; the "Another World" versions are slower and dreamier                                                                                                                                               | [S215]               |
| _The Legend of Zelda_ series          | The overworld themes of every main game share motifs and structure while each stays distinct; item-get and secret jingles recur across the series                                                                                                                         | [S216] [S217]        |
| Meguro, _Persona_                     | Series identity comes from a genre and a voice: pop-based vocals with English lyrics, chosen as less distracting for Japanese players                                                                                                                                     | [S218]               |
| _Theatrhythm Final Fantasy_           | Uses original series tracks, sorted into field, battle and event stages: the series' music is already sorted by situation                                                                                                                                                 | [S92]                |

A widely repeated practitioner claim says the **Lydian mode** (a major scale with a raised 4th,
see [Lydian](lexicon.md#lydian)) sounds like "wonder" and is used for awe and flight in film (for
example the _Star Trek: The Motion Picture_ theme) **[S219]**. No scholarly source was found for
it; treat it as a trope, not a finding.

### What stays fixed and what varies

Across these sources, a theme keeps its identity through some ingredients and changes others to fit
the situation:

| Usually **fixed** (carries identity)                              | Usually **varied** (carries situation and mood)                                                                 |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| the melodic contour and interval pattern of the motif **[S206]**  | harmony: Siegfried's call over a darker chord **[S206]**; "Triumph" in minor **[S214]**                         |
| the motif's characteristic rhythm **[S206] [S212]**               | instrumentation: Undertale's main theme as chiptune or guitar **[S212]**; day orchestra, night piano **[S213]** |
| often a signature instrument (Prokofiev, Rohan) **[S156] [S207]** | tempo and mood: Chrono Cross's slower "Another World" versions **[S215]**                                       |
| for places and cultures: instrument, mode and metre **[S207]**    | key, register, texture and accompaniment **[S206] [S160]**                                                      |

The Wikipedia leitmotif article states the rule directly: a leitmotif must stay recognisable when
its rhythm, harmony, orchestration or accompaniment change **[S206]**. The mutation catalogue's
[motif-development transformations](mutation-catalogue.md#motif-development-transformations)
(sequence, augmentation, fragmentation, ornamentation) are the standard ways of doing so.

**(inference) Consequences for a character identity.**

- Split each identity into a **core** (kept in every situation: the signature motif's contour and
  rhythm, the timbre of the character's own voice, perhaps a pitch habit) and a **surface** (allowed
  to change with situation: harmony, mode, tempo, register, density, accompaniment).
- A battle version, a sad version and a victory version are then the same core over a different
  surface, which is what Soken's "Triumph" and Wagner's horn call do.
- The owner's "hates G" is a core habit only if it survives every situation. If a sad situation
  moves the music to a mode where G is central, the dislike and the situation conflict; see
  [Combining identities](#combining-identities).

## Locations and events

### Places

- **Same melody, new arrangement.** Koji Kondo "tried to make the music different by location":
  above ground, underwater, underground and castle **[S220]**. _Super Mario World_'s ground theme is
  rearranged as its athletic, underwater and castle themes **[S160]**.
- **Instrument and mode as place.** _The Lord of the Rings_ marks each culture with its
  instruments, metre and mode **[S207]**. _Chrono Cross_ draws on Mediterranean, fado, Celtic and
  African influences for its places **[S215]**. Open fifths and drones (a held low note) evoke a
  rustic or archaic mood **[S135]**.
- **Musical topics.** A **topic** is a style that carries an agreed meaning, such as pastoral
  (shepherds, countryside: drones, lilting rhythm), military (drums, fanfares) or hunt (horn
  calls). Topic theory began with Leonard Ratner (1980) for 18th-century music and has been
  extended to film and games **[S221]**.
- **A measured game topic: winter.** Lavengood and Williams studied over 160 winter tracks from
  games of 1987–2020. Heavy reverb appeared in 82 %, metallic percussion (glockenspiel, celesta,
  chimes) in 71 % and arpeggiated textures in 62 %; drums are usually left out and plucked strings
  are common. They conclude that **instruments and audio effects define the topic, and mode does
  not**: they counted 96 major and 65 minor examples **[S222]**. Kakariko Village is cited as a
  pastoral example and drums as a military marker for combat and travel **[S222]**.
- **Same place, several states.** _Final Fantasy XIV_ plays day, night and weather versions of an
  area's music **[S213]**; adaptive music adds or removes layers by game state **[S159]**.

**(inference)** For a location, the strongest ingredients are **timbre and audio effects, texture
(how many voices, how busy, which roles) and metre or groove**. Mode is useful but weaker than
expected: the winter study found it not defining **[S222]**, while _The Lord of the Rings_ uses it
for cultures **[S207]**. A location preset therefore mainly sets the **foundation layers** and the
**tone**, as the [arranging note](arranging-and-roles.md#locations-texture-register-and-arrangement)
already proposed, and leaves the melody to the characters.

### Events

- **Stingers.** A sting is a short phrase used as punctuation: the end of a scene, a climax, a
  shock **[S161]**. Game middleware plays stingers over the current music when the game calls a
  trigger **[S181]**.
- **Victory fanfares.** The _Final Fantasy_ victory fanfare accompanied battle wins in the first
  ten games: the same short tune, a series signature **[S210]**. A **fanfare** is a short, bright
  flourish, traditionally for trumpets and brass, announcing someone or something **[S223]**.
- **Jingles.** Zelda's "important item acquired" jingle (Kondo, 1986) recurs across the series and
  in crossover games **[S217]**.
- **Battle music.** The JRPG convention is a break into the battle music at the start and a
  fanfare at the end **[S210]**. The common belief that battle music is faster with a driving
  repeated bass was not confirmed by a scholarly source in this search.

**(inference)** An event identity is short-lived and comes in two kinds: a **stinger** (a short
figure laid over the music, fixed or nearly fixed, recognised because it never changes, like the
victory fanfare) and a **transformation** (the current music changes for a while: a minor-key
version, a faster tempo, a new layer). Fixed stingers are the only place where exact repetition is
the point; everywhere else the generator varies.

## Constituent catalogue

### How to read the table

- **Identity signal**: how strongly the ingredient marks identity, according to the sources:
  **strong** (listeners or studies pick it up quickly and reliably), **medium** (marks a style or
  mood more than a specific character), **weak** (adds colour; rarely recognised alone). "For a
  theme" means recognising one specific tune or character; "for a kind" means recognising a style,
  culture, place or mood.
- **Applies to**: the main melody (the player's line), the accompaniment (system voices), or both.
- **Fits**: whether the ingredient suits a **hard constraint** (never or only: "hates G", "only
  this scale"), a **soft weight** (more or less often: "loves trills"), or a **scheduled
  signature** (placed on purpose at a planned spot, the way today's Tension control schedules one
  tension figure; [lexicon](lexicon.md#tension)). The last kind is a proposal **(inference)**.
- **App**: **today** (built in v3.0), **v3.1** (planned), **missing**.

| #   | Family      | Constituent                                         | Identity signal                                         | Applies to          | Fits                           | App                                                   |
| --- | ----------- | --------------------------------------------------- | ------------------------------------------------------- | ------------------- | ------------------------------ | ----------------------------------------------------- |
| 1   | Sound       | Timbre (instrument)                                 | strong, fastest; for a kind and for a recording         | accompaniment       | hard (a voice's sound)         | missing (v4 synths)                                   |
| 2   | Sound       | Tone: audio effects (reverb, filter, distortion)    | strong for places (winter)                              | accompaniment       | hard or soft                   | missing                                               |
| 3   | Sound       | Articulation (staccato, accent, legato)             | medium (Prokofiev's manners)                            | both                | soft                           | missing                                               |
| 4   | Sound       | Dynamics (loudness)                                 | weak for listeners; strong for machines (performers)    | accompaniment, both | soft                           | missing                                               |
| 5   | Register    | Register and range                                  | medium (dark low, bright high)                          | both                | hard (limits)                  | today: Register; one window                           |
| 6   | Register    | Register spikes                                     | medium; a signature if rare and placed                  | both                | scheduled or soft              | missing                                               |
| 7   | Pitch       | Tonal centre and scale or mode                      | medium for a kind (cultures); weak for winter           | both                | hard or guiding                | today: Collection; v3.1: restriction                  |
| 8   | Pitch       | Favoured and banned pitches                         | medium; a banned note is heard only through its absence | both                | hard (banned), soft (favoured) | missing                                               |
| 9   | Pitch       | Chromaticism (notes outside the scale)              | medium (villainy, jazz)                                 | both                | soft                           | today: Neutral or Jazz; v3.1: chromatic figure levels |
| 10  | Harmony     | Chord vocabulary and qualities                      | medium for a kind (sevenths = jazz)                     | accompaniment       | hard or soft                   | today: triads only                                    |
| 11  | Harmony     | Signature progression                               | strong for a mood (Imperial March, tritone pair)        | accompaniment       | scheduled                      | missing                                               |
| 12  | Harmony     | Harmonic rhythm, cadence habits, voicing            | weak to medium                                          | accompaniment       | soft                           | today: Harmonic motion                                |
| 13  | Melody      | Contour                                             | strong for a theme (the first thing remembered)         | melody              | soft or scheduled              | today: Contour                                        |
| 14  | Melody      | Interval profile and leap tendency                  | medium; strong once a tune is familiar                  | melody              | soft (caps hard)               | today: Leapiness, Arpeggio chaos                      |
| 15  | Melody      | Signature motif, leitmotif, licks                   | strongest for a specific character                      | both                | scheduled                      | missing                                               |
| 16  | Rhythm      | Feel (swing, straight)                              | strong for a kind; strong for performers                | both                | hard per voice                 | missing (even eighths only)                           |
| 17  | Rhythm      | Favoured note values, density, syncopation, rests   | medium for a kind; weak alone for a theme               | both                | soft                           | today: four rhythm controls                           |
| 18  | Rhythm      | Metre and signature rhythm                          | strong for a kind (Isengard's five beats)               | both                | hard (metre), scheduled        | missing (4/4 only)                                    |
| 19  | Ornament    | Trills, mordents, turns, grace notes, falls         | medium for a kind (Baroque, Irish)                      | both                | soft                           | missing (after v3.2)                                  |
| 20  | Tempo       | Preferred tempo                                     | weak alone; varies by situation                         | both                | soft                           | missing in presets                                    |
| 21  | Form        | Repetition, sequence, question and answer, endings  | medium (intra-opus identity)                            | melody              | soft                           | partly (rhythmic gesture and answer)                  |
| 22  | Interaction | Preferred roles; answering, interrupting, imitating | medium; character shown as behaviour                    | accompaniment       | soft                           | missing (v4 and later)                                |

The subsections below explain each family in plain words, with sources and gaps.

### Sound: timbre, tone, articulation, dynamics

**What it is.** **Timbre** is the sound quality that tells instruments apart on the same note
**[S224]**. **Tone** in the owner's sense adds **audio effects**: reverb (a room's echo), filters
(dull or bright), distortion (gritty), delay (repeats). **Articulation** is how each note starts
and ends: short and detached (staccato), stressed (accent), smoothly joined (legato) **[S225]**.
**Dynamics** is loudness and its changes **[S226]**.

**Identity signal.** Timbre is the fastest identity cue the sources found:

- Listeners matched 200 ms clips of five hit recordings to title and artist above chance, and were
  still above chance at 100 ms; played backwards, the clips failed **[S227]**.
- With 400 ms clips, listeners named artist and title on over a quarter of trials, and even unnamed
  clips conveyed style, emotion and decade **[S228]**.
- Genre labels given to 250 ms clips matched those given at 3 seconds 44 % of the time, and genre
  was recognised at 54 % (against 20 % chance) from 125 ms (second-hand figures) **[S229]**.
- Prokofiev built _Peter and the Wolf_ to teach children instruments by their sound **[S156]**; the
  winter topic is defined by instruments and reverb, not mode **[S222]**.

These results are about **recordings and kinds of music**, not about telling one generated melody
from another. **(inference)** With synthesised voices, a distinct timbre per character is the
cheapest strong identity cue, and it works within a beat. Articulation is a strong "manner" cue in
Prokofiev (detached bird, accented grandfather) **[S156]**. Dynamics and fine timing are what
machines use to identify performers **[S202] [S203]**, but people are less sensitive to them.

**Applies to.** Timbre and effects: the system voices only, since the player's instrument sounds
the lead (see [What the app can express today](#what-the-app-can-express-today)). Articulation and
dynamics: both, as marks on the player's score and as playback of system voices.

**Hard or soft.** A voice's timbre is a fixed choice (hard). Effects can be fixed (a location's
reverb) or vary with intensity. Articulation suits a soft weight ("mostly detached").

**App.** Missing. The v4 README proposes Tone.js-style synths (FM, membrane, noise, metal) and
effects, generated in software with no samples ([v4 README](../../specs/versions/v4/README.md)).
Articulation marks need notation and acknowledgement rules, like ornaments.

### Register and range, including spikes

**What it is.** [Register](lexicon.md#register) is the zone of pitch a passage uses; range is the
whole span an instrument reaches. A **spike** (the owner's word) is a rare, brief jump out of the
usual zone.

**Identity signal.** Register colours a voice: Prokofiev's cat is a clarinet "in a low register"
**[S156]**; the lexicon notes that the same tune sounds darker low and brighter high
([lexicon](lexicon.md#register)). In the leitmotif examples, register usually **varies** with the
situation **[S206]**. Medium overall. **(inference)** A spike can become a signature if it is rare
and always shaped the same way (always a short, accented note, always after a low passage).

**Applies to.** Both. For system voices, register also keeps voices apart: the
[arranging note](arranging-and-roles.md#balance-and-density) gives each voice a lane.

**Hard or soft.** Range limits are hard (the instrument's range is a "law" in Meyer's sense).
Register preference is soft. Spikes are best scheduled (a planned number per phrase) or weighted.

**App.** Today the Register control picks one one-octave window for the whole phrase
([register window](lexicon.md#register-window)); nothing can leave it, so spikes are impossible.
The closest figure is [octave displacement](embellishment-catalogue.md#22-octave-displacement)
(entry 22, not built): a note moved up or down an octave.

### Pitch material: centre, scale, favoured and banned pitches, chromaticism

**What it is.** The **tonal centre** (key note, home note) is the note the music feels at rest on.
The **scale or mode** is the set of notes used around it ([mode](lexicon.md#mode),
[collection](lexicon.md#collection)). A mode's [characteristic note](lexicon.md#characteristic-note)
is the degree that sets it apart. **Favoured** and **banned** pitches are the owner's "loves" and
"hates". **Chromaticism** is the use of notes outside the scale.

**Identity signal.**

- Modes help mark cultures in _The Lord of the Rings_ (the Hijaz scale for the Elves) **[S207]**,
  but were not defining for the winter topic **[S222]**: medium for a kind.
- Chromatic harmony marks villainy and "the other" in _Star Wars_ **[S157]**; the tritone pair
  marks outer space **[S209]**.
- Listeners hear a scale as a framework: Dowling's theory of melody memory pairs an overlearned
  **scale** with the melody's **contour** **[S54]**.
- **(inference)** A banned pitch is heard only through its absence. Listeners will not notice
  "never plays G" unless G is expected and keeps being avoided at moments where it would be natural
  (for example the 7th of A minor leading back to A). A ban is therefore a strong _rule for the
  generator_ and a weak _cue for the listener_; it becomes audible mainly through what replaces it
  (a six-note scale has its own colour, close to a pentatonic or a "folk" sound).

**Applies to.** Both, but with a scope question: does "hates G" bind only the character's own line,
or every voice while the character plays? See [Combining identities](#combining-identities).

**Hard or soft.** Scale and bans fit hard constraints, because a player can check them ("this
character never plays G") and the generator can always satisfy them if enough notes remain.
Favoured pitches fit soft weights. Chromaticism fits soft weights (v3.1's chromatic figure levels).

**App.** Today: Collection (9 seven-note scales and modes); Neutral keeps every note inside it,
Jazz adds brief chromatic approaches. v3.1: a key and mode restriction (guides, never blocks) and
figure levels for the chromatic figures. Missing: banned and favoured pitch classes, five- and
six-note scales ([pentatonic](lexicon.md#pentatonic-scale)), harmonic minor, held
[blue notes](lexicon.md#blue-note).

### Harmony: chords, progressions, harmonic rhythm, cadences, voicings

**What it is.** The **chord vocabulary** is which chords appear (triads, [seventh
chords](lexicon.md#seventh-chord), their qualities: major, minor, diminished). A **progression**
is the order of chords. **[Harmonic rhythm](lexicon.md#harmonic-rhythm)** is how often they
change. A **cadence** is the chord move that ends a phrase. **[Voicing](lexicon.md#voicing)** is
how a chord's notes are spread.

**Identity signal.** Harmony carries **mood and kind** strongly (sevenths for jazz; the Imperial
March's minor-chord pair for evil **[S157]**; the tritone pair for space **[S209]**), but it is the
ingredient most often **changed** to put a known theme in a new situation (Siegfried's call over a
darker chord **[S206]**, "Triumph" in minor **[S214]**). **(inference)** So harmony belongs mostly
to the location and the event, and a character's harmonic habit is best kept to one **signature
progression** used at chosen moments.

**Applies to.** Mostly accompaniment; the melody follows the chords the harmony plan picks.

**Hard or soft.** Chord vocabulary can be hard ("never a major chord") or soft. A signature
progression is scheduled. Harmonic rhythm and cadence habits are soft.

**App.** Today: Harmonic motion (Static, Gentle diatonic, Active diatonic), root-position triads
from fixed four-bar templates, at most two chords per measure
([harmony planner policy](harmony-planner-policy.md)). Missing: sevenths, chosen or chromatic
progressions, voicing choices; the v2 backing plays block chords for every preset.

### Melody: contour, intervals, leaps, signature motif

**What it is.** [Contour](lexicon.md#contour) is the melody's up-and-down shape. The **interval
profile** is which distances between notes are used, and how often ([step](lexicon.md#step),
[skip](lexicon.md#skip), [leap](lexicon.md#leap)). A [motif](lexicon.md#motif) is a short idea
of a few notes; a **signature motif** or leitmotif is one tied to a character; a **lick** is a
stock phrase reused and adapted.

**Identity signal.** Melody carries the identity of a **specific** theme more than anything else:

- People named about half of familiar tunes from the pitches alone (all notes the same length),
  but only 6 % from the rhythm alone (all on one pitch); both together reached about 90 %
  **[S55]**.
- For new melodies, listeners remember mostly the **contour**; for well-known ones they also
  remember the exact intervals **[S54] [S230]**. In Dowling and Fujitani's tests, keeping only the
  contour of a familiar tune gave 59 % recognition and destroying it gave 28 % **[S230]**.
- Jazz identity is a store of reused patterns **[S200]**.

**Applies to.** Both. A signature motif can be in the player's line (the player plays the hero's
theme), in a companion's fills, or in an antagonist's answers.

**Hard or soft.** Leap caps are hard (Leapiness already is); leap tendency and contour are soft.
A signature motif is the clearest case for a **scheduled** constituent: a weight could leave a
phrase without it, and a recognisable character needs it to actually sound, at a planned place
(the opening, an answer, a fill), varied by the transformations of the
[mutation catalogue](mutation-catalogue.md#motif-development-transformations) **(inference)**.

**App.** Today: Contour (Rising, Falling, Arch, Wandering), Leapiness (Smooth to Angular),
Arpeggio chaos. Missing: storing a motif, placing it, and repeating melodic material (the gesture
and answer is a rhythm rule only, [mutation catalogue](mutation-catalogue.md#motif-development-transformations)).

### Rhythm: feel, values, density, syncopation, rests, metre

**What it is.** **Feel** is how the beat is divided: straight (even eighths) or
[swing](lexicon.md#swing) (long-short). **Favoured note values** are which lengths dominate.
**Density** is how many notes per beat; [syncopation](lexicon.md#syncopation) puts stress off the
beat; **rests** give space. **[Metre](lexicon.md#meter)** is the beat grouping (4/4, 3/4, 5/4). A
**signature rhythm** is a fixed rhythmic figure.

**Identity signal.** Mixed, and the sources disagree usefully:

- Rhythm alone is a poor cue for **naming a tune** (6 %, **[S55]**).
- Rhythm is a strong cue for **a player's style**: rhythm features alone identified jazz pianists
  at six times chance **[S204]**.
- Metre can mark a **culture**: Isengard's five-beat rhythm **[S207]**.
- A theme's rhythm can be **kept while its pitches change**: Undyne's theme takes one area's
  pitches and another's rhythm **[S212]**.

**(inference)** Rhythm is the backbone of a character's **manner** (busy or sparse, straight or
swung, pushing ahead of the beat or not) more than of its tune.

**Applies to.** Both.

**Hard or soft.** Metre is hard (a whole piece is in it) and feel is hard per voice. Values,
density, syncopation and rests are soft. A signature rhythm is scheduled.

**App.** Today: Note density, Rhythmic variety, Syncopation and
[Silence density](lexicon.md#silence-density). Missing: swing, metres other than 4/4, tuplets and
stored rhythm patterns ([preset catalogue](preset-catalogue.md#what-no-setting-can-express-today));
v4 plans rhythm ratios (how likely each note value is) and a rhythm editor
([v4 README](../../specs/versions/v4/README.md)).

### Ornamentation

**What it is.** An [ornament](lexicon.md#ornament) is a decoration written as a sign or small
notes: [trill](lexicon.md#trill) (a fast alternation with the note above),
[mordent](lexicon.md#mordent), [turn](lexicon.md#turn), [grace note](lexicon.md#grace-note), and
jazz bends such as [falls](lexicon.md#fall) and [scoops](lexicon.md#scoop). The
[embellishment catalogue](embellishment-catalogue.md#summary-table) lists 31 figures; entries
23–31 are ornaments (family 2).

**Identity signal.** Medium, for a kind: ornaments mark Baroque, Irish (rolls, cuts) and jazz
styles **[S108] [S111]**. **(inference)** For a character, a favoured ornament is an audible habit
("loves trills") if it is frequent enough to notice and placed consistently (for example on long
notes before a cadence), and it makes a good secondary cue next to a signature motif.

**Applies to.** Both.

**Hard or soft.** Soft: "loves trills" is a weight, the very pattern of v3.1's figure levels
([lexicon](lexicon.md#figure-level)). A ban ("never ornaments") is hard and trivial.

**App.** Missing. The representation is settled (D216: a sign with playback expansion, only the
main note expected), but ornaments come in a release after v3.2, grace note first
([lexicon](lexicon.md#ornament)). [Trill](embellishment-catalogue.md#25-trill) is entry 25.

### Tempo

**What it is.** [Tempo](lexicon.md#tempo) is the speed of the beat.

**Identity signal.** Weak alone, and one of the ingredients most often changed by situation
(_Chrono Cross_'s slower "Another World" versions **[S215]**). Earworm tunes tend to have faster
tempi than comparable songs **[S231]**.

**Applies to.** Both, but there is one tempo for the whole ensemble at a time.

**Hard or soft.** Soft. **(inference)** A playable tempo depends on the player, which is why v3.1
presets never hold tempo; an identity can suggest a tempo or a tempo change relative to the
player's, never impose one.

**App.** Tempo is the player's own setting (60–240 BPM). Presets never hold it.

### Phrase and form habits

**What it is.** How an identity organises phrases: **repetition** (saying a motif again),
**[sequence](lexicon.md#sequence)** (the motif again, higher or lower), **question and answer**
(an open phrase followed by a closing one), **endings** (closed on the home note, or open), phrase
length. LaRue calls this level **Growth** **[S195]**.

**Identity signal.** Medium. Meyer's "intra-opus style" is exactly the habits that one piece sets
up and keeps **[S196]**. **(inference)** A character who always answers in sequence, or always ends
open, has a recognisable "way of speaking" even when the notes change.

**Applies to.** Mainly the melody; also call-and-response between voices.

**Hard or soft.** Soft.

**App.** Partly: the rhythm uses a four-bar
[gesture and answer](lexicon.md#gesture-and-answer), and endings can be open
([open ending](lexicon.md#open-ending)). Melodic repetition and sequence are not built.

### Interaction habits and preferred roles

**What it is.** How a voice behaves towards the others: does it double the player, add a
[counter-melody](lexicon.md#counter-melody), [fill](lexicon.md#fill) the rests, answer in
[call and response](lexicon.md#call-and-response), interrupt with a [stab](lexicon.md#stab),
[imitate](lexicon.md#imitation)? Its preferred
[accompaniment role](lexicon.md#accompaniment-role) comes from the
[role catalogue](arranging-and-roles.md#role-catalogue).

**Identity signal.** Medium, as character drawn through behaviour. Lavengood's "novelty layer"
works against the melody through call and response and interjections **[S128]**. Impro-Visor
separates answers that mirror the player (a companion) from answers simpler or harder (a tutor)
**[S166]**. **(inference)** A loyal companion who doubles in thirds and an impatient rival who
answers before the player finishes are recognisable by behaviour before any note is compared.

**Applies to.** Accompaniment (system voices).

**Hard or soft.** Soft (preferred roles with weights), with hard limits from the density budget
(how many voices may sound at once, [arranging note](arranging-and-roles.md#balance-and-density)).

**App.** Missing: v4 starts roles; answering what the player _actually_ played needs
[played-pattern recognition](played-pattern-recognition.md).

## Recognisability and distinctiveness

### How few notes it takes

- **Five to seven notes.** Played note by note, familiar tunes were named after about 5–7 notes;
  the most helpful notes sat at phrase boundaries, on strong beats, and at the turns of an
  up-down-up "zigzag" **[S232]**.
- **Three to six notes for a feeling of familiarity.** In a gating study (the tune revealed a
  little more each time), familiarity appeared after 3–6 notes (about 2 seconds), confident
  recognition about two notes later; musicians needed fewer notes **[S233]**.
- **Contour first, intervals later.** New melodies are remembered mostly by contour; exact
  intervals come with familiarity **[S54] [S230]**.
- **Pitch over rhythm, both best.** Pitch alone about half, rhythm alone 6 %, both about 90 %
  **[S55]**.
- **Timbre within a fraction of a second**, for known recordings and genres **[S227] [S228] [S229]**.

### What makes one identity stand out from the others

- **Distinct relative to the set heard.** For new melodies, motifs that were rare **within the
  set of test melodies** helped correct recognition, while motifs rare compared with pop music in
  general led to false "I've heard it" answers **[S234]**. Distinctiveness is measured against what
  the listener has been hearing.
- **Familiar overall, one unusual detail.** Earworm tunes have **common** overall contours but
  **less common** slopes between their turning points (an unusual interval or leap), and faster
  tempi **[S231]**. The most recognisable song sections sound **typical** of the song and contain
  its repeated material **[S235]**; players of a recall game were poor at predicting what they would
  recall **[S236]**.

### Implications (inference)

1. **Make three constituents strongest:** a **timbre** per character voice (instant, works for
   system voices), a **signature motif** of about 4–7 notes with a clear contour and rhythm (placed
   at phrase starts, strong beats or the answer slot, where recognition is easiest), and **one
   unusual detail** (an interval, a register spike, a favoured ornament).
2. **Distinct within the cast, not exotic.** Since distinctiveness is relative to the set heard,
   what matters is that the protagonist, companions and antagonists differ from **each other**: no
   two characters sharing timbre and register lane, no two motifs with the same opening contour.
   A cast-level check (pairwise distance between identities) is a reasonable later tool.
3. **Repetition builds identity.** Every source shows recognition growing with exposure. The
   signature motif should recur across phrases and sessions, varied but with its contour and
   rhythm kept.
4. **Too restrictive to make music.** Hard constraints stack. "A minor without G" in one
   one-octave window leaves about 7 of the window's 13 pitches; add Smooth leaps, a Falling contour and
   Sparse rests, and the generator's search may run out of candidates. With G banned from the
   harmony too, only four of the seven A-minor triads remain (A minor, B diminished, D minor, F
   major). Each hard constraint should come with a check that enough material remains, and a
   rule for what gives way (see the sibling [identity modelling](identity-modelling.md)).
5. **Too loose to be recognised.** v3.1's figure levels are preferences, and the preset catalogue
   found today's Jazz chromatic notes at only 1.1–1.5 % of notes
   ([preset catalogue](preset-catalogue.md#todays-chromatic-notes-are-barely-audible)). A habit
   heard once in fifty phrases is not an identity. Habits that should be noticed need either a
   strong weight or a scheduled place.

## Combining identities

### What composers do

- **Counterpoint of themes.** At Helm's Deep, the Lothlórien and Isengard themes are set against
  each other, so the battle is heard "in the interplay of musical themes" **[S207]**. Wagner combines
  motifs to mark new dramatic situations **[S206]**.
- **Merging.** Undyne's theme takes the pitches of one theme and the rhythm of another **[S212]**;
  "Dancing Mad" quotes Kefka's theme as a counter-melody inside a larger piece **[S211]**.
- **Layering at a climax.** _Undertale_'s finale "Hopes and Dreams" combines the main theme with
  other motifs (fan wiki report, not a scholarly source) **[S212]**.
- **A theme in the place's clothes.** The same melody is rearranged for each location (Mario)
  **[S160] [S220]**, reharmonised or re-orchestrated by time of day (FFXIV) **[S213]**.
- **A companion as a layer.** Riding Yoshi adds a bongo layer to every level theme **[S160]**;
  adaptive music adds and removes layers by state **[S159]**.
- **What makes simultaneous parts fit.** In _Wind Waker_'s modular music, layers that share
  timbre family, consonance and aligned beats combine smoothly; changes that break them sound
  abrupt **[S237]**.

### Precedence observations (inference)

The sources suggest a natural division of labour, not a strict ranking:

| Layer                   | Usually supplies                                                                                              | Lasts                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Location                | tone (timbre palette, effects), texture and foundation roles, metre or groove, default mode, tempo suggestion | while there                 |
| Character (lead)        | the player's line: pitch habits, contour, leaps, rhythm manner, ornaments, signature motif                    | always                      |
| Companion or antagonist | a system voice: own timbre, role, register lane, signature motif in fills or answers                          | while in the party or fight |
| Event                   | a stinger over the music, or a temporary transformation (minor version, tempo change, added layer)            | a phrase or a few           |
| Status effect           | a perturbation of chosen constituents                                                                         | its duration                |

Points of friction to settle later:

- **Scope of a ban.** If the protagonist "hates G" and the location's mode contains G, does the ban
  bind only the protagonist's line (other voices may still play G), or the whole texture? Composers
  keep a theme's core and let the surroundings change, which suggests the first.
- **Intersection or override.** A location's mode and a character's scale can be combined by
  intersection (only notes both allow) or by letting one win. Intersection keeps both identities
  but can leave too few notes; the result needs the same "enough material" check.
- **Who leads the texture.** With a location's pad, a companion's counter-melody and an antagonist's
  stabs, the density budget (Huron's limit of about three followable voices,
  [arranging note](arranging-and-roles.md#balance-and-density)) decides who is heard.

## Status effects

The endgame lists **blindness**, **tone deaf** and **pitch scare**, changing "both what is displayed
and what is generated" ([endgame](../../specs/vision/endgame.md#status-effects)). In RPGs a status
effect is a temporary change to a character's abilities or conditions **[S238]**.

> **"Tone deaf".** In everyday speech it means "sings out of tune". The clinical condition,
> **congenital amusia**, is a lifelong difficulty in **hearing** small pitch differences, so that
> wrong notes and familiar tunes go unnoticed, while hearing and speech are normal; it affects about
> 1.5 % of people **[S239]**. It is a perception problem, not a singing one.

Everything below is **(inference)**: which constituents each effect could perturb.

| Effect                     | Display (what the player sees)                        | Generation (what is written)                                                                     | Sound (system voices)                          |
| -------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| Blindness                  | notation dimmed, hidden ahead, or shown later         | simpler, more predictable phrases so the player can follow by ear (fewer leaps, more repetition) | the system doubles the lead so it can be heard |
| Tone deaf                  | perhaps note heads without exact pitch (contour only) | flattened contour, fewer different pitches, more repeated notes; harmony reduced to a drone      | voices detuned or blurred; harmony thinned     |
| Pitch scare                | high notes marked as "scary"                          | register pushed down or narrowed; leaps capped; certain pitches temporarily banned               | sudden high stabs from the antagonist          |
| Confusion (not listed)     | measures shuffled in display order                    | motif inverted or reversed (inversion, retrograde)                                               | voices swap roles                              |
| Slow or haste (not listed) | none                                                  | density down or up                                                                               | tempo suggestion down or up at the next phrase |
| Silence (not listed)       | rests highlighted                                     | Silence density raised                                                                           | a companion drops out                          |

Two cautions:

- **Never penalise (D66).** An effect may change the music and its look, but should not make
  acknowledgement stricter or grade the player; the open "win and lose" tension in the endgame
  stays open.
- **Display effects need their own layer.** The endgame already notes that display "never alters"
  the phrase today; blindness changes what is seen, not what is generated, and needs a deliberate
  display-effect layer ([endgame](../../specs/vision/endgame.md)).

## Learning an identity from play

Could the player's own playing define their identity? The research says it is possible in
principle (brief survey only):

- **Systems that learn a player's style.** Pachet's Continuator learns a musician's style live with
  a Markov model (what tends to follow what) and continues in that style **[S57]**. Conklin and
  Witten's "multiple viewpoint" models learn several features at once (pitch, interval, duration)
  and combine a long-term model of a style with a short-term model of the current piece **[S240]**.
  OMax learns and recombines a player's sequences with a factor oracle **[S167]**.
- **What identifies a player.** Rhythm features identify jazz pianists **[S204]**; repeated
  interval patterns make up much of a soloist's vocabulary **[S200]**; pitch-class counts give a
  player's favoured notes and key (the method of the
  [key and mode estimation](key-and-mode-estimation.md) note).

**(inference)** The app already captures the needed material: the notes the player plays, with
onset, length and pitch. From them it could derive an **identity sketch**: favoured pitch classes,
an interval histogram (steps against leaps), contour habits, favoured note values and rests, and
recurring short patterns (n-grams of intervals, as in Norgaard's method). This links to
[played-pattern recognition](played-pattern-recognition.md#built-in-versus-player-defined): a
pattern the player plays often could become their signature motif, much as _Ocarina of Time_ lets a
player compose a song for the Scarecrow **[S87]**. Any such learning must be opt-in, visible and
stored on the player's device (D66, and the v3 rules for played notes).

## Worked examples

All five are **(inference)**: identities written as constituent lists, to test the catalogue.
"Today" means the closest v3.0/v3.1 setting.

### 1. The owner's scale-bound character ("the Purist", working name)

> Uses only the A scale, hates G, loves trills, has a gimmick.

| Constituent        | Value                                                                                              | Kind      | Today                    |
| ------------------ | -------------------------------------------------------------------------------------------------- | --------- | ------------------------ |
| Tonal centre, mode | A natural minor (A Aeolian); A major makes "hates G" empty (see the wording note)                  | hard      | Written key + Collection |
| Banned pitch       | G (the 7th of A minor): a six-note scale A B C D E F                                               | hard      | missing                  |
| Harmony            | chords without G only: A minor, D minor, F major, B diminished (if the ban covers harmony)         | hard      | missing                  |
| Ornament           | trills on long notes, about one per phrase, preferably before the last note                        | soft      | missing                  |
| Signature motif    | 5 notes, e.g. A–C–E–D–C, a rising arpeggio and a falling step answer, opening each phrase it leads | scheduled | missing                  |
| Register           | Middle                                                                                             | soft      | Register                 |
| Timbre (own voice) | a clear, bright synth, e.g. a flute-like FM sound, when the app plays this character               | hard      | missing                  |
| Rhythm             | straight, Eighth density, few rests                                                                | soft      | rhythm controls          |
| Interaction        | prefers doubling the player in thirds; answers a phrase by repeating its first motif               | soft      | missing                  |

**Risk.** The ban, the Middle window and the A minor collection leave few notes. Without G, a
melody cannot reach the home note A from the step below (G–A); it must arrive from above (B–A) or
by a leap (E–A), and that arrival itself becomes a recognisable habit.

### 2. The owner's dark character ("the Undertow", working name)

> Lower tones, punctuated by sharp, brief high-pitched notes.

| Constituent     | Value                                                                                      | Kind      | Today                        |
| --------------- | ------------------------------------------------------------------------------------------ | --------- | ---------------------------- |
| Register        | Low window for most notes                                                                  | soft      | Register Low                 |
| Register spikes | 1–2 per phrase: a single sixteenth or eighth note an octave or more above, then back down  | scheduled | missing                      |
| Articulation    | spikes short and accented; low notes held (legato)                                         | soft      | missing                      |
| Mode            | Phrygian or Aeolian (minor modes; Phrygian's lowered 2nd gives a darker colour)            | guiding   | Collection                   |
| Melody          | Falling or Wandering contour; mostly steps in the low zone, the spike is the only big leap | soft      | Contour, Leapiness           |
| Rhythm          | sparse, Breath-heavy rests; spikes on off-beats                                            | soft      | Silence density, Syncopation |
| Timbre          | a dark, filtered bass synth for the low line; a metallic "ping" for the spikes             | hard      | missing                      |
| Tone            | low-pass filter (removes brightness), long reverb                                          | soft      | missing                      |
| Signature       | the spike itself, always shaped the same way                                               | scheduled | missing                      |

**Note.** Spikes break today's one-window rule and the leap-recovery rule ("a large leap must turn
back by a small move"). A spike of an octave that returns to the low zone is a large leap _and_ a
large return; it needs an explicit exception, the way octave displacement does.

### 3. A location: the Frozen Pass

Built on Lavengood and Williams's winter topic **[S222]**.

| Constituent | Value                                                                                      | Kind | Today           |
| ----------- | ------------------------------------------------------------------------------------------ | ---- | --------------- |
| Tone        | heavy reverb on every system voice                                                         | hard | missing         |
| Timbre      | metallic, bell-like pad and arpeggios (celesta or glockenspiel-like FM); plucked bass      | hard | missing         |
| Texture     | an arpeggiated ostinato (a repeated broken chord) as the main accompaniment role; no drums | hard | missing         |
| Harmony     | Static or Gentle diatonic; slow harmonic rhythm                                            | soft | Harmonic motion |
| Mode        | free: the topic is not tied to major or minor                                              | none | Collection      |
| Register    | accompaniment high and light, bass sparse                                                  | soft | missing         |
| Tempo       | a suggestion to slow down slightly                                                         | soft | missing         |

The characters keep their own melody; the place changes only their surroundings.

### 4. An event: Victory

| Constituent | Value                                                                                        | Kind     | Today   |
| ----------- | -------------------------------------------------------------------------------------------- | -------- | ------- |
| Form        | a fixed stinger of one or two measures after the last phrase, always identical               | fixed    | missing |
| Melody      | rising arpeggio of the home chord ending on the home note, with a short repeated-note pickup | fixed    | missing |
| Harmony     | major; a closing cadence on the home chord, whatever the location's mode was                 | override | missing |
| Timbre      | brass-like synth                                                                             | hard     | missing |
| Rhythm      | short-short-short-long pickup into the arrival                                               | fixed    | missing |

Exact repetition is the point here, as with the _Final Fantasy_ victory fanfare **[S210]**: this is
the one constituent list in which the generator should not vary.

### 5. An antagonist: the Hollow King

| Constituent     | Value                                                                                                                                             | Kind      | Today                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------- |
| Signature motif | the protagonist's motif turned upside down ([inversion](lexicon.md#melodic-inversion)), in low brass                                              | scheduled | missing                          |
| Harmony         | a chromatic progression at his entrances: two minor chords a major third apart, after the Imperial March **[S157]**, or a tritone pair **[S209]** | scheduled | missing                          |
| Mode            | Phrygian or minor; chromatic approaches favoured                                                                                                  | soft      | Collection, figure levels (v3.1) |
| Register        | low lane, below the player's window                                                                                                               | hard      | missing                          |
| Timbre          | brass-like with distortion                                                                                                                        | hard      | missing                          |
| Interaction     | contrast and respond: stabs in the player's rests; answers in fights transform the player's last phrase toward chromatic notes                    | soft      | missing                          |
| Phases          | later phases keep the motif and change the surface: faster, denser, then a minor-key "Triumph"-style version of the main theme **[S214]**         | event     | missing                          |

## Open questions

1. **Which constituents does an identity hold first?** A minimal identity could be: timbre, register
   lane, a pitch restriction, a signature motif and a preferred role. Is that the right first set?
2. **Hard, soft and scheduled.** Is a three-kind model (constraint, weight, scheduled signature)
   wanted, or should everything be a weight with "never" and "always" as its ends?
3. **Scope of a ban.** Does "hates G" bind the character's line only, or every voice while the
   character leads?
4. **Precedence.** When location, character, event and status effect disagree (mode, tempo,
   register), which wins, and is intersection the default?
5. **The player's line versus system voices.** How much identity can the player's own line carry,
   given that its timbre is the player's instrument? Should the app double the lead softly to
   give it the character's sound?
6. **Recognition goal.** Should a player be able to name a character from its motif after a few
   sessions? If so, how often must the motif sound, and is a listening test needed?
7. **Cast distinctiveness.** Should the game check that no two identities are too close (same
   timbre, same register, same motif contour)?
8. **Fixed stingers.** Are exact, never-varied figures (victory, level-up) acceptable in a generator
   whose principle is fresh material?
9. **Spikes and leap recovery.** Should a register spike be a new figure, an exception to recovery,
   or an octave displacement?
10. **Status effects.** Which effects change display, which change generation, and which change only
    sound? How are they kept from penalising (D66)?
11. **Learning from play.** Is a player-derived identity sketch wanted, and where is it shown and
    stored?
12. **Owner's vocabulary.** Keep "tone" for timbre plus effects, or adopt "timbre" and "effects" in
    the spec?

## Lexicon candidates

Merged into the [lexicon](lexicon.md) on 2026-10-11, partly in its new [Style and identity](lexicon.md#style-and-identity) category: [Musical style](lexicon.md#musical-style) (with dialect), [Idiolect](lexicon.md#idiolect), [Musical topic](lexicon.md#musical-topic), [Fanfare](lexicon.md#fanfare), [Theme](lexicon.md#theme) (with theme transformation), [Timbre](lexicon.md#timbre), [Audio effect](lexicon.md#audio-effect), [Articulation](lexicon.md#articulation), [Dynamics](lexicon.md#dynamics), [Hexatonic scale](lexicon.md#hexatonic-scale), and the internal [Musical identity](lexicon.md#musical-identity) and [Register spike](lexicon.md#register-spike). Amusia is a medical term met once, so it is explained only in this document. The existing entries [Leitmotif](lexicon.md#leitmotif), [Signature figure](lexicon.md#signature-figure), [Stinger](lexicon.md#stinger) and [Register](lexicon.md#register) gained sources or related links.

## Sources

This document's sources are registered in [research sources](research-sources.md), in the block
[Musical Identity (endgame)](research-sources.md#musical-identity-endgame) (merged on 2026-10-11).
They are reference only: no text is copied or closely paraphrased. All URLs were requested on
2026-10-11.

- New for this document: S195–S241. Of these, S205 (jSymbolic 2.2), S238 (status effect) and S240
  (Conklin and Witten) are also cited by [identity modelling](identity-modelling.md).
- Already in the register and cited above: S54 (Dowling, scale and contour), S55 (Hébert and
  Peretz), S57 (the Continuator), S82 (motif and leitmotif), S87 (_Ocarina of Time_ songs), S92
  (_Theatrhythm Final Fantasy_, which also holds its field, battle and event stages), S108 (Irish
  ornamentation), S111 (ornament), S128 (Lavengood, novelty layer), S135 (drone), S155 (leitmotif,
  Britannica), S156 (_Peter and the Wolf_), S157 (_Star Wars_ themes), S158 (music of _Final
  Fantasy VI_), S159 (adaptive music), S160 (_Super Mario World_ ground theme), S161 (sting), S166
  (Impro-Visor active trading), S167 (OMax) and S181 (Wwise stingers).
