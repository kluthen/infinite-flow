# v2 — Rolling Phrase

Status: direction settled (2026-09-25); topic documents draft v0.1 (2026-09-26). Next version to spec. A draft of the highlights is in
[highlights-proposal.md](highlights-proposal.md), which is being drafted.

**Serves:** P2, the Speed Builder, first. P1 gets its real-time goal (reading notes as they come).
P3 gets session review and export. See [personas](../../personas/personas.md).

## Documents

| Document                                                   | Purpose                                                                                                                                                            | Status     |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| [highlights-proposal.md](highlights-proposal.md)           | Headline, walk-through, ranked highlights, proposed cut line, design tensions grounded in code                                                                     | draft v0.1 |
| [rolling-phrase.md](rolling-phrase.md)                     | Generation unit, carry-in across joins, look-ahead and failure, control changes in a session, display behaviour (O34–O36, O39, O40, O10, O50–O52)                  | draft v0.1 |
| [audio-and-backing.md](audio-and-backing.md)               | Audio clock, autoplay unlock, backing renderer, click, count-in, tempo (O38, O44, O45, O53, O54, O57, O58, O68)                                                    | draft v0.1 |
| [midi-and-acknowledgement.md](midi-and-acknowledgement.md) | Web MIDI input, concert pitch (D72), controller check, expected-note acknowledgement, chord-fit check, event identity (O24, O41–O43, O55, O56, O60, O61, O70, O71) | draft v0.1 |
| [sessions-review-export.md](sessions-review-export.md)     | Session lifecycle, history, last-session review, favorites, MusicXML and MIDI export, privacy (O37, O46, O59, O62–O66, O72, O73)                                   | draft v0.1 |
| [adaptive-tempo.md](adaptive-tempo.md)                     | The opt-in adaptive tempo rule (O67, O74)                                                                                                                          | draft v0.1 |
| [definition-of-done.md](definition-of-done.md)             | Proposed cut line and v2.0 definition of done, collecting every document's acceptance criteria (O69, O75)                                                          | draft v0.1 |
| [questions-for-user.md](questions-for-user.md)             | Every open v2 question with its proposed default, grouped by when it must be answered                                                                              | draft v0.1 |

## Status snapshot (2026-09-26)

Settled scope is below and unchanged. The topic documents add **proposals only**; none is
settled until the user confirms it.

- Proposed: the four-bar phrase stays the generation unit. Phrases chain through a forward-only
  `carryIn` (last pitch and leap state, register window, final chord, phrase number). Every
  phrase starts on beat 1. O10 is deferred to v3.
- Proposed: one phrase of look-ahead. Failures retry silently, then repeat a phrase; never an
  alert during a session.
- Proposed: the audio clock is master; the backing is a synthesized renderer from harmony; a
  one-bar count-in for both kinds of start; tempo stays transport-only.
- Found: a MIDI note can never unlock audio by itself (browser rule), so a "connect controller"
  click is needed (O54). A controller whose transposition differs from the template would never
  be acknowledged, silently, so a controller check is proposed (O55).
- Proposed: exact-pitch acknowledgement from 150 ms early to 200 ms late (or the end of the
  note). A concrete O24 default exists for the user to react to.
- Proposed: history stores timelines plus reproduction inputs and a generator version; export
  both session and favorites; played notes in MIDI export only, by choice.
- Proposed, and **departing from the settled wording below**: adaptive tempo measures
  expected-note matching rather than O24's chord fit, so it doesn't wait on O24
  ([adaptive-tempo.md](adaptive-tempo.md), O67).
- Open: 41 questions (O10, O24, O34–O46, O50–O75), 5 marked as most blocking; see
  [questions-for-user.md](questions-for-user.md).

## Settled scope

- **Rolling phrase.**
  - The finite phrase becomes a rolling one: the app keeps generating the next item.
  - v2 continues from the app's **own** generated material. This is the simpler form of the
    continuation mechanism that v3 extends to player material.
  - The pressure is real but mild.
- **MIDI acknowledgement.**
  - A MIDI controller is supported.
  - The app acknowledges a played note **only when it is the expected note**. There is no
    mismatch hint.
  - The app keeps track of everything played. When a measure's time is up, it checks whether
    what was played fits that measure's chord, and if so acknowledges that the player kept that
    part of the contract.
  - Embellishing and trying out improvisation are welcome, as long as the notes suit the chord.
    What "fits" means is **O24** (below).
- **Backing playback.** This is the product's first audio.
  - It plays a bass line and block chords that follow the generated harmony, in pitch and on the
    beat, with an optional click and a mute/volume control. Rudimentary is acceptable.
  - It plays only while a session is running, and keeps playing through the player's silences.
  - There is no generated lead-line playback.
- **Sessions.**
  - A session starts on the first MIDI input or a Start click.
  - With a controller, it ends after more than 30 s without input or on a Stop click. Without a
    controller, only Stop ends it.
  - While a MIDI player is silent, the phrase keeps scrolling, because they may be catching their
    breath or recovering after losing track.
