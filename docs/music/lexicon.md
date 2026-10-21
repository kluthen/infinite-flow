# Music Lexicon

Status: v1.7 (v3 research terms merged; preset catalogue terms merged 2026-10-07; v3.1 and v3.2 spec terms merged 2026-10-08; v4 accompaniment research terms merged 2026-10-11; endgame musical-identity research terms merged 2026-10-11; style atlas research terms merged 2026-10-11; v3.3 chord research terms added 2026-10-12; bass clef and octave sign added, clef entries revised for my instrument's clef, 2026-10-12; starting note and count-in say an out-of-date phrase asks first, 2026-10-13; the v4, musical-identity and style atlas terms merged from branch `v4-accompaniment-research` 2026-10-19; v3.1's figure, preset and Embellishments entries describe the built app, musical profile and grammar entries marked as replaced, 2026-10-21; Held doodle renamed Kept doodle for v3.2's re-scope (spec D413), 2026-10-21)

Date: 2026-10-21

## How to use

- **Humans:** each entry gives a one-line popup and a short plain definition, both written for a reader with no music theory. Where the app gives the word a narrower or special meaning, `in_infinite_flow` says so.
- **Coding agents:** this is the project's single music-theory lexicon. Use its terms and definitions when writing docs, code comments and user-facing explanations. When an entry's app meaning disagrees with the code, the code wins; fix the entry.
- **The app (v2 plan):** entries are meant to be parsed. The `popup` field is the hover/click text; `definition` and `in_infinite_flow` are shown on demand. Entries under "Internal (no popup)" are never shown in the UI.

## Licence and provenance

Every definition in this file is original, written for Infinite Flow in the project's own words. No text is copied or closely paraphrased from any source. The `sources` listed with each entry are the references used to check the facts; they are cited for verification only. Source IDs (S1, S14, ...) are described in [Music Research Sources](research-sources.md). App-specific meanings cite the repository document or code that defines them.

## Entry template

Each entry is a `###` heading followed by exactly these fields, in this order:

```markdown
### <Term as shown to the reader>

- **id:** `kebab-case-id`
- **aliases:** comma-separated other names or spellings (or `none`)
- **popup:** one or two plain sentences, at most 200 characters, no theory knowledge needed
- **definition:** a short plain paragraph, roughly 40-120 words; may include one tiny example
- **in_infinite_flow:** what it means or does in this app (left out only when the standard meaning has nothing to add)
- **related:** comma-separated ids of other entries
- **sources:** comma-separated source IDs or repository paths
```

Ids are unique across the whole file, and every `related` id is an entry in this file. Entries are alphabetical within each category.

## Category index

1. [Basics](#basics): cue, half step, interval, note, octave, phrase, pitch, rest, tie, whole step.
2. [Pitch and notation](#pitch-and-notation): the staff, clefs, note names and the signs written on the staff, including ornaments, articulation, dynamics and jazz articulations.
3. [Rhythm and meter](#rhythm-and-meter): beats, note values, meter, syncopation, tempo, rhythmic changes such as anticipation, augmentation and metric displacement, and the rhythms that mark a style, such as the shuffle, the clave and aksak meters.
4. [Melody](#melody): melodic motion, shape, decorating notes (embellishments), motifs, themes and the ways musicians develop them.
5. [Harmony](#harmony): chords, their roles, cadences, tension and resolution, common chord patterns such as the twelve-bar blues, the vamp and the two-five-one, the richer chords (seventh, sixth, suspended and extended chords), and how parts move between chords (voicing, voice leading).
6. [Scales and modes](#scales-and-modes): scales, keys, the seven modes, how a key is found from a melody, and melodic systems beyond major and minor keys, such as maqam and raga.
7. [Styles](#styles): styles of music the presets and the style atlas refer to, such as the reel, bossa nova, the waltz and gamelan.
8. [Style and identity](#style-and-identity): how music becomes recognisable as a style, a person's voice (idiolect), a place or an event: musical topics and fanfares.
9. [Texture and arranging](#texture-and-arranging): how several parts fit together, the jobs accompanying parts do (pad, comping, fill, counter-melody and others), and how game music adds and removes layers.
10. [Instruments and transposition](#instruments-and-transposition): concert and written pitch, B-flat and E-flat instruments, range, and the sound of an instrument (timbre) with the audio effects that change it.
11. [App controls](#app-controls): one entry per control label, with every option explained; the kinds of preset and the Custom state; and the session words the player meets, such as Jam, doodle and starting note.
12. [Internal (no popup)](#internal-no-popup): project terms used in docs and code, never shown in the UI.

## Basics

### Cue

- **id:** `cue`
- **aliases:** musical cue, cue notes
- **popup:** A signal telling a musician when to come in or what happens next: a gesture, a written hint or a sound.
- **definition:** A cue is a signal that helps musicians stay together. It can be a gesture (a nod, a raised hand), a written hint in a part (small "cue notes" showing what another instrument plays just before an entrance after a long rest), or something played, such as a drum pattern announcing a break. Cues matter most after long silences and at changes in the music.
- **in_infinite_flow:** The app uses the word for its session cue row, where the app speaks to the player: the starting-note line, the count-in and notices. A pattern the player plays to steer the app is called a played signal instead (spec decision D214), so the two directions stay apart.
- **related:** `played-signal`, `call-and-response`, `rest`
- **sources:** S82, S84, S86, src/components/workspace/SessionCueRow.vue, specs/decisions.md

### Half step

- **id:** `half-step`
- **aliases:** semitone, half tone, minor second
- **popup:** The smallest distance between two notes in Western music: from one piano key to the very next key, black or white.
- **definition:** A half step is the smallest pitch distance used in most Western music. On a keyboard it is the move from any key to the key right beside it, black or white: E to F, or F to F-sharp. As an interval it is usually spelled as a minor second (E to F); F to F-sharp is also a half step, but with one letter name it is called an augmented unison. Twelve half steps make an octave, and two half steps make a whole step. Musicians use the half step as the basic ruler for measuring every other interval.
- **in_infinite_flow:** The app measures melodic distance in half steps (it often says semitones). Leapiness limits, register windows and the Jazz chromatic figures are all defined as counts of half steps.
- **related:** `whole-step`, `interval`, `octave`, `chromatic`, `control-leapiness`
- **sources:** S14

### Interval

- **id:** `interval`
- **aliases:** none
- **popup:** The distance in pitch between two notes, whether they are played one after the other or at the same time.
- **definition:** An interval is the distance between two pitches. Musicians name it by counting letter names, both ends included: C up to E covers C, D and E, so it is a third. A quality word (major, minor, perfect and so on) then fixes its exact size: C to E is a major third, four half steps. A melodic interval is between notes played one after another; a harmonic interval, between notes sounding together.
- **in_infinite_flow:** For melody rules the app counts intervals in half steps, not letter names, and sorts them into its own classes: 1-2 a step, 3-4 a skip, 5-6 a leap, 7-12 a large leap. The Leapiness control limits them.
- **related:** `half-step`, `whole-step`, `step`, `skip`, `leap`, `octave`
- **sources:** S14, S15, S7

### Note

- **id:** `note`
- **aliases:** tone
- **popup:** A single musical sound with a definite pitch and length, or the written symbol that tells you to play it.
- **definition:** A note is one musical sound, with a pitch (how high or low) and a duration (how long). The word also means the symbol written on the staff: the height of its head shows the pitch, and its shape (filled or hollow, with or without stem and flags) shows the length. For example, a filled head with a stem on the second line of the treble staff is a G lasting one beat in 4/4.
- **in_infinite_flow:** Each phrase is a series of notes and rests filling four measures. One sounding note may be written as two or more tied note symbols when it crosses a beat or a bar line.
- **related:** `pitch`, `rest`, `tie`, `quarter-note`, `staff`
- **sources:** S14, S8a

### Octave

- **id:** `octave`
- **aliases:** 8ve
- **popup:** The distance from a note to the next note up or down with the same name, such as C to the next C. The two sound like one note, higher or lower.
- **definition:** An octave is the interval from a note to the next note with the same letter name, for example from one C to the C above. It spans twelve half steps. The upper note vibrates exactly twice as fast as the lower one, and the two blend so well that the ear hears them as the same note at different heights. Octave numbers, as in C4 and C5, say which copy is meant.
- **in_infinite_flow:** Each Register window spans exactly one octave (12 half steps, so 13 possible pitches). The largest melodic jump the app ever allows, under Angular leapiness, is one octave.
- **related:** `interval`, `half-step`, `octave-number`, `register`, `register-window`
- **sources:** S14, S15

### Phrase

- **id:** `phrase`
- **aliases:** musical phrase
- **popup:** A short musical thought, like a sentence: a group of notes that belong together and head toward a stopping point.
- **definition:** A phrase is a short stretch of music that makes sense as one idea and moves toward an ending, much like a sentence in speech. In a lot of Western music a phrase lasts about four measures and ends with a cadence, a moment that sounds either finished or like a pause asking for more. Listeners feel phrases without knowing any theory, because the music seems to breathe at their ends.
- **in_infinite_flow:** The app's unit is a four-measure phrase in 4/4. Outside a session it shows one phrase at a time; in a session it keeps generating and playing one phrase after another. Measures 1-2 form an opening gesture and measures 3-4 answer it. The phrase always ends open, never on the home note, so that it invites another phrase.
- **related:** `cadence`, `measure`, `gesture-and-answer`, `open-ending`
- **sources:** S1, S14, S15, specs/versions/v2/master-spec.md

### Pitch

- **id:** `pitch`
- **aliases:** none
- **popup:** How high or low a sound is. A bird's chirp has a high pitch; a tuba has a low pitch.
- **definition:** Pitch is how high or low a sound seems. It follows how fast the sound vibrates: faster is higher. Musicians name pitches with the letters A to G, add a sharp or flat for the in-between keys, and add an octave number when they need one exact pitch, as in C4 (middle C). Two notes with the same letter name in different octaves share a name but are different pitches.
- **in_infinite_flow:** Internally the app stores every pitch as a MIDI note number in concert pitch (60 is middle C, C4). It converts pitches to the instrument's written pitch only to draw the score.
- **related:** `note`, `note-name`, `octave-number`, `concert-pitch`, `midi-note-number`
- **sources:** S14, S15, S13

### Rest

- **id:** `rest`
- **aliases:** silence
- **popup:** A written sign that means "stay silent" for a set length of time. Rests belong to the rhythm, just like notes.
- **definition:** A rest is a measured silence. Every note length has a matching rest symbol (quarter rest, eighth rest and so on) that lasts exactly as long as that note would. Rests are not empty gaps: they let a melody breathe, give a wind player time to take air, and make the notes around them stand out. Counting through rests matters as much as playing notes on time.
- **in_infinite_flow:** The Silence density control sets how many rests a phrase has. In every setting no measure is completely silent and no single rest is longer than half a measure. A phrase may end with a rest.
- **related:** `note`, `rhythm`, `control-silence-density`, `whole-note`
- **sources:** S14, S8a

### Tie

- **id:** `tie`
- **aliases:** tied note
- **popup:** A curved line joining two notes of the same pitch. Play the first one and keep holding it through the second, without playing again.
- **definition:** A tie is a curved line connecting two written notes of the same pitch. You play only the first and hold the sound for the total length of both. Ties are needed when a sound continues across a bar line, or when its length can't be shown with one symbol in that spot. A slur looks similar but joins different pitches, and means something else.
- **in_infinite_flow:** The app uses ties to write notes that cross a beat or a bar line. Holding a note across a beat is one of its two syncopation tools. A tied continuation still counts as a note sounding on that beat.
- **related:** `note`, `syncopation`, `measure`, `bar-line`, `metrical-anchor`
- **sources:** S8a, S14

### Whole step

- **id:** `whole-step`
- **aliases:** whole tone, major second
- **popup:** A distance of two half steps, like C to D on a piano, which skips the black key between them.
- **definition:** A whole step equals two half steps; as an interval it is usually spelled as a major second. On a keyboard it skips exactly one key: C to D skips the black key C-sharp, and E to F-sharp skips F. Major and minor scales are built mostly from whole steps, with two half steps placed in particular spots. The order of those whole and half steps is what gives each scale or mode its own sound.
- **related:** `half-step`, `interval`, `scale`, `step`
- **sources:** S14

## Pitch and notation

### Accidental

- **id:** `accidental`
- **aliases:** none
- **popup:** A sharp, flat or natural sign written just before a note to raise it, lower it, or cancel an earlier change.
- **definition:** An accidental is a sign placed right before a note to change its pitch: a sharp raises it a half step, a flat lowers it a half step, and a natural cancels an earlier sharp or flat. Rarer double sharps and double flats move a note by two half steps. An accidental lasts to the end of its measure for notes on that same line or space. Accidentals are written only when the key signature doesn't already give the right note.
- **in_infinite_flow:** The score shows an accidental only when the key signature and earlier signs in the measure don't already give the right pitch. With both chromatic figures (the chromatic approach and the chromatic enclosure) Off, as in Neutral, phrases use only notes of the chosen collection, which the key signature covers, so they normally show none. A chromatic figure adds outside notes, which do need accidentals. Jazz, Speed drill and Bebop turn the chromatic figures on, and a player can turn them on from any preset (spec decision D233), so any preset may bring accidentals.
- **related:** `sharp`, `flat`, `natural`, `double-sharp-and-double-flat`, `key-signature`
- **sources:** S14

### Articulation

- **id:** `articulation`
- **aliases:** staccato, legato, accent
- **popup:** How a note starts and ends: short and detached, stressed, or smoothly joined to the next note.
- **definition:** Articulation is the way each note is attacked and released. Staccato notes are short and detached, marked with a dot; an accent (>) makes a note stand out by stressing its start; legato notes are joined smoothly, often shown by a curved line called a slur. The same pitches and rhythm sound quite different played all staccato or all legato, so articulation carries much of a line's character.
- **in_infinite_flow:** Not written today: the generated phrase carries no articulation marks. The endgame research lists articulation as a possible part of a character's musical identity, for example short, accented high notes (docs/music/musical-identity.md); endgame groundwork, not built.
- **related:** `jazz-articulation`, `ornament`, `dynamics`, `note`, `musical-identity`
- **sources:** S225, S156, docs/music/musical-identity.md

### Bar line

- **id:** `bar-line`
- **aliases:** barline
- **popup:** A vertical line across the staff that marks where one measure ends and the next one begins.
- **definition:** A bar line is a thin vertical line drawn across the staff to divide the music into measures. It is not a pause: the music carries straight on through it. A double bar line, two lines with the second often thicker, marks the end of a piece or a section. Bar lines help the eye find beat 1 of each measure quickly.
- **related:** `measure`, `staff`, `time-signature`
- **sources:** S14, S15

### Bass clef

- **id:** `bass-clef`
- **aliases:** F clef
- **popup:** The clef used for low instruments. Its two dots sit on either side of the line where the F below middle C sits.
- **definition:** The bass clef, or F clef, starts on the fourth line from the bottom of the staff and marks it as F3, the F just below middle C; its two dots sit on either side of that line. From there the lines read G, B, D, F, A from bottom to top, and the spaces A, C, E, G. Middle C sits on one ledger line above the bass staff. Bass guitar, double bass, cello, bassoon, trombone, tuba and the left hand of piano music are usually written in bass clef.
- **in_infinite_flow:** My instrument can be written in bass clef instead of treble clef (spec decision D293); the built-in instruments always use treble clef. The clef changes only where notes are drawn: the written notes, the transposition and the phrases generated stay the same, and an exported MusicXML file names the bass clef.
- **related:** `clef`, `treble-clef`, `staff`, `ledger-line`, `middle-c`
- **sources:** S14, S15, specs/decisions.md

### Clef

- **id:** `clef`
- **aliases:** none
- **popup:** The symbol at the start of the staff that tells you which note each line and space stands for.
- **definition:** A clef is the large symbol at the left end of every staff. Without it, the five lines are just lines; the clef ties one of them to a named pitch, and all the other lines and spaces follow in order. The treble (G) clef suits high instruments, the bass (F) clef low ones, and C clefs some middle-range instruments. The same written spot means a different note under a different clef.
- **in_infinite_flow:** The three built-in instruments are written in treble clef. My instrument can be written in treble clef or bass clef, as the player chooses (spec decision D293). The clef changes only where the notes are drawn, never which notes they are.
- **related:** `treble-clef`, `bass-clef`, `staff`, `ledger-line`, `octave-sign`
- **sources:** S14

### Doit

- **id:** `doit`
- **aliases:** none
- **popup:** A jazz effect: the pitch flicks upward at the end of a note, to no particular note.
- **definition:** A doit (said "doyt") is a jazz articulation where the player bends the pitch upward as the note ends, trailing off without landing on a definite note. It is written as a short curved or straight line rising from the note head. It is common in big-band brass and saxophone parts.
- **in_infinite_flow:** Not used. If adopted, the proposed rule is that only the note itself is expected; the doit is the player's choice to add.
- **related:** `fall`, `scoop`, `jazz-articulation`, `ornament`
- **sources:** S31, S33

### Double sharp and double flat

- **id:** `double-sharp-and-double-flat`
- **aliases:** double sharp, double flat
- **popup:** Rare signs that raise (double sharp) or lower (double flat) a note by two half steps.
- **definition:** A double sharp, drawn like a small x, raises a note by two half steps; a double flat, drawn as two flat signs, lowers it by two. The sound is always a note that also has a simpler name: F double-sharp sounds the same as G. These signs exist so that a scale or chord in a crowded key keeps each letter name once and reads logically.
- **in_infinite_flow:** The score can show them when the written key and a note call for it, but they are rare because the app spells each key with the fewest sharps or flats.
- **related:** `accidental`, `sharp`, `flat`, `enharmonic`
- **sources:** S14

### Dynamics

- **id:** `dynamics`
- **aliases:** loudness, dynamic marks
- **popup:** How loud or soft the music is, and how that changes, written with signs such as p (soft) and f (loud).
- **definition:** Dynamics are the loudness levels of music and the changes between them. Musicians write them with Italian abbreviations under the staff: p (piano, soft), mf (mezzo forte, moderately loud), f (forte, loud), and wedge-shaped "hairpins" for growing louder (crescendo) or softer (diminuendo). Dynamics shape a phrase: a line that swells toward its high point and fades at its end sounds more alive than one played at a single level.
- **in_infinite_flow:** Not written today: the phrase carries no dynamic marks and the backing plays at one level. The endgame research names dynamics as part of a system voice's "performer" layer, which adds life more than recognition (docs/music/musical-identity.md); endgame groundwork, not built.
- **related:** `articulation`, `phrase`, `accompaniment`
- **sources:** S226, S202, S203, docs/music/musical-identity.md

### Enharmonic

- **id:** `enharmonic`
- **aliases:** enharmonic equivalent, enharmonic spelling
- **popup:** Two names for the same sound. On a piano, F-sharp and G-flat are the same black key: they are enharmonic.
- **definition:** Two notes are enharmonic when they sound the same but are written with different names, such as C-sharp and D-flat, or E and F-flat. On a keyboard they are the same key. Which name to write depends on the key and scale: D major uses F-sharp, not G-flat, so that each letter appears once. Choosing among such names is called spelling.
- **in_infinite_flow:** Black-key options on the Written key control show both names, for example "C-sharp/D-flat". The score then uses the spelling of that key that needs fewer sharps or flats, and sharps when both need the same number (F-sharp Ionian and G-flat Ionian both need six, so F-sharp is used).
- **related:** `sharp`, `flat`, `note-name`, `key-signature`, `control-written-key`
- **sources:** S14

### Fall

- **id:** `fall`
- **aliases:** falloff, fall-off
- **popup:** A jazz effect: the pitch drops away at the end of a note, to no particular note.
- **definition:** A fall is a jazz articulation where the pitch slides downward as the note ends, without landing on a definite note. It is written as a line curving down from the note head; longer lines mean longer falls. It often ends a phrase in big-band and soul horn parts.
- **in_infinite_flow:** Not used. If adopted, the proposed rule is that only the note itself is expected; a MIDI keyboard player can simply ignore the fall.
- **related:** `doit`, `scoop`, `jazz-articulation`, `ornament`
- **sources:** S31, S33

### Fermata

- **id:** `fermata`
- **aliases:** hold, pause
- **popup:** A sign over a note or rest meaning: hold it longer than written, until the player or conductor moves on.
- **definition:** A fermata is a curved sign with a dot placed over a note or a rest. It tells the performer to hold it longer than its written value; how much longer is left to the player or the conductor. In chorales and hymns a fermata often marks the end of each line of text, where the singers breathe, rather than a long dramatic hold.
- **in_infinite_flow:** Not built; style atlas research: the app keeps strict time on a fixed grid, so a held line end is one of the chorale's stated losses (docs/music/styles/art-music.md).
- **related:** `chorale`, `rest`, `tempo`, `cadence`
- **sources:** S304, docs/music/styles/art-music.md

### Flat

- **id:** `flat`
- **aliases:** ♭
- **popup:** The sign ♭. It lowers a note by one half step: B-flat is the key just below B.
- **definition:** A flat lowers a note by one half step, so B-flat is the key just below B on a keyboard. In a key signature, a flat applies to that letter in every octave for the whole piece. Written as an accidental in front of one note, it lasts to the end of the measure. It also appears in instrument names such as "B-flat tenor saxophone": the instrument's written C sounds as a B-flat.
- **related:** `sharp`, `natural`, `accidental`, `key-signature`, `b-flat-instrument`
- **sources:** S14

### Gamaka

- **id:** `gamaka`
- **aliases:** gamakam
- **popup:** An Indian ornament: a shake, slide or swing on or between notes that is part of what makes a raga recognisable.
- **definition:** In Indian classical music a gamaka is an ornament: an oscillation around a note, a slide from one note to another, or a quick touch of a neighbouring note. In Carnatic (South Indian) music gamakas are so central that how a note is ornamented helps tell one raga from another. They move through the space between fixed pitches, so staff notation can show them only roughly.
- **in_infinite_flow:** Not built; style atlas research: the app writes fixed pitches only, so slides and oscillations are a stated loss of a raga sketch (docs/music/styles/folk-and-world.md).
- **related:** `raga`, `ornament`, `glissando`, `slide`
- **sources:** S403, S401, docs/music/styles/folk-and-world.md

### Glissando

- **id:** `glissando`
- **aliases:** gliss., glide
- **popup:** A glide from one note to another, sweeping through the pitches in between.
- **definition:** A glissando connects two written notes by sliding through everything between them. On a keyboard it sounds as a rapid sweep of separate keys; on a voice, trombone or saxophone it can be a smooth slide. It is written as a straight or wavy line between the two notes, often labelled "gliss."
- **in_infinite_flow:** Not used. If adopted, the proposed rule is that both end notes are expected as usual and the notes between are ignored.
- **related:** `slide`, `scoop`, `jazz-articulation`, `ornament`
- **sources:** S38

### Grace note

- **id:** `grace-note`
- **aliases:** acciaccatura, crushed note
- **popup:** A tiny extra note written small, played very quickly just before the main note.
- **definition:** A grace note is printed smaller than the other notes to show that it only decorates the note after it. The common quick kind, the acciaccatura, has a slash through its stem and is squeezed in just before the main note, taking almost no time. Over a C chord, a tiny D-sharp right before E is a grace note. It does not count in the bar's rhythm.
- **in_infinite_flow:** Not used. It is planned as the first ornament, in a release of its own after v3.2 (spec decision D233); only the main note would be expected, and playing the grace note is optional.
- **related:** `ornament`, `appoggiatura`, `note`, `half-step`
- **sources:** S30, S37

### Grand staff

- **id:** `grand-staff`
- **aliases:** great staff, piano staff
- **popup:** Two staves, treble on top and bass below, joined by a brace: the usual way piano music is written.
- **definition:** A grand staff joins a treble-clef staff and a bass-clef staff with a curly brace at the left, so that one player can read a high part and a low part together. Piano, organ and harp music use it, the right hand usually reading the top staff and the left hand the bottom one. Middle C sits on a short ledger line between the two.
- **in_infinite_flow:** The app shows a single treble-clef staff, even for the keyboard profile. Whether system voices ever get a second staff is an open question for v4.
- **related:** `staff`, `treble-clef`, `clef`, `middle-c`, `ledger-line`
- **sources:** S14, docs/music/accompaniment-systems.md

### Jazz articulation

- **id:** `jazz-articulation`
- **aliases:** brass articulation, jazz ornament
- **popup:** Small jazz signs that bend a note's pitch at its start or end: scoops, plops, falls and doits.
- **definition:** Jazz articulations are signs that tell the player to bend into or out of a note rather than play it plainly. Scoops and plops slide into the note from below or above; falls and doits slide away from it, down or up, at its end. Unlike staccato or accents, they change pitch, not length or attack, so notation programs often treat them as ornaments.
- **in_infinite_flow:** Not used. The embellishment research proposes them as ornaments written as signs, with only the main note expected. Ornaments are not part of v3.1's figure levels: they get a release of their own after v3.2 (spec decision D233).
- **related:** `fall`, `doit`, `scoop`, `plop`, `glissando`, `ornament`
- **sources:** S31, S33, docs/music/embellishment-catalogue.md

### Key signature

- **id:** `key-signature`
- **aliases:** none
- **popup:** The group of sharps or flats at the start of each line of music. They apply to those notes throughout, so they need not be written each time.
- **definition:** A key signature is the set of sharps or flats written just after the clef on every line of music. Each one applies to every note with that letter name, in every octave, unless an accidental says otherwise. It saves writing the same signs again and again, and it hints at which scale the music uses. No sharps or flats at all, as in C major or A minor, is also a key signature.
- **in_infinite_flow:** The key signature follows the Written key and Collection: the app shows the standard signature of the major (Ionian) key that shares the collection's notes. C Aeolian therefore shows three flats, like E-flat major, and D Dorian shows none. It is in your instrument's written pitch, so C Ionian on tenor saxophone shows an empty signature.
- **related:** `accidental`, `key`, `written-pitch`, `control-written-key`, `control-collection`
- **sources:** S14, ui_ux/screens/phrase-workspace/handoff.md

### Lead sheet

- **id:** `lead-sheet`
- **aliases:** none
- **popup:** A page with just the melody and chord symbols above it; the band makes up the accompaniment from the chords.
- **definition:** A lead sheet writes down only the essentials of a song: the melody on one staff, with chord symbols above it and sometimes the lyrics. The accompanying players read the chord symbols and improvise their parts, so the same lead sheet can be played in many styles. Jazz and pop musicians use lead sheets all the time; books of them are called fake books.
- **in_infinite_flow:** The app's staff is close to a lead sheet: the phrase's melody with a chord symbol at each chord change.
- **related:** `chord-symbol`, `staff`, `melody`, `accompaniment`, `head`
- **sources:** S191

### Ledger line

- **id:** `ledger-line`
- **aliases:** leger line
- **popup:** A short extra line drawn above or below the staff for a note too high or too low to fit on the five lines.
- **definition:** Ledger lines are short line segments added above or below the staff, just wide enough for one note, to extend it for higher or lower notes. Read them as if the staff's lines kept going: line, space, line. Middle C, for example, sits on one ledger line below the treble staff. Many ledger lines are hard to read, which is one reason different clefs exist.
- **in_infinite_flow:** Low keyboard notes can need up to four ledger lines below the treble staff, because the keyboard range starts at C3 and the built-in instruments are written in treble clef. Saxophone parts, written from C4 to C6, need at most two. A low my instrument can be written in bass clef instead, where its low notes need far fewer ledger lines. The more ledger lines a range needs, the taller the staff area becomes for every instrument.
- **related:** `staff`, `clef`, `treble-clef`, `bass-clef`, `middle-c`, `octave-sign`
- **sources:** S14

### Measure

- **id:** `measure`
- **aliases:** bar
- **popup:** A short, equal-sized block of time in written music, marked off by vertical lines. In 4/4 each measure holds four beats.
- **definition:** A measure, also called a bar, is the stretch of music between two bar lines. The time signature says how many beats each measure holds, and every measure in the same meter adds up to the same length of notes and rests. Measures act as a map ("start at measure 3" means the same spot for everyone), and beat 1 of each measure is usually the strongest pulse.
- **in_infinite_flow:** Every phrase is exactly four measures of 4/4. Internally each measure is divided into 16 equal sixteenth-note slots called ticks.
- **related:** `bar-line`, `beat`, `time-signature`, `phrase`, `tick`
- **sources:** S14, S15

### Middle C

- **id:** `middle-c`
- **aliases:** C4
- **popup:** The C near the middle of a piano keyboard, a handy landmark. In treble clef it sits on one short line just below the staff.
- **definition:** Middle C is the C nearest the center of a standard piano. In the most common octave-numbering system it is C4, and in MIDI it is note 60. It sits between the two staves of piano music: on one ledger line below the treble staff, or one above the bass staff. Counting up or down from middle C is a quick way to find other notes.
- **in_infinite_flow:** The app numbers pitches with 60 as middle C (C4). Both saxophone profiles have written ranges starting at C4.
- **related:** `octave-number`, `ledger-line`, `midi-note-number`, `pitch`
- **sources:** S14, S13

### Mordent

- **id:** `mordent`
- **aliases:** upper mordent, lower mordent, pralltriller, inverted mordent
- **popup:** A quick flick from the main note to its neighbor and back, written as a small zigzag sign above the note.
- **definition:** A mordent is a fast three-note ornament: the main note, the scale note above or below it, and the main note again. The upper kind goes up (E, F, E); the lower kind goes down (E, D, E) and is usually marked with a short vertical line through the sign. The names are confusing: different periods and programs call opposite forms "inverted".
- **in_infinite_flow:** Not used. If adopted, the app would label them only "upper" and "lower", and only the main note would be expected.
- **related:** `ornament`, `trill`, `turn`, `neighbor-tone`
- **sources:** S29, S34

### Natural

- **id:** `natural`
- **aliases:** ♮
- **popup:** The sign ♮. It cancels a sharp or flat and brings the note back to its plain letter name.
- **definition:** A natural sign cancels a sharp or flat that would otherwise apply, whether it comes from the key signature or from an earlier accidental in the same measure. For example, in a key with F-sharp in its signature, a natural before an F means plain F. Like other accidentals, it lasts until the end of the measure.
- **related:** `sharp`, `flat`, `accidental`, `key-signature`
- **sources:** S14

### Note name

- **id:** `note-name`
- **aliases:** letter name
- **popup:** The letter used for a note: A, B, C, D, E, F or G, sometimes with a sharp or flat. After G the letters start again at A.
- **definition:** Western music names notes with the seven letters A to G, then repeats them in the next octave. The in-between keys on a keyboard take a letter plus a sharp or flat, such as F-sharp or B-flat. A name without an octave number, like "C", stands for every C at once; theorists call that group a pitch class. Adding an octave number, as in C4, picks one exact pitch.
- **in_infinite_flow:** The Written key control offers all twelve pitch classes, showing both names for the black-key ones.
- **related:** `pitch`, `pitch-class`, `octave-number`, `sharp`, `flat`, `enharmonic`
- **sources:** S14

### Octave number

- **id:** `octave-number`
- **aliases:** scientific pitch notation
- **popup:** A number after a note name, like C4, saying which octave the note is in. Middle C is C4; the next C up is C5.
- **definition:** An octave number turns a note name into one exact pitch. In the most common system the number goes up by one at each C, so the notes above middle C are C4, D4 and so on up to B4, then C5. The lowest A on a piano is A0. Some software numbers octaves one lower and calls middle C "C3", which is why MIDI note numbers are sometimes used instead.
- **in_infinite_flow:** The app uses middle C = C4 = MIDI 60. Ranges read C3-C5 for the keyboard (concert) and C4-C6 written for both saxophones.
- **related:** `middle-c`, `octave`, `midi-note-number`, `note-name`
- **sources:** S14, S13

### Octave sign

- **id:** `octave-sign`
- **aliases:** ottava, 8va, 8vb, 15ma
- **popup:** A dashed line marked 8va or 8vb over or under some notes: play them an octave higher or lower than written.
- **definition:** An octave sign saves ledger lines. Notes under a dashed line marked 8va (from the Italian ottava) are played one octave higher than written; marked 8vb, one octave lower; marked 15ma, two octaves higher. Where the line ends, normal reading resumes. A related sign is the octave clef: a clef with a small 8 above or below it, which moves the whole staff by an octave, as in tenor voice parts written in treble clef with an 8 below.
- **in_infinite_flow:** Not used: the app writes every note at its own written pitch. Octave signs and octave clefs may come in a later version, if a player's range needs them (spec question O180).
- **related:** `octave`, `octave-number`, `ledger-line`, `clef`, `bass-clef`
- **sources:** S14, S15, specs/open-questions.md

### Ornament

- **id:** `ornament`
- **aliases:** ornamentation, grace
- **popup:** A decoration written as a small sign or small notes, which the player turns into a few quick extra notes.
- **definition:** An ornament is a decoration that the score shows in shorthand, as a sign above a note or as small notes, rather than writing every note out. Trills, mordents, turns and grace notes are the classic ornaments; jazz adds bends such as scoops and falls. How exactly to play one depends on the style and period.
- **in_infinite_flow:** None are written today. Their representation is settled (spec decision D216: a sign with playback expansion, only the main note expected), but they are not part of v3.1's figure levels: ornaments get a release of their own after v3.2, starting with the grace note (D233).
- **related:** `embellishment`, `grace-note`, `mordent`, `trill`, `turn`, `jazz-articulation`
- **sources:** S29, S34, specs/decisions.md, docs/music/embellishment-catalogue.md

### Pitch class

- **id:** `pitch-class`
- **aliases:** octave-free note name
- **popup:** A note name without its octave: every C on the keyboard, high or low, belongs to the one pitch class C. There are 12.
- **definition:** A pitch class groups every pitch that shares a note name, whatever its octave: C2, C4 and C6 all belong to pitch class C. Notes that sound the same under different names, such as C-sharp and D-flat, count as one pitch class too, so there are exactly 12. Musicians use the idea whenever the octave does not matter, for example when asking which notes a melody uses, or which scale contains them all.
- **in_infinite_flow:** The Written key control offers the 12 pitch classes as home notes. The key and mode suggestion planned for v3.2 (not built) works with pitch classes: it suggests nothing for a doodle with fewer than 5 different ones (spec decision D216).
- **related:** `note-name`, `pitch`, `octave`, `enharmonic`, `key-finding`, `key-profile`, `key-and-mode-suggestion`
- **sources:** S78, S14, docs/music/key-and-mode-estimation.md, specs/versions/v3/key-and-mode-suggestion.md

### Plop

- **id:** `plop`
- **aliases:** drop
- **popup:** A jazz effect: sliding down into a note from somewhere above it.
- **definition:** A plop is a jazz articulation where the player falls into the written note from an unspecified higher pitch, instead of starting it cleanly. It is shown as a line curving down into the note head from the upper left. It is the downward counterpart of the scoop.
- **in_infinite_flow:** Not used. If adopted, only the written note would be expected.
- **related:** `scoop`, `fall`, `jazz-articulation`
- **sources:** S31, S33

### Quarter tone

- **id:** `quarter-tone`
- **aliases:** quarter step
- **popup:** A pitch about halfway between two neighbouring piano keys. Arabic music uses such in-between notes.
- **definition:** A quarter tone is half of a half step, so it falls between two neighbouring keys of a piano and cannot be played on one. Arabic notation writes some notes with a "half-flat" sign, for example a slightly lowered E or B in the maqams Rast and Bayati. The name is an approximation: in practice these notes are tuned by ear, and their exact height varies between regions, maqams and musicians.
- **in_infinite_flow:** Not built; style atlas research: the app uses the twelve notes of the piano only, so a maqam sketch has to round such notes to a neighbour (docs/music/styles/folk-and-world.md).
- **related:** `half-step`, `maqam`, `jins`, `pitch`, `flat`
- **sources:** S397, S398, docs/music/styles/folk-and-world.md

### Scoop

- **id:** `scoop`
- **aliases:** lift, bend into
- **popup:** A jazz effect: sliding up into a note from a little below it.
- **definition:** A scoop starts a note slightly under its written pitch and slides up into it. It is written as a small curved line rising into the note head from the left. Blues and jazz singers and horn players use it constantly, especially on accented notes.
- **in_infinite_flow:** Not used. If adopted, only the written note would be expected.
- **related:** `plop`, `slide`, `jazz-articulation`, `blue-note`
- **sources:** S31, S33

### Sharp

- **id:** `sharp`
- **aliases:** ♯
- **popup:** The sign ♯. It raises a note by one half step: F-sharp is the key just above F.
- **definition:** A sharp raises a note by one half step, so F-sharp is the key just above F on a keyboard. In a key signature, a sharp applies to that letter in every octave for the whole piece. As an accidental in front of one note, it lasts to the end of the measure. Keys with sharps and keys with flats are equally normal; which one a piece uses depends on its key.
- **related:** `flat`, `natural`, `accidental`, `key-signature`
- **sources:** S14

### Slide

- **id:** `slide`
- **aliases:** slide into
- **popup:** A short glide into a note, usually from just below it.
- **definition:** A slide moves smoothly into a note from a nearby pitch, usually from below, instead of starting it cleanly. The word is used loosely: in folk music it can mean a quick grace-note lift into the note; in blues it is close to a scoop; between two written notes it becomes a glissando.
- **in_infinite_flow:** Not used. If adopted, it would share one flag with the scoop.
- **related:** `scoop`, `glissando`, `grace-note`
- **sources:** S32, S33

### Staff

- **id:** `staff`
- **aliases:** stave
- **popup:** The five horizontal lines music is written on. The higher a note sits on them, the higher it sounds.
- **definition:** A staff is a set of five evenly spaced horizontal lines. Notes go on the lines or in the four spaces between them, and higher placement means higher pitch. A clef at the left fixes which pitch each line stands for, and ledger lines extend the staff above or below. Piano music usually uses two staves joined together; a saxophone part uses one.
- **in_infinite_flow:** The app shows the phrase on a single staff, with chord symbols marking the harmony. The staff is in treble clef, or in bass clef for a my instrument set to it.
- **related:** `clef`, `treble-clef`, `bass-clef`, `ledger-line`, `measure`, `chord-symbol`, `grand-staff`
- **sources:** S14

### Treble clef

- **id:** `treble-clef`
- **aliases:** G clef
- **popup:** The curly clef used for higher instruments. Its curl wraps around the line where the G above middle C sits.
- **definition:** The treble clef, or G clef, curls around the second line from the bottom of the staff and marks it as G4, the G just above middle C. From there the lines read E, G, B, D, F from bottom to top, and the spaces F, A, C, E. Flute, violin, saxophone and the right hand of piano music are usually written in treble clef.
- **in_infinite_flow:** Every built-in instrument profile, the C MIDI keyboard included, is written in treble clef, and so is my instrument unless the player chooses bass clef (spec decision D293).
- **related:** `clef`, `bass-clef`, `staff`, `ledger-line`, `middle-c`
- **sources:** S14

### Trill

- **id:** `trill`
- **aliases:** shake, tr
- **popup:** A rapid back-and-forth between a note and the note just above it, for the whole length of the note.
- **definition:** A trill alternates very quickly between the written note and its upper neighbor, a half or whole step above, for as long as the note lasts. It is written "tr", often followed by a wavy line. In baroque music it usually starts on the upper note; from the late classical period on, on the written note. It often ends with a quick dip to the note below.
- **in_infinite_flow:** Not used. If adopted, only the main note would be expected, and only long notes would carry one.
- **related:** `ornament`, `mordent`, `turn`, `neighbor-tone`
- **sources:** S35

### Turn

- **id:** `turn`
- **aliases:** gruppetto, inverted turn
- **popup:** Four quick notes circling the main note: above, the note itself, below, the note itself.
- **definition:** A turn wraps a main note in its neighbors: the note above, the main note, the note below, then the main note again. Over E, that is F, E, D, E. It is written as a sideways S above the note; placed between two notes, it is played after the first one. The inverted turn starts from below.
- **in_infinite_flow:** Not used. If adopted, only the main note would be expected.
- **related:** `ornament`, `mordent`, `neighbor-tone`, `enclosure`
- **sources:** S36

## Rhythm and meter

### Aksak

- **id:** `aksak`
- **aliases:** limping rhythm, asymmetric meter
- **popup:** A "limping" meter with beats of unequal length, made of quick groups of two and three, such as 2+2+3 in 7/8.
- **definition:** Aksak is a Turkish word meaning "limping", used for meters built from short groups of two and three quick pulses, so that the beats are not all the same length. A bar of 7/8 counted 2+2+3 has three beats, the last one longer. Balkan dances use many such meters, such as 7/8, 9/8 (2+2+2+3) and 11/8. Within a tune the grouping usually stays the same, which gives the music its lopsided swing.
- **in_infinite_flow:** Not built; style atlas research: the app writes four bars of 4/4, so aksak meters need a new meter capability (docs/music/styles/folk-and-world.md).
- **related:** `meter`, `time-signature`, `beat`, `subdivision`, `compound-meter`
- **sources:** S379, S380, docs/music/styles/folk-and-world.md

### Anticipation

- **id:** `anticipation`
- **aliases:** push, anticipatory syncopation
- **popup:** A note that arrives a little early: it starts just before the beat or the chord it belongs to.
- **definition:** The word has two linked meanings. In rhythm, an anticipation is a note that starts shortly before a strong beat, an eighth or a sixteenth early, and is held over it, giving a forward push; pop, rock and jazz use it constantly. In harmony, it is a note of the coming chord sounded just before that chord arrives, then usually repeated or held when it does. Moving from a G chord to a C chord, a C on the last offbeat of the G bar, then C again on beat 1, anticipates the C chord. The two often happen together.
- **in_infinite_flow:** Not written today. Under Active displacement the app can start a note just before beat 2, 3 or 4, but not as a held push, and never into the next measure's first beat. The harmonic kind is ruled out too: a tie may cross a chord change only on a note both chords share. Not among v3.1's figure levels, since it touches the rhythm and tie rules (spec decision D233), nor among v3.2's allowed rhythm changes, since the rhythm grammar cannot write a held push as one edit; later.
- **related:** `syncopation`, `offbeat`, `tie`, `non-chord-tone`, `chord`, `metric-displacement`
- **sources:** S21, S44, S25, S46, docs/music/rhythm-phrase-structure.md

### Augmentation

- **id:** `augmentation`
- **aliases:** rhythmic augmentation
- **popup:** Playing a musical idea with every note twice as long, so it keeps its shape but moves at half the speed.
- **definition:** Augmentation restates a melody or rhythm with every duration lengthened by the same factor, usually doubled: four eighth notes become four quarter notes. The idea stays recognizable because its proportions are kept, but it sounds broader and calmer. Its opposite, diminution, shortens every value. The same word also names an augmented interval, an unrelated meaning.
- **in_infinite_flow:** Not generated yet. Doubling every length halves the notes per measure, so it would normally need a lower Note density at the same time.
- **related:** `diminution`, `rhythm`, `motivic-development`, `control-note-density`
- **sources:** S51, S41

### Backbeat

- **id:** `backbeat`
- **aliases:** back beat
- **popup:** The accent on beats 2 and 4 of a four-beat bar, usually on the snare drum: the beat people clap on in pop and rock.
- **definition:** In a bar of four beats, beats 1 and 3 are normally the strong ones. A backbeat puts a strong accent on beats 2 and 4 instead, usually with the snare drum, while the bass drum keeps beats 1 and 3. It is the beat audiences clap on in rock, pop, soul and funk, and much of what makes those styles feel driving.
- **related:** `beat`, `strong-and-weak-beats`, `meter`, `groove`, `offbeat`
- **sources:** S139

### Beat

- **id:** `beat`
- **aliases:** pulse
- **popup:** The steady pulse you tap your foot to. In 4/4 there are four beats in each measure.
- **definition:** The beat is the regular pulse under the music, the thing you tap or clap along to. Beats are evenly spaced, and the tempo says how fast they come. Meter groups beats into measures and makes some of them feel stronger than others. Notes can land on a beat, between beats, or last across several beats; the beat itself stays steady.
- **in_infinite_flow:** In the app's 4/4 phrases one beat is a quarter note, which is four ticks.
- **related:** `tempo`, `meter`, `measure`, `strong-and-weak-beats`, `subdivision`, `offbeat`
- **sources:** S14, S15, S8

### Clave

- **id:** `clave`
- **aliases:** son clave, rumba clave, 3-2 clave, 2-3 clave
- **popup:** A five-stroke rhythm spread over two bars that holds Cuban music together; also the pair of wooden sticks that play it.
- **definition:** The clave is a two-bar rhythm of five strokes, three in one half and two in the other. In Cuban son and salsa every part, from the piano pattern to the bass and the melody, is shaped to fit it, and musicians say a tune is in 3-2 or 2-3 clave depending on which half comes first. Rumba clave places one stroke a little later. The word also names the two hardwood sticks that play the rhythm.
- **in_infinite_flow:** Not built; style atlas research: clave patterns would be stored timelines that the drums and the line align with (docs/music/styles/folk-and-world.md).
- **related:** `timeline`, `tresillo`, `syncopation`, `montuno`, `tumbao`, `bossa-nova`
- **sources:** S387, S380, docs/music/styles/folk-and-world.md

### Compás

- **id:** `compas`
- **aliases:** compas
- **popup:** In flamenco, the cycle of beats and accents a song form is built on, often twelve beats long.
- **definition:** Compás is the Spanish word for a bar or meter. In flamenco it means the rhythmic cycle of a song form, with its own pattern of accents. Soleá and bulerías use a twelve-beat cycle accented on beats 3, 6, 8, 10 and 12, which sounds like groups of three followed by groups of two; siguiriya groups its beats 2+2+3+3+2. Hand-claps (palmas) and the guitar mark the compás, and every part lines up with it.
- **in_infinite_flow:** Not built; style atlas research: a twelve-beat cycle does not fit four bars of 4/4; the research treats compás as an accent template over a longer cycle (docs/music/styles/folk-and-world.md).
- **related:** `meter`, `aksak`, `hemiola`, `strong-and-weak-beats`, `andalusian-cadence`
- **sources:** S383, S381, docs/music/styles/folk-and-world.md

### Compound meter

- **id:** `compound-meter`
- **aliases:** compound time, 6/8, 12/8
- **popup:** A meter whose beats each split into three, such as 6/8: two beats per bar, each made of three quick notes.
- **definition:** In a compound meter each beat divides into three equal parts instead of two. A bar of 6/8 holds six eighth notes felt as two beats of three (ONE-two-three, TWO-two-three); 9/8 has three such beats and 12/8 four. Jigs, many lullabies and slow blues use compound meters. A meter whose beats divide in two, such as 2/4 or 4/4, is called simple.
- **in_infinite_flow:** Not built; style atlas research: the app writes 4/4 only, and its swing just lengthens the first eighth of a pair; jigs need a compound-meter capability (docs/music/styles/folk-and-world.md).
- **related:** `meter`, `time-signature`, `subdivision`, `jig`, `swing`, `shuffle`
- **sources:** S373, docs/music/styles/folk-and-world.md

### Count-in

- **id:** `count-in`
- **aliases:** count-off, counting in, lead-in
- **popup:** A measure of clicks or counted beats before the music starts, so you know the speed and where beat 1 falls.
- **definition:** A count-in is a short stretch of counted beats before the music begins, usually one or two measures: "one, two, three, four". It sets the tempo and shows where beat 1 falls, so everyone starts together and in time. A band leader counts off a tune out loud; recording software plays a measure of metronome clicks before it starts recording.
- **in_infinite_flow:** Every session starts with one measure of count-in, heard as clicks (even with the click switched off) and counted on screen, while phrase 1 is already shown so you can read ahead. A Start click or the starting note begins it. Since v3.0 (spec decision D297), if you changed a setting after the phrase on screen was made, so the phrase is out of date, Start and the starting note first ask whether to make a new phrase or start with this one, and the count-in begins only if you start with this one. In a Jam, planned for v3.2 (not built), the doodle is played only after the count-in, and the click goes on through the doodle and the two measures before phrase 1 (spec decision D234).
- **related:** `tempo`, `beat`, `measure`, `cue`, `starting-note`, `jam`
- **sources:** specs/versions/v2/master-spec.md, specs/versions/v3/master-spec.md, specs/versions/v3/jam.md

### Diminution

- **id:** `diminution`
- **aliases:** rhythmic diminution
- **popup:** Playing a musical idea with every note half as long, so it keeps its shape but goes twice as fast.
- **definition:** Diminution restates a melody or rhythm with every duration shortened by the same factor, usually halved: four quarter notes become four eighth notes. It is the opposite of augmentation. It makes an idea sound more urgent, and it is one way a phrase seems to speed up toward its end. Older music also uses the word for decorating a melody with many quick notes.
- **in_infinite_flow:** Not generated yet. Halving lengths doubles the notes per measure, and a sixteenth note cannot be halved on the app's grid.
- **related:** `augmentation`, `rhythm`, `sixteenth-note`, `tick`
- **sources:** S51, S41

### Dotted note

- **id:** `dotted-note`
- **aliases:** dot, dotted rhythm
- **popup:** A dot after a note makes it half again as long. A dotted quarter note lasts a quarter plus an eighth.
- **definition:** A dot written just after a note head adds half of the note's own length. A dotted half note lasts three beats in 4/4 (two plus one), and a dotted eighth lasts three sixteenths. Rests can be dotted the same way. A dot lets one symbol show a length that would otherwise need two tied notes.
- **in_infinite_flow:** The score uses at most one dot on a note or rest; other lengths are written with ties.
- **related:** `quarter-note`, `eighth-note`, `tie`, `rhythm`
- **sources:** S14, S8a

### Downbeat

- **id:** `downbeat`
- **aliases:** beat 1
- **popup:** The first beat of a measure, usually the one that feels strongest.
- **definition:** The downbeat is beat 1 of a measure. The name comes from the downward stroke a conductor makes on that beat. It is normally the strongest point of the measure, so listeners use it to keep their place. Music that avoids the downbeat, by resting on it or tying a note into it, can sound restless or syncopated.
- **in_infinite_flow:** Every phrase starts with a note on the downbeat of measure 1.
- **related:** `beat`, `strong-and-weak-beats`, `measure`, `syncopation`
- **sources:** S14

### Eighth note

- **id:** `eighth-note`
- **aliases:** quaver
- **popup:** A note half as long as a quarter note. Two eighth notes fit in each beat of 4/4 (count "1 and 2 and").
- **definition:** An eighth note lasts half as long as a quarter note, so two of them fill one beat in 4/4. It looks like a quarter note with one flag, or with a single beam joining it to its neighbors. Players often count eighths as "1-and-2-and": the numbers fall on the beats, and each "and" falls halfway between. An eighth rest lasts the same time.
- **in_infinite_flow:** "Eighth notes" is one of the Note density options, where eighth notes are the main pulse of the phrase. Internally an eighth note is two ticks.
- **related:** `quarter-note`, `sixteenth-note`, `subdivision`, `offbeat`, `control-note-density`
- **sources:** S14, S8a

### Four on the floor

- **id:** `four-on-the-floor`
- **aliases:** four to the floor
- **popup:** A drum pattern with the bass drum on every beat of a 4/4 bar: the steady thump of disco and house music.
- **definition:** Four on the floor is a drum pattern in which the bass drum (kick) plays on all four beats of a 4/4 bar, usually with a hi-hat on the offbeats between them and a snare or hand-clap on beats 2 and 4. It became widespread with disco in the 1970s and is the basis of house and techno. The even pulse makes the beat very easy to follow.
- **in_infinite_flow:** Not built; style atlas research: it would be a drum pattern for v4's planned drums, needed by the house and techno entries (docs/music/styles/popular-electronic-game.md).
- **related:** `beat`, `backbeat`, `offbeat`, `groove`
- **sources:** S355, S353, docs/music/styles/popular-electronic-game.md

### Gallop

- **id:** `gallop`
- **aliases:** galloping rhythm
- **popup:** A repeated rhythm of one longer note and two quick ones, like a horse's gallop; common in heavy metal.
- **definition:** A gallop is a rhythm cell of one eighth note followed by two sixteenth notes (long, short-short), repeated without a break, so it sounds like hooves. Heavy metal guitarists and bass players drive songs with it, often on one low note; Iron Maiden's bassist Steve Harris made it a trademark.
- **in_infinite_flow:** Not built; style atlas research: the gallop would be a stored rhythm cell for a metal style (docs/music/styles/popular-electronic-game.md).
- **related:** `rhythm`, `eighth-note`, `sixteenth-note`, `riff`
- **sources:** S345, S346, docs/music/styles/popular-electronic-game.md

### Ghost note

- **id:** `ghost-note`
- **aliases:** ghosted note
- **popup:** A very quiet, almost unpitched note, felt more than heard, that adds rhythm between the main notes.
- **definition:** A ghost note is played so softly, or so damped, that it is felt more than heard. Funk drummers fill the gaps between loud backbeats with ghost notes on the snare drum; bass players and guitarists add muted, nearly pitchless notes. Notation shows a ghost note with its note head in brackets, or sometimes with an x. Ghost notes give a groove its busy, rolling surface.
- **in_infinite_flow:** Not built; style atlas research: the app has no loudness levels within a phrase; the funk entry lists ghost notes for the drums and the line (docs/music/styles/jazz-blues-soul.md).
- **related:** `dynamics`, `groove`, `backbeat`, `articulation`
- **sources:** docs/music/styles/jazz-blues-soul.md

### Groove

- **id:** `groove`
- **aliases:** feel
- **popup:** The repeating rhythmic feel that makes you want to move, mostly made by the drums and the bass together.
- **definition:** A groove is the repeating rhythmic pattern and feel of a piece, the part that makes listeners tap their feet. It comes mostly from the drums and the bass playing together, and from details such as which beats are accented, how the beat is divided and whether the eighth notes swing. Musicians talk about "locking into" a groove when everyone shares the same feel.
- **in_infinite_flow:** There is no groove part today: a session has a click and a count-in, but no drums. Drums are a candidate for v4.
- **related:** `rhythm`, `backbeat`, `swing`, `beat`, `functional-layer`, `vamp`
- **sources:** S127, S128

### Half note

- **id:** `half-note`
- **aliases:** minim
- **popup:** A note that lasts two beats in 4/4, drawn as a hollow note head with a stem.
- **definition:** A half note lasts as long as two quarter notes, so it holds for two beats in 4/4. It has a hollow (unfilled) head and a stem. A dot after it adds one more beat, for three in all. The half rest, a small block sitting on the middle line of the staff, lasts the same time.
- **in_infinite_flow:** Note density sets the main note value, but longer notes such as half notes can still appear when the app joins two notes into one longer one.
- **related:** `quarter-note`, `whole-note`, `dotted-note`, `control-note-density`
- **sources:** S14, S8a

### Hemiola

- **id:** `hemiola`
- **aliases:** none
- **popup:** Two bars of three beats heard for a moment as three groups of two, a brief shift of the beat often heard at cadences.
- **definition:** A hemiola regroups six equal beats: instead of two groups of three (two bars of 3/4), the accents fall as three groups of two. The music seems to slow and stretch for a moment, then the normal meter returns. Baroque dances such as the courante and the minuet often use a hemiola just before a cadence. The reverse, three-beat groups heard across a duple meter, also appears, for example in jazz.
- **in_infinite_flow:** Not built; style atlas research: the app writes 4/4 only; the Baroque, waltz and jazz-waltz entries list hemiola as a rhythm manipulation (docs/music/styles/art-music.md, docs/music/styles/jazz-blues-soul.md).
- **related:** `meter`, `strong-and-weak-beats`, `metric-displacement`, `cadence`, `waltz`
- **sources:** S275, S273, docs/music/styles/art-music.md, docs/music/styles/jazz-blues-soul.md

### Meter

- **id:** `meter`
- **aliases:** metre, time
- **popup:** The repeating pattern of strong and weak beats that groups music into measures, such as "ONE two three four".
- **definition:** Meter is the way beats are grouped into a repeating pattern of stronger and weaker pulses. In 4/4 the pattern is four beats per measure, with beat 1 strongest, beat 3 fairly strong, and beats 2 and 4 weaker. A waltz, by contrast, groups beats in threes. The time signature writes the meter down; listeners feel it from where long notes and accents tend to fall.
- **in_infinite_flow:** The app uses 4/4 only. It makes sure every measure keeps a note sounding on beat 1 or beat 3 (a metrical anchor), so the meter stays clear even with syncopation.
- **related:** `time-signature`, `beat`, `strong-and-weak-beats`, `measure`, `metrical-anchor`
- **sources:** S14, S15, S8

### Metric displacement

- **id:** `metric-displacement`
- **aliases:** displacement, rhythmic displacement, displacement dissonance
- **popup:** The same rhythm started a little later or earlier, so its notes fall on different parts of the beat and it feels new.
- **definition:** Metric displacement shifts a whole rhythm in time by a fixed amount, such as an eighth note, while the beat underneath stays put. Every note then lands on a different part of the beat, so a familiar pattern suddenly sounds off-balance. Theorists call the amount of the shift the displacement index. When one part is displaced against others that are not, the clash is called displacement dissonance.
- **in_infinite_flow:** The Syncopation control displaces single notes, never a whole motif. Displacing a whole measure would usually break the rule that beat 1 or beat 3 has a sounding note.
- **related:** `syncopation`, `offbeat`, `metrical-anchor`, `strong-and-weak-beats`
- **sources:** S47, docs/music/rhythm-phrase-structure.md

### Offbeat

- **id:** `offbeat`
- **aliases:** off-beat, off the beat
- **popup:** A spot between the beats, such as the "and" in "1 and 2 and". Notes there feel lighter or bouncier than notes on the beat.
- **definition:** An offbeat is any point in time that falls between beats rather than on one. In 4/4 the most common offbeats are the eighth-note "ands" halfway through each beat; the sixteenth-note spots in between are offbeats too. Starting or stressing notes on offbeats is a basic ingredient of syncopation and of much jazz and pop. (Some musicians also call beats 2 and 4 the "off beats"; this lexicon means between-beat positions.)
- **in_infinite_flow:** The Syncopation option "Occasional offbeats" moves one note in one or two measures an eighth later, so it starts on an offbeat, or holds a note across beat 3.
- **related:** `beat`, `subdivision`, `syncopation`, `eighth-note`, `control-syncopation`
- **sources:** S14, S8

### One drop

- **id:** `one-drop`
- **aliases:** one-drop rhythm
- **popup:** A reggae drum pattern that leaves beat 1 empty and lands the bass drum and snare together on beat 3.
- **definition:** The one drop is the classic reggae drum pattern. The drummer leaves the first beat of the bar empty and plays the bass drum together with a rim-shot or snare on beat 3, with the hi-hat keeping steady eighths or a light shuffle. The empty downbeat and heavy third beat give reggae its laid-back, half-time feel. Variants called rockers and steppers add the bass drum on other beats.
- **in_infinite_flow:** Not built; style atlas research: it would be a drum pattern for v4's planned drums, together with the offbeat skank (docs/music/styles/popular-electronic-game.md).
- **related:** `backbeat`, `downbeat`, `groove`, `skank`
- **sources:** S351, S350, docs/music/styles/popular-electronic-game.md

### Phasing

- **id:** `phasing`
- **aliases:** phase music, phase shifting
- **popup:** Two players repeat the same short figure, one slowly pulling ahead, so the two copies drift apart and form new patterns.
- **definition:** Phasing is a technique of minimalist music. Two players (or two tape loops) start a short repeated figure together; one gradually moves ahead until the copies are one note apart, then two, and so on, until they line up again. The shifting overlaps create rhythms and melodies neither part plays alone. Steve Reich's Piano Phase (1967) uses a twelve-note figure this way. A simpler variant shifts the figure by inserting or removing a note.
- **in_infinite_flow:** Not built; style atlas research: the minimalism entry proposes phase steps as a manipulation of a repeated figure (docs/music/styles/art-music.md).
- **related:** `additive-process`, `riff`, `metric-displacement`, `imitation`
- **sources:** S291, S292, S115, docs/music/styles/art-music.md

### Quantize

- **id:** `quantize`
- **aliases:** quantise, quantizing, quantising, quantization, snapping to the grid
- **popup:** Moving played notes onto the nearest point of a time grid, so notes played a little early or late line up with the beat.
- **definition:** Nobody plays exactly on the beat: real notes land a little early or late. Quantizing moves each note's start, and often its end, to the nearest point of a chosen grid, such as every sixteenth note, so the timing lines up neatly. Recording software and MIDI sequencers use it to tidy a performance or to turn it into readable notation. A fine grid keeps more of the player's timing; a coarse one tidies more but can move a note onto the wrong beat.
- **in_infinite_flow:** Planned for Jam in v3.2 (not built; spec decision D234). The app quantizes the doodle once, when it ends, to its sixteenth-note grid (the tick) at every tempo, so a note moves at most half a sixteenth (about 31 ms at 240 BPM). Starts and ends both snap, and every note keeps at least one tick. Overlapping notes become one line: a later start ends the earlier note, and when two notes snap to the same tick the longer stays (on equal length, the higher). The quantized doodle is what the app uses and shows in the review; the raw notes stay private played notes.
- **related:** `tick`, `sixteenth-note`, `subdivision`, `doodle`, `jam`
- **sources:** specs/versions/v3/jam.md, specs/decisions.md

### Quarter note

- **id:** `quarter-note`
- **aliases:** crotchet
- **popup:** A note that lasts one beat in 4/4, drawn as a filled-in note head with a stem.
- **definition:** A quarter note is drawn as a filled oval with a stem and no flag. In 2/4, 3/4 and 4/4 it lasts exactly one beat, which makes it the easiest value to count: one note per tap of the foot. (In a meter like 6/4 the beat is longer: a dotted half note.) Two eighth notes or four sixteenth notes take the same time. The quarter rest, a squiggly vertical sign, lasts as long.
- **in_infinite_flow:** "Quarter notes" is the calmest Note density option: the phrase moves mostly one note per beat. Internally a quarter note is four ticks.
- **related:** `beat`, `eighth-note`, `half-note`, `sixteenth-note`, `control-note-density`
- **sources:** S14, S8a

### Rhythm

- **id:** `rhythm`
- **aliases:** none
- **popup:** The pattern of long and short notes and silences in time. Clap a song without singing it and you are clapping its rhythm.
- **definition:** Rhythm is the pattern of when sounds start and how long they last, silences included. It sits on top of the steady beat: the beat is the grid, the rhythm is what is placed on it. Many songs can be recognized from their rhythm alone, clapped without any pitches. Note values, rests, ties, dots and syncopation are the tools for writing rhythm down.
- **in_infinite_flow:** The app plans each phrase's rhythm from the four Rhythm controls (Note density, Rhythmic variety, Syncopation and Silence density) before choosing its pitches.
- **related:** `beat`, `meter`, `rest`, `syncopation`, `control-note-density`, `control-rhythmic-variety`
- **sources:** S14, S15, S8a

### Shuffle

- **id:** `shuffle`
- **aliases:** shuffle rhythm, shuffle feel
- **popup:** A rolling long-short rhythm, close to the first and last notes of a triplet, that drives much blues and early rock and roll.
- **definition:** A shuffle splits each beat into a long note and a short one, close to the first and last notes of a three-note triplet (a triplet quarter plus a triplet eighth). It is a strong, bouncy form of swing, often played by the whole band at once: drums, bass, guitar and piano. The shuffle is the typical beat of the blues and of boogie-woogie, and it carried over into rhythm and blues before early rock and roll straightened it.
- **in_infinite_flow:** Not built; style atlas research: the app's swing control lengthens the first eighth of a pair, which approaches a shuffle in the line; a shuffled backing needs v4's accompaniment (docs/music/styles/jazz-blues-soul.md).
- **related:** `swing`, `eighth-note`, `subdivision`, `compound-meter`, `twelve-bar-blues`, `boogie-woogie`
- **sources:** S317, S313, S336, docs/music/styles/jazz-blues-soul.md

### Sixteenth note

- **id:** `sixteenth-note`
- **aliases:** semiquaver
- **popup:** A quick note: four of them fit in one beat of 4/4 (count "1 e and a").
- **definition:** A sixteenth note lasts a quarter of a beat in 4/4, half as long as an eighth note. It is drawn with two flags, or two beams when grouped. Players often count them "1-e-and-a, 2-e-and-a", one syllable per sixteenth. Runs of sixteenths sound busy, and at a quick tempo they are a real technical challenge on any instrument.
- **in_infinite_flow:** "Sixteenth" is the busiest Note density option. The sixteenth note is also the app's smallest unit of time: every measure has 16 sixteenth-note ticks.
- **related:** `eighth-note`, `quarter-note`, `subdivision`, `tick`, `control-note-density`
- **sources:** S14, S8a

### Stop time

- **id:** `stop-time`
- **aliases:** stop-time breaks, stop chorus
- **popup:** The band plays only short hits on chosen beats, often the first of each bar, while the soloist keeps going in between.
- **definition:** In stop time the accompaniment stops playing continuously and plays only short, sharp hits on chosen beats, usually the first beat of each bar or of every other bar, while the singer or soloist continues through the gaps. It is common in blues, early jazz and rock and roll, often in the first bars of a verse. A full stop of a bar or two, with the soloist alone, is a break.
- **in_infinite_flow:** Not built; style atlas research: the research proposes a stop-time-and-breaks capability for the accompaniment (docs/music/styles/jazz-blues-soul.md).
- **related:** `break`, `accompaniment`, `stab`, `rest`
- **sources:** docs/music/styles/jazz-blues-soul.md

### Strong and weak beats

- **id:** `strong-and-weak-beats`
- **aliases:** strong beat, weak beat, metric accent, metrical hierarchy
- **popup:** Some beats in a measure feel heavier than others. In 4/4, beat 1 is strongest, beat 3 next, and beats 2 and 4 are lighter.
- **definition:** In any meter the beats are not all equal. In 4/4, beat 1 feels strongest, beat 3 is next, and beats 2 and 4 are weak. The same ranking carries on at smaller levels: a note on a beat is stronger than one on the "and", which is stronger than one on a sixteenth in between. Important notes, such as chord tones, usually go on strong beats; stressing weak spots creates syncopation.
- **in_infinite_flow:** The app treats beats 1 and 3 (ticks 0 and 8) as its strong positions. They decide the metrical anchor rule, where an appoggiatura may start, and how soon the Settled tension setting must resolve.
- **related:** `beat`, `meter`, `downbeat`, `offbeat`, `syncopation`, `metrical-anchor`
- **sources:** S14, S8

### Subdivision

- **id:** `subdivision`
- **aliases:** beat division
- **popup:** Splitting each beat into smaller equal parts, such as two eighth notes or four sixteenth notes per beat.
- **definition:** Subdivision means splitting each beat into equal smaller parts. In 4/4, splitting a beat in two gives eighth notes; in four, sixteenth notes. Musicians silently count subdivisions ("1-and-2-and" or "1-e-and-a") to place notes between beats accurately. Counting in the smallest subdivision a passage uses is one of the most reliable ways to keep time.
- **in_infinite_flow:** A beat can be one quarter note, or split into two eighths or four sixteenths. The app's internal grid always splits each beat into four sixteenths; Note density picks which of these values dominates the phrase, and Rhythmic variety how much other patterns mix in.
- **related:** `beat`, `eighth-note`, `sixteenth-note`, `tick`, `control-note-density`
- **sources:** S14, S8a

### Swing

- **id:** `swing`
- **aliases:** swing eighths, swung eighths
- **popup:** A jazz way of playing pairs of eighth notes unevenly, long-short, long-short, instead of exactly even.
- **definition:** Swing is a way of performing, central to jazz, in which pairs of written eighth notes are played unequally: the note on the beat longer, the one on the "and" shorter and often lighter, roughly in a two-to-one ratio, though the exact feel changes with tempo and player. The music is usually still written as ordinary even eighths, with a word such as "Swing" telling players how to read them.
- **in_infinite_flow:** The app writes plain, even eighth notes and has no swing setting, even under the Jazz preset. You may swing them when you play.
- **related:** `eighth-note`, `offbeat`, `control-musical-profile-preset`
- **sources:** S14

### Syncopation

- **id:** `syncopation`
- **aliases:** none
- **popup:** Rhythm that surprises by stressing the "wrong" spots: notes that start between beats, or are held over a strong beat.
- **definition:** Syncopation happens when the rhythm works against the expected pattern of strong and weak beats: notes are accented or start where the beat is weak, such as offbeats, instead of on the strong beats. Common ways are starting a note on an offbeat and holding it through the next beat, or resting on a strong beat. The steady beat is still felt underneath, and the contrast gives the music its push.
- **in_infinite_flow:** The app uses two tools: moving a note's start later, off the main grid, and holding (tying) a note across a beat. The Syncopation control sets how much of this a phrase gets.
- **related:** `offbeat`, `strong-and-weak-beats`, `tie`, `control-syncopation`
- **sources:** S8, S14, S15

### Tala

- **id:** `tala`
- **aliases:** taal, tāla
- **popup:** An Indian rhythmic cycle with a fixed number of beats, grouped in sections, such as teental with 16 beats.
- **definition:** A tala is a rhythmic cycle in Indian classical music: a fixed number of beats, divided into sections, that repeats throughout a piece. Teental, the most common Hindustani tala, has 16 beats grouped 4+4+4+4; its first beat (sam) is the strongest, and one section (khali, "empty") is marked by a wave of the hand rather than a clap. Carnatic music has its own talas, such as adi with 8 beats. Musicians aim to land phrases on sam.
- **in_infinite_flow:** Not built; style atlas research: a tala cycle would be a long rhythmic frame; the raga entry can only sketch it within the app's short phrases (docs/music/styles/folk-and-world.md).
- **related:** `meter`, `raga`, `downbeat`, `aksak`
- **sources:** S402, S85, docs/music/styles/folk-and-world.md

### Tempo

- **id:** `tempo`
- **aliases:** BPM, beats per minute
- **popup:** How fast the music goes, usually counted in beats per minute (BPM). At 60 BPM there is one beat every second.
- **definition:** Tempo is the speed of the beat, most often given in beats per minute (BPM): at 60 BPM each beat lasts one second, at 120 BPM half a second. Older music often uses Italian words instead, such as andante (at a walking pace) or allegro (lively). Practicing a passage slowly first and then raising the tempo step by step is a standard way to learn it.
- **in_infinite_flow:** The app counts the quarter note as the beat. The Tempo control sets the value.
- **related:** `beat`, `meter`, `control-tempo`
- **sources:** S14, S15

### The One

- **id:** `the-one`
- **aliases:** on the one
- **popup:** Funk's heavy accent on the first beat of the bar, where the whole band hits together.
- **definition:** In funk, "the One" is the first beat of the bar, which James Brown's bands stressed far more heavily than the backbeat on 2 and 4 that rhythm and blues favoured. Bass, drums and horns hit it together; between those hits, interlocking parts (often in sixteenth notes) leave plenty of space. Musicians talk about being "on the one" when the whole groove locks to that beat.
- **in_infinite_flow:** Not built; style atlas research: the funk entry asks for a strong downbeat accent in the drums and the bass (docs/music/styles/jazz-blues-soul.md).
- **related:** `downbeat`, `strong-and-weak-beats`, `groove`, `backbeat`
- **sources:** S334, S335, docs/music/styles/jazz-blues-soul.md

### Time signature

- **id:** `time-signature`
- **aliases:** meter signature, 4/4, common time
- **popup:** Two stacked numbers at the start of the music. In 4/4 the top 4 means four beats per measure; the bottom 4 means a quarter note gets one beat.
- **definition:** A time signature is the pair of stacked numbers after the clef and key signature. In simple meters like 4/4, the top number says how many beats each measure holds, and the bottom number says which note value counts as one beat (4 is a quarter note, 8 an eighth note). 4/4 is so common it is called "common time" and is sometimes written as a large C. Other examples are 3/4 and 2/4.
- **in_infinite_flow:** Every phrase is in 4/4. The score shows the 4/4 signature, and the page header shows a 4/4 badge.
- **related:** `meter`, `beat`, `measure`, `quarter-note`
- **sources:** S14, S15, S8a

### Timeline

- **id:** `timeline`
- **aliases:** timeline pattern, bell pattern, standard pattern
- **popup:** A fixed rhythm, often played on a bell, repeated without change so that every other part can line up with it.
- **definition:** A timeline is a short rhythm repeated throughout a piece without change, usually by a bell or sticks, that the other players use as their reference. West African music is built on such patterns, such as the seven-stroke "standard pattern" spread over twelve quick pulses; the Cuban clave is another timeline. Many timelines spread their strokes as evenly as possible over the cycle, which lets a computer generate them with a simple rule (Euclidean rhythms).
- **in_infinite_flow:** Not built; style atlas research: the research proposes stored timelines (clave, bell pattern, tresillo) as a shared rhythm capability (docs/music/styles/folk-and-world.md).
- **related:** `clave`, `tresillo`, `rhythm`, `groove`
- **sources:** S394, S380, S387, docs/music/styles/folk-and-world.md

### Trading fours

- **id:** `trading-fours`
- **aliases:** trading eights, trading twos, trading bars, fours
- **popup:** Taking turns improvising short solos of a fixed length, four measures each, like a quick musical conversation.
- **definition:** Trading fours is a jazz habit in which players take turns improvising solos of four measures each, often a soloist alternating with the drummer. Each answer can echo or contrast the one before. The length varies: players also trade eights, twos, single measures or whole choruses. Nobody signals the change of turn: everyone counts the measures, so the form itself hands over the turn.
- **related:** `call-and-response`, `measure`, `phrase`
- **sources:** S81, S84

### Tresillo

- **id:** `tresillo`
- **aliases:** 3+3+2, three-three-two
- **popup:** A rhythm cell of three notes over eight quick pulses, grouped 3+3+2; heard in Cuban music, tango, pop and rock.
- **definition:** The tresillo ("little triplet" in Spanish) places three notes on eight quick pulses, at positions 1, 4 and 7, so the gaps measure 3+3+2. It is the first half of the son clave and the basis of the habanera rhythm, and it runs through Latin American music, tango and much pop music, where it is often felt as a pushed, syncopated eighth-note pattern.
- **in_infinite_flow:** Not built; style atlas research: the tresillo would be a stored rhythm cell or timeline (docs/music/styles/folk-and-world.md).
- **related:** `clave`, `timeline`, `syncopation`, `tumbao`
- **sources:** S387, S386, S380, docs/music/styles/folk-and-world.md

### Whole note

- **id:** `whole-note`
- **aliases:** semibreve
- **popup:** A note that lasts a whole measure of 4/4, four beats. It is drawn as a hollow oval with no stem.
- **definition:** A whole note lasts as long as four quarter notes, filling a whole measure of 4/4. It is drawn as a hollow oval with no stem. The whole rest, a small block hanging from a staff line, is also used by custom to show a fully silent measure in any meter. The other note values are named by dividing the whole note: halves, quarters, eighths and sixteenths.
- **in_infinite_flow:** The app never writes a fully silent measure; a single rest lasts at most half a measure.
- **related:** `half-note`, `quarter-note`, `rest`, `measure`
- **sources:** S14, S8a

## Melody

### AABA form

- **id:** `aaba-form`
- **aliases:** 32-bar form, thirty-two-bar form, song form
- **popup:** A song form of four eight-bar sections: a tune (A) played twice, a contrasting bridge (B), then the tune again.
- **definition:** AABA form is the classic layout of American popular songs and jazz standards. It has four sections, usually eight bars each, so 32 bars in all: the main tune (A), the tune again (A), a contrasting middle section called the bridge (B), and the tune a last time (A). The bridge often moves to another key or chord area. Jazz musicians play the whole form as one chorus and repeat it for each solo.
- **in_infinite_flow:** Not built; style atlas research: the app writes one four-bar phrase at a time, so a style's form beyond four bars is an open question of the research (docs/music/styles/jazz-blues-soul.md).
- **related:** `phrase`, `head`, `rhythm-changes`, `strain`
- **sources:** S324, docs/music/styles/jazz-blues-soul.md

### Accented passing tone

- **id:** `accented-passing-tone`
- **aliases:** strong-beat passing tone
- **popup:** A passing note placed on a strong beat, so its clash with the chord is heard before it moves on.
- **definition:** A passing tone usually sits on a weak part of the beat, between two chord notes. When it falls on the strong part instead, the out-of-chord note arrives exactly where the ear expects a stable note, which makes it sound tense and expressive. It still moves on by step in the same direction. Over a C chord, G, then F on beat 1, then E, makes F an accented passing tone.
- **in_infinite_flow:** A passing tone landing on beat 1 or 3. It has a figure level of its own, separate from the plain passing tone's because it sounds much tenser (spec decision D233): Rarely in most presets, Off in Gentle, Often in Speed drill. At Rarely the generator can write one by chance, but never aims for it: it ranks other notes first on beat 1 and at a chord change. At Often or Very often it tries one first at some of the notes where it fits.
- **related:** `passing-tone`, `non-chord-tone`, `strong-and-weak-beats`, `appoggiatura`
- **sources:** S25, src/domain/pitch/pitch-ranking.ts, docs/music/embellishment-catalogue.md

### Additive process

- **id:** `additive-process`
- **aliases:** additive technique
- **popup:** Changing a repeated figure slowly by adding a note (or later removing one) at each repetition.
- **definition:** An additive process is a minimalist technique: a short figure is repeated many times, and at regular points one note is added to it, so it grows step by step; later, notes may be taken away again. Philip Glass built his pieces of 1969 on this idea. The listener follows the slow change because everything else stays the same.
- **in_infinite_flow:** Not built; style atlas research: the minimalism entry proposes it as a manipulation of a repeated figure (docs/music/styles/art-music.md).
- **related:** `phasing`, `riff`, `motivic-development`, `sequence`
- **sources:** S293, S115, docs/music/styles/art-music.md

### Appoggiatura

- **id:** `appoggiatura`
- **aliases:** none
- **popup:** A note that clashes with the chord, reached by a jump and placed on a strong beat, then slipping one step to a note that fits.
- **definition:** An appoggiatura is a tense note, outside the chord, that is entered by leap, usually lands on a strong beat, and then resolves by step to a chord tone. Because it arrives where the ear expects stability, it creates a clear, expressive tension, which the stepwise move then releases. Example over a C major chord: leap from G up to D on beat 1, then step down to C.
- **in_infinite_flow:** The app's strongest diatonic tension figure: a collection note outside the chord, entered by a jump of 3 or more half steps (a skip or a leap in the app's terms), starting on beat 1 or 3, then resolving by one collection step to a chord tone. It comes in two ways. As the one figure the Tension control schedules (Settled, Lift or Edge), every preset's rules allow it, but the generator's search tries chord tones first, and other choices for the Tension figure before it, so in practice it rarely or never appears that way (a sample of about 5,200 phrases had none). As a free figure it has its own figure level (spec decision D233): Often in Speed drill and Pop song, Off in the other built-in presets. Turning the level Off never removes the Tension control's own appoggiatura.
- **related:** `non-chord-tone`, `chord-tone`, `leap`, `step`, `tension-and-resolution`, `strong-and-weak-beats`
- **sources:** S6, S4, S14, docs/music/embellishment-catalogue.md

### Approach note

- **id:** `approach-note`
- **aliases:** approach tone, diatonic approach
- **popup:** A note placed right before an important note, leading into it from close by.
- **definition:** An approach note leads directly into a target note, usually from a step or a half step away, so the ear hears it as being on the way to that target. Jazz players use approach notes constantly to steer a line onto chord tones. An approach note from inside the key is called diatonic; one from outside the key is called chromatic.
- **in_infinite_flow:** The app's "diatonic approach" is always two collection notes moving by step in one direction straight into a chord tone. It appears only as the Tension figure under Build, where exactly one is required, whatever the figure levels: it has no figure level of its own. The one-note chromatic approach and the enclosures are separate figures, each with a figure level any preset can raise (spec decision D233).
- **related:** `chromatic-approach`, `enclosure`, `chord-tone`, `step`, `control-tension`
- **sources:** S4, S9, S14, docs/music/neutral-profile.md

### Arpeggio

- **id:** `arpeggio`
- **aliases:** broken chord
- **popup:** The notes of a chord played one after another instead of all at once, like C, E, G, C.
- **definition:** An arpeggio is a chord spread out in time: its notes are played one at a time, usually in order up or down, instead of together. C-E-G-C is a C major arpeggio. The name comes from the Italian for playing in the manner of a harp. Arpeggios let a one-note-at-a-time instrument such as the saxophone outline the harmony, and practicing them builds a feel for chord shapes.
- **in_infinite_flow:** The app's melodies often outline their chords this way. The Leapiness control counts arpeggio "runs" (three chord tones in a row joined by two same-direction jumps), and the Arpeggio chaos control changes which chord tone comes next.
- **related:** `chord`, `chord-tone`, `triad`, `run`, `control-arpeggio-chaos`, `control-leapiness`
- **sources:** S14

### Call and response

- **id:** `call-and-response`
- **aliases:** call-and-response, question and answer, antiphony, trading
- **popup:** Music as a conversation: one musician plays a phrase, and another answers it.
- **definition:** Call and response makes music as a dialogue. One player, singer or group offers a phrase (the call) and another answers it (the response), echoing it, varying it or completing it. It is rooted in African musical traditions, where a leader's call organizes a group, and it runs through blues, gospel, jazz, soul and hip hop. In classical music the same idea between groups of players is called antiphony, and jazz musicians "trade" short solos in the same spirit.
- **in_infinite_flow:** Jam, planned for v3.2 (not built), works this way: the player's doodle is the call and the generated phrases answer it. The endgame vision describes fights as exchanges of short phrases. Inside one phrase, the rhythm plan's gesture and answer is a small, rhythm-only cousin of the idea.
- **related:** `gesture-and-answer`, `phrase`, `motif`, `trading-fours`, `riff`, `imitation`, `fill`
- **sources:** S52, S80, S57, specs/vision/endgame.md, docs/music/rhythm-phrase-structure.md

### Chord tone

- **id:** `chord-tone`
- **aliases:** harmonic tone
- **popup:** A note that belongs to the chord sounding at that moment. Chord tones sound stable and settled.
- **definition:** A chord tone is a melody note that belongs to the chord sounding at that moment. Over a C major chord (C, E, G), any C, E or G in any octave is a chord tone. Chord tones blend with the harmony and sound stable, so melodies tend to put them on strong beats and use other notes to link them.
- **in_infinite_flow:** A chord tone is a pitch belonging to the active chord. The app ranks chord tones ahead of other notes, and gives them priority on beat 1 and wherever the chord changes. Every tension figure must resolve onto a chord tone.
- **related:** `non-chord-tone`, `chord`, `triad`, `arpeggio`
- **sources:** S4, S14

### Chromatic approach

- **id:** `chromatic-approach`
- **aliases:** chromatic approach note, chromatic approach tone
- **popup:** A note just a half step above or below an important note, usually from outside the key, played right before it.
- **definition:** A chromatic approach is a note one half step above or below a target note, played just before the target and moving straight into it. It is usually outside the key, and that quick flash of outside color makes the arrival feel sharper. It is a staple of jazz lines; for example, D-sharp moving up to E over a C major chord.
- **in_infinite_flow:** One note outside the collection, a half step above or below a chord tone, followed at once by that chord tone: no rest in between, no chord change, and not longer than the target. It has its own figure level, which any preset can turn on (spec decision D233): Rarely in Jazz, Often in Speed drill, Very often in Bebop, Off in the other built-in presets. That level also covers what theory calls a chromatic passing tone (F, F-sharp, G) or a chromatic neighbor (G, F-sharp, G): in this generator both are a chromatic approach seen from the note before it.
- **related:** `approach-note`, `enclosure`, `chromatic`, `chord-tone`, `chromatic-passing-tone`, `control-figure-level`
- **sources:** S5, S9, S14, docs/music/jazz-profile.md

### Chromatic passing tone

- **id:** `chromatic-passing-tone`
- **aliases:** chromatic passing note
- **popup:** A note from outside the key that fills a whole step with two half steps, like F-sharp between F and G.
- **definition:** A chromatic passing tone is a passing tone taken from outside the key. It splits a whole step into two half steps, so the melody slides through it on its way to a chord note. In C major, F, F-sharp, G uses F-sharp this way. It is usually short and on a weak position, and it does not change the chord.
- **in_infinite_flow:** Written only by chance: a chromatic approach whose previous note is a step away in the same direction, so it can appear whenever the chromatic approach's level is not Off (in Jazz, Speed drill and Bebop among the built-in presets). It has no figure level of its own (spec decision D233): the chromatic approach's level governs it, since the generator writes it as a chromatic approach.
- **related:** `passing-tone`, `chromatic`, `chromatic-approach`, `half-step`
- **sources:** S5, S26, src/domain/pitch/pitch-candidates.ts

### Contour

- **id:** `contour`
- **aliases:** melodic contour, melodic shape
- **popup:** The overall shape of a melody: going up, going down, rising then falling, or weaving around.
- **definition:** Contour is the overall shape a melody traces as it moves up and down, regardless of the exact notes. Drawn as a line, it might climb steadily, fall, rise to a peak and come back (an arch), or wander. Contour is one of the first things listeners remember about a tune, and shaping it on purpose makes a phrase sound directed instead of random.
- **in_infinite_flow:** Contour is also an app control with four shapes (Rising, Falling, Arch, Wandering). See the Contour entry under App controls.
- **related:** `control-contour`, `melody`, `register`, `phrase`
- **sources:** S7, S14

### Double neighbor

- **id:** `double-neighbor`
- **aliases:** changing tones, neighbor group
- **popup:** A main note decorated by the note above and the note below in turn, before coming back to it.
- **definition:** A double neighbor leaves a main note, visits its upper neighbor and its lower neighbor one after the other (either order), then returns to the main note. Over a C chord, E, F, D, E is a double neighbor around E. Jazz players use the same shape, without the first main note, as an enclosure.
- **in_infinite_flow:** Its scale-note form is the diatonic enclosure, a figure with its own level (spec decision D233): Often in Speed drill and Bebop, Off in the other built-in presets. With that level Off the generator never writes it, since it never places two outside notes in a row on its own. Its half-step form appears when a chromatic enclosure follows its own target.
- **related:** `neighbor-tone`, `enclosure`, `non-chord-tone`, `step`
- **sources:** S20, src/domain/pitch/pitch-figures.ts

### Embellishment

- **id:** `embellishment`
- **aliases:** decoration, embellishing figure
- **popup:** A note or small group of notes that decorates a more important note without changing the chord.
- **definition:** An embellishment adds interest to a melody around its main notes: passing and neighbor notes, approach notes, enclosures, or ornaments such as trills and grace notes. Take it away and the tune's outline and its harmony stay the same. Some are written as ordinary notes; others are written as a sign or a small note and left to the player to perform.
- **in_infinite_flow:** The generator writes seven kinds of embellishment as ordinary notes. Each kind is a figure, and every preset holds a figure level for each (spec decisions D210, D233): Off, Rarely, Often or Very often, set in the Embellishments group of the controls. Levels are preferences, not quotas. Ornaments written as signs come in a later release.
- **related:** `non-chord-tone`, `passing-tone`, `neighbor-tone`, `enclosure`, `ornament`, `control-figure-level`
- **sources:** S25, specs/archive/v3/embellishment-flags.md, docs/music/embellishment-catalogue.md

### Enclosure

- **id:** `enclosure`
- **aliases:** chromatic enclosure, diatonic enclosure, surround
- **popup:** Two notes that circle an important note, one just above it and one just below, before landing on it.
- **definition:** An enclosure surrounds a target note before landing on it: typically two short notes, one above the target and one below (in either order), then the target itself. Players often use the scale note above and the half step below, or half steps on both sides. It is a signature sound of bebop. Example over a C major chord: F, then D-sharp, then E. Classical theory calls a similar diatonic figure a double neighbor.
- **in_infinite_flow:** Narrower than general jazz usage, and in two figures, each with a figure level any preset can turn on (spec decision D233). The **chromatic enclosure** uses the half step above and the half step below the target chord tone, in either order, then the target; at least one of the two surrounding notes is outside the collection, and all three notes follow each other directly under one chord. It is Rarely in Jazz and Speed drill, Very often in Bebop, Off in the other built-in presets. The **diatonic enclosure** uses the scale notes above and below the target, then the target (the double neighbor's shape): Often in Speed drill and Bebop, Off elsewhere. Either needs three back-to-back notes under one chord, so it stays rare in slow rhythms whatever its level.
- **related:** `chromatic-approach`, `approach-note`, `neighbor-tone`, `double-neighbor`, `chromatic`, `chord-tone`, `control-figure-level`
- **sources:** S9, S14, docs/music/jazz-profile.md

### Escape tone

- **id:** `escape-tone`
- **aliases:** échappée, escape note
- **popup:** A note that steps away from a chord note, then jumps back the other way instead of stepping on.
- **definition:** An escape tone is a short note outside the chord. The melody reaches it by one step from a chord note, then leaves it with a jump in the opposite direction onto another chord note. Over a C chord, E stepping up to F, then jumping down to C, makes F an escape tone. It usually sits on a weak part of the beat, often just before a cadence.
- **in_infinite_flow:** Not written today: the generator makes every outside note leave by step. Not among v3.1's figure levels either, since it would change that rule (spec decision D233); later.
- **related:** `non-chord-tone`, `neighbor-tone`, `appoggiatura`, `step`, `leap`
- **sources:** S19, S25

### Fortspinnung

- **id:** `fortspinnung`
- **aliases:** spinning out
- **popup:** German for "spinning out": a Baroque way of growing a melody from one short idea by sequences and variation.
- **definition:** Fortspinnung is a Baroque way of building a melody. An opening idea is stated, then "spun out": repeated on other notes in a sequence, varied and extended, until the phrase arrives at a cadence. Many Bach and Vivaldi movements follow this opening, spinning-out and cadence shape instead of the balanced four-bar question and answer of the later Classical style.
- **in_infinite_flow:** Not built; style atlas research: the Baroque entry asks for a stored motif spun out by sequence (docs/music/styles/art-music.md).
- **related:** `motif`, `sequence`, `motivic-development`, `cadence`, `sentence`
- **sources:** S109, S110, docs/music/styles/art-music.md

### Fragmentation

- **id:** `fragmentation`
- **aliases:** fragment, truncation
- **popup:** Using only a piece of a musical idea, often its first few notes, and repeating that piece on its own.
- **definition:** Fragmentation breaks a motif into smaller pieces and develops a piece on its own, usually repeating it in shorter and shorter units. Because the units get shorter, the music seems to speed up and push toward an ending, even at the same tempo. It is a typical move in the second half of a classical phrase, after the opening idea has been stated twice. Truncation, cutting off a motif's end, is the simplest kind.
- **in_infinite_flow:** Not generated yet. The rhythm grammar's recurrence already copies one beat of measure 1 into measure 2, a small step in this direction.
- **related:** `motif`, `motivic-development`, `phrase`, `gesture-and-answer`
- **sources:** S42, S45

### Head

- **id:** `head`
- **aliases:** head in, head out, the tune
- **popup:** In jazz, the tune's main melody, played at the start and again at the end, with solos in between.
- **definition:** In jazz the head is the main theme of a tune: its melody over its chords. A typical performance plays the head once ("head in"), then lets players improvise solos over the same chords, then plays the head again to finish ("head out"). At a jam session, a player patting the top of their head is asking the band to go back to the head.
- **related:** `melody`, `chord-progression`, `riff`, `lick`, `arrangement`
- **sources:** S83, S84

### Leap

- **id:** `leap`
- **aliases:** jump, disjunct motion
- **popup:** When a melody jumps to a note farther away instead of moving to a neighboring note.
- **definition:** A leap is a melodic move bigger than a step. Many theory books count anything from a third up as a leap; others call a third a skip and keep "leap" for a fourth or more. Leaps add energy and surprise. A common guideline is that after a big leap the melody turns back the other way, often by step, which balances the jump. Melodies built mostly from leaps are called disjunct.
- **in_infinite_flow:** The app uses its own half-step classes: a leap is 5-6 half steps (a fourth or a tritone) and a large leap 7-12 (a fifth up to an octave). A large leap must be balanced by a small move back in the opposite direction (see Recovery).
- **related:** `step`, `skip`, `interval`, `recovery`, `control-leapiness`
- **sources:** S7, S14, S15

### Leitmotif

- **id:** `leitmotif`
- **aliases:** signature motif
- **popup:** A short tune tied to a character, place or idea, so that hearing it brings them to mind.
- **definition:** A leitmotif is a motif linked to something outside the music: a person, a place, an object or a feeling. Each time it returns, sometimes changed in key, rhythm or speed, the listener is reminded of what it stands for. Opera and film scores use leitmotifs heavily, and so do many video game soundtracks, where a hero or a villain has their own short tune.
- **in_infinite_flow:** The endgame vision gives each character "a signature motif or gimmick": a leitmotif in musical terms. Nothing in the app uses it yet.
- **related:** `motif`, `melody`, `phrase`, `theme`, `musical-identity`
- **sources:** S82, S155, S157, S206, specs/vision/endgame.md

### Lick

- **id:** `lick`
- **aliases:** none
- **popup:** A short ready-made phrase a player has learned and drops into solos, like a favourite expression.
- **definition:** A lick is a short melodic phrase that a player keeps in their vocabulary and reuses when improvising, often adapted to the chords of the moment. Players learn licks by copying other musicians, then mix and vary them. Unlike a riff, a lick is not usually repeated over and over to hold a song together; it is a phrase used once here and there.
- **related:** `riff`, `motif`, `phrase`, `melody`
- **sources:** S83

### Melisma

- **id:** `melisma`
- **aliases:** melismatic
- **popup:** Many notes sung on one syllable of text, as in the long flowing phrases of plainchant or gospel runs.
- **definition:** A melisma is a group of several notes sung on a single syllable. Gregorian chant has plain (syllabic) chants with one note per syllable and ornate (melismatic) chants with long melismas, especially on words such as "Alleluia". Gospel, soul and pop singers also decorate a syllable with a quick run of notes.
- **in_infinite_flow:** Not built; style atlas research: the app has no text, but a melismatic style would favour long stepwise runs (docs/music/styles/art-music.md).
- **related:** `scale-run`, `ornament`, `gregorian-chant`, `phrase`
- **sources:** S267, docs/music/styles/art-music.md

### Melodic inversion

- **id:** `melodic-inversion`
- **aliases:** inversion, mirror
- **popup:** A melody turned upside down: every move up becomes the same move down, and every move down becomes a move up.
- **definition:** Melodic inversion flips a melody's direction while keeping the size of each move: up a step becomes down a step, down a third becomes up a third. An exact (real) inversion keeps every interval's exact size; a tonal inversion stays in the key and lets sizes adjust. Do not confuse it with a chord inversion, which is about which note of a chord is lowest, or with an interval inversion, which turns a third into a sixth.
- **in_infinite_flow:** Not generated yet. It keeps a melody's leap sizes but flips its contour, so a Rising melody would become Falling.
- **related:** `contour`, `interval`, `retrograde`, `retrograde-inversion`, `motivic-development`
- **sources:** S41, S48, S53

### Melody

- **id:** `melody`
- **aliases:** tune, melodic line
- **popup:** A series of single notes heard one after another as a tune: the part you would hum or sing.
- **definition:** A melody is a sequence of single pitches heard as one musical line, the part you would sing or hum back. It combines pitch, with its ups and downs, and rhythm, its timing. Melodies usually move mostly by small steps with some leaps, lean on chord tones, and group into phrases that end in cadences.
- **in_infinite_flow:** The app generates one melody line, a single note at a time. The harmony underneath is shown only as chord symbols.
- **related:** `phrase`, `contour`, `rhythm`, `harmony`
- **sources:** S14, S15

### Motif

- **id:** `motif`
- **aliases:** motive, musical idea
- **popup:** A short musical idea, a few notes long, that you can recognize when it comes back, even changed.
- **definition:** A motif is the smallest piece of music that sounds like an idea of its own: a handful of notes with a recognizable rhythm and shape. Composers and improvisers build longer music by bringing a motif back, sometimes as it was, often changed: higher or lower, faster or slower, decorated, upside down or cut short. The opening four notes of Beethoven's Fifth Symphony are a famous motif. Both spellings, motif and motive, are correct.
- **in_infinite_flow:** In Jam, planned for v3.2 (not built), the player plays a motif for the app to continue; the app calls it a doodle (see Doodle). A played signal would also be a motif, one used to steer the app instead of as music. The app's own word "figure" means something else: one kind of embellishment (see Figure level).
- **related:** `motivic-development`, `phrase`, `rhythm`, `contour`, `interval`, `riff`, `leitmotif`, `played-signal`, `doodle`
- **sources:** S40, S82, S14, specs/versions/v3/jam.md

### Motivic development

- **id:** `motivic-development`
- **aliases:** developing a motif, motive development, melodic alteration
- **popup:** Growing a short idea into longer music by repeating it with changes: moving it, flipping it, stretching it or decorating it.
- **definition:** Motivic development is the craft of making music from a small idea by changing some of its features while keeping others, so each new version sounds both fresh and related. The usual tools are repetition, sequence (the idea moved higher or lower), inversion (upside down), changes of rhythm, augmentation and diminution (slower or faster), fragmentation (using only a piece of it) and ornamentation (added decorating notes). Change too much and the link to the original is lost.
- **in_infinite_flow:** Jam, planned for v3.2 (not built), develops the player's doodle only loosely: its phrases match the doodle's shape (a rhythm close to it, the same ups and downs), never quoting its notes, and Drift sets how close they stay (spec decision D234). Developing it by named tools, such as a sequence or an inversion, is later work. The mutation catalogue (docs/music/mutation-catalogue.md) lists the tools and how far each one drifts from the original.
- **related:** `motif`, `sequence`, `melodic-inversion`, `fragmentation`, `augmentation`, `doodle`, `control-drift`
- **sources:** S41, S49, docs/music/mutation-catalogue.md, specs/versions/v3/jam.md

### Neighbor tone

- **id:** `neighbor-tone`
- **aliases:** neighbor note, auxiliary note, neighbour tone
- **popup:** A decorating note one step above or below a main note, which then steps straight back to the main note.
- **definition:** A neighbor tone decorates a stable note by stepping away from it, up or down, and then stepping straight back. The pattern is main note, neighbor, main note, as in E-F-E over a C major chord. An upper neighbor sits above the main note, a lower neighbor below. Like a passing tone, it usually falls on a weaker beat and adds only gentle tension.
- **in_infinite_flow:** A collection note outside the current chord, one collection step away from a chord tone, that steps straight back to that same chord tone. It is allowed anywhere except the phrase's first and last note, and it can also be the one figure the Tension control schedules. Its figure level, one for upper and lower neighbors together (spec decision D233), sets how often it is aimed for. At Rarely, as in Neutral and Jazz, the generator's search tries chord tones first, so a neighbor tone appears only when chord tones lead to a dead end: it is the app's most common outside note, yet most phrases have none (about 1 in 7 at Neutral's defaults) unless the Edge tension setting requires a figure. Often, as in Speed drill, Reel and Modal (Dorian), makes it heard more. The tense scale tone a session phrase generated from the phrase before it may end on, resolved by the next phrase's first note, is a separate case, not a neighbor tone on the last note.
- **related:** `passing-tone`, `non-chord-tone`, `chord-tone`, `step`, `enclosure`
- **sources:** S4, S14, S18, src/domain/generation/carry-in/phrase-ending-debt.ts, docs/music/embellishment-catalogue.md

### Non-chord tone

- **id:** `non-chord-tone`
- **aliases:** nonharmonic tone, embellishing tone, NCT
- **popup:** A melody note that is not part of the chord sounding at that moment. It adds color or tension and usually moves on to a chord note.
- **definition:** A non-chord tone is a melody note that does not belong to the chord sounding at that moment. It makes a small clash, from barely noticeable to strongly tense, which usually eases when the melody moves to a chord tone. Theory names the types by how the note is approached and left: passing tones, neighbor tones, appoggiaturas and others.
- **in_infinite_flow:** A pitch from the selected scale (collection) that is not part of the active chord; Jazz also adds brief out-of-collection chromatic notes. Its approach, metric position, duration and resolution determine whether it feels stable or tense. The one figure scheduled by the Tension control must resolve before the phrase's final note, but plain passing and neighbor tones, and Jazz chromatic notes, may resolve onto the final note itself. That final note is a chord tone, except in a session phrase generated from the phrase before it: such a phrase may end on a scale tone outside its last chord, reached by step, and the next phrase's first note resolves it.
- **related:** `chord-tone`, `passing-tone`, `neighbor-tone`, `appoggiatura`, `chromatic-approach`, `tension-and-resolution`
- **sources:** S4, S14, src/domain/generation/carry-in/phrase-ending-debt.ts

### Octave displacement

- **id:** `octave-displacement`
- **aliases:** pivoting
- **popup:** Moving one note of a line up or down an octave and carrying on from there, to turn a smooth line into a jumpy one.
- **definition:** Octave displacement keeps a line's note names but moves one of them into another octave, and the line continues in the new octave. A falling G, F, E, D, C can become G, F, E, then a high D and C. The notes are the same; the contour gets a sudden jump. Jazz players often place the moved note on an offbeat and jump against the line's direction.
- **in_infinite_flow:** Not used as a figure. Its jump counts as a large leap: allowed only under Leaping or Angular, followed by a recovery, and inside the one-octave register window.
- **related:** `octave`, `leap`, `contour`, `recovery`, `register-window`, `control-leapiness`
- **sources:** S27, docs/music/melodic-control-models.md

### Passing tone

- **id:** `passing-tone`
- **aliases:** passing note
- **popup:** A note that fills the gap between two chord notes by step, like D between C and E.
- **definition:** A passing tone is a note outside the chord that links two other notes by step while moving in one direction: a stepwise note between two pitches, going the same way on both sides. Over a C major chord, the line C-D-E uses D as a passing tone. It usually falls on a weaker beat and sounds natural and unforced.
- **in_infinite_flow:** A collection note outside the current chord that moves by step and resolves by one collection step into a chord tone. Its figure level sets how often it is aimed for (spec decision D233). At Rarely, as in Neutral and Jazz, the generator's search tries chord tones first, so it rarely appears: in about 1 phrase in 100 at Neutral's defaults, a few more at high Leapiness, or as the Tension figure that the Edge setting requires. Often, as in Speed drill, Reel and Modal (Dorian), makes it heard more.
- **related:** `neighbor-tone`, `non-chord-tone`, `chord-tone`, `step`, `accented-passing-tone`, `chromatic-passing-tone`
- **sources:** S5, S4, S14, docs/music/embellishment-catalogue.md

### Period

- **id:** `period`
- **aliases:** musical period, antecedent and consequent
- **popup:** Two phrases that answer each other: the first ends open, the second, starting the same way, ends closed.
- **definition:** A period is a pair of phrases that work as question and answer. The first (antecedent) ends on an open, unfinished-sounding cadence, often on the dominant; the second (consequent) starts with the same idea and ends with a closed cadence on the tonic. Classical-era melodies, such as many Mozart themes, are often built this way, usually as two four-bar phrases.
- **in_infinite_flow:** Not built; style atlas research: every phrase the app writes ends open (spec decision D28), so a closed answer would need a style-scoped exception; the Classical entry asks for it (docs/music/styles/art-music.md).
- **related:** `phrase`, `cadence`, `open-ending`, `sentence`, `gesture-and-answer`
- **sources:** S45, docs/music/styles/art-music.md

### Reciting tone

- **id:** `reciting-tone`
- **aliases:** tenor, recitation tone
- **popup:** In plainchant, the one note that most of the words are sung on, with short formulas leading to and away from it.
- **definition:** A reciting tone is the pitch on which a chant sings most of its text, repeating it for many syllables. Short melodic formulas lead up to it at the start and away from it at the end of each verse. In the church modes the reciting tone usually lies a fifth above the final note, or a sixth in some modes. In that sense it is also called the tenor or the dominant of the mode, an older meaning of "dominant" than the chord on the fifth degree.
- **in_infinite_flow:** Not built; style atlas research: a chant style would favour one repeated pitch above the final (docs/music/styles/art-music.md).
- **related:** `final`, `mode`, `gregorian-chant`, `pedal-point`
- **sources:** S269, S268, docs/music/styles/art-music.md

### Register

- **id:** `register`
- **aliases:** none
- **popup:** The part of an instrument's range a passage uses: low, middle or high. The same tune sounds darker low and brighter high.
- **definition:** Register means a zone of pitch, such as the low, middle or high part of an instrument or voice. The same melody moved to another register keeps its shape but changes color: darker and fuller low, brighter or more strained high. On wind instruments each register also feels different to play. Register is the zone in use; range is the full span an instrument can reach.
- **in_infinite_flow:** Register is also an app control that picks a one-octave window of the instrument's range for the whole phrase. See the Register entry under App controls.
- **related:** `control-register`, `instrument-range`, `octave`, `register-window`, `register-spike`
- **sources:** S15, S14

### Retardation

- **id:** `retardation`
- **aliases:** upward suspension
- **popup:** A note held over from the previous chord that clashes with the new chord, then rises one step to fit.
- **definition:** A retardation works like a suspension but resolves upward. A note that fits the old chord is held while the chord changes; it clashes with the new chord on the strong beat, then moves up one step. Moving from a G chord to a C chord, B held over into the C bar and then rising to C is a retardation.
- **in_infinite_flow:** Not written today: a tie may cross a chord change only on a note both chords share. Not among v3.1's figure levels, since it looks across a chord change (spec decision D233); later.
- **related:** `suspension`, `tie`, `non-chord-tone`, `tension-and-resolution`
- **sources:** S23, S25

### Retrograde

- **id:** `retrograde`
- **aliases:** backwards, cancrizans, crab
- **popup:** A melody played backwards, from its last note to its first.
- **definition:** A retrograde plays the notes of a melody in reverse order. Composers sometimes reverse the rhythm along with the pitches, sometimes only the pitches. It is common in twelve-tone music and in puzzle canons, and rare in ordinary tonal melodies, partly because listeners find a backwards melody hard to recognize: the ear follows a melody forwards.
- **in_infinite_flow:** Not generated, and not proposed for Jam's first list of changes: it is one of the hardest to hear.
- **related:** `melodic-inversion`, `retrograde-inversion`, `motif`
- **sources:** S41, S48, S53

### Retrograde inversion

- **id:** `retrograde-inversion`
- **aliases:** RI
- **popup:** A melody turned upside down and played backwards at the same time.
- **definition:** A retrograde inversion combines the two mirror operations: the melody is flipped upside down and its notes are played in reverse order. It is one of the four basic forms of a twelve-tone row, together with the original, the inversion and the retrograde. Of the three changed forms it is the hardest for listeners to recognize as related to the original.
- **in_infinite_flow:** Not generated, and not proposed for Jam.
- **related:** `melodic-inversion`, `retrograde`
- **sources:** S48, S53

### Riff

- **id:** `riff`
- **aliases:** ostinato
- **popup:** A short catchy phrase repeated again and again, often the backbone of a song.
- **definition:** A riff is a short melodic or rhythmic phrase that repeats many times in a row, so that it becomes the thing a listener remembers. Rock, blues, funk, jazz and Latin music all use riffs; swing-era big bands passed riffs back and forth between sections like a call and response. Classical music calls a figure repeated this way an ostinato.
- **related:** `lick`, `motif`, `call-and-response`, `phrase`
- **sources:** S83, S136

### Scale run

- **id:** `scale-run`
- **aliases:** scalar run
- **popup:** A quick string of notes going straight up or down a scale.
- **definition:** A scale run moves through several scale notes in a row by step, in one direction, usually in short notes. Many of its notes are outside the chord; they pass by so quickly that the ear hears the whole run as a sweep toward its last note. Players often use runs to fill a gap between two phrases. Over a C chord, C, D, E, F, G, A, B, C is a scale run.
- **in_infinite_flow:** Partly possible: the generator can alternate chord and outside notes by step, but not place two outside notes in a row. Different from the internal term run, which means a three-note arpeggio.
- **related:** `scale`, `step`, `passing-tone`, `run`, `sixteenth-note`, `fill`
- **sources:** S25, src/domain/pitch/pitch-figures.ts

### Sentence

- **id:** `sentence`
- **aliases:** musical sentence
- **popup:** A phrase made of a short idea, its repetition, then a faster, more continuous run to the cadence.
- **definition:** A sentence is a common phrase plan of the Classical era. It opens with a short idea (often two bars), repeats or varies it, then continues with faster, fragmented and more continuous music that drives to a cadence. In an eight-bar sentence the proportions are often 2+2+4. Unlike a period, it is one phrase rather than a question and answer.
- **in_infinite_flow:** Not built; style atlas research: the Classical entry proposes the sentence as planned material within a phrase (docs/music/styles/art-music.md).
- **related:** `phrase`, `period`, `motif`, `fragmentation`, `cadence`
- **sources:** S43, S45, docs/music/styles/art-music.md

### Sequence

- **id:** `sequence`
- **aliases:** melodic sequence, diatonic sequence, tonal sequence, real sequence
- **popup:** The same short pattern played again, starting higher or lower, usually two or three times in a row.
- **definition:** A sequence repeats a melodic pattern at a different pitch, step after step in the same direction, like walking up a staircase with the same stride. In a diatonic (or tonal) sequence the copy stays in the key, so a whole step may become a half step. In a real sequence every interval is copied exactly, which brings in notes from outside the key. Sequences rarely go beyond three or four statements before the music moves on.
- **in_infinite_flow:** Not generated. The mutation research proposed it for Jam as a diatonic sequence, but Jam in v3.2 (planned, not built) matches the doodle's shape without developing it by named tools; a sequence is later work (spec decision D234).
- **related:** `motif`, `motivic-development`, `transposition`, `diatonic`, `chromatic`
- **sources:** S50, S43, S45

### Skip

- **id:** `skip`
- **aliases:** none
- **popup:** A small jump in a melody, usually a third: skipping over one note name, like C to E.
- **definition:** A skip is a melodic move of a third, jumping over one letter name, as from C to E or from G down to E. It sits between a step and a bigger leap. Books differ here: some call a third a skip, others count it as the smallest leap. Triad arpeggios are built from thirds, which is why skips often sound like they outline a chord.
- **in_infinite_flow:** The app counts a move of 3 or 4 half steps (a minor or major third) as a skip. Under Smooth leapiness, skips are the largest moves allowed.
- **related:** `step`, `leap`, `interval`, `arpeggio`, `control-leapiness`
- **sources:** S14, S7

### Step

- **id:** `step`
- **aliases:** stepwise motion, conjunct motion
- **popup:** Moving from one note to the very next note name, up or down, like C to D or E to F.
- **definition:** A step is a melodic move to the next letter name up or down: a second, which is either a half step or a whole step. C to D and E to F are both steps. Melodies that move mostly by step are called conjunct; they are easy to sing and sound smooth. Most decorating notes resolve by step.
- **in_infinite_flow:** The app counts a move of 1 or 2 half steps as a step. Its diatonic figures resolve by one step within the chosen collection.
- **related:** `half-step`, `whole-step`, `skip`, `leap`, `passing-tone`
- **sources:** S14, S15, S7

### Strain

- **id:** `strain`
- **aliases:** none
- **popup:** One section of a march or a ragtime piece, usually sixteen bars, often repeated before the next one starts.
- **definition:** A strain is one self-contained section of a march or a rag, usually sixteen bars long and played twice. A typical rag strings several strains together, such as AABBACCDD, and the later ones (the trio) often move to the key a fourth higher (the subdominant). Marches use the same plan, sometimes with a loud, contrasting "dogfight" strain.
- **in_infinite_flow:** Not built; style atlas research: the app writes four-bar phrases, so strains belong to the research's open question on longer forms (docs/music/styles/art-music.md, docs/music/styles/jazz-blues-soul.md).
- **related:** `march`, `phrase`, `aaba-form`
- **sources:** S319, S299, docs/music/styles/art-music.md, docs/music/styles/jazz-blues-soul.md

### Suspension

- **id:** `suspension`
- **aliases:** none
- **popup:** A note held over from the previous chord that clashes with the new chord, then falls one step to fit.
- **definition:** A suspension keeps a note of one chord sounding while the harmony moves to the next. On the new chord's strong beat the held note clashes, then it drops one step to a note that fits. Theory names the three stages preparation, suspension and resolution. Moving from an F chord to a C chord, F held over the bar line and then falling to E is a suspension.
- **in_infinite_flow:** Not written today: a tie may cross a chord change only on a note both chords share. Not among v3.1's figure levels, since it looks across a chord change (spec decision D233); later.
- **related:** `retardation`, `tie`, `non-chord-tone`, `tension-and-resolution`, `strong-and-weak-beats`
- **sources:** S22, S25

### Theme

- **id:** `theme`
- **aliases:** main theme, character theme, theme transformation
- **popup:** The main tune a piece is built on and keeps coming back to; a character theme is one tied to a character.
- **definition:** A theme is a melody that a piece, or a whole film or game score, treats as its main material: it is stated clearly, then returns, often changed. A theme is usually longer than a motif and may be built from one or two motifs. When a theme comes back with a new harmony, instrument, tempo or mood but keeps its shape and rhythm, musicians speak of theme transformation: a hero's theme in a sad minor version, or a village tune re-orchestrated for night.
- **in_infinite_flow:** Endgame groundwork, not built. The musical-identity research proposes that a character keep a "core" (its theme's contour and rhythm, its timbre) while the situation changes the "surface" (harmony, mode, tempo, accompaniment) (docs/music/musical-identity.md). The app cannot store or place a theme today.
- **related:** `leitmotif`, `motif`, `melody`, `motivic-development`, `musical-identity`
- **sources:** S206, S155, S212, S214, docs/music/musical-identity.md

### Transposition

- **id:** `transposition`
- **aliases:** transposing, shifting
- **popup:** Moving music higher or lower while keeping its shape, so it sounds the same, only starting on another note.
- **definition:** To transpose music is to move every note up or down by the same interval. The melody keeps its exact shape and sounds the same apart from its height, which is why a song can be sung in a key that suits the singer. Moving a melody within its key instead, so that some intervals change size to fit the scale, is a diatonic shift rather than an exact transposition.
- **in_infinite_flow:** The app transposes only to draw the score for saxophones, in written pitch. A real sequence would transpose a motif inside a phrase; not generated yet.
- **related:** `transposing-instrument`, `written-pitch`, `sequence`, `interval`
- **sources:** S16, S50, S14

## Harmony

### Aeolian cadence

- **id:** `aeolian-cadence`
- **aliases:** Mario cadence, ♭VI–♭VII–I
- **popup:** The chord ending ♭VI–♭VII–I (or i), rising by whole steps to the home chord; the triumphant close of many game themes.
- **definition:** The Aeolian cadence moves from the chord on the lowered sixth degree to the chord on the lowered seventh and then to the tonic: in C, A-flat major, B-flat major, C. Both approach chords come from the minor (Aeolian) mode, so the ending sounds bold and modal rather than classical. Rock uses it, and when it ends on a major tonic it is nicknamed the "Mario cadence", after its use in Super Mario level-clear and victory music.
- **in_infinite_flow:** Not built; style atlas research: the victory-fanfare and overworld entries ask for it as a stored cadence formula (docs/music/styles/popular-electronic-game.md).
- **related:** `cadence`, `aeolian`, `modal-mixture`, `subtonic`, `fanfare`
- **sources:** S338, S370, docs/music/styles/popular-electronic-game.md

### Altered chord

- **id:** `altered-chord`
- **aliases:** altered dominant, altered extension, alt chord
- **popup:** A jazz chord, usually a dominant seventh, with its fifth or ninth pushed up or down a half step for extra bite, as in G7♭9.
- **definition:** An altered chord changes one or more of a chord's notes by a half step away from where the scale puts them. Most often it is a dominant seventh whose fifth or ninth is raised or lowered: G7♭9, G7♯9, G7♯5, G7♯11. The altered notes come from outside the key, so they add tension and colour just before the chord resolves. "G7alt" asks the player to alter freely. Altered dominants are a staple of bebop and later jazz.
- **in_infinite_flow:** Not used. Every chord is built from the selected collection, and v3.3's research proposes keeping it that way (docs/music/chord-research.md); altered dominants were deferred in v1 (D12).
- **related:** `dominant-seventh-chord`, `chord-extension`, `extended-chord`, `chromatic`, `chord-symbol`
- **sources:** S417, S428, S103

### Andalusian cadence

- **id:** `andalusian-cadence`
- **aliases:** i–♭VII–♭VI–V
- **popup:** A falling chord sequence of four chords, such as Am–G–F–E, typical of flamenco.
- **definition:** The Andalusian cadence is a sequence of four chords stepping down: in A minor, A minor, G major, F major, E major (i–♭VII–♭VI–V). The bass falls by step and the last chord is major, which gives a strong pull back to A. Flamenco hears that final E major chord as its home, in a Phrygian-based mode; in other music it sounds like an open ending on the dominant.
- **in_infinite_flow:** Not built; style atlas research: the flamenco entry asks for it as a stored progression (docs/music/styles/folk-and-world.md).
- **related:** `chord-progression`, `cadence`, `phrygian`, `phrygian-dominant-scale`
- **sources:** S382, S381, docs/music/styles/folk-and-world.md

### Avoid note

- **id:** `avoid-note`
- **aliases:** avoid tone, unavailable tension
- **popup:** A scale note that clashes when held against a chord, usually because it sits a half step above one of the chord's notes, like F over C major.
- **definition:** In jazz teaching, an avoid note is a note of a chord's scale that sounds harsh when sustained against that chord. The usual test: a note a half step above a chord note clashes (it forms a minor ninth), while a note a whole step above fits. Over a C major chord, F is the classic avoid note, a half step above E. The note is not forbidden: played briefly in passing, it is fine. Writers disagree on some cases, such as the sixth over a Dorian minor chord.
- **in_infinite_flow:** Not used today, because the app's chords are triads. The v3.3 research marks the avoid notes of each diatonic seventh chord (docs/music/chord-research.md).
- **related:** `chord-extension`, `chord-scale`, `non-chord-tone`, `half-step`, `interval`
- **sources:** S442, S445, S439

### Cadence

- **id:** `cadence`
- **aliases:** phrase ending, endpoint
- **popup:** The way a phrase ends. Some endings sound finished, like a period; others sound open, like a comma.
- **definition:** A cadence is the ending gesture of a phrase, the point where the music pauses or comes to rest. In major and minor keys, arriving on the tonic chord, usually right after the dominant (V to I), sounds closed and final, like a period. Arriving on the dominant chord sounds open, like a comma or a question; this is called a half cadence. Melody and rhythm take part too: a long note on the home pitch sounds most complete.
- **in_infinite_flow:** The app always writes an open ending, as a product rule meant to invite continuation. Major and Minor phrases with Gentle or Active motion end on the degree-5 chord, with a note of that chord as the last note. Static Major/Minor phrases stay on the home chord and end on degree 5. Modal phrases end over the home chord on one of its other notes (its 3rd or 5th), never on the home note. In a session, a phrase generated from the phrase before it may instead end on a scale tone outside its last chord, reached by step, which the next phrase's first note resolves. See Open ending.
- **related:** `phrase`, `tonic`, `dominant`, `harmonic-function`, `open-ending`
- **sources:** S3, S1, S14, S15, src/domain/generation/carry-in/phrase-ending-debt.ts

### Chord

- **id:** `chord`
- **aliases:** none
- **popup:** Three or more different notes sounding together, like C, E and G played at once.
- **definition:** A chord is a group of different pitches heard together as one unit of harmony, usually at least three. Most chords in Western music are built by stacking thirds: C-E-G is a C major chord. A chord can also be heard when its notes are spread out one after another, as an arpeggio. The series of chords in a piece is its chord progression.
- **in_infinite_flow:** The app uses only triads built from the chosen collection, always in root position: no seventh chords and no inversions. Chords appear as chord symbols, not written out as notes.
- **related:** `triad`, `seventh-chord`, `chord-symbol`, `chord-progression`, `arpeggio`, `harmony`
- **sources:** S14, S15

### Chord extension

- **id:** `chord-extension`
- **aliases:** extension, tension, upper extension, available tension
- **popup:** An extra note stacked above a chord's seventh, such as the 9th, 11th or 13th, that adds colour.
- **definition:** A chord extension is a note added above the seventh when thirds keep being stacked: the ninth, the eleventh and the thirteenth. Over C7 (C–E–G–B♭) the ninth is D, the eleventh F and the thirteenth A, each named by its distance above the root. Extensions are major or perfect unless the symbol says otherwise (C7♭9), and a symbol with an extension implies the notes below it. Jazz players also call them tensions, and sort them into available ones and avoid notes.
- **in_infinite_flow:** Not used: the app's chords are triads, and v3.3 (planned, not built; D261) starts with seventh chords. The notes that would be extensions are today ordinary scale notes outside the chord.
- **related:** `extended-chord`, `seventh-chord`, `avoid-note`, `chord-symbol`, `altered-chord`
- **sources:** S417, S425, S437

### Chord inversion

- **id:** `chord-inversion`
- **aliases:** inverted chord, first inversion, second inversion, root position
- **popup:** A chord with a note other than its root in the bass, such as C major with E at the bottom.
- **definition:** A chord is in root position when its root is the lowest note: C–E–G for C major. When another chord note is the lowest, the chord is inverted. With the third at the bottom (E–G–C) it is in first inversion; with the fifth at the bottom (G–C–E), second inversion. An inverted chord keeps its name and function but sounds lighter or less settled, and inversions let a bass line move by step.
- **in_infinite_flow:** Not built: every chord is in root position, and the backing's bass plays the root. The backing's block chords already use inversions above that bass, to keep their top note at or below E4. A seventh chord has a third inversion too, with the seventh in the bass. Style atlas research: several style entries (Baroque, Classical, chorale) ask for inversions in the bass (docs/music/styles/art-music.md).
- **related:** `chord`, `root`, `voicing`, `triad`, `basso-continuo`
- **sources:** S14, S276, S416, src/domain/backing/backing-renderer.ts, docs/music/styles/art-music.md

### Chord progression

- **id:** `chord-progression`
- **aliases:** progression, harmonic progression
- **popup:** The order in which chords follow one another, such as C, then F, then G, then C.
- **definition:** A chord progression is a series of chords in order. Some are so common they have nicknames, like the jazz "two-five-one" (ii-V-I) or the pop I-V-vi-IV. Progressions give a piece its sense of travel: moving away from the home chord builds expectation, and coming back brings rest.
- **in_infinite_flow:** The Harmonic motion control decides how many chords the four-measure progression uses and how often they change.
- **related:** `chord`, `harmonic-function`, `harmonic-rhythm`, `roman-numeral`, `control-harmonic-motion`
- **sources:** S10, S14, S15

### Chord quality

- **id:** `chord-quality`
- **aliases:** quality, major chord, minor chord, diminished chord
- **popup:** The flavor of a chord: major (bright), minor (darker) or diminished (tense), set by the distances between its notes. Augmented also exists but never occurs in the app's scales and modes.
- **definition:** Chord quality describes the exact sizes of the intervals inside a chord. A major triad has a major third and a perfect fifth over its root (C-E-G) and sounds bright. A minor triad has a minor third and a perfect fifth (A-C-E) and sounds darker. A diminished triad has a minor third and a diminished fifth (B-D-F) and sounds tense. The augmented triad (two major thirds) never occurs within the seven modes.
- **in_infinite_flow:** Every chord is built only from the collection's own notes, so its quality comes from the collection. Chord symbols show it: "C" is major, "Dm" minor, "Bdim" diminished.
- **related:** `triad`, `chord`, `chord-symbol`, `interval`
- **sources:** S14

### Chord scale

- **id:** `chord-scale`
- **aliases:** chord-scale theory, chord-scale system
- **popup:** The scale a jazz player uses over one chord, such as Dorian over a minor seventh chord.
- **definition:** Chord-scale theory pairs each chord with a scale whose notes fit it: Mixolydian over a dominant seventh, Dorian over a minor seventh, Ionian or Lydian over a major seventh. The scale holds the chord's notes plus the notes in between, which serve as extensions or passing notes. It is a jazz-teaching approach to improvising, not a rule of all music, and teachers disagree on some pairings.
- **in_infinite_flow:** Every chord's scale is simply the selected collection, started on the chord's root, because the app's chords never leave the collection.
- **related:** `scale`, `mode`, `chord-extension`, `avoid-note`, `dorian`, `mixolydian`
- **sources:** S419, S428, S440

### Chord symbol

- **id:** `chord-symbol`
- **aliases:** lead-sheet symbol, chord name
- **popup:** A short name for a chord, like C, Dm or G7. The letter is the chord's main note; the rest tells its flavor.
- **definition:** A chord symbol is shorthand for a chord, written above the staff in lead sheets and in jazz and pop charts. It starts with the root's letter name, then adds signs for the quality and any extra notes: "C" is C major, "Dm" D minor, "Bdim" B diminished, "G7" a G dominant seventh. Players read them to know the harmony without every note being written out.
- **in_infinite_flow:** The app shows one chord symbol at each chord change, transposed into your instrument's written pitch like the notes. Only triad symbols appear: major (C), minor (Dm) and diminished (Bdim).
- **related:** `chord`, `chord-quality`, `root`, `written-pitch`, `triad`, `lead-sheet`
- **sources:** S14, ui_ux/screens/phrase-workspace/handoff.md

### Chromatic

- **id:** `chromatic`
- **aliases:** none
- **popup:** Using notes from outside the current key or scale, or moving by half steps.
- **definition:** Chromatic describes notes, chords or motion that go outside the current key or scale. The chromatic scale uses all twelve notes, each a half step apart. In a C major piece, an F-sharp or a B-flat is a chromatic note. The opposite is diatonic. Chromatic notes add color and bite, and are especially common as quick decorations in jazz.
- **in_infinite_flow:** Phrases use chromatic notes only through the two chromatic melodic figures, the chromatic approach and the chromatic enclosure, whose figure levels any preset can turn on (spec decision D233). Both are Off in Neutral, so Neutral phrases use no chromatic notes; Jazz, Speed drill and Bebop turn them on. "Neutral is diatonic" is a property of Neutral's levels, not a rule. Chords stay diatonic in every preset.
- **related:** `diatonic`, `half-step`, `chromatic-approach`, `enclosure`, `accidental`, `control-figure-level`
- **sources:** S14, S15, S4

### Chromatic mediant

- **id:** `chromatic-mediant`
- **aliases:** third relation, chromatic third relation
- **popup:** A chord a third away from another, borrowed from outside the key, giving a sudden, colourful shift.
- **definition:** A mediant relation is a move between two chords whose roots are a third apart, such as C major to E major or C major to A-flat major. When one of the chords lies outside the key, the move is a chromatic mediant: it shares only one note (or none) with the first chord and sounds like a sudden change of light. Rare in Baroque and Classical music, it is common in Romantic music and in film scores.
- **in_infinite_flow:** Not built; style atlas research: the Romantic and epic-film entries ask for it as a chord choice beyond the key (docs/music/styles/art-music.md).
- **related:** `chord`, `chromatic`, `modal-mixture`, `chord-progression`
- **sources:** S283, S282, docs/music/styles/art-music.md

### Diatonic

- **id:** `diatonic`
- **aliases:** in the key
- **popup:** Using only the notes of the current key or scale, with no outside notes.
- **definition:** Diatonic means belonging to the current key or scale. A diatonic scale has seven notes, five whole steps and two half steps, with the two half steps spaced as far apart as possible; the major scale, the natural minor scale and the seven modes are all diatonic. A diatonic chord uses only notes of the key: in C major these are C, Dm, Em, F, G, Am and Bdim.
- **in_infinite_flow:** All the app's chords are diatonic triads of the chosen collection. A melody is entirely diatonic while both chromatic figures are Off, as in Neutral; that is only a preset's levels, since a player may turn chromatic figures on from any preset (spec decision D233).
- **related:** `chromatic`, `scale`, `mode`, `triad`, `key`
- **sources:** S14

### Diminished seventh chord

- **id:** `diminished-seventh-chord`
- **aliases:** dim7, fully diminished seventh chord, °7
- **popup:** A tense four-note chord made of three stacked minor thirds, such as B, D, F, A-flat (Bdim7).
- **definition:** A diminished seventh chord stacks three minor thirds: B–D–F–A♭ is Bdim7, also written B°7. All its notes are the same distance apart, so it sounds equally tense from any of them. It is the seventh chord on the leading tone of harmonic minor, and composers borrow it into major keys. It is not found in the major scale or in its modes, where the chord on the seventh degree is half-diminished instead.
- **in_infinite_flow:** Never occurs: none of the app's seven collections contains it. The app's diminished chords are triads ("Bdim").
- **related:** `half-diminished-seventh-chord`, `seventh-chord`, `harmonic-minor`, `chord-quality`
- **sources:** S432, S416

### Dominant

- **id:** `dominant`
- **aliases:** V, dominant function
- **popup:** The chord built on the fifth note of the scale. In major and minor keys it pulls strongly back toward home.
- **definition:** The dominant is the fifth note of a scale and the chord built on it (V). In a major key, V (G-B-D in C major) contains the leading tone, a half step below the home note, so it pulls strongly back to the tonic chord; V to I is the most common way to end. In minor keys composers usually raise the seventh note to get the same pull. The diminished chord on the seventh degree (B-D-F in C major) shares this role, because it also contains the leading tone. In natural minor the chord on the seventh degree is major and does not.
- **in_infinite_flow:** In tonal music the dominant is a chord function that creates directed pull back toward tonic; it is not required in modal music. The app's Major and Minor phrases (Gentle or Active) end on the degree-5 chord as a deliberately open ending. Minor stays natural minor, so that chord is minor (v), with no leading tone and a weaker pull. The modes don't use a dominant at all.
- **related:** `tonic`, `predominant`, `harmonic-function`, `cadence`, `scale-degree`
- **sources:** S2, S3, S14, docs/music/harmony-planner-policy.md

### Dominant seventh chord

- **id:** `dominant-seventh-chord`
- **aliases:** dominant seventh, major-minor seventh chord, 7 chord, V7
- **popup:** A major chord with a lower seventh on top, such as G, B, D, F (G7). It pulls strongly home, and it is the basic chord of the blues.
- **definition:** A dominant seventh chord is a major triad plus a minor seventh: G–B–D–F is G7, written with a bare 7. It sits naturally on the fifth degree of a major key, where its third and seventh, a tritone apart, pull toward the home chord: in classical practice the seventh falls by step and the third rises to the tonic. Blues uses dominant sevenths on I, IV and V, where they need not pull anywhere.
- **in_infinite_flow:** Not used yet. In each of the app's seven modes, exactly one degree carries it: degree 5 in Major, degree 1 in Mixolydian, degree 7 in natural Minor (docs/music/chord-research.md).
- **related:** `dominant`, `seventh-chord`, `twelve-bar-blues`, `mixolydian`, `chord-symbol`
- **sources:** S430, S416, S420

### Double plagal

- **id:** `double-plagal`
- **aliases:** double plagal cadence, ♭VII–IV–I
- **popup:** The rock progression ♭VII–IV–I, two "four to one" steps in a row, as in D–A–E in the key of E.
- **definition:** The double plagal progression goes from the chord on the lowered seventh degree to the chord on the fourth, then to the tonic: in C, B-flat major, F major, C major. Each step moves the same way as the plagal cadence IV–I (down a fourth or up a fifth), so it is "plagal twice". It is a hallmark of classic rock and also appears in gospel.
- **in_infinite_flow:** Not built; style atlas research: the classic-rock entry asks for it as a stored progression (docs/music/styles/popular-electronic-game.md).
- **related:** `plagal-cadence`, `subtonic`, `modal-mixture`, `chord-progression`
- **sources:** S338, S341, S312, docs/music/styles/popular-electronic-game.md

### Extended chord

- **id:** `extended-chord`
- **aliases:** extended harmony, ninth chord, eleventh chord, thirteenth chord
- **popup:** A chord built past the seventh: a ninth, eleventh or thirteenth chord, typical of jazz.
- **definition:** An extended chord keeps stacking thirds beyond the seventh, giving ninth, eleventh and thirteenth chords. C9 is C–E–G–B♭–D. A thirteenth chord contains all seven notes of a scale, so players leave some out, usually the fifth and often the eleventh. Before the 20th century these chords were mostly dominant chords whose top notes acted as clashes that resolved; in jazz they are everyday colours.
- **in_infinite_flow:** Not used. v3.3 (planned, not built; D261) may allow seventh chords first; extended chords would come later, behind their own flag.
- **related:** `chord-extension`, `seventh-chord`, `chord`, `altered-chord`
- **sources:** S437, S417, S425

### Galant schema

- **id:** `galant-schema`
- **aliases:** schema, partimento schema, Prinner
- **popup:** A stock pattern of melody and bass used again and again by 18th-century composers, such as the Prinner.
- **definition:** Galant schemas are short, standard pairings of a melody line and a bass line that 18th-century composers learned as stock patterns and reused in many pieces. The Prinner, for example, has the melody fall 6–5–4–3 (scale degrees) over a bass falling 4–3–2–1, and often answers an opening idea. Recognising schemas helps explain why music of that era sounds so consistent.
- **in_infinite_flow:** Not built; style atlas research: the Classical entry proposes schemas as planned material for melody and backing (docs/music/styles/art-music.md).
- **related:** `chord-progression`, `scale-degree`, `cadence`, `sentence`
- **sources:** S279, docs/music/styles/art-music.md

### Half-diminished seventh chord

- **id:** `half-diminished-seventh-chord`
- **aliases:** half-diminished, minor seventh flat five, m7♭5, ø7
- **popup:** A diminished triad with a minor seventh on top, such as B, D, F, A (Bm7♭5 or Bø7). Dark and unsettled.
- **definition:** A half-diminished seventh chord is a diminished triad plus a minor seventh: B–D–F–A, written Bm7♭5 or Bø7. "Half" sets it apart from the diminished seventh chord, whose seventh is a half step lower. It sits on the seventh degree of a major key and the second degree of a natural minor key, and in jazz it is the usual first chord of a minor ii–V–i.
- **in_infinite_flow:** Not used yet. If seventh chords are allowed, each of the app's seven modes has exactly one, on the degree whose triad is diminished today.
- **related:** `seventh-chord`, `diminished-seventh-chord`, `chord-quality`, `locrian`, `chord-symbol`
- **sources:** S431, S416, S429

### Harmonic function

- **id:** `harmonic-function`
- **aliases:** function, chord function
- **popup:** The job a chord does in a key: feeling at home (tonic), moving away (predominant), or pulling back home (dominant).
- **definition:** Harmonic function is the role a chord plays in a major or minor key, apart from its exact notes. Chords are usually grouped into three roles: tonic (home and rest), predominant (leaving home and heading toward tension) and dominant (tension that wants to go home). A typical phrase runs tonic, predominant, dominant, tonic. Different chords can share a role: ii and IV are both predominant.
- **in_infinite_flow:** The app's Major and Minor plans use these roles: tonic (I; i in Minor), a tonic-extending chord (iii or vi; III or VI in Minor), a predominant (ii or IV; ii° or iv in Minor) and an open degree-5 arrival at the end (V; v in Minor). The seven named modes use a color-chord plan instead of this cycle.
- **related:** `tonic`, `predominant`, `dominant`, `cadence`, `chord-progression`, `characteristic-note`
- **sources:** S2, S14, docs/music/harmony-planner-policy.md

### Harmonic rhythm

- **id:** `harmonic-rhythm`
- **aliases:** rate of chord change
- **popup:** How often the chords change: every measure, twice a measure, or hardly at all.
- **definition:** Harmonic rhythm is the pace at which the chords change, separate from the rhythm of the melody. A busy sixteenth-note melody can sit over one chord per measure, and long melody notes can sit over chords that change every beat. Faster harmonic rhythm tends to sound more driven; slower harmonic rhythm sounds calmer and leaves the melody room.
- **in_infinite_flow:** Set by Harmonic motion: Static keeps one chord for the whole phrase, Gentle diatonic changes chord at most once per measure, and Active diatonic may also split measure 2 or 3 into two chords of two beats each.
- **related:** `chord-progression`, `measure`, `control-harmonic-motion`
- **sources:** S14

### Harmony

- **id:** `harmony`
- **aliases:** none
- **popup:** The chords and combined sounds underneath or around a melody, the part that supports the tune.
- **definition:** Harmony is the sound of different pitches heard together, and the way those combinations follow one another. When a melody is accompanied by chords, the chords are its harmony. Harmony shapes how each melody note feels: the same note can sound calm over one chord and tense over another. Studying harmony means studying chords, their roles and their progressions.
- **in_infinite_flow:** The app plans the harmony first, as a series of chords, then fits the melody to it. The chords are shown as symbols, not written out as notes.
- **related:** `chord`, `chord-progression`, `harmonic-function`, `melody`
- **sources:** S14, S15

### Major seventh chord

- **id:** `major-seventh-chord`
- **aliases:** maj7, M7, Δ7, major-major seventh chord
- **popup:** A major chord with the note a half step below the root added on top, such as C, E, G, B (Cmaj7). Soft and dreamy.
- **definition:** A major seventh chord is a major triad plus a major seventh: C–E–G–B is Cmaj7, also written CM7 or CΔ7. The seventh lies just a half step below the next root, which gives the chord its soft, floating sound. In a major key it sits on the first and fourth degrees. It is a common home chord in jazz and bossa nova.
- **in_infinite_flow:** Not used yet. Each of the app's seven modes has two degrees that carry it.
- **related:** `seventh-chord`, `minor-seventh-chord`, `chord-quality`, `chord-symbol`, `bossa-nova`
- **sources:** S416, S429, S441, S447

### Minor seventh chord

- **id:** `minor-seventh-chord`
- **aliases:** m7, min7, −7, minor-minor seventh chord
- **popup:** A minor chord with a seventh on top, such as D, F, A, C (Dm7). Mellow, the everyday minor chord of jazz.
- **definition:** A minor seventh chord is a minor triad plus a minor seventh: D–F–A–C is Dm7, also written D−7. In a major key it sits on the second, third and sixth degrees. It is the "two" of the jazz ii–V–I and the home chord of Dorian vamps, such as the Am7 of "Oye Como Va".
- **in_infinite_flow:** Not used yet. Each of the app's seven modes has three degrees that carry it.
- **related:** `seventh-chord`, `major-seventh-chord`, `dorian`, `chord-quality`, `chord-symbol`
- **sources:** S416, S429, S105

### Modal mixture

- **id:** `modal-mixture`
- **aliases:** mode mixture, borrowed chord, borrowing
- **popup:** Borrowing a chord from the parallel key, such as a minor iv or a ♭VI in a major key.
- **definition:** Modal mixture means using, in one key, chords that belong to its parallel key (the other mode on the same tonic). In C major the most common borrowed chords come from C minor: F minor (iv), A-flat major (♭VI) and B-flat major (♭VII). They add shade and drama without leaving the key. Mixture is more common in major keys; Romantic composers, film scores and rock all use it.
- **in_infinite_flow:** Not built; style atlas research: the Romantic, film and rock entries ask for borrowed chords as a harmony capability (docs/music/styles/art-music.md, docs/music/styles/popular-electronic-game.md).
- **related:** `parallel-keys`, `chromatic`, `chromatic-mediant`, `subtonic`, `picardy-third`
- **sources:** S281, S338, docs/music/styles/art-music.md, docs/music/styles/popular-electronic-game.md

### Parallel fifths and octaves

- **id:** `parallel-fifths-and-octaves`
- **aliases:** consecutive fifths, consecutive octaves, parallel perfect intervals
- **popup:** Two separate parts moving together a fifth or an octave apart. Classical writing avoids it because the two parts blend into one.
- **definition:** Parallel fifths (or octaves) happen when two parts that are a fifth (or an octave) apart both move to new notes that are again a fifth (or an octave) apart. These intervals blend so well that the two parts stop sounding independent, so classical part-writing avoids them between independent parts. Elsewhere they are normal: rock power chords are parallel fifths, and doubling a melody in octaves is standard orchestration.
- **in_infinite_flow:** Not built. The v4 research proposes the rule only between parts meant to be independent, such as the player's line and a counter-melody, never inside a doubling or a chord.
- **related:** `interval`, `octave`, `doubling`, `types-of-motion`, `voice-leading`
- **sources:** S145, S147

### Passing chord

- **id:** `passing-chord`
- **aliases:** chromatic passing chord
- **popup:** A quick chord slipped between two main chords to make the move from one to the other smoother.
- **definition:** A passing chord connects two more important chords, usually so that the bass or an inner part can move by step between them. It is brief and weakly placed in the bar; the ear hears it as a bridge rather than a destination. Gospel and jazz pianists often insert chromatic passing chords, a half step away from the next chord.
- **in_infinite_flow:** Not built; style atlas research: the gospel and bebop entries propose inserting passing chords between template chords (docs/music/styles/jazz-blues-soul.md).
- **related:** `chord`, `passing-tone`, `chord-progression`, `chromatic`
- **sources:** docs/music/styles/jazz-blues-soul.md

### Picardy third

- **id:** `picardy-third`
- **aliases:** tierce de Picardie
- **popup:** A major tonic chord ending a piece or section in a minor key, giving a sudden brightness at the close.
- **definition:** A Picardy third is the use of a major tonic chord for the last chord of a passage in a minor key or a minor-sounding mode: a piece in A minor ending on A major. The raised third brightens the final moment. It was common in the Renaissance and Baroque, for example at the close of many Bach chorales in minor.
- **in_infinite_flow:** Not built; style atlas research: the app's phrases always end open (spec decision D28), so the closed endings of chorales are a stated loss; a style-scoped exception would allow it (docs/music/styles/art-music.md).
- **related:** `cadence`, `tonic`, `minor`, `modal-mixture`, `chorale`
- **sources:** S306, docs/music/styles/art-music.md

### Plagal cadence

- **id:** `plagal-cadence`
- **aliases:** Amen cadence, IV–I
- **popup:** The chord ending IV–I, the "Amen" at the end of hymns; common in gospel and blues.
- **definition:** A plagal cadence moves from the chord on the fourth degree to the tonic: in C, F major to C major. It sounds softer than the dominant-to-tonic ending and is known as the "Amen" cadence because hymns traditionally set the final "Amen" to it. Gospel and blues use IV–I often, also in the middle of sections; a minor plagal cadence (iv–I) borrows a minor iv chord.
- **in_infinite_flow:** Not built; style atlas research: the gospel, hard-bop and blues entries ask for IV–I endings; every phrase the app writes ends open today (spec decision D28) (docs/music/styles/jazz-blues-soul.md).
- **related:** `cadence`, `predominant`, `tonic`, `double-plagal`, `open-ending`
- **sources:** S330, S312, docs/music/styles/jazz-blues-soul.md

### Planing

- **id:** `planing`
- **aliases:** parallel harmony, parallel chords
- **popup:** Moving a whole chord shape up or down note for note, so every voice moves in parallel.
- **definition:** Planing moves a chord shape in parallel: every note slides by the same interval, so a stack of notes glides up or down as a block. It ignores the usual rule that voices should move independently, and it weakens the sense of chord progression in favour of colour. Debussy and other Impressionist composers used it often; it is also common in jazz and film music.
- **in_infinite_flow:** Not built; style atlas research: the Impressionism entry asks for planed chords in the backing (docs/music/styles/art-music.md).
- **related:** `types-of-motion`, `parallel-fifths-and-octaves`, `voicing`, `chord`
- **sources:** S286, S284, docs/music/styles/art-music.md

### Power chord

- **id:** `power-chord`
- **aliases:** fifth chord, 5 chord
- **popup:** A two-note guitar chord of a root and the fifth above it, with no third, so it is neither major nor minor.
- **definition:** A power chord sounds only the root and the fifth (often with the root doubled an octave higher), leaving out the third that would make the chord major or minor. Written C5, it is the basic chord of rock, punk and metal guitar. With heavy distortion, a full triad sounds muddy, while the plain fifth stays clear and powerful.
- **in_infinite_flow:** Not built; style atlas research: the rock, punk and metal entries ask for fifth-only chords in the backing (docs/music/styles/popular-electronic-game.md).
- **related:** `chord`, `chord-quality`, `interval`, `triad`
- **sources:** S339, S341, S343, docs/music/styles/popular-electronic-game.md

### Predominant

- **id:** `predominant`
- **aliases:** pre-dominant, subdominant function, PD
- **popup:** A chord that leads away from home and prepares the pull back, such as the IV or ii chord in a major key.
- **definition:** A predominant chord moves the music away from the tonic and prepares the dominant. In major keys the usual predominant chords are IV and ii (F and Dm in C major). They sound like motion outward, a step away from home that leads naturally on to V. The order tonic, predominant, dominant, tonic is the backbone of a great deal of tonal music.
- **in_infinite_flow:** In tonal music, a predominant is a diatonic chord function that leads away from tonic toward dominant motion. In the app's Major and Minor plans, Gentle and Active motion often place a predominant chord (ii or IV; in Minor, ii-diminished or iv) in measure 2 or 3, before the final degree-5 chord.
- **related:** `tonic`, `dominant`, `harmonic-function`, `chord-progression`
- **sources:** S2, S14, docs/music/harmony-planner-policy.md

### Quartal harmony

- **id:** `quartal-harmony`
- **aliases:** quartal chord, quartal voicing, chord in fourths, So What chord
- **popup:** Chords built from stacked fourths instead of thirds, sounding open and modern.
- **definition:** Most Western chords stack thirds (C–E–G). Quartal harmony stacks fourths instead (D–G–C–F), which gives an open, unresolved sound without a clear major or minor quality, and any note of the chord can act as its root. 20th-century composers and modal jazz pianists use it; the "So What chord" from Miles Davis's tune is three fourths topped by a third.
- **in_infinite_flow:** Not built; style atlas research: the neoclassical and modal-jazz entries ask for quartal voicings in the backing (docs/music/styles/art-music.md, docs/music/styles/jazz-blues-soul.md).
- **related:** `chord`, `voicing`, `triad`, `interval`
- **sources:** S296, S324, docs/music/styles/art-music.md, docs/music/styles/jazz-blues-soul.md

### Quick change

- **id:** `quick-change`
- **aliases:** quick four, quick-change blues
- **popup:** A twelve-bar blues that moves to the IV chord in bar 2 and back to I in bar 3, instead of staying on I for four bars.
- **definition:** In the standard twelve-bar blues the first four bars stay on the tonic (I). The quick change replaces bar 2 with the IV chord, then returns to I for bars 3 and 4. The early move to IV adds variety to the opening line and is very common in blues and jazz blues.
- **in_infinite_flow:** Not built; style atlas research: the Chicago-blues entry asks for it as a variant of a twelve-bar plan (docs/music/styles/jazz-blues-soul.md).
- **related:** `twelve-bar-blues`, `predominant`, `turnaround`
- **sources:** S309, docs/music/styles/jazz-blues-soul.md

### Rhythm changes

- **id:** `rhythm-changes`
- **aliases:** I Got Rhythm changes
- **popup:** The chord progression of Gershwin's "I Got Rhythm", reused for countless jazz tunes in AABA form.
- **definition:** Rhythm changes are the chords of George Gershwin's song "I Got Rhythm" (1930). Jazz musicians wrote many new melodies over them, so "rhythm changes" became, with the twelve-bar blues, one of the two most common forms in jazz. It is a 32-bar AABA form: the A sections cycle quickly around the tonic (I–vi–ii–V and similar), and the bridge moves through a chain of dominant seventh chords.
- **in_infinite_flow:** Not built; style atlas research: the bebop entry lists it with the open question of forms longer than four bars (docs/music/styles/jazz-blues-soul.md).
- **related:** `aaba-form`, `chord-progression`, `twelve-bar-blues`, `two-five-one`
- **sources:** docs/music/styles/jazz-blues-soul.md

### Roman numeral

- **id:** `roman-numeral`
- **aliases:** Roman numeral analysis
- **popup:** A way to name a chord by the scale note it is built on: I for the first note, V for the fifth, and so on.
- **definition:** Roman numerals name chords by the scale degree of their root, so one label works in every key. In C major, I is C major, IV is F major and V is G major. Upper case means a major chord, lower case minor (ii, iii, vi), and a small circle diminished (vii°). Musicians use them to discuss progressions, like "a I-IV-V", without tying them to one key.
- **in_infinite_flow:** The score shows letter chord symbols, not Roman numerals. The project's design documents use Roman numerals and degree numbers to describe the app's chord plans.
- **related:** `scale-degree`, `chord-symbol`, `chord-progression`, `chord-quality`
- **sources:** S14

### Root

- **id:** `root`
- **aliases:** chord root
- **popup:** The note a chord is built from and named after. C is the root of the C major chord (C, E, G).
- **definition:** The root is the note a chord is built up from when its notes are stacked in thirds, and it gives the chord its letter name. In a C major chord (C-E-G) the root is C; in A minor (A-C-E) it is A. A chord is in root position when its root is the lowest note; otherwise it is an inversion.
- **in_infinite_flow:** All of the app's chords are in root position; it never uses inversions.
- **related:** `chord`, `triad`, `chord-symbol`, `roman-numeral`
- **sources:** S14

### Seventh chord

- **id:** `seventh-chord`
- **aliases:** 7th chord
- **popup:** A four-note chord: a three-note chord plus one more note stacked on top, as in G, B, D, F (G7).
- **definition:** A seventh chord adds a fourth note to a triad: another third on top, which lies a seventh above the root. G-B-D-F is a G dominant seventh (G7). Common types include major seventh (Cmaj7), minor seventh (Dm7), dominant seventh (G7) and half-diminished (Bm7♭5). Seventh chords sound richer than triads and are the everyday chords of jazz.
- **in_infinite_flow:** The app does not use seventh chords yet. Even under the Jazz preset, all chords are plain triads.
- **related:** `triad`, `chord`, `chord-symbol`, `chord-quality`
- **sources:** S14, S15

### Sixth chord

- **id:** `sixth-chord`
- **aliases:** added sixth chord, 6 chord, C6, m6, 6/9
- **popup:** A three-note chord plus the sixth note above its root, such as C, E, G, A (C6). A sweet alternative to a seventh chord.
- **definition:** A sixth chord adds the sixth above the root to a triad: C6 is C–E–G–A; Cm6 is C–E♭–G–A. It is written "6" only when no seventh is present; with a seventh, the same note is called the 13th. C6 has the same notes as Am7, so the bass and context decide which chord it is. Jazz often puts a 6 chord on the home chord in place of a major seventh, and bossa nova guitar adds the sixth and ninth to major chords. In classical theory "sixth chord" can also mean a first-inversion triad.
- **in_infinite_flow:** Not used. Built from the app's collections, a sixth chord would hold exactly the notes of another degree's seventh chord (docs/music/chord-research.md).
- **related:** `seventh-chord`, `major-seventh-chord`, `minor-seventh-chord`, `chord-inversion`, `chord-symbol`
- **sources:** S435, S426, S421, S112

### Subtonic

- **id:** `subtonic`
- **aliases:** ♭VII, flat seven chord
- **popup:** The note or chord a whole step below the tonic, written ♭VII; common in rock, folk and modal music.
- **definition:** In a major key the seventh note is a half step below the tonic and is called the leading tone. When it is lowered to a whole step below, as in the Mixolydian mode or natural minor, it is called the subtonic. The chord built on it, ♭VII (B-flat major in C), is common in rock, folk and game music, where it often replaces the dominant (V) before the tonic.
- **in_infinite_flow:** Not built; style atlas research: several rock and game-music entries ask for ♭VII in the progression templates (docs/music/styles/popular-electronic-game.md).
- **related:** `scale-degree`, `mixolydian`, `aeolian`, `dominant`, `double-plagal`, `aeolian-cadence`
- **sources:** S338, S341, docs/music/styles/popular-electronic-game.md

### Suspended chord

- **id:** `suspended-chord`
- **aliases:** sus chord, sus4, sus2, 7sus4
- **popup:** A chord whose middle note (the third) is swapped for the 4th or the 2nd, such as C, F, G (Csus4). Open, neither major nor minor.
- **definition:** A suspended chord replaces the third with the fourth (Csus4: C–F–G) or the second (Csus2: C–D–G); "sus" alone means sus4. With no third it is neither major nor minor, and sounds open. The name comes from the melodic suspension, where a held note clashes and then falls to the third; in pop, folk and modal jazz the sus chord's fourth often never resolves. A dominant version, G7sus4, is common in jazz.
- **in_infinite_flow:** Not used. It is a chord type, not the melodic suspension, which the lexicon describes separately and which the app does not write either.
- **related:** `suspension`, `chord`, `triad`, `chord-symbol`, `dominant-seventh-chord`
- **sources:** S436, S417, S426

### Tension and resolution

- **id:** `tension-and-resolution`
- **aliases:** tension, resolution, tension and release
- **popup:** Tension is a sound that feels unsettled and wants to move on; resolution is the relief when it lands on a stable note.
- **definition:** Tension is the feeling that the music is unsettled and needs to go somewhere; resolution is the release when it gets there. Many things create tension: a note that clashes with the chord, a chord far from home, a syncopated rhythm, a high or long-held note. Resolution usually means moving to a stable note or chord, often by step. Music lives on the balance between the two.
- **in_infinite_flow:** In the app, the Tension control schedules at most one tension figure: a note outside the chord (a passing or neighbor tone, an appoggiatura, or, under Build, a two-note approach) that resolves by step onto a chord tone before the phrase's last note. The setting decides whether a figure is required and where it falls. Plain passing and neighbor tones, and Jazz's chromatic notes, also appear but are not counted as tension figures. In a session, a phrase generated from the phrase before it may also end on a tense scale tone that the next phrase's first note resolves; that note is not a tension figure either.
- **related:** `non-chord-tone`, `appoggiatura`, `chord-tone`, `cadence`, `control-tension`
- **sources:** S4, S6, S14, src/domain/generation/carry-in/phrase-ending-debt.ts

### Tonic

- **id:** `tonic`
- **aliases:** I, home chord, tonic chord, tonic function
- **popup:** The home chord of a key, built on its first note. Music feels at rest when it arrives there.
- **definition:** The tonic is home base in a key: the first scale degree, and the chord built on it (I). In C major the tonic note is C and the tonic chord is C-E-G. It is the home chord or pitch area: arriving there creates a sense of rest or arrival, so most pieces end on it. Chords that share notes with the tonic, like vi, can partly stand in for it.
- **in_infinite_flow:** Every phrase starts on the tonic chord (degree 1), and modal phrases keep returning to it. No phrase ever ends with the home note as its last note.
- **related:** `tonal-center`, `dominant`, `predominant`, `harmonic-function`, `cadence`
- **sources:** S2, S14, S15

### Triad

- **id:** `triad`
- **aliases:** none
- **popup:** The basic three-note chord: a note plus the notes a third and a fifth above it, like C, E, G.
- **definition:** A triad is a three-note chord made by stacking two thirds: a root, a third above it, and a fifth above the root. C-E-G is the C major triad. Triads come in four qualities: major, minor, diminished and augmented. Building a triad on each note of a major scale gives its seven diatonic triads; in C major, C, Dm, Em, F, G, Am and Bdim.
- **in_infinite_flow:** Triads are the app's only chords. Each is built from every other note of the chosen collection, starting on its root, so its quality always comes from the collection.
- **related:** `chord`, `root`, `chord-quality`, `seventh-chord`, `diatonic`
- **sources:** S14, S15

### Tritone substitution

- **id:** `tritone-substitution`
- **aliases:** tritone sub, tritone substitute
- **popup:** In jazz, replacing a dominant chord with another dominant chord a tritone (six half steps) away.
- **definition:** A tritone substitution swaps a dominant seventh chord for the dominant seventh whose root lies a tritone away: D-flat7 in place of G7 before C. The two chords share their two most active notes (the third and the seventh, B and F), so the substitute still leads home, and the bass now slides down by a half step (D-flat to C). Bebop and later jazz use it constantly.
- **in_infinite_flow:** Not built; style atlas research: the bebop entry proposes chord substitutions in the progression templates (docs/music/styles/jazz-blues-soul.md).
- **related:** `dominant`, `seventh-chord`, `two-five-one`, `guide-tone`, `chromatic`
- **sources:** S103, docs/music/styles/jazz-blues-soul.md

### Turnaround

- **id:** `turnaround`
- **aliases:** turnback
- **popup:** The last bar or two of a form, with chords that lead back to the start for the next time through.
- **definition:** A turnaround is a short chord progression at the end of a section or form that leads back to its beginning instead of coming to rest. In a twelve-bar blues it fills bars 11 and 12, often moving to V so that the next chorus can start on I. In jazz the I–vi–ii–V turnaround is common. A band can also loop a turnaround to vamp before a song starts.
- **in_infinite_flow:** Not built; style atlas research: the blues entries ask for it as a stored cadence formula; it fits the app's open endings (spec decision D28) (docs/music/styles/jazz-blues-soul.md).
- **related:** `twelve-bar-blues`, `cadence`, `open-ending`, `vamp`, `quick-change`
- **sources:** S309, docs/music/styles/jazz-blues-soul.md

### Twelve-bar blues

- **id:** `twelve-bar-blues`
- **aliases:** blues progression, 12-bar blues
- **popup:** The standard chord pattern of the blues: twelve measures built from three chords, I, IV and V.
- **definition:** The twelve-bar blues is a chord pattern that repeats every twelve measures. In its basic form it stays on I for four measures, moves to IV for two, back to I for two, then V, IV and I. The chords are usually seventh chords. Its melody often follows an AAB shape: a line, the same line again, then an answer.
- **in_infinite_flow:** Not possible. Every phrase is four measures, chords are triads, and degree 5 only appears at the end of a phrase.
- **related:** `chord-progression`, `seventh-chord`, `blue-note`, `call-and-response`, `blues-scale`
- **sources:** S101, docs/music/harmony-planner-policy.md

### Two-five-one

- **id:** `two-five-one`
- **aliases:** ii–V–I, ii-V-I, 2-5-1
- **popup:** The basic jazz chord move: the chord on degree 2, then the dominant, then the home chord, as Dm7–G7–Cmaj7 in C.
- **definition:** The two-five-one (ii–V–I) chains the chord on the second degree, the dominant and the tonic. In C major it is D minor 7, G7, C major 7; in minor it is usually a half-diminished ii, a dominant V and a minor i. Each root falls a fifth to the next, so the progression pulls strongly home. It is one of the most important progressions in jazz, and players practise it in every key.
- **in_infinite_flow:** Not built; style atlas research: the bebop and swing entries ask for it as a progression template (docs/music/styles/jazz-blues-soul.md).
- **related:** `chord-progression`, `predominant`, `dominant`, `tonic`, `seventh-chord`, `tritone-substitution`
- **sources:** S308, docs/music/styles/jazz-blues-soul.md

### Types of motion

- **id:** `types-of-motion`
- **aliases:** contrary motion, oblique motion, similar motion, parallel motion
- **popup:** How two parts move against each other: in opposite directions, one holding while the other moves, or side by side.
- **definition:** Between two parts there are four types of motion. In contrary motion they move in opposite directions. In oblique motion one part holds its note while the other moves. In similar motion both move the same way by different intervals, and in parallel motion both move the same way by the same interval. Contrary and oblique motion keep two lines sounding separate; parallel motion makes them sound like one thickened line.
- **in_infinite_flow:** Not built. The v4 research suggests that a counter-melody prefer contrary and oblique motion against the player's line, while a doubling moves in parallel on purpose.
- **related:** `voice-leading`, `counter-melody`, `parallel-fifths-and-octaves`, `parallel-thirds-and-sixths`, `polyphony`
- **sources:** S144

### Vamp

- **id:** `vamp`
- **aliases:** ostinato (for a repeated melodic figure)
- **popup:** A short chord pattern, often just one or two chords, repeated again and again under a solo.
- **definition:** A vamp is a short pattern of one or two chords that keeps repeating, giving a soloist an open-ended bed to play over. Because the chords barely move, the mode or scale becomes the main color. A minor chord moving to a major chord a fourth higher, i to IV, is a classic Dorian vamp.
- **in_infinite_flow:** Closest today: Static harmonic motion (one chord) or a modal Gentle plan, which returns home after one color chord. The backing does not loop a vamp across phrases.
- **related:** `chord-progression`, `dorian`, `mode`, `control-harmonic-motion`, `riff`, `groove`
- **sources:** S104, S105, docs/music/harmony-planner-policy.md

### Voice leading

- **id:** `voice-leading`
- **aliases:** part-writing
- **popup:** How each part moves from one note to the next as the chords change, ideally by small, smooth steps.
- **definition:** Voice leading is how each single part moves as the harmony changes. Good voice leading keeps each part easy to follow: it moves by small steps, keeps shared notes where they are, does not cross another part and does not melt into another part. Many classical rules about it can be explained by how hearing sorts sounds into lines, which is why they still help when writing several parts in any style.
- **in_infinite_flow:** Not built. The backing places each chord by its top note (the highest it can be at or below E4), not by a smooth move from the previous chord. The v4 research proposes a short minimum rule set for system voices (docs/music/arranging-and-roles.md).
- **related:** `voice`, `voicing`, `types-of-motion`, `parallel-fifths-and-octaves`, `chord`, `step`
- **sources:** S148, S144, S145, src/domain/backing/backing-renderer.ts

### Voicing

- **id:** `voicing`
- **aliases:** chord voicing, close position, open position
- **popup:** Which exact notes of a chord are played, in which octaves and in what order from low to high.
- **definition:** A chord names a set of notes, but a voicing is one particular way to play them: which octave each note is in, which note is on top, whether a note is doubled or left out, and how close together they sit. In close position the notes are packed inside an octave; in open position they are spread wider. Jazz players often leave out the root and the fifth and keep the third and the seventh.
- **in_infinite_flow:** The backing plays close-position triads with the top note at or below E4 (MIDI 64).
- **related:** `chord`, `triad`, `root`, `chord-inversion`, `guide-tone`, `voice-leading`, `comping`
- **sources:** S131, S146, S418, S427, src/domain/backing/backing-renderer.ts

## Scales and modes

### Aeolian

- **id:** `aeolian`
- **aliases:** Aeolian mode, natural minor
- **popup:** The natural minor scale: the white keys from A to A. It often sounds sad or serious.
- **definition:** Aeolian is the mode of the white keys from A to A, with the step pattern W-H-W-W-H-W-W (W is a whole step, H a half step). It is the same as the natural minor scale. Compared with major, its 3rd, 6th and 7th notes are a half step lower, which gives it a darker, often sad or serious mood. A Aeolian is A, B, C, D, E, F, G.
- **in_infinite_flow:** Aeolian and Minor use the same seven notes but are planned differently: Minor follows the tonal chord cycle, while Aeolian uses the modal plan, whose color chords contain degree 6. On C, both show a three-flat key signature.
- **related:** `minor`, `mode`, `ionian`, `dorian`, `control-collection`
- **sources:** S14

### Augmented second

- **id:** `augmented-second`
- **aliases:** none
- **popup:** A gap of three half steps between two neighbouring scale notes, heard as one wide, exotic-sounding step.
- **definition:** An augmented second spans three half steps, the same distance as a minor third, but it is written between neighbouring letter names, so it acts as one step of a scale: A-flat to B in C harmonic minor. That unusually wide step gives harmonic minor, the Phrygian dominant scale (klezmer's Freygish), maqam Hijaz and flamenco their distinctive colour.
- **in_infinite_flow:** Not built; style atlas research: the klezmer, flamenco and maqam entries ask for scales that contain it (docs/music/styles/folk-and-world.md).
- **related:** `interval`, `harmonic-minor`, `phrygian-dominant-scale`, `maqam`, `enharmonic`
- **sources:** S378, docs/music/styles/folk-and-world.md

### Bebop scale

- **id:** `bebop-scale`
- **aliases:** bebop dominant scale
- **popup:** A jazz scale with one extra in-between note added, so that chord notes fall on the beats when you play even eighth notes.
- **definition:** A bebop scale is a seven-note scale with one extra chromatic note, making eight. With eight notes, a line of eighth notes that starts on a chord note on the beat keeps landing chord notes on the beats. The best-known form, for dominant seventh chords, is Mixolydian plus the major seventh: over G7, G, F-sharp, F, E, D, C, B, A, with F-sharp as the added note.
- **in_infinite_flow:** Not used as a scale. The Jazz preset can produce its passing note by chance, as a chromatic approach. The app's chords are triads, while bebop lines usually target seventh chords.
- **related:** `scale`, `mixolydian`, `chromatic`, `passing-tone`, `eighth-note`
- **sources:** S9

### Blue note

- **id:** `blue-note`
- **aliases:** blues note, blue third, blue fifth
- **popup:** A note played a little lower than the scale expects, usually the third, fifth or seventh, that gives blues and jazz their crying sound.
- **definition:** Blue notes are notes lowered from the major scale and played against major-sounding chords: mainly the third and the fifth, often the seventh too. In C they lean toward E-flat, G-flat and B-flat. Voices, guitars and saxophones often bend into them, landing between two keyboard keys, or slide off them, and may hold them without resolving; a keyboard plays the nearest half step instead. The blues scale is built around them.
- **in_infinite_flow:** Not used as such. The Jazz preset can write one only as a brief chromatic approach that resolves at once (E-flat to E over C). A MIDI controller sends whole half steps, so a played blue note arrives as a flattened note outside the collection; the key and mode suggestion planned for v3.2 (not built) would tolerate a few such notes.
- **related:** `chromatic`, `half-step`, `chromatic-approach`, `scoop`, `mixolydian`, `dorian`, `swing`
- **sources:** S9, S78, docs/music/key-and-mode-estimation.md

### Blues scale

- **id:** `blues-scale`
- **aliases:** none
- **popup:** The minor pentatonic scale plus one extra note, the lowered 5th. A favorite scale for blues and rock solos.
- **definition:** The blues scale adds one note to the minor pentatonic scale: the lowered 5th, a half step between the 4th and the 5th. In C it is C, E-flat, F, G-flat, G, B-flat. Its lowered 3rd and lowered 5th are blue notes, and players use the scale over the major-sounding chords of a blues, where those notes rub on purpose.
- **in_infinite_flow:** Not available as a collection. The Jazz preset can only pass through its notes as brief chromatic approaches.
- **related:** `pentatonic-scale`, `blue-note`, `scale`, `twelve-bar-blues`
- **sources:** S9, S100

### Characteristic note

- **id:** `characteristic-note`
- **aliases:** color note, color degree, characteristic degree
- **popup:** The note that makes a mode sound different from plain major or minor, such as the raised 4th in Lydian.
- **definition:** A mode's characteristic note is the scale degree that most clearly sets it apart from the familiar major or natural minor scale. Examples: Lydian's raised 4th and Mixolydian's lowered 7th (compared with major), Dorian's raised 6th and Phrygian's lowered 2nd (compared with natural minor). Melodies and chords that feature this note make the mode easy to recognize; ones that avoid it can sound like plain major or minor.
- **in_infinite_flow:** The app calls it the "color degree": Ionian 4, Dorian 6, Phrygian 2, Lydian 4, Mixolydian 7, Aeolian 6, Locrian 5. Ionian and Aeolian are simply the plain major and natural minor scales, so the app uses the note that sets each apart from its closest mode: Ionian's plain 4th (Lydian raises it) and Aeolian's lowered 6th (Dorian raises it). In a modal phrase, every chord other than the home chord is chosen among triads that contain this degree.
- **related:** `mode`, `dorian`, `lydian`, `mixolydian`, `phrygian`, `control-harmonic-motion`
- **sources:** S14, docs/music/harmony-planner-policy.md

### Dorian

- **id:** `dorian`
- **aliases:** Dorian mode
- **popup:** A minor-sounding mode with a brighter 6th note: the white keys from D to D. Common in jazz, funk and folk.
- **definition:** Dorian is the mode of the white keys from D to D, with the step pattern W-H-W-W-W-H-W. It is a minor mode, since its 3rd is minor, but its 6th is a half step higher than in natural minor, which makes it sound less gloomy, even a little hopeful. It is a favorite for jazz soloing over minor chords, and in funk and folk music. D Dorian is D, E, F, G, A, B, C.
- **in_infinite_flow:** Its color degree in the app is 6, the raised 6th.
- **related:** `mode`, `aeolian`, `minor`, `characteristic-note`, `control-collection`
- **sources:** S14, S9

### Final

- **id:** `final`
- **aliases:** final note, finalis
- **popup:** The last note of a melody. In modal music it is usually the home note, so it helps tell which mode is used.
- **definition:** The final is a melody's last note. In medieval modal theory it named the mode's home note: a chant ending on D was in a D mode, and its range then told which of the two D modes. Many folk and popular melodies also end on their home note, so the last note is a strong clue to the key. It is only a clue: a melody can stop anywhere, especially a short improvised one.
- **in_infinite_flow:** The key and mode suggestion planned for v3.2 (not built) would give a small bonus to candidates whose home note is the doodle's last note. The app's own generated phrases never end on the home note.
- **related:** `tonic`, `tonal-center`, `mode`, `cadence`, `key-finding`, `open-ending`
- **sources:** S71, S63, S69

### Harmonic minor

- **id:** `harmonic-minor`
- **aliases:** harmonic minor scale
- **popup:** A minor scale with its seventh note raised a half step, which pulls strongly toward home.
- **definition:** Harmonic minor is the natural minor scale with the seventh note raised by a half step: A, B, C, D, E, F, G-sharp in A harmonic minor. The raised note sits just below the home note and leans into it, which classical music likes before a cadence. It leaves a wide gap of three half steps between the sixth and seventh notes, which gives the scale its exotic sound.
- **in_infinite_flow:** Not one of the app's collections; the app's Minor is natural minor. The key and mode suggestion planned for v3.2 (not built) would treat a raised seventh as an outside note and suggest the closest mode, usually Aeolian.
- **related:** `minor`, `aeolian`, `scale`, `half-step`, `control-collection`
- **sources:** S78, S14, docs/music/harmony-planner-policy.md

### Hexatonic scale

- **id:** `hexatonic-scale`
- **aliases:** six-note scale, hexatonic
- **popup:** A scale of six notes, for example a seven-note scale with one note left out.
- **definition:** A hexatonic scale has six different notes in each octave. Some are well-known shapes of their own: the whole-tone scale (C D E F♯ G♯ A♯, every step a whole step) and the blues scale both have six notes. Others come from leaving one note out of a seven-note scale: A minor without its seventh note, G, gives A B C D E F. One step becomes wider, so the result sounds a little more open than its seven-note parent.
- **in_infinite_flow:** Not available: the Collection control offers seven-note scales and modes only. The endgame research uses it for a character that "hates G" in A minor, whose own line would then use six notes (docs/music/musical-identity.md); endgame groundwork, not built.
- **related:** `scale`, `pentatonic-scale`, `blues-scale`, `aeolian`, `control-collection`, `musical-identity`
- **sources:** S241, docs/music/musical-identity.md

### Ionian

- **id:** `ionian`
- **aliases:** Ionian mode
- **popup:** The mode name for the major scale: the white keys from C to C. Bright and familiar.
- **definition:** Ionian is the name of the major scale when it is treated as one of the seven modes: the white keys from C to C, with the step pattern W-W-H-W-W-W-H. It sounds bright, stable and familiar, since most children's songs and a great deal of popular music use it. C Ionian is C, D, E, F, G, A, B.
- **in_infinite_flow:** Ionian is the default Collection. It has the same notes as Major but uses the app's modal plan (color chords containing degree 4) instead of the tonal chord cycle.
- **related:** `major`, `mode`, `lydian`, `mixolydian`, `control-collection`
- **sources:** S14

### Jins

- **id:** `jins`
- **aliases:** ajnas, jins (plural ajnas)
- **popup:** A group of three to five notes, the building block of an Arabic maqam.
- **definition:** A jins (plural ajnas) is a small group of three to five neighbouring notes with a fixed pattern of steps, which may include a quarter tone. An Arabic maqam is built from two or more ajnas, one at the bottom and one or more above, and a melody often explores the lower jins first before climbing to the upper one. Swapping the upper jins is one way a performer changes maqam.
- **in_infinite_flow:** Not built; style atlas research: a maqam sketch would treat ajnas as note groups the line moves through (docs/music/styles/folk-and-world.md).
- **related:** `maqam`, `quarter-tone`, `scale`
- **sources:** S397, S398, docs/music/styles/folk-and-world.md

### Key

- **id:** `key`
- **aliases:** tonality
- **popup:** The home note and scale a piece is built on, such as "C major" or "A minor".
- **definition:** A key names the home note of a piece and the scale built on it, for example C major or A minor. Being "in C major" means that C sounds like home and most notes come from the C major scale; the key signature shows which sharps or flats that scale needs. Pieces can change key along the way. Careful: "key" also just means one of the levers on a keyboard or saxophone.
- **in_infinite_flow:** The app splits the key into two controls: Written key picks the home note and Collection picks the scale or mode. Both are chosen in your instrument's written pitch.
- **related:** `tonal-center`, `scale`, `key-signature`, `control-written-key`, `control-collection`
- **sources:** S14, S15

### Key finding

- **id:** `key-finding`
- **aliases:** key detection, key estimation
- **popup:** Working out which key a piece of music is in by looking at its notes.
- **definition:** Key finding means guessing the key of some music from its notes alone. Most methods count how much each of the 12 note names is used and compare that count with the typical pattern of each key, where the home note and its fifth and third stand out. The key whose pattern matches best wins. The first and last notes help too. A short melody often matches several keys almost equally, so a single answer can be uncertain.
- **in_infinite_flow:** Planned for v3.2 (not built), with Jam, as the key and mode suggestion (see that entry): the app reads the player's doodle, rates every key and mode, and may suggest one by a weighted draw among the likeliest. It never changes the Written key or Collection on its own.
- **related:** `key`, `mode`, `tonic`, `key-profile`, `relative-keys`, `pitch-class`, `key-and-mode-suggestion`, `control-written-key`, `control-collection`
- **sources:** S60, S63, S73, docs/music/key-and-mode-estimation.md

### Key profile

- **id:** `key-profile`
- **aliases:** tonal hierarchy, pitch-class profile
- **popup:** A list of 12 numbers saying how well each note name fits a key. The home note scores highest.
- **definition:** A key profile gives each of the 12 note names a number for how well it belongs to a key. The first profiles came from listeners rating how well a note fit after a passage in a key; later ones count how often each note appears in real music. In every profile the home note scores highest, then the fifth and third notes of the scale, then the other scale notes, with notes outside the scale far behind.
- **in_infinite_flow:** The key and mode suggestion planned for v3.2 (not built) would use one simple profile per mode, built from these roles, rather than a measured one.
- **related:** `key-finding`, `key`, `tonic`, `scale-degree`, `scale`
- **sources:** S60, S63, S65, S73

### Locrian

- **id:** `locrian`
- **aliases:** Locrian mode
- **popup:** The darkest, least stable mode: the white keys from B to B. Its home chord is diminished, so it rarely feels settled.
- **definition:** Locrian is the mode of the white keys from B to B, with the step pattern H-W-W-H-W-W-W. It has a lowered 2nd and, alone among the seven modes, a diminished fifth above its home note, so its home chord is diminished instead of major or minor. That makes it sound unstable, and it is rarely used as a home key. In jazz it is the standard scale over a half-diminished chord (m7♭5), such as the ii chord when a minor key moves ii-V-i; some metal also borrows its dark sound. B Locrian is B, C, D, E, F, G, A.
- **in_infinite_flow:** The app keeps Locrian's diminished home chord as the home area instead of swapping in a major or minor one. Its color degree is 5, the diminished fifth.
- **related:** `mode`, `phrygian`, `chord-quality`, `characteristic-note`, `control-collection`
- **sources:** S14, docs/music/harmony-planner-policy.md

### Lydian

- **id:** `lydian`
- **aliases:** Lydian mode
- **popup:** A major-sounding mode with a raised 4th note that gives a dreamy, floating sound: the white keys from F to F.
- **definition:** Lydian is the mode of the white keys from F to F, with the step pattern W-W-W-H-W-W-H. It is major with one change: the 4th note is a half step higher, three whole steps above the home note. That note gives Lydian a bright, dreamy or floating quality often heard in film music and jazz. F Lydian is F, G, A, B, C, D, E.
- **in_infinite_flow:** Its color degree in the app is 4, the raised 4th.
- **related:** `mode`, `ionian`, `major`, `characteristic-note`, `control-collection`
- **sources:** S14

### Major

- **id:** `major`
- **aliases:** major scale, major key
- **popup:** The bright, familiar "do-re-mi" scale. C major uses only the white keys of the piano, from C to C.
- **definition:** The major scale is the seven-note scale with the step pattern W-W-H-W-W-W-H, the familiar "do-re-mi". On a keyboard, C major uses only the white keys. Music in a major key tends to sound bright or cheerful, though that is a tendency, not a rule. The same word describes chords: a major triad has a major third above its root.
- **in_infinite_flow:** Major is a Collection option with the same notes as Ionian, but it is planned as a tonal key: its chords follow tonic, predominant and a final degree-5 arrival.
- **related:** `ionian`, `minor`, `scale`, `key`, `chord-quality`, `control-collection`
- **sources:** S14

### Maqam

- **id:** `maqam`
- **aliases:** makam, maqamat (plural)
- **popup:** An Arabic melodic mode: a set of notes built from small groups, with its own path, focal notes and intonation.
- **definition:** A maqam (plural maqamat) is the melodic system of Arabic music. Like a Western mode it has a set of notes, but it also carries habits: which note to start from, which notes to stress, how to move from the lower note group (jins) to the upper ones, and how to tune notes that fall between the piano keys. Hijaz, Rast and Bayati are among the best known. Performers often modulate from one maqam to another within a piece.
- **in_infinite_flow:** Not built; style atlas research: the twelve-note generator can only approximate a maqam, rounding its quarter tones; Hijaz comes closest (docs/music/styles/folk-and-world.md).
- **related:** `mode`, `jins`, `quarter-tone`, `phrygian-dominant-scale`, `raga`
- **sources:** S397, S398, S399, docs/music/styles/folk-and-world.md

### Minor

- **id:** `minor`
- **aliases:** minor scale, minor key
- **popup:** The scale that often sounds sad or serious. A minor uses the white keys from A to A.
- **definition:** A minor scale has a minor third above its home note, which makes it darker than major. Its basic form, natural minor, has the step pattern W-H-W-W-H-W-W, the white keys from A to A. Classical music often raises the 7th note (harmonic minor), or the 6th and 7th on the way up (melodic minor), to strengthen the pull toward home. "Minor" also describes chords with a minor third above the root.
- **in_infinite_flow:** The app's Minor collection is natural minor only, with no raised 6th or 7th. Its degree-5 chord is therefore minor (v), not the major V that classical minor usually uses. It shares its notes with Aeolian but follows the tonal chord cycle.
- **related:** `aeolian`, `major`, `scale`, `key`, `dominant`, `control-collection`
- **sources:** S14, docs/music/harmony-planner-policy.md

### Mixolydian

- **id:** `mixolydian`
- **aliases:** Mixolydian mode
- **popup:** A major-sounding mode with a lowered 7th that gives a bluesy, rock feel: the white keys from G to G.
- **definition:** Mixolydian is the mode of the white keys from G to G, with the step pattern W-W-H-W-W-H-W. It is major with the 7th note a half step lower, which softens the pull toward home and gives a relaxed, bluesy sound common in rock, folk and blues. Jazz players use it over dominant seventh chords. G Mixolydian is G, A, B, C, D, E, F.
- **in_infinite_flow:** Its color degree in the app is 7, the lowered 7th.
- **related:** `mode`, `ionian`, `major`, `characteristic-note`, `control-collection`
- **sources:** S14, S9

### Mode

- **id:** `mode`
- **aliases:** church mode, modal scale
- **popup:** One of seven scales built from the same notes but with a different home note, each with its own mood.
- **definition:** A mode is a scale defined by its own pattern of whole and half steps. The seven common modes, Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian and Locrian, can all be played on the white keys, starting from C, D, E, F, G, A and B respectively. Changing the home note moves where the half steps fall, and that changes the mood. Any mode can start on any note by keeping its step pattern.
- **in_infinite_flow:** The Collection control offers all seven modes by name. For them the app uses a modal plan built around each mode's color degree, instead of the tonal chord cycle used for Major and Minor.
- **related:** `scale`, `ionian`, `dorian`, `phrygian`, `lydian`, `mixolydian`, `aeolian`, `locrian`, `characteristic-note`
- **sources:** S14, S9

### Octatonic scale

- **id:** `octatonic-scale`
- **aliases:** diminished scale, half-whole scale, whole-half scale
- **popup:** An eight-note scale that alternates whole steps and half steps, giving a tense, symmetrical sound.
- **definition:** The octatonic scale has eight notes per octave and alternates whole steps and half steps, for example C, D, E-flat, F, G-flat, A-flat, A, B. Because the pattern repeats every three half steps, there are only three different octatonic scales. Rimsky-Korsakov, Stravinsky and many film composers used it for strange or menacing colours; jazz players know it as the diminished scale.
- **in_infinite_flow:** Not built; style atlas research: the Collection control offers seven-note scales only; the modernist and epic-film entries ask for it (docs/music/styles/art-music.md).
- **related:** `scale`, `whole-tone-scale`, `hexatonic-scale`, `control-collection`
- **sources:** S297, S285, docs/music/styles/art-music.md

### Parallel keys

- **id:** `parallel-keys`
- **aliases:** parallel major, parallel minor, parallel modes
- **popup:** Two keys or modes with the same home note but a different set of notes, like C major and C minor.
- **definition:** Parallel keys share their home note but not their notes. C major and C minor both rest on C, but C minor has three flats. Modes can be parallel too: D Dorian and D Aeolian both rest on D and differ by one note, B in Dorian and B-flat in Aeolian. Switching between parallels keeps the same home and changes the color.
- **in_infinite_flow:** When a doodle never plays the one note that separates two parallel modes, the key and mode suggestion planned for v3.2 (not built) could not tell them apart and might offer either.
- **related:** `relative-keys`, `key`, `mode`, `major`, `minor`, `characteristic-note`
- **sources:** S78

### Pentatonic scale

- **id:** `pentatonic-scale`
- **aliases:** pentatonic, major pentatonic, minor pentatonic
- **popup:** A five-note scale with no half steps. It is easy to improvise with because almost every note fits the chords.
- **definition:** A pentatonic scale has five notes per octave instead of seven. The two common ones leave out the two notes of the major or minor scale that form half steps: C major pentatonic is C, D, E, G, A, and A minor pentatonic is A, C, D, E, G, the same notes from another starting point. With no half steps, few notes clash with the chords, which is why blues, rock, folk and pop players often learn to improvise with it first.
- **in_infinite_flow:** Not available. Every collection in the app has seven notes; Dorian and Aeolian contain all of the minor pentatonic, and Major and Mixolydian all of the major pentatonic, plus two more notes.
- **related:** `scale`, `blues-scale`, `dorian`, `mixolydian`, `control-collection`
- **sources:** S100, src/domain/controls/generation-controls.ts

### Phrygian

- **id:** `phrygian`
- **aliases:** Phrygian mode
- **popup:** A minor-sounding mode with a lowered 2nd note that gives a dark, Spanish or flamenco flavor: the white keys from E to E.
- **definition:** Phrygian is the mode of the white keys from E to E, with the step pattern H-W-W-W-H-W-W. It is minor with the 2nd note a half step lower, just a half step above home, which gives it a dark, tense and exotic sound often linked with flamenco and some metal. Flamenco, though, often raises the 3rd over the home chord (the "Phrygian dominant" sound), so it is not plain Phrygian. E Phrygian is E, F, G, A, B, C, D.
- **in_infinite_flow:** Its color degree in the app is 2, the lowered 2nd.
- **related:** `mode`, `aeolian`, `locrian`, `characteristic-note`, `control-collection`
- **sources:** S14

### Phrygian dominant scale

- **id:** `phrygian-dominant-scale`
- **aliases:** Freygish, Spanish Phrygian, Hijaz scale
- **popup:** The Phrygian mode with a major third: 1, ♭2, 3, 4, 5, ♭6, ♭7. Called Freygish in klezmer and close to maqam Hijaz.
- **definition:** The Phrygian dominant scale is the Phrygian mode with its third raised: on E, the notes E, F, G-sharp, A, B, C, D. The step from F to G-sharp is an augmented second, which gives the scale its strong, "Eastern" flavour. It is the fifth mode of harmonic minor. Klezmer calls it Freygish, Arabic music uses a closely related maqam Hijaz, and flamenco melodies over the Andalusian cadence often use it.
- **in_infinite_flow:** Not built; style atlas research: the Collection control has no such scale yet; the klezmer, flamenco and maqam entries ask for it (docs/music/styles/folk-and-world.md).
- **related:** `phrygian`, `harmonic-minor`, `augmented-second`, `maqam`, `andalusian-cadence`, `control-collection`
- **sources:** S378, S377, docs/music/styles/folk-and-world.md

### Raga

- **id:** `raga`
- **aliases:** rāga, raag
- **popup:** An Indian melodic framework: allowed notes, important notes, typical phrases and ornaments, all together.
- **definition:** A raga is the melodic framework of Indian classical music. It is more than a scale: it fixes which notes may be used going up and coming down, which notes are most important (vadi and samvadi), characteristic phrases (pakad) that identify it, and how notes are ornamented. Performers improvise within a raga for a long time, often over a rhythmic cycle (tala). Hindustani music groups ragas by parent scales called thaats.
- **in_infinite_flow:** Not built; style atlas research: a seeded four-bar phrase can only sketch a raga: its note set, focal notes and a stored phrase or two (docs/music/styles/folk-and-world.md).
- **related:** `mode`, `scale`, `tala`, `gamaka`, `maqam`, `characteristic-note`
- **sources:** S401, S404, docs/music/styles/folk-and-world.md

### Relative keys

- **id:** `relative-keys`
- **aliases:** relative major, relative minor, relative modes
- **popup:** Two keys or modes that use the very same notes but rest on a different home note, like C major and A minor.
- **definition:** Relative keys share all their notes but not their home note. C major and A minor both use only the white keys; C sounds like home in one and A in the other, and they share a key signature. The idea extends to modes: C Ionian, D Dorian, E Phrygian, F Lydian, G Mixolydian, A Aeolian and B Locrian are all relatives. Which one you hear depends on where the melody settles.
- **in_infinite_flow:** Telling relatives apart is the hard part of the key and mode suggestion planned for v3.2 (not built): a doodle's notes can fit seven relatives, and only clues such as the first, last and longest notes point to one.
- **related:** `parallel-keys`, `key`, `mode`, `key-signature`, `tonal-center`, `key-finding`
- **sources:** S78

### Scale

- **id:** `scale`
- **aliases:** none
- **popup:** A set of notes arranged in order from low to high: the building blocks of a melody.
- **definition:** A scale is a set of notes listed in order of pitch, usually from a home note up to the same note an octave higher. Its pattern of whole and half steps is what makes it major, minor or one of the modes: C major goes C, D, E, F, G, A, B, C. Melodies and chords mostly draw on the notes of one scale, and practicing scales trains the fingers for them.
- **in_infinite_flow:** The Collection control chooses the scale (or mode) that the phrase's notes and chords come from.
- **related:** `mode`, `key`, `major`, `minor`, `scale-degree`, `control-collection`
- **sources:** S14, S15

### Scale degree

- **id:** `scale-degree`
- **aliases:** degree
- **popup:** A note's position in the scale, counted from the home note: the home note is 1, the next is 2, and so on up to 7.
- **definition:** A scale degree is a note's position in a scale, counted up from the home note, which is 1. In C major, C is 1, D is 2, E is 3, and so on up to B, which is 7. Because it names a position, not a letter, "degree 5" is G in C major but D in G major. Theory books often write degrees with a small caret above the number.
- **in_infinite_flow:** The app's open endings are built on degree 5, and a phrase's last note is never degree 1.
- **related:** `tonic`, `dominant`, `roman-numeral`, `scale`, `open-ending`
- **sources:** S14

### Slendro and pelog

- **id:** `slendro-and-pelog`
- **aliases:** slendro, pelog, laras
- **popup:** The two tuning families of Indonesian gamelan: slendro with five nearly equal steps, pelog with seven unequal ones.
- **definition:** Gamelan music uses two tuning systems. Slendro divides the octave into five steps of nearly equal size; pelog has seven unequal steps, of which a piece usually uses a five-note subset. Neither matches the piano's twelve notes, and each gamelan set is tuned in its own way, so Western notation and piano versions are only approximations.
- **in_infinite_flow:** Not built; style atlas research: the gamelan entry can only round these tunings to the nearest piano notes, a pentatonic sketch (docs/music/styles/folk-and-world.md).
- **related:** `gamelan`, `pentatonic-scale`, `scale`, `quarter-tone`
- **sources:** S410, docs/music/styles/folk-and-world.md

### Tonal center

- **id:** `tonal-center`
- **aliases:** tonic note, home note, key center, tonal centre
- **popup:** The home note of a piece or scale: the note where the music feels it could rest.
- **definition:** The tonal center is the note that feels like home in a passage, the one everything else seems to relate to and lead back toward. In C major and in C Dorian alike it is C. It is the same idea as the tonic note, but the term is used more widely, so that it also covers modes and music that is not strictly major or minor.
- **in_infinite_flow:** The Written key control sets it, in your instrument's written pitch; the app converts it to concert pitch before generating. Written C on tenor saxophone, for example, means a concert B-flat tonal center.
- **related:** `tonic`, `key`, `concert-pitch`, `written-pitch`, `control-written-key`
- **sources:** S14

### Whole-tone scale

- **id:** `whole-tone-scale`
- **aliases:** whole-tone collection
- **popup:** A six-note scale made only of whole steps; it has no clear home note and sounds vague and dreamlike.
- **definition:** The whole-tone scale divides the octave into six equal whole steps, for example C, D, E, F-sharp, G-sharp, A-sharp. Since every step is the same, no note stands out as home, and the only chords it contains are augmented triads. There are just two different whole-tone scales. Debussy used it for misty, floating passages, and film music uses it for dream sequences.
- **in_infinite_flow:** Not built; style atlas research: the Collection control offers seven-note scales only; the Impressionism entry asks for it (docs/music/styles/art-music.md).
- **related:** `scale`, `hexatonic-scale`, `octatonic-scale`, `whole-step`, `control-collection`
- **sources:** S287, S285, docs/music/styles/art-music.md

## Styles

### Boogie-woogie

- **id:** `boogie-woogie`
- **aliases:** boogie, boogie-woogie bass, eight to the bar
- **popup:** A driving blues piano style with a repeated eighth-note bass pattern in the left hand, moved with the chords.
- **definition:** Boogie-woogie is a blues piano style that became a craze in the late 1930s and the 1940s. The left hand plays a repeated eighth-note pattern ("eight to the bar"), usually on the twelve-bar blues, moving it to each new chord, while the right hand plays riffs and rhythmic figures above. Its energetic shuffle passed into rhythm and blues and early rock and roll.
- **in_infinite_flow:** Not built; style atlas research: the boogie-woogie entry asks for the left-hand pattern as a stored bass figure (docs/music/styles/jazz-blues-soul.md).
- **related:** `twelve-bar-blues`, `shuffle`, `riff`, `walking-bass`
- **sources:** S318, docs/music/styles/jazz-blues-soul.md

### Boom bap

- **id:** `boom-bap`
- **aliases:** none
- **popup:** A hip-hop drum style with a hard kick ("boom") and a sharp snare ("bap") on beats 2 and 4, over a sampled loop.
- **definition:** Boom bap is a style of hip-hop production named after its drum sound: a heavy kick drum ("boom") and a cracking snare on beats 2 and 4 ("bap"). Producers built beats from short loops sampled from vinyl records, with the drum machine's swing nudging off-beats late. It defined East Coast hip-hop of the late 1980s and 1990s.
- **in_infinite_flow:** Not built; style atlas research: without drums and samples a melodic line gives only a hint of it; the style lives in v4's planned drums (docs/music/styles/popular-electronic-game.md).
- **related:** `backbeat`, `groove`, `swing`
- **sources:** S352, docs/music/styles/popular-electronic-game.md

### Bossa nova

- **id:** `bossa-nova`
- **aliases:** bossa
- **popup:** A gentle, syncopated Brazilian style from the late 1950s, played without swing, with rich jazz-like chords.
- **definition:** Bossa nova is a Brazilian style that began in Rio de Janeiro in the late 1950s. Its guitar pattern plays bass notes on the beats while the chords fall partly between them, giving a light, swaying syncopation. Unlike jazz, its eighth notes are played evenly, without swing, and its chords are often sevenths and richer.
- **in_infinite_flow:** Not a preset in v3.1: without its rhythm pattern and chords, settings alone give only a thin imitation (docs/music/preset-catalogue.md). Its syncopation and even eighths are within reach of the controls.
- **related:** `syncopation`, `swing`, `seventh-chord`, `anticipation`
- **sources:** S112

### Chiptune

- **id:** `chiptune`
- **aliases:** 8-bit music, chip music
- **popup:** Music made with, or imitating, the sound chips of old game consoles and home computers: bleepy square waves and quick arpeggios.
- **definition:** Chiptune is music made with the sound chips of early game consoles and computers, or in imitation of them. Those chips had very few channels and simple waveforms: the NES had two pulse waves, a triangle wave, a noise channel and a sample channel. Composers used fast arpeggios to suggest chords on one channel and looped short sections. The style is defined more by its sound than by any harmony.
- **in_infinite_flow:** Not built; style atlas research: the chiptune entry needs pulse-wave timbres and fast arpeggios from v4's system voices; its melodies are close to what the app writes today (docs/music/styles/popular-electronic-game.md).
- **related:** `pulse-wave`, `arpeggio`, `timbre`, `overworld-theme`
- **sources:** S361, S362, S363, docs/music/styles/popular-electronic-game.md

### Chorale

- **id:** `chorale`
- **aliases:** hymn tune, four-part chorale
- **popup:** A hymn tune harmonised in four voices, usually one chord per melody note, as in Bach's chorales.
- **definition:** A chorale is a Lutheran hymn tune. Composers such as J. S. Bach harmonised chorales for four voices (soprano, alto, tenor, bass), usually with a new chord on almost every note of the slow, steady melody, and with a clear cadence at the end of each line. Four-part chorale writing is still the standard exercise for learning harmony and voice leading.
- **in_infinite_flow:** Not built; style atlas research: the chorale entry asks for four-part, one-chord-per-note backing and closed line endings (docs/music/styles/art-music.md).
- **related:** `homophony`, `voice-leading`, `harmonic-rhythm`, `cadence`, `fermata`, `picardy-third`
- **sources:** S304, S305, S143, docs/music/styles/art-music.md

### Gamelan

- **id:** `gamelan`
- **aliases:** gamelan orchestra
- **popup:** An Indonesian ensemble of tuned gongs, metallophones and drums, playing layered parts in long cycles.
- **definition:** A gamelan is a traditional ensemble from Java and Bali, made mostly of tuned bronze gongs and metallophones, with drums and sometimes flutes, strings and voices. A core melody (balungan) is played in several versions at different speeds at once, while gongs of different sizes mark the cycle (colotomic structure). In Balinese gamelan, pairs of players split fast figures between them (kotekan, a kind of hocket).
- **in_infinite_flow:** Not built; style atlas research: the twelve-note generator can only give a sketch, with rounded tunings and short cycles (docs/music/styles/folk-and-world.md).
- **related:** `slendro-and-pelog`, `colotomic-structure`, `hocket`, `heterophony`
- **sources:** S408, S409, S410, docs/music/styles/folk-and-world.md

### Gregorian chant

- **id:** `gregorian-chant`
- **aliases:** plainchant, plainsong, chant
- **popup:** The Roman Catholic Church's unaccompanied Latin song: one melody, no harmony and no fixed beat.
- **definition:** Gregorian chant is the traditional sung prayer of the Roman Catholic Church, in Latin. It is monophonic: one melody, sung in unison, with no harmony or accompaniment, and it flows with the words rather than a regular beat (how its old notation was timed is still debated). Chants range from simple recitation on one note to long, ornate melismas, and they are organised in the eight church modes.
- **in_infinite_flow:** Not built; style atlas research: the chant entry needs a free, unmetered line on a single voice; today's backing and 4/4 grid are its main losses (docs/music/styles/art-music.md).
- **related:** `monophony`, `mode`, `final`, `reciting-tone`, `melisma`, `organum`
- **sources:** S267, S268, S70, docs/music/styles/art-music.md

### Jig

- **id:** `jig`
- **aliases:** double jig, single jig, slip jig
- **popup:** An Irish or Scottish dance tune in 6/8, each beat split in three; the slip jig is in 9/8.
- **definition:** A jig is a lively dance tune from Ireland and Scotland in a compound meter. The double jig, the most common, runs in 6/8 with steady groups of three eighth notes; the single jig mixes long-short (quarter-eighth) pairs; the slip jig is in 9/8, three beats per bar. Like a reel, a jig usually has two eight-bar parts, each played twice, decorated with cuts and rolls.
- **in_infinite_flow:** Not built; style atlas research: the app cannot write 6/8 or 9/8 yet; the jig entry asks for a compound-meter capability (docs/music/styles/folk-and-world.md).
- **related:** `compound-meter`, `reel`, `ornament`, `meter`
- **sources:** S373, S108, docs/music/styles/folk-and-world.md

### March

- **id:** `march`
- **aliases:** military march, march music
- **popup:** Music for marching: a steady two- or four-beat pulse, crisp rhythms, brass and drums, in repeated sections called strains.
- **definition:** A march is music for soldiers or a procession to walk to. It has a steady duple meter (2/4, 2/2, 4/4 or 6/8), often at about 120 beats per minute (funeral marches much slower), with crisp dotted rhythms, brass, woodwinds and snare drum. The form strings together repeated strains, with a trio that often moves to the subdominant key. The bass often plays "oom-pah": a low note on the beat, a chord off it.
- **in_infinite_flow:** Not built; style atlas research: the march entry is close to what the app can do today in 4/4; it asks for an oom-pah backing and longer forms (docs/music/styles/art-music.md).
- **related:** `strain`, `oom-pah`, `fanfare`, `meter`, `dotted-note`
- **sources:** S299, S300, docs/music/styles/art-music.md

### Polska

- **id:** `polska`
- **aliases:** none
- **popup:** A Nordic couple dance in 3/4, often with beats of unequal length, played on fiddles.
- **definition:** The polska is a couple dance from Sweden, Norway and Finland, in 3/4 time. Regional styles divide the beat differently: sixteenth-note, eighth-note and triplet polskas. Many are played with uneven beats, for example with the second beat arriving early, so the bar does not divide into three equal parts. Fiddles lead, sometimes with drone strings such as those of the Norwegian Hardanger fiddle.
- **in_infinite_flow:** Not built; style atlas research: the app writes 4/4 only; the polska entry asks for 3/4 and, for the uneven beats, a microtiming capability (docs/music/styles/folk-and-world.md).
- **related:** `meter`, `waltz`, `drone`, `swing`
- **sources:** S376, docs/music/styles/folk-and-world.md

### Reel

- **id:** `reel`
- **aliases:** none
- **popup:** A fast folk dance tune from Ireland and Scotland, made of running eighth notes played evenly.
- **definition:** A reel is a dance tune in 4/4 or 2/2 from the Irish and Scottish traditions. It runs mostly in eighth notes, played evenly rather than swung, with accents on beats 1 and 3. A tune usually has two eight-bar parts, each played twice, and players decorate it freely with short ornaments such as cuts and rolls.
- **in_infinite_flow:** The built-in preset Reel (spec decision D233) imitates its steady even eighths in four-bar phrases. Its key and mode restriction is Mixolydian or Dorian, in any key: choosing it keeps Mixolydian or Dorian if one is already selected, and otherwise moves to Mixolydian. Reels are often in major too; a player who wants that chooses Ionian, which leaves the preset (the selection becomes Custom). The ornaments and the two-part form are not available.
- **related:** `eighth-note`, `phrase`, `mixolydian`, `dorian`, `ornament`, `built-in-preset`, `key-and-mode-restriction`
- **sources:** S106, S107, S108, specs/archive/v3/presets.md

### Waltz

- **id:** `waltz`
- **aliases:** valse, jazz waltz, Viennese waltz
- **popup:** A dance in 3/4 with a strong first beat: a bass note on beat 1 and chords on beats 2 and 3.
- **definition:** A waltz is a dance in triple meter (3/4), usually with one chord per bar: the bass plays the root on beat 1 and the upper notes of the chord follow on beats 2 and 3 ("oom-pah-pah"). Slow waltzes run at about 90 beats per minute; the Viennese waltz of the Strauss family is much faster, about 180. Jazz musicians also play swung "jazz waltzes" in 3/4.
- **in_infinite_flow:** Not built; style atlas research: the app writes 4/4 only; the waltz and jazz-waltz entries ask for 3/4 and an oom-pah-pah backing (docs/music/styles/art-music.md, docs/music/styles/jazz-blues-soul.md).
- **related:** `meter`, `oom-pah`, `hemiola`, `polska`
- **sources:** S301, S302, S327, docs/music/styles/art-music.md, docs/music/styles/jazz-blues-soul.md

## Style and identity

### Fanfare

- **id:** `fanfare`
- **aliases:** flourish, victory fanfare
- **popup:** A short, bright, festive burst of music, traditionally for trumpets, that announces someone or celebrates a victory.
- **definition:** A fanfare is a short, brilliant flourish, traditionally played by trumpets and other brass, often with drums, to announce an important person or event. Fanfares tend to use the notes of a major chord, repeated notes and crisp rhythms, which brass instruments play easily and which sound bold. Video games borrowed the idea: many role-playing games play the same short victory fanfare after every won battle, until it becomes a signature of the series.
- **in_infinite_flow:** Endgame groundwork, not built: the research proposes a victory event as a fixed fanfare-like stinger, the one place where exact repetition is the point (docs/music/musical-identity.md).
- **related:** `stinger`, `arpeggio`, `leitmotif`, `musical-topic`
- **sources:** S223, S210, docs/music/musical-identity.md

### Idiolect

- **id:** `idiolect`
- **aliases:** personal style, personal voice
- **popup:** One musician's personal style: the habits that make them recognisable inside a style they share with others.
- **definition:** An idiolect is one person's own way of making music, a word borrowed from linguistics, where it means one person's way of speaking. Two bebop saxophonists share a style, yet each has favourite phrases, rhythms and sounds that let fans recognise them. Jazz players build an idiolect by learning stock phrases (licks) from others, then reshaping them into a voice of their own; a study of Charlie Parker's solos found that much of each solo was made of recurring patterns.
- **in_infinite_flow:** Endgame groundwork, not built: the research reads a character's musical identity as an idiolect, personal habits layered over a style rather than a style of its own (docs/music/musical-identity.md, docs/music/generation-breadth-review.md).
- **related:** `musical-style`, `lick`, `signature-figure`, `musical-identity`
- **sources:** S196, S197, S198, S200, docs/music/musical-identity.md

### Musical style

- **id:** `musical-style`
- **aliases:** dialect
- **popup:** The recognisable habits shared by a group, a period or a place, such as bebop or Baroque music.
- **definition:** A style is a set of musical habits that repeat often enough to be recognised: which scales and chords, which rhythms, which ornaments, which instruments. The music theorist Leonard B. Meyer described style as patterns that come from choices made within limits, and nested it in levels: the style of a period or culture, the dialect of a group or school inside it (French Baroque), one composer's own idiom, and the habits of a single piece. In everyday speech "idiom" often means a shared style too.
- **in_infinite_flow:** The Preset box uses style names (Jazz, Bebop, Pop song, Reel and Modal (Dorian); see Built-in preset), but a preset only chooses settings within one fixed vocabulary, so it is not a style in full. Style packs and character identities are research proposals (docs/music/generation-breadth-review.md, docs/music/musical-identity.md); endgame groundwork, not built.
- **related:** `idiolect`, `musical-topic`, `built-in-preset`, `musical-identity`, `reel`, `bossa-nova`
- **sources:** S195, S196, S197, docs/music/generation-breadth-review.md, docs/music/musical-identity.md

### Musical topic

- **id:** `musical-topic`
- **aliases:** topic, topos
- **popup:** A musical type with an agreed meaning, such as horn calls for a hunt, or drones and a lilting rhythm for the countryside.
- **definition:** A topic is a familiar musical type that listeners connect with a meaning. Music theorists first described topics in 18th-century music: the pastoral (drones, gentle lilting rhythms) suggests shepherds and countryside; the military (drums, fanfares) suggests soldiers; the hunt (horn calls) suggests hunting. Film and game music use topics too. A study of "winter" music in video games found it marked by heavy reverb, bell-like metallic sounds and arpeggios, not by major or minor mode.
- **in_infinite_flow:** Endgame groundwork, not built: the research suggests a location's identity rests mostly on topic-like markers, its timbres, effects and texture, more than on its mode (docs/music/musical-identity.md).
- **related:** `musical-style`, `timbre`, `audio-effect`, `drone`, `fanfare`
- **sources:** S221, S222, docs/music/musical-identity.md

### Overworld theme

- **id:** `overworld-theme`
- **aliases:** field theme, field music, overworld music
- **popup:** In role-playing games, the music that plays while the hero travels between towns and dungeons.
- **definition:** In role-playing games (RPGs) the overworld is the large map that connects towns, dungeons and other places, and the overworld or field theme plays while the player travels across it. It is heard for hours, so composers usually make it adventurous but not tiring, with a broad, memorable melody that loops smoothly. Since Dragon Quest, Japanese RPGs give the overworld its own theme alongside town, dungeon and battle music.
- **in_infinite_flow:** Not built; style atlas research: the overworld entry describes it as one context in the game-music context system (docs/music/styles/popular-electronic-game.md).
- **related:** `musical-topic`, `leitmotif`, `fanfare`, `chiptune`
- **sources:** S364, S92, docs/music/styles/popular-electronic-game.md

## Texture and arranging

### Accompaniment

- **id:** `accompaniment`
- **aliases:** backing, accompanying parts
- **popup:** The music that supports a main melody: for example a bass line and chords played under a singer or a soloist.
- **definition:** Accompaniment is everything that plays alongside a main melody to support it: a bass line, chords, a rhythm part, short answering phrases. It sets the harmony and the beat and fills out the sound, while the melody stays the part a listener follows. The same tune can have very different accompaniments: a strummed guitar, a jazz trio, a full orchestra.
- **in_infinite_flow:** The session backing (the Backing toggle) is a simple accompaniment: a bass note and a block chord at every chord change and every downbeat, worked out from the phrase's harmony alone. v4 plans side instruments with distinct roles (not built).
- **related:** `melody`, `harmony`, `chord`, `accompaniment-role`, `texture`, `voice`
- **sources:** S124, S126, src/domain/backing/backing-renderer.ts, specs/versions/v4/README.md

### Accompaniment role

- **id:** `accompaniment-role`
- **aliases:** role, foundation, highlighting, contrasting, responding
- **popup:** The job an accompanying part does for the melody: support it, reinforce it, contrast with it or answer it.
- **definition:** An accompaniment role is the job one part does, as opposed to the instrument that plays it: a saxophone can accompany and a piano can lead. Arrangers name roles by technique, such as doubling, counter-melody, pad, comping or fill. Grouped by how they relate to the melody, roles fall into four families: foundation (bass, chords, groove), highlighting (reinforcing the melody), contrasting (a second, independent line) and responding (answering the melody in its gaps).
- **in_infinite_flow:** Planned for v4 (not built). The owner's three words, highlighting, contrasting and responding, are the v4 direction; the research adds a fourth family, foundation, for the bass, chords and drums (docs/music/arranging-and-roles.md).
- **related:** `accompaniment`, `doubling`, `counter-melody`, `fill`, `comping`, `system-voice`, `functional-layer`
- **sources:** S127, S128, docs/music/arranging-and-roles.md, docs/music/accompaniment-systems.md, specs/versions/v4/README.md

### Alberti bass

- **id:** `alberti-bass`
- **aliases:** none
- **popup:** A broken-chord accompaniment playing the lowest, highest, middle, then highest note of a chord, over and over.
- **definition:** An Alberti bass is a left-hand accompaniment pattern for keyboard that breaks a chord into a steady stream of notes in the order lowest, highest, middle, highest: C–G–E–G for C major. It is named after the Italian composer Domenico Alberti and is a hallmark of the Classical style, heard in many Mozart and Haydn piano sonatas.
- **in_infinite_flow:** Not built; style atlas research: the Classical entry asks for it as an accompaniment pattern in v4's backing (docs/music/styles/art-music.md).
- **related:** `arpeggio`, `accompaniment`, `homophony`, `chord`
- **sources:** S278, S277, docs/music/styles/art-music.md

### Arrangement

- **id:** `arrangement`
- **aliases:** arranging, chart
- **popup:** A version of a piece prepared for particular players: who plays what, and what is added or changed.
- **definition:** An arrangement takes an existing tune and prepares it for a group of players. The arranger may change the chords, add an introduction or an ending, and decide which instrument plays the melody, which ones accompany it, and how. Orchestration is the narrower part of that job: choosing the instrument for each note. Jazz bands also play head arrangements, worked out by ear in rehearsal rather than written down.
- **in_infinite_flow:** The generator already writes a melody with its chords for each phrase, like a lead sheet. v4's accompaniment would arrange that phrase for a few side instruments (planned, not built).
- **related:** `accompaniment`, `lead-sheet`, `accompaniment-role`, `head`, `texture`
- **sources:** S120, S121, S122

### Basso continuo

- **id:** `basso-continuo`
- **aliases:** continuo, figured bass, thoroughbass
- **popup:** The Baroque accompaniment: a written bass line, with chords that a keyboard player fills in above it.
- **definition:** Basso continuo ("continuous bass") is the standard accompaniment of Baroque music. The composer writes only the bass line, often with small figures (numbers) showing which chords to play. A cello or bassoon plays the bass, and a harpsichord, organ or lute "realises" the chords above it, improvising their exact layout. It runs under almost every Baroque piece, from solo sonatas to operas.
- **in_infinite_flow:** Not built; style atlas research: the Baroque entry maps it onto v4's bass and chord roles (docs/music/styles/art-music.md).
- **related:** `accompaniment`, `chord-inversion`, `walking-bass`, `homophony`
- **sources:** S272, docs/music/styles/art-music.md

### Break

- **id:** `break`
- **aliases:** solo break
- **popup:** A bar or two where the band stops completely and one player fills the gap alone.
- **definition:** A break is a short stop of the whole band, usually one or two bars, during which a soloist (or the drummer) plays alone before the band comes back in. Early jazz used breaks at the ends of sections to show off a player; rock, funk and hip-hop use them too (the hip-hop "breakbeat" began as a looped drum break). A band that keeps playing short hits instead is playing stop time.
- **in_infinite_flow:** Not built; style atlas research: the research proposes a stop-time-and-breaks capability for the accompaniment (docs/music/styles/jazz-blues-soul.md).
- **related:** `stop-time`, `fill`, `accompaniment`, `rest`
- **sources:** S321, docs/music/styles/jazz-blues-soul.md

### Collective improvisation

- **id:** `collective-improvisation`
- **aliases:** polyphonic improvisation
- **popup:** Several players improvising at the same time around one tune, each with their own part, as in New Orleans jazz.
- **definition:** In collective improvisation several musicians improvise together instead of taking turns. In New Orleans jazz (Dixieland), the trumpet plays the tune with variations, the clarinet weaves fast lines above it, and the trombone adds slides and lines below, while the rhythm section keeps time. The result is a lively polyphony that still keeps the melody in front.
- **in_infinite_flow:** Not built; style atlas research: the New Orleans entry maps it onto several of v4's roles at once (lead, counter-melody, bass line), and lists true collective improvisation as a loss (docs/music/styles/jazz-blues-soul.md).
- **related:** `polyphony`, `counter-melody`, `accompaniment-role`, `call-and-response`
- **sources:** S321, docs/music/styles/jazz-blues-soul.md

### Colotomic structure

- **id:** `colotomic-structure`
- **aliases:** colotomy
- **popup:** In gamelan, gongs of different sizes marking nested points of a repeating cycle, the largest gong ending it.
- **definition:** Colotomic structure is the way gamelan music marks time. A cycle of beats is punctuated by gongs of different sizes, each on its own schedule: small gongs often, middle ones less often, and the largest gong once, at the end of the cycle, which is also its most important point. Cycles have fixed lengths, such as 16 beats (lancaran) or 32 (ladrang). Melodies are heard as heading towards the gong stroke.
- **in_infinite_flow:** Not built; style atlas research: the gamelan entry proposes it as a percussion pattern over a long cycle (docs/music/styles/folk-and-world.md).
- **related:** `gamelan`, `meter`, `downbeat`, `timeline`
- **sources:** S408, docs/music/styles/folk-and-world.md

### Comping

- **id:** `comping`
- **aliases:** comp, to comp
- **popup:** In jazz, the chords a pianist or guitarist plays behind a soloist: short, well placed, and leaving room.
- **definition:** Comping (from "accompanying") is how a jazz pianist, guitarist or organist plays the chords behind a soloist. Instead of striking a chord on every beat, a comper places short chords at chosen moments, often off the beat and in the soloist's pauses, and reacts to what the soloist plays. The chords usually keep their third and seventh and often leave the root to the bass player. Some players comp busily, others very sparsely.
- **in_infinite_flow:** Not built. The backing's block chords attack on every chord change and every downbeat, closer to old-style on-the-beat accompaniment. Comping is a candidate role for v4.
- **related:** `accompaniment`, `voicing`, `guide-tone`, `syncopation`, `offbeat`, `chord`
- **sources:** S131, S141

### Counter-melody

- **id:** `counter-melody`
- **aliases:** countermelody, counterline, descant (when above the melody)
- **popup:** A second melody played at the same time as the main one: less prominent, but a real tune of its own.
- **definition:** A counter-melody is a second melody that plays against the main one. It is quieter or less prominent, but it has its own shape and rhythm, so the music gains a second line to follow. It sounds clearest when it moves while the main melody holds a note or rests, and holds while the main melody moves. Placed above the main melody it is called a descant. Marches often give one to the trombones or horns.
- **in_infinite_flow:** Not built. It is the standard name for the owner's "contrasting" role, planned for v4, and the hardest role to generate well.
- **related:** `melody`, `polyphony`, `accompaniment-role`, `types-of-motion`, `voice-leading`
- **sources:** S130, S144, S150

### Doubling

- **id:** `doubling`
- **aliases:** unison, octave doubling
- **popup:** Two instruments playing the same line together, at the same pitch or an octave apart, to make it stronger.
- **definition:** Doubling means giving the same line to a second instrument, either at exactly the same pitch (in unison) or an octave higher or lower. It makes the line louder, richer in tone and easier to hear, so orchestrators use it to make a melody stand out from its accompaniment. A doubled line is heard as one thickened voice, not as two independent ones.
- **in_infinite_flow:** Not built. Doubling the player's line, or only its key notes, is one form of the "highlighting" role planned for v4.
- **related:** `octave`, `accompaniment-role`, `parallel-thirds-and-sixths`, `heterophony`, `parallel-fifths-and-octaves`
- **sources:** S129, S147

### Drone

- **id:** `drone`
- **aliases:** drone note
- **popup:** One note, or a note and its fifth, sounding the whole time under the music, like the hum of bagpipes.
- **definition:** A drone is a note that keeps sounding through a whole piece or a long section, often the home note alone or with the note a fifth above it (an open fifth). Bagpipes and the Indian tanpura make drones. Because it never moves, a drone fixes the home note firmly, and every melody note is heard against it. Open-fifth drones often give music a rustic or ancient feel.
- **in_infinite_flow:** Not built. A drone would suit the modal collections, where a strong home note is what makes the mode audible.
- **related:** `pedal-point`, `tonic`, `tonal-center`, `mode`, `interval`
- **sources:** S135

### Fill

- **id:** `fill`
- **aliases:** drum fill
- **popup:** A short burst of music played in a gap, when the melody pauses, to keep things moving or to mark a phrase's end.
- **definition:** A fill is a short passage played where the melody stops for a moment, between two phrases or at the end of a section. It keeps the music moving and often signals that something new is coming. Drummers play fills, but so do bass players, guitarists, keyboard players and horn sections. Unlike a riff, a fill is not repeated throughout: each one is a small one-off answer to its gap.
- **in_infinite_flow:** Not built. Filling the generated phrase's rests is the cheapest form of the "responding" role studied for v4; the Silence density control would then set how much room fills get.
- **related:** `rest`, `riff`, `call-and-response`, `accompaniment-role`, `phrase`
- **sources:** S137

### Functional layer

- **id:** `functional-layer`
- **aliases:** layer, novelty layer
- **popup:** A way to describe a pop arrangement by the job each part does: beat, bass, chords filling the middle, and melody.
- **definition:** In pop music, parts are often described by their job rather than their instrument. The usual layers are the beat (drums and percussion keeping time), the bass (the lowest part, close to the chord roots), the harmonic filler (keyboards or guitars filling the middle with chords) and the melody (the voice or lead instrument on top). An optional novelty layer answers or interrupts the melody in its gaps, with a sound that stands out.
- **in_infinite_flow:** Not built. The layers are a useful map for v4's roles; today's backing covers the bass and a simple harmonic filler.
- **related:** `accompaniment`, `texture`, `accompaniment-role`, `groove`, `pad`
- **sources:** S127, S128

### Guide tone

- **id:** `guide-tone`
- **aliases:** guide tones, guide-tone line
- **popup:** The third and seventh of a chord: the two notes that say most about what kind of chord it is.
- **definition:** A chord's guide tones are its third and its seventh. The third tells major from minor, and the seventh tells which kind of seventh chord it is, so these two notes outline the harmony with very little. Joining each chord's guide tone to the nearest guide tone of the next chord makes a guide-tone line: a slow, smooth line that moves mostly by step. Jazz players use it to comp, to write background lines and to practise improvising.
- **in_infinite_flow:** Not built. The app's chords are triads, so each chord's third is known but its seventh would have to be worked out from the scale.
- **related:** `seventh-chord`, `triad`, `chord-tone`, `comping`, `voice-leading`
- **sources:** S131, S153

### Heterophony

- **id:** `heterophony`
- **aliases:** none
- **popup:** Several players playing the same tune at once, each decorating it a little differently.
- **definition:** Heterophony is a texture in which two or more players perform the same melody at the same time, but each varies it slightly: one adds an ornament, another turns a run into one long note, or the rhythms differ a little. The result sounds like one tune with a shimmering, slightly blurred edge. It is common in folk music and in Indonesian gamelan, where one melody is played in several versions at once.
- **in_infinite_flow:** Not built. A voice that plays the player's line with ornaments added or passing notes removed is one form of "highlighting" studied for v4.
- **related:** `texture`, `monophony`, `doubling`, `ornament`, `embellishment`
- **sources:** S124, S125

### Hocket

- **id:** `hocket`
- **aliases:** hoquetus, interlocking parts
- **popup:** One melody shared between two or more players who take turns, each playing only some of its notes.
- **definition:** In a hocket a melody is split between players: one plays a note, the other the next, so neither part makes sense alone but together they form a continuous line. Medieval European music used it, and it is central to Andean panpipe playing (siku, where two players share the notes of one scale) and to Balinese gamelan, where interlocking parts are called kotekan.
- **in_infinite_flow:** Not built; style atlas research: the huayno and gamelan entries propose an interlocking role between the player and a system voice (docs/music/styles/folk-and-world.md).
- **related:** `call-and-response`, `accompaniment-role`, `gamelan`, `texture`
- **sources:** S393, S409, docs/music/styles/folk-and-world.md

### Homophony

- **id:** `homophony`
- **aliases:** melody and accompaniment, homorhythm
- **popup:** Several parts moving together in chords; most often one clear melody over an accompaniment.
- **definition:** Homophony is a texture in which the parts move together to make chords rather than as separate tunes. In homorhythm all the parts share one rhythm, as in a hymn. More often one part is a clear melody and the others accompany it with their own, usually simpler, rhythm: this melody-and-accompaniment texture is the sound of most pop songs, a voice over guitar chords.
- **in_infinite_flow:** A session with the backing on is melody and accompaniment: the player's line over a bass and block chords that attack together.
- **related:** `texture`, `polyphony`, `monophony`, `accompaniment`, `melody`
- **sources:** S124, S126

### Imitation

- **id:** `imitation`
- **aliases:** echo, canon, round
- **popup:** A second part repeating a figure the first part just played, a little later, like an echo.
- **definition:** Imitation happens when one part plays a figure and another part repeats it shortly afterwards, often at a different pitch. A short, softer repeat is an echo. A canon is strict imitation: the follower copies the leader's whole line, note for note, at a fixed delay. A round, such as "Frère Jacques", is a canon in which everyone sings the same tune, entering one after another.
- **in_infinite_flow:** Not built. Echoing the player's last figure in the rest that follows it is a form of the "responding" role studied for v4; a full canon is much harder to fit.
- **related:** `call-and-response`, `motif`, `transposition`, `polyphony`, `accompaniment-role`
- **sources:** S140

### Monophony

- **id:** `monophony`
- **aliases:** none
- **popup:** A single line of melody with no accompaniment, even when several people play or sing it together.
- **definition:** Monophony is the simplest texture: one melody alone, with no chords or other parts. A solo flute is monophonic, and so is a crowd singing one tune together, because everyone sings the same line; voices an octave apart still count as one line. Plainchant is the classic example.
- **in_infinite_flow:** With the backing off, a session is monophonic: the player's line alone.
- **related:** `texture`, `melody`, `heterophony`, `homophony`, `polyphony`
- **sources:** S124

### Montuno

- **id:** `montuno`
- **aliases:** guajeo, piano montuno
- **popup:** The vamping section of a son or salsa tune, with a repeated sung refrain and a looping, syncopated piano pattern.
- **definition:** In Cuban son and salsa, the montuno is the later, livelier section of a tune, where a short chorus refrain alternates with a lead singer's improvised lines over a repeating chord vamp. The repeating, syncopated figure the piano or tres plays there, locked to the clave, is called a guajeo and is also often called a montuno.
- **in_infinite_flow:** Not built; style atlas research: the son entry asks for a stored, clave-aligned piano pattern in v4's backing (docs/music/styles/folk-and-world.md).
- **related:** `vamp`, `clave`, `call-and-response`, `tumbao`, `riff`
- **sources:** S389, S390, docs/music/styles/folk-and-world.md

### Oom-pah

- **id:** `oom-pah`
- **aliases:** oompah, boom-chick, stride bass
- **popup:** A backing of a low bass note on the strong beats answered by chords on the weak ones: "oom-pah, oom-pah".
- **definition:** Oom-pah is an accompaniment in which a low bass note on the strong beat ("oom") alternates with a chord on the weak beat ("pah"). Brass bands, polkas and marches give the bass to a tuba; ragtime and stride piano play it with the left hand alone, a bass note or octave on beats 1 and 3 and a chord on 2 and 4. In a waltz it becomes "oom-pah-pah".
- **in_infinite_flow:** Not built; style atlas research: the march, waltz and ragtime entries ask for it as a backing pattern (docs/music/styles/art-music.md, docs/music/styles/jazz-blues-soul.md).
- **related:** `accompaniment`, `strong-and-weak-beats`, `march`, `waltz`, `walking-bass`
- **sources:** S300, S319, S320, docs/music/styles/art-music.md, docs/music/styles/jazz-blues-soul.md

### Organum

- **id:** `organum`
- **aliases:** parallel organum
- **popup:** Medieval chant with an added voice, often moving in parallel fourths or fifths: the earliest written harmony in Europe.
- **definition:** Organum is the earliest written form of European polyphony. A second voice is added to a plainchant melody, at first moving in parallel a fourth or a fifth below or above it, usually starting and ending on the same note (a unison). Later forms let the added voice move more freely or hold the chant's notes as a long sustained bass.
- **in_infinite_flow:** Not built; style atlas research: the chant entry proposes a parallel-fifth or fourth voice as a v4 role (docs/music/styles/art-music.md).
- **related:** `gregorian-chant`, `polyphony`, `parallel-fifths-and-octaves`, `drone`, `doubling`
- **sources:** S270, docs/music/styles/art-music.md

### Pad

- **id:** `pad`
- **aliases:** sustained harmony, string pad
- **popup:** Long held chords that make a soft bed of harmony under the melody.
- **definition:** A pad is a part that holds chords for a long time, giving a smooth bed of harmony for the melody to sit on. String sections, organs and synthesizers often play pads. A pad attacks rarely, usually once per chord, so it does not compete with the melody's rhythm. Its notes move to the next chord by the smallest steps possible, keeping any shared notes in place.
- **in_infinite_flow:** Not built. The backing's block chords are struck again on every downbeat; a pad would hold each chord for its whole length instead.
- **related:** `chord`, `accompaniment`, `voicing`, `voice-leading`, `functional-layer`
- **sources:** S127, S154

### Parallel thirds and sixths

- **id:** `parallel-thirds-and-sixths`
- **aliases:** parallel thirds, parallel sixths, harmony line
- **popup:** A second line that follows the melody a third (or a sixth) away, like a harmony singer.
- **definition:** In parallel thirds, a second line copies the melody's rhythm and shape a third below or above it: the sound of a harmony vocal, or of two horns playing together. Staying in the key, the thirds are sometimes major and sometimes minor. Sixths work the same way, since a sixth below is the same note as a third above, an octave lower. Thirds and sixths are consonant, so they can move in parallel freely.
- **in_infinite_flow:** Not built. It is one form of the "highlighting" role studied for v4.
- **related:** `interval`, `doubling`, `parallel-fifths-and-octaves`, `types-of-motion`, `accompaniment-role`
- **sources:** S129, S145

### Pedal point

- **id:** `pedal-point`
- **aliases:** pedal, pedal tone, inverted pedal
- **popup:** One note held or repeated, usually in the bass, while the chords above it change.
- **definition:** A pedal point is a note that stays put, held or repeated, while the harmony above it moves on. It is usually the home note (the tonic) or the fifth note of the scale (the dominant), and usually in the bass; held in the top part it is an inverted pedal. As the chords change, some clash with the pedal, which builds tension and pulls the music back toward home. A pedal that lasts a whole piece is a drone.
- **in_infinite_flow:** Not built. A dominant pedal under a phrase's last measure is one idea studied for v4, to raise expectation under the Tension control's stronger settings.
- **related:** `drone`, `tonic`, `dominant`, `tension-and-resolution`, `harmony`
- **sources:** S134

### Polyphony

- **id:** `polyphony`
- **aliases:** counterpoint (the craft of writing it), contrapuntal texture
- **popup:** Several independent melodies sounding at once, each with its own rhythm, that together make harmony.
- **definition:** Polyphony is a texture of several independent melodic lines played at the same time. Each line has its own shape and rhythm, yet together they make good harmony. A fugue is polyphonic, and so is a jazz front line when trumpet and saxophone improvise separate lines together. Counterpoint is the craft of writing such lines so that each stays easy to follow and they sound well together.
- **in_infinite_flow:** Not built. A counter-melody against the player's line would turn a session's texture toward polyphony.
- **related:** `texture`, `counter-melody`, `homophony`, `voice-leading`, `types-of-motion`
- **sources:** S124, S126

### Skank

- **id:** `skank`
- **aliases:** offbeat chop, chop
- **popup:** Short, damped guitar or keyboard chords on the offbeats, the core of reggae and ska.
- **definition:** In reggae and ska, the skank is the rhythm guitar or keyboard playing short, choked chords on the offbeats, on the "and" of each beat, while the bass and drums hold the beat below. "Skank" is also the name of the dance done to this music.
- **in_infinite_flow:** Not built; style atlas research: the reggae entry asks for it as an offbeat chord pattern in v4's backing (docs/music/styles/popular-electronic-game.md).
- **related:** `offbeat`, `comping`, `stab`, `one-drop`, `groove`
- **sources:** S350, docs/music/styles/popular-electronic-game.md

### Stab

- **id:** `stab`
- **aliases:** hit, kick, orchestra hit
- **popup:** A single short, punchy chord or note that punctuates the music, like an exclamation mark.
- **definition:** A stab is one short, detached chord or note, played with an accent to punctuate the music, such as a horn section's sharp chord or the sampled "orchestra hit" of 1980s pop. Big bands call rhythmic chords like these hits or kicks. Stabs can land with the melody's accents, to underline them, or between them, to answer them. Much of their effect comes from the silence around them.
- **in_infinite_flow:** Not built. Short chords on the player's syncopated notes are one form of the "highlighting" role studied for v4.
- **related:** `chord`, `syncopation`, `accompaniment-role`, `fill`, `offbeat`
- **sources:** S138, S131

### Stinger

- **id:** `stinger`
- **aliases:** sting
- **popup:** A very short burst of music that marks an event, like the "dun dun duuun" when something dramatic happens.
- **definition:** A stinger is a short musical phrase used as punctuation: it marks the end of a scene, a sudden discovery or a climax. Film, television and radio use stingers, and so do video games, where a stinger is played on top of the music already running when something happens in the game, such as an enemy appearing.
- **in_infinite_flow:** Not built. In the endgame vision, a player's action or a game event could trigger a short generated stinger, placed on the next beat or measure so that it never cuts through a note the player is reading.
- **related:** `fill`, `cue`, `leitmotif`, `vertical-layering`, `fanfare`
- **sources:** S161, S181, specs/vision/endgame.md

### Texture

- **id:** `texture`
- **aliases:** musical texture
- **popup:** How the parts playing at the same moment fit together: how many there are, and whether they move together or apart.
- **definition:** Texture describes how the parts sounding at the same time relate to each other: how many there are, how busy they are, and whether they move together or independently. The four classic types are monophony (one line), heterophony (one tune in several varied versions), homophony (parts moving together, most often melody and accompaniment) and polyphony (independent lines). Most pieces change texture as they go, thinning out or thickening.
- **in_infinite_flow:** With the backing on, a session is melody and accompaniment. v4's planned roles would each change the texture: a doubling thickens the melody, a counter-melody adds polyphony, a fill answers in the gaps.
- **related:** `monophony`, `heterophony`, `homophony`, `polyphony`, `accompaniment`, `functional-layer`
- **sources:** S124

### Tumbao

- **id:** `tumbao`
- **aliases:** bass tumbao
- **popup:** The Cuban bass pattern that anticipates the beat: it lands just before beat 3 and on beat 4, and skips the downbeat.
- **definition:** The tumbao is the typical bass pattern of son and salsa. Built on the tresillo, it plays on the "and" of beat 2 and on beat 4 and usually leaves the downbeat empty, so the bass anticipates the next chord instead of confirming the current one. The name also covers the basic conga pattern.
- **in_infinite_flow:** Not built; style atlas research: the son entry asks for it as a stored bass pattern in v4's backing (docs/music/styles/folk-and-world.md).
- **related:** `tresillo`, `clave`, `anticipation`, `montuno`, `walking-bass`
- **sources:** S388, docs/music/styles/folk-and-world.md

### Vertical layering

- **id:** `vertical-layering`
- **aliases:** layering, vertical re-orchestration
- **popup:** Changing game music by adding or removing instrument layers while it plays, to make it calmer or more intense.
- **definition:** Vertical layering is a way to make music adapt to a game. The composer writes several layers that fit together, such as drums, a bass, a string part and a melody, and the game fades layers in or out as the situation changes; more layers usually means more intensity. The other classic technique, horizontal re-sequencing, switches to a different section or piece instead, ideally when the current musical phrase ends.
- **in_infinite_flow:** Not built. Because the app generates notes rather than playing recordings, a layer would be a whole system voice that can enter on any beat, for example when a companion joins the team in the endgame vision.
- **related:** `accompaniment`, `texture`, `stinger`, `system-voice`, `functional-layer`
- **sources:** S159, S180

### Voice

- **id:** `voice`
- **aliases:** part, line
- **popup:** One line of music played by one instrument or singer, such as the melody or the bass line.
- **definition:** A voice, or part, is one line of notes played by one instrument or sung by one singer; musicians use the word for instruments too. A piano piece might have a melody voice on top, a bass voice at the bottom and inner voices in between. Thinking in voices helps describe how a piece is built: how many lines there are and how each one moves.
- **in_infinite_flow:** The player's phrase is one voice. The backing has two, bass and chords (BackingVoice in src/audio/audio-ports.ts); v4 plans more, each with a role.
- **related:** `melody`, `texture`, `voice-leading`, `system-voice`, `accompaniment`
- **sources:** S148, S124, src/audio/audio-ports.ts

### Walking bass

- **id:** `walking-bass`
- **aliases:** walking bass line, four feel, two-feel (the lighter style)
- **popup:** A jazz bass line that steps along in steady quarter notes, one on every beat, outlining the chords.
- **definition:** A walking bass plays one note on every beat, in steady quarter notes, moving mostly by step through chord tones, scale tones and chromatic passing notes, so that it seems to walk from chord to chord. A common recipe puts the chord's root on beat 1 and, on the last beat before a change, an approach note a half step above or below the next root. A lighter style, the two-feel, plays only two notes per measure.
- **in_infinite_flow:** Not built. Today's backing bass plays the chord's root at each chord change and downbeat, and the fifth on beat 3 when one chord fills the measure, close to a two-feel. A walking bass is a candidate foundation role for v4.
- **related:** `approach-note`, `chromatic-approach`, `quarter-note`, `root`, `chord-tone`, `swing`
- **sources:** S132, S133, src/domain/backing/backing-renderer.ts

## Instruments and transposition

### Audio effect

- **id:** `audio-effect`
- **aliases:** effect, effects, reverb, filter, distortion
- **popup:** A treatment that changes how a sound comes out, such as reverb (a room's echo), a filter (duller or brighter) or distortion (gritty).
- **definition:** An audio effect processes a sound after it is made. Reverb adds the echo of a room or a hall; delay repeats the sound a moment later; a filter removes high or low frequencies, making the sound duller or thinner; distortion makes it gritty. Effects do not change which notes are played, only how they sound, so they go together with timbre. Game music uses them heavily: a study of "winter" game music found heavy reverb in most tracks.
- **in_infinite_flow:** The app plays its click and backing without effects today. v4 plans a synth-based sound library with effects (docs/sound-library-survey.md), and the endgame research proposes effects as part of a location's or character's identity, together with timbre what the owner calls "tone" (docs/music/musical-identity.md); endgame groundwork, not built.
- **related:** `timbre`, `musical-topic`, `system-voice`
- **sources:** S222, docs/sound-library-survey.md, docs/music/musical-identity.md

### B-flat instrument

- **id:** `b-flat-instrument`
- **aliases:** B-flat transposing instrument, Bb instrument
- **popup:** An instrument whose written C sounds as a B-flat, like tenor saxophone, trumpet or clarinet. Its part is written higher than it sounds.
- **definition:** A B-flat instrument sounds a B-flat when its player reads and plays a written C. Trumpet, clarinet and soprano saxophone sound a whole step lower than written; tenor saxophone and bass clarinet sound a whole step plus an octave lower (a major ninth). So to play a given concert note, a B-flat player reads a note written that much higher.
- **in_infinite_flow:** The app's B-flat tenor saxophone profile writes every note a major ninth (14 half steps) above the concert pitch it sounds.
- **related:** `transposing-instrument`, `concert-pitch`, `written-pitch`, `e-flat-instrument`, `control-instrument-profile`
- **sources:** S12, S16, S17

### Concert pitch

- **id:** `concert-pitch`
- **aliases:** sounding pitch
- **popup:** The pitch you actually hear, the one a piano would play. Some instruments read notes that differ from what they sound.
- **definition:** Concert pitch is the real sounding pitch of a note: the name a piano would give it. Piano, flute and violin read and sound in concert pitch. Transposing instruments read a different written note for the same sound, so musicians comparing parts say notes are "in concert" to avoid mix-ups. The same term also names the tuning standard (A4 = 440 Hz); that meaning is not used here.
- **in_infinite_flow:** The app generates and stores every phrase in concert pitch, then converts it to your instrument's written pitch for the score. For the C MIDI keyboard the two are the same.
- **related:** `written-pitch`, `transposing-instrument`, `b-flat-instrument`, `e-flat-instrument`
- **sources:** S17, S16, S12

### E-flat instrument

- **id:** `e-flat-instrument`
- **aliases:** E-flat transposing instrument, Eb instrument
- **popup:** An instrument whose written C sounds as an E-flat, like alto saxophone. Its part is written higher than it sounds.
- **definition:** An E-flat instrument sounds an E-flat when its player reads a written C. The alto saxophone sounds a major sixth (nine half steps) lower than written; the baritone saxophone sounds an octave lower still. So when an alto saxophonist reads a written A, the sound is a concert C.
- **in_infinite_flow:** The app's E-flat alto saxophone profile writes every note a major sixth (9 half steps) above the concert pitch it sounds.
- **related:** `transposing-instrument`, `concert-pitch`, `written-pitch`, `b-flat-instrument`, `control-instrument-profile`
- **sources:** S12, S16, S17

### Instrument range

- **id:** `instrument-range`
- **aliases:** range, compass
- **popup:** All the notes an instrument can play, from its lowest to its highest.
- **definition:** An instrument's range is the full span of pitches it can play, from lowest to highest. Within that span, some notes are easy and pleasant for most players, while the extremes can be hard to control or sound strained. Practical music, especially for learners, often stays in a comfortable part of the range. For transposing instruments the range is usually given in written pitch.
- **in_infinite_flow:** Each instrument profile has a fixed, deliberately conservative range: keyboard C3 to C5 (concert), and both saxophones written C4 to C6. No note ever goes outside it.
- **related:** `register`, `register-window`, `transposing-instrument`, `control-instrument-profile`, `control-register`
- **sources:** S11, S14, S15, docs/music/saxophone-profile-ranges.md

### MIDI note number

- **id:** `midi-note-number`
- **aliases:** MIDI number, MIDI pitch
- **popup:** A number from 0 to 127 that computers use for each note. Middle C is 60, and each half step up adds 1.
- **definition:** MIDI, the standard language that electronic instruments and computers use for notes, numbers each pitch from 0 to 127. Each half step up adds one, so an octave adds twelve. Middle C is 60, and the A above it (A4, the 440 Hz tuning note) is 69. Because the number is unambiguous, it avoids the octave-label differences between software brands.
- **in_infinite_flow:** The app stores every pitch as a concert MIDI number. Ranges: keyboard 48-72, tenor saxophone 46-70, alto saxophone 51-75.
- **related:** `pitch`, `middle-c`, `octave-number`, `concert-pitch`
- **sources:** S13

### Pulse wave

- **id:** `pulse-wave`
- **aliases:** square wave, duty cycle
- **popup:** The buzzy, square-like tone of old game consoles; changing the width of its pulse (its duty cycle) changes its colour.
- **definition:** A pulse wave switches abruptly between two levels, giving a bright, hollow, buzzy tone. Its duty cycle is the fraction of each cycle spent "on": at 50 % it is a square wave, and at 12.5 % or 25 % it sounds thinner and more nasal. The NES console had two pulse channels with selectable duty cycles, which is why its melodies sound the way they do.
- **in_infinite_flow:** Not built; style atlas research: the chiptune entry needs it as a system-voice timbre (docs/music/styles/popular-electronic-game.md).
- **related:** `timbre`, `chiptune`, `audio-effect`
- **sources:** S362, S361, docs/music/styles/popular-electronic-game.md

### Timbre

- **id:** `timbre`
- **aliases:** tone colour, tone color, sound colour
- **popup:** The colour of a sound: what makes a flute and a violin sound different on the same note. Said "TAM-ber".
- **definition:** Timbre is the quality of a sound that is neither its pitch, its loudness nor its length. A flute, a violin and a voice can play the same note equally loud and still be told apart at once, because each makes a different mix of overtones and starts and fades in its own way. People often call it "tone", but in music that word also means a pitched sound or a whole step. Listeners recognise timbre very fast: a fraction of a second of a familiar recording can be enough.
- **in_infinite_flow:** The player's own instrument gives the lead its timbre; the app's backing uses fixed placeholder synth waves (a triangle-wave bass, sine-wave chords). v4 plans a synth library for system voices, and the endgame research names a distinct timbre per character voice as the cheapest strong identity cue (docs/music/musical-identity.md); endgame groundwork, not built.
- **related:** `audio-effect`, `instrument-range`, `system-voice`, `musical-identity`
- **sources:** S224, S227, S228, src/audio/web-audio-session-bus.ts, docs/music/musical-identity.md

### Transposing instrument

- **id:** `transposing-instrument`
- **aliases:** transposition
- **popup:** An instrument whose written notes differ from the notes it sounds. Saxophones are transposing instruments.
- **definition:** A transposing instrument is one whose music is written at a different pitch from the one it sounds. The player reads and fingers a written note, and the instrument sounds a fixed interval away from it. This lets players switch between instruments of one family, like the saxophones, keeping the same fingering for the same written note. Such instruments are named for the concert pitch that sounds when they play a written C: B-flat, E-flat, F and so on.
- **in_infinite_flow:** The app handles the conversion for you: pick an instrument profile, and the notes, key signature and chord symbols all appear in that instrument's written pitch.
- **related:** `concert-pitch`, `written-pitch`, `b-flat-instrument`, `e-flat-instrument`, `control-instrument-profile`
- **sources:** S16, S17, S12

### Written pitch

- **id:** `written-pitch`
- **aliases:** written note, transposed pitch
- **popup:** The note printed on the page for a transposing instrument. It can differ from the pitch that actually sounds.
- **definition:** Written pitch is the note as it appears in a player's part. For non-transposing instruments it equals the sounding (concert) pitch. For transposing instruments it is shifted by a fixed interval: a tenor saxophonist reading a written D sounds a concert C, a major ninth lower. Players think in written pitch, because their fingerings follow it.
- **in_infinite_flow:** The score is always in the selected instrument's written pitch; there is no concert-pitch view. The Written key control is in written pitch too.
- **related:** `concert-pitch`, `transposing-instrument`, `control-written-key`, `control-instrument-profile`
- **sources:** S16, S17, S12, ui_ux/screens/phrase-workspace/handoff.md

## App controls

### Allowed rhythm changes

- **id:** `control-allowed-rhythm-changes`
- **aliases:** rhythm change, allowed changes
- **popup:** With the rhythm lock on, small edits a phrase may make to the locked rhythm, one at a time and for one phrase only.
- **definition:** Allowed rhythm changes is the app's name for a list of small rhythm edits you can switch on while the rhythm lock holds one rhythm, such as splitting one note into two. Musicians vary a repeated rhythm this way to keep it alive while it stays recognizable. Each kind you allow is one kind of edit the app may make, now and then, to the locked rhythm. One such edit in a phrase is called a rhythm change.
- **in_infinite_flow:** Planned for v3.2 (not built; spec decisions D232, D234, D236). Five kinds, each on or off, all off by default, so the lock is strict unless you allow some: **move a note start** by a sixteenth or an eighth, **move a rest**, **split a note**, **merge two notes**, **add or remove a rest**. A rhythm change is one edit in one measure, or one made in measure 1 or 2 and repeated in measure 3 or 4. At most one per phrase, never in phrase 1, in about 1 phrase in 4 (1 in 2 on the tenser phrase of Tension across phrases). Each is measured from the locked rhythm and lasts one phrase, so changes never add up, and none is ever marked on screen. Which kinds can happen depends on the rhythm settings: under Strict variety with Straight syncopation there is almost nothing to change, and no candidate means no change. Set at Idle or in the review, saved like the session options; presets never hold it. It acts only while the lock is on.
- **related:** `control-rhythm-lock`, `forced-bend`, `rest`, `syncopation`, `control-rhythmic-variety`, `control-tension-across-phrases`
- **sources:** S56, specs/versions/v3/rhythm-lock.md, docs/music/mutation-catalogue.md, specs/decisions.md

### Arpeggio chaos

- **id:** `control-arpeggio-chaos`
- **aliases:** none
- **popup:** When the melody moves to another note of the chord, does it pick the nearest one, any one, or a far-away one?
- **definition:** Arpeggio chaos is a name made up for this app. Musicians would describe the same thing as close versus wide (or angular) arpeggio motion: how a line moves between the notes of the current chord. The control changes one thing only, which chord tone the melody prefers next, and it sits in the Character group.
- **in_infinite_flow:** **Predictable**: among chord tones, prefers the one nearest the previous note, for compact, smooth lines. **Varied** (default): no preference by distance; the phrase's random seed decides the order. **Chaotic**: prefers the chord tone farthest from the previous note, within what Leapiness allows. It only reorders chord-tone choices: it never breaks Leapiness, Register or other limits, chord tones still come before other notes, and it creates no inversions.
- **related:** `arpeggio`, `chord-tone`, `control-leapiness`, `run`, `seed`
- **sources:** src/domain/pitch/pitch-ranking.ts, ui_ux/screens/phrase-workspace/handoff.md

### Built-in preset

- **id:** `built-in-preset`
- **aliases:** style preset
- **popup:** A ready-made set of settings that ships with the app, such as Neutral or Jazz.
- **definition:** A built-in preset is a named group of starting settings provided by the app. Choosing one fills in several controls at once, so a player can try a style or a practice purpose with one choice and then adjust from there. It is an app term, not a music-theory one.
- **in_infinite_flow:** Eight, chosen in the Preset box at the top of the controls (spec decisions D228–D231, D233, D235): under Practice, **Neutral** (the default), **Gentle** and **Speed drill**; under Styles, **Jazz**, **Bebop**, **Pop song**, **Reel** and **Modal (Dorian)**. Neutral and Jazz sound as they did before v3.1. Every preset holds the ten generation controls (Harmonic motion, Tension, Note density, Rhythmic variety, Syncopation, Silence density, Contour, Register, Leapiness, Arpeggio chaos), the seven figure levels and a key and mode restriction; never the instrument, tempo or session options. So choosing Neutral or Jazz also sets Tension, Leapiness and Arpeggio chaos, which v3.0's musical profile left alone. Most restrictions are "any", but Reel allows Mixolydian or Dorian, Bebop and Pop song Major, and Modal (Dorian) Dorian, so choosing one of these can change the Collection (the mode) while keeping the Written key. The restriction guides and never blocks. A built-in preset can be changed and saved as a player preset, but never overwritten, renamed or deleted; the app knows each by a fixed internal identifier, so its name may change.
- **related:** `player-preset`, `custom`, `key-and-mode-restriction`, `control-figure-level`, `control-musical-profile-preset`, `reel`
- **sources:** src/domain/controls/profile-selection.ts, specs/archive/v3/presets.md, specs/versions/v3/master-spec.md, specs/decisions.md

### Collection

- **id:** `control-collection`
- **aliases:** scale, mode
- **popup:** The scale or mode that the phrase's notes and chords come from, such as Major, Minor or Dorian.
- **definition:** Collection picks the set of seven notes the phrase is built from. Most musicians would simply say "scale" or "mode". Theorists do use "collection" for the group of pitches a piece draws on, but as a control label it is the app's choice. Together with Written key it makes the key: Written key names the home note, and Collection the step pattern built on it.
- **in_infinite_flow:** Nine options, all seven-note scales on the Written key note; default Ionian. **Major** and **Minor** (natural minor) work as tonal keys, with chords in a tonic, predominant, degree-5 order. **Ionian**, **Dorian**, **Phrygian**, **Lydian**, **Mixolydian**, **Aeolian** and **Locrian** work as modes, around each mode's color degree. So Major and Ionian share their notes but not their chord plans, and likewise Minor and Aeolian. The key signature follows the collection. All chords are triads of the collection. Melodies stay inside it unless one of the two chromatic figures (the chromatic approach and the chromatic enclosure) is on, letting in brief chromatic notes: both are Off in Neutral and on in Jazz. A preset may carry a key and mode restriction (spec decisions D229–D231, D233): choosing a restricted preset can change the Collection to one it allows (Pop song and Bebop move Ionian to Major, for example), and while it is in force the control highlights the allowed options, every option staying selectable; choosing one outside it makes the selection Custom. In v3.2 (planned, not built), the key and mode suggestion's "Use it" can also set it, at your request.
- **related:** `scale`, `mode`, `major`, `minor`, `ionian`, `aeolian`, `characteristic-note`, `control-written-key`, `control-harmonic-motion`, `key-and-mode-restriction`
- **sources:** ui_ux/screens/phrase-workspace/handoff.md, docs/music/harmony-planner-policy.md, specs/archive/v3/presets.md

### Contour

- **id:** `control-contour`
- **aliases:** melodic shape
- **popup:** The overall shape of the melody: rising, falling, up-then-down, or wandering.
- **definition:** Contour sets the overall shape of the melody across the four measures, in the standard musical sense of the word: the rising, falling, arching or wandering shape of a phrase. The app checks the shape at one point in each measure, so small decorating notes in between can briefly move against it.
- **in_infinite_flow:** The checkpoint in each measure is the first new note on beat 1 or 3, or else the measure's first note. **Rising**: checkpoints never go down, and the last is higher than the first. **Falling**: the mirror image. **Arch**: a single highest checkpoint, in measure 2 or 3. **Wandering**: changes direction at least once, never a straight climb or fall. Default Arch (Neutral preset) or Wandering (Jazz preset).
- **related:** `contour`, `control-register`, `control-leapiness`, `control-musical-profile-preset`
- **sources:** ui_ux/screens/phrase-workspace/handoff.md, docs/music/pitch-planner-validation.md

### Custom

- **id:** `custom`
- **aliases:** Custom state, customized, Custom based on a preset
- **popup:** Shown when your settings no longer match the preset you chose. It names that preset, and you can save what you have as your own.
- **definition:** Custom is the app's label for settings you changed after choosing a preset. It is not a preset of its own: it means "what you have now is not a saved preset". It remembers the preset it started from, called its base, so you can tell where you came from. It is an app term, not a music-theory one.
- **in_infinite_flow:** Custom begins when, with a preset selected, you change a preset-held setting (one of the ten controls or a figure level) or choose a key or mode outside its key and mode restriction (spec decisions D231, D233, D235). Values are not compared: setting a value back by hand stays Custom, and only choosing a preset leaves it. Tempo, instrument, a key or mode inside the restriction, and Tension across phrases never cause it. The Preset box names its base ("Custom, based on Bebop"), or shows "Custom" alone when there is none; deleting the base leaves Custom with no base and no restriction. During a session, a Vary settings move marks Custom for that session only. From Custom you can save a new player preset, or save the changes into your own player preset.
- **related:** `built-in-preset`, `player-preset`, `key-and-mode-restriction`, `control-musical-profile-preset`, `grammar`, `control-vary-settings`
- **sources:** src/domain/controls/profile-selection.ts, specs/archive/v3/presets.md, specs/versions/v3/master-spec.md, specs/decisions.md

### Doodle

- **id:** `doodle`
- **aliases:** none
- **popup:** The short idea, one to four measures, that you play for the app to continue in a Jam.
- **definition:** Doodle is the app's everyday word for a short musical idea you make up and play: a few notes, one to four measures long, not a finished tune. Musicians call such an idea a motif. "Doodle" stresses that it can be rough and casual, like a sketch in a margin: the app's job is to grow it, never to judge it. It is the owner's word, not a music-theory term.
- **in_infinite_flow:** Planned for Jam in v3.2 (not built; spec decisions D209, D215, D234). After the count-in you play the doodle over the app's click; it ends when a whole measure stays silent, or after four measures. Very short stray notes are left out and the rest is quantized to the sixteenth-note grid. The doodle changes no setting: it only steers which rhythms and note moves the app tries first, so the phrases share its shape (its rhythm, its ups and downs, and the note it ended on) without quoting its notes. It opens the session's review, written out as the app heard it, can be held for another Jam, and is kept with a kept Jam session; your raw played notes stay private.
- **related:** `motif`, `jam`, `kept-doodle`, `control-drift`, `quantize`, `key-and-mode-suggestion`
- **sources:** S40, specs/versions/v3/jam.md, specs/decisions.md

### Drift

- **id:** `control-drift`
- **aliases:** Jam drift
- **popup:** In a Jam, how far the phrases may wander from your doodle: Close, Near or Free.
- **definition:** Drift is the app's own name for how freely a Jam's phrases develop your doodle. Composers vary a motif by small changes, and the more they change, the further the music travels from where it began. Drift sets that distance, for the rhythm and for the ups and downs of the melody. Musicians would just say "stay close to the idea" or "take it somewhere".
- **in_infinite_flow:** Planned for v3.2 (not built; spec decision D234). Shown only while Jam is on; saved like the session options; presets never hold it. **Close**: rhythms whose every measure is the same as the doodle's, or one small edit away, come first, and the melody follows the doodle's moves in direction and size (step, skip or leap). **Near** (default): each measure at most a little further (one edit on or next to beat 1 or 3, or two small edits), and the melody follows the doodle's directions only. **Free**: rhythms in the usual random order, no melody preference, only the join from the doodle's last note. Drift only orders the candidates; it never breaks a control's rules. With the rhythm lock on, drift no longer decides the rhythm after phrase 1, only the melody.
- **related:** `doodle`, `jam`, `control-rhythm-lock`, `motivic-development`, `contour`
- **sources:** S56, specs/versions/v3/rhythm-lock.md, specs/versions/v3/jam.md, docs/music/mutation-catalogue.md

### Figure level

- **id:** `control-figure-level`
- **aliases:** level, figure levels, embellishment flags
- **popup:** For each kind of decorating figure, how often the app uses it: Off, Rarely, Often or Very often.
- **definition:** In this app a figure is one kind of embellishment, such as a passing tone or an enclosure, and a figure level says how much the app uses that figure. Musicians build a vocabulary by hearing such decorations often; raising a level makes the app try that figure earlier, so it is actually heard. A level is a preference, never a quota: no phrase is refused for lacking a figure.
- **in_infinite_flow:** Set in the Embellishments group of the controls (spec decisions D210, D233, D235). Seven figures, each with its own level: passing tone, accented passing tone, neighbor tone, appoggiatura, diatonic enclosure, chromatic approach, chromatic enclosure. **Off**: never written as a free figure. **Rarely**: tried only after the chord tones, so it appears only when they lead nowhere, as the figures behaved before v3.1. **Often**: tried before the chord tones at about 1 in 4 of the notes where it could start. **Very often**: about 1 in 2. The spec's working names for the four are Off, As today, Favored and Strongly favored. A level cannot add notes, so the rhythm decides where a figure fits. Levels govern free figures only: Tension's scheduled figure is kept whatever the levels. The chromatic figures can be turned on from any preset. Every preset holds all seven levels; Neutral and Jazz keep their earlier sound (the newer figures Off, Jazz's chromatic figures Rarely). Set at Idle and saved like the controls; with a preset selected, changing a level makes the selection Custom. Vary settings can move one level one step.
- **related:** `embellishment`, `passing-tone`, `accented-passing-tone`, `neighbor-tone`, `appoggiatura`, `enclosure`, `chromatic-approach`, `control-tension`, `built-in-preset`
- **sources:** specs/archive/v3/embellishment-flags.md, specs/versions/v3/master-spec.md, specs/decisions.md, docs/music/embellishment-catalogue.md

### Harmonic motion

- **id:** `control-harmonic-motion`
- **aliases:** chord movement
- **popup:** How much the chords move during the phrase: stay on one chord, change a little, or change more often.
- **definition:** Harmonic motion sets how many chords the phrase uses and how often they change. Musicians would talk about the chord progression and its harmonic rhythm. Every chord is a root-position triad from the selected collection, and a chord change always falls on a beat. The phrase always starts on the home chord.
- **in_infinite_flow:** **Static**: the home chord for all four measures. **Gentle diatonic**: at most one chord per measure. Major and Minor move away through chords on degrees 3, 6, 2 or 4 and end on the degree-5 chord; modes use a single color chord in measure 2 or 3 and return home. **Active diatonic**: more movement, and measure 2 or 3 may hold two chords of two beats each. Major and Minor again end on the degree-5 chord; modes use two different color chords. Default Gentle diatonic (both Neutral and Jazz). Neutral and Jazz use exactly the same chord plans.
- **related:** `chord-progression`, `harmonic-rhythm`, `harmonic-function`, `characteristic-note`, `control-collection`
- **sources:** ui_ux/screens/phrase-workspace/handoff.md, docs/music/harmony-planner-policy.md

### Instrument profile

- **id:** `control-instrument-profile`
- **aliases:** instrument
- **popup:** Which instrument you practice on. It sets the note range and how the music is written for you.
- **definition:** Instrument profile tells the app which instrument you are playing, so it can keep every note in a comfortable range and write the score the way your instrument reads it. "Profile" is the app's word; musicians would just name the instrument, or its part.
- **in_infinite_flow:** **C MIDI keyboard**: concert pitch, range C3-C5 (MIDI 48-72). **B-flat tenor saxophone** (default): sounds a major ninth below written; written range C4-C6 (concert MIDI 46-70). **E-flat alto saxophone**: sounds a major sixth below written; written range C4-C6 (concert MIDI 51-75). All three use treble clef. Switching keeps your Written key and Collection, so the sounding key changes. If a phrase is on screen, switching generates a new one with the same settings, or clears it when the rhythm settings are an unsupported combination.
- **related:** `transposing-instrument`, `b-flat-instrument`, `e-flat-instrument`, `instrument-range`, `written-pitch`, `control-register`, `control-written-key`
- **sources:** ui_ux/screens/phrase-workspace/handoff.md, src/domain/profile/instrument-profiles.ts, src/composables/generation-session-profile-switch.ts

### Jam

- **id:** `jam`
- **aliases:** Jam mode, Jam switch, a Jam
- **popup:** A session mode: you play a short idea first, and the app's phrases grow from it. Needs a connected controller.
- **definition:** Among musicians, a jam is an informal session where players improvise together. In this app, Jam is a session mode, and the switch that turns it on: instead of starting from a generated phrase, the session starts with your own doodle, and the phrases that follow continue it, keeping something of its rhythm and its ups and downs. "A Jam" means one session run this way. Jam is a working name.
- **in_infinite_flow:** Planned for v3.2 (not built; spec decisions D209, D215, D216, D234, D236). Off by default, set at Idle and saved like the "During a session" options; presets never hold it. Without a MIDI controller it is unavailable, and Idle and Start behave as with Jam off. At Idle in Jam mode no phrase is shown. A Jam goes: Start or the starting note, one count-in measure, the doodle (one to four measures), a generation measure while the app writes phrase 1, a read-in measure with phrase 1 on screen, then phrase 1 sounds with the backing; if phrase 1 is late, the wait grows by whole measures, up to three. From phrase 1 it runs as any session. There is no new doodle mid-session: stop and start again. The review opens with the doodle and may offer a key and mode suggestion and "Jam again on this doodle".
- **related:** `doodle`, `kept-doodle`, `control-drift`, `control-rhythm-lock`, `key-and-mode-suggestion`, `starting-note`, `count-in`, `call-and-response`
- **sources:** S84, specs/versions/v3/jam.md, specs/decisions.md

### Kept doodle

- **id:** `kept-doodle`
- **aliases:** the doodle Jam mode keeps, held doodle (its earlier name), Jam again on this doodle
- **popup:** After a Jam, Jam mode keeps your doodle, so the next Jam continues it without you playing it again.
- **definition:** The kept doodle is the doodle Jam mode keeps waiting at Idle after a Jam. The next Jam skips playing the doodle and goes straight to phrases grown from it, so you can hear the same idea continued once more, perhaps in the key and mode the app suggested. When you want a fresh idea, you ask for a new doodle. It is an app term, not a music-theory one.
- **in_infinite_flow:** Planned for v3.2 (not built; spec decisions D408, D410, D411, D413; ux D336). After every Jam, Jam mode keeps its doodle: at Idle, phrase 1 is already written from it and on screen; the starting note is phrase 1's first note, as in an ordinary session; Start skips the capture and its 30-second wait for a first note. Changing one of Jam's settings that phrase 1 is written from (all but the tempo) writes phrase 1 again from the kept doodle at once; Regenerate writes a new phrase 1 from it; accepting the suggestion keeps it and writes phrase 1 again in the new key and mode. It goes only when you press New doodle, leave Jam mode, or delete the latest kept Jam session played on it (Delete everything included). "Jam again on this doodle", in a kept Jam session's review, opens Jam mode with that doodle kept. It lives in memory only: after a reload it is gone, but the kept Jam session's review offers it again.
- **related:** `doodle`, `jam`, `key-and-mode-suggestion`, `starting-note`
- **sources:** specs/versions/v3/master-spec.md, specs/versions/v3/jam-mode.md, specs/decisions.md, ui_ux/flows/jam/handoff.md

### Key and mode restriction

- **id:** `key-and-mode-restriction`
- **aliases:** restriction, restriction in force
- **popup:** The keys and modes a preset is meant for. Choosing the preset moves you inside them; the key and mode controls then highlight them, and nothing is blocked.
- **definition:** Some styles live in particular modes: a folk reel sounds most like itself in Mixolydian or Dorian. A key and mode restriction is the app's way for a preset to say which keys and modes it is meant for. It guides rather than forbids: you can still pick any key and mode. Here "key" means the Written key (the home note) and "mode" the Collection value, one of nine.
- **in_infinite_flow:** Each half, keys and modes, is "any" or an ordered list (spec decisions D229–D231, D233, D235). Built-ins: Reel any key, Mixolydian or Dorian; Bebop and Pop song any key, Major; Modal (Dorian) any key, Dorian; the other four any. No built-in restricts keys. Choosing a restricted preset keeps each half if it is allowed, else takes the first listed (A Aeolian becomes A Mixolydian under Reel); a one-key, one-mode restriction sets both. The phrase on screen stays until you regenerate. The **restriction in force** is the selected preset's, or Custom's base's, while the current key and mode are inside it; the two controls highlight it, not by color alone. Choosing a key or mode outside it opts out: the selection becomes Custom and nothing else changes. Vary settings' key and mode moves stay inside the restriction in force at the session's start. Saving a player preset offers three choices: as now (the default), only this key and mode, or any. Major and Ionian are separate entries (same notes, different chord plans), as are Minor and Aeolian.
- **related:** `built-in-preset`, `player-preset`, `custom`, `control-written-key`, `control-collection`, `mode`, `control-vary-settings`
- **sources:** specs/archive/v3/presets.md, specs/versions/v3/master-spec.md, specs/decisions.md

### Key and mode suggestion

- **id:** `key-and-mode-suggestion`
- **aliases:** the suggestion, key suggestion
- **popup:** After a Jam, the app may propose the key and mode your doodle seems to be in. You choose: use it, or keep yours.
- **definition:** The key and mode suggestion is the app's guess at which home note and which scale or mode your doodle sounds in, offered for you to accept or decline. It is what a musician does on hearing an idea and saying "that sounds like D Dorian". The guess uses key finding: which notes you played, for how long, and which came first and last. A short idea often fits several keys, so it is a suggestion, never a verdict.
- **in_infinite_flow:** Planned for v3.2 (not built; spec decisions D209, D212, D216, D234, D236). Worked out when the doodle ends; shown only afterwards, in the Jam's review and at Idle with a kept doodle, never during a session. The app scores all 84 home note and mode pairs, keeps up to three close candidates and draws one by weighted chance; the draw depends only on the doodle, so the same doodle always gives the same answer. Only that answer is shown, in written pitch, with **Use it** (sets Written key and Collection as a change by hand would), **Keep mine** (changes nothing, and that doodle's suggestion is not offered again) and "Jam again on this doodle". With Major or Minor selected, an Ionian answer reads "Major" and an Aeolian one "Minor". Nothing is suggested for fewer than 5 pitch classes, 6 notes or 2 beats of sound, when your own key and mode are among the candidates, or when under 80 % of the doodle fits the best answer (the review then says so once, never naming a "wrong" note). A preset's restriction does not limit it; using an answer outside the restriction makes the selection Custom. The app never changes key or mode on its own.
- **related:** `key-finding`, `key-profile`, `pitch-class`, `relative-keys`, `parallel-keys`, `doodle`, `kept-doodle`, `control-written-key`, `control-collection`, `key-and-mode-restriction`
- **sources:** S60, S63, S73, docs/music/key-and-mode-estimation.md, specs/versions/v3/key-and-mode-suggestion.md, specs/decisions.md

### Leapiness

- **id:** `control-leapiness`
- **aliases:** leap size
- **popup:** How far the melody may jump between notes: small moves only, a few jumps, or big jumps.
- **definition:** Leapiness is a name made up for this app: the tendency to move by steps versus larger melodic intervals. Musicians would say a line is conjunct (stepwise) or disjunct (leaping), smooth or angular. It sets the biggest jump allowed between neighboring notes and how many jumps a phrase may contain. The limits are ceilings, not targets: a Leaping phrase may still move mostly by step.
- **in_infinite_flow:** Moves are counted in half steps: step 1-2, skip 3-4, leap 5-6, large leap 7-12. **Smooth**: moves up to 4 (a major third), no leaps. **Shaped** (default): up to 7 (a perfect fifth); at most 2 leaps, 1 of them large. **Leaping**: up to 10 (a minor seventh); at most 4 leaps, 2 large. **Angular**: up to 12 (an octave); at most 6 leaps, 3 large. Every large leap must be recovered (see Recovery). Arpeggio runs are limited too: one per phrase up to Leaping (skips only under Smooth), and at most two per phrase, one per measure, under Angular.
- **related:** `leap`, `skip`, `step`, `interval`, `recovery`, `run`, `control-arpeggio-chaos`
- **sources:** ui_ux/screens/phrase-workspace/handoff.md, docs/music/melodic-control-models.md

### Musical profile preset

- **id:** `control-musical-profile-preset`
- **aliases:** musical profile, profile, style
- **popup:** The control that chose Neutral or Jazz up to v3.0. Since v3.1 it is the Preset box, with eight built-in presets and your own.
- **definition:** The musical profile preset was the app's control, up to v3.0, for picking a style and loading a matching set of starting values. It did two jobs. It set the note vocabulary, which the app called the grammar: which decorating figures were allowed. And it filled in seven other controls at once, which you could then change. "Preset" and "profile" are app words, not music-theory terms.
- **in_infinite_flow:** Replaced in v3.1 (spec decisions D228, D233, D235): "musical profile" left the player's vocabulary, the control became the Preset box, and Neutral and Jazz became two of eight built-in presets (see Built-in preset). Each preset sets ten controls and seven figure levels instead of seven controls and a hidden grammar, and Custom names its base preset instead of a retained grammar. The name lives on only internally, to read v3.0's saved settings and older phrase replay keys: Neutral then stands for its figure levels (the chromatic figures Off), Jazz for its own (the chromatic approach and the chromatic enclosure Rarely).
- **related:** `built-in-preset`, `player-preset`, `custom`, `grammar`, `chromatic-approach`, `enclosure`, `approach-note`, `passing-tone`, `swing`, `control-harmonic-motion`
- **sources:** ui_ux/screens/phrase-workspace/handoff.md, src/domain/controls/profile-selection.ts, docs/music/neutral-profile.md, docs/music/jazz-profile.md, specs/archive/v3/presets.md, specs/decisions.md

### Note density

- **id:** `control-note-density`
- **aliases:** note value
- **popup:** The main note length of the phrase: quarter notes (calm), eighth notes (moving), or sixteenth notes (busy).
- **definition:** Note density chooses the main rhythmic value of the phrase, and so roughly how many notes you play in each measure. Musicians would simply name the value ("a line in eighths") or talk about subdivision. Shorter values put more notes in the same time, making a busier line that is harder to play at a given tempo.
- **in_infinite_flow:** **Quarter notes**: 2-4 notes per measure. **Eighth notes**: 4-8. **Sixteenth**: 8-16. These counts are for Strict rhythmic variety; the varied settings widen them a little. The chosen value makes up all the notes under Strict, at least three quarters under Slightly varied, and at least half under Heavily varied. Default Quarter notes (Neutral) or Eighth notes (Jazz).
- **related:** `quarter-note`, `eighth-note`, `sixteenth-note`, `subdivision`, `control-rhythmic-variety`, `unsupported-rhythm-combination`
- **sources:** ui_ux/screens/phrase-workspace/handoff.md, docs/music/rhythm-phrase-structure.md, docs/module_rhythm_variety_grammar.atom.md

### Player preset

- **id:** `player-preset`
- **aliases:** saved preset, my preset
- **popup:** A set of settings you named and saved yourself, to get them back later.
- **definition:** A player preset is a group of settings the player saves under a name of their own, so the same setup can be recalled in one step instead of being rebuilt control by control. Musicians do the same with the presets of a synthesizer or an effects unit. It is an app term.
- **in_infinite_flow:** Saved automatically on the device with v3.0's storage (spec decisions D228, D233, D235). The player selects a preset, changes settings (the selection then shows Custom) and saves the result under a name of 1 to 40 characters, unique and not "Custom"; at most 50. It holds what a built-in preset holds: the ten controls, the seven figure levels and a key and mode restriction, never the instrument or tempo. Saving asks which restriction to keep: as now (the default, so a reel stays a reel), only the current key and mode, or any. A player preset, unlike a built-in, can take saved changes, be renamed, or be deleted after a confirmation. None of this can happen during a session, and no preset leaves the device.
- **related:** `built-in-preset`, `custom`, `key-and-mode-restriction`, `control-figure-level`, `control-musical-profile-preset`
- **sources:** specs/archive/v3/presets.md, specs/versions/v3/master-spec.md, specs/decisions.md

### Register

- **id:** `control-register`
- **aliases:** octave
- **popup:** Which part of your instrument's range the phrase uses: low, middle or high, or let the app pick one.
- **definition:** Register picks the zone of your instrument's range that the whole phrase stays in. It uses the standard meaning of register, narrowed to a fixed one-octave window so that each option is clearly different and comfortable to play. The window never changes during a phrase.
- **in_infinite_flow:** The selected Low, Middle or High window for the whole phrase, inside the instrument's range. The range holds three overlapping windows, each one octave wide. **Low**, **Middle** and **High** pick one: C3-C4, F-sharp3-F-sharp4 and C4-C5 on the keyboard (concert), and written C4-C5, F-sharp4-F-sharp5 and C5-C6 on both saxophones. **Varying** lets the app choose one window that works, based on the phrase's random seed. Default Middle (Neutral) or Varying (Jazz). If no window can fit the other settings, generation reports a failure instead of breaking the range.
- **related:** `register`, `register-window`, `instrument-range`, `control-instrument-profile`, `control-contour`
- **sources:** ui_ux/screens/phrase-workspace/handoff.md, docs/music/saxophone-profile-ranges.md, src/domain/profile/instrument-profiles.ts

### Rhythm lock

- **id:** `control-rhythm-lock`
- **aliases:** lock, locked rhythm
- **popup:** Keeps one rhythm for the whole session, every note start and length, while the pitches keep changing.
- **definition:** Rhythm lock is the app's switch for practicing with one rhythm repeated while the melody changes, as musicians do when they keep a rhythm and try new notes over it. With the rhythm settled, your eyes can go to the pitches. The locked rhythm is every note start and length, and so every rest, across the four measures.
- **in_infinite_flow:** Planned for v3.2 (not built; spec decisions D232, D234, D236). Off by default; set at Idle or in the review; saved like the session options; presets never hold it. Outside a Jam it locks the rhythm of phrase 1, the phrase on screen at Start; in a Jam, the rhythm nearest the doodle that the app can write (locking the exact played rhythm waits for v4's rhythm editor). The lock is strict: a phrase leaves the locked rhythm only through an allowed rhythm change (none by default) or, when the locked rhythm cannot make a phrase, a forced bend; either lasts one phrase and is never marked. While the lock is on, Vary settings never moves the rhythm settings. If a session steps Sixteenth down to Eighth on a narrow screen, the first Eighth phrase's rhythm becomes the locked one.
- **related:** `control-allowed-rhythm-changes`, `forced-bend`, `rhythm`, `control-drift`, `control-vary-settings`, `jam`
- **sources:** specs/versions/v3/rhythm-lock.md, specs/decisions.md

### Rhythmic variety

- **id:** `control-rhythmic-variety`
- **aliases:** rhythmic variation
- **popup:** How much the rhythm mixes other note lengths into the main one: not at all, a little, or a lot.
- **definition:** Rhythmic variety sets how far the rhythm may stray from the single note value chosen in Note density. Musicians would just say a rhythm is even or varied. More variety means more mixed patterns within a beat, such as a long note followed by short ones, which sounds more natural but is harder to read.
- **in_infinite_flow:** **Strict**: only the Note density value. **Slightly varied** (default in both presets): a few extra beat patterns, such as a quarter note, or a dotted eighth plus a sixteenth, within Eighth notes; the main value stays at least three quarters of the notes. **Heavily varied**: more patterns, including eighth notes and eighth rests within Quarter notes; the main value stays at least half of the notes, for a mixed feel. Heavily varied never causes an unsupported rhythm combination; the other two can.
- **related:** `control-note-density`, `rhythm`, `dotted-note`, `unsupported-rhythm-combination`
- **sources:** ui_ux/screens/phrase-workspace/handoff.md, docs/module_rhythm_variety_grammar.atom.md, src/domain/controls/unsupported-rhythm-settings.ts

### Rising tempo

- **id:** `control-rising-tempo`
- **aliases:** adaptive tempo
- **popup:** Speeds a session up a little at a time: 5 BPM faster every 2 phrases, up to 240 BPM. Needs a connected controller.
- **definition:** Rising tempo is the app's own name for a habit musicians use to build reading and playing speed: play the same kind of material a little faster each time. When it is on, the tempo of a session goes up by itself on a fixed schedule, whatever and however you play. It never slows down on its own. The project's documents call it "adaptive tempo".
- **in_infinite_flow:** **Off** (default) or **On**, in the "During a session" group. While on, the tempo starts from your Tempo and goes up by 5 BPM every 2 phrases, stopping at 240 BPM. If your controller comes unplugged during the session, the rise waits: the tempo stays where it is until you plug it back in, then carries on. The rise never depends on how you play, and nothing about your playing is shown. It can only be turned on while a MIDI controller is connected; otherwise `On` is unavailable, with the note "Needs a connected controller.", and your choice comes back when a controller connects. During the session the page header and the Tempo control show the exact tempo now sounding, such as 95 BPM. When the session ends, Tempo goes back to the value you started from, a note under it says how fast the last session got, and the Review keeps each phrase's tempo. Changing the option never regenerates the phrase on screen; the choice lasts until you reload the page.
- **related:** `control-tempo`, `tempo`, `control-vary-settings`
- **sources:** specs/versions/v2/master-spec.md, ui_ux/screens/phrase-workspace/handoff.md

### Silence density

- **id:** `control-silence-density`
- **aliases:** rests, space
- **popup:** How much silence (rests) the phrase has: a little, room to breathe, or a lot.
- **definition:** Silence density is the app's own name for the amount of intentional rests in the phrase. Musicians would talk about rests, space or breathing room. Rests create breathing space and shape musical gestures, and on a wind instrument they give you time to take a breath.
- **in_infinite_flow:** Measured in sixteenth-note slots over the 64-slot phrase. **Sparse** (Neutral default): 4-8 slots of rest in total, at least one rest. **Conversational space** (Jazz default): 12-20 slots, with rests in both halves of the phrase, one of them an eighth or longer. **Breath-heavy**: 24-32 slots, a rest in every measure, and at least two rests of a quarter or longer. In every setting no measure is fully silent and no single rest is longer than half a measure.
- **related:** `rest`, `control-note-density`, `control-syncopation`, `unsupported-rhythm-combination`
- **sources:** ui_ux/screens/phrase-workspace/handoff.md, docs/music/rhythm-phrase-structure.md

### Starting note

- **id:** `starting-note`
- **aliases:** start note
- **popup:** The one note you can play on your controller to start a session, instead of clicking Start.
- **definition:** The starting note is the app's name for a played way to start: with a MIDI controller attached, playing this one note at Idle starts the session's count-in, so your hands can stay on the instrument. It must be that exact note, octave included; any other note played at Idle is ignored. It is an app term, not a music-theory one.
- **in_infinite_flow:** Today it is the first note of phrase 1, the phrase on screen, and the cue row names it whenever playing it would start a session. It only starts the count-in: after it, you play phrase 1 from its first note on beat 1. Since v3.0 (spec decision D297), there is one exception: if you changed a setting after the phrase on screen was made, so the phrase is out of date, playing the starting note does not start the count-in straight away. It first opens a short question, as the Start button does: make a new phrase, or start with this one. The count-in starts only if you start with this one, and while the question shows, no note you play starts anything. In Jam mode, planned for v3.2 (not built; spec decision D234), it is instead the selected key's home note, in written pitch, in the octave nearest the middle of your instrument's written range, and it belongs to no doodle; with a kept doodle it is phrase 1's first note again. It is the one played signal the app has.
- **related:** `count-in`, `cue`, `played-signal`, `jam`, `tonic`
- **sources:** specs/versions/v2/master-spec.md, specs/versions/v3/master-spec.md, specs/versions/v3/jam.md

### Syncopation

- **id:** `control-syncopation`
- **aliases:** none
- **popup:** How much the rhythm plays off the beat: not at all, now and then, or all through the phrase.
- **definition:** This control sets how much syncopation the phrase uses, in the standard sense: notes that start between beats, or are held across a stronger beat. It works on top of the rhythm that Note density and Silence density produce, and never removes the steady feel of beats 1 and 3.
- **in_infinite_flow:** **Straight** (Neutral default): every note starts where the chosen note value normally puts it; no syncopation. **Occasional offbeats** (Jazz default): in one or two measures, one note starts an eighth later or is held across beat 3. **Active displacement**: every measure has one or two syncopated notes, and the phrase has at least one offbeat start and one note tied across a beat; notes shift by a sixteenth or an eighth. Every measure keeps a note sounding on beat 1 or 3.
- **related:** `syncopation`, `offbeat`, `tie`, `metrical-anchor`, `control-note-density`
- **sources:** ui_ux/screens/phrase-workspace/handoff.md, docs/music/rhythm-phrase-structure.md

### Tempo

- **id:** `control-tempo`
- **aliases:** BPM, speed
- **popup:** How fast to practice the phrase, in beats per minute (BPM). Higher numbers are faster.
- **definition:** Tempo sets your practice speed in beats per minute, in the standard sense, counting quarter notes as beats. A good habit is to start slow enough to play the phrase cleanly and then raise the tempo a step at a time.
- **in_infinite_flow:** A stepper with minus and plus buttons, from 60 to 240 BPM in steps of 10; default 90 BPM. The value also shows in the page header. The tempo never changes which notes are generated: the same settings give the same kind of phrase at any tempo. In a session the count-in, the click, the backing and the phrases all play at it, and with Rising tempo on it can climb during the session, then goes back to your setting when the session ends.
- **related:** `tempo`, `beat`, `quarter-note`, `control-rising-tempo`
- **sources:** ui_ux/screens/phrase-workspace/handoff.md, src/domain/controls/generation-controls.ts

### Tension

- **id:** `control-tension`
- **aliases:** tension arc
- **popup:** How much melodic tension the phrase builds, and where: none needed, a light lift, a clear build, or a late edge.
- **definition:** Tension chooses how much melodic tension the phrase contains and where it happens. Here, tension means short melodic figures: notes that clash with the chord and then resolve onto a chord note. Musicians would speak of tension and release, or of non-chord tones. The project's documents call the control "Tension arc".
- **in_infinite_flow:** The control schedules at most one tension figure: a note outside the chord, placed on purpose and resolved by step onto a chord tone before the phrase's last note. **Settled**: no figure required; if one occurs (a passing tone, neighbor tone or appoggiatura, in measures 1-3), it resolves by the next beat 1 or 3. **Lift** (default): at most one figure of those kinds, in measure 2 or 3, resolving by the next beat. **Build**: exactly one figure is required, and it must be a two-note stepwise approach into a chord tone, in measure 2 or 3. **Edge**: exactly one passing tone, neighbor tone or appoggiatura, in measure 3, resolving as late as allowed. Plain passing and neighbor tones can still appear anywhere except the first and last note; they don't count as the tension figure, and neither do Jazz's chromatic approaches and enclosures. The tense scale tone a session phrase generated from the phrase before it may end on, resolved by the next phrase's first note, is a separate case: not a passing or neighbor tone on the last note, and not the tension figure. Tension works inside what the other controls allow; it never changes them.
- **related:** `tension-and-resolution`, `non-chord-tone`, `appoggiatura`, `approach-note`, `cadence`, `control-tension-across-phrases`
- **sources:** ui_ux/screens/phrase-workspace/handoff.md, docs/music/harmony-planner-policy.md, docs/music/melodic-control-models.md, src/domain/generation/carry-in/phrase-ending-debt.ts

### Tension across phrases

- **id:** `control-tension-across-phrases`
- **aliases:** multi-phrase tension arc
- **popup:** Shapes tension over groups of 4 phrases: your Tension, one step more, your Tension again, one step less.
- **definition:** Musicians often shape a longer passage the way they shape a single phrase: build up, then ease off. Tension across phrases does this over four phrases in a row, raising and then lowering the melodic tension each phrase gets, so a long session rises and settles instead of staying at one level. The project's documents call it the "multi-phrase tension arc".
- **in_infinite_flow:** **Off** (default) or **On**, in the "During a session" group. While on, a session runs in groups of 4 phrases (16 measures), counted from the first phrase: the first is generated with your Tension, the second one step tenser, the third with your Tension again, the fourth one step calmer. Steps follow the order Settled, Lift, Build, Edge and never go past either end, so with Edge chosen the second phrase stays at Edge. The Tension control never shows these steps: it shows your own choice or, if Vary settings moves Tension, the new value, and the steps then go around that value. Only what each phrase is generated with changes. Changing the option never regenerates the phrase on screen; the choice lasts until you reload the page.
- **related:** `control-tension`, `tension-and-resolution`, `phrase`, `control-vary-settings`
- **sources:** specs/versions/v2/master-spec.md, ui_ux/screens/phrase-workspace/handoff.md

### Vary settings

- **id:** `control-vary-settings`
- **aliases:** settings-mutation flag
- **popup:** Every 2 to 4 phrases, one setting moves one step, so a long session keeps changing. Never the instrument or the tempo.
- **definition:** Vary settings is the app's own name for an option that keeps a long session fresh. Instead of every phrase being built from the same settings, one setting at a time drifts by a small step, up or down, every few phrases, while you keep playing. The project's documents call it the "settings-mutation flag".
- **in_infinite_flow:** **Off** (default) or **On**, in the "During a session" group. While on, every 2 to 4 phrases (the gap is picked at random) one setting moves one step, in either direction. Any setting can move except Instrument profile and Tempo, which has Rising tempo instead. A step usually means one place along a control's list, never jumping from one end to the other. Some controls step their own way: Contour, whose shapes have no order, can change to any other shape; Register moves only among Low, Middle and High, never to Varying (from Varying it starts from the window the session was using, then keeps a fixed one); Written key moves one place around the circle of fifths (usually one sharp or flat more or fewer in the key signature); Collection moves one place at a time and stays among major and minor, or among the modes; Written key and Collection moves stay inside the key and mode restriction in force at the session's start. The figure levels move by a figure step: one figure moves one figure level, up or down, never past Off or Very often, and the seven levels together take one place in the draw (spec decisions D233, D235). A step never lands on an unsupported rhythm combination: the app picks again instead. During the session the controls show the settings the phrase now sounding was built from, changing quietly when a phrase built with a new value starts. When the session ends, every setting goes back to your own. A move of any preset-held setting (one of the ten controls or a figure level) marks Custom for that session; Written key and Collection moves never do. Changing the option never regenerates the phrase on screen; the choice lasts until you reload the page. **From v3.2** (planned, not built; spec decisions D216, D234, D236), **allowed groups** let you choose which settings may move, in six groups switched on or off together, all on by default: **Key and mode** (Written key, Collection), **Harmony** (Harmonic motion), **Tension**, **Rhythm** (Note density, Rhythmic variety, Syncopation, Silence density), **Melody shape** (Contour, Register, Leapiness, Arpeggio chaos) and **Figures** (the figure step). They are set at Idle or in the review and saved with the option. While the rhythm lock is on, the Rhythm group never moves. If the allowed groups offer no possible move, Vary settings cannot be turned on, and the app says why.
- **related:** `control-rising-tempo`, `control-tension-across-phrases`, `control-musical-profile-preset`, `control-figure-level`, `key-and-mode-restriction`, `custom`, `control-rhythm-lock`, `unsupported-rhythm-combination`
- **sources:** specs/versions/v2/master-spec.md, ui_ux/screens/phrase-workspace/handoff.md, specs/archive/v3/embellishment-flags.md, specs/versions/v3/rhythm-lock.md, specs/decisions.md

### Written key

- **id:** `control-written-key`
- **aliases:** key, home note
- **popup:** The home note of the phrase, as your instrument reads it. Together with Collection it gives the key, such as C Ionian.
- **definition:** Written key picks the tonal center, the home note, of the phrase. It is chosen in your instrument's written pitch, the notes you read on the page, not in concert pitch. So "C" means the C written in your part, whatever it sounds like. Internally the app calls it the written tonal center.
- **in_infinite_flow:** Twelve options, C through B, with black-key notes shown under both names (for example "F-sharp/G-flat"); default C. The app converts the choice to concert pitch before generating: written C is concert B-flat on tenor saxophone, concert E-flat on alto, and concert C on keyboard. Switching instrument keeps the written key, so the sounding key changes. The score spells the key with the fewest sharps or flats, choosing sharps on a tie. Choosing a player preset kept to one key and mode (see Key and mode restriction) sets it (spec decisions D230, D231); no built-in preset restricts keys. In v3.2 (planned, not built), the key and mode suggestion's "Use it" can also set it, at your request.
- **related:** `tonal-center`, `key`, `key-signature`, `enharmonic`, `written-pitch`, `control-collection`, `control-instrument-profile`, `key-and-mode-restriction`
- **sources:** ui_ux/screens/phrase-workspace/handoff.md, src/domain/generation/generation-intent.ts, src/domain/notation/pitch-spelling.ts

## Internal (no popup)

### Forced bend

- **id:** `forced-bend`
- **aliases:** bend (earlier drafts)
- **popup:** Internal: when the locked rhythm cannot make a phrase, the app uses the nearest rhythm that can, for that one phrase.
- **definition:** A forced bend is the search's fallback under the rhythm lock. Sometimes the locked rhythm is not among the rhythms a phrase's settings allow (a change of tension can remove it), or no phrase can be built on it. The phrase then takes the nearest rhythm that works, nearest by the same per-measure distance drift uses, and the next phrase tries the locked rhythm again. It is not a player option, and not a rhythm change.
- **in_infinite_flow:** Planned for v3.2 (not built; spec decisions D234, D236). It cannot be turned off, and happens with an empty list of allowed rhythm changes too. It is recorded in the session history only, never shown. Measured: only a step down from Build to Lift tension can lose the locked rhythm, so forced bends come from Tension across phrases when the chosen tension is Build, from a Vary settings Tension step from Build to Lift, and from the narrow-window step-down to Eighth. Earlier drafts' "bend" is split into "rhythm change" (the player's option) and "forced bend" (D236).
- **related:** `control-rhythm-lock`, `control-allowed-rhythm-changes`, `control-drift`, `control-tension-across-phrases`
- **sources:** specs/versions/v3/rhythm-lock.md, specs/decisions.md

### Gesture and answer

- **id:** `gesture-and-answer`
- **aliases:** gesture/answer, A and A-prime
- **popup:** Internal: measures 1-2 state a rhythmic idea (the gesture) and measures 3-4 reply with a varied copy (the answer).
- **definition:** The app's rhythm plan builds each phrase as a gesture and an answer. Measures 1-2 are the gesture; measures 3-4 start as a copy of it and are then varied by one or two small changes, such as moving a rest or displacing a note. The answer keeps at least half of the gesture's note starts (and at least two), and measure 4 must end differently from measure 2. The idea echoes the classical question-and-answer phrase, but here it is a rhythm rule, not a harmonic one.
- **in_infinite_flow:** Settled and Lift tension apply one answer change; Build and Edge may apply two.
- **related:** `phrase`, `rhythm`, `measure`, `control-tension`
- **sources:** S1, docs/music/rhythm-phrase-structure.md

### Grammar

- **id:** `grammar`
- **aliases:** musical grammar, profile grammar
- **popup:** Internal: the note vocabulary Neutral or Jazz brought up to v3.0, kept after you customized their controls. Replaced by figure levels in v3.1.
- **definition:** In this project, a grammar was, up to v3.0, the set of melodic rules a musical profile brought: which figures could decorate the melody. The Neutral grammar was fully diatonic; the Jazz grammar also allowed chromatic approaches and enclosures. The grammar was separate from the seven preset-controlled values, so editing those kept the grammar. It is a project word, not a standard music-theory term.
- **in_infinite_flow:** No longer in the app. Up to v3.0 it showed in the interface as "Custom (Jazz grammar)" in the control summary, and in the preset status "Custom configuration - Jazz grammar retained." In v3.1 (spec decisions D233, D235) "grammar" left the player's vocabulary and disappeared as a hidden setting: the figures became visible figure levels that every preset holds, so a Custom setup has no grammar left to retain and names its base preset instead. Not to be confused with the rhythm grammar (version `rhythm-mvp-v2`), the versioned rhythm rulebook, which stays.
- **related:** `control-musical-profile-preset`, `control-figure-level`, `custom`, `chromatic-approach`, `enclosure`
- **sources:** src/domain/controls/profile-selection.ts, src/components/controls/control-options.ts, specs/archive/v3/embellishment-flags.md, specs/decisions.md

### Metrical anchor

- **id:** `metrical-anchor`
- **aliases:** anchor
- **popup:** Internal rule: every measure must have a note sounding on beat 1 or beat 3, so the 4/4 pulse stays clear.
- **definition:** broadly, an event that reinforces the perceived meter. For first-release validation it means exactly a note event starting at bar-relative tick `0` or `8` (beat 1 or 3), either a fresh attack or a tie continuation carrying a note through that beat; a rest at that tick does not count.
- **in_infinite_flow:** Every measure of every phrase must contain at least one metrical anchor, whatever the Syncopation setting.
- **related:** `strong-and-weak-beats`, `meter`, `tie`, `tick`, `control-syncopation`
- **sources:** S8, docs/music/rhythm-phrase-structure.md

### Musical identity

- **id:** `musical-identity`
- **aliases:** identity, character identity
- **popup:** Internal: the sound and habits that make a character, place or event recognisable in the music the app writes for it.
- **definition:** In the endgame vision, characters, locations and events each carry a musical identity: a sound (timbre and effects) plus musical habits, such as a signature motif, favoured or banned notes, preferred rhythms, ornaments and accompaniment roles. An identity steers how the app generates the player's melody and the system voices, mostly as preferences, with a few strict rules. It is the endgame's richer form of a built-in preset.
- **in_infinite_flow:** Endgame groundwork, not built; spec decision D228(6) places such character, location and event presets after v3. The research covers what an identity could contain (docs/music/musical-identity.md) and how it could act on generation as filters, rank levels, weighted orders and planned material (docs/music/identity-modelling.md).
- **related:** `built-in-preset`, `signature-figure`, `leitmotif`, `idiolect`, `timbre`, `register-spike`, `system-voice`
- **sources:** specs/vision/endgame.md, specs/decisions.md, docs/music/musical-identity.md, docs/music/identity-modelling.md

### Open ending

- **id:** `open-ending`
- **aliases:** open endpoint, cadence/endpoint, continuation rule
- **popup:** Internal rule: every phrase ends sounding unfinished, never on the home note, so it leads on to the next phrase.
- **definition:** Open ending is the project's rule that every phrase ends sounding unfinished. In major and minor keys, landing on the home chord and home note usually closes a phrase, while landing on the dominant chord leaves it open. The app never ends a phrase on the home note. In the modes this openness comes from the melody's last note alone and needs no dominant chord. The aim is a phrase that invites the next one.
- **in_infinite_flow:** Major/Minor with Gentle or Active motion: the final chord is on degree 5 and the final sounding note is a tone of that chord (in Minor this is the minor v, without claiming dominant pull). Major/Minor with Static motion: the chord stays I and the final note is degree 5. Modes: the final chord is the home chord and the final note is any of its tones except the home note, so its 3rd or 5th, with no preference between them. Degree 1 is never the final note. The one tension figure resolves before the final note; plain passing and neighbor tones may resolve onto it. A session phrase generated from the phrase before it may instead end on a scale tone outside its final chord, reached by step, which the next phrase's first note resolves; that note is still never degree 1. A trailing rest is allowed.
- **related:** `cadence`, `phrase`, `dominant`, `scale-degree`
- **sources:** S3, docs/music/harmony-planner-policy.md, src/domain/pitch/pitch-context.ts, src/domain/generation/carry-in/phrase-ending-debt.ts

### Played signal

- **id:** `played-signal`
- **aliases:** signal pattern, played command, cue (the owner's word, D213)
- **popup:** Internal: a short pattern the player plays on purpose to tell the app something, such as "your turn".
- **definition:** A played signal is a short motif the player plays not as music but to steer the app: for example to end a Jam doodle or to say "less like this" about a phrase. It is recognised from the played notes (their intervals, and possibly a loose rhythm), framed so that ordinary playing does not trigger it, and either recognised or ignored: there is no "almost".
- **in_infinite_flow:** Not built: a research proposal (docs/music/played-pattern-recognition.md), placed in v3.x at the earliest. Spec decision D214 makes "played signal" the spec's word for it, because "cue" already names the session cue row. The one played signal the app has today is the starting note, which starts a session from Idle.
- **related:** `motif`, `cue`, `interval`, `contour`
- **sources:** docs/music/played-pattern-recognition.md, specs/decisions.md, specs/versions/v2/master-spec.md

### Recovery

- **id:** `recovery`
- **aliases:** recovery debt, leap recovery
- **popup:** Internal rule: after a big jump, the melody must turn back the other way by a small move.
- **definition:** A long-standing melodic guideline says that after a large leap the line should turn back the other way, often by step, to balance the jump. The app makes this a hard rule: a large leap (7-12 half steps) creates a recovery debt, paid when the next note moves in the opposite direction by 1-4 half steps. Smaller leaps, skips and steps create no debt.
- **in_infinite_flow:** Smooth allows no large leaps, so it never creates debt. Under Shaped the recovery must come on the very next note. Under Leaping and Angular, a large leap inside a recognized arpeggio run may recover after the run's last note instead. The phrase's final note can't leave a debt unpaid, except in a session phrase generated from the phrase before it: such a phrase may end owing a recovery, and the next phrase's first note pays it by moving back 1-4 half steps onto a note of the home chord. A repeated pitch does not count as recovery.
- **related:** `leap`, `run`, `control-leapiness`
- **sources:** S7, docs/music/melodic-control-models.md, src/domain/generation/carry-in/phrase-ending-debt.ts

### Register spike

- **id:** `register-spike`
- **aliases:** spike
- **popup:** Internal: a rare, short note far above (or below) where a line usually sits, followed by a return.
- **definition:** A register spike is a brief jump out of a voice's usual zone: a single short note, often high and accented, after which the line comes back. The endgame vision mentions sparse register "spikes" for a dark character, a low line punctuated by sharp, brief high notes. Used rarely and always shaped the same way, a spike can become a recognisable signature.
- **in_infinite_flow:** Endgame groundwork, not built. Today the Register control keeps the whole phrase inside one one-octave window, and a large leap must be followed by a recovery, so a spike would need its own rule or an exception, as octave displacement does (docs/music/musical-identity.md, docs/music/identity-modelling.md).
- **related:** `register`, `register-window`, `leap`, `recovery`, `octave-displacement`, `musical-identity`
- **sources:** specs/vision/endgame.md, docs/music/musical-identity.md, docs/music/identity-modelling.md

### Register window

- **id:** `register-window`
- **aliases:** window, resolved window
- **popup:** Internal: the one-octave slice of the instrument's range that a whole phrase is kept inside.
- **definition:** A register window is a one-octave span (12 half steps, 13 possible pitches) inside an instrument profile's concert range. Each profile has three overlapping windows, Low, Middle and High, derived by one fixed method (`overlapping-three-window-v1`). A phrase uses exactly one window from start to end. Varying resolves to one window that can fit the other settings, chosen with the phrase's seed.
- **in_infinite_flow:** Concert MIDI windows (Low / Middle / High): keyboard 48-60 / 54-66 / 60-72; tenor saxophone 46-58 / 52-64 / 58-70; alto saxophone 51-63 / 57-69 / 63-75. When no window can fit, generation fails with `no_eligible_register_window`.
- **related:** `control-register`, `register`, `instrument-range`, `midi-note-number`, `seed`
- **sources:** docs/music/saxophone-profile-ranges.md, src/domain/profile/register-window-derivation.ts

### Run

- **id:** `run`
- **aliases:** arpeggio run, chord-tone run
- **popup:** Internal: three chord notes in a row, jumping the same way twice, counted by the Leapiness limits.
- **definition:** In this project, a run is a recognized three-note arpeggio: three sounding chord tones of one chord, joined by two intervals of 3 or more half steps in the same direction, such as C up to E up to G. It is how the app allows two jumps in a row in one direction; two same-direction leaps that don't form such a run are not allowed. A single jump between two chord tones is ordinary motion, not a run.
- **in_infinite_flow:** Smooth, Shaped and Leaping allow one run per phrase (made of skips only under Smooth). Angular allows two per phrase, at most one per measure.
- **related:** `arpeggio`, `chord-tone`, `recovery`, `control-leapiness`, `control-arpeggio-chaos`
- **sources:** docs/music/melodic-control-models.md, docs/music/pitch-planner-validation.md

### Seed

- **id:** `seed`
- **aliases:** random seed
- **popup:** Internal: the number that drives the app's random choices. The same settings with the same seed give the same phrase.
- **definition:** A seed is the starting number for the app's random choices. Generation is deterministic: the same controls with the same seed always give the same phrase, which makes results repeatable and testable. Every Generate or Regenerate uses a fresh seed, so each new phrase differs while still obeying the same controls.
- **in_infinite_flow:** The seed breaks ties among equally good choices, picks the Varying register window, and orders chord tones under Varied arpeggio chaos. It never overrides a control.
- **related:** `control-arpeggio-chaos`, `register-window`
- **sources:** src/composables/use-generation-session.ts, docs/music/harmony-planner-policy.md

### Signature figure

- **id:** `signature-figure`
- **aliases:** gimmick (the owner's word), hook, lick, riff
- **popup:** Internal: a short melodic idea that marks a style or a song, like a famous riff or a typical blues bend.
- **definition:** A signature figure is a short melodic or rhythmic idea that listeners associate with a style, a player or a song: a riff, a hook, a stock lick, a characteristic ornament. Musicians build a personal or stylistic vocabulary partly from such figures and reuse them, varied, in new phrases.
- **in_infinite_flow:** Internal word for what the owner calls a "gimmick". The app cannot store one today; later presets may carry a few (spec decision D228 places them after v3), and Jam (v3.2) grows a player's own idea. Not built.
- **related:** `riff`, `lick`, `motif`, `played-signal`, `idiolect`, `musical-identity`
- **sources:** specs/versions/v3/README.md, specs/personas.md

### System voice

- **id:** `system-voice`
- **aliases:** side instrument, companion voice
- **popup:** Internal: a voice the app plays alongside the player's line, such as the backing's bass or a planned accompaniment role.
- **definition:** A system voice is any line the app itself plays during a session, as opposed to the line the player plays. In the research and spec notes it is the unit of v4's accompaniment: each system voice has a role and a register and, later, a timbre and a character.
- **in_infinite_flow:** Today the backing's bass and chords are the only system voices (BackingVoice in src/audio/audio-ports.ts, kept narrow so that v4 can widen it). The endgame vision makes companions and antagonists system voices.
- **related:** `voice`, `accompaniment`, `accompaniment-role`, `vertical-layering`
- **sources:** docs/music/accompaniment-systems.md, src/audio/audio-ports.ts, specs/versions/v4/README.md, specs/vision/endgame.md

### Tick

- **id:** `tick`
- **aliases:** sixteenth tick, grid slot
- **popup:** Internal: the app's smallest time slot, one sixteenth note. A measure has 16 ticks; a phrase has 64.
- **definition:** A tick is the app's unit of rhythmic time, one sixteenth note long. Each 4/4 measure has 16 ticks, numbered from 0, so beat 1 starts at tick 0, beat 2 at 4, beat 3 at 8 and beat 4 at 12; the four-measure phrase has 64. A quarter note is 4 ticks and an eighth note 2. Rest budgets, syncopation shifts and the metrical anchor rule are all stated in ticks.
- **related:** `sixteenth-note`, `measure`, `metrical-anchor`, `subdivision`
- **sources:** S8a, docs/music/rhythm-phrase-structure.md

### Unsupported rhythm combination

- **id:** `unsupported-rhythm-combination`
- **aliases:** blocked rhythm setting
- **popup:** Internal: a mix of rhythm settings the app can't turn into a four-measure phrase yet, so Generate is blocked.
- **definition:** Some combinations of the four rhythm controls have no legal four-measure rhythm under the current rules. The app lists them in advance and blocks Generate and Regenerate while one is selected, showing an alert ("This mix of note density, silence, and syncopation can't form a four-bar phrase yet...") instead of letting generation fail. This is a limit of the current rhythm rules, not a musical judgment.
- **in_infinite_flow:** Ten combinations, keyed by rhythmic variety. Strict: Quarter + Sparse + Active displacement; Quarter + Breath-heavy + Active displacement; Sixteenth + Sparse + Active displacement; Sixteenth + Conversational + Active displacement; Sixteenth + Breath-heavy + Occasional offbeats; Sixteenth + Breath-heavy + Active displacement. Slightly varied: the same list minus the two Sixteenth + Sparse/Conversational + Active displacement cases. Heavily varied: none. Eighth notes are never blocked.
- **related:** `control-note-density`, `control-rhythmic-variety`, `control-silence-density`, `control-syncopation`
- **sources:** src/domain/controls/unsupported-rhythm-settings.ts, docs/music/rhythm-phrase-structure.md
