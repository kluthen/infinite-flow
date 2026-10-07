# Recognising Played Patterns

Status: research v1 (2026-10-07)

## Purpose

The owner wants Infinite Flow to recognise a few short patterns the player plays as **signals**: a
deliberate musical "word" that steers the app, such as "now it's your turn" or "I disapprove of
this phrase". This document prepares the v3 spec session on that idea. It gathers what musicians
call such signals, where games, instruments and music software already treat a played pattern as a
command, how a pattern can be matched in a stream of single MIDI notes, and how the idea could fit
the app.

It feeds three places in the specs:

- the v3.x candidate [learning from positive signals](../../specs/versions/v3/README.md#v3x--learning-from-positive-signals),
  and open questions O115, O116 and O120 in the
  [register](../../specs/open-questions.md#v3-release-plan-o117). O120 already proposes that an
  explicit cue the player plays is "the player judging a phrase, never the app judging the player";
- [Jam](../../specs/versions/v3/README.md#jam-growing-the-players-doodle) (v3.2), where the player
  hands the app a short idea and the app must know when that idea has ended;
- the [endgame](../../specs/vision/endgame.md), where fights are call-and-response exchanges of short
  phrases and the player "chooses between several options tied to their skills".

Nothing here is decided. Statements about the project cite a repository path; statements about the
outside world cite a source ID (S80–S99, listed under [Sources](#sources)). The author's own
judgments are marked **(proposed)**.

## How this was gathered

- **Repository.** Read [far vision](../../specs/vision/far-vision.md),
  [endgame](../../specs/vision/endgame.md), the [v3 README](../../specs/versions/v3/README.md)
  (learning, stray notes, Jam), [v2 master spec §6–§8](../../specs/versions/v2/master-spec.md#8-midi-input-and-note-acknowledgement),
  [personas](../../specs/personas.md), the [lexicon](lexicon.md) and
  [research sources](research-sources.md). Read the code that captures played notes:
  `src/midi/midi-message.ts`, `src/midi/played-note-tracker.ts`, `src/midi/midi-clock-mapping.ts`,
  `src/domain/acknowledgement/played-onset-latency.ts`,
  `src/domain/acknowledgement/note-matching.ts`, `src/session/session-history.ts` and
  `src/components/workspace/workspace-session-midi.ts`.
- **Outside sources,** read on 2026-10-07: Wikipedia articles for music vocabulary and games, a
  community guide for _Ocarina of Time_'s songs, and the primary papers for the Continuator, GenJam,
  query by humming and TapSongs (the Continuator and GenJam papers were read in full text). Two fan
  wikis refused access, so the _Ocarina of Time_ details rest on Wikipedia, Wikibooks and the fan
  wikis' search summaries.
- **Not done:** no code was run, nothing was tried on the reference hardware (a Travel Sax 2 and a
  keyboard, [personas](../../specs/personas.md)), and no listening or playing test was made. The
  accidental-trigger figures in [How long a pattern must be](#how-long-a-pattern-must-be) are the
  author's arithmetic, not measurements.

## 1. What musicians call such signals

Musicians have many words for short musical ideas and for the signals that organise a group. The
owner's "signal patterns" sit where the two meet.

### Words for the signal itself

- **Cue.** In ensemble music, a cue tells a player when to come in, typically after a long rest;
  printed parts even show "cue notes", small notes copying another instrument's line so the player
  can hear where to enter (S82). A cue can be a gesture, a written hint, or something heard.
  - **Watch out (proposed):** the app already uses the word for something else. The "session cue
    row" is the row under the toolbar where _the app_ speaks to the player: the starting-note line,
    the count-in and notices (`src/components/workspace/SessionCueRow.vue`,
    `ui_ux/flows/play-session/intent.md`). Calling the player's played pattern a "cue" too would mix
    the two directions. This document says **played signal** for the player's pattern.
- **Hand signals at a jam session.** At an informal jam, players steer the tune with gestures:
  pointing at someone means "take a solo", patting the top of the head means "back to the head"
  (the tune's main melody), four fingers on each hand means "trade fours", a raised fist means
  "last time through" (S84, S83). These are cues given with the body, not with the instrument, which
  is exactly what a wind player with both hands on the instrument cannot do
  ([personas](../../specs/personas.md): "the hands, and the mouth on a sax or Travel Sax, are on the
  instrument").
- **Played cues.** Some traditions cue with the instrument itself:
  - In African drumming, the master drummer's pattern sets up and coordinates the ensemble's
    response (S80).
  - In a samba band, the leader (the _mestre_) plays the repinique drum and uses whistles to signal
    breaks and calls (S86).
  - In Indian classical music, a **tihai** is a short rhythmic phrase played three times in a row,
    landing on the first beat of the cycle; it marks the end of a section (S85). It is a played
    "this is the end" signal recognisable from its threefold repetition. (A **cycle** here is the
    repeating rhythmic frame, like a fixed number of measures.)

### Words for the musical material

- **Call and response.** Two distinct phrases in a row that work like a conversation: one musician
  (or group) plays a phrase, another answers it (S80). It comes mainly from African traditions and
  runs through jazz, blues, gospel and soul (S80). The endgame's fights are described as exactly
  this ([endgame](../../specs/vision/endgame.md)).
- **Trading fours (eights, twos).** In jazz, players take turns improvising short solos of a fixed
  length: four measures each ("fours"), or eight, two, single measures or whole choruses (S81).
  Each answer may complement or contrast the one before (S81). The turn changes because the form
  says so (after four measures), not because of a signal: everybody counts.
- **Motif.** A short musical idea, a recurring figure with its own identity, the smallest unit a
  listener recognises as a theme; Beethoven's four-note opening of the Fifth Symphony is the
  classic example (S82). The v3 README already uses the word for the player's Jam doodle
  ([v3 README](../../specs/versions/v3/README.md#jam-growing-the-players-doodle)).
- **Leitmotif (signature motif).** A motif tied to a person, place or idea, so that hearing it
  evokes them (S82). The endgame's characters have "a signature motif or gimmick"
  ([endgame](../../specs/vision/endgame.md)): in musical terms, a leitmotif.
- **Lick.** A stock melodic phrase a player has learned and reuses in solos, part of their
  vocabulary (S83).
- **Riff.** A short phrase repeated over and over, often as the backbone of a song; big bands
  traded riffs between sections in call-and-response fashion (S83).
- **The head.** In jazz, the tune's main theme. A typical performance plays the head, then solos,
  then the head again ("head in, head out"), and players signal the return by patting their head
  (S83).

> **Why the vocabulary matters for the design (proposed).** The words split cleanly into _what is
> played_ (motif, lick, riff, head) and _what organises the playing_ (cue, hand signal, the form in
> trading fours). A played signal is a motif used as a cue. Musicians mostly cue with the body or
> with the form, and cue with the instrument only when the pattern is unmistakable: a whistle over
> drums, a threefold repetition. That is the design problem in one sentence.

## 2. Precedent

For each case: what the pattern is, how strict the match is, and how false triggers are avoided.

### Games

| Case                                    | The pattern                                                                                                                                                                                                                                 | How strict                                                                                                                          | How false triggers are avoided                                                                                                                                                                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **_Ocarina of Time_**                   | Songs played on a five-note ocarina mapped to five buttons; Link learns 12 songs that teleport him, change the time of day, summon his horse or solve puzzles (S87). Zelda's Lullaby is six notes (S87).                                    | Exact note sequence. The guides describe songs as button sequences and mention no rhythm requirement (S87).                         | The player first takes out the ocarina: playing is a mode of its own, so walking never triggers a song. Songs are taught by characters and kept in a list (S87).                                                                                                           |
| **_Ocarina of Time_: Scarecrow's Song** | The player composes their own eight-note song, which the scarecrow memorises; replayed later, it summons a helper (S87).                                                                                                                    | Exact, against the player's own recording.                                                                                          | The scarecrow refuses a song that is one of the game's songs or a single repeated note (S87): a validation rule for player-defined patterns.                                                                                                                               |
| **_Patapon_**                           | Four drums on four buttons; each command is four beats long, e.g. "Pata-Pata-Pata-Pon" to march, "Pon-Pon-Pata-Pon" to attack (S88).                                                                                                        | Exact drum sequence _and_ on the beat: a pulsing screen border shows the beat (S88).                                                | The beat itself frames every command. After each command the Patapons sing it back (S88), so the player hears it was understood. Off-beat input loses the combo and "fever" bonus (S88), a penalty this app would not copy.                                                |
| **_Loom_**                              | "Drafts": four-note tunes the hero plays on his distaff (a magic staff), from the notes C, D, E, F, G, A and B (S89).                                                                                                                       | Exact four notes; a draft played backwards gives the opposite effect ("Dye" reversed is "Bleach"), unless it is a palindrome (S89). | Drafts are learned by watching an object (S89). Many are randomised per game (S89), so a player cannot guess them, and the player starts with only three notes and gains more (S89).                                                                                       |
| **_PaRappa the Rapper_**                | The teacher raps a line; the player answers it with timed button presses (S90).                                                                                                                                                             | Timed, rated Good, Bad, Awful or Cool (S90).                                                                                        | It is a call and response with the turn fixed by the song. Improvising well enough flips into "Cool" mode, where the teacher leaves the stage and the player raps freely (S90): an improvisation recognised as such, but through a rating.                                 |
| **_Rock Band_** and **_Guitar Hero_**   | Drum fills are free improvisation sections, closed by a crash cymbal hit that activates the "Overdrive" power; songs may end with a free "Big Rock Ending" (S91). _Guitar Hero_ activates "Star Power" by tilting the guitar upright (S91). | Fills: free, only the closing hit counts. Tilt: not a note at all.                                                                  | The game marks _where_ a command may be given (fill sections, S91). _Guitar Hero_ puts the command on a separate channel, a tilt, so no played note can trigger it (S91).                                                                                                  |
| **_Theatrhythm Final Fantasy_**         | Tap, slide and hold "triggers" on a touchscreen, in time with Final Fantasy music; in battle stages, correct taps deal damage (S92).                                                                                                        | Timing-graded.                                                                                                                      | There are no player-chosen commands: the player follows a script. Reviews found the RPG layer mostly a "visual aid" over the rhythm play (S92). It is the endgame's inspiration ([endgame](../../specs/vision/endgame.md)), but it is not a precedent for played commands. |

The pattern is consistent (proposed reading): **every game frames its commands**, by a mode (the
ocarina is taken out), by the beat (Patapon), by a marked section (Rock Band fills), or by a channel
that is not a note at all (Guitar Hero's tilt). None asks its engine to tell a command apart from
free melodic playing on the same notes.

### Infinite Flow already has one played signal

The v2 app already starts a session from a played note: at Idle, playing exactly the note phrase 1
starts on (octave included) starts the count-in, and any other note starts nothing and changes
nothing on screen ([v2 master spec §6](../../specs/versions/v2/master-spec.md#6-backing-click-count-in-and-tempo)).
It is framed three ways: it only works at Idle, only for that one exact pitch, and the screen names
the note while it would work. The personas record why it exists: during a session "nothing the
player has to do … may need a click or a key press" ([personas](../../specs/personas.md)). A played
signal is the same idea, extended.

### Jam-session practice: how humans hand over the turn

- **By the form.** In trading fours, the turn changes after four measures because everyone counts
  (S81). Nobody signals it.
- **By the body.** Hand signals for "you take it", "back to the head", "last time" (S84).
- **By a played cue that cannot be mistaken.** A whistle over drums (S86), a phrase repeated three
  times (S85).
- **By trailing off.** A soloist who stops playing leaves the space for someone else. The
  Continuator (below) automates exactly this.

### Interactive music systems

- **The Continuator** (Pachet, 2002–2003). A system that listens to a keyboard player over MIDI and
  answers each phrase with a continuation in the player's style (S93, S94). Its turn-taking has
  three rules (S94):
  1. A phrase ends when the player is silent longer than a time threshold, "typically about 400
     milliseconds", adjusted dynamically; then the system answers. The underlying mechanism is a
     thread that compares the time since the last note with a threshold (S93).
  2. The answer usually lasts as long as the player's phrase.
  3. The player has priority: if they play while the system answers, it stops and listens again.
     Children aged 3 to 5 learned these rules without being told (S94). For matching, the Continuator
     does not compare raw notes only: it can "reduce" them to coarser descriptions (pitch with
     duration and loudness, then pitch regions of a few notes, then larger regions), and falls back to
     a coarser one when the exact one finds nothing (S93).
- **GenJam** (Biles, 1990s). A jazz improviser program that trades fours with a human trumpeter: it
  listens to the human's four measures through a pitch-to-MIDI converter, turns them into its own
  representation, varies them (reversing, rotating, transposing, inverting) in the last 30 ms of the
  human's turn, and plays the result as its four (S95). The turn is fixed by the form, as in human
  trading. Two details matter here:
  - The converter was noisy (32 played notes arrived as 53 note pairs), and GenJam coped by keeping
    only the last note-on in each eighth-note slot (S95), a filter for stray notes.
  - GenJam was trained by a human "mentor" who said "good" or "bad" while it played; those
    judgments raised or lowered the fitness of its melodic ideas (S95). That is an explicit
    disapproval signal used to learn taste, the closest precedent to the owner's "I disapprove".
- **Score following** (since 1984). A program that tracks where a live player is in a known score,
  so that an accompaniment can follow them (S96). Dannenberg's 1984 algorithm matches the played
  notes against the score with dynamic programming (a step-by-step best-alignment search), which
  tolerates wrong, extra and missing notes (S96). It is the opposite problem to signal spotting:
  it assumes the player _is_ playing the expected material.
- **Query by humming** (Ghias et al., 1995). Finds a song from a hummed tune by reducing both to
  their up/down/same steps and allowing a few mismatches; 10 to 12 such steps were enough to tell
  apart 90% of 183 songs (S97). Its ancestor, Parsons' 1975 _Directory of Tunes_, indexed about
  15,000 themes by contour alone and found that "up, up" was the opening of 23% of them (S97).
- **TapSongs** (Wobbrock, 2009). Rhythm-only passwords: a user taps a jingle on a single button,
  and the system matches its timing to a model built from 12 examples. Genuine users got in 83.2%
  of the time; imposters who had watched and heard the login got in 10.7% of the time, and 19.4%
  after hearing the jingle played on a synthesised piano (S99). Rhythm alone carries real identity,
  but a rhythm-only pattern misses about one genuine try in six.

## 3. Matching approaches for a monophonic MIDI stream

### What the app captures today

Each played note reaches the app as a MIDI note-on, read in concert pitch on any channel; a
note-on with velocity 0 or a note-off only ends a note; breath data, pitch bend, aftertouch and
other controller messages are ignored
([v2 master spec §8](../../specs/versions/v2/master-spec.md#8-midi-input-and-note-acknowledgement),
`src/midi/midi-message.ts`). The played-note tracker reports a note at its note-on with its
**pitch, velocity and onset**, and again when it ends with its **release** (so its duration)
(`src/midi/played-note-tracker.ts`). Onsets are placed on the audio clock
(`src/midi/midi-clock-mapping.ts`), and acknowledgement uses a latency-corrected onset
(`src/domain/acknowledgement/played-onset-latency.ts`). The session history keeps each played
note's pitch, velocity, onset and release (`src/session/session-history.ts`).

So a recogniser has, for every note: pitch (exact), onset (precise on USB; on Bluetooth about
70–80 ms late and delivered in batches, per §8), velocity, and duration, but **duration only once
the note is released**. A recogniser that fires on the last note's onset is faster than one that
waits for its release (proposed).

### The approaches

From the strictest to the loosest. A pattern is described here by up to three features: its
pitches, its rhythm (the time between onsets, called the **inter-onset interval**), and its
contour (the up/down shape, see [contour](lexicon.md#contour)).

| Approach                     | What it compares                                                                                                                                                                                            | Survives                                   | Cost per note (K patterns of length L)  | Fit (proposed)                                                                                                                                                            |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Exact sequence**           | The exact pitches, in order (Loom, Ocarina, S89, S87)                                                                                                                                                       | Nothing: one wrong or stray note breaks it | K × L comparisons                       | Simple and strict. Fragile against stray notes.                                                                                                                           |
| **Transposition-invariant**  | The [intervals](lexicon.md#interval) between successive notes, in semitones                                                                                                                                 | Playing it starting on any note            | K × L                                   | Good: a signal works in any key, on any instrument template, and is untouched by a controller's octave or semitone offset (the problem the controller check handles, §8). |
| **Tempo-invariant rhythm**   | Ratios between inter-onset intervals (e.g. short-short-long = 1:1:2)                                                                                                                                        | Any tempo                                  | K × L                                   | Needed at Idle, where no beat runs. Alone, weaker than pitch: TapSongs' 83% genuine success (S99).                                                                        |
| **Beat-relative rhythm**     | Onsets snapped to the session's beat grid                                                                                                                                                                   | Small timing slop only                     | K × L                                   | Only during a session, where the backing gives a beat. This is Patapon's model (S88).                                                                                     |
| **Tolerant (edit distance)** | The cheapest set of inserted, deleted or changed notes turning the played notes into the pattern; for melodies, Mongeau and Sankoff added "one note split into several" and "several merged into one" (S98) | A stray note, a split note, one slip       | K × L × W, W the notes looked back over | Good when limited to _insertions of short notes_: absorbs stray notes without accepting wrong pitches (proposed).                                                         |
| **Dynamic time warping**     | Best alignment of two sequences that may run at different, changing speeds; cost grows with the product of the two lengths (S98)                                                                            | Uneven tempo                               | K × L × W                               | Overkill for patterns of a few notes (proposed).                                                                                                                          |
| **Contour only**             | Up, down or same, as in query by humming (S97)                                                                                                                                                              | Any pitch, any interval size               | K × L                                   | Far too common in normal playing: "up, up" opens 23% of themes (S97). Unusable alone for signals (proposed).                                                              |

**Pitch-only versus rhythm-only (proposed).** Pitch carries more information per note than rhythm,
and the app's acknowledgement already trusts exact pitch
([§8](../../specs/versions/v2/master-spec.md#8-midi-input-and-note-acknowledgement)). Rhythm-only
patterns lose to stray notes (each one adds an onset) and need a beat to be precise. A signal
defined by intervals, with a loose rhythm shape at most, is the best fit.

### How long a pattern must be

A signal must almost never occur by accident while the player improvises or follows a phrase. A
rough estimate (proposed, the author's arithmetic): suppose the player plays 3 notes per second and
each note is, independently, one of the 7 notes of the scale. A given exact 4-note pattern then
turns up by chance about once every 2,400 notes, roughly **every 13 minutes**; a 6-note pattern
about once every 118,000 notes, roughly **every 11 hours**. Counting only intervals (any starting
note), a 4-note pattern turns up about every 2 minutes. Counting only contour, a 4-note pattern
turns up every few seconds.

Real playing is not random, which cuts both ways:

- Melodies move mostly by step ([S7](research-sources.md#melody-tension-and-resolution)), so a
  signal built from steps (a scale run) is far more likely than the estimate, and a signal built
  from rare moves is far less likely.
- A signal can use moves the generator never writes. Every phrase stays inside a one-octave
  register window, a hard filter for the whole phrase
  ([saxophone profile ranges](saxophone-profile-ranges.md)), so **no interval inside a generated
  phrase is wider than an octave**. A signal containing a leap wider than an octave can therefore
  never be produced by following a phrase (proposed reading of that rule; a join between two
  phrases in different windows is not covered by it).
- Repetition helps: a tihai is recognisable because it says the same thing three times (S85).

**Starting point (proposed):** 5 to 8 notes, at least one feature rare in both improvising and
generated phrases (a leap wider than an octave, a repeated note three times, a tritone), and a
frame (next section). Before adopting a built-in signal, check it against a corpus of generated
phrases with the phrase replay tool and against recorded improvisation.

### Framing a signal

A frame marks "what follows is a signal, not music". Candidates, judged against this app:

| Frame                                                        | Precedent                                                                            | Fit (proposed)                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Silence before and after** (e.g. at least one second)      | The Continuator's phrase-end threshold, about 400 ms (S94)                           | Good and instrument-agnostic. Costs latency: the recogniser must wait for the trailing silence. During a session the backing keeps rolling, so "silence" means the player's silence.                                                                                                     |
| **Extreme register, outside the instrument profile's range** | None found; the Ocarina's "take the instrument out" is the nearest mode switch (S87) | Strong: such notes are never expected notes and never the starting note (both lie inside the range). But a Travel Sax 2 may not reach outside the tenor profile's concert range `46-70` ([saxophone profile ranges](saxophone-profile-ranges.md)); this must be checked on the hardware. |
| **High velocity** ("play it loud")                           | None found                                                                           | **Poor.** The reference breath controller sends stray notes "often in pairs at velocity 127" ([v3 README](../../specs/versions/v3/README.md#stray-notes-from-controllers)), so loudness is exactly where its noise lives.                                                                |
| **The beat**                                                 | Patapon (S88)                                                                        | Only in a session. Good for the endgame, where commands are part of the music.                                                                                                                                                                                                           |
| **A separate channel** (a pedal, a controller button)        | _Guitar Hero_'s tilt (S91)                                                           | No collision at all, but v2 ignores every non-note message (§8), controllers differ, and the far vision wants the app instrument-agnostic ([far vision](../../specs/vision/far-vision.md#guiding-principles)). A later option, not a base.                                               |
| **A repeated motif** (play it twice or three times)          | Tihai (S85), riffs (S83)                                                             | Good: repetition is rare by accident when the motif is not a scale run. Doubles the length.                                                                                                                                                                                              |
| **Chords** (several keys at once)                            | None needed                                                                          | Not instrument-agnostic: a wind controller plays one note at a time.                                                                                                                                                                                                                     |

### Cost in a browser

Small (proposed estimate). The stream is at most a few notes per second; sixteenth notes at
240 BPM are 16 notes a second. With 20 patterns of 8 notes, tolerant matching over the last 16
notes is about 2,500 small comparisons per played note: microseconds in JavaScript, with no need
for a worker. It belongs beside acknowledgement on the main thread
(`src/components/workspace/workspace-session-midi.ts` is where played notes are handled), not on
the generation worker, which is already the expensive path (ISS-009, cited in the
[v3 README](../../specs/versions/v3/README.md#embellishment-flags)). It must be deterministic and
use only the notes played, never the network, since played notes stay on the player's device
([v2 master spec §7](../../specs/versions/v2/master-spec.md#7-sessions-review-export-and-privacy)).

## 4. Fit with the app (proposed)

Everything in this section is the author's proposal for discussion.

### Where signals could be read

| Where                | What a signal could do                                                                                     | Collisions to handle                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Idle**             | Start or end a Jam doodle; "your turn"; "a new phrase, please" (regenerate).                               | The starting note: any signal whose first note is phrase 1's first note would start a session ([§6](../../specs/versions/v2/master-spec.md#6-backing-click-count-in-and-tempo)). Since the starting note changes with every phrase, a signal cannot simply avoid it. Options: frame signals outside the instrument range, or revisit the start rule (O110, [register](../../specs/open-questions.md#v3-pre-generation-at-idle-o107)). |
| **During a session** | "I disapprove of this phrase" (learning, v3.x); in a call-and-response mode, "your turn".                  | The player is meant to be playing the phrase; a signal is time taken from it. Expected notes keep falling due and simply go unacknowledged, which v2 already treats as normal ([§7](../../specs/versions/v2/master-spec.md#7-sessions-review-export-and-privacy)).                                                                                                                                                                    |
| **Jam (v3.2)**       | Mark the end of the doodle ("your turn").                                                                  | The doodle's notes are the material: a signal's notes must be cut out of it, or they would shape the continuation and the key suggestion.                                                                                                                                                                                                                                                                                             |
| **Review**           | Little. The hands are free between sessions ([personas](../../specs/personas.md)), so a click does better. | No note starts anything there ([§6](../../specs/versions/v2/master-spec.md#6-backing-click-count-in-and-tempo)), so it is collision-free if ever needed.                                                                                                                                                                                                                                                                              |

**For "your turn" in Jam, prefer silence or form over a signal.** Humans hand over the turn by the
form (trading fours, S81) or by stopping; the Continuator's ~400 ms silence rule was learned
implicitly even by small children (S94); GenJam traded on a fixed four measures (S95). A fixed
doodle length or a trailing silence asks the player to learn nothing. A played signal earns its
place where music has no natural marker, such as "I disapprove".

### Interaction with acknowledgement

- A signal's notes are not expected notes, and recognising a signal must never change
  acknowledgement. Acknowledgement only ever lights an expected note whose exact pitch is played
  inside its window, and anything else changes nothing on screen
  ([§8](../../specs/versions/v2/master-spec.md#8-midi-input-and-note-acknowledgement),
  `src/domain/acknowledgement/note-matching.ts`). A signal note that happens to light an expected
  note is harmless: a positive catch is still true.
- Both run on the same played notes, independently. The signal recogniser reads; it does not remove
  notes from the acknowledgement stream.
- A recognised signal's notes should be **tagged** in the session history, so the review and the
  played-notes export can show or hide them, and so learning never counts them as a "deliberate
  departure that still fits" ([v3 README](../../specs/versions/v3/README.md#v3x--learning-from-positive-signals)).

### Interaction with stray-note filtering

The v3.0.1 filter will drop notes that do not last "long enough"
([v3 README](../../specs/versions/v3/README.md#stray-notes-from-controllers)). Its threshold needs
each note's release, which a fast recogniser does not wait for. Proposed: match with a tolerance
that skips inserted notes (a stray note between two signal notes is ignored), but never accepts a
wrong pitch in place of a signal note. Stray notes then cost nothing, and the filter is still
needed for Jam and the export. Do not use velocity as a frame (above). GenJam faced the same noise
from its pitch-to-MIDI converter and solved it with a simple per-slot filter (S95).

### The never-penalize principle

The principle: "Infinite Flow acknowledges and encourages; it never penalizes, grades, ranks or
scores the player. Anything that adapts to how you play is opt-in and visible"
([far vision](../../specs/vision/far-vision.md#guiding-principles)).

**An explicit "I disapprove" signal keeps the principle (proposed), on four conditions:**

1. **The judgment goes from the player to the phrase.** The player tells the app "less like this".
   The app judges nothing about the player. GenJam's mentor saying "bad" is the precedent (S95).
   This is the line O120 already draws
   ([register](../../specs/open-questions.md#v3-release-plan-o117)).
2. **Recognition is positive-only.** A signal is recognised or nothing happens. There is no "almost",
   no "try again", no mark for a signal played badly: the same "only a positive catch is ever
   marked" rule as acknowledgement
   ([§8](../../specs/versions/v2/master-spec.md#8-midi-input-and-note-acknowledgement)).
3. **It changes taste, never difficulty or anything about the player,** and each change is small
   and reversible (O115 and O116's proposals). Because a false "I disapprove" costs more than a
   missed one, the signal should be tuned to rarely fire by accident, even at the price of
   sometimes needing a second try.
4. **Opt-in, visible, undoable.** Signals are off until the player turns them on; a recognised
   signal is acknowledged where the player can see it (a neutral line in the session cue row,
   in the spirit of Patapon's sung-back command, S88); and the review lists the signals heard, so
   the player can undo one.

Implicit signals keep the existing proposed rule: positive-only, a miss never counts against a
phrase ([v3 README](../../specs/versions/v3/README.md#v3x--learning-from-positive-signals)). The
explicit signal is the one deliberate exception.

A running session never asks the player for input. Signals respect that: the player starts them,
and the app never prompts "play the signal to continue" (proposed).

### Discoverability: how a player learns the patterns

Games teach commands in context: _Ocarina_'s songs are taught by characters and kept in a song list
(S87), _Loom_'s drafts are learned by watching and noted in a book (S89), _Patapon_ adds commands as
the game goes and sings each one back (S88), _PaRappa_'s teacher demonstrates first (S90).
Proposed for the app:

- a **Signals** panel (between sessions) listing each signal on a small staff in the player's own
  written pitch, with its meaning and a short audio demo;
- a **try area** at Idle that lights the signal when recognised, with nothing shown otherwise;
- a short list: two or three built-in signals at first. Each one is something to memorise.

### Built-in versus player-defined

- **Built-in first (proposed).** The app can check a built-in signal against generated phrases and
  improvisation before shipping it, and every player can read the same help.
- **Player-defined later.** The precedents show how: the Scarecrow's Song rejects a copy of an
  existing song or a single repeated note (S87); TapSongs builds its model from 12 examples in under
  two minutes (S99). Rules for a player's signal would be: a minimum length, not too close to a
  built-in signal, not a plain scale run, and stored only on the player's device, opt-in and
  deletable like played notes
  ([v3 README](../../specs/versions/v3/README.md#review-of-earlier-sessions)).

### What the endgame would additionally need

- **Commands on the beat.** In a fight, a played pattern chooses a skill. That is Patapon's model:
  fixed-length commands, synchronised with the beat, and a response the player hears (S88).
- **Turns fixed by the form**, as in trading fours (S81) and GenJam (S95), so the player always
  knows when their turn starts and ends.
- **Several patterns at once, each clearly distinct,** so one is never mistaken for another; and
  character signatures (leitmotifs) that the app plays and the player may recognise or answer.
- **A way to learn and collect patterns,** as Ocarina and Loom do (S87, S89): in the endgame,
  learning a pattern is progression.
- **A decision on outcomes.** Patapon's lost combo, PaRappa's ratings and Theatrhythm's damage from
  timing (S88, S90, S92) all grade the player. The endgame already lists "win and lose" as an open
  tension with the principle ([endgame](../../specs/vision/endgame.md)). Pattern _recognition_ by
  itself does not grade (a pattern is recognised or not); pattern _quality_ (how well, how on time)
  would.

**Too early? (proposed)** The recogniser itself is cheap and could be built once. What is early is
the vocabulary of signals and their effects: "I disapprove" depends on the v3.x learning candidate,
which may move or go, and the endgame's commands are far off. Jam's "your turn" is better served by
silence or form. A reasonable path is to design the recogniser's place (beside acknowledgement,
tagging signal notes) when Jam is specified, and to ship signals only when a feature needs one.

## 5. Proposed lexicon entries

Merged into the [lexicon](lexicon.md) on 2026-10-07: [Call and response](lexicon.md#call-and-response), [Cue](lexicon.md#cue), [Head](lexicon.md#head), [Leitmotif](lexicon.md#leitmotif), [Lick](lexicon.md#lick), [Motif](lexicon.md#motif), [Riff](lexicon.md#riff), [Trading fours](lexicon.md#trading-fours), [Played signal](lexicon.md#played-signal).

## Sources

In the format of [research sources](research-sources.md), in the block reserved for this document
(S80–S99). They are reference only; nothing is copied from them.

- **S80 - Call and response (music).** Wikipedia: https://en.wikipedia.org/wiki/Call_and_response_(music)
  - Useful for: the definition of call and response, its African origins, the master drummer's coordinating pattern, and its place in blues, gospel, jazz and soul.
  - Applied in: the vocabulary section and the `call-and-response` draft entry.
- **S81 - Trading fours.** Wikipedia, Drum solo: https://en.wikipedia.org/wiki/Drum_solo and A Way with Words, "trade fours": https://www.waywordradio.org/trade_fours_1/
  - Useful for: alternating four-bar solos, and the variants (eights, twelves, twos, single bars, choruses).
  - Applied in: the vocabulary and jam-practice sections, the turn-by-form argument, the `trading-fours` draft entry.
- **S82 - Motif, leitmotif and cue notes.** Wikipedia: https://en.wikipedia.org/wiki/Motif_(music) and https://en.wikipedia.org/wiki/Cue_note
  - Useful for: the motif as the smallest unit with thematic identity, the leitmotif as a motif tied to a person or idea, and cue notes as entrance hints after long rests.
  - Applied in: the vocabulary section and the `motif`, `leitmotif` and `cue` draft entries.
- **S83 - Lick, riff and head.** Wikipedia: https://en.wikipedia.org/wiki/Lick_(music), https://en.wikipedia.org/wiki/Riff and https://en.wikipedia.org/wiki/Head_(music)
  - Useful for: the lick as stock vocabulary, the riff as a repeated figure (and big-band riff exchanges), the head and the head-solos-head form, and the head-pat signal.
  - Applied in: the vocabulary section and the `lick`, `riff` and `head` draft entries.
- **S84 - Jam session hand signals.** Sonicbids blog, "8 Jam Session Hand Signals That Every Musician Should Know": https://blog.sonicbids.com/8-jam-session-hand-signals-musicians
  - Useful for: how players cue solos, the head, trading fours and endings with gestures.
  - Applied in: the vocabulary and jam-practice sections. A practitioner blog, not a reference work.
- **S85 - Tihai.** Wikipedia: https://en.wikipedia.org/wiki/Tihai
  - Useful for: a phrase played three times that lands on the first beat of the cycle and marks the end of a section.
  - Applied in: played cues, repetition as a frame, accidental-trigger reasoning.
- **S86 - Samba band.** Wikipedia: https://en.wikipedia.org/wiki/Samba_band
  - Useful for: the mestre leading with the repinique and whistles that signal breaks and calls.
  - Applied in: played cues and jam-practice sections.
- **S87 - _The Legend of Zelda: Ocarina of Time_ songs.** Wikipedia: https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Ocarina_of_Time ; Wikibooks, Ocarina Songs: https://en.wikibooks.org/wiki/The_Legend_of_Zelda:_Ocarina_of_Time/Ocarina_Songs ; Zelda Wiki, Scarecrow's Song: https://zeldawiki.wiki/wiki/Scarecrow%27s_Song
  - Useful for: the five-note ocarina, the 12 songs and their effects, song lengths, songs taught by characters, the player-composed eight-note Scarecrow's Song and its refusal of existing songs or one repeated note.
  - Applied in: the games table, framing, discoverability, player-defined signals. The Zelda Wiki page refused direct access; its content was read through search summaries.
- **S88 - _Patapon_.** Wikipedia: https://en.wikipedia.org/wiki/Patapon
  - Useful for: four-drum, four-beat commands on a visible beat, the sung-back confirmation, and the combo and fever lost off the beat.
  - Applied in: the games table, beat framing, feedback, the endgame needs.
- **S89 - _Loom_.** Wikipedia: https://en.wikipedia.org/wiki/Loom_(video_game)
  - Useful for: four-note drafts on a C-to-C scale, learning by observation, reversed drafts, per-game randomisation and the no-labels Expert level.
  - Applied in: the games table, discoverability.
- **S90 - _PaRappa the Rapper_.** Wikipedia: https://en.wikipedia.org/wiki/PaRappa_the_Rapper
  - Useful for: call and response with a teacher, the Good/Bad/Awful/Cool rating, and freestyle that flips into Cool mode.
  - Applied in: the games table, the endgame outcomes discussion.
- **S91 - _Rock Band_ and _Guitar Hero_.** Wikipedia: https://en.wikipedia.org/wiki/Rock_Band and https://en.wikipedia.org/wiki/Guitar_Hero_(video_game)
  - Useful for: freestyle drum fills closed by a crash to trigger Overdrive, the Big Rock Ending, and Star Power triggered by tilting the guitar.
  - Applied in: the games table, the separate-channel frame.
- **S92 - _Theatrhythm Final Fantasy_.** Wikipedia: https://en.wikipedia.org/wiki/Theatrhythm_Final_Fantasy
  - Useful for: tap, slide and hold triggers, battle stages where timing deals damage, and reviews of its RPG layer.
  - Applied in: the games table, the endgame outcomes discussion.
- **S93 - The Continuator, system paper.** François Pachet, "Interacting with a Musical Learning System: The Continuator", ICMAI 2002: https://www.francoispachet.fr/wp-content/uploads/2021/01/pachet-02-icmai-final.pdf
  - Useful for: the phrase-end detection thread and its threshold, and the hierarchy of reduction functions (pitch, pitch regions) used when an exact match fails.
  - Applied in: interactive systems, matching approaches.
- **S94 - The Continuator with children.** Anna Rita Addessi and François Pachet, "Experiments with a musical machine: musical style replication in 3 to 5 year old children", British Journal of Music Education 22(1), 2005, DOI 10.1017/S0265051704005972: https://www.francoispachet.fr/wp-content/uploads/2021/01/pachet-04j.pdf
  - Useful for: the three turn-taking rules (a silence threshold of about 400 ms, an answer as long as the phrase, the player's priority) and children learning them implicitly.
  - Applied in: interactive systems, the silence frame, the "your turn" recommendation.
- **S95 - GenJam trading fours.** John A. Biles, "Interactive GenJam: Integrating Real-Time Performance with a Genetic Algorithm", International Computer Music Conference: https://genjam.org/wp-content/uploads/2019/07/bilesicmc98.pdf
  - Useful for: trading fours with a human through pitch-to-MIDI, the per-slot filter for noisy input, and a human mentor's "good"/"bad" feedback training the system's taste.
  - Applied in: interactive systems, stray notes, the never-penalize discussion, the endgame needs.
- **S96 - Score following.** Wikipedia: https://en.wikipedia.org/wiki/Score_following ; Roger B. Dannenberg, "An On-Line Algorithm for Real-Time Accompaniment", ICMC 1984: https://hdl.handle.net/2027/spo.bbp2372.1984.025
  - Useful for: tracking a live player in a known score, and dynamic-programming matching that tolerates wrong, extra and missing notes.
  - Applied in: interactive systems, tolerant matching.
- **S97 - Query by humming and contour codes.** Asif Ghias, Jonathan Logan, David Chamberlin and Brian C. Smith, "Query By Humming", ACM Multimedia 1995: https://www.cs.cornell.edu/zeno/papers/humming/humming.html ; Wikipedia, Parsons code: https://en.wikipedia.org/wiki/Parsons_code
  - Useful for: up/down/same contour matching with k mismatches, 10–12 steps to tell apart 90% of 183 songs, and the 23% share of the "up, up" opening.
  - Applied in: contour-only matching, accidental-trigger reasoning.
- **S98 - Edit distance and time warping for melodies.** Marcel Mongeau and David Sankoff, "Comparison of musical sequences", Computers and the Humanities 24, 1990, DOI 10.1007/BF00117340: https://doi.org/10.1007/BF00117340 ; Wikipedia, Dynamic time warping: https://en.wikipedia.org/wiki/Dynamic_time_warping
  - Useful for: melodic edit distance with insertion, deletion, substitution, fragmentation and consolidation; time warping for sequences at varying speed and its cost.
  - Applied in: matching approaches.
- **S99 - TapSongs.** Jacob O. Wobbrock, "TapSongs: Tapping Rhythm-Based Passwords on a Single Binary Sensor", UIST 2009, DOI 10.1145/1622176.1622194: https://doi.org/10.1145/1622176.1622194
  - Useful for: rhythm-only pattern matching learned from 12 examples, with genuine and imposter success rates.
  - Applied in: tempo-invariant rhythm matching, player-defined signals.

## Questions for the spec session

1. **Which signals, for what?** Is "I disapprove" the only signal worth building, given that "your
   turn" in Jam can be handled by silence or by a fixed doodle length? Which others does the owner
   have in mind (regenerate at Idle, "more like this", end the session)?
2. **Does the explicit-negative exception stand?** O120 proposes that a played "I disapprove" is the
   player judging a phrase and may be negative while implicit signals stay positive-only. Confirm,
   with the four conditions above (positive-only recognition, taste only, small and reversible,
   opt-in and visible)?
3. **Which phrase does a disapproval apply to** when it is played across a join between two
   phrases, or after the phrase has ended?
4. **How is a signal framed?** Silence around it, notes outside the instrument's range (to be tried
   on the Travel Sax 2), a repeated motif, or the beat? Velocity is ruled out by the reference
   controller's stray notes at velocity 127.
5. **What about the starting note?** A signal at Idle whose first note is phrase 1's first note
   would start a session. Frame signals out of range, or change the start rule (O110)?
6. **Built-in only, or player-defined too?** If player-defined, which validation rules (length, not
   a scale run, not too close to another signal), and are they kept with v3.0's local persistence?
7. **Are signal notes part of the record?** Shown in the review and the played-notes export, hidden,
   or tagged with an option?
8. **How is a recognised signal acknowledged on screen** without breaking the "nothing to click,
   nothing asked" rule during a session (a neutral line in the session cue row?), and how is it
   undone?
9. **Naming.** "Cue" is taken by the session cue row. Is "played signal" acceptable, or does the
   owner prefer another word for the player-facing feature?
10. **When?** Build the recogniser's place when Jam is specified (v3.2) and ship signals only with
    the learning candidate (v3.x), or keep the whole topic for the endgame?