- **Last-session review and export.**
  - At the end, the player reviews the last session (what was displayed and what was played) and
    marks what they liked.
  - Export formats are MusicXML and MIDI. Export ships with the v2 review (proposed).
  - The user considers this "not urgent, but must come soon": it is instrumental for working with
    gimmicks and leitmotifs.
- **Played-note privacy.**
  - Played notes belong to the player and are never sent anywhere.
  - For the review they are held in memory for the last session only.
  - An export includes played notes only if the player chooses it.
- **Adaptive tempo (nice to have).**
  - An opt-in checkbox for players working on reading and playing speed.
  - While it is on, the BPM rises slowly as long as the player keeps an "acceptable level" of
    matching notes. That level is undefined and depends on O24.
- **Guiding principle** (product-wide; see [far vision](../../vision/far-vision.md)): acknowledge
  and encourage, never penalize, grade, rank or score. Anything adaptive is opt-in and visible.

## Access model

v2 has a **single local user**, with no accounts, roles, permissions or sharing. Whoever uses the
page can do everything. Played notes and session history never leave the player's system except
through an export the player triggers (D64, D69).

## Direction, not yet scoped

- **Embellishment and style-figure flags** are expected in v2 or v3. They may overlap with v1's
  rhythmic variety setting or complete it, and variety may become selective rates (for example
  "embellishment at 20%").

## Not in v2

- MIDI-seeded continuation from a played motif: v3.
- Persistence, reviewing earlier sessions, and "my instrument": v3.

## Depends on

- **The v1.0 gate** (see [v1](../v1/README.md)), especially instrument templates that carry
  their own transposition (ISS-003). v2's MIDI matching has to compare played pitches with
  expected pitches in the right transposition.
- **Early building blocks:** see [prerequisites.md](../prerequisites.md), being drafted.

## Open questions

- **O24 — What does "fits the chord" mean for the measure check?**
  - Is it chord tones only, chord plus scale tones, or whatever the active profile allows (the
    jazz profile adds chromatic approaches)?
  - Is it judged by pitch class or by exact pitch?
  - How is a note tied across a barline counted?
  - Is the unit the whole bar or the half-bar? A bar can hold two chords (`startBeat: 0|2`).
  - What happens when a measure doesn't fit: nothing shown, or something else?
  - Conflict to resolve: the generated line itself uses non-chord scale tones and, in jazz,
    chromatic approaches, so a strict chord-tone check would fail the app's own proposal.
  - The user's view (2026-09-25): "almost everything is legit when arpeggiating chord and
    improvising." The acceptable/unacceptable boundary needs dedicated work. This question also
    defines adaptive tempo's "acceptable level".
- **O10 (planner authority)** matters once generation continues from earlier material. See the
  [register](../../open-questions.md).
- **O33–O46** are the v2 questions from the [highlights proposal](highlights-proposal.md) and the
  [prerequisites analysis](../prerequisites.md); they are listed in the [register](../../open-questions.md).
- **O50–O75** were raised while drafting the topic documents (2026-09-26). Their full text lives
  in the topic documents, and every open v2 question with its proposed default is collected in
  [questions-for-user.md](questions-for-user.md).

## Glossary

One canonical term per concept. "Flow mode", used in the highlights proposal, means a
**session**.

- **Session:** one continuous run of rolling phrases with backing, from Start (or the first MIDI
  note) to Stop or the inactivity timeout.
- **Phrase:** one generated four-bar unit, as in v1. A session is an ordered sequence of phrases,
  each with a 1-based **phrase number** (`phraseOrdinal`).
- **Rolling phrase:** the v2 behaviour of phrases arriving one after another during a session.
- **Join:** the boundary between two consecutive phrases.
- **Carry-in:** the read-only data one phrase hands to the next across a join.
- **Look-ahead phrase:** the next phrase, generated while the current one sounds.
- **Deadline:** the moment a look-ahead phrase must be generated and engraved by: the start of
  the current phrase's last bar.
- **Controller:** a MIDI input device. A **controller session** is a session while a controller
  is attached.
- **Controller check:** the step that detects a constant pitch offset between the controller and
  the instrument template.
- **Instrument template:** the v1.0 instrument definition carrying range and written
  transposition (D56, D57).
- **Expected note:** a fresh attack in the generated line. A tie continuation belongs to its
  attack.
- **Played note:** a note-on received from the controller, stored as concert pitch.
- **Note acknowledgement:** the quiet positive signal that a played note matched an expected
  note.
- **Chord-fit acknowledgement:** the end-of-measure positive signal that what was played fit the
  harmony (O24).
- **Harmony span:** the part of a measure governed by one harmony event (a whole bar, or half a
  bar when `startBeat` is 2).
- **Backing:** the bass and block chords rendered from the harmony. It is not a generated voice.
- **Click:** the metronome sound. **Count-in:** the bar(s) of click before the first phrase and
  after a pause.
- **Review:** the view of the last session after it ends. **Favorite:** a phrase the player
  marked in the review.
- **Export:** a MusicXML or MIDI file download that the player triggers.
- **Adaptive tempo:** the opt-in option that raises the tempo while the player keeps matching
  expected notes.
