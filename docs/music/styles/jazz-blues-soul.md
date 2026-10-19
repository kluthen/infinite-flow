# Style Atlas: Blues, Jazz, Gospel and Soul

Status: research (2026-10-11), style atlas groundwork; not settled policy.

## Purpose

This atlas describes fourteen African-American styles (blues, jazz, gospel, soul, funk and their
neighbours) in terms the phrase generator could act on: **tuning** (soft weights), **restriction**
(hard constraints) and **manipulation** (transformations and planned material). It is a roadmap
hint, not a spec. It reuses the vocabulary of the
[preset catalogue](../preset-catalogue.md#candidate-built-in-presets), the
[generation breadth review](../generation-breadth-review.md#what-a-style-pack-would-revive) and the
[draft identity schema](../identity-modelling.md#draft-identity-schema-inference), and the role
names of [arranging and roles](../arranging-and-roles.md#role-catalogue). These styles share a
lot (swing, seventh chords, blue notes, call and response, the 12-bar blues), so one capability
built for one of them usually serves several. Everything here stays procedurally generated, so
each entry says briefly what that loses. Claims with a source id (S…) are sourced; claims
marked **(inference)** are the author's reading or common practice not checked against a source.

**Fidelity scale.** _none_: nothing of the style comes through; _hint_: a listener might guess
the family; _recognisable_: a player of the style would name it; _convincing_: it would pass as a
plain, competent example. The preset catalogue's "thin" is about _hint_ and its "fair" about
_recognisable_ (inference, to keep the two documents consistent).

| #   | Style                                              | Family       | Fidelity today            | Fidelity with capabilities       |
| --- | -------------------------------------------------- | ------------ | ------------------------- | -------------------------------- |
| 1   | Delta blues                                        | Blues        | hint                      | recognisable                     |
| 2   | Chicago (electric) blues                           | Blues        | hint                      | convincing                       |
| 3   | Boogie-woogie                                      | Blues piano  | none                      | convincing                       |
| 4   | Ragtime                                            | Pre-jazz     | hint                      | convincing                       |
| 5   | New Orleans jazz / Dixieland                       | Early jazz   | hint                      | recognisable                     |
| 6   | Swing / big band                                   | Jazz         | hint                      | recognisable                     |
| 7   | Bebop                                              | Jazz         | hint                      | convincing                       |
| 8   | Cool and modal jazz                                | Jazz         | recognisable (modal side) | convincing (modal), recognisable |
| 9   | Hard bop and soul jazz                             | Jazz         | hint                      | recognisable                     |
| 10  | Jazz waltz                                         | Jazz         | none                      | recognisable                     |
| 11  | Gospel                                             | Sacred       | hint                      | recognisable                     |
| 12  | Soul and Motown                                    | Popular, R&B | hint                      | recognisable                     |
| 13  | Funk                                               | Popular, R&B | hint                      | convincing                       |
| 14  | Rhythm and blues and early rock and roll (overlap) | Popular, R&B | hint                      | convincing                       |

## Styles

### 1. Delta blues

- **Family / place / era:** blues; the Mississippi Delta, early 20th century, first recorded around
  the Great Depression (Charley Patton, Son House, Robert Johnson) (S315). **One line:** one person
  singing with an acoustic guitar (often played with a slide) or a harmonica, in a loose,
  speech-like form.
- **Recognise it by:** slide guitar, "a hallmark of the style" (S315); **blue notes**, the lowered
  3rd, 5th and 7th, often sung between two piano keys (S313, S314); a voice answered by the guitar (call
  and response, S313); a flexible form, with verses freely repeated or extended in early blues (S313);
  a repeated guitar figure on the low tonic string (inference).
- **Today's controls:** Collection Dorian (it holds the whole minor pentatonic, 1 ♭3 4 5 ♭7) or
  Mixolydian; Harmonic motion Static (one-chord blues) or Gentle diatonic; Note density Eighth;
  Rhythmic variety Heavily varied; Syncopation Occasional offbeats; Silence density Breath-heavy;
  Contour Falling; Register Middle; Jazz profile, for the chromatic approach from below to the 3rd
  (the "blues slide written as two notes", [preset catalogue, Blues](../preset-catalogue.md#7-blues)).
- **Tuning (soft weights):** favour degrees 1, ♭3, 4, 5, ♭7; favour the ♭3→3 approach (figure 13)
  and falls from the tonic; long notes at the end of each line; heavy swing, because slow tempos
  swing more (S307); tempo about 60–90 BPM (inference).
- **Restriction (hard constraints):** melody from the blues scale 1 ♭3 4 ♯4 5 ♭7 (S310), never the
  major 7th (inference); chords I, IV, V only, or the tonic alone; a voice-like range of about an
  octave and a half (inference).
- **Manipulation:** AAB lines, each a four-bar phrase (S310); in each line the call takes the first
  two bars and the instrument answers in the last two (S310); held blue notes (figure 21) and slides
  (figures 30–31); stretched or shortened lines (needs variable bar counts).
- **Accompaniment (v4 roles):** one guitar voice: thumb bass on the tonic on every beat, a repeated
  riff or slide fill in the answer gaps; no drums (a foot stomp at most). Timbres: steel-string
  guitar, harmonica (inference).
- **Capabilities needed:** `blues-scale-blue-notes`, `pentatonic-scales`, `swing-feel`,
  `slides-bends`, `microtonal-approximation`, `call-and-response-form`, `phrase-length`,
  `compound-meter`, `accompaniment-roles`, `timbre-presets`, `NEW:split-melody-chord-collections`.
- **Fidelity:** today _hint_; with capabilities _recognisable_. Lost: the voice and its words, the
  bending between pitches (S314), and the performer's free, speech-led timing.

### 2. Chicago (electric) blues

- **Family / place / era:** blues; Chicago, after the Great Migration, peak in the late 1940s and
  early 1950s (Muddy Waters, Howlin' Wolf) (S316). **One line:** Delta blues plugged in: electric
  guitar, amplified harmonica, bass, drums and sometimes piano, on a steady 12-bar form (S316).
- **Recognise it by:** the [12-bar blues](../lexicon.md#twelve-bar-blues) on I7, IV7 and V7 (S309,
  S316); the **shuffle**, a long-short swung pair (S317), "the blues beat" that spread into R&B (S313);
  a repeated [riff](../lexicon.md#riff) (S83); AAB lines with call and response (S310); band
  **stop-time** passages under the voice (inference).
- **Today's controls:** this is the catalogue's [Blues candidate](../preset-catalogue.md#7-blues):
  Jazz profile, Gentle diatonic, Eighth, Heavily varied, Occasional offbeats, Breath-heavy, Falling,
  Middle; Collection Mixolydian (Dorian for a minor blues). It stays _thin_ today: no IV or V in the
  Mixolydian plan, no sevenths, no swing, no 12 bars.
- **Tuning (soft weights):** favour strongly ♭3 against the I chord resolving up to 3 (figure 13);
  favour ♭7 and the 6th; favour chord-change targets on beat 1; swing ratio about 2:1 (S307, S317);
  rests in bars 3–4 of each line; tempo about 70–130 BPM (inference).
- **Restriction (hard constraints):** chord plan I7 I7 I7 I7 | IV7 IV7 I7 I7 | V7 IV7 I7 I7 (S309);
  every chord a dominant seventh, so the chords do not fit one key (S309); melody from the blues scale
  plus the major 3rd and 6th (the "major blues" notes, S310); swung eighths only.
- **Manipulation:** the "quick change" (IV in bar 2) and a turnaround in bars 11–12 (S309); line 2
  repeats line 1's melody, adjusted to fit IV (S310); one riff reused in every line as a signature
  motif; stop time in the first four bars (inference).
- **Accompaniment (v4 roles):** shuffle bass on root–5th–6th–♭7 (the guitar "boogie" figure,
  inference); rhythm guitar on 5th–6th dyads; piano triplet fills; harmonica
  [fills](../arranging-and-roles.md#fills) in the answer gaps; drums: swung hi-hat or ride,
  [backbeat](../lexicon.md#backbeat) on 2 and 4 (S311, S139).
- **Capabilities needed:** `swing-feel`, `seventh-chords`, `progression-templates`,
  `phrase-length`, `blues-scale-blue-notes`, `call-and-response-form`,
  `motif-repetition-development`, `slides-bends`, `accompaniment-roles`, `drums`,
  `NEW:split-melody-chord-collections`, `NEW:stop-time-breaks`.
- **Fidelity:** today _hint_; with capabilities _convincing_. Lost: guitar string bends, amplifier
  distortion and the voice.

### 3. Boogie-woogie

- **Family / place / era:** blues piano; African-American communities of the South (often traced to
  Northeast Texas) from the 1870s, a popular craze around the 1940s (S318). **One line:** blues piano
  dance music: a driving, repeated left-hand bass figure in eighth notes ("eight to the bar") under
  right-hand riffs, on the 12-bar blues (S318).
- **Recognise it by:** "a regular left-hand bass figure, which is transposed following the chord
  changes" (S318); eight to the bar (S318); the 12-bar blues (S318); right-hand repeated riffs,
  tremolos and "crushed" grace notes from ♭3 to 3 (inference).
- **Today's controls:** none close for the left hand, which is the style (today's backing is block
  chords on whole beats). For the right-hand line: Mixolydian, Gentle diatonic, Eighth, Strict,
  Occasional offbeats, Sparse, Register High, Jazz profile.
- **Tuning (soft weights):** short repeated right-hand riffs; arpeggiated chord figures (figure 18);
  grace note ♭3→3 (figure 23); tempo about 100–180 BPM (inference).
- **Restriction (hard constraints):** the 12-bar blues; an eighth-note grid; one bass pattern per
  piece, transposed to the chord root (S318).
- **Manipulation:** the stored bass pattern (walking octaves, or root–3–5–6–♭7–6–5–3) as an
  [ostinato](../arranging-and-roles.md#ostinato-riff-and-vamp) moved with the chords (pattern
  shapes are inference); one riff kept on the same pitches over I and IV; right-hand groups of
  3+3+2 eighths against the steady bass (inference).
- **Accompaniment (v4 roles):** the boogie bass is the main system voice; drums optional (brushes,
  shuffle). Timbre: piano.
- **Capabilities needed:** `accompaniment-roles`, `rhythm-cells-timelines`,
  `progression-templates`, `phrase-length`, `seventh-chords`, `swing-feel`, `symbol-ornaments`,
  `motif-repetition-development`, `polyrhythm`, `timbre-presets`.
- **Fidelity:** today _none_; with capabilities _convincing_, because the style is a fixed pattern
  under riffs, which suits rules (inference). Lost: the two-handed piano texture, since the player
  plays one line.

### 4. Ragtime

- **Family / place / era:** pre-jazz piano; USA (Scott Joplin), from the early 1890s, heyday to the
  1910s (S319). **One line:** composed, written-out piano music: a syncopated right-hand melody over
  a march-like "oom-pah" left hand (S319).
- **Recognise it by:** left hand with bass notes on the strong beats and chords on the weak beats
  (counted in 4/4: 1 and 3, then 2 and 4) (S319, S320); a syncopated melody, a "melody of metric
  denial" over a steady beat (S319); several 16-bar strains in repeats such as AABBACCC′ or
  AABBCCDD, with later strains in the subdominant (S319); "never right to play ragtime fast" (S319);
  even (straight) eighths, not swung (inference).
- **Today's controls:** Collection Major; Harmonic motion Active diatonic; Note density Eighth
  (ragtime's sixteenths in 2/4 read as eighths in 4/4, inference); Rhythmic variety Heavily varied;
  Syncopation Active displacement; Silence density Sparse; Contour Arch; Register Middle; Neutral
  profile, or Jazz for chromatic decoration. All supported rhythm settings.
- **Tuning (soft weights):** favour the short-long-short cell (eighth–quarter–eighth in 4/4) and
  ties across the middle of the bar (inference); favour chromatic passing and neighbour tones
  (figures 3, 5); favour secondary dominants (V of V, V of ii) (inference); tempo about 70–100 BPM.
- **Restriction (hard constraints):** straight eighths; 2/4 or 4/4; each strain four four-bar
  phrases; triads, dominant sevenths and diminished sevenths (inference).
- **Manipulation:** strain form AABBACCDD (S319); trio modulation to IV (S319);
  a strain repeats exactly; a closed cadence at every strain end; the 3+3+2 grouping across the
  beat (inference).
- **Accompaniment (v4 roles):** oom-pah or stride bass: a low note or octave on 1 and 3, a
  mid-register chord on 2 and 4 (S319, S320); no drums. Timbre: piano, possibly a bright upright.
- **Capabilities needed:** `accompaniment-roles`, `rhythm-cells-timelines`, `phrase-length`,
  `modulation`, `closed-endings`, `seventh-chords`, `progression-templates`,
  `motif-repetition-development`.
- **Fidelity:** today _hint_; with capabilities _convincing_. Lost: the composed long form and the
  two-hand writing; the player reads only the right hand.

### 5. New Orleans jazz / Dixieland

- **Family / place / era:** early jazz; New Orleans, start of the 20th century, first recorded
  1917; revival in the 1940s and 1950s (S321). **One line:** a small band whose trumpet, clarinet
  and trombone improvise together around the tune at the same time, over banjo, tuba or bass, piano
  and drums (S321).
- **Recognise it by:** "collective, polyphonic improvisation" (S321); the trumpet or cornet plays the
  melody while the other front-line instruments improvise around it (S321); clarinet weaving above,
  trombone below with slides (inference); a two-beat feel (tuba and banjo) or four to the bar (string
  bass) (S321); solo **breaks** where the band stops for two bars (inference).
- **Today's controls:** Major; Gentle or Active diatonic; Eighth; Slightly varied; Occasional
  offbeats; Conversational; Arch; Middle; Jazz profile.
- **Tuning (soft weights):** the player is the lead: chord tones, near the tune, mid register;
  anticipations (figure 9); light swing; tempo about 90–200 BPM (inference).
- **Restriction (hard constraints):** triads and dominant sevenths, no extended chords; mostly
  major keys; forms from marches, rags, blues and songs (S321).
- **Manipulation:** breaks (stop time) before a new chorus; a final "tag" ending; counter-lines
  placed in the lead's rests so the voices take turns (inference).
- **Accompaniment (v4 roles):** [counter-melody](../lexicon.md#counter-melody) above (clarinet:
  faster arpeggios, high), counter-line below (trombone: slower roots and 3rds, glissandi), two-feel
  bass (root and 5th on 1 and 3,
  [bass roles](../arranging-and-roles.md#bass-roles-root-two-feel-walking-pedal)), banjo chords;
  drums: snare and woodblock (inference).
- **Capabilities needed:** `counterpoint`, `accompaniment-roles`, `swing-feel`, `seventh-chords`,
  `progression-templates`, `phrase-length`, `slides-bends`, `drums`, `timbre-presets`,
  `NEW:stop-time-breaks`.
- **Fidelity:** today _hint_; with capabilities _recognisable_. Lost: true collective improvisation,
  where the voices react to each other; rule-based counter-lines only approximate it.

### 6. Swing / big band

- **Family / place / era:** jazz; USA, the swing era 1935–1946, dance music for the Lindy Hop (S322);
  Fletcher Henderson, Count Basie (S322, S122). **One line:** dance jazz for big bands: trumpet,
  trombone and saxophone sections trade short riffs in call and response over a four-beat rhythm
  section (S322, S122).
- **Recognise it by:** [swing](../lexicon.md#swing) eighths (S307); "riffs in a call-response
  pattern" between brass and reeds (S322); a walking bass and a steady four-beat pulse (S132,
  inference for the guitar); accents on 2 and 4 (S322, S307); a soloist over background riffs; 12-bar
  blues and 32-bar songs, often in [head arrangements](../lexicon.md#head) (S121, S313).
- **Today's controls:** Major; Gentle diatonic; Eighth; Slightly varied; Occasional offbeats;
  Conversational; Arch; Middle; Jazz profile.
- **Tuning (soft weights):** favour short two-bar riffs; favour chord tones 3, 5, 6 and the 9th
  (sixth chords are typical, inference); anticipations (figure 9); offbeat accents on the second
  eighth of a pair (S307); swing ratio about 2:1 at medium tempo (S307); tempo about 120–200 BPM.
- **Restriction (hard constraints):** swung 4/4; sixth and seventh chords; 12-bar or 32-bar AABA
  forms.
- **Manipulation:** a two-bar riff stated, repeated and adjusted to the chords; the player's line as
  call, a system section as response; a loud final "shout chorus" (inference);
  [trading fours](../lexicon.md#trading-fours) (S81).
- **Accompaniment (v4 roles):** [walking bass](../lexicon.md#walking-bass) (S132); sparse piano
  [comping](../lexicon.md#comping) (S131); background riffs or pads; section
  [stabs](../lexicon.md#stab) and hits; drums: ride or hi-hat swing pattern, bass drum softly on
  every beat (inference). Timbres: brass and saxophone sections.
- **Capabilities needed:** `swing-feel`, `seventh-chords`, `accompaniment-roles`,
  `call-and-response-form`, `motif-repetition-development`, `phrase-length`,
  `progression-templates`, `parallel-harmony` (sections in close harmony), `drums`,
  `articulation-dynamics`, `timbre-presets`.
- **Fidelity:** today _hint_; with capabilities _recognisable_. Lost: the weight and blend of a
  sixteen-piece band, and arranged section writing beyond simple planing.

### 7. Bebop

- **Family / place / era:** jazz; New York, early to mid 1940s (Charlie Parker, Dizzy Gillespie)
  (S103, S199). **One line:** small-group jazz with fast tempos, quick chord changes and long,
  angular eighth-note lines full of chromatic notes (S103).
- **Recognise it by:** long, continuous swung eighth-note lines; chromatic approaches and
  [enclosures](../lexicon.md#enclosure) around chord tones, with
  [bebop scales](../lexicon.md#bebop-scale) putting chord tones on the beats (S9); the ii–V–I,
  "one of the most important progressions in jazz" (S308); tunes on the blues and on "rhythm changes"
  (I–vi–ii–V) (S103); altered tensions (♭9, ♯9, ♯11) and chord substitutions (S103); stock formulas
  reused across solos (S199, S200).
- **Today's controls:** the catalogue's [Bebop candidate](../preset-catalogue.md#6-bebop): Jazz
  profile, Active diatonic, Eighth, Strict, Occasional offbeats, Sparse, Wandering, Varying; would
  also set Major, Build, Leaping, Varied. Today's Jazz profile is bebop's chromatic vocabulary in
  miniature: approaches and enclosures, but only 1.1–1.5 % chromatic notes without weights.
- **Tuning (soft weights):** favour strongly the chromatic approach (13), double chromatic approach
  (14), enclosures (15, 17), bebop-scale passing tone (20) and arpeggios up to the 9th (18); chord
  tones on downbeats (S9); a much higher chromatic rate than today; a lighter swing at fast tempos
  (S307); tempo about 160–300 BPM (above today's 240 limit).
- **Restriction (hard constraints):** continuous eighths, with rests mostly at phrase ends;
  chromatic notes only as approaches that resolve to chord tones (inference); seventh chords
  throughout.
- **Manipulation:** progression templates: ii–V–I in major and minor (S308), the rhythm-changes A
  section, the jazz blues (S309); substitutions such as the tritone substitute (S103); licks as
  signature motifs (S200); [sequences](../lexicon.md#sequence) (D210); octave displacement (22);
  lines that start and end off the beat.
- **Accompaniment (v4 roles):** walking bass (S132); piano comping on irregular offbeats (S131);
  drums: ride cymbal pattern, bass-drum accents (inference); a unison head (the player doubled at the
  octave, S121); trading fours (S81).
- **Capabilities needed:** `swing-feel`, `seventh-chords`, `extended-altered-chords`,
  `progression-templates`, `tempo-range`, `motif-repetition-development`, `sequences`,
  `accompaniment-roles`, `drums`, `phrase-length`, `modulation`,
  `NEW:chord-substitution-rules`.
- **Fidelity:** today _hint_ ("thin" in the catalogue); with capabilities _convincing_, since
  rule-based bebop lines are a well-studied target (S253, S165). Lost: long-range solo development
  and the rhythmic freedom of the great players.

### 8. Cool and modal jazz

- **Family / place / era:** jazz; cool: late 1940s–1950s, Miles Davis's _Birth of the Cool_
  (1949–50), the US West Coast (S323); modal: late 1950s–1960s, _Kind of Blue_ (1959) (S104, S324).
  **One line:** calmer jazz: cool jazz has relaxed tempos, a lighter tone and arranged counterpoint
  (S323); modal jazz holds one mode for many bars instead of fast chord changes (S104).
- **Recognise it by:** (modal) long stretches on one Dorian chord: "So What" is 32 bars AABA, 16 of
  D Dorian, 8 of E-flat Dorian, 8 of D Dorian (S324); chords stacked in fourths, the "So What chord"
  (three perfect fourths topped by a major third) (S324); a bass phrase answered by two chords (S324);
  (cool) moderate tempos, soft tone, counterpoint between horns (S323).
- **Today's controls:** the catalogue's
  [Modal (Dorian) candidate](../preset-catalogue.md#5-modal-dorian): Neutral profile, Gentle
  diatonic, Eighth, Slightly varied, Occasional offbeats, Conversational, Wandering, Varying;
  Collection Dorian. A Static variant is closer to "So What". _Fair_ today.
- **Tuning (soft weights):** favour Dorian's raised 6th, its
  [characteristic note](../lexicon.md#characteristic-note); favour fourths and pentatonic shapes;
  few chromatic notes; longer notes and more rests; light swing; tempo about 100–140 BPM ("very
  moderate" on the record, S324).
- **Restriction (hard constraints):** one mode per section; no V–I pull (non-functional harmony);
  minor-seventh or fourth-built chords.
- **Manipulation:** AABA where B is the same mode a half step higher (S324); call (the bass) and
  response (two planed chords) (S324); the [vamp](../lexicon.md#vamp) as the bed; for cool jazz, an
  arranged counter-line (S323).
- **Accompaniment (v4 roles):** walking bass inside the mode; comping in fourths, with chords
  sliding in parallel; [pedal point](../lexicon.md#pedal-point); drums with brushes (inference); a
  horn counter-melody for cool jazz (S323).
- **Capabilities needed:** `modal-harmony`, `seventh-chords`, `extended-altered-chords`,
  `parallel-harmony`, `swing-feel`, `phrase-length`, `modulation`, `call-and-response-form`,
  `counterpoint`, `pentatonic-scales`, `accompaniment-roles`.
- **Fidelity:** today _recognisable_ for the modal side, _hint_ for cool; with capabilities
  _convincing_ (modal) and _recognisable_ (cool). Lost: the soloist's slow build of intensity over a
  long static vamp.

### 9. Hard bop and soul jazz

- **Family / place / era:** jazz; USA, 1950s–1960s; hard bop from Art Blakey's Jazz Messengers and
  Horace Silver (S325); soul jazz around organ trios, Jimmy Smith, and Cannonball Adderley's "Mercy,
  Mercy, Mercy" (1966) (S326). **One line:** bebop pulled back toward the blues and the church:
  simpler, bluesy, gospel-flavoured tunes over a heavy groove; soul jazz goes further, with Hammond
  organ and repeated dance riffs (S325, S326).
- **Recognise it by:** influences from rhythm and blues, gospel and blues; "the melodies were
  generally simpler" (S325); gospel touches such as the plagal cadence (S325); a "funky" rollicking
  feel (S325); "an earthy, bluesy melodic concept" with "repetitive, dance-like rhythms" (S326); the
  bass sets the groove and the band adds riffs (S326).
- **Today's controls:** Dorian or Mixolydian; Gentle diatonic; Eighth; Heavily varied; Occasional
  offbeats; Conversational; Falling; Middle; Jazz profile.
- **Tuning (soft weights):** mix blues-scale notes (♭3, ♭5, ♭7) with bebop approaches; repeated
  one- or two-bar riffs; heavier swing at medium tempo (S307); minor keys common (inference); tempo
  about 90–180 BPM.
- **Restriction (hard constraints):** seventh chords; blues and 32-bar forms; the minor ii–V–i
  (iiø7–V7–i) (S308).
- **Manipulation:** a riff head repeated AAB-style; plagal IV–I endings (S325, S330); the minor blues,
  with minor i and iv and a ii–V in the third line (S309); horns answering the rhythm section
  (inference).
- **Accompaniment (v4 roles):** walking bass, or organ bass in soul jazz (inference); organ comping
  and held chords; drums with a strong backbeat; guitar on 2 and 4 (inference). Timbres: Hammond
  organ, tenor saxophone.
- **Capabilities needed:** `swing-feel`, `seventh-chords`, `blues-scale-blue-notes`,
  `progression-templates`, `closed-endings`, `motif-repetition-development`,
  `call-and-response-form`, `accompaniment-roles`, `drums`, `timbre-presets`,
  `NEW:split-melody-chord-collections`.
- **Fidelity:** today _hint_; with capabilities _recognisable_. Lost: the organ's sound and the
  band's groove feel (small timing pushes and drags).

### 10. Jazz waltz

- **Family / place / era:** jazz; modern-jazz waltzes from the mid-1950s: Sonny Rollins's "Valse
  Hot" (1956) and Max Roach's _Jazz in 3/4 Time_ (1957), then an innovation (S327, S328). **One
  line:** jazz in 3/4: swing and jazz harmony in waltz time.
- **Recognise it by:** three beats in the bar with the jazz rhythm section's swing, which proved
  "surprisingly compatible" with the waltz (S328); bass on beat 1, often felt "in one" (one pulse per
  bar), comping on beats 2 and 3, and groupings of two against the bar of three (hemiola) (all
  inference).
- **Today's controls:** none close (4/4 only). For the line itself: Jazz profile, Eighth, Slightly
  varied, Occasional offbeats.
- **Tuning (soft weights):** accent each bar's downbeat; favour hemiola groupings (2+2+2 eighths
  against 3+3); moderate swing; tempo about 120–200 quarter-note BPM (inference).
- **Restriction (hard constraints):** 3/4 meter; four- and eight-bar phrases still work.
- **Manipulation:** ii–V–I templates spread over two bars per chord; a hemiola cell placed before a
  cadence (inference).
- **Accompaniment (v4 roles):** bass on 1 (or three walking notes per bar); piano comping on 2 and
  3; drums: ride pattern adapted to three (S328 praises Roach's waltz timekeeping).
- **Capabilities needed:** `triple-meter`, `swing-feel`, `seventh-chords`,
  `progression-templates`, `polyrhythm`, `accompaniment-roles`, `drums`.
- **Fidelity:** today _none_; with capabilities _recognisable_. A useful first test of 3/4, which
  waltzes and other styles in this atlas series also need.

### 11. Gospel

- **Family / place / era:** sacred; African-American churches, USA; traditional gospel shaped by
  Thomas Dorsey from the 1930s, through to contemporary gospel (S329). **One line:** church music
  where a lead singer and a choir answer each other, with piano and organ, strong harmonies and hand
  claps, and repeated vamps that build intensity (S329, S331).
- **Recognise it by:** call and response (S329); a choir with strong harmonies (S329); hand-clapping
  and foot-stomping (S329); IV–I (plagal) motion repeated through sections, not only at the end
  (S330); the **vamp**, a short passage repeated to build a climax (S331, from summaries of the
  article); passing chords between main chords (inference).
- **Today's controls:** Major; Gentle diatonic (its templates include IV); Quarter or Eighth;
  Slightly varied; Occasional offbeats; Conversational; Arch; Middle; Neutral or Jazz profile. A
  closing IV–I is not possible today (endings stay open, D28).
- **Tuning (soft weights):** favour the major pentatonic (1, 2, 3, 5, 6) with ♭3 and ♭7 as
  passing colour; long held notes with turns at phrase ends; IV chords often; slow tempos felt in
  12/8 or fast "shout" tempos (inference).
- **Restriction (hard constraints):** mostly major keys; triads with added 6ths, 7ths and 9ths;
  diatonic with blues inflections (inference).
- **Manipulation:** plagal cadences IV–I and minor plagal iv–I (S330); the double plagal ♭VII–IV–I
  (S312); the player as lead (call) and system voices as choir (response, in block harmony); a two- or
  four-bar vamp repeated, often stepping up in key (inference); passing chords inserted between
  template chords.
- **Accompaniment (v4 roles):** organ [pad](../lexicon.md#pad); piano comping with fills; a choir
  pad in parallel thirds and triads; bass; drums with a backbeat and claps on 2 and 4 (S329, S139).
  Timbres: Hammond organ, piano, choir.
- **Capabilities needed:** `call-and-response-form`, `closed-endings`, `progression-templates`,
  `compound-meter`, `swing-feel`, `parallel-harmony`, `modulation`, `symbol-ornaments`,
  `slides-bends`, `accompaniment-roles`, `drums`, `timbre-presets`,
  `NEW:chord-substitution-rules`.
- **Fidelity:** today _hint_; with capabilities _recognisable_. Lost: the singing (melisma, words),
  the congregation and the service's improvised build. This is worship music: an instrumental
  generator gives an approximation inspired by it.

### 12. Soul and Motown

- **Family / place / era:** popular / rhythm and blues; USA, late 1950s–1970s; Motown in Detroit,
  Stax in Memphis (S332, S333). **One line:** secular songs built on gospel singing: lead and backing
  singers answer each other over a strong beat, with horns (Stax) or strings, vibraphone and
  tambourine (Motown) (S332, S333).
- **Recognise it by:** call-and-response singing from gospel (S332, S333); tambourines accenting the
  backbeat and "a four-beat drum pattern" (S333); prominent, often melodic bass lines (S333); handclaps
  (S332); horns (S332); simple song structures with sophisticated melodies (S333).
- **Today's controls:** the catalogue's [Pop song candidate](../preset-catalogue.md#4-pop-song) is
  nearest: Neutral, Gentle diatonic, Eighth, Heavily varied, Occasional offbeats, Conversational,
  Arch, Middle, Major. Mixolydian adds the ♭VII colour chord.
- **Tuning (soft weights):** major pentatonic with ♭3 and ♭7 inflections; anticipations (figure 9)
  favoured strongly; a hook repeated across phrases; tempo about 90–130 BPM (inference).
- **Restriction (hard constraints):** straight 4/4 for Motown, some soul swung or shuffled
  (inference); triads and sevenths; verse–chorus song forms (S114).
- **Manipulation:** hook repetition; templates I–IV vamp (S312), I–vi–IV–V (S113), ♭VII–IV–I (S312);
  the player's line answered by a backing-vocal pad; a final key change up a step (inference).
- **Accompaniment (v4 roles):** melodic, syncopated bass; tambourine or snare marking the beats;
  guitar chops on 2 and 4; horn stabs; string pads (Motown) or organ and horn riffs (Stax)
  (S332, S333).
- **Capabilities needed:** `progression-templates`, `motif-repetition-development`,
  `call-and-response-form`, `accompaniment-roles`, `drums`, `closed-endings`, `modulation`,
  `parallel-harmony`, `blues-scale-blue-notes`, `timbre-presets`.
- **Fidelity:** today _hint_; with capabilities _recognisable_. Lost: the voices and the studio
  sound that defined the labels.

### 13. Funk

- **Family / place / era:** popular / rhythm and blues; USA, from James Brown's mid-1960s grooves
  (S334). **One line:** dance music built on an interlocking groove of syncopated sixteenth notes,
  one- or two-chord vamps and a heavy accent on the first beat, "the One" (S334, S335).
- **Recognise it by:** "a heavy emphasis on the first beat of every measure ('The One')" (S334);
  sixteenth-note syncopation, sometimes swung sixteenths (S334); one- or two-chord vamps, often a
  minor seventh and a dominant seventh, with ninth chords implying Dorian or Mixolydian (S334); rests
  as important as notes (S334); interlocking bass, muted "chicken scratch" guitar and horn stabs
  (S334).
- **Today's controls:** Collection Dorian or Mixolydian; Harmonic motion Static (one chord), or
  Gentle diatonic in Dorian, whose single colour chord can be IV (the i–IV vamp); Note density
  Sixteenth (Eighth on a phone); Rhythmic variety Heavily varied (blocks nothing); Syncopation
  Active displacement; Silence density Conversational; Contour Wandering; Register Middle; Neutral
  profile. Closer than most styles here, but without the groove.
- **Tuning (soft weights):** favour onsets on beat 1 and on the sixteenth offbeats; short notes and
  rests; repeated one-bar riffs; minor pentatonic plus Dorian's 6th; chromatic approach from below
  (13); ghost notes; tempo about 90–120 BPM (inference).
- **Restriction (hard constraints):** a sixteenth grid; one or two chords per section; minor-seventh
  and ninth chords; no ii–V cadences (inference).
- **Manipulation:** a one- or two-bar riff repeated with small changes; every phrase lands on the
  One; a light sixteenth swing; a bridge on a second vamp chord; horn stabs answering the riff.
- **Accompaniment (v4 roles):** syncopated sixteenth bass ostinato locked to the kick drum;
  sixteenth rhythm guitar with muted strokes; clavinet or organ; horn stabs; drums: sixteenth
  hi-hat, backbeat snare with ghost notes, kick weighted on 1 (S334 for parts; drum details
  inference).
- **Capabilities needed:** `rhythm-cells-timelines`, `motif-repetition-development`,
  `modal-harmony`, `seventh-chords`, `extended-altered-chords`, `swing-feel`,
  `accompaniment-roles`, `drums`, `articulation-dynamics`, `timbre-presets`.
- **Fidelity:** today _hint_; with capabilities _convincing_, because a groove is a set of patterns
  (inference). Lost: micro-timing (playing slightly ahead of or behind the beat) and live interplay.

### 14. Rhythm and blues and early rock and roll (overlap)

Overlaps the popular-styles atlas; kept brief.

- **Family / place / era:** popular; USA, late 1940s–1950s; jump blues (Louis Jordan), "Rocket 88"
  (1951) (S336, S337). **One line:** blues for small dance bands with saxophones and a heavy beat, the
  direct parent of rock and roll (S336, S337).
- **Recognise it by:** a "heavy, insistent beat" (S336); an accented backbeat "almost always provided
  by a snare drum" (S337, S139); a shuffle feel that later moved to straight eighths (S336);
  boogie-woogie bass (S336); saxophone riffs (S336, S83); predictable chord patterns, often the 12-bar
  blues (S336, S313).
- **Today's controls:** as Chicago blues, with Major for rock and roll; Eighth; Slightly varied;
  Occasional offbeats; Conversational; Arch.
- **Tuning / restriction / manipulation:** riff melodies on chord tones with ♭3→3; tempo about
  120–180 BPM; the 12-bar template; a swing or straight setting (the historical shift itself);
  stop-time breaks (inference).
- **Accompaniment (v4 roles):** boogie or walking bass; piano repeating chords in triplets; saxophone
  riffs; drums with a snare backbeat.
- **Capabilities needed:** `swing-feel`, `seventh-chords`, `progression-templates`,
  `phrase-length`, `blues-scale-blue-notes`, `accompaniment-roles`, `drums`,
  `NEW:stop-time-breaks`.
- **Fidelity:** today _hint_; with capabilities _convincing_. Lost: the vocal and guitar sound.

## Capability notes

**Most needed by this family** (count of the 14 styles): `accompaniment-roles` (14),
`swing-feel` (12), `seventh-chords` (11), `progression-templates` (11), `drums` (10), then
`phrase-length` (9), `motif-repetition-development` and `timbre-presets` (8 each),
`call-and-response-form` (7) and `blues-scale-blue-notes` (5). This matches the breadth review's investment order (swing, sevenths
first) (inference).

**New ids proposed here:**

- `NEW:split-melody-chord-collections`: the melody's pitch set is chosen apart from the collection
  the chords are built from. Today one collection feeds both, but a blues plays a blues-scale melody
  over I7, IV7 and V7, which "do not fit one key" (S309), and its ♭3 clashes with the chord's major
  3rd on purpose (S310). Serves Delta and Chicago blues, hard bop and soul jazz, and indirectly R&B,
  soul and boogie-woogie.
- `NEW:chord-substitution-rules`: seeded rewriting rules over a progression template: put a ii
  before a V, swap a V for its tritone substitute, add secondary dominants, slip a chromatic passing
  chord between two chords, insert a plagal IV before I. Serves bebop and gospel; it could also
  give ragtime its secondary dominants and turn a plain 12-bar into the jazz blues (S309).
- `NEW:stop-time-breaks`: for one or two bars the accompaniment drops to short hits on chosen
  downbeats (stop time) or to silence (a break) while the lead keeps playing. Serves Chicago blues,
  New Orleans jazz and R&B.

**Notes on existing ids (inference):**

- `phrase-length`: blues and jazz forms are built from four-bar units (12 = 3 × 4, 16 = 4 × 4,
  AABA 32 = 8 × 4), and each line of an AAB blues is one four-bar phrase (S310). A form planner that
  chains four-bar phrases, giving each its slice of the chord plan and its relation (repeat,
  repeat-to-fit, answer), would keep the four-bar phrase as the generation unit. Only the Delta
  blues' stretched lines need truly variable bar counts.
- `swing-feel`: needs a subdivision (eighths for jazz and blues, sixteenths for funk, S334) and a
  ratio that falls as the tempo rises (S307). Swing is written as plain eighths (S307), so the score
  need not change.
- `blues-scale-blue-notes` vs today's Jazz profile: one switch, `allowsChromaticApproach`, unlocks
  both the approach and the enclosure. A style layer wants them apart: blues needs the approach to
  the 3rd from below and the held ♭3; bebop needs enclosures. Bebop and Blues should not share one
  grammar.
- `triple-meter`: the jazz waltz is a small, clean first case of 3/4.

## Open questions

1. **Forms longer than four bars.** May a style own a multi-phrase form (12-bar blues, AABA,
   ragtime strains), built as a chain of four-bar phrases? (Links to the breadth review's
   question 4.)
2. **How blue notes are written.** Only as a written ♭3 or ♭5 (12-tone), or also with a scoop or
   bend symbol the saxophonist can play? Should acknowledgement accept a bent pitch?
3. **Deliberate clashes.** Will pitch validation accept a ♭3 held over a major-3rd chord, which the
   blues requires but today's rules would treat as an unresolved chromatic note?
4. **Swing in playback and backing.** Should the backing swing (it sounds on whole beats today),
   and does a swung sixteenth (funk) still land inside the acknowledgement window?
5. **Tempo above 240 BPM.** Bebop heads often run faster; should a style allow it, or is the player's
   tempo always theirs?
6. **Sacred music in a game.** Gospel is worship music. Is it acceptable as a character's or
   location's identity in the rhythm RPG, and how should it be presented?
7. **Grammar split.** Should the Bebop and Blues presets keep sharing the Jazz grammar, or should
   the style layer split approach, enclosure and blue note into separate capabilities?

## Lexicon candidates

Merged into the [lexicon](../lexicon.md) on 2026-10-11, together with the candidates of the other
style atlas files: [Shuffle](../lexicon.md#shuffle), [Turnaround](../lexicon.md#turnaround), [Quick change](../lexicon.md#quick-change), [Stop time](../lexicon.md#stop-time), [Break](../lexicon.md#break), [Two-five-one](../lexicon.md#two-five-one), [Tritone substitution](../lexicon.md#tritone-substitution), [Plagal cadence](../lexicon.md#plagal-cadence), [Passing chord](../lexicon.md#passing-chord), [Oom-pah](../lexicon.md#oom-pah), [Boogie-woogie](../lexicon.md#boogie-woogie), [Strain](../lexicon.md#strain), [Collective improvisation](../lexicon.md#collective-improvisation), [Waltz](../lexicon.md#waltz), [Hemiola](../lexicon.md#hemiola), [The One](../lexicon.md#the-one), [Ghost note](../lexicon.md#ghost-note), [Quartal harmony](../lexicon.md#quartal-harmony), [Rhythm changes](../lexicon.md#rhythm-changes) and [AABA form](../lexicon.md#aaba-form). The oom-pah (stride) bass is merged into [Oom-pah](../lexicon.md#oom-pah), the boogie-woogie bass into [Boogie-woogie](../lexicon.md#boogie-woogie), the jazz waltz into [Waltz](../lexicon.md#waltz) and the quartal voicing into [Quartal harmony](../lexicon.md#quartal-harmony). The two-beat feel stays the two-feel of [Walking bass](../lexicon.md#walking-bass). The shout chorus is explained only in this document.

## Sources

This document's sources are registered in [research sources](../research-sources.md), in the block
[Style Atlas: Blues, Jazz, Gospel and Soul](../research-sources.md#style-atlas-blues-jazz-gospel-and-soul) (merged on 2026-10-11).
They are reference only: no text is copied or closely paraphrased.

- New for this document: S307–S337.
- Already in the register and cited above: S9 (jazz scales, bebop scale), S81 (trading fours), S83 (lick, riff and head), S103 (bebop), S104 (modal jazz), S113 (four-chord schemas), S114 (pop melody and phrasing), S121 (head arrangement), S122 (big band), S131 (comping), S132 (walking bass), S139 (backbeat), S165 (Impro-Visor), S199 (Owens, _Bebop_), S200 (Norgaard, Parker's patterns) and S253 (Impro-Visor grammar).
