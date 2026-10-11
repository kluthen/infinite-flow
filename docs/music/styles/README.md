# Style Atlas

Status: research (2026-10-11), style atlas synthesis and roadmap hint; not settled policy.

## Purpose and how to read

The style atlas describes 63 musical styles in terms Infinite Flow's generator could use,
and this page pulls the four family files together: one index, one shared capability vocabulary, a
style × capability matrix, a ranking of capabilities that doubles as a roadmap hint, a sketch of
the style layer, the conflicts with current decisions, and the questions the owner would need to
answer. Nothing here is decided; every ranking, cost and tier is **inference**.

**The four family files.**

- [Western art music](art-music.md): 12 styles, from Gregorian chant to the chorale, plus march
  and waltz.
- [Jazz, blues and soul](jazz-blues-soul.md): 14 styles, from Delta blues to funk.
- [Popular, electronic and game music](popular-electronic-game.md): 19 styles, including seven
  JRPG contexts (town, overworld, dungeon, battle, boss, victory fanfare) and epic trailer music.
- [Folk and world](folk-and-world.md): 18 styles, from the Irish reel to gamelan.

**The per-style template.** Every entry has the same short parts: family, place and era with a
one-line description; **recognise it by** (the three to five traits a listener notices first);
**today's controls** (the closest settings that exist now); **tuning** (soft weights: "more
often"), **restriction** (hard constraints: "never" or "only") and **manipulation**
(transformations and planned material such as a chord progression, a clave or a riff), the three
families of the [draft identity schema](../identity-modelling.md#draft-identity-schema-inference);
**accompaniment** (the v4 [roles](../arranging-and-roles.md#role-catalogue) the style would use);
**capabilities needed**; and **fidelity**.

**Fidelity scale.** With today's generator: **none** (the style cannot be heard), **hint** (one or
two traits are there), **recognisable** (a listener who knows the style names it). With the
listed capabilities: **hint**, **recognisable**, **convincing** (a listener who knows the style
would accept a four-bar fragment as a plausible excerpt).

**The honest caveat.** Everything stays procedurally generated. A seeded, rule-based four-bar
generator lacks the human intent behind a style: the text of a song, a composer's long-range
plan, improvisation that answers other players, expressive timing and the sound of real
instruments. For traditions built on microtones, long cycles or free time (maqam, raga, gamelan,
West African drumming, chant), what the app can make is an **approximation inspired by** the
tradition, written in twelve notes and four-bar 4/4 units, and it should be presented that way.

## Style index

Codes are used by the matrix and the ranking below. "Capabilities" counts the style's needs
after [normalisation](#capability-vocabulary-normalised).

| Code | Style                                                                                                                        | Family file                  | Today        | With capabilities                                                                                                                                                    | Capabilities |
| ---- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| AM1  | [Gregorian chant](art-music.md#1-gregorian-chant)                                                                            | Western art music            | hint         | recognisable (VL only for the organum variant)                                                                                                                       | 7            |
| AM2  | [Renaissance polyphony (Palestrina style)](art-music.md#2-renaissance-polyphony-palestrina-style)                            | Western art music            | hint         | recognisable                                                                                                                                                         | 7            |
| AM3  | [Baroque](art-music.md#3-baroque)                                                                                            | Western art music            | hint         | recognisable (D15 only for the triple/compound dance-movement variants; with capabilities may approach convincing (prelude-like phrase))                             | 12           |
| AM4  | [Classical period](art-music.md#4-classical-period)                                                                          | Western art music            | hint         | convincing                                                                                                                                                           | 9            |
| AM5  | [Romantic](art-music.md#5-romantic)                                                                                          | Western art music            | hint         | recognisable                                                                                                                                                         | 12           |
| AM6  | [Impressionism](art-music.md#6-impressionism)                                                                                | Western art music            | hint         | recognisable                                                                                                                                                         | 10           |
| AM7  | [Epic film orchestral (late Romantic)](art-music.md#7-epic-film-orchestral-late-romantic)                                    | Western art music            | hint         | recognisable                                                                                                                                                         | 9            |
| AM8  | [Minimalism](art-music.md#8-minimalism)                                                                                      | Western art music            | hint         | convincing                                                                                                                                                           | 5            |
| AM9  | [Neoclassical and modernist (tonal side)](art-music.md#9-neoclassical-and-modernist-tonal-side)                              | Western art music            | hint         | recognisable (recognisable for the neoclassical side only)                                                                                                           | 7            |
| AM10 | [March and fanfare](art-music.md#10-march-and-fanfare)                                                                       | Western art music            | hint         | convincing                                                                                                                                                           | 10           |
| AM11 | [Waltz (and minuet)](art-music.md#11-waltz-and-minuet)                                                                       | Western art music            | none         | convincing                                                                                                                                                           | 6            |
| AM12 | [Chorale and hymn](art-music.md#12-chorale-and-hymn)                                                                         | Western art music            | hint         | convincing                                                                                                                                                           | 8            |
| JB1  | [Delta blues](jazz-blues-soul.md#1-delta-blues)                                                                              | Jazz, blues and soul         | hint         | recognisable (compound-meter is listed but nothing in the entry implies a meter change)                                                                              | 11           |
| JB2  | [Chicago (electric) blues](jazz-blues-soul.md#2-chicago-electric-blues)                                                      | Jazz, blues and soul         | hint         | convincing                                                                                                                                                           | 11           |
| JB3  | [Boogie-woogie](jazz-blues-soul.md#3-boogie-woogie)                                                                          | Jazz, blues and soul         | none         | convincing                                                                                                                                                           | 10           |
| JB4  | [Ragtime](jazz-blues-soul.md#4-ragtime)                                                                                      | Jazz, blues and soul         | hint         | convincing                                                                                                                                                           | 8            |
| JB5  | [New Orleans jazz / Dixieland](jazz-blues-soul.md#5-new-orleans-jazz--dixieland)                                             | Jazz, blues and soul         | hint         | recognisable                                                                                                                                                         | 9            |
| JB6  | [Swing / big band](jazz-blues-soul.md#6-swing--big-band)                                                                     | Jazz, blues and soul         | hint         | recognisable (VL for section planing)                                                                                                                                | 11           |
| JB7  | [Bebop](jazz-blues-soul.md#7-bebop)                                                                                          | Jazz, blues and soul         | hint         | convincing                                                                                                                                                           | 12           |
| JB8  | [Cool and modal jazz](jazz-blues-soul.md#8-cool-and-modal-jazz)                                                              | Jazz, blues and soul         | recognisable | convincing (split: today recognisable (modal) / hint (cool); with capabilities convincing (modal) / recognisable (cool); core aims at convincing for the modal side) | 11           |
| JB9  | [Hard bop and soul jazz](jazz-blues-soul.md#9-hard-bop-and-soul-jazz)                                                        | Jazz, blues and soul         | hint         | recognisable                                                                                                                                                         | 11           |
| JB10 | [Jazz waltz](jazz-blues-soul.md#10-jazz-waltz)                                                                               | Jazz, blues and soul         | none         | recognisable                                                                                                                                                         | 7            |
| JB11 | [Gospel](jazz-blues-soul.md#11-gospel)                                                                                       | Jazz, blues and soul         | hint         | recognisable                                                                                                                                                         | 13           |
| JB12 | [Soul and Motown](jazz-blues-soul.md#12-soul-and-motown)                                                                     | Jazz, blues and soul         | hint         | recognisable                                                                                                                                                         | 10           |
| JB13 | [Funk](jazz-blues-soul.md#13-funk)                                                                                           | Jazz, blues and soul         | hint         | convincing                                                                                                                                                           | 10           |
| JB14 | [Rhythm and blues and early rock and roll (overlap)](jazz-blues-soul.md#14-rhythm-and-blues-and-early-rock-and-roll-overlap) | Jazz, blues and soul         | hint         | convincing                                                                                                                                                           | 7            |
| PE1  | [Pop](popular-electronic-game.md#pop)                                                                                        | Popular, electronic and game | hint         | convincing                                                                                                                                                           | 7            |
| PE2  | [Classic rock](popular-electronic-game.md#classic-rock)                                                                      | Popular, electronic and game | hint         | recognisable                                                                                                                                                         | 10           |
| PE3  | [Punk](popular-electronic-game.md#punk)                                                                                      | Popular, electronic and game | hint         | recognisable                                                                                                                                                         | 5            |
| PE4  | [Heavy metal](popular-electronic-game.md#heavy-metal)                                                                        | Popular, electronic and game | hint         | recognisable (D15 from "occasional odd bars", but odd-meter is not listed)                                                                                           | 12           |
| PE5  | [Country](popular-electronic-game.md#country)                                                                                | Popular, electronic and game | hint         | recognisable                                                                                                                                                         | 8            |
| PE6  | [Reggae](popular-electronic-game.md#reggae)                                                                                  | Popular, electronic and game | none         | recognisable                                                                                                                                                         | 6            |
| PE7  | [Hip-hop (boom bap)](popular-electronic-game.md#hip-hop-boom-bap)                                                            | Popular, electronic and game | none         | hint (ceiling is hint (at most recognisable as an instrumental beat); core reaches hint)                                                                             | 6            |
| PE8  | [House and techno](popular-electronic-game.md#house-and-techno)                                                              | Popular, electronic and game | none         | recognisable                                                                                                                                                         | 7            |
| PE9  | [Synthwave](popular-electronic-game.md#synthwave)                                                                            | Popular, electronic and game | none         | recognisable                                                                                                                                                         | 5            |
| PE10 | [Ambient and drone](popular-electronic-game.md#ambient-and-drone)                                                            | Popular, electronic and game | hint         | recognisable                                                                                                                                                         | 5            |
| PE11 | [Lo-fi hip-hop](popular-electronic-game.md#lo-fi-hip-hop)                                                                    | Popular, electronic and game | none         | recognisable                                                                                                                                                         | 7            |
| PE12 | [Chiptune (8-bit)](popular-electronic-game.md#chiptune-8-bit)                                                                | Popular, electronic and game | hint         | convincing (GRID only for thirty-second accompaniment arpeggios)                                                                                                     | 5            |
| PE13 | [JRPG town and village](popular-electronic-game.md#jrpg-town-and-village)                                                    | Popular, electronic and game | hint         | convincing                                                                                                                                                           | 7            |
| PE14 | [JRPG overworld and field](popular-electronic-game.md#jrpg-overworld-and-field)                                              | Popular, electronic and game | hint         | recognisable (D28 from the bVI-bVII-I cadence at loop points, though closed-endings is not listed)                                                                   | 7            |
| PE15 | [JRPG dungeon](popular-electronic-game.md#jrpg-dungeon)                                                                      | Popular, electronic and game | hint         | recognisable                                                                                                                                                         | 5            |
| PE16 | [JRPG battle](popular-electronic-game.md#jrpg-battle)                                                                        | Popular, electronic and game | hint         | recognisable                                                                                                                                                         | 8            |
| PE17 | [JRPG boss and final battle](popular-electronic-game.md#jrpg-boss-and-final-battle)                                          | Popular, electronic and game | none         | recognisable                                                                                                                                                         | 10           |
| PE18 | [JRPG victory fanfare](popular-electronic-game.md#jrpg-victory-fanfare)                                                      | Popular, electronic and game | none         | convincing                                                                                                                                                           | 7            |
| PE19 | [Epic trailer and battle](popular-electronic-game.md#epic-trailer-and-battle)                                                | Popular, electronic and game | hint         | recognisable                                                                                                                                                         | 6            |
| FW1  | [Irish and Scottish reel](folk-and-world.md#1-irish-and-scottish-reel)                                                       | Folk and world               | recognisable | convincing (already recognisable today; core aims at convincing)                                                                                                     | 7            |
| FW2  | [Irish and Scottish jig (and slip jig)](folk-and-world.md#2-irish-and-scottish-jig-and-slip-jig)                             | Folk and world               | none         | convincing                                                                                                                                                           | 5            |
| FW3  | [Appalachian old-time and bluegrass](folk-and-world.md#3-appalachian-old-time-and-bluegrass)                                 | Folk and world               | hint         | recognisable                                                                                                                                                         | 7            |
| FW4  | [Scandinavian polska](folk-and-world.md#4-scandinavian-polska)                                                               | Folk and world               | none         | recognisable (swing-feel is the normalised NEW:microtiming)                                                                                                          | 7            |
| FW5  | [Klezmer](folk-and-world.md#5-klezmer)                                                                                       | Folk and world               | hint         | recognisable                                                                                                                                                         | 8            |
| FW6  | [Balkan aksak dances (7/8, 9/8, 11/8)](folk-and-world.md#6-balkan-aksak-dances-78-98-118)                                    | Folk and world               | none         | recognisable                                                                                                                                                         | 8            |
| FW7  | [Flamenco](folk-and-world.md#7-flamenco)                                                                                     | Folk and world               | hint         | recognisable                                                                                                                                                         | 10           |
| FW8  | [Tango](folk-and-world.md#8-tango)                                                                                           | Folk and world               | hint         | recognisable                                                                                                                                                         | 8            |
| FW9  | [Son cubano and salsa](folk-and-world.md#9-son-cubano-and-salsa)                                                             | Folk and world               | hint         | recognisable                                                                                                                                                         | 7            |
| FW10 | [Samba and bossa nova](folk-and-world.md#10-samba-and-bossa-nova)                                                            | Folk and world               | hint         | recognisable                                                                                                                                                         | 8            |
| FW11 | [Andean huayno](folk-and-world.md#11-andean-huayno)                                                                          | Folk and world               | hint         | recognisable (D28 from "tonic at phrase end", though closed-endings is not listed)                                                                                   | 7            |
| FW12 | [West African timeline music and highlife](folk-and-world.md#12-west-african-timeline-music-and-highlife)                    | Folk and world               | none         | recognisable (split: with capabilities hint for the drum ensemble, recognisable for highlife; core aims at highlife)                                                 | 8            |
| FW13 | [Arabic maqam (Hijaz, Rast, Bayati)](folk-and-world.md#13-arabic-maqam-hijaz-rast-bayati)                                    | Folk and world               | none         | recognisable (split: with capabilities recognisable for Hijaz, hint for Rast and Bayati)                                                                             | 10           |
| FW14 | [Hindustani and Carnatic raga](folk-and-world.md#14-hindustani-and-carnatic-raga)                                            | Folk and world               | hint         | recognisable (rated "recognisable as a sketch")                                                                                                                      | 12           |
| FW15 | [Japanese min'yō and koto scales](folk-and-world.md#15-japanese-minyō-and-koto-scales)                                       | Folk and world               | hint         | recognisable                                                                                                                                                         | 7            |
| FW16 | [Chinese pentatonic and silk-and-bamboo](folk-and-world.md#16-chinese-pentatonic-and-silk-and-bamboo)                        | Folk and world               | hint         | recognisable (D28 from "ending on its final", though closed-endings is not listed)                                                                                   | 6            |
| FW17 | [Javanese and Balinese gamelan](folk-and-world.md#17-javanese-and-balinese-gamelan)                                          | Folk and world               | none         | recognisable (rated "recognisable as a sketch")                                                                                                                      | 6            |
| FW18 | [French bal-musette (optional extra)](folk-and-world.md#18-french-bal-musette-optional-extra)                                | Folk and world               | none         | recognisable                                                                                                                                                         | 7            |

Only 2 (JB8, FW1) reach **recognisable** today. The rest are a **hint** or **none**, for the
reasons each family file names: every phrase ends open, the minor collection has no raised leading
tone, chords are root-position triads changing at most twice a bar, the metre is 4/4 only, there
is no swing, and the backing is the same block chords for every style.

## Capability vocabulary, normalised

The four files used the 34 shared ids of the common brief and proposed 25 `NEW:` ids. Merging
them gives **43 normalised capabilities** (41 used by at least one style;
`rhythm-ratios` and `melodic-minor` are listed by no entry and kept for completeness). The family
files keep their own ids; this table is the mapping.

| Id in the family files               | Normalised id                    | Why                                                                   |
| ------------------------------------ | -------------------------------- | --------------------------------------------------------------------- |
| `NEW:microtiming`                    | `swing-feel`                     | swing is one case of a stored per-position timing offset              |
| `NEW:unmeasured-rhythm`              | `unmeasured-rhythm`              |                                                                       |
| `NEW:quartal-chords`                 | `extended-altered-chords`        | one more chord vocabulary beyond triads                               |
| `NEW:fast-harmonic-rhythm`           | `progression-templates`          | a template carries its own chord rhythm                               |
| `NEW:chord-substitution-rules`       | `chord-substitution-rules`       |                                                                       |
| `NEW:modal-mixture`                  | `modal-mixture`                  |                                                                       |
| `NEW:chromatic-mediants`             | `modal-mixture`                  | both are chords from outside the collection                           |
| `NEW:cadential-leading-tone`         | `harmonic-minor`                 | harmonic minor limited to the cadence                                 |
| `NEW:chord-inversions`               | `inversions-voice-leading`       | inversions and four-part voicing are one voicing engine               |
| `NEW:four-part-voice-leading`        | `inversions-voice-leading`       | same                                                                  |
| `NEW:split-melody-chord-collections` | `split-melody-chord-collections` |                                                                       |
| `NEW:directional-scales`             | `directional-scales`             |                                                                       |
| `NEW:pitch-path-plan`                | `pitch-path-plan`                |                                                                       |
| `NEW:wide-range`                     | `wide-range`                     |                                                                       |
| `NEW:suspensions-ties`               | `suspensions-ties`               |                                                                       |
| `NEW:loop-repetition`                | `motif-repetition-development`   | exact repetition is development with zero change                      |
| `NEW:process-music`                  | `motif-repetition-development`   | gradual change of a stored cell                                       |
| `NEW:fixed-stinger`                  | `motif-repetition-development`   | a stored figure placed by event                                       |
| `phrase-length`                      | `multi-phrase-form`              | longer forms are chains of four-bar phrases (jazz notes)              |
| `NEW:multi-phrase-form`              | `multi-phrase-form`              | same need, named differently                                          |
| `NEW:layer-build`                    | `multi-phrase-form`              | an intensity arc is a plan above the phrase                           |
| `NEW:stop-time-breaks`               | `accompaniment-roles`            | a rhythmic-punctuation role pattern                                   |
| `NEW:hocket-interlock`               | `accompaniment-roles`            | a role over an existing line (folk notes)                             |
| `NEW:colotomic-cycle`                | `accompaniment-roles`            | a role with a fixed pattern (folk notes)                              |
| `NEW:long-tones`                     | `drone-pedal`                    | held notes over a drone; the lead-side tie is a rhythm-planner detail |
| `NEW:audio-effects`                  | `timbre-presets`                 | effects ride on the same sound-library voice                          |

`NEW:` ids kept as their own capability: `unmeasured-rhythm`, `chord-substitution-rules`, `modal-mixture`, `split-melody-chord-collections`, `directional-scales`, `pitch-path-plan`, `wide-range`, `suspensions-ties`, `multi-phrase-form`. Within this page they are written without
the `NEW:` prefix.

**Layers.** Each capability touches one or more generator layers: the **harmony planner**, the
**rhythm planner**, the **pitch planner**, **embellishment** (figures and ornaments), the
**arranger** (v4 accompaniment roles), the **sound layer** (synths and effects), the **style
layer** (the pack data itself), the **display** (notation) and acknowledgement, and the **form
above the phrase** (planning across several phrases, which does not exist today). Decision ids
point to [the decision log](../../../specs/decisions.md); "v4" items are in the
[v4 folder](../../../specs/versions/v4/README.md).

**Rhythm and metre**

| Id                       | Plain definition                                                                                                                                                | Layer                                    | Decisions and versions       | Styles |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------- | ------ |
| `swing-feel`             | Long-short (or other uneven) subdivisions played from a stored timing ratio per beat position; covers swing, shuffle and fixed microtiming (polska, samba push) | rhythm planner, playback                 | D20                          | 17     |
| `triplets-tuplets`       | Beats split in three (or other tuplets) on a ternary grid, written as tuplets                                                                                   | rhythm planner, display                  | D15                          | 4      |
| `triple-meter`           | Bars of three beats (3/4)                                                                                                                                       | rhythm planner, display, backing         | D15                          | 8      |
| `compound-meter`         | Bars whose beats divide in three (6/8, 9/8, 12/8)                                                                                                               | rhythm planner, display, backing         | D15                          | 8      |
| `odd-meter`              | Bars of uneven beat groups (5/8, 7/8, 9/8 as 2+2+2+3, aksak)                                                                                                    | rhythm planner, display, backing         | D15                          | 5      |
| `unmeasured-rhythm`      | Notes grouped freely without strong and weak beats (chant)                                                                                                      | rhythm planner, display, acknowledgement | D15                          | 1      |
| `rhythm-cells-timelines` | A stored rhythm pattern or timeline (clave, tresillo, bell pattern) that the lead or a voice follows                                                            | rhythm planner (stored material)         | D217; v4 rhythm editor       | 17     |
| `polyrhythm`             | Two voices in different beat groupings at once (3 against 2)                                                                                                    | arranger (v4)                            | D15                          | 3      |
| `rhythm-ratios`          | How likely each note value is (soft weights); listed by no entry but implied by most Tuning lines                                                               | rhythm planner                           | D211; v4                     | 0      |
| `tempo-range`            | Tempi outside today's 60-240 BPM                                                                                                                                | session, playback                        | D203-D206 (240 BPM carry-in) | 4      |

**Harmony**

| Id                         | Plain definition                                                                                                                         | Layer                                   | Decisions and versions                           | Styles |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------ | ------ |
| `seventh-chords`           | Four-note chords (triad plus seventh), dominant sevenths above all                                                                       | harmony planner, pitch ranking, backing | D12                                              | 21     |
| `extended-altered-chords`  | Ninths and beyond, altered tones, added-note and quartal (stacked-fourth) chords                                                         | harmony planner, backing                | D12                                              | 9      |
| `progression-templates`    | Chord sequences the style chooses (12-bar blues, ii-V-I, I-V-vi-IV, Andalusian), with their own harmonic rhythm up to one chord per beat | harmony planner (stored material)       | D13                                              | 28     |
| `chord-substitution-rules` | Seeded rewriting of a progression (ii before V, tritone substitute, secondary dominants)                                                 | harmony planner                         | D12, D13                                         | 2      |
| `modal-mixture`            | Chords from outside the collection: borrowed from the parallel mode (♭VI, ♭VII, iv) or a third away (chromatic mediants)                 | harmony planner, pitch planner          | D11                                              | 8      |
| `modal-harmony`            | Non-functional harmony over a mode: vamps, one- or two-chord shuttles, no dominant pull                                                  | harmony planner                         | partly built (modal colour table, Static motion) | 9      |
| `harmonic-minor`           | Minor with a raised seventh degree, everywhere or only in the cadence approach                                                           | harmony planner, pitch planner          | D11                                              | 10     |
| `melodic-minor`            | Minor with raised sixth and seventh rising; listed by no entry                                                                           | pitch planner                           | D11                                              | 0      |
| `modulation`               | A change of key or tonal centre between phrases or sections                                                                              | form above the phrase, harmony planner  | none recorded                                    | 10     |
| `closed-endings`           | A phrase that ends on the home chord and note (a full cadence), per style or per phrase position                                         | harmony planner, pitch planner          | D28                                              | 16     |

**Pitch**

| Id                               | Plain definition                                                                                                 | Layer                              | Decisions and versions                     | Styles |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------ | ------ |
| `pentatonic-scales`              | Five-note collections (major and minor pentatonic) for the melody                                                | pitch planner, collections         | breadth review: five-note scales           | 11     |
| `blues-scale-blue-notes`         | The blues scale and held blue notes (♭3, ♭5, ♭7) over major-type chords                                          | pitch planner, validator           | embellishment #21                          | 6      |
| `split-melody-chord-collections` | The melody's note set chosen apart from the set the chords are built from                                        | harmony planner, pitch planner     | shared collection (harmony-planner policy) | 3      |
| `exotic-scales`                  | Other seven-note or symmetric collections (Phrygian dominant, double harmonic, Hirajoshi, whole-tone, octatonic) | pitch planner, collections         | none recorded                              | 10     |
| `microtonal-approximation`       | Notes between the twelve semitones, written or rounded with a label                                              | display, acknowledgement, playback | none recorded                              | 4      |
| `directional-scales`             | Different allowed notes rising and falling (raga, maqam)                                                         | pitch planner                      | none recorded                              | 2      |
| `pitch-path-plan`                | A planned order of emphasis: which notes the line dwells on, bar by bar or phrase by phrase                      | pitch planner, style layer         | none recorded                              | 2      |
| `wide-range`                     | A melodic window wider than one octave, with a planned climax note                                               | pitch planner, register windows    | register windows (instrument profiles)     | 2      |

**Embellishment**

| Id                      | Plain definition                                                                       | Layer                                   | Decisions and versions  | Styles |
| ----------------------- | -------------------------------------------------------------------------------------- | --------------------------------------- | ----------------------- | ------ |
| `symbol-ornaments`      | Trills, mordents, turns, grace notes, rolls and cuts written as symbols or small notes | embellishment, display, acknowledgement | D216                    | 13     |
| `slides-bends`          | Glissandos, bends, scoops and falls between pitches                                    | embellishment, display, acknowledgement | D216                    | 13     |
| `suspensions-ties`      | A prepared note tied over a strong beat, dissonant there, resolving down a step        | embellishment, rhythm planner           | D233 (figures #10, #11) | 4      |
| `articulation-dynamics` | Accents, staccato, legato and loudness marks, written and played                       | display, sound layer                    | none recorded           | 10     |

**Material and form**

| Id                             | Plain definition                                                                                                                                                                 | Layer                                           | Decisions and versions       | Styles |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------- | ------ |
| `motif-repetition-development` | Planned material reused on purpose: stored motifs, riffs, loops, stingers, and their gradual development across phrases                                                          | form above the phrase (phrase transformer seam) | D234, D232; v3.2 rhythm lock | 33     |
| `sequences`                    | A figure repeated at a higher or lower pitch step by step                                                                                                                        | pitch planner, form above the phrase            | D210                         | 4      |
| `call-and-response-form`       | A phrase answered by another (by the lead or by a system voice)                                                                                                                  | form above the phrase, arranger (v4)            | v4 respond role              | 11     |
| `multi-phrase-form`            | A plan above the phrase: 8-, 12-, 16- and 32-bar forms and labelled sections as chains of four-bar phrases, intensity arcs by layers, and the rare truly irregular phrase length | form above the phrase                           | D99 (four-phrase cycle)      | 28     |

**Accompaniment and sound**

| Id                         | Plain definition                                                                                            | Layer                              | Decisions and versions      | Styles |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------- | --------------------------- | ------ |
| `accompaniment-roles`      | System voices with jobs (bass patterns, comping, pads, riffs, stabs, stop-time, hocket, punctuation cycles) | arranger (v4)                      | v4 headline; D70            | 63     |
| `drums`                    | A percussion part with the style's groove                                                                   | arranger (v4), sound layer         | v4 sound library            | 37     |
| `drone-pedal`              | A held or repeated note under changing music, and long held lead notes over it                              | arranger (v4)                      | v4 role catalogue           | 15     |
| `parallel-harmony`         | Voices moving in parallel (planing, organum, power chords)                                                  | arranger (v4), voice-leading rules | voice-leading minimum rules | 11     |
| `counterpoint`             | Independent lines that move against the lead (imitation, canon)                                             | arranger (v4)                      | voice-leading minimum rules | 5      |
| `inversions-voice-leading` | Chords with the third or fifth in the bass and four-part voicing under voice-leading rules                  | arranger (v4), harmony planner     | voice-leading minimum rules | 4      |
| `timbre-presets`           | A synth sound per voice plus per-voice effects (reverb, delay, filter, distortion, bit reduction)           | sound layer                        | v4 sound library            | 43     |

## Style × capability matrix

One table per family: rows are capabilities the family uses, columns are its styles (numbered as
in the [index](#style-index)). **●** means the style lists the capability; **◆** means it is also
part of the style's **core**, the smallest set judged enough to lift that style one fidelity step
(to recognisable, or to convincing for the two styles already recognisable; inference, judged
entry by entry). Σ counts the family's styles that need the row.

### Western art music (AM)

Columns: 1 Gregorian chant; 2 Renaissance polyphony (Palestrina style); 3 Baroque; 4 Classical period; 5 Romantic; 6 Impressionism; 7 Epic film orchestral (late Romantic); 8 Minimalism; 9 Neoclassical and modernist (tonal side); 10 March and fanfare; 11 Waltz (and minuet); 12 Chorale and hymn.

| Capability                     |  1  |  2  |  3  |  4  |  5  |  6  |  7  |  8  |  9  | 10  | 11  | 12  |   Σ |
| ------------------------------ | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | --: |
| `triplets-tuplets`             |     |     |     |     |     |     |     |     |     |  ●  |     |     |   1 |
| `triple-meter`                 |     |     |  ●  |     |     |     |     |     |     |     |  ◆  |     |   2 |
| `compound-meter`               |     |     |  ●  |     |     |     |     |     |     |  ●  |     |     |   2 |
| `odd-meter`                    |     |     |     |     |     |     |     |     |  ◆  |     |     |     |   1 |
| `unmeasured-rhythm`            |  ◆  |     |     |     |     |     |     |     |     |     |     |     |   1 |
| `rhythm-cells-timelines`       |     |     |     |     |     |     |     |     |  ●  |  ●  |     |     |   2 |
| `tempo-range`                  |     |     |     |     |     |  ●  |     |     |     |     |     |     |   1 |
| `seventh-chords`               |     |     |     |  ●  |  ●  |     |     |     |     |     |  ●  |     |   3 |
| `extended-altered-chords`      |     |     |     |     |  ◆  |  ◆  |  ●  |     |  ◆  |     |     |     |   4 |
| `progression-templates`        |     |     |  ●  |  ●  |     |     |     |     |     |     |     |  ◆  |   3 |
| `modal-mixture`                |     |     |     |     |  ◆  |     |  ◆  |     |     |     |     |     |   2 |
| `modal-harmony`                |  ●  |     |     |     |     |  ●  |     |     |     |     |     |     |   2 |
| `harmonic-minor`               |     |  ●  |  ◆  |  ●  |     |     |     |     |     |     |     |  ●  |   4 |
| `modulation`                   |     |     |     |     |  ●  |     |  ●  |     |     |  ●  |     |     |   3 |
| `closed-endings`               |  ◆  |  ◆  |  ●  |  ◆  |  ●  |     |     |     |     |  ●  |  ●  |  ◆  |   8 |
| `pentatonic-scales`            |     |     |     |     |     |  ●  |     |     |     |     |     |     |   1 |
| `exotic-scales`                |     |     |     |     |     |  ◆  |     |     |  ◆  |     |     |     |   2 |
| `wide-range`                   |     |     |     |     |  ◆  |     |  ●  |     |     |     |     |     |   2 |
| `symbol-ornaments`             |     |     |  ◆  |     |  ●  |     |     |     |     |     |     |     |   2 |
| `suspensions-ties`             |     |  ◆  |  ●  |     |  ●  |     |     |     |     |     |     |  ●  |   4 |
| `articulation-dynamics`        |     |     |     |  ●  |  ●  |  ●  |  ●  |     |  ●  |     |     |  ●  |   6 |
| `motif-repetition-development` |     |  ●  |  ●  |  ●  |     |     |  ●  |  ◆  |     |     |     |     |   5 |
| `sequences`                    |     |     |  ◆  |     |     |     |     |     |     |     |     |     |   1 |
| `call-and-response-form`       |     |     |     |     |     |     |     |     |     |  ●  |     |     |   1 |
| `multi-phrase-form`            |     |     |     |  ◆  |     |     |     |  ●  |     |  ●  |  ●  |     |   4 |
| `accompaniment-roles`          |  ◆  |  ●  |  ◆  |  ◆  |  ◆  |  ●  |  ◆  |  ◆  |  ●  |  ◆  |  ◆  |  ●  |  12 |
| `drums`                        |     |     |     |     |     |     |  ●  |     |     |  ◆  |     |     |   2 |
| `drone-pedal`                  |  ●  |     |     |     |     |  ●  |     |  ●  |     |     |     |     |   3 |
| `parallel-harmony`             |  ●  |     |     |     |     |  ◆  |     |     |  ●  |     |     |     |   3 |
| `counterpoint`                 |     |  ◆  |  ●  |     |     |     |     |     |     |     |     |     |   2 |
| `inversions-voice-leading`     |     |     |  ●  |  ●  |  ●  |     |     |     |     |     |     |  ◆  |   4 |
| `timbre-presets`               |  ●  |  ●  |     |     |  ●  |  ●  |  ◆  |  ●  |     |  ●  |  ●  |  ●  |   9 |

### Jazz, blues and soul (JB)

Columns: 1 Delta blues; 2 Chicago (electric) blues; 3 Boogie-woogie; 4 Ragtime; 5 New Orleans jazz / Dixieland; 6 Swing / big band; 7 Bebop; 8 Cool and modal jazz; 9 Hard bop and soul jazz; 10 Jazz waltz; 11 Gospel; 12 Soul and Motown; 13 Funk; 14 Rhythm and blues and early rock and roll (overlap).

| Capability                       |  1  |  2  |  3  |  4  |  5  |  6  |  7  |  8  |  9  | 10  | 11  | 12  | 13  | 14  |   Σ |
| -------------------------------- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | --: |
| `swing-feel`                     |  ●  |  ◆  |  ●  |     |  ◆  |  ◆  |  ◆  |  ●  |  ◆  |  ◆  |  ●  |     |  ●  |  ◆  |  12 |
| `triple-meter`                   |     |     |     |     |     |     |     |     |     |  ◆  |     |     |     |     |   1 |
| `compound-meter`                 |  ●  |     |     |     |     |     |     |     |     |     |  ●  |     |     |     |   2 |
| `rhythm-cells-timelines`         |     |     |  ●  |  ◆  |     |     |     |     |     |     |     |     |  ◆  |     |   3 |
| `polyrhythm`                     |     |     |  ●  |     |     |     |     |     |     |  ●  |     |     |     |     |   2 |
| `tempo-range`                    |     |     |     |     |     |     |  ●  |     |     |     |     |     |     |     |   1 |
| `seventh-chords`                 |     |  ◆  |  ●  |  ●  |  ●  |  ◆  |  ◆  |  ◆  |  ◆  |  ●  |     |     |  ●  |  ●  |  11 |
| `extended-altered-chords`        |     |     |     |     |     |     |  ●  |  ◆  |     |     |     |     |  ●  |     |   3 |
| `progression-templates`          |     |  ◆  |  ◆  |  ●  |  ●  |  ●  |  ◆  |     |  ●  |  ●  |  ●  |  ●  |     |  ◆  |  11 |
| `chord-substitution-rules`       |     |     |     |     |     |     |  ●  |     |     |     |  ●  |     |     |     |   2 |
| `modal-harmony`                  |     |     |     |     |     |     |     |  ●  |     |     |     |     |  ●  |     |   2 |
| `modulation`                     |     |     |     |  ●  |     |     |  ●  |  ●  |     |     |  ●  |  ●  |     |     |   5 |
| `closed-endings`                 |     |     |     |  ●  |     |     |     |     |  ●  |     |  ◆  |  ●  |     |     |   4 |
| `pentatonic-scales`              |  ●  |     |     |     |     |     |     |  ●  |     |     |     |     |     |     |   2 |
| `blues-scale-blue-notes`         |  ◆  |  ●  |     |     |     |     |     |     |  ◆  |     |     |  ●  |     |  ●  |   5 |
| `split-melody-chord-collections` |  ◆  |  ●  |     |     |     |     |     |     |  ●  |     |     |     |     |     |   3 |
| `microtonal-approximation`       |  ●  |     |     |     |     |     |     |     |     |     |     |     |     |     |   1 |
| `symbol-ornaments`               |     |     |  ●  |     |     |     |     |     |     |     |  ●  |     |     |     |   2 |
| `slides-bends`                   |  ◆  |  ●  |     |     |  ●  |     |     |     |     |     |  ●  |     |     |     |   4 |
| `articulation-dynamics`          |     |     |     |     |     |  ●  |     |     |     |     |     |     |  ●  |     |   2 |
| `motif-repetition-development`   |     |  ●  |  ●  |  ●  |     |  ●  |  ●  |     |  ●  |     |     |  ●  |  ●  |     |   8 |
| `sequences`                      |     |     |     |     |     |     |  ●  |     |     |     |     |     |     |     |   1 |
| `call-and-response-form`         |  ●  |  ●  |     |     |     |  ●  |     |  ●  |  ●  |     |  ◆  |  ◆  |     |     |   7 |
| `multi-phrase-form`              |  ●  |  ◆  |  ◆  |  ●  |  ●  |  ●  |  ●  |  ●  |     |     |     |     |     |  ●  |   9 |
| `accompaniment-roles`            |  ●  |  ●  |  ◆  |  ◆  |  ◆  |  ◆  |  ●  |  ◆  |  ●  |  ◆  |  ◆  |  ◆  |  ◆  |  ●  |  14 |
| `drums`                          |     |  ●  |     |     |  ●  |  ●  |  ●  |     |  ●  |  ●  |  ●  |  ◆  |  ◆  |  ◆  |  10 |
| `parallel-harmony`               |     |     |     |     |     |  ●  |     |  ●  |     |     |  ●  |  ●  |     |     |   4 |
| `counterpoint`                   |     |     |     |     |  ◆  |     |     |  ●  |     |     |     |     |     |     |   2 |
| `timbre-presets`                 |  ●  |     |  ●  |     |  ●  |  ●  |     |     |  ●  |     |  ●  |  ●  |  ●  |     |   8 |

### Popular, electronic and game (PE)

Columns: 1 Pop; 2 Classic rock; 3 Punk; 4 Heavy metal; 5 Country; 6 Reggae; 7 Hip-hop (boom bap); 8 House and techno; 9 Synthwave; 10 Ambient and drone; 11 Lo-fi hip-hop; 12 Chiptune (8-bit); 13 JRPG town and village; 14 JRPG overworld and field; 15 JRPG dungeon; 16 JRPG battle; 17 JRPG boss and final battle; 18 JRPG victory fanfare; 19 Epic trailer and battle.

| Capability                     |  1  |  2  |  3  |  4  |  5  |  6  |  7  |  8  |  9  | 10  | 11  | 12  | 13  | 14  | 15  | 16  | 17  | 18  | 19  |   Σ |
| ------------------------------ | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | --: |
| `swing-feel`                   |     |     |     |     |  ●  |     |  ●  |     |     |     |  ◆  |     |     |     |     |     |     |     |     |   3 |
| `triplets-tuplets`             |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |  ●  |     |   1 |
| `triple-meter`                 |     |     |     |     |  ●  |     |     |     |     |     |     |     |  ◆  |     |     |     |     |     |     |   2 |
| `compound-meter`               |     |     |     |     |     |     |     |     |     |     |     |     |  ●  |     |     |     |     |     |     |   1 |
| `odd-meter`                    |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |  ●  |  ●  |     |     |   2 |
| `rhythm-cells-timelines`       |  ●  |     |     |  ◆  |     |  ◆  |     |     |     |     |     |     |     |     |     |  ◆  |     |     |     |   4 |
| `tempo-range`                  |     |     |     |  ●  |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |   1 |
| `seventh-chords`               |     |     |     |     |     |     |  ●  |  ●  |     |     |  ◆  |     |     |     |     |     |     |     |     |   3 |
| `extended-altered-chords`      |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |  ◆  |     |     |   1 |
| `progression-templates`        |  ◆  |  ●  |  ●  |  ●  |  ●  |     |     |     |  ●  |     |  ●  |     |     |     |     |  ●  |     |     |  ●  |   9 |
| `modal-mixture`                |     |  ●  |     |     |     |     |     |     |  ●  |     |     |     |     |  ●  |     |  ●  |     |  ◆  |  ●  |   6 |
| `modal-harmony`                |     |     |     |     |     |  ●  |     |  ●  |     |  ●  |     |     |     |     |     |     |  ●  |     |     |   4 |
| `harmonic-minor`               |     |     |     |  ●  |     |     |     |     |     |     |     |     |     |     |     |     |  ◆  |     |     |   2 |
| `closed-endings`               |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |  ◆  |     |   1 |
| `pentatonic-scales`            |     |  ◆  |     |     |  ●  |     |     |     |     |     |     |     |     |     |     |     |     |     |     |   2 |
| `blues-scale-blue-notes`       |     |  ●  |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |   1 |
| `exotic-scales`                |     |     |     |  ●  |     |     |     |     |     |     |     |     |     |     |  ●  |     |  ●  |     |     |   3 |
| `symbol-ornaments`             |     |     |     |     |     |     |     |     |     |     |     |     |  ●  |     |     |     |     |     |     |   1 |
| `slides-bends`                 |     |  ●  |     |     |  ●  |     |     |     |     |     |     |     |     |     |     |     |     |     |     |   2 |
| `articulation-dynamics`        |     |     |     |  ●  |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |   1 |
| `motif-repetition-development` |  ◆  |  ●  |     |     |     |  ●  |  ◆  |  ◆  |     |  ●  |  ●  |  ●  |     |  ●  |  ●  |     |  ●  |  ◆  |     |  12 |
| `sequences`                    |     |     |     |  ●  |     |     |     |     |     |     |     |     |     |  ●  |     |     |     |     |     |   2 |
| `multi-phrase-form`            |  ●  |     |     |     |     |     |     |  ●  |     |     |     |  ●  |  ●  |  ●  |     |  ●  |     |  ●  |  ●  |   8 |
| `accompaniment-roles`          |  ●  |  ◆  |  ●  |  ●  |  ◆  |  ◆  |  ●  |  ◆  |  ◆  |  ◆  |  ●  |  ◆  |  ◆  |  ◆  |  ◆  |  ◆  |  ◆  |  ●  |  ◆  |  19 |
| `drums`                        |  ◆  |  ◆  |  ◆  |  ●  |  ◆  |  ◆  |  ◆  |  ◆  |  ◆  |     |  ◆  |  ●  |     |  ◆  |     |  ◆  |  ●  |     |  ◆  |  15 |
| `drone-pedal`                  |     |     |     |  ●  |     |     |     |     |     |  ◆  |     |     |  ●  |     |  ◆  |     |  ●  |     |     |   5 |
| `parallel-harmony`             |     |  ●  |  ◆  |  ◆  |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |   3 |
| `timbre-presets`               |  ●  |  ◆  |  ◆  |  ◆  |  ◆  |  ●  |  ●  |  ●  |  ◆  |  ◆  |  ●  |  ◆  |  ◆  |  ◆  |  ◆  |  ●  |  ◆  |  ●  |  ◆  |  19 |

### Folk and world (FW)

Columns: 1 Irish and Scottish reel; 2 Irish and Scottish jig (and slip jig); 3 Appalachian old-time and bluegrass; 4 Scandinavian polska; 5 Klezmer; 6 Balkan aksak dances (7/8, 9/8, 11/8); 7 Flamenco; 8 Tango; 9 Son cubano and salsa; 10 Samba and bossa nova; 11 Andean huayno; 12 West African timeline music and highlife; 13 Arabic maqam (Hijaz, Rast, Bayati); 14 Hindustani and Carnatic raga; 15 Japanese min'yō and koto scales; 16 Chinese pentatonic and silk-and-bamboo; 17 Javanese and Balinese gamelan; 18 French bal-musette (optional extra).

| Capability                     |  1  |  2  |  3  |  4  |  5  |  6  |  7  |  8  |  9  | 10  | 11  | 12  | 13  | 14  | 15  | 16  | 17  | 18  |   Σ |
| ------------------------------ | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | --: |
| `swing-feel`                   |     |     |     |  ◆  |     |     |     |     |     |  ●  |     |     |     |     |     |     |     |     |   2 |
| `triplets-tuplets`             |  ◆  |     |     |     |     |     |  ●  |     |     |     |     |     |     |     |     |     |     |     |   2 |
| `triple-meter`                 |     |     |     |  ◆  |  ●  |     |     |     |     |     |     |     |     |     |     |     |     |  ◆  |   3 |
| `compound-meter`               |     |  ◆  |     |     |     |     |  ●  |     |     |     |     |  ●  |     |     |     |     |     |     |   3 |
| `odd-meter`                    |     |     |     |     |     |  ◆  |     |     |     |     |     |     |     |  ●  |     |     |     |     |   2 |
| `rhythm-cells-timelines`       |     |     |     |     |  ●  |  ◆  |  ●  |  ◆  |  ◆  |  ◆  |  ◆  |  ◆  |     |     |     |     |     |     |   8 |
| `polyrhythm`                   |     |     |     |     |     |     |     |     |     |     |     |  ●  |     |     |     |     |     |     |   1 |
| `tempo-range`                  |     |     |     |     |     |  ●  |     |     |     |     |     |     |     |     |     |     |     |     |   1 |
| `seventh-chords`               |     |     |     |     |     |     |     |  ●  |  ●  |  ◆  |     |     |     |     |     |     |     |  ●  |   4 |
| `extended-altered-chords`      |     |     |     |     |     |     |     |     |     |  ●  |     |     |     |     |     |     |     |     |   1 |
| `progression-templates`        |     |     |  ●  |     |     |     |  ◆  |     |  ●  |  ●  |     |     |     |     |     |     |     |  ●  |   5 |
| `modal-harmony`                |     |     |     |     |     |     |     |     |     |     |     |     |  ●  |     |     |     |     |     |   1 |
| `harmonic-minor`               |     |     |     |     |  ●  |  ●  |     |  ◆  |     |     |     |     |     |     |     |     |     |  ●  |   4 |
| `modulation`                   |     |     |     |     |  ●  |     |     |     |     |     |     |     |  ●  |     |     |     |     |     |   2 |
| `closed-endings`               |     |     |     |     |     |     |  ◆  |  ●  |     |     |     |     |     |  ●  |     |     |     |     |   3 |
| `pentatonic-scales`            |     |     |  ◆  |     |     |     |     |     |     |     |  ◆  |  ●  |     |     |  ◆  |  ◆  |  ◆  |     |   6 |
| `exotic-scales`                |     |     |     |     |  ◆  |     |  ◆  |     |     |     |     |     |  ◆  |  ●  |  ◆  |     |     |     |   5 |
| `microtonal-approximation`     |     |     |     |     |     |     |     |     |     |     |     |     |  ●  |  ●  |     |     |  ●  |     |   3 |
| `directional-scales`           |     |     |     |     |     |     |     |     |     |     |     |     |  ●  |  ●  |     |     |     |     |   2 |
| `pitch-path-plan`              |     |     |     |     |     |     |     |     |     |     |     |     |  ◆  |  ◆  |     |     |     |     |   2 |
| `symbol-ornaments`             |  ◆  |  ●  |     |  ●  |  ◆  |  ●  |     |     |     |     |     |     |  ●  |  ●  |     |  ●  |     |     |   8 |
| `slides-bends`                 |     |     |  ●  |     |  ◆  |     |  ●  |  ●  |     |     |     |     |     |  ●  |  ●  |  ●  |     |     |   7 |
| `articulation-dynamics`        |     |     |     |     |     |     |     |  ●  |     |     |     |     |     |     |     |     |     |     |   1 |
| `motif-repetition-development` |  ●  |  ●  |     |     |     |     |     |     |  ●  |     |  ●  |  ●  |     |  ●  |     |  ●  |  ●  |     |   8 |
| `call-and-response-form`       |     |     |     |     |     |     |     |     |  ◆  |  ●  |     |  ●  |     |     |     |     |     |     |   3 |
| `multi-phrase-form`            |  ◆  |  ●  |  ●  |  ●  |     |     |  ●  |     |     |     |  ●  |     |     |     |     |     |     |  ●  |   7 |
| `accompaniment-roles`          |  ●  |  ●  |  ◆  |  ●  |  ●  |  ●  |  ●  |  ◆  |  ◆  |  ◆  |  ◆  |  ◆  |  ◆  |  ◆  |  ◆  |  ◆  |  ◆  |  ◆  |  18 |
| `drums`                        |     |     |     |     |     |  ●  |  ●  |     |  ●  |  ●  |  ●  |  ◆  |  ●  |  ●  |  ●  |     |  ●  |     |  10 |
| `drone-pedal`                  |  ●  |     |  ●  |  ●  |     |  ●  |     |     |     |     |     |     |  ●  |  ◆  |  ●  |     |     |     |   7 |
| `parallel-harmony`             |     |     |     |     |     |     |     |     |     |     |  ●  |     |     |     |     |     |     |     |   1 |
| `counterpoint`                 |     |     |     |     |     |     |     |  ●  |     |     |     |     |     |     |     |     |     |     |   1 |
| `timbre-presets`               |  ●  |     |  ◆  |  ●  |     |     |     |     |     |     |     |     |     |     |  ●  |  ●  |  ◆  |  ◆  |   7 |

## Capability ranking: the roadmap hint

All of this section is **inference**. The four measures:

- **(a) Styles needing it**: how many of the 63 entries list it.
- **(b) Core for**: in how many styles it belongs to the core set above, a stand-in for "how many
  styles it helps move up a fidelity step". **Gate for**: in how many styles it is the single
  biggest blocker.
- **(c) Cost**: S (local change in one planner, default-off), M (one planner plus notation,
  acknowledgement, playback or export), L (a new structure: a new planner, a new grid or a new
  voice system). Judged from the [breadth review's style seam](../generation-breadth-review.md#todays-style-seam)
  and its note that swing, sevenths and metres "each touch rhythm, notation, acknowledgement and
  export".
- **(d) Depends on**: what must exist first.

| Rank | Capability                       | (a) Styles needing it | (b) Core for | Gate for | (c) Cost | (d) Depends on                                     |
| ---: | -------------------------------- | --------------------: | -----------: | -------: | :------: | -------------------------------------------------- |
|    1 | `accompaniment-roles`            |                    63 |           42 |       12 |    L     | —                                                  |
|    2 | `timbre-presets`                 |                    43 |           16 |        6 |    M     | —                                                  |
|    3 | `drums`                          |                    37 |           17 |        8 |    M     | `accompaniment-roles`, `timbre-presets`            |
|    4 | `motif-repetition-development`   |                    33 |            5 |        1 |    L     | —                                                  |
|    5 | `progression-templates`          |                    28 |            7 |        2 |    S     | —                                                  |
|    6 | `multi-phrase-form`              |                    28 |            4 |        0 |    L     | —                                                  |
|    7 | `seventh-chords`                 |                    21 |            7 |        1 |    M     | —                                                  |
|    8 | `rhythm-cells-timelines`         |                    17 |           11 |        5 |    M     | —                                                  |
|    9 | `swing-feel`                     |                    17 |            9 |        3 |    M     | —                                                  |
|   10 | `closed-endings`                 |                    16 |            7 |        1 |    S     | —                                                  |
|   11 | `drone-pedal`                    |                    15 |            3 |        2 |    S     | `accompaniment-roles`                              |
|   12 | `symbol-ornaments`               |                    13 |            3 |        1 |    M     | —                                                  |
|   13 | `slides-bends`                   |                    13 |            2 |        0 |    M     | —                                                  |
|   14 | `pentatonic-scales`              |                    11 |            6 |        1 |    S     | —                                                  |
|   15 | `call-and-response-form`         |                    11 |            3 |        1 |    M     | —                                                  |
|   16 | `parallel-harmony`               |                    11 |            3 |        0 |    S     | `accompaniment-roles`                              |
|   17 | `exotic-scales`                  |                    10 |            6 |        4 |    M     | —                                                  |
|   18 | `harmonic-minor`                 |                    10 |            3 |        1 |    M     | —                                                  |
|   19 | `articulation-dynamics`          |                    10 |            0 |        0 |    S     | —                                                  |
|   20 | `modulation`                     |                    10 |            0 |        0 |    L     | `multi-phrase-form`                                |
|   21 | `extended-altered-chords`        |                     9 |            5 |        2 |    M     | `seventh-chords`                                   |
|   22 | `modal-harmony`                  |                     9 |            0 |        0 |    S     | —                                                  |
|   23 | `triple-meter`                   |                     8 |            5 |        4 |    L     | —                                                  |
|   24 | `modal-mixture`                  |                     8 |            3 |        1 |    M     | `split-melody-chord-collections`                   |
|   25 | `compound-meter`                 |                     8 |            1 |        1 |    M     | `triple-meter`, `triplets-tuplets`                 |
|   26 | `blues-scale-blue-notes`         |                     6 |            2 |        1 |    M     | `split-melody-chord-collections`, `seventh-chords` |
|   27 | `counterpoint`                   |                     5 |            2 |        2 |    L     | `accompaniment-roles`                              |
|   28 | `odd-meter`                      |                     5 |            2 |        1 |    M     | `triple-meter`                                     |
|   29 | `inversions-voice-leading`       |                     4 |            1 |        1 |    M     | `accompaniment-roles`                              |
|   30 | `sequences`                      |                     4 |            1 |        1 |    M     | `motif-repetition-development`                     |
|   31 | `suspensions-ties`               |                     4 |            1 |        0 |    M     | —                                                  |
|   32 | `triplets-tuplets`               |                     4 |            1 |        0 |    L     | —                                                  |
|   33 | `microtonal-approximation`       |                     4 |            0 |        0 |    L     | `exotic-scales`                                    |
|   34 | `tempo-range`                    |                     4 |            0 |        0 |    S     | —                                                  |
|   35 | `split-melody-chord-collections` |                     3 |            1 |        0 |    M     | —                                                  |
|   36 | `polyrhythm`                     |                     3 |            0 |        0 |    M     | `accompaniment-roles`, `triplets-tuplets`          |
|   37 | `pitch-path-plan`                |                     2 |            2 |        0 |    M     | —                                                  |
|   38 | `wide-range`                     |                     2 |            1 |        0 |    S     | —                                                  |
|   39 | `chord-substitution-rules`       |                     2 |            0 |        0 |    M     | `progression-templates`, `seventh-chords`          |
|   40 | `directional-scales`             |                     2 |            0 |        0 |    M     | —                                                  |
|   41 | `unmeasured-rhythm`              |                     1 |            1 |        0 |    L     | —                                                  |

**Dependencies in one picture.** `drums` ← `accompaniment-roles` + `timbre-presets` (the v4 sound
library); `drone-pedal`, `parallel-harmony`, `counterpoint`, `inversions-voice-leading` and
`polyrhythm` ← `accompaniment-roles`; `compound-meter` ← `triple-meter` (bars other than four
beats) + `triplets-tuplets` (a ternary grid); `odd-meter` ← `triple-meter`; `blues-scale-blue-notes`
← `split-melody-chord-collections` + `seventh-chords`; `modal-mixture` ←
`split-melody-chord-collections`; `chord-substitution-rules` ← `progression-templates` +
`seventh-chords`; `extended-altered-chords` ← `seventh-chords`; `sequences` ←
`motif-repetition-development`; `modulation` ← `multi-phrase-form`. `swing-feel` does **not** need
`triplets-tuplets`: swing is written as plain eighths and only played uneven, and the
[acknowledgement window already tolerates a swung eighth](../preset-catalogue.md#what-no-setting-can-express-today).
`progression-templates` work with triads alone; most templates sound right only with sevenths.

### Greedy unlock order

Starting from today, each step adds the capability (with its prerequisites) that brings the most
styles to **recognisable**; ties go to the one that completes most of the remaining cores, then to
the cheaper. 60 styles can reach recognisable or better with their listed capabilities.

| Step | Add (with prerequisites)                                                | Cost  | Styles that reach recognisable at this step | Cumulative |
| ---: | ----------------------------------------------------------------------- | :---: | ------------------------------------------- | ---------: |
|    1 | `drums` + `accompaniment-roles` + `timbre-presets`                      | M+L+M | AM10, PE5, PE9, PE12, PE14, PE19            |          8 |
|    2 | `rhythm-cells-timelines`                                                |   M   | JB4, JB13, PE6, PE16, FW12                  |         13 |
|    3 | `pentatonic-scales`                                                     |   S   | PE2, FW3, FW11, FW16, FW17                  |         18 |
|    4 | `compound-meter` + `triple-meter` + `triplets-tuplets`                  | M+L+L | AM11, PE13, FW2, FW18                       |         22 |
|    5 | `swing-feel`                                                            |   M   | JB10, FW4                                   |         24 |
|    6 | `chord-substitution-rules` + `progression-templates` + `seventh-chords` | M+S+M | JB6, JB7, JB14, PE11, FW10                  |         29 |
|    7 | `sequences` + `motif-repetition-development`                            |  M+L  | AM8, PE1, PE8                               |         32 |
|    8 | `drone-pedal`                                                           |   S   | PE10, PE15                                  |         34 |
|    9 | `parallel-harmony`                                                      |   S   | PE3, PE4                                    |         36 |
|   10 | `call-and-response-form`                                                |   M   | JB12, FW9                                   |         38 |
|   11 | `multi-phrase-form`                                                     |   L   | JB2, JB3                                    |         40 |
|   12 | `closed-endings`                                                        |   S   | AM4, JB11                                   |         42 |
|   13 | `exotic-scales`                                                         |   M   | FW7, FW15                                   |         44 |
|   14 | `modal-mixture` + `split-melody-chord-collections`                      |  M+M  | AM7, PE18                                   |         46 |
|   15 | `pitch-path-plan`                                                       |   M   | FW13, FW14                                  |         48 |
|   16 | `extended-altered-chords`                                               |   M   | AM6                                         |         49 |
|   17 | `odd-meter`                                                             |   M   | AM9, FW6                                    |         51 |
|   18 | `harmonic-minor`                                                        |   M   | PE17, FW8                                   |         53 |
|   19 | `blues-scale-blue-notes`                                                |   M   | JB9                                         |         54 |
|   20 | `slides-bends`                                                          |   M   | JB1                                         |         55 |
|   21 | `symbol-ornaments`                                                      |   M   | AM3, FW5                                    |         57 |
|   22 | `counterpoint`                                                          |   L   | JB5                                         |         58 |
|   23 | `suspensions-ties`                                                      |   M   | AM2                                         |         59 |
|   24 | `inversions-voice-leading`                                              |   M   | AM12                                        |         60 |
|   25 | `unmeasured-rhythm`                                                     |   L   | AM1                                         |         61 |
|   26 | `wide-range`                                                            |   S   | AM5                                         |         62 |

Reading the table (inference):

- **The first five steps** (v4's voices and sound library, rhythm cells, five-note scales, 3/4
  and 6/8, swing) take the count from 2 to 24 styles; **twelve steps** reach 42 of the 60 styles
  that can get there. The long tail after step 15 unlocks one or two styles per capability.
- **The lead line alone rarely makes a style recognisable.** `accompaniment-roles` is in the core
  of 42 of the 63 styles. Run without any v4 voice, the same greedy method unlocks at most **one**
  style per capability (jig with 6/8, polska with 3/4 and swing, bebop with sevenths and
  templates, hard bop with blue notes, and so on): the style lives in the backing, the groove and
  the sound at least as much as in the melody.
- The core sets are a judgement per entry, and a different reading of one entry moves a style by a
  step or two in this order, not out of it. The order also ignores cost; the tiers below weigh it.

### Proposed tiers

Inference, no decisions. "Placed" means the version plan already holds it; "new" means nothing
schedules it today.

| Tier                         | Capabilities                                                                                                                                                                                                                                                                | Why this tier                                                                                                                                       | Where it could fit                                                                                                                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Voices and sound          | `accompaniment-roles`, `timbre-presets`, `drums`, then the cheap role add-ons `drone-pedal` and `parallel-harmony`                                                                                                                                                          | The biggest unlock of all (in 42 cores, gate for 26 styles with drums and timbres); without it lead-only capabilities move one style each           | **Placed:** v4 (roles, the sound library spike). New: drums as a named v4 item; `parallel-harmony` needs the voice-leading rules to be switchable per pack                                                        |
| 2. Cheap vocabulary          | `pentatonic-scales`, `progression-templates`, `closed-endings`, `seventh-chords`, `swing-feel`, `rhythm-cells-timelines`                                                                                                                                                    | S or M each, used by 11–28 styles, mostly lead-side; the breadth review's own investment order (swing, sevenths, closed cadences, five-note scales) | **New** (silently lost v1 exclusions D11–D13, D20, D28). Could precede v4 as a v3.x step, ride with v4, or open a **v4.x style-packs** step; rhythm cells share storage with v4's rhythm editor (placed) and D217 |
| 3. Metre and form            | `triple-meter`, `compound-meter`, `triplets-tuplets`, `odd-meter`, `multi-phrase-form`, `motif-repetition-development`, `sequences`, `call-and-response-form`                                                                                                               | Large (new grid, new planner above the phrase) but they are the only way to reach dance and folk styles and longer forms                            | **New** for metres and forms (D15; D99's cycle is a seed). Motif work is partly placed: v3.2 rhythm lock, v4 wider mutations (D232), sequences v4–v6 (D210). Fits v4.x style packs or v5+                         |
| 4. Colour                    | `harmonic-minor`, `exotic-scales`, `modal-mixture` with `split-melody-chord-collections`, `blues-scale-blue-notes`, `extended-altered-chords`, `chord-substitution-rules`, `symbol-ornaments`, `slides-bends`, `suspensions-ties`, `articulation-dynamics`, `modal-harmony` | Each lifts a family (minor-key classics, flamenco and klezmer, blues, jazz harmony, ornamented folk); moderate cost, few styles each                | **Placed:** ornaments and slides (D216, their own release after v3.2); suspensions (deferred by D233). The rest **new**: v4.x style packs, one family at a time                                                   |
| 5. Approximations and polish | `pitch-path-plan`, `directional-scales`, `microtonal-approximation`, `counterpoint`, `inversions-voice-leading`, `modulation`, `polyrhythm`, `wide-range`, `tempo-range`, `unmeasured-rhythm`                                                                               | One to five styles each, several touch acknowledgement or notation deeply; counterpoint and four-part voicing build on the v4 arranger              | **New:** v5+ or the endgame; `unmeasured-rhythm` may stay a stated loss                                                                                                                                           |

**Greedy order in one line:** v4 voices with drums and timbres → `rhythm-cells-timelines` →
`pentatonic-scales` → 3/4 and 6/8 (with triplets) → `swing-feel` → `seventh-chords` with
`progression-templates` (and substitutions) → motif repetition and `sequences` → `drone-pedal` →
`parallel-harmony` → `call-and-response-form` → `multi-phrase-form` → `closed-endings`. Weighted
by cost, `pentatonic-scales`, `progression-templates`, `closed-endings` and `drone-pedal` (all S)
are the cheapest steps per style gained.

## The style layer around the generator

A sketch, consistent with the breadth review's
[option B](../generation-breadth-review.md#recommendation-inference) and the
[draft identity schema](../identity-modelling.md#draft-identity-schema-inference); **inference**
throughout.

**A style pack is data.** It has an id and a version, and it holds:

- **capabilities switched on**: the normalised ids above; each capability is built once in the
  engine, default-off, with its own invariant and cost check;
- **restriction** (hard): collections, metre, chord vocabulary, range, banned notes, ending policy;
- **tuning** (soft): note-value points (the v4 rhythm ratios), interval, degree and chord points,
  syncopation and ornament rates, tempo range;
- **planned material**: progression templates, rhythm cells and timelines, riffs and motifs, a
  form plan, a stinger;
- **defaults for today's controls** (a v3.1 preset), and **accompaniment defaults**: roles,
  patterns, drums and timbres for the v4 arranger and sound layer.

**Layering.** style pack → preset → identity (character) → situation (location, event, status).
The pack decides **which vocabulary exists**; the preset chooses values inside it; an identity and
a situation restrict and weight, through the identity schema's four slots (filter, rank level,
weighted order, planned material). Restrictions intersect, so a stack can become unplayable; the
identity research's [feasibility rules](../identity-modelling.md#keeping-a-restrictive-identity-feasible-inference)
apply to packs too.

**What the generators receive.** Today a phrase is generated from a request (seed, the fourteen
controls, the profile, the custom flag, the phrase number and the carry-in), and the `ifk1` replay
key is that fixed 7-tuple. With packs, the layers above are resolved **before** generation into one
flat policy: capability flags, plan tables, weights and material. The planners read flags and
tables, never style names (as they read `allowsChromaticApproach` today). The replay key gains the
pack id and pack version (and later the identity ids and versions), which needs a new key version
(`ifk3.` or later); an old key replays byte for byte only if a pack's version is frozen once
published.

**Where each layer plugs in, and what is data versus new code.**

| Layer                 | What a pack sets (data, once the capability exists)                   | What needs new planner code first                                                                        |
| --------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Harmony planner       | Progression templates, chord points, collections, ending per position | Sevenths and beyond, closed endings, harmonic minor, chords outside the collection, substitution rules   |
| Rhythm planner        | Note-value points, rhythm cells, syncopation level, swing ratio       | Swing timing, other metres and the ternary grid, stored cells inside the grammar, unmeasured rhythm      |
| Pitch planner         | Interval and degree points, banned notes, register window             | Split melody and chord collections, held blue notes, five-note and other collections, directional scales |
| Embellishment         | Figure levels (v3.1), ornament points                                 | Suspensions, symbol ornaments and slides (D216), each with notation and acknowledgement                  |
| Form above the phrase | Form plan (AAB, AABA, 12-bar), repetition and sequence choices        | A form planner and the phrase transformer seam (the breadth review's option C for structural devices)    |
| Arranger (v4)         | Default roles, patterns, drum groove, voice count                     | The role system itself, then drums, drones, parallel and four-part voicing, counterpoint                 |
| Sound layer           | Timbre per voice, effects                                             | The v4 sound library and its effects                                                                     |
| Display               | Nothing new per pack                                                  | Metres, tuplets, ornaments, articulation, microtone marks                                                |

The pattern is the breadth review's: the capabilities are the cost; a pack is cheap once its
capabilities exist. New candidates must stay off for every existing preset, or the replay corpus
and goldens change; latency must be measured per pack, as v3.1's cost guard does for presets.

**The two open contradictions** recorded in the [music README](../README.md#endgame-research-musical-identity-2026-10-11),
and what the atlas adds (not decided here):

1. **Layer order** (location and event above or below the character). The atlas shows that a
   style decides the **vocabulary** (scale, chords, metre, groove), while JRPG contexts (town,
   dungeon, battle, boss) mostly change **texture, tempo, register and arrangement** over a
   style (the [popular file's first question](popular-electronic-game.md#open-questions)). That
   supports a division of labour by family and scope (style: vocabulary; character: the lead
   line; location and event: arrangement and weights; status: modifiers) more than a single
   ranking.
2. **Whether a character may add vocabulary.** The devices the identity examples need (trills,
   a signature progression, register spikes) appear in the atlas as style-level capabilities.
   That separates two questions: unlocking engine code a pack lacks (which the atlas gives no
   reason for), and switching on a capability that already exists but that the character's pack
   leaves off (a trill-loving character in a pack without ornaments). The second is the real
   choice.

## Conflicts with current decisions

Each row is a place where a style needs something a current decision rules out. Counts come from
the per-style judgement behind the matrix (inference). Every conflict could be scoped **per style
pack**: the decision stays the default for every existing preset and practice mode, and a
versioned pack may lift it, as the breadth review recommends for each missing device.

| Rule                                                        | What it rules out today                                                                        | Styles affected (codes)                                                                                | Capability that lifts it                                        |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| D13, no chosen progressions                                 | Only fixed tonal templates per motion level                                                    | 29: AM3, AM4, AM12, JB2–JB7, JB9–JB12, JB14, PE1–PE6, PE9, PE11, PE16, PE18, PE19, FW3, FW7, FW9, FW10 | `progression-templates`                                         |
| D12, triads only, no altered harmony                        | Sevenths, ninths, altered and quartal chords                                                   | 26: AM4–AM6, AM9, AM11, JB2–JB14, PE7–PE9, PE11, FW8–FW10, FW18                                        | `seventh-chords`, `extended-altered-chords`                     |
| D11, diatonic only, never a raised leading tone             | Harmonic minor, borrowed chords, Phrygian dominant and other out-of-collection notes           | 25: AM2–AM7, AM9, AM12, JB9, JB11, JB12, PE2, PE4, PE14, PE15, PE17–PE19, FW5–FW8, FW13, FW14, FW18    | `harmonic-minor`, `modal-mixture`, `exotic-scales`              |
| D15, 4/4 only, no tuplets                                   | 3/4, 6/8, aksak, triplets, unmeasured time                                                     | 22: AM1, AM3, AM9–AM11, JB10, JB11, PE4, PE5, PE13, PE16–PE18, FW1, FW2, FW4–FW7, FW12, FW14, FW18     | the metre ids, `triplets-tuplets`, `unmeasured-rhythm`          |
| D28, open endings only                                      | Ending on the home chord                                                                       | 19: AM1–AM5, AM10–AM12, JB4, JB9, JB11, JB12, PE14, PE18, FW7, FW8, FW11, FW14, FW16                   | `closed-endings`                                                |
| D20, stable pulse, no swing                                 | Swing, shuffle, uneven beats                                                                   | 17: JB1–JB3, JB5–JB11, JB13, JB14, PE5, PE7, PE11, FW4, FW10                                           | `swing-feel`                                                    |
| Voice-leading minimum rules (no parallel fifths or octaves) | Organum, planing, power chords, parallel voicings                                              | 10: AM1, AM6, AM9, JB6, JB8, JB11, PE2–PE4, FW11                                                       | `parallel-harmony`                                              |
| One collection feeds melody and chords                      | Blue notes against major chords, melodies over borrowed chords                                 | 8: JB1–JB3, JB9, JB12, JB14, PE2, FW7                                                                  | `split-melody-chord-collections`                                |
| Twelve semitones, sixteenth grid, acknowledgement           | Microtones, bends as pitch, free rhythm, funk's swung sixteenths                               | 7: AM1, JB1, JB13, PE12, FW13, FW14, FW17                                                              | `microtonal-approximation`, `slides-bends`, `unmeasured-rhythm` |
| 60–240 BPM                                                  | Very slow or very fast tempos                                                                  | 4: AM6, JB7, PE4, FW6                                                                                  | `tempo-range`                                                   |
| The fixed four-bar phrase                                   | A phrase of another length (Delta blues' stretched lines, a fanfare, flamenco's 12-beat cycle) | 3: JB1, PE18, FW7                                                                                      | `multi-phrase-form` (its rare irregular case)                   |

Two notes. **Forms longer than four bars** (28 styles need `multi-phrase-form`) do not break the
four-bar unit if they are built as chains of four-bar phrases, as the jazz file argues; only the
three styles above need a truly different phrase length. **Per-pack scoping** fits every row: the
decision keeps governing the practice presets, and a versioned pack lifts it with a default-off
capability, so existing replay keys and goldens stay unchanged.

## Cross-file inconsistencies

**Fixed in place** (plain slips, minimal edits):

- [Jazz, blues and soul](jazz-blues-soul.md): the styles table named entry 14 "Rhythm and blues,
  early rock and roll (overlap)"; it now matches its heading, "Rhythm and blues and early rock and
  roll (overlap)".
- [Western art music](art-music.md), Capability notes: `NEW:chromatic-mediants` listed
  Impressionism among its styles, but the Impressionism entry does not list the id; it now reads
  "Romantic, film (Impressionism could reuse it)".

**Reported, for a later pass or the spec session** (judgement calls, left as written):

1. **"Fair" maps two ways.** The [preset catalogue](../preset-catalogue.md#summary-table) rates
   Folk reel, Pop song and Modal "fair". The folk and jazz files read "fair" as **recognisable**
   (reel, modal jazz); the popular file reads it as **hint** (pop). Pop is probably the stricter,
   more honest reading; the two scales need one mapping.
2. **The fidelity scale is defined in three slightly different words** (art, jazz, folk) and not
   at all in the popular file; ratings are bold in art and folk, italic in jazz and plain in
   popular, and the popular file's headings carry no numbers. Cosmetic.
3. **`phrase-length` has two meanings**: mostly "a form longer than four bars, made of four-bar
   phrases" (= `NEW:multi-phrase-form`), but in Delta blues and the victory fanfare a phrase of
   another length. Normalisation above merges them and keeps the second case as a residual.
4. **Borrowed chords** are tagged `extended-altered-chords` in the art file (Romantic, film) and
   `NEW:modal-mixture` in the popular file; synthwave and JRPG battle tag diatonic Aeolian
   progressions (i–♭VI–♭VII, available today) as mixture. The normalised `modal-mixture` covers
   chords from outside the collection only.
5. **Implied needs with no id**: odd bars in heavy metal (no `odd-meter`); closed endings in
   huayno, Chinese pentatonic and JRPG overworld; triplets in Chicago blues, rhythm and blues and
   polska. Delta blues lists `compound-meter` with no basis in its entry. The matrix shows the
   lists as written.
6. **Parallel motion**: only the art file names the clash with the
   [voice-leading minimum rules](../arranging-and-roles.md#voice-leading-minimum-rules); power
   chords (rock, punk, metal), huayno's parallel fourths and fifths, cool jazz and gospel voicings
   hit it too ([conflicts](#conflicts-with-current-decisions)).
7. **Two small wording differences**: ragtime's strain form is AABBCCDD in the entry's traits
   and AABBACCDD in its manipulation line (both are real variants); chiptune's pulse wave is "25
   and 50 % duty cycle" in the entry but "12.5 to 75 %" in its lexicon candidate.
8. **Baroque tempo**: the art entry suggests 60–90 BPM while saying it builds on
   [candidate 9](../preset-catalogue.md#9-baroque), which suggests 60–70 BPM. Wider, not
   contradictory; left as written.
9. **Lexicon candidates overlapped across files** (ostinato, modal mixture with two different
   definitions, hemiola, oom-pah, strain); the integration merged them into one lexicon entry
   each.
10. **Count**: the atlas has 63 styles (12 + 14 + 19 + 18), one fewer than the 13 art-music styles
    first planned; the art file's own Purpose says twelve.

## Open questions for the owner

Merged from the four family files and this synthesis; most decision-relevant first.

1. **Style packs and when.** Is a style pack that adds vocabulary (option B) the right layer, and
   do its first capabilities come before v4, inside v4, or in a "v4.x style packs" step after it?
   Drum-led styles (reggae, house, hip-hop) are not worth a preset before v4's drums.
2. **Closed endings.** May a pack end phrases on the home chord, per style or per phrase position
   (a period's second phrase, a strain's last phrase, a victory fanfare), against D28's
   open-ending default?
3. **Leaving four bars of 4/4.** Is 3/4 the first other metre (waltz, minuet, jazz waltz, polska),
   then 6/8 (jig)? And do longer forms (12-bar blues, AABA, 8-bar periods) stay chains of four-bar
   phrases, perhaps through the opt-in four-phrase cycle (D99)?
4. **The raised leading tone.** A cadence-only raised seventh per pack, or wait for full harmonic
   minor (D11)?
5. **Deliberate clashes.** May the melody's note set differ from the chords' (a held ♭3 over a
   major-third chord in the blues), and how is a blue note written: as a plain ♭3, or with a bend
   symbol the acknowledgement accepts?
6. **Swing.** Written as straight eighths and played swung? Should the backing swing too, and do
   swung sixteenths (funk) still land inside the acknowledgement window?
7. **Repetition versus reading.** Loops, riffs, montuno refrains, minimalist cells and leitmotifs
   repeat material on purpose. Is that acceptable for P2's unmemorisable reading (D59), or only
   for P1 and P3 packs?
8. **Authored material.** Does a near-fixed stinger or refrain break "everything is generated", or
   is a template with seeded variation enough?
9. **Several lines.** Is a second independent melody (imitation, counterpoint, heterophony)
   readable for P1 at speed? Does the player ever play it, and which part is the player's in
   gamelan or West African drumming?
10. **Microtones.** Write half-flats (Rast, Bayati) and let the player supply the pitch, or round
    to twelve notes and label the result? Acknowledgement works in semitones today.
11. **Stated losses.** Confirm that unmetered music (chant, alap, taqsim, doina), rubato and rap
    stay out of scope as named losses.
12. **Cultural framing.** Should packs drawn from living traditions say "inspired by" with a line
    on what is missing, and are sacred styles (gospel, chant, chorale) acceptable as game
    identities?
13. **JRPG contexts.** Are town, dungeon and battle style packs of their own, or location and
    event identities over a pack such as "orchestral" or "chiptune"?
14. **Fast styles.** Allow tempos above 240 BPM (bebop), or keep the player's tempo theirs and
    give fast styles a half-time lead?
15. **Splitting the Jazz grammar.** Should chromatic approach, enclosure and blue note become
    separate capabilities, so that Blues and Bebop stop sharing one switch?
