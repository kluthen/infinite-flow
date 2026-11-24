# v4.0 — The Arranger and the Multi-voice Representation

Status: draft v1 (2026-11-24), consolidated into the [master spec](master-spec.md) v1.0 the same day (D595); the master spec wins where they differ, and the (proposed) tags here were ruled there (D585–D594). How v4.0's system voices are produced, carried, played, kept and
exported. What the player hears is in [accompaniment roles](accompaniment-roles.md); the sound in
[sound library](sound-library.md). The foundation analysis (K) is
[prerequisites §2 K](../prerequisites.md#k-multi-voice-representation). Code facts were checked
on `main` at 6d4c33c3; everything here is (proposed) unless it states the code as it is.

## 1. What exists

- **The lead** is one monophonic `ConcertEventTimeline` of four measures
  (`src/domain/events/timeline.ts:27-29`), read by twelve files outside `src/domain/`.
- **System voices are rendered beside it**, per phrase, by two pure renderers in
  `src/domain/backing/`: `renderBacking(harmony, meter)` (bass and chords; reads no lead) and
  `renderGuide(timeline, harmony)` (melody and rhythm guides). Notes are `{pitch, start,
  duration}` in whole-note rationals. v3.3's sevenths reach the backing's chords.
- **They are rendered when a phrase is queued** on the transport
  (`src/audio/transport-session.ts:181-213`), at the start of the previous phrase's last measure,
  placed on the audio clock and sent to the session bus by sound role
  (`src/audio/sound-roles.ts`: `bass`, `chord`, `melody-guide`, `rhythm-guide`; four mix channels,
  bass and chord sharing `backing`).
- **Nothing rendered is stored.** Kept sessions keep the timeline and the harmony; the MIDI export
  renders the backing again (one "Backing" track, opt-in per export); MusicXML has one part, the
  lead, with chord symbols; the guides are never exported.

## 2. The representation (proposed)

As [prerequisites §2 K](../prerequisites.md#k-multi-voice-representation) argues, the lead stays the
timeline; the accompaniment is a separate list:

- **`RenderedAccompaniment`**: the parts of one phrase, in a fixed voice order.
- **A part**: a system voice id, its accompaniment role, its mix channel, and its notes.
- **A part note**: start and duration (whole-note rationals from the phrase's start), a concert
  pitch or, for a drum, a drum sound (kick, snare, hi-hat; only if O319 takes drums), and a
  velocity.
- Bass, chords and both guides become parts of this shape, rendered by today's rules, so the
  backing and the guides sound exactly as in v3.4 (golden tests hold them).

## 3. The arranger (proposed)

- **One pure function on the library side** of the line (prerequisites §2 O): from the phrase's
  timeline, its harmony, its phrase number and seed, and the session's accompaniment settings, to a
  `RenderedAccompaniment`. It imports no browser API and no package, so the library line holds.
- **Seeded.** Its choices (which long notes a doubling takes, a fill's figure, the counter-melody's
  path) draw from new named streams derived from the phrase seed: a stream-registry bump, no change
  to the lead's draws. Same phrase and settings, same accompaniment.
- **The lead's facts are recomputed** from the timeline and the harmony (chord tone or not, long
  notes, rests), since generation keeps them internal.
- **Only the current phrase.** The next phrase's harmony is not known when a phrase is queued
  (`src/session/session-engine.ts:217-234`), so v4.0's roles end on the phrase's own last chord.
- **Where it runs:** at queue time like the renderers, if its cost per phrase stays small (the
  item 15 budget: no main-thread task near the 200 ms look-ahead); otherwise in the generation
  worker with the phrase. Measured in the first build chunk.

## 4. Playing it

- The transport queues a phrase's parts instead of two fixed pairs, and the session bus takes a
  note by part. The mix keeps its §C19.6 design: channels looked up, not named, so each new voice is
  one more channel with an on/off gain and a volume gain, and one more pair of settings.
- The settings records gain one switch and one volume per new voice, defaulting as
  [accompaniment roles §5](accompaniment-roles.md#5-choosing-and-combining-proposed-o318) says;
  stored v3.4 settings load with the new voices at their defaults.
- Turning a voice off is a gain, not a re-render: the arranger renders every voice the session may
  need, so turning one on mid-session joins it at its next note.

## 5. Exports

- **MIDI:** one track per system voice switched on for the export, each on its own channel, drums
  on channel 10 (MIDI's percussion channel), beside today's "Generated notes" track. The opt-in
  stays one choice: "with accompaniment" replaces "with backing". The guides stay out, as today.
- **MusicXML:** the lead only, as today, unless O320 draws system voices on screen; then the
  same parts as the screen. A file for other notation software can carry more than the screen
  shows, but a part nobody asked to read is clutter in a lead sheet.
- Both render again from the stored timeline, harmony and accompaniment settings, as the backing
  does.

## 6. Keeping and replay

- A kept session stores its accompaniment settings with a version, so a review or export renders
  the same parts. A different arranger version renders and says nothing: v4.0 is meant to be the
  last update (D552), so no migration is planned.
- No new replay key: `ifk5.` encodes the generation intent only, and the arranger's inputs are not
  part of it. The phrase replay tool may print the accompaniment from a key plus settings.

## 7. Blast radius (checked 2026-11-24)

| Area                          | Change                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| `src/domain/backing/`         | The arranger, the part types; the two renderers' output reshaped                           |
| `src/domain/random/`          | New named streams; registry version bump                                                   |
| `src/audio/`                  | Transport and bus take parts; sound roles and channels widen; the library adapter (sound library) |
| `src/components/workspace/`   | Mix controls and the `Volume` panel; design is `ux-writer`'s                                |
| `src/storage/records/`        | Settings keys per voice; kept-session accompaniment settings                               |
| `src/export/`                 | One MIDI track per voice                                                                   |
| `src/domain/events/`, generator, notation | Untouched (if O320 is A)                                                       |
| Atoms                         | [prerequisites §4, v4.0's rows](../prerequisites.md#v40s-rows)                             |
