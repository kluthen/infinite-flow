# MIDI note acknowledgement

This document records how note acknowledgement is built: the pure logic that decides which notes
of the phrase the player has played, and the technical choices behind it. Acknowledgement marks
only a positive catch: an expected note played at its exact pitch, in time. It never reports a
missed note, a wrong note or a score.

The code lives in `src/domain/acknowledgement/`. It is pure domain logic: no Web MIDI, no audio,
no screen. It takes a phrase's concert timeline, where the phrase sits on the audio clock, and the
notes the player played, and returns the identities of the expected notes they acknowledge.

## Words used here

- **Attack**: the moment a note starts sounding. A **fresh attack** is a note that is not the
  continuation of a tie.
- **Tie**: a curved line joining two notes of the same pitch, so they sound as one longer note.
  The second note is a **tie continuation**: it is not played again.
- **Onset**: the time of an attack, on a clock.
- **Concert pitch**: the pitch that actually sounds, as a MIDI note number. Acknowledgement always
  compares concert pitches, never written ones.
- **Audio clock**: the clock the app schedules sound on, in seconds. Every time in this module is
  on it.

## The pipeline

Four steps, one file each:

| Step | File | What it does |
| ---- | ---- | ------------ |
| Expected notes | `expected-note.ts` | `deriveExpectedNotes(timeline, placement)` lists a phrase's fresh attacks in time order, each with its identity, concert pitch, onset and the end of its full sounding span (the attack plus every tie continuation after it, across barlines too). Rests have no expected note. |
| Windows | `acknowledgement-window.ts` | `placeAcknowledgementWindows(notes)` gives every expected note its timing window. |
| Played onset | `played-onset-latency.ts` | `compensatePlayedNote(noteOn, correction)` turns a note-on stamped on the audio clock into a played note whose onset has the latency taken off. |
| Matching | `note-matching.ts` | `acknowledgePlayedNotes(expected, played)` and `acknowledgePlayedNote(expected, alreadyAcknowledged, played)` return the identities acknowledged. |

`deriveExpectedNotes` takes a `PhrasePlacement`: the phrase number (1 for the session's first
phrase), the audio-clock time of the phrase's first downbeat, and its tempo. In 4/4 a whole note
lasts 240 / tempo seconds, and positions are computed from the timeline's exact fractions, so an
onset carries no rounding drift along the phrase. A tie continuation that opens a phrase, follows a
rest, or carries a different pitch from the note it continues is rejected with an
`ExpectedNoteDerivationError`: the timeline never produces one, so meeting one means a caller bug.

## Note identity

An expected note is named by its **phrase number, measure index and event index**: the index of
its attack among that measure's events, rests included. A tie continuation has no identity of its
own; it belongs to its attack. The triple is chosen to match how the staff addresses a note
(phrase, measure, event), so an acknowledged identity can be handed to the display unchanged.

## The window rule

Consecutive expected notes share a **boundary**: the later of 150 ms before the next note's onset
and the point halfway between the two onsets. So:

- the first expected note opens its window 150 ms before its onset; every later note opens at the
  boundary with the note before it;
- a note closes at the later of 200 ms after its onset or the end of its sounding span, but never
  after the boundary with the next note;
- the boundary always lies strictly between the two onsets, so every window contains its own
  onset, however close the notes are. From 300 ms apart the boundary is simply 150 ms before the
  next onset. Below 300 ms the notes split the gap halfway: sixteenths at 120 BPM and eighths at
  240 BPM, 125 ms apart, each get 62.5 ms either side of their onset.

Technical choices:

- **Windows are closed intervals.** Both ends belong to the window, so a played onset exactly on a
  boundary lies in two windows. The matching rule settles it: the earliest unacknowledged expected
  note whose pitch matches takes it.
- **Each boundary is computed once** and used both as one note's closing time and the next note's
  opening time, so touching windows touch exactly, with no floating-point gap between them.
