# Style Atlas: Popular, Electronic and Game Music

Status: research (2026-10-11), style atlas groundwork; not settled policy.

## Purpose

This file describes popular, electronic and game-music styles in terms the generator could act on:
**tuning** (soft weights), **restriction** (hard constraints) and **manipulation** (transformations
and planned material), plus the accompaniment roles each style would want in v4. It reuses the
vocabulary of the [draft identity schema](../identity-modelling.md#draft-identity-schema-inference),
the [constituent catalogue](../musical-identity.md#constituent-catalogue) and the
[role catalogue](../arranging-and-roles.md#role-catalogue), and it builds on the
[preset catalogue](../preset-catalogue.md#candidate-built-in-presets) and the
[style-pack recommendation](../generation-breadth-review.md#recommendation-inference). The game
entries get extra depth because the endgame is a Theatrhythm-like rhythm RPG (S92). Everything
stays procedurally generated; each entry says in one line what that costs. Statements marked
**(inference)** are the author's reading, not a source's claim.

| #   | Style                                                     | Family     | Fidelity today | Fidelity with capabilities |
| --- | --------------------------------------------------------- | ---------- | -------------- | -------------------------- |
| 1   | [Pop](#pop)                                               | Popular    | hint           | convincing                 |
| 2   | [Classic rock](#classic-rock)                             | Popular    | hint           | recognisable               |
| 3   | [Punk](#punk)                                             | Popular    | hint           | recognisable               |
| 4   | [Heavy metal](#heavy-metal)                               | Popular    | hint           | recognisable               |
| 5   | [Country](#country)                                       | Popular    | hint           | recognisable               |
| 6   | [Reggae](#reggae)                                         | Popular    | none           | recognisable               |
| 7   | [Hip-hop (boom bap)](#hip-hop-boom-bap)                   | Popular    | none           | hint                       |
| 8   | [House and techno](#house-and-techno)                     | Electronic | none           | recognisable               |
| 9   | [Synthwave](#synthwave)                                   | Electronic | none           | recognisable               |
| 10  | [Ambient and drone](#ambient-and-drone)                   | Electronic | hint           | recognisable               |
| 11  | [Lo-fi hip-hop](#lo-fi-hip-hop)                           | Electronic | none           | recognisable               |
| 12  | [Chiptune (8-bit)](#chiptune-8-bit)                       | Game       | hint           | convincing                 |
| 13  | [JRPG town and village](#jrpg-town-and-village)           | Game       | hint           | convincing                 |
| 14  | [JRPG overworld and field](#jrpg-overworld-and-field)     | Game       | hint           | recognisable               |
| 15  | [JRPG dungeon](#jrpg-dungeon)                             | Game       | hint           | recognisable               |
| 16  | [JRPG battle](#jrpg-battle)                               | Game       | hint           | recognisable               |
| 17  | [JRPG boss and final battle](#jrpg-boss-and-final-battle) | Game       | none           | recognisable               |
| 18  | [JRPG victory fanfare](#jrpg-victory-fanfare)             | Game       | none           | convincing                 |
| 19  | [Epic trailer and battle](#epic-trailer-and-battle)       | Game, film | hint           | recognisable               |

**Reading the fidelity columns.** "Today" means the v3.0 generator with the best control settings
and today's bass-and-block-chord backing. "With capabilities" means after the capabilities listed
in the entry exist. For the player's own line, a style that lives mostly in the drums, the sound or
the backing (reggae, house, hip-hop) can never be more than its accompaniment allows.

## Popular music

### Pop

- **Family / place / era:** Anglo-American popular song, 1950s to now. **One line:** a singable,
  mostly stepwise tune over four repeating chords, with a catchy hook and a steady backbeat.
- **Recognise it by:** the four-chord loops I–V–vi–IV ("singer/songwriter") and I–vi–IV–V
  ("doo-wop") (S113); a short hook repeated in the chorus (S235, S236); a backbeat on 2 and 4
  (S139); pushed notes that anticipate the beat, often in 3 + 3 + 2 groupings (S46); four-bar
  phrases inside verse–chorus form (S114, S340).
- **Today's controls:** the catalogue's [Pop song](../preset-catalogue.md#4-pop-song) candidate:
  Neutral, Gentle diatonic, Eighth, Heavily varied, Occasional offbeats, Conversational, Arch,
  Middle; would also set Major, Lift, Shaped, Varied. One Gentle template can yield I–vi–IV–V;
  I–V–vi–IV cannot occur, because degree 5 comes only at the end of the phrase.
- **Tuning (soft weights):** steps and thirds strongly favoured, leaps up to a sixth rare and
  resolved by step; chord tones on beats 1 and 3; anticipations (a note arriving an eighth early)
  favoured (S46); appoggiatura favoured (catalogue); register spread narrow (about a ninth, a
  singer's range) **(inference)**; tempo 90–120 BPM.
- **Restriction (hard constraints):** Major (or Aeolian for the minor four-chord loop vi–IV–I–V);
  diatonic triads; no chromatic notes; 4/4.
- **Manipulation (transformations / planned material):** progression template chosen per phrase
  (I–V–vi–IV, I–vi–IV–V, vi–IV–I–V) (S113); a **hook**, a one- or two-bar motif placed in the
  chorus phrase and repeated exactly (S235); verse and chorus as sections that recur over several
  phrases, the chorus higher and denser (S340).
- **Accompaniment (v4 roles):** root bass in eighths or quarters; pad or comping chords on the
  offbeats; drums with backbeat; a counter-melody or octave doubling in the chorus (S127).
  Timbres: piano, clean or overdriven guitar, synth pad.
- **Capabilities needed:** `progression-templates`, `motif-repetition-development`,
  `NEW:multi-phrase-form`, `drums`, `accompaniment-roles`, `rhythm-cells-timelines`,
  `timbre-presets`.
- **Fidelity:** today hint (the catalogue's "fair": the melody is pop-like, but nothing marks it
  as pop rather than folk); with capabilities convincing. Lost: lyrics and the singer's voice, which
  carry most of a pop song's identity.

### Classic rock

- **Family / place / era:** British and American guitar rock, mid-1960s to 1980s. **One line:**
  guitar riffs and power chords over a loud backbeat, with blues and modal flavour.
- **Recognise it by:** the Mixolydian **subtonic** chord, ♭VII (the chord a whole step below the
  tonic), in the shuttle I–♭VII and the **double plagal** ♭VII–IV–I (S338, S341); minor-pentatonic
  melodies and riffs over major chords (S341, S339); power chords and parallel major triads on
  pentatonic roots, favoured by distorted guitar (S339, S342); a repeated riff (S83); backbeat (S139).
- **Today's controls:** Collection Mixolydian with Harmonic motion Gentle: the modal plan's colour
  chord must contain ♭7, so it can be ♭VII and give I–I–♭VII–I, a true subtonic shuttle
  ([modal motion candidates](../harmony-planner-policy.md#modal-motion-candidates))
  **(inference)**. Eighth, Occasional offbeats, Shaped, Middle.
- **Tuning (soft weights):** minor-pentatonic pitch classes favoured (1, ♭3, 4, 5, ♭7); the ♭3
  bent towards 3 on long notes; repeated notes and short two-to-four-note cells; syncopation
  Occasional offbeats; tempo 100–140 BPM **(inference)**.
- **Restriction (hard constraints):** Mixolydian, Ionian with ♭VII, Aeolian or pentatonic
  collections; triads or power chords only (no sevenths except the blues V7); 4/4.
- **Manipulation (transformations / planned material):** progression templates I–♭VII–IV–I and
  ♭VII–IV–I (S338, S341), also I–IV–V; a one-bar riff repeated with the chord (AAAB, the fourth bar a
  fill) **(inference)**; borrowed ♭III, ♭VI, ♭VII in a major key (S342).
- **Accompaniment (v4 roles):** riff (bass doubling the guitar riff an octave down); power-chord
  stabs; drums with backbeat and crash on bar 1; bass on roots in eighths. Timbres: distorted
  guitar, organ, bass guitar.
- **Capabilities needed:** `pentatonic-scales`, `blues-scale-blue-notes`, `slides-bends`,
  `NEW:modal-mixture`, `progression-templates`, `parallel-harmony`,
  `motif-repetition-development`, `drums`, `accompaniment-roles`, `timbre-presets`,
  `NEW:audio-effects`.
- **Fidelity:** today hint (the ♭VII shuttle is already there in Mixolydian); with capabilities
  recognisable. Lost: distortion and bends realism, the guitarist's improvised feel.

### Punk

- **Family / place / era:** UK and US, mid-1970s. **One line:** fast, short, loud songs on a few
  distorted power chords, with a shouted, narrow-range tune.
- **Recognise it by:** fast tempo and short songs (S347); distorted power chords, a "buzzsaw drone"
  (S347); simple verse–chorus forms in 4/4 (S347); snarled or shouted vocals (S347).
- **Today's controls:** Major or Mixolydian; Harmonic motion Active diatonic; Note density Eighth;
  Rhythmic variety Strict; Syncopation Straight; Silence density Sparse; Leapiness Smooth; Register
  Middle; tempo 160–220 BPM (inside today's range).
- **Tuning (soft weights):** repeated notes and steps strongly favoured; range about a sixth;
  steady eighths with few rests; chord roots on strong beats **(inference)**.
- **Restriction (hard constraints):** I, IV, V, ♭VII and vi only, played as power chords; no
  chromatic notes; no ornaments **(inference)**.
- **Manipulation (transformations / planned material):** two-bar chord loop repeated twice per
  phrase; a chorus "gang" line that repeats one short motif **(inference)**.
- **Accompaniment (v4 roles):** power chords in straight downstroked eighths; bass doubling roots in
  eighths; drums with backbeat at high tempo. Timbres: distorted guitar, bass, drums.
- **Capabilities needed:** `parallel-harmony`, `progression-templates`, `drums`,
  `accompaniment-roles`, `timbre-presets`, `NEW:audio-effects`.
- **Fidelity:** today hint (fast, plain eighths fit); with capabilities recognisable. Lost: the
  attitude of the voice, which is most of punk.

### Heavy metal

- **Family / place / era:** UK and US, late 1960s on (classic metal to mid-1980s). **One line:**
  heavy, distorted power-chord riffs in dark modes, often over a pedal note.
- **Recognise it by:** Aeolian and Phrygian modes, with progressions such as i–♭VI–♭VII and the
  i–♭II relation (S343); power chords on the fifth, low and distorted (S343, S344); a pedal point (a held
  or repeated low note) under changing chords (S343); the gallop, an eighth plus two sixteenths
  (S345, S346); tritone and chromatic relations (S343).
- **Today's controls:** Collection Phrygian or Aeolian. Phrygian's colour degree is ♭2, so a modal
  plan can place ♭II and give i–♭II–i **(inference)**. Sixteenth or Eighth; Strict; Straight;
  Register Low; Leapiness Shaped.
- **Tuning (soft weights):** ♭2, ♭5 (the tritone) and ♭6 weighted up as colour notes; chord roots
  on the downbeat; repeated low notes between melody notes (pedal-point riffing); tempo from slow
  to fast (S343) **(inference for the weights)**.
- **Restriction (hard constraints):** Aeolian, Phrygian (harmonic minor and Phrygian dominant for
  "neoclassical" metal **(inference)**); power chords; 4/4 with occasional odd bars.
- **Manipulation (transformations / planned material):** gallop rhythm cell (S345); pedal riff: the
  tonic repeated in sixteenths with melody notes on the beats **(inference)**; progression
  templates i–♭VI–♭VII–i and i–♭II–i (S343); riff repeated and transposed (sequence).
- **Accompaniment (v4 roles):** palm-muted power-chord riff doubled by the bass; drums with double
  kick in the gallop or sixteenths; pedal bass. Timbres: distorted guitars, bass, drums.
- **Capabilities needed:** `parallel-harmony`, `drone-pedal`, `rhythm-cells-timelines`,
  `harmonic-minor`, `exotic-scales`, `progression-templates`, `sequences`, `articulation-dynamics`,
  `drums`, `accompaniment-roles`, `timbre-presets`, `NEW:audio-effects`, `tempo-range` (blast-beat
  speeds).
- **Fidelity:** today hint (the modes are exact); with capabilities recognisable. Lost: the weight
  of distortion; Lilja argues distortion itself shapes metal's chord choices (S344).

### Country

- **Family / place / era:** southern and rural United States, 1920s on. **One line:** a plain,
  singable major-key tune over three chords, with a walking "train" rhythm and twangy strings.
- **Recognise it by:** fiddle, banjo and steel guitar timbres (S349); the train beat, steady eighths
  with accented snare (S348); the I–IV–V progression and root–fifth alternating bass
  **(inference)**; major-pentatonic melodies with slides **(inference)**; shuffle and country
  waltz grooves (S348).
- **Today's controls:** Major; Gentle diatonic (I–I–IV–V is a Gentle template); Eighth;
  Slightly varied; Straight; Conversational; Arch; Middle.
- **Tuning (soft weights):** major-pentatonic degrees (1, 2, 3, 5, 6) favoured, 4 and 7 as passing
  notes; slides into the 3rd from ♭3; steps and thirds; tempo 80–160 BPM **(inference)**.
- **Restriction (hard constraints):** I, IV, V (V7 allowed); Major; 4/4 or 3/4.
- **Manipulation (transformations / planned material):** progression templates I–IV–I–V and
  I–I–IV–V; country waltz in 3/4 (S348); fills between vocal phrases (call and response with the
  steel guitar) **(inference)**.
- **Accompaniment (v4 roles):** root–fifth bass on 1 and 3 with chord strums on 2 and 4
  ("boom-chick"); train beat or shuffle drums (S348); fills on the fiddle or steel guitar in the
  lead's rests. Timbres: acoustic guitar, fiddle, steel guitar, banjo.
- **Capabilities needed:** `pentatonic-scales`, `slides-bends`, `progression-templates`,
  `triple-meter`, `swing-feel`, `drums`, `accompaniment-roles`, `timbre-presets`.
- **Fidelity:** today hint; with capabilities recognisable. Lost: twang (timbre and voice).

### Reggae

- **Family / place / era:** Jamaica, late 1960s on, out of ska and rocksteady. **One line:** a
  slow, heavy groove where guitar or keyboard chords chop the offbeats and the bass carries the
  tune. A four-bar generator gives an **approximation inspired by** reggae: it misses the
  microtiming of the groove, dub mixing and the Rastafarian song tradition.
- **Recognise it by:** the **skank**, short damped chords on the offbeats (S350); the **one drop**,
  kick and cross-stick together on beat 3 with beat 1 empty (S351); a heavy, central bass line that
  often moves root to fifth (S350); a tempo slower than ska, often felt in half time (S350).
- **Today's controls:** none close for the groove. For the lead: Major, Dorian or Aeolian; Static
  or Gentle; Eighth; Occasional offbeats; Breath-heavy.
- **Tuning (soft weights):** offbeat onsets favoured; phrases starting after beat 1; rests on
  beat 1; narrow range; tempo 60–90 BPM **(inference)**.
- **Restriction (hard constraints):** two-chord vamps (I–IV, i–iv, i–♭VII) or I–IV–V
  **(inference)**; 4/4; no swing.
- **Manipulation (transformations / planned material):** one-drop, rockers (kick on every beat) or
  steppers (kick on every eighth) timeline (S351); skank pattern on the "and" of each beat (S350);
  a two-bar bass riff repeated.
- **Accompaniment (v4 roles):** bass riff (foundation, loud, low); skank (stabs on offbeats);
  organ shuffle (S350); one-drop drums. Timbres: bass guitar, clean guitar, organ.
- **Capabilities needed:** `drums`, `accompaniment-roles`, `rhythm-cells-timelines`,
  `modal-harmony`, `NEW:loop-repetition`, `timbre-presets`, `NEW:audio-effects`.
- **Fidelity:** today none; with capabilities recognisable. Lost: groove microtiming and dub
  effects; the style lives in the backing, not in the player's line.

### Hip-hop (boom bap)

- **Family / place / era:** African-American and Latino New York, 1980s–1990s golden age.
  **One line:** a looped sample over a hard kick and snare, under rapped vocals.
- **Recognise it by:** the boom-bap drums, kick on 1 and 3, snare on 2 and 4 (S352); a short sampled
  loop, often from vinyl (S352); swung sampler quantisation, offbeats nudged late (S352); a
  "loping midtempo groove" (S352); the rapper as the lead.
- **Today's controls:** none close. For an instrumental hook: Minor or Dorian, Static, Eighth,
  Occasional offbeats, Breath-heavy, Low or Middle.
- **Tuning (soft weights):** very sparse lead; short motifs of two to four notes; minor-pentatonic
  and Dorian colour; swung sixteenths; tempo 80–100 BPM **(inference)**.
- **Restriction (hard constraints):** one or two chords per phrase (seventh chords from a jazz or
  soul sample); 4/4 **(inference)**.
- **Manipulation (transformations / planned material):** a one- or two-bar sample loop repeated
  exactly; the lead as a hook that repeats every phrase **(inference)**.
- **Accompaniment (v4 roles):** boom-bap drums; looped chord stab or sample phrase; bass doubling
  the kick. Timbres: dusty piano or horn stabs, sub bass.
- **Capabilities needed:** `drums`, `swing-feel`, `NEW:loop-repetition`, `seventh-chords`,
  `accompaniment-roles`, `timbre-presets`, `NEW:audio-effects`.
- **Fidelity:** today none; with capabilities hint, at most recognisable as an instrumental beat.
  Lost: rap, which is the style's lead, and the sampled sound itself.

## Electronic music

### House and techno

- **Family / place / era:** house from Chicago, techno from Detroit, mid-1980s. **One line:**
  repetitive dance loops on a four-on-the-floor kick, with little melody and slow change.
- **Recognise it by:** the **four-on-the-floor** kick on every beat (S355, S353); offbeat hi-hats and
  claps on 2 and 4 (S353); short repeating loops and eight-bar sections (S353, S354); tempo 115–130
  (house) and 120–150 BPM (techno) (S353, S354); timbre and synthesis over harmony (S354).
- **Today's controls:** Static or Gentle (a modal two-chord shuttle such as Dorian i–IV, S338);
  Dorian or Aeolian; Sixteenth or Eighth; Strict; Occasional offbeats; Conversational.
- **Tuning (soft weights):** repeated short figures; narrow range; offbeat onsets; syncopated stabs
  **(inference)**.
- **Restriction (hard constraints):** one or two chords; minor modes for techno, major-seventh or
  minor-seventh vamps for house; 4/4 **(inference)**.
- **Manipulation (transformations / planned material):** one-bar loop repeated with one element
  changed each phrase; build-ups that add layers over 8–16 bars and drops that remove them
  (S353, inference for the build); filter sweeps.
- **Accompaniment (v4 roles):** four-on-the-floor drums; offbeat bass (house) or rolling
  sixteenth bass (techno); chord stabs; pad. Timbres: drum machines (TR-808, TR-909), analogue
  bass, piano stabs (S354).
- **Capabilities needed:** `drums`, `accompaniment-roles`, `NEW:loop-repetition`,
  `NEW:layer-build`, `modal-harmony`, `seventh-chords`, `timbre-presets`, `NEW:audio-effects`.
- **Fidelity:** today none; with capabilities recognisable. Lost: the DJ-mix scale of change (one
  idea over minutes, not four bars).

### Synthwave

- **Family / place / era:** a 2000s–2010s retro genre honouring 1980s film, game and pop
  soundtracks (S356). **One line:** minor-key, arpeggiated synth music with drum machines and
  1980s sounds.
- **Recognise it by:** "ornately repetitive synth patterns" and drum machines (S356); 1980s synth
  timbres, such as the DX7 electric piano that defines the "'80s" sound (S357, S128); mostly
  instrumental (S356); tempo 80–118 or 128–140 BPM (S356); influences from Carpenter, Vangelis, Jarre
  and Tangerine Dream (S356).
- **Today's controls:** Aeolian or Dorian; Gentle or Active; Eighth; Slightly varied; Straight;
  Conversational; Arch; Varying.
- **Tuning (soft weights):** long held lead notes over busy arpeggios; leaps of a fourth and fifth;
  tempo 90–118 BPM **(inference)**.
- **Restriction (hard constraints):** Aeolian; triads and add9 or sus chords **(inference)**.
- **Manipulation (transformations / planned material):** the Aeolian shuttle i–♭VII–♭VI–♭VII and
  the cadence ♭VI–♭VII–i (S338); an eighth- or sixteenth-note arpeggiated bass ostinato
  **(inference)**.
- **Accompaniment (v4 roles):** arpeggiated bass ostinato; pad; gated-reverb snare backbeat;
  counter-melody arpeggio. Timbres: analogue-style saw pads, FM electric piano, drum machine
  **(inference)**.
- **Capabilities needed:** `NEW:modal-mixture`, `progression-templates`, `accompaniment-roles`,
  `drums`, `timbre-presets`, `NEW:audio-effects`.
- **Fidelity:** today none; with capabilities recognisable. Timbre is most of the style, and
  synthesised timbre is cheap here.

### Ambient and drone

- **Family / place / era:** Brian Eno's ambient, late 1970s on, and drone music. **One line:**
  slow-changing layered sound with no steady beat, meant to be "as ignorable as it is
  interesting" (S358).
- **Recognise it by:** no steady beat or structured melody (S358); drones and sustained notes (S358,
  S135); slight harmonic change over a long time (S358); loops of different lengths that rarely
  realign (S359); heavy reverb.
- **Today's controls:** Static; Note density Quarter; Strict; Straight; Breath-heavy; Arch;
  Leapiness Smooth; tempo 60 BPM; Lydian or Ionian.
- **Tuning (soft weights):** long notes (half and whole); steps and fifths; rests between notes;
  narrow dynamic arc **(inference)**.
- **Restriction (hard constraints):** one chord or one mode; no syncopation; notes as long as the
  grid allows **(inference)**.
- **Manipulation (transformations / planned material):** drone on the tonic and fifth; several
  short loops of different lengths (Eno's incommensurable cycles, S359) as accompaniment layers,
  which suits a seeded, deterministic process **(inference)**.
- **Accompaniment (v4 roles):** drone; pad; sparse echo of the lead; no drums. Timbres: soft pads,
  bell, piano with long reverb.
- **Capabilities needed:** `drone-pedal`, `modal-harmony`, `NEW:long-tones`,
  `NEW:loop-repetition`, `accompaniment-roles`, `timbre-presets`, `NEW:audio-effects`.
- **Fidelity:** today hint; with capabilities recognisable. Lost: free time; the player still reads
  a metered 4/4 line, which ambient does not have.

### Lo-fi hip-hop

- **Family / place / era:** online beat scene, 2000s–2010s, after J Dilla and Nujabes (S360).
  **One line:** slow, jazzy, deliberately worn-sounding beats for background listening.
- **Recognise it by:** "poky tempos" and piano or guitar melodies (S360); jazz roots (S360); vinyl
  hiss and deliberate audio imperfection (S360); swung, behind-the-beat drums **(inference)**;
  seventh and ninth chords **(inference)**.
- **Today's controls:** Jazz grammar; Dorian or Major; Static or Gentle; Eighth; Slightly varied;
  Occasional offbeats; Breath-heavy; Falling; Middle; tempo 70–90 BPM.
- **Tuning (soft weights):** chord-tone arpeggios favouring 7ths and 9ths; chromatic approach
  default; short phrases with long rests **(inference)**.
- **Restriction (hard constraints):** seventh chords; two-chord or ii–V–I loops; 4/4
  **(inference)**.
- **Manipulation (transformations / planned material):** a two-bar chord loop; a short melodic
  loop repeated; swing **(inference)**.
- **Accompaniment (v4 roles):** comping in sevenths; boom-bap drums, softened and swung; walking or
  root bass. Timbres: electric piano, nylon guitar, filtered drums, vinyl crackle.
- **Capabilities needed:** `seventh-chords`, `swing-feel`, `drums`, `NEW:loop-repetition`,
  `accompaniment-roles`, `timbre-presets`, `NEW:audio-effects`, `progression-templates`.
- **Fidelity:** today none; with capabilities recognisable. Lost: the sampled sound and its noise
  texture, unless effects imitate it.

## Game music

### Chiptune (8-bit)

- **Family / place / era:** game consoles and home computers, late 1970s–1990s, and the later
  chip-music scene. **One line:** fast, bright music on a few simple waveforms, with arpeggios
  standing in for chords.
- **Recognise it by:** the timbre itself, pulse, triangle and noise waves, more than any style
  rule (S361); few channels (the NES: two pulse, one triangle, one noise, one sample channel) (S362);
  rapid arpeggios that imply chords one voice cannot play (S361); short loops, a response to memory
  limits (S363); fast scale runs and wide leaps **(inference)**.
- **Today's controls:** any collection; Active diatonic; Sixteenth; Heavily varied; Occasional
  offbeats; Sparse; Wandering; Varying; Leapiness Leaping; Arpeggio chaos Varied. The melody can
  already resemble a chip lead **(inference)**.
- **Tuning (soft weights):** arpeggios and scale runs favoured; octave leaps; repeated notes;
  tempo 120–180 BPM **(inference)**.
- **Restriction (hard constraints):** at most four voices including the lead (two pulse, triangle,
  noise) (S362); triangle bass has no volume control (S362); no sustained pads.
- **Manipulation (transformations / planned material):** whole-piece loop of A and B sections
  (S363); accompaniment chords written as sixteenth or thirty-second arpeggios; echo by a second
  pulse channel delayed by an eighth **(inference)**.
- **Accompaniment (v4 roles):** triangle bass (root and octave, walking); second pulse as
  arpeggiated chords or harmony a third below; noise-channel drums. Timbres: pulse waves at 12.5,
  25 and 50 % duty cycle, triangle, noise (S362).
- **Capabilities needed:** `timbre-presets`, `accompaniment-roles`, `drums`,
  `NEW:loop-repetition`, `NEW:multi-phrase-form`, `motif-repetition-development`.
- **Fidelity:** today hint; with capabilities convincing. Pulse and triangle waves are trivial to
  synthesise **(inference)**, so this is the cheapest convincing style in the atlas. Lost: the
  hardware's quirks (pitch tables, sample-channel artefacts).

### JRPG music: the context system

**Why contexts, not one style.** Koichi Sugiyama's eight-track _Dragon Quest_ soundtrack, Opening,
Castle, Town, Field, Dungeon, Battle, Final Battle and Ending, "became a template for many RPG
soundtracks" (S364). _Theatrhythm Final Fantasy_ sorts its songs the same way, as Field, Battle and
Event music stages, each with its own gameplay (S92). The _Final Fantasy_ convention is a break
into battle music at the start of a fight and a fanfare at the end (S210). Place and situation are
signalled by **topics**, styles with an agreed meaning: pastoral for villages, military drums for
combat and travel (S221, S222). For a location, timbre, effects and texture weigh more than mode
(S222; [locations and events](../musical-identity.md#locations-and-events)).

**Three composer palettes (sourced facts; how to use them is inference).**

- **Nobuo Uematsu** (_Final Fantasy_): leitmotifs for characters and plot (S210); a Celtic
  arrangement for _IV_ and a Renaissance basis for _IX_ (S210); rock and classical fusion in boss
  music ("One-Winged Angel" fuses Stravinsky and Jimi Hendrix, S366); a 2022 scholarly volume
  covers his battle rhythms, villain music and thematic families (S365).
- **Yasunori Mitsuda** (_Chrono Trigger_, _Xenogears_, _Chrono Cross_): music of "an imaginary
  world" tied together by leitmotifs (S368); Celtic and world instruments (S369, S215); minimalism:
  his final battle themes use only a few chords, _Xenogears_'s only two (S369).
- **Hitoshi Sakimoto** (_Final Fantasy Tactics_, _Vagrant Story_, _XII_): dense orchestral
  writing sequenced on a computer; influences from Yellow Magic Orchestra, progressive rock and
  Chick Corea (S367).

**The generator angle (inference).** A location or event identity sets the foundation layers, the
tone and the meter; a character's identity then shapes the lead. The six contexts below are
written as style entries so that a game place or event can start from one.

### JRPG town and village

- **Family / place / era:** JRPG, 1986 on (Sugiyama's "Town", S364). **One line:** a gentle,
  homely tune in a lilting meter, with folk instruments.
- **Recognise it by:** the pastoral topic, drones and lilting rhythm (S222, S135); folk timbres
  (flute, accordion, plucked strings, Celtic colour: S210, S369); major or Mixolydian; moderate tempo;
  often 3/4 or 6/8 **(inference for meter and tempo)**.
- **Today's controls:** Major, Ionian or Mixolydian; Gentle diatonic; Eighth; Slightly varied;
  Straight; Conversational; Arch; Middle; Tension Settled; Leapiness Shaped; tempo 90–110 BPM.
- **Tuning (soft weights):** steps and thirds; dotted rhythms; phrase endings on long notes; grace
  notes and turns at a low rate **(inference)**.
- **Restriction (hard constraints):** diatonic; triads; no chromatic notes **(inference)**.
- **Manipulation (transformations / planned material):** an AABA loop of four-bar phrases; a town
  motif repeated each loop; a night variant (slower, sparser, lower), as in day and night area music
  (S213).
- **Accompaniment (v4 roles):** drone or open-fifth bass; plucked arpeggio or oom-pah
  (bass–chord–chord in 3/4); counter-melody on flute; light hand percussion or none. Timbres:
  flute, accordion, harp or guitar.
- **Capabilities needed:** `triple-meter`, `compound-meter`, `drone-pedal`, `symbol-ornaments`,
  `NEW:multi-phrase-form`, `accompaniment-roles`, `timbre-presets`.
- **Fidelity:** today hint (Gentle Major is already town-like); with capabilities convincing.
  Lost: the composer's specific tune; it stays a "kind", not a remembered theme.

### JRPG overworld and field

- **Family / place / era:** JRPG (Sugiyama's "Field", S364; _Theatrhythm_'s Field stages, S92).
  **One line:** a broad, adventurous march that loops for a long time while the party travels.
- **Recognise it by:** a heroic major tune with wide upward leaps (fourths, fifths, octaves);
  march or shuffle drums (the military topic marks travel, S222); a long loop that must survive
  repetition; Lydian colour for wonder and flight (S219) **(inference except where cited)**.
- **Today's controls:** Major or Lydian; Gentle or Active diatonic; Eighth; Slightly varied;
  Straight; Conversational; Rising or Arch; Varying; Leapiness Leaping; Tension Build; tempo 100–130
  BPM.
- **Tuning (soft weights):** leaps of a fourth to an octave favoured at phrase starts, steps after;
  dotted rhythms; strong beats on chord tones **(inference)**.
- **Restriction (hard constraints):** diatonic; Major or Lydian; 4/4.
- **Manipulation (transformations / planned material):** a theme motif stated, sequenced up a step,
  then answered; the Mario-style ♭VI–♭VII–I cadence at loop points (S338, S370); a leitmotif of the
  game's main theme (S210) **(inference)**.
- **Accompaniment (v4 roles):** march snare and bass drum; brass or string pad; counter-melody;
  root–fifth bass. Timbres: brass, strings, timpani.
- **Capabilities needed:** `motif-repetition-development`, `sequences`, `NEW:modal-mixture`,
  `NEW:multi-phrase-form`, `drums`, `accompaniment-roles`, `timbre-presets`.
- **Fidelity:** today hint; with capabilities recognisable. Lost: the memorable main theme a
  composer writes once and reuses.

### JRPG dungeon

- **Family / place / era:** JRPG (Sugiyama's "Dungeon", S364). **One line:** dark, sparse,
  repetitive music that builds unease without tiring the player.
- **Recognise it by:** a repeating ostinato (S136) or drone; minor, Phrygian or chromatic colour;
  low register; heavy reverb and sparse texture, the effects-defined place idea of S222
  **(inference except where cited)**.
- **Today's controls:** Phrygian or Aeolian (Locrian for the deepest levels); Static or Gentle;
  Quarter or Eighth; Strict; Straight; Breath-heavy; Falling or Wandering; Low; Tension Edge;
  tempo 70–100 BPM.
- **Tuning (soft weights):** ♭2 and the tritone favoured as colour; half steps; long rests;
  repeated notes **(inference)**.
- **Restriction (hard constraints):** dark mode; one or two chords; narrow range **(inference)**.
- **Manipulation (transformations / planned material):** a one-bar ostinato in the bass; the lead
  as fragments over it; chromatic sequence down by half step **(inference)**.
- **Accompaniment (v4 roles):** ostinato bass; drone or pedal; sparse echo; low metallic percussion
  or none. Timbres: low strings, bells, synth pad with long reverb.
- **Capabilities needed:** `drone-pedal`, `exotic-scales`, `NEW:loop-repetition`,
  `accompaniment-roles`, `timbre-presets`, `NEW:audio-effects`.
- **Fidelity:** today hint (Phrygian, Low, Breath-heavy already sound dark); with capabilities
  recognisable. Lost: sound design (drips, wind) that real dungeon tracks lean on.

### JRPG battle

- **Family / place / era:** JRPG (Sugiyama's "Battle", S364; the _Final Fantasy_ break-in, S210;
  _Theatrhythm_'s Battle stages, S92). **One line:** a fast, driving, minor-key piece with an intro
  and a loop.
- **Recognise it by:** a short intro that "breaks in" (S210); fast tempo and driving bass, a common
  belief not confirmed by a scholarly source (musical-identity research); syncopated accent patterns
  (S365's chapter on "diatonic rhythms" in Uematsu's battle music suggests grouping such as 3 + 3 + 2
  matters; its content was not read); military drums (S222); rock or progressive-rock band with
  strings **(inference)**.
- **Today's controls:** Aeolian or Dorian; Active diatonic; Sixteenth; Heavily varied; Active
  displacement (Heavily varied never blocks a rhythm combination); Sparse; Wandering; Varying; Leaping;
  Tension Build; tempo 140–180 BPM.
- **Tuning (soft weights):** accented offbeats; scale runs; repeated notes; leaps at phrase
  starts **(inference)**.
- **Restriction (hard constraints):** minor modes; 4/4 with optional odd bars **(inference)**.
- **Manipulation (transformations / planned material):** 3 + 3 + 2 accent cell; an intro phrase
  then a looping A–B form; i–♭VI–♭VII–i and i–♭VII–♭VI–♭VII loops (S338); a bass ostinato in
  eighths **(inference)**.
- **Accompaniment (v4 roles):** eighth-note bass ostinato; string or synth stabs on the accents;
  rock drums; brass counter-melody. Timbres: strings, brass, electric bass, rock kit.
- **Capabilities needed:** `rhythm-cells-timelines`, `progression-templates`,
  `NEW:modal-mixture`, `NEW:multi-phrase-form`, `odd-meter`, `drums`, `accompaniment-roles`,
  `timbre-presets`.
- **Fidelity:** today hint; with capabilities recognisable. Lost: the series' signature battle
  themes, which players know by heart.

### JRPG boss and final battle

- **Family / place / era:** JRPG (Sugiyama's "Final Battle", S364). **One line:** the villain's
  apotheosis, louder, darker and stranger than a normal battle.
- **Recognise it by:** the villain's leitmotif turned grand (S365: Kizzire on "Dancing Mad" and the
  "apotheosis of villainy"); choir, organ and orchestra with rock band (S366: Latin choir texts from
  _Carmina Burana_, Stravinsky and Hendrix); very few chords repeated (S369: Mitsuda's two-chord
  _Xenogears_ final battle); chromatic and tritone-related chords (S209; constituent 9 in
  [musical identity](../musical-identity.md#constituent-catalogue)).
- **Today's controls:** Phrygian or Locrian; Active diatonic; Sixteenth; Heavily varied; Active
  displacement; Wandering; Varying; Angular; Arpeggio chaos Chaotic; Tension Edge; Jazz grammar
  for chromatic approaches.
- **Tuning (soft weights):** tritones, ♭2 and chromatic approaches favoured; register spikes;
  long held notes against fast accompaniment **(inference)**.
- **Restriction (hard constraints):** dark modes, harmonic minor or octatonic; chords may move by
  tritone or by major third **(inference)**.
- **Manipulation (transformations / planned material):** the villain's motif (an identity's
  signature) placed at phrase starts and transformed (augmentation, minor or tritone transposition);
  two-chord vamp; phrases assembled from contrasting fragments, as Uematsu said he assembled "One-
  Winged Angel" "as if it was a puzzle" (S366); meter changes **(inference except where cited)**.
- **Accompaniment (v4 roles):** pedal or two-chord ostinato; choir pad; stabs; rock drums with
  double kick. Timbres: organ, choir, brass, distorted guitar.
- **Capabilities needed:** `motif-repetition-development`, `modal-harmony`, `exotic-scales`,
  `harmonic-minor`, `extended-altered-chords`, `odd-meter`, `drone-pedal`, `drums`,
  `accompaniment-roles`, `timbre-presets`.
- **Fidelity:** today none (dark but generic); with capabilities recognisable. Lost: narrative
  payoff, which depends on a leitmotif the player has heard for hours.

### JRPG victory fanfare

- **Family / place / era:** JRPG event music; the _Final Fantasy_ victory fanfare closed the
  battles of the first ten games (S210). **One line:** a short, bright brass flourish that closes a
  fight, then a light looping tune.
- **Recognise it by:** a fanfare, a short bright flourish for brass (S223); the triumphant
  ♭VI–♭VII–I cadence, the "Mario cadence" (S370; the Aeolian cadence ending on I, S338); fast
  repeated tonic notes in triplets before the cadence **(inference, from listening)**; it is fixed,
  so players recognise it because it never changes (S161; musical-identity research).
- **Today's controls:** none close: today's phrases must end open, never on the tonic.
- **Tuning (soft weights):** tonic and fifth; arpeggio up the major triad; repeated notes
  **(inference)**.
- **Restriction (hard constraints):** Major; one or two bars; must end on the tonic chord and
  degree 1 **(inference)**.
- **Manipulation (transformations / planned material):** a fanfare template: repeated-tonic triplet
  figure, then ♭VI–♭VII–I with the melody ♭6–♭7–1; generated variants keep the template and vary
  only rhythm details and register, so it stays recognisable **(inference)**; then a looping
  four-bar "after-battle" tune in Major.
- **Accompaniment (v4 roles):** brass chords in rhythmic unison with the lead (stabs); timpani or
  snare roll; root bass. Timbres: trumpets, horns, timpani.
- **Capabilities needed:** `closed-endings`, `NEW:modal-mixture`, `triplets-tuplets`,
  `NEW:fixed-stinger`, `phrase-length`, `accompaniment-roles`, `timbre-presets`.
- **Fidelity:** today none; with capabilities convincing. Lost: nothing that matters; a fanfare is
  short and formulaic, which is why it suits a generator.

### Epic trailer and battle

- **Family / place / era:** film trailers and orchestral game scores, 2000s on. **One line:**
  pounding minor-key orchestral music built on string ostinatos and huge percussion, rising in
  stages.
- **Recognise it by:** a sound-design-driven, hybrid orchestral style (S372); string ostinatos
  (S136) **(inference that they are central)**; the Aeolian schemas i–♭VII–♭VI–♭VII and
  ♭VI–♭VII–i (S338); "epic" as a texture that sets the personal against a vast backdrop, a device
  studied in game scores (S371); a build in stages with choir and brass at the peak
  **(inference)**.
- **Today's controls:** Aeolian; Gentle diatonic (the Aeolian colour degree is ♭6, so the modal plan
  can give i–♭VI–i) **(inference)**; Quarter or Eighth for the lead; Strict; Straight;
  Conversational; Rising; Low to Varying; Leapiness Leaping; Tension Build.
- **Tuning (soft weights):** long notes in the lead, with leaps of a fifth and octave upward;
  ♭6–5 and ♭7–1 motions **(inference)**.
- **Restriction (hard constraints):** Aeolian; triads; 4/4 **(inference)**.
- **Manipulation (transformations / planned material):** sixteenth-note string ostinato on the
  tonic and fifth; progression templates i–♭VI–♭VII–i, i–♭VII–♭VI–♭VII (S338); a three-stage build
  over several phrases, adding layers each stage; a final stage in Major (♭VI–♭VII–I)
  **(inference)**.
- **Accompaniment (v4 roles):** string ostinato; low brass melody or pad; taiko-style percussion;
  choir pad. Timbres: strings, brass, choir, large drums, synth "hits".
- **Capabilities needed:** `NEW:modal-mixture`, `progression-templates`, `NEW:layer-build`,
  `NEW:multi-phrase-form`, `accompaniment-roles`, `drums`, `timbre-presets`, `NEW:audio-effects`.
- **Fidelity:** today hint; with capabilities recognisable. Lost: the production scale (orchestra,
  choir, sound design) on which the genre's impact depends.

## Capability notes

**Most needed (count across the 19 entries):** `accompaniment-roles` (19), `timbre-presets` (19),
`drums` (15), `NEW:audio-effects` (11), `progression-templates` (9), `NEW:loop-repetition` (7),
`NEW:modal-mixture` (6), `NEW:multi-phrase-form` (6). This family is defined more by the backing,
the drums and the sound than by the lead line, so v4's roles and synths matter more here than any
melodic capability **(inference)**.

**New capability ids.**

| Id                      | Definition                                                                                                                                        | Styles                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `NEW:modal-mixture`     | Borrow chords from the parallel mode (♭III, ♭VI, ♭VII, iv in a major key) inside a phrase, without changing the lead's collection for the phrase. | Classic rock, synthwave, overworld, battle, victory fanfare, epic trailer             |
| `NEW:loop-repetition`   | A one- or two-bar pattern repeated exactly across the phrase and across phrases; variety comes from adding or removing layers, not new notes.     | Reggae, hip-hop, house and techno, ambient, lo-fi, chiptune, dungeon                  |
| `NEW:layer-build`       | An intensity arc over several phrases, made by adding and removing accompaniment layers (build-up, drop, trailer stages; adaptive layers, S159).  | House and techno, epic trailer                                                        |
| `NEW:multi-phrase-form` | A plan above the phrase: labelled sections (verse, chorus, A, B, intro, loop) that recur with their own material over many four-bar phrases.      | Pop, chiptune, town, overworld, battle, epic trailer                                  |
| `NEW:fixed-stinger`     | A short, nearly fixed figure laid over or between phrases (fanfare, jingle), recognised because it does not change (S161).                        | Victory fanfare; also item jingles and other events                                   |
| `NEW:audio-effects`     | Per-voice effects: reverb, delay, filter, distortion, bit reduction, vinyl noise (constituent 2, "tone").                                         | Rock, punk, metal, reggae, hip-hop, house and techno, synthwave, ambient, lo-fi, more |
| `NEW:long-tones`        | Notes of a bar or longer and ties across the barline in the lead, for drones and ambient lines.                                                   | Ambient and drone                                                                     |

**Notes (inference).**

- `parallel-harmony` covers power chords. In this family, power chords matter for the backing
  only; the player's line stays single notes.
- Several styles already partly work today through the modal planner: Mixolydian gives the rock
  I–♭VII shuttle, Phrygian gives metal's i–♭II, Aeolian gives i–♭VI. None can give ♭VII in Aeolian
  or Major, because ♭VII lacks the Aeolian colour degree and does not exist in Major; this is what
  `NEW:modal-mixture` and `progression-templates` would add.
- The victory fanfare needs `closed-endings` (D28): it is the one place where the music must end on
  the tonic.
- Chiptune's square and triangle waves are a cheap first target for `timbre-presets`, and its
  four-voice limit matches the schema's `maxVoices`.

## Open questions

1. Should a JRPG context (town, field, dungeon, battle, boss, fanfare) be a **style pack** of its
   own, or a **location/event identity** layered over a style pack such as "orchestral" or
   "chiptune"? The context system above suggests the second **(inference)**.
2. Battle tempos (140–180 BPM) with Sixteenth density may be beyond many players. Should a battle
   style keep its accompaniment fast while the lead runs at half density (a "half-time lead")?
3. Styles whose identity lives in the drums (reggae, house, hip-hop): are they worth a preset
   before v4 drums exist? This atlas says no.
4. Does `NEW:fixed-stinger` break the "everything is generated" rule? A templated fanfare with
   seeded variation keeps it generated; a fully fixed one would be authored material.
5. Should rap-led hip-hop be dropped from the catalogue, since its lead is a voice the player cannot
   play? Its instrumental hook remains usable.
6. Mitchell's chapter on Uematsu's battle rhythms (S365) and Kizzire's on villainy (S365) were not
   read in full; reading them could replace several inferences in the battle and boss entries.

## Lexicon candidates

Merged into the [lexicon](../lexicon.md) on 2026-10-11, together with the candidates of the other
style atlas files: [Power chord](../lexicon.md#power-chord), [Subtonic](../lexicon.md#subtonic), [Modal mixture](../lexicon.md#modal-mixture), [Double plagal](../lexicon.md#double-plagal), [Aeolian cadence](../lexicon.md#aeolian-cadence), [Four on the floor](../lexicon.md#four-on-the-floor), [Skank](../lexicon.md#skank), [One drop](../lexicon.md#one-drop), [Boom bap](../lexicon.md#boom-bap), [Gallop](../lexicon.md#gallop), [Pulse wave](../lexicon.md#pulse-wave), [Chiptune](../lexicon.md#chiptune) and [Overworld theme](../lexicon.md#overworld-theme). Ostinato stays an alias of [Riff](../lexicon.md#riff), and hook an alias of the internal [Signature figure](../lexicon.md#signature-figure). The train beat and palm muting are explained only in this document.

## Sources

This document's sources are registered in [research sources](../research-sources.md), in the block
[Style Atlas: Popular, Electronic and Game Music](../research-sources.md#style-atlas-popular-electronic-and-game-music) (merged on 2026-10-11).
They are reference only: no text is copied or closely paraphrased.

- New for this document: S338–S372.
- Already in the register and cited above: S46 (rhythm and meter in pop music), S83 (lick, riff and head), S92 (_Theatrhythm Final Fantasy_), S113 (four-chord schemas), S114 (pop melody and phrasing), S127 (texture in pop music), S128 (Lavengood, novelty layer), S135 (drone), S136 (ostinato), S139 (backbeat), S159 (adaptive music), S161 (sting), S209 (major tritone progression), S210 (music of the _Final Fantasy_ series), S213 (Soken on _Final Fantasy XIV_ area music), S215 (music of _Chrono Cross_), S219 (Lydian and wonder), S221 (_The Oxford Handbook of Topic Theory_), S222 (Lavengood and Williams, the winter topic), S223 (fanfare), S235 (Van Balen et al., hook discovery) and S236 (Burgoyne et al., "Hooked").
