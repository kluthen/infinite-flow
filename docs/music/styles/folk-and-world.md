# Style Atlas: Folk and World Traditions

Status: research (2026-10-11), style atlas groundwork; not settled policy.

## Purpose

This atlas describes eighteen folk and world styles in terms the phrase generator could use, as
groundwork for a style layer ("style packs", see the
[breadth review](../generation-breadth-review.md#recommendation-inference)) and for v4
accompaniment roles. Each entry splits a style into **tuning** (soft weights: what the generator
should favour), **restriction** (hard constraints: what it must never do) and **manipulation**
(transformations and planned material: patterns, forms, ornaments laid over the line), the same
split as the [draft identity schema](../identity-modelling.md#draft-identity-schema-inference)
(its tonal, rhythm, melodic, embellishment, motifs and arrangement families). Many of these
traditions are built on microtones, long cycles, free rhythm or improvisation. A seeded,
four-bar, twelve-note-per-octave generator can only give **an approximation inspired by** them;
each entry says what such a sketch misses. Facts carry a source id; anything marked
**(inference)** is the author's own reading.

| #   | Style                                    | Family                     | Fidelity today | Fidelity with capabilities                |
| --- | ---------------------------------------- | -------------------------- | -------------- | ----------------------------------------- |
| 1   | Irish and Scottish reel                  | Celtic dance tune          | recognisable   | convincing                                |
| 2   | Irish and Scottish jig (and slip jig)    | Celtic dance tune          | none           | convincing                                |
| 3   | Appalachian old-time and bluegrass       | North American string band | hint           | recognisable                              |
| 4   | Scandinavian polska                      | Nordic dance tune          | none           | recognisable                              |
| 5   | Klezmer                                  | Eastern European Jewish    | hint           | recognisable                              |
| 6   | Balkan aksak dances (7/8, 9/8, 11/8)     | Balkan and Anatolian dance | none           | recognisable                              |
| 7   | Flamenco                                 | Andalusian                 | hint           | recognisable                              |
| 8   | Tango                                    | Río de la Plata            | hint           | recognisable                              |
| 9   | Son cubano and salsa                     | Afro-Cuban                 | hint           | recognisable                              |
| 10  | Samba and bossa nova                     | Brazilian                  | hint           | recognisable                              |
| 11  | Andean huayno                            | Andean                     | hint           | recognisable                              |
| 12  | West African timeline music and highlife | West African               | none           | hint (drums), recognisable (highlife)     |
| 13  | Arabic maqam (Hijaz, Rast, Bayati)       | Arab and Middle Eastern    | none           | recognisable (Hijaz), hint (Rast, Bayati) |
| 14  | Hindustani and Carnatic raga             | South Asian classical      | hint           | recognisable as a sketch                  |
| 15  | Japanese min'yō and koto scales          | Japanese                   | hint           | recognisable                              |
| 16  | Chinese pentatonic and silk-and-bamboo   | Chinese                    | hint           | recognisable                              |
| 17  | Javanese and Balinese gamelan            | Indonesian                 | none           | recognisable as a sketch                  |
| 18  | French bal-musette (optional extra)      | French popular dance       | none           | recognisable                              |

Fidelity scale: today **none / hint /
recognisable**; with the listed capabilities **hint / recognisable / convincing**.

## Style entries

### 1. Irish and Scottish reel

- **Family / place / era:** Irish and Scottish traditional dance music. **One line:** a fast
  dance tune in 4/4 or 2/2, running even eighth notes, in eight-bar parts each played twice
  (S106).
- **Recognise it by:** a steady stream of even (unswung) eighths accented on beats 1 and 3
  (S106); two eight-bar parts in AABB form, each made of four-bar phrases (S106); Ionian,
  Mixolydian and Dorian far more than minor (S107); cuts, taps, rolls and crans on long notes
  (S108).
- **Today's controls:** the [Folk reel candidate](../preset-catalogue.md#3-folk-reel) already
  fits: Neutral, Gentle diatonic, Eighth, Strict, Straight, Sparse silence, Arch, Middle;
  Collection Mixolydian, Dorian or Major; Tension Settled; Leapiness Shaped.
- **Tuning (soft weights):** eighths very high, a quarter at phrase ends; steps and
  chord-outline skips (thirds) high, leaps of a sixth or octave rare (inference); ornament on
  roughly one long note in three (inference); practice tempo 80–100 BPM (preset catalogue),
  dancers much faster.
- **Restriction (hard constraints):** diatonic collection only, no chromatic notes; chords I, IV,
  V, plus ♭VII in Mixolydian and i–♭VII in Dorian (inference); range of about an octave and a
  half (fiddle, whistle; inference).
- **Manipulation:** AABB form of eight-bar parts, where bars 5–8 restate bars 1–4 with a new
  ending (inference); the cut as a [grace note](../lexicon.md#grace-note) and the roll as a
  [turn](../lexicon.md#turn)-like figure (S108; D216 figures 23 and 26); the three-note triplet
  run once tuplets exist; one recurring "tune figure" across phrases.
- **Accompaniment (v4 roles):** guitar or bouzouki comping in even eighths; piano "vamping"
  (bass on 1 and 3, chord on 2 and 4; inference); a tonic [drone](../lexicon.md#drone) for
  pipe-flavoured tunes (S135); bodhrán. Timbres: fiddle, flute, tin whistle, pipes, accordion.
- **Capabilities needed:** `symbol-ornaments`, `phrase-length`, `motif-repetition-development`,
  `triplets-tuplets`, `accompaniment-roles`, `drone-pedal`, `timbre-presets`.
- **Fidelity:** today **recognisable**; with capabilities **convincing**. Lost: the player's
  varied repeats and the "lift" of accent and ornament placed by ear.

### 2. Irish and Scottish jig (and slip jig)

- **Family / place / era:** the same tradition as the reel. **One line:** a dance tune in 6/8
  (double and single jigs) or 9/8 (slip jig), in two eight-bar parts (S373).
- **Recognise it by:** two beats per bar, each divided in three (S373); double jig: three eighths
  per beat; single jig: quarter-eighth, long-short (S373); slip jig: three beats per bar (S373); the
  same modes and ornaments as the reel (S107, S108).
- **Today's controls:** none close: the app is 4/4 only and excludes tuplets. A jig tune
  squeezed into even eighths is no longer a jig.
- **Tuning (soft weights):** in 6/8, cells "eighth-eighth-eighth" (double) or "quarter-eighth"
  (single) dominate; strongest onsets on the two dotted-quarter beats; steps and arpeggio
  outlines as for the reel (inference).
- **Restriction (hard constraints):** compound meter 6/8 (or 9/8, and 12/8 for some single jigs,
  S373); diatonic modal collections; four-bar phrase pairs making eight-bar parts.
- **Manipulation:** a compound-meter grid (2 or 3 beats × 3 pulses); a roll filling one
  dotted-quarter beat (inference from S108); AABB form.
- **Accompaniment (v4 roles):** guitar strum stressing the two beats; bass on the dotted-quarter
  beats; bodhrán.
- **Capabilities needed:** `compound-meter`, `phrase-length`, `symbol-ornaments`,
  `motif-repetition-development`, `accompaniment-roles`.
- **Fidelity:** today **none**; with capabilities **convincing**. The four-bar unit itself fits
  (half a part); the meter is the only real blocker. Lost: as for the reel.

### 3. Appalachian old-time and bluegrass

- **Family / place / era:** North American string-band music; bluegrass grew out of it in the
  1940s, named after Bill Monroe's Blue Grass Boys (S375). **One line:** fiddle-and-banjo dance
  tunes (old-time) and their faster, solo-taking concert offspring (bluegrass).
- **Recognise it by:** old-time: fiddle with clawhammer banjo, whose short drone string gives a
  steady high note; melody instruments play the tune together in unison, rarely taking solos
  (S374); bluegrass: fast tempos, Scruggs three-finger banjo rolls, players soloing in turn, the
  off-beat emphasised, the bass alternating root and fifth, simple melodies over I–IV–V in keys
  like G (S375); five-note (pentatonic) melodies common in Appalachian folk (S100).
- **Today's controls:** Neutral; Ionian or Mixolydian; Gentle diatonic; Eighth; Strict;
  Straight (old-time) or Occasional offbeats (bluegrass); Arch; Middle. Close to the Folk reel
  candidate in Major.
- **Tuning (soft weights):** eighths; chord tones on the beat; the 4th and 7th degrees
  de-weighted for a gapped, pentatonic sound (inference); a slide into the 3rd now and then
  (inference); bluegrass tempo 120–200 BPM (inference).
- **Restriction (hard constraints):** Major, Mixolydian or Dorian; chords I, IV, V (S375), ♭VII in
  Mixolydian tunes (inference); AABB eight-bar parts (inference, from the reel meter S374 names).
- **Manipulation:** I–IV–V progression templates (S375); AABB form; a stock closing lick (the
  guitar "G run") as a signature figure (inference); a tonic or fifth pedal from the banjo drone
  (S374).
- **Accompaniment (v4 roles):** bass root–fifth on beats 1 and 3 (S375; beat placement inference);
  guitar "boom-chuck" and mandolin chop on 2 and 4 (inference from the off-beat emphasis, S375);
  banjo roll as an eighth-note arpeggio [ostinato](../arranging-and-roles.md#ostinato-riff-and-vamp)
  (S375); old-time: [heterophonic doubling](../arranging-and-roles.md#heterophonic-doubling) of
  the tune by the whole band (S374, S125).
- **Capabilities needed:** `pentatonic-scales`, `progression-templates`, `accompaniment-roles`,
  `drone-pedal`, `phrase-length`, `slides-bends`, `timbre-presets`.
- **Fidelity:** today **hint**; with capabilities **recognisable**. Lost: banjo and fiddle
  timbre, the ringing of cross-tuned fiddles (S374), improvised breaks.

### 4. Scandinavian polska

- **Family / place / era:** Swedish, Norwegian (pols, springar) and Finnish couple dances (S376).
  **One line:** a dance in three whose beats are often not equal in length.
- **Recognise it by:** almost always 3/4 (S376); the subdivision type by region: sixteenth polska
  (smooth, southern Sweden), eighth polska (widespread, peaking in Dalarna), triplet polska
  (western provinces) (S376); uneven beats: a short first beat in springar, an "early two" or
  "late three" in Dalarna, with fiddlers' feet tapping beats 1 and 3 (S376); the Hardanger
  fiddle's sympathetic strings giving a drone (S376).
- **Today's controls:** none close (4/4 only). Nearest: Sixteenth, Minor or Dorian, Strict,
  Straight.
- **Tuning (soft weights):** running sixteenths or eighths; strongest onsets on beats 1 and 3
  (S376); a small arch per bar (inference); minor and major both common (inference).
- **Restriction (hard constraints):** 3/4 meter; diatonic collection; eight-bar parts
  (inference).
- **Manipulation:** a per-beat timing template (beat 1 short, beat 2 long, or the reverse) as a
  stored ratio, the way swing is a stored ratio for eighths; repeated parts; a fiddle drone.
- **Accompaniment (v4 roles):** mostly one or two fiddles; a second fiddle in heterophony or
  thirds (inference); a fifth drone; a foot-tap layer on beats 1 and 3 (S376); little or no bass.
- **Capabilities needed:** `triple-meter`, `NEW:microtiming`, `phrase-length`,
  `symbol-ornaments`, `drone-pedal`, `accompaniment-roles`, `timbre-presets`.
- **Fidelity:** today **none**; with capabilities **recognisable**. Lost: the micro-timing is
  learned by ear and varies by village and player; one fixed ratio is a caricature.

### 5. Klezmer

- **Family / place / era:** Eastern European Ashkenazi Jewish instrumental music (S377). **One
  line:** dance and listening music where clarinet or violin "sings", with sobs and bends, in
  modes such as Freygish.
- **Recognise it by:** the modes: **Freygish** (Ahava Raba: ♭2 and a major 3rd, the
  [Phrygian](../lexicon.md#phrygian) mode with a raised third, called Phrygian dominant),
  **Mi Sheberakh** (minor with a raised 4th), **Adonoy Molokh** (major with ♭7), **Mogen Ovos**
  (close to natural minor) (S377, S378); voice-like ornaments: krekhts, kneytsh and kvetsh (sighs and
  sobs), trills, grace notes, glides (glitshn), bent notes (tshoks) (S377); dances: freylekhs and
  bulgar (2/4 or 4/4), hora or zhok (3/8), khosidl, sirba; the doina is unmetered (S377).
- **Today's controls:** Phrygian is the closest collection to Freygish but has the wrong (minor)
  third; Mixolydian for Adonoy Molokh, Aeolian for Mogen Ovos; Jazz grammar for chromatic
  colour; Static or Gentle diatonic; Eighth; Occasional offbeats.
- **Tuning (soft weights):** the augmented second (♭2 to 3, three semitones) treated as a
  normal step, not a leap (inference); ornaments on most long notes; degree 1 and the 4th (the
  minor iv chord) as targets (inference).
- **Restriction (hard constraints):** a Freygish or Mi Sheberakh collection with no other notes;
  chord vocabulary for Freygish: I (major), iv, ♭VII (minor), ♭II (inference). Freygish is the
  fifth mode of [harmonic minor](../lexicon.md#harmonic-minor) (S378).
- **Manipulation:** the krekhts as a new symbol ornament (a quick break or upward flip at a
  note's end; definition inference, S377 says only "imitating vocal sighs"); slides; the bulgar's
  3 + 3 + 2 cell (S46, inference that it applies here); modulation between Freygish and its iv
  (inference).
- **Accompaniment (v4 roles):** oom-pah (bass on 1, chord on 2) for freylekhs and 3 + 3 + 2 for
  bulgar (inference); unharmonised octaves, a second violin's partial chords, later brass
  counter-voices (S377); a pedal note under the doina (S377). Timbres: clarinet, violin, cimbalom,
  accordion, tuba.
- **Capabilities needed:** `exotic-scales`, `harmonic-minor`, `symbol-ornaments`,
  `slides-bends`, `rhythm-cells-timelines`, `accompaniment-roles`, `triple-meter`, `modulation`.
- **Fidelity:** today **hint**; with capabilities **recognisable**. Lost: krekhts and tshoks are
  sound inflections that notation only hints at; the doina's free rhythm.

### 6. Balkan aksak dances (7/8, 9/8, 11/8)

- **Family / place / era:** Bulgarian, Macedonian, Turkish and wider Balkan dance music; "aksak"
  is an Ottoman term meaning "limping" (S379). **One line:** fast dances whose bars are built of
  unequal groups of two and three quick pulses.
- **Recognise it by:** additive meters: 7 = 2+2+3 (račenica), 9 = 2+2+2+3 (daychovo horo), 11
  (gankino), and 13 or 15 pulses (S379); the longer group heard as a stretched beat (inference);
  the račenica cell is the "evenly spread" rhythm E(3,7) (S380); bagpipe (gaida) drones and dense
  ornamented lines (inference).
- **Today's controls:** none close (4/4 only).
- **Tuning (soft weights):** notes on group starts; the long group often holds a longer note
  (inference); stepwise runs with turns; modal and harmonic-minor-like collections (inference).
- **Restriction (hard constraints):** one fixed grouping per tune (S379); four-bar phrases work
  unchanged.
- **Manipulation:** the grouping as a stored cell that sets the strong pulses; ornaments
  (mordents, trills); a drone.
- **Accompaniment (v4 roles):** a bass drum (tapan) and bass on group starts, chords on the long
  group (inference); a [drone](../arranging-and-roles.md#pedal-point-and-drone) (S135).
- **Capabilities needed:** `odd-meter`, `rhythm-cells-timelines`, `drums`, `drone-pedal`,
  `symbol-ornaments`, `harmonic-minor`, `accompaniment-roles`, `tempo-range`.
- **Fidelity:** today **none**; with capabilities **recognisable** (the rhythm can be exact).
  Lost: the gaida and kaval timbre; ornament density at real dance tempos may exceed what the
  BPM range and a reader can follow.

### 7. Flamenco

- **Family / place / era:** Andalusia, Spain; song (cante), guitar (toque) and dance (baile)
  (S381). **One line:** music built on cycles of accents (compás) and a Phrygian-based mode whose
  home chord is major.
- **Recognise it by:** the Phrygian mode with a major chord on the final (S381, S382); the
  **Andalusian cadence** i–♭VII–♭VI–V (Am–G–F–E) (S382); palos (song forms) by meter: binary
  (tangos, tientos, rumba), twelve-beat (soleá, alegrías, bulerías, seguiriya), triple
  (fandango, sevillanas) (S381); in soleá and alegrías the twelve beats are accented on 3, 6, 8,
  10 and 12, bulerías is roughly double-time soleá, seguiriya groups 2+2+3+3+2 (S383); palmas,
  rasgueado strumming, guitar interludes (falsetas) (S381).
- **Today's controls:** Phrygian collection; Static or Gentle diatonic; Sixteenth for
  falseta-like runs; Occasional offbeats; Falling contour.
- **Tuning (soft weights):** falling lines toward the final; ♭2 to 1 as the key resolution;
  the raised 3rd (G♯ over E) as a chord tone of the final chord only (inference); fast runs and
  triplets in falsetas.
- **Restriction (hard constraints):** E Phrygian with the raised 3rd allowed over the final
  chord (Phrygian dominant, S378); the Andalusian cadence as the only progression; meter per palo.
- **Manipulation:** the Andalusian cadence one chord per bar fills exactly four bars
  (inference); the twelve-beat compás as an accent template (S383) with phrases of twelve beats;
  a closed ending on the final chord.
- **Accompaniment (v4 roles):** rasgueado comping that follows the accent template; palmas and
  cajón as drums on the accents; bass following the cadence (inference).
- **Capabilities needed:** `exotic-scales`, `progression-templates`, `rhythm-cells-timelines`,
  `phrase-length`, `compound-meter`, `closed-endings`, `accompaniment-roles`, `drums`,
  `triplets-tuplets`, `slides-bends`.
- **Fidelity:** today **hint**; with capabilities **recognisable** (binary palos such as tangos
  and rumba fit 4/4 almost as is). Lost: the cante's melismatic, inflected singing, guitar
  technique and the dancer-musician interplay.

### 8. Tango

- **Family / place / era:** Río de la Plata (Buenos Aires, Montevideo), from the late 19th
  century (S384). **One line:** dramatic, mostly minor dance music driven by bandoneón and a
  hammered accompaniment.
- **Recognise it by:** 2/4 or 4/4 (S384); the accompaniment rhythms **marcato**, **síncopa** and
  **3-3-2**, and the **arrastre**, an anticipating slide into the beat (S385); two melodic
  manners, "tipo melódico" (lyrical) and "tipo rítmico" (rhythmic) (S385); the habanera rhythm as
  the early bass foundation (S386); bandoneóns in the orquesta típica (S384).
- **Today's controls:** Minor or Aeolian; Gentle or Active diatonic; Eighth; Occasional
  offbeats; Falling or Wandering; Jazz grammar for chromatic approaches. Today's backing, block
  chords on every whole beat, is already close to marcato (inference).
- **Tuning (soft weights):** alternate rhythmic phrases (short detached notes, dotted rhythms)
  with lyrical ones (long notes) (S385); a 3 + 3 + 2 grouping now and then; the raised leading
  tone at cadences (inference).
- **Restriction (hard constraints):** harmonic minor; chords i, iv, V7, VI (inference);
  phrase-final cadence on i.
- **Manipulation:** an accompaniment pattern chosen per bar: marcato by default, síncopa for
  contrast, 3-3-2 near phrase ends (S385; proportions inference); arrastre as a slide into beat 1;
  the two-chord "V–i" stop ending (inference).
- **Accompaniment (v4 roles):** piano and bass marcato (four beats, accents on 1 and 3;
  inference from practitioner teaching); habanera bass for an older "tango criollo" sound (S386);
  a bandoneón or violin [counter-melody](../lexicon.md#counter-melody).
- **Capabilities needed:** `harmonic-minor`, `seventh-chords`, `rhythm-cells-timelines`,
  `accompaniment-roles`, `articulation-dynamics`, `closed-endings`, `counterpoint`,
  `slides-bends`.
- **Fidelity:** today **hint**; with capabilities **recognisable**. Lost: fraseo, the rubato
  phrasing that pulls the melody against the beat (S385), and the bandoneón's breath.

### 9. Son cubano and salsa

- **Family / place / era:** son from eastern Cuba (Oriente), late 19th century; salsa built on
  it (S390). **One line:** song-dance music organised around the clave, with a call-and-response
  vamp section (montuno).
- **Recognise it by:** the **son clave** under everything, onsets on pulses 1, 4, 7, 11 and 13
  of sixteen, played 3-2 or 2-3 (S387); the bass **tumbao**, built on the tresillo, that holds its
  last note over the downbeat (S388); the piano or tres **guajeo**, a looping off-beat ostinato
  (S389); the montuno section, faster, with a repeated refrain in call and response (S389); tres,
  bongó, maracas, claves and bass (S390).
- **Today's controls:** Major or Minor; Gentle or Active diatonic; Eighth; Active displacement;
  Conversational silence; Jazz grammar.
- **Tuning (soft weights):** onsets aligned with the clave, anticipations across the beat and
  bar line favoured strongly; chord-tone arpeggios (inference).
- **Restriction (hard constraints):** one clave direction for the whole phrase (S387; keeping it
  fixed is inference); a two-bar vamp such as I–IV–V–IV (inference); a four-bar phrase equals two
  clave cycles (inference).
- **Manipulation:** the clave as a fixed onset template; the tumbao and guajeo as stored
  patterns; montuno form: a fixed two-bar coro (refrain) answered by a generated two-bar pregón
  (lead).
- **Accompaniment (v4 roles):** bass tumbao, piano montuno, claves, bongó, conga, cowbell, and
  in salsa horn [stabs](../lexicon.md#stab).
- **Capabilities needed:** `rhythm-cells-timelines`, `accompaniment-roles`,
  `call-and-response-form`, `progression-templates`, `seventh-chords`, `drums`,
  `motif-repetition-development`.
- **Fidelity:** today **hint**; with capabilities **recognisable**. Lost: the improvised sung
  soneo and the conversation between percussionists.

### 10. Samba and bossa nova

- **Family / place / era:** samba, Afro-Brazilian, from Bahia and Rio, late 19th and early 20th
  century (S391); bossa nova, Rio, late 1950s (S112). **One line:** syncopated, unswung Brazilian
  music: samba percussion-driven, bossa nova soft, with rich chords and a clave-like guitar.
- **Recognise it by:** samba mostly in 2/4 over pandeiro, cuíca, tamborim, ganzá and surdo,
  with guitar and cavaquinho; solo and chorus alternating in partido alto (S391); bossa: straight
  eighths, heavy syncopation, rich chords, a clave-like guitar pattern (S112); the bossa clave is
  the son clave with its last stroke one pulse later (S387), an evenly spread 3+3+4+3+3 pattern
  on sixteen pulses (S380); a sixteen-pulse samba pattern, E(7,16) (S380).
- **Today's controls:** the [Bossa candidate](../preset-catalogue.md#8-bossa): Jazz, Gentle
  diatonic, Eighth, Slightly varied, Active displacement, Conversational, Falling, Middle; Major.
  For samba, Sixteenth with Active displacement.
- **Tuning (soft weights):** anticipations across the bar line (S112); bossa: stepwise lines and
  the long note after a run of short pushed notes (preset catalogue); samba: sixteenth
  syncopations (inference).
- **Restriction (hard constraints):** seventh and ninth chords for bossa (S112); a 4/4 bar reads
  as two 2/4 bars (inference); chromatic notes only as approaches.
- **Manipulation:** the bossa clave and samba patterns as onset templates; ii–V–I and chromatic
  chord moves as progression templates (inference); partido-alto call and response (S391).
- **Accompaniment (v4 roles):** bossa guitar: bass notes on the beats under syncopated chords
  (inference from S112); rim click on the clave; samba: surdo, tamborim and pandeiro layers with
  cavaquinho comping.
- **Capabilities needed:** `rhythm-cells-timelines`, `seventh-chords`,
  `extended-altered-chords`, `progression-templates`, `accompaniment-roles`, `drums`,
  `NEW:microtiming`, `call-and-response-form`.
- **Fidelity:** today **hint**; with capabilities **recognisable**. Lost: samba's slight
  pushing and dragging of sixteenths (inference), batucada's layered texture, the sung voice.

### 11. Andean huayno

- **Family / place / era:** Peru, western Bolivia, northwest Argentina, northern Chile; colonial
  origins, strongly Quechua (S392). **One line:** a galloping duple dance song over a minor
  five-note scale, often closed by a faster coda.
- **Recognise it by:** a "galloping" duple rhythm: a stressed first beat then two short notes,
  about a quarter and two eighths (S392, S393); minor pentatonic scales common in Andean music, and
  some old wind music in parallel fourths and fifths (S100); AABB form ending with a **fuga**
  that repeats the tune twice as fast (S393); paired panpipes (siku, ira and arka) that alternate
  notes so neither plays the whole tune, a **hocket** (S393); quena, charango, bombo, harp (S392,
  S393).
- **Today's controls:** Aeolian or Minor (the nearest superset of minor pentatonic); Eighth;
  Strict; Straight; Falling contour (inference).
- **Tuning (soft weights):** the long-short-short cell very high; degrees 2 and 6 de-weighted;
  falling phrases ending on the tonic (inference).
- **Restriction (hard constraints):** minor pentatonic collection; two-beat cells inside 4/4
  bars; tonic at phrase end.
- **Manipulation:** AABB plus fuga, the fuga a [diminution](../lexicon.md#diminution) (same tune,
  halved note values); the hocket split of the line between two voices; parallel fourths or
  fifths doubling (S100).
- **Accompaniment (v4 roles):** charango strumming the huayno cell; bombo on beat 1 (inference);
  guitar bass runs (inference); [parallel thirds](../arranging-and-roles.md#parallel-thirds-and-sixths)
  or fifths doubling the tune.
- **Capabilities needed:** `pentatonic-scales`, `rhythm-cells-timelines`, `phrase-length`,
  `NEW:hocket-interlock`, `parallel-harmony`, `accompaniment-roles`, `drums`,
  `motif-repetition-development`.
- **Fidelity:** today **hint**; with capabilities **recognisable**. Lost: the breathy quena and
  siku sound and the communal, many-players siku practice.

### 12. West African timeline music and highlife

- **Family / place / era:** Ewe drumming (Ghana, Togo) as a model of timeline music; highlife,
  Ghanaian popular music with roots in the late 19th century (S396). **One line:** layered
  repeating parts organised by a bell pattern, with a lead voice or drum calling and a group
  answering. **Cultural care:** a four-bar line on a twelve-note instrument is at best an
  approximation inspired by this music.
- **Recognise it by:** the **standard bell pattern**, seven strokes on a twelve-pulse cycle felt
  in four main beats (12/8), acting as a timeline (S394), the evenly spread E(7,12) (S380); an
  ensemble of double bell (gankogui), rattle (axatse), supporting drums and a master drum
  (atsimevu) (S395); call and response (S80); cross-rhythms that contradict the beat rather than
  form a second meter (S394); highlife: horns and guitars, a clave-type bell, a guitar figure
  mirroring the 3-2 clave (S396).
- **Today's controls:** none close for the drumming. Highlife: Major, Gentle diatonic, Eighth,
  Occasional offbeats.
- **Tuning (soft weights):** onsets weighted toward timeline strokes; short motifs repeated;
  pentatonic leanings (S100 mentions the Sahel; extending it to Ghana is inference).
- **Restriction (hard constraints):** 12/8 with four beats per bar; short cycles (one or two
  bars) repeated; for highlife, I, IV and V (inference).
- **Manipulation:** the bell as a fixed timeline layer; supporting-drum ostinatos offset against
  it; call-and-response form: generated call, fixed refrain answer; a master-drum cue starting a
  new section (inference).
- **Accompaniment (v4 roles):** bell, rattle and layered drum ostinatos in the
  [groove](../arranging-and-roles.md#groove-and-drums) role; highlife: two-finger guitar picking
  (S396), horn stabs, bass.
- **Capabilities needed:** `compound-meter`, `rhythm-cells-timelines`, `polyrhythm`,
  `call-and-response-form`, `drums`, `accompaniment-roles`, `pentatonic-scales`,
  `motif-repetition-development`.
- **Fidelity:** today **none**; with capabilities **hint** for the drum ensemble, **recognisable**
  for highlife. Lost: the master drummer's long improvised dialogue with dancers, drum tone
  colours and the open-ended cyclic form; a melody to sight-read is a different musical act.

### 13. Arabic maqam (Hijaz, Rast, Bayati)

- **Family / place / era:** the modal system of Arabic music. **One line:** melody built from
  small note groups (ajnas) along a characteristic path, often with notes between the piano
  keys. **Cultural care:** maqam is a system of intonation, melodic paths and improvisation; a
  twelve-note four-bar generator offers an approximation inspired by it, exact only for maqamat
  without quarter tones.
- **Recognise it by:** a maqam is a mode with melodic patterns, built from ajnas (S397); **Hijaz**:
  jins Hijaz on the tonic (with the augmented second) then Nahawand or Rast on the 4th degree
  (S398), the same notes as Phrygian dominant (S378); **Rast**: jins Rast on the tonic then Upper
  Rast or Nahawand on the 5th (S398); **Bayati**: jins Bayati on the tonic then Nahawand or Rast on
  the 4th (S398); half-flats mostly on E and B, written in quarter-tone notation that only
  approximates intonation varying by region and period (S397); the taqsim, an improvised solo
  starting in the lower ajnas and free to modulate before returning (S399); rhythmic modes
  (iqa'at), over a hundred reputed, from 2 to 48 beats (S400).
- **Today's controls:** none truly close. Stand-ins: Phrygian for Hijaz (wrong third), Dorian or
  Phrygian for Bayati, Ionian or Mixolydian for Rast (inference); Static harmony.
- **Tuning (soft weights):** steps very high; each phrase lingering on one jins and rising
  gradually to the next (inference); repeated notes and turns.
- **Restriction (hard constraints):** the maqam's notes only; Hijaz maps to twelve notes well;
  Rast and Bayati need neutral seconds or thirds (half-flats), so either notate the half-flat and
  accept the player's own pitch, or round to a semitone and say the sound is lost (inference).
- **Manipulation:** a planned path: phrase 1 on the lower jins, phrase 2 on the upper, then
  back; modulation to a neighbouring maqam; the taqsim's free rhythm is out of scope.
- **Accompaniment (v4 roles):** heterophonic doubling by oud, qanun, nay or violin (S125); a
  light tonic drone (S135); frame-drum iqa' patterns (inference for instruments); block chords
  off (inference).
- **Capabilities needed:** `exotic-scales`, `microtonal-approximation`, `NEW:pitch-path-plan`,
  `modulation`, `accompaniment-roles`, `drums`, `drone-pedal`, `symbol-ornaments`,
  `modal-harmony`, `NEW:directional-scales`.
- **Fidelity:** today **none**; with capabilities **recognisable** for Hijaz, **hint** for Rast
  and Bayati at twelve notes. Lost: intonation, the taqsim, the long-form ecstatic build (tarab).

### 14. Hindustani and Carnatic raga

- **Family / place / era:** the classical traditions of North (Hindustani) and South (Carnatic)
  India. **One line:** improvisation inside a raga (a melodic framework) over a drone and a
  rhythmic cycle (tala). **Cultural care:** a raga unfolds over many minutes with exact
  intonation and gliding ornaments; a four-bar twelve-note phrase can only sketch its scale,
  drone and some habits, an approximation inspired by it.
- **Recognise it by:** a raga is more than a scale: many ragas share one scale (S401); a most
  prominent note (vadi) and a second (samvadi), a characteristic phrase (pakad or chalan),
  ascent and descent patterns (S401); gamakas, oscillations and slides that in Carnatic music give
  each raga its identity (S403); tala cycles: teental 16 beats (4+4+4+4) with an emphasised first
  beat (sam) and an "empty" beat (khali), adi 8, rupak 7 (3+2+2), jhaptal 10 (S402); a phrase
  played three times landing on sam, the tihai (S85); ten parent scales (thaats), six matching
  Western modes: Bilaval Ionian, Kalyan Lydian, Khamaj Mixolydian, Kafi Dorian, Asavari Aeolian,
  Bhairavi Phrygian (S404); 22 microtonal shrutis in theory (S401).
- **Today's controls:** the matching mode for six thaats (S404); Static harmony; Arch or Rising
  contour; Breath-heavy silence.
- **Tuning (soft weights):** vadi the heaviest degree, samvadi next; the pakad as planned
  material; slides between notes.
- **Restriction (hard constraints):** only the raga's notes, possibly different going up and
  going down; omitted notes banned (inference for specific ragas); no chords.
- **Manipulation:** teental's sixteen beats are four 4/4 bars with sam on bar 1 beat 1 and khali
  in bar 3 (inference); a tihai at the phrase end (S85); a tonic-and-fifth drone.
- **Accompaniment (v4 roles):** tanpura-like [pedal and drone](../arranging-and-roles.md#pedal-point-and-drone)
  on tonic and fifth (S135; instrument inference); a tabla cycle as drums; heterophonic
  shadowing by harmonium or violin (inference); no harmony.
- **Capabilities needed:** `drone-pedal`, `NEW:directional-scales`, `NEW:pitch-path-plan`,
  `motif-repetition-development`, `slides-bends`, `symbol-ornaments`, `exotic-scales`, `drums`,
  `odd-meter`, `microtonal-approximation`, `closed-endings`, `accompaniment-roles`.
- **Fidelity:** today **hint**; with capabilities **recognisable as a sketch**. Lost: the alap's
  slow unmetered unfolding, shruti intonation, gamaka subtlety, the time-of-day and mood
  associations.

### 15. Japanese min'yō and koto scales

- **Family / place / era:** Japanese folk song (min'yō) and the scales of koto and shamisen
  music. **One line:** five-note melodies built on "nuclear" notes a fourth apart, sung or played
  with shamisen, flute and drums.
- **Recognise it by:** the **In scale** (1, ♭2, 4, 5, ♭6, with ♭3 and ♭7 as auxiliaries), the
  same notes as miyako-bushi, organised around nuclear tones a fourth apart, also called the
  "Sakura" scale (S405); the **Yo scale**, five notes with no half steps (steps of 2, 3, 2, 2, 3
  semitones), used in folk songs (S405); **Hirajōshi**, a koto tuning whose note set sources
  disagree on (S405); min'yō as work, dance and ritual songs, with shamisen, shakuhachi or shinobue
  added and drums for dances (S406).
- **Today's controls:** Phrygian (a superset of In), Dorian (a superset of Yo on its first note;
  inference); Static harmony; Smooth or Shaped leapiness; Breath-heavy silence.
- **Tuning (soft weights):** the nuclear tones (1, 4, 5) heaviest; half steps resolving into
  them (♭2 to 1, ♭6 to 5) in the In scale (inference); long held notes.
- **Restriction (hard constraints):** a pentatonic In, Yo or Hirajōshi collection; no functional
  chord progression.
- **Manipulation:** metered dance songs fit; free-rhythm song styles are out of scope; a drum
  and hand-clap cycle.
- **Accompaniment (v4 roles):** shamisen in heterophony with the voice (S125; inference for this
  repertoire); taiko and clapping as drums; flute doubling; no block chords.
- **Capabilities needed:** `pentatonic-scales`, `exotic-scales`, `accompaniment-roles`,
  `slides-bends`, `drums`, `drone-pedal`, `timbre-presets`.
- **Fidelity:** today **hint**; with capabilities **recognisable**. Lost: shakuhachi breath and
  pitch bending, vocal ornament, free-rhythm singing.

### 16. Chinese pentatonic and silk-and-bamboo

- **Family / place / era:** Han Chinese folk and instrumental music, with Jiangnan sizhu
  ("silk and bamboo") as one ensemble model (S407). **One line:** five-note modes played by
  several instruments, each decorating the same tune its own way.
- **Recognise it by:** the major pentatonic as the basic scale, with five modes (gōng, shāng,
  jué, zhǐ, yǔ) on its five notes (S100); ensembles of erhu, dizi or xiao, pipa and yangqin that
  play ornamented variants of an older skeleton tune, such as Lao Liu Ban (S407); simultaneous
  variants of one tune, heterophony (S125); erhu slides (inference).
- **Today's controls:** Ionian (a superset of gōng), Dorian or Mixolydian (supersets of shāng and
  zhǐ), Aeolian (a superset of yǔ) (inference); Static or Gentle diatonic; Eighth; Arch.
- **Tuning (soft weights):** whole steps and minor thirds heaviest; the two non-pentatonic
  degrees only as brief passing notes (inference).
- **Restriction (hard constraints):** one of the five pentatonic modes; ending on its final.
- **Manipulation:** "skeleton then decoration": generate a plain line, then derive ornamented
  variants for other voices (inference; the same move serves gamelan); motif repetition; slides.
- **Accompaniment (v4 roles):** heterophonic doubling by two or three timbres; no block chords
  (inference).
- **Capabilities needed:** `pentatonic-scales`, `accompaniment-roles`, `slides-bends`,
  `symbol-ornaments`, `motif-repetition-development`, `timbre-presets`.
- **Fidelity:** today **hint**; with capabilities **recognisable**. Lost: instrument sound, the
  huge regional variety, opera's own rhythmic systems.

### 17. Javanese and Balinese gamelan

- **Family / place / era:** bronze percussion orchestras of Java and Bali. **One line:**
  cyclic music in which a skeleton melody is punctuated by gongs and elaborated by faster
  instruments. **Cultural care:** each gamelan set has its own tuning, unlike any twelve-note
  scale, and the music is cyclic and long; a phrase here is an approximation inspired by it.
- **Recognise it by:** **colotomic structure**: nested cycles marked by the gong ageng (the whole
  cycle), kenong (quarters), kempul and ketuk (smaller halves); a lancaran cycle is 16 beats, a
  ladrang 32; strokes fall on the last beat of each group (S408); the **gatra**, a four-beat unit
  whose final beat is strongest (S408); the **balungan**, a skeleton melody that other instruments
  elaborate at density levels (irama) from 1 to 16 notes per beat (S408); Balinese **kotekan**:
  two parts (polos and sangsih) interlocking four or eight times faster than the core melody
  (S409); **slendro** (five roughly equal steps) and **pelog** (seven unequal steps, used in
  five-note subsets called pathet), both varying from set to set (S410, S100).
- **Today's controls:** none close (no five-note collections; downbeat-weighted rhythm).
- **Tuning (soft weights):** a slendro stand-in from a twelve-note pentatonic and a pelog
  stand-in from a pathet-like five-note subset (inference); steady quarter-note balungan; the
  phrase target note (seleh) on the last beat of each bar.
- **Restriction (hard constraints):** a five-note collection; a 16-beat lancaran is exactly
  four 4/4 bars (inference); strongest weight on beat 4, not beat 1.
- **Manipulation:** a punctuation layer marking the cycle; the elaborating voices derived from
  the skeleton by doubling density (irama); kotekan as two interlocking parts.
- **Accompaniment (v4 roles):** gong, kenong, kempul and ketuk punctuation; saron doubling the
  balungan; bonang elaboration; kendang drum; kotekan pair. Timbre: bronze metallophones and
  gongs.
- **Capabilities needed:** `pentatonic-scales`, `microtonal-approximation`,
  `NEW:colotomic-cycle`, `NEW:hocket-interlock`, `accompaniment-roles`, `drums`,
  `timbre-presets`, `motif-repetition-development`.
- **Fidelity:** today **none**; with capabilities **recognisable as a sketch**. Lost: each set's
  tuning, the bronze sound, the drummer-led tempo and density changes over long cycles.

### 18. French bal-musette (optional extra)

- **Family / place / era:** Paris dance halls from the 1880s; Auvergnat bagpipe (cabrette) at
  first, then Italian accordionists (S411). **One line:** accordion waltzes and javas with
  chromatic, ornamented melody, an ancestor of gypsy jazz.
- **Recognise it by:** the valse-musette (with a fast spinning variant, la toupie) and the java;
  musette versions of tango and paso doble; links to 1930s gypsy jazz (S411); the accordion's
  bright tremolo tuning (inference); chromatic runs and turns (inference).
- **Today's controls:** none close (3/4). Jazz grammar for chromatic approaches; Major or
  Minor; Eighth; Wandering.
- **Tuning (soft weights):** eighth runs, chromatic approaches and enclosures, arpeggios of
  dominant sevenths (inference).
- **Restriction (hard constraints):** 3/4; major or harmonic minor; I–V7 harmony with secondary
  dominants (inference).
- **Manipulation:** waltz form in eight-bar parts with a change to the relative key (inference).
- **Accompaniment (v4 roles):** bass on 1 and chords on 2 and 3 ("oom-pah-pah"); guitar or banjo
  comping (inference).
- **Capabilities needed:** `triple-meter`, `seventh-chords`, `harmonic-minor`,
  `accompaniment-roles`, `timbre-presets`, `phrase-length`, `progression-templates`.
- **Fidelity:** today **none**; with capabilities **recognisable**. Lost: the accordion sound and
  its bellows phrasing.

## Capability notes

**Most needed across these eighteen styles** (count of styles listing it):
`accompaniment-roles` (18), `drums` (10), `symbol-ornaments` (8), `rhythm-cells-timelines` (8),
`motif-repetition-development` (8), then `drone-pedal`, `phrase-length`, `slides-bends` and
`timbre-presets` (7 each), `pentatonic-scales` (6), `exotic-scales` (5). Meter is the single
biggest blocker: `compound-meter`, `triple-meter` or `odd-meter` is needed by seven styles to be
faithful at all (jig, polska, klezmer, Balkan, flamenco, West African, musette; raga only for its
shorter cycles), and the 4/4 four-bar phrase cannot fake it.

**New capability ids:**

- `NEW:microtiming`: a fixed, stored timing offset per position in the bar (a beat or
  subdivision placed early or late by a ratio), generalising `swing-feel` to whole beats.
  Serves: polska (uneven beats), samba (pushed sixteenths), possibly tango's arrastre.
- `NEW:directional-scales`: different allowed notes when the line rises and when it falls.
  Serves: raga (ascent and descent), maqam (Rast rising with the half-flat 7th, falling through
  Nahawand's flat 7th; inference from S398).
- `NEW:pitch-path-plan`: a planned order of emphasis over a phrase or a run of phrases (which
  note group or degree the line dwells on, bar by bar). Serves: maqam (the path through ajnas),
  raga (vadi, samvadi, characteristic phrase).
- `NEW:hocket-interlock`: one melodic line split between two voices that alternate notes, each
  filling the other's gaps. Serves: Andean siku (ira and arka), Balinese kotekan.
- `NEW:colotomic-cycle`: a punctuation layer of voices marking nested subdivisions of a cycle,
  heaviest at the cycle's end. Serves: gamelan; a variant (heaviest at the start, with an "empty"
  beat) could mark a raga's tala.

**Inference.** Three of these are cheap generalisations of things already planned:
`NEW:microtiming` extends swing (D20), `NEW:hocket-interlock` is a v4 role over an existing line,
and `NEW:colotomic-cycle` is a v4 role with a fixed pattern. `NEW:directional-scales` and
`NEW:pitch-path-plan` touch the pitch planner itself.

## Open questions

1. **Meter.** Does the app ever leave four bars of 4/4? Seven of eighteen styles here need
   another meter; jig and polska are the cheapest wins (compound 6/8, plain 3/4).
2. **Microtones.** Should the app write half-flats (Rast, Bayati) and let the player supply the
   pitch, or round to twelve notes and label the result? MIDI acknowledgement works in
   semitones; pitch bend tolerance would be new.
3. **Unmetered music.** Doina, taqsim, alap and free-rhythm min'yō are central to their
   traditions but cannot be sight-read on a grid. Confirm they stay out of scope.
4. **Naming.** Should packs drawn from living traditions carry "inspired by" in their names or
   cards, with a line on what is missing? (Recommended, inference.)
5. **Whose line is the player's?** In gamelan the player could take the skeleton or an
   elaboration; in Ewe drumming the "melody" is not the lead. Which part should a sight-reader
   play?
6. **Fixed refrains.** Montuno coros, tune figures and fuga repeats are memorisable material; is
   that acceptable for P2's unmemorisable reading (D59), or only for P1 and P3 packs?
7. **Heterophony as a role.** Several styles (old-time, maqam, Chinese, Japanese, gamelan) want
   accompaniment that varies the lead line rather than chords. Confirm v4's heterophonic doubling
   role covers it.

## Lexicon candidates

Merged into the [lexicon](../lexicon.md) on 2026-10-11, together with the candidates of the other
style atlas files: [Jig](../lexicon.md#jig), [Compound meter](../lexicon.md#compound-meter), [Aksak](../lexicon.md#aksak), [Polska](../lexicon.md#polska), [Phrygian dominant scale](../lexicon.md#phrygian-dominant-scale), [Augmented second](../lexicon.md#augmented-second), [Andalusian cadence](../lexicon.md#andalusian-cadence), [Compás](../lexicon.md#compás), [Clave](../lexicon.md#clave), [Tresillo](../lexicon.md#tresillo), [Timeline](../lexicon.md#timeline), [Montuno](../lexicon.md#montuno), [Tumbao](../lexicon.md#tumbao), [Hocket](../lexicon.md#hocket), [Maqam](../lexicon.md#maqam), [Jins](../lexicon.md#jins), [Quarter tone](../lexicon.md#quarter-tone), [Raga](../lexicon.md#raga), [Tala](../lexicon.md#tala), [Gamaka](../lexicon.md#gamaka), [Gamelan](../lexicon.md#gamelan), [Colotomic structure](../lexicon.md#colotomic-structure) and [Slendro and pelog](../lexicon.md#slendro-and-pelog). Ostinato stays an alias of [Riff](../lexicon.md#riff).

## Sources

This document's sources are registered in [research sources](../research-sources.md), in the block
[Style Atlas: Folk and World Traditions](../research-sources.md#style-atlas-folk-and-world-traditions) (merged on 2026-10-11).
They are reference only: no text is copied or closely paraphrased. All URLs were checked on 2026-10-11.

- New for this document: S373–S411.
- Already in the register and cited above: S46 (rhythm and meter in pop music), S80 (call and response), S85 (tihai), S100 (pentatonic scale), S106 (reel), S107 (modes in Irish and Scottish music), S108 (Irish ornamentation), S112 (bossa nova), S125 (heterophony) and S135 (drone).