- **Windows are placed over the session's sequence, not one phrase at a time.** The caller passes
  every expected note known so far, phrases concatenated in order. The last note of a phrase is
  then bounded by the next phrase's first note exactly like any other pair. While the next phrase
  is not generated yet, the last note has no next note, and its window is not cut short. When the
  next phrase arrives, the caller places the windows again; since acknowledged notes are kept as
  identities, not as window positions, nothing already acknowledged is lost.
- **Onsets must strictly increase.** `placeAcknowledgementWindows` rejects any other order with an
  `AcknowledgementWindowError`, since the earliest-first rule depends on it.

The two grace values are `EARLY_GRACE_SECONDS` (0.15) and `LATE_GRACE_SECONDS` (0.2) in
`acknowledgement-window.ts`. They are the values the product owner set for the rule, to be
confirmed by playing on the reference hardware (a breath controller over USB and a USB keyboard).

## Latency

A note-on reaches the app stamped on the audio clock, but it is late in two ways. The player plays
along with what they hear, and sound reaches the speakers some time after it was scheduled (the
**output latency**). A wireless controller also delivers its notes later than a wired one. The
played onset used for matching is therefore:

    audio-clock time − output latency − connection delay

The values are hard-coded constants in `played-onset-latency.ts`: the product ships no calibration
step for the player.

| Constant | Value | Where the value comes from |
| -------- | ----- | -------------------------- |
| `OUTPUT_LATENCY_SECONDS` | 0 | Provisional: no correction until it is measured on the reference hardware. |
| `CONNECTION_LATENCY_SECONDS.usb` | 0 | A wired USB connection adds a negligible delay. |
| `CONNECTION_LATENCY_SECONDS['bluetooth-le']` | 0.0125 | The middle of the 10 to 15 ms Bluetooth LE MIDI typically adds, before its jitter. |

All three are starting points, tuned on the reference hardware once acknowledgement runs in a live
session. `latencyCorrectionFor(connection)` builds the shipped correction from them.
`compensatePlayedNote` takes the correction as an argument, so a test, or a later tuning step, can
pass other values without touching the constants.

A played onset is a branded type, `CompensatedOnsetSeconds`, that only `compensatePlayedNote`
produces: the matcher cannot be handed an audio-clock time that skipped the correction.

## Matching

A played note acknowledges the earliest expected note, in time order, that is not yet
acknowledged, has **exactly** the played concert pitch (octave included), and whose window holds
the played onset. Each expected note is acknowledged at most once. A played note that matches
nothing leaves no trace: a wrong pitch does not use up the expected note, and on a keyboard chord
only the note that matches is acknowledged. The other notes are simply left alone: matching
never penalizes them.

`acknowledgePlayedNotes` matches a list of played notes in the order given, which is the order
they were played. `acknowledgePlayedNote` matches one played note against the identities already
acknowledged. It is the form a live session calls as each note-on arrives, and it returns a list
of zero or one identity.

## The output

Both matching functions return `readonly ExpectedNoteIdentity[]` and nothing else: no miss list,
no wrong-note mark, no score. `tests/unit/domain/acknowledgement/acknowledgement-output.spec.ts`
pins this at the type level: its `expectTypeOf` assertions stop compiling if any field is added to
the identity or the return type. The type checker runs them as part of `npm run build`.

## What is not here

- **Reading the controller**: which MIDI messages count as a played note, and mapping a MIDI
  timestamp onto the audio clock. The input here is a note-on already on the audio clock.
- **Drawing the highlight** on the staff for an acknowledged identity.
- **Wiring it into the session**: calling the matcher as notes arrive, placing windows again when
  the next phrase is generated, and recording the played notes.

## Tests

`tests/unit/domain/acknowledgement/` mirrors the four files, plus:

- `acknowledgement-output.spec.ts`: the type-level and run-time check of the output shape;
- `acknowledgement-property.spec.ts`: over the whole fixture set, at every tempo from 60 to 240 BPM
  and over both connection types, every expected note played exactly on time is acknowledged, and
  every one played a semitone above or below is not. Each fixture is followed by the next one as
  the next phrase, so every phrase's last note is bounded by a real next phrase;
- `acknowledgement-fixtures.ts`: the fixture set (listed in [Testing](testing.md#fixture-list)).
