# v2 — Questions for the User

Status: draft v0.1 (2026-09-26).

This is every open v2 question, grouped by when it needs an answer. Each entry gives:

- the question, in one line;
- the **proposed default**, so a plain "yes" is enough to settle it;
- **what the answer changes**;
- the document that holds its full text.

IDs are stable and listed in the [register](../../open-questions.md). Answers go to the
[decisions log](../../decisions.md) as new D-IDs when they are settled.

The five marked ★ block the most other work.

## A. Must answer before v2 spec consolidation

**Scope and generation**

- ★ **O75 — v2.0 cut line.** Should v2.0 be the full loop (rolling phrase, backing, sessions, MIDI
  acknowledgement, review and export), or the lean "no MIDI until v2.1" cut?
  - _Default:_ the full loop. Chord-fit and played notes in the review go to v2.1, and adaptive
    tempo to v2.2.
  - _Changes:_ what v2.0 must build and test, and whether the MIDI questions below can wait.
  - [definition-of-done.md](definition-of-done.md)
- ★ **O34 — Continuation boundary.** What does the next phrase see of the previous one? May it
  start with a tie or a rest?
  - _Default:_ it sees the last pitch with its leap state, the register window, the final chord
    and the phrase number. It always starts with a fresh note on beat 1.
  - _Changes:_ the generation contract (a new `carryIn` field). A "yes" to ties or rests would
    reopen the notation, rhythm and downbeat rules.
  - [rolling-phrase.md §3](rolling-phrase.md)
- **O51 — A leap across a join.** Should the leap-recovery obligation carry into the next
  phrase?
  - _Default:_ yes, it carries over.
  - _Changes:_ the "no" alternative restricts every phrase's first note to steps or small
    intervals from the carry-in pitch.
  - [rolling-phrase.md §8](rolling-phrase.md)
- **O76 — Resolving tense notes at a join.** v1 requires every passing or neighbour tone,
  appoggiatura, and Jazz approach or enclosure to resolve _before_ a phrase's last note. Does
  that still hold when the last note is only a join to the next phrase?
  - _Default:_ no. The rule applies only when the music really stops (Stop or a session end). At
    a join, a tense note may resolve onto the last note. Resolving across the join is not in v2.0.
  - _Changes:_ the open-ending rule and its validation. The v1 code's partial enforcement (only the
    Tension figure is held to it) is left unfixed until this is answered.
  - [rolling-phrase.md §8](rolling-phrase.md)
- **O50 — Register across joins.** With `Varying`, should the register window be resolved once
  per session, or per phrase as in v1?
  - _Default:_ once per session.
  - _Changes:_ whether the line can jump register every four bars.
  - [rolling-phrase.md §8](rolling-phrase.md)
- **O10 — Planner authority.** Should it be deferred to v3?
  - _Default:_ yes. Carry-in only flows forward, so no stage of a new phrase revises an earlier
    one.
  - _Changes:_ a "no" means a revision mechanism is needed in v2.
  - [rolling-phrase.md §3](rolling-phrase.md)
- **O36 — Look-ahead and failure.** How far ahead does the app generate, and what happens when
  generation fails?
  - _Default:_ one phrase ahead. On failure: 3 silent retries, then 1 retry without carry-in,
    then repeat the previous phrase. After 2 repeats in a row, a non-blocking notice. There is
    never an alert dialog.
  - _Changes:_ the session state machine and the failure copy.
  - [rolling-phrase.md §4](rolling-phrase.md)
- **O39 — Control changes during a session.** When does a changed control take effect?
  - _Default:_ everything except the instrument applies at the next phrase that hasn't started
    sounding. The instrument is locked during a session.
  - _Changes:_ whether controls stay live during play, and how ux-writer designs them.
  - [rolling-phrase.md §5](rolling-phrase.md)
- **O52 — The v1 workspace in v2.** Does the v1 look-and-regenerate workspace stay outside
  sessions?
  - _Default:_ yes. Start uses the displayed phrase as phrase 1.
  - _Changes:_ whether v2 has one mode or two.
  - [rolling-phrase.md §8](rolling-phrase.md)
- **O38 — Tempo as a generation input.** Does tempo shape the material?
  - _Default:_ no, it only drives the clock. Sixteenths at 240 BPM are the player's choice.
  - _Changes:_ tempo would enter the reproducibility inputs, and adaptive tempo would change the
    material.
  - [audio-and-backing.md §7](audio-and-backing.md)

**Display, audio and sessions**

- **O40 — Rolling display behaviour.** What must the rolling display guarantee?
  - _Default:_ at least one bar of read-ahead at all times, a playhead that follows the audio,
    and no visible note ever changes. The layout is left to ux-writer (the suggestion for
    landscape phones is a half-page turn).
  - _Changes:_ ux-writer's constraints.
  - [rolling-phrase.md §6](rolling-phrase.md)
- **O44 — Count-in.** Is there a count-in, and how does it fit a session started by a MIDI note?
  - _Default:_ one bar, for both kinds of start. The first MIDI note starts the count-in and is
    not matched against the phrase.
  - _Changes:_ how D62's "first MIDI note starts the session" feels in practice.
  - [audio-and-backing.md §6](audio-and-backing.md)
- ★ **O54 — Audio unlock.** Is one "connect controller" click, which enables sound and MIDI
  together, acceptable?
  - _Default:_ yes. Browsers never let a MIDI note start audio on a page nobody has clicked.
  - _Changes:_ the first-run flow. A "no" has no technical workaround.
  - [audio-and-backing.md §4](audio-and-backing.md)
- **O45 — Backing implementation.** How is the backing produced, and what does it sound like?
  - _Default:_ a pure renderer from the harmony (not a generated voice), with a synthesized
    sound and no samples. WebAudioFont is rejected because it is GPL.
  - _Changes:_ bundle size, offline cache, licences and sound quality.
  - [audio-and-backing.md §5](audio-and-backing.md)
- **O58 — Click default.** Is the click on by default?
  - _Default:_ on, in quarter notes with beat 1 accented.
  - _Changes:_ the first impression of a session.
  - [audio-and-backing.md §8](audio-and-backing.md)
- **O53 — Hidden tab.** What happens when the page is hidden during a session?
  - _Default:_ the session pauses, then resumes with a count-in.
  - _Changes:_ whether switching tabs ends or silently breaks a session.
  - [audio-and-backing.md §8](audio-and-backing.md)
- **O59 — Timeout arming.** When does the 30 s inactivity timer start counting?
  - _Default:_ only after the first note played in the session.
  - _Changes:_ whether Start followed by a slow setup ends the session.
  - [sessions-review-export.md §8](sessions-review-export.md)
- **O73 — Trailing silent phrases.** After a timeout, do the phrases nobody played stay in the
  review and export?
  - _Default:_ yes.
  - _Changes:_ what the review and the export contain.
  - [sessions-review-export.md §8](sessions-review-export.md)

**MIDI**

- ★ **O55 — Controller and template transposition.** A controller that doesn't transpose like
  the selected template makes every note wrong, and nothing is ever acknowledged, silently.
  Should v2.0 ship a "controller check"?
  - _Default:_ yes: play the shown note, and the app reports any constant offset and how to fix
    it. D72's optional input-offset field is added only if the Travel Sax can't be set to match.
  - _Changes:_ whether P1 on a tenor template can use the product at all.
  - [midi-and-acknowledgement.md §4](midi-and-acknowledgement.md)
- ★ **O41 — Acknowledgement window.** What timing, pitch and chord rules decide that a played
  note matches?
  - _Default:_ from 150 ms early until the later of 200 ms late and the end of the note. Exact
    pitch, octave included. Ties count once. On a chord, the matching note counts.
  - _Changes:_ how forgiving the app feels. Choosing pitch class instead would hide octave
    reading errors.
  - [midi-and-acknowledgement.md §5](midi-and-acknowledgement.md)
- **O42 — Played pitch in the live view.** Does the live view still never show the played
  pitch?
  - _Default:_ yes, never shown. A wrong pitch shown next to the expected one would be a
    mismatch hint by another name.
  - _Changes:_ the live screen's content.
  - [midi-and-acknowledgement.md §5](midi-and-acknowledgement.md)
- **O43 — Event identity.** What identifies a note across the display, the acknowledgement and
  the review?
  - _Default:_ phrase number + measure + event index, and a played-note sequence number.
  - _Changes:_ a small change so the notation carries its source indices.
  - [midi-and-acknowledgement.md §7](midi-and-acknowledgement.md)
- **O60 — What counts as activity.** What input keeps a session alive and can start one?
  - _Default:_ note-ons only. Breath and other controller messages are ignored.
  - _Changes:_ whether a player who is only breathing into the controller keeps the session
    alive.
  - [midi-and-acknowledgement.md §9](midi-and-acknowledgement.md)
- **O61 — Several inputs.** How are several MIDI inputs and channels handled?
  - _Default:_ merge all inputs and all channels. Show a picker only if more than one device is
    connected.
  - _Changes:_ the connect flow.
  - [midi-and-acknowledgement.md §9](midi-and-acknowledgement.md)
- **O70 — Browser scope.** Does v2 stay Chromium-only?
  - _Default:_ yes. Web MIDI has no iPad or iPhone support, and Firefox needs a site-permission
    add-on.
  - _Changes:_ who can test, and whether a no-MIDI path must be polished for other browsers.
  - [midi-and-acknowledgement.md §9](midi-and-acknowledgement.md)

**Review and export**

- **O37 — History storage.** What does the session history store for each phrase?
  - _Default:_ both the timeline and the reproduction inputs (request, seed, carry-in and a
    generator version stamp).
  - _Changes:_ a contract change (the version stamp), and readiness for v3 persistence.
  - [sessions-review-export.md §4](sessions-review-export.md)
- **O46 — Export scope.** Can the player export the whole session, favorites only, or both?
  - _Default:_ both.
  - _Changes:_ the review's export actions.
  - [sessions-review-export.md §6](sessions-review-export.md)
- **O62 — Favorite granularity.** What does a favorite mark?
  - _Default:_ a whole phrase. Bar ranges come with v3 snippet selection (D68).
  - _Changes:_ the review's interaction design.
  - [sessions-review-export.md §8](sessions-review-export.md)
- **O63 — Discarding the last session.** Is the player asked before a new session replaces a
  review with unexported favorites?
  - _Default:_ ask only in that case.
  - _Changes:_ one confirmation step.
  - [sessions-review-export.md §8](sessions-review-export.md)
- **O66 — Export extras.** What goes into the exports besides the generated line?
  - _Default:_ chord symbols always in MusicXML. The backing in MIDI as an option, off by
    default.
  - _Changes:_ file contents.
  - [sessions-review-export.md §8](sessions-review-export.md)
- **O72 — Long sessions.** Is session length capped?
  - _Default:_ no cap. The review must stay responsive.
  - _Changes:_ the review's rendering strategy.
  - [sessions-review-export.md §8](sessions-review-export.md)

## B. Can wait until v2.1 or v2.2 (if O75's default holds)

- **O24 — What "fits the chord" means** (v2.1).
  - _Default:_ each note is judged against the chord sounding at its onset, by pitch class. A
    measure fits when:
    1. at least one note is a chord tone, and
    2. every note is in the scale, or is a chromatic note that reaches a chord tone a semitone
       away within the next two notes.

    Silence and misfit show nothing. The app's own line always fits.

  - _Changes:_ how much improvisation is acknowledged. The default rejects unresolved blue notes
    and borrowed chord tones; say if they should pass.
  - [midi-and-acknowledgement.md §6](midi-and-acknowledgement.md)
- **O64 — Played notes in the review** (v2.1). How are they shown?
  - _Default:_ hidden until the player turns them on, then shown unquantized with neutral
    colouring. Live acknowledgements may appear as they did live.
  - _Changes:_ whether the review can read as a grade.
  - [sessions-review-export.md §8](sessions-review-export.md)
- **O65 — Played notes in the exports** (v2.1). Which formats include them?
  - _Default:_ MIDI only, when the player chooses. Not in MusicXML.
  - _Changes:_ export complexity (quantization).
  - [sessions-review-export.md §8](sessions-review-export.md)
- **O56 — Latency calibration** (v2.1). How is latency compensated?
  - _Default:_ tuned constants per connection type. A calibration step comes only if testers
    need it.
  - _Changes:_ one optional setup step.
  - [midi-and-acknowledgement.md §9](midi-and-acknowledgement.md)
- **O35 — Harmonic horizon** (v2.2). Is harmony and tension planned phrase by phrase, or over a
  longer arc?
  - _Default:_ phrase by phrase in v2.0. A multi-phrase arc (N3) comes in v2.2.
  - _Changes:_ whether a long session feels cyclic.
  - [rolling-phrase.md §8](rolling-phrase.md)
- **O67 — Adaptive-tempo rule** (v2.2).
  - _Default:_ at least 80% of a phrase's expected notes acknowledged adds 2 BPM. Silence is
    neutral. The tempo never drops automatically, and the ceiling is 240 BPM.
  - This **departs from the README**, which ties adaptive tempo to O24: the default uses exact
    matching only.
  - _Changes:_ whether adaptive tempo can ship before O24 is settled.
  - [adaptive-tempo.md §3](adaptive-tempo.md)
- **O74 — Tempo after an adaptive session** (v2.2). What happens to the tempo control when the
  session ends?
  - _Default:_ the control returns to the starting tempo, and the review shows the tempo
    reached.
  - _Changes:_ whether the tempo list must accept values between its steps of 10.
  - [adaptive-tempo.md §4](adaptive-tempo.md)

## C. Research or prototype needed

- **D72 verification on the Travel Sax 2** (feeds O55).
  - _To find out:_ with the device's own transpose set to C, B♭ tenor and E♭ alto, which MIDI
    note does a fingered written C send? Does octave shift change the note? What note-on
    velocity does it send?
  - _Changes:_ whether the optional input-offset field is needed.
- **O71 — Bluetooth MIDI.**
  - _Default:_ USB is the tested path, and Bluetooth is best-effort.
  - _To find out:_ does the owner's OS pair the Travel Sax over Bluetooth so that Chromium sees
    it, and how large is the jitter?
  - [midi-and-acknowledgement.md §9](midi-and-acknowledgement.md)
- **O68 — Engraving vs audio scheduling** (prototype).
  - _Default:_ a 200 ms look-ahead, with the scheduler's timer in a Worker.
  - _To find out:_ what is the longest main-thread task during a session at 240 BPM?
  - [audio-and-backing.md §8](audio-and-backing.md)
- **O69 — Latency after ISS-004** (measurement).
  - _Default:_ the cold worst case stays under 250 ms in Chromium, a quarter of the one-bar
    deadline at 240 BPM.
  - _To find out:_ re-measure, including cold runs after a mid-session control change.
  - [definition-of-done.md §5](definition-of-done.md)
- **O57 — Backing voicing** (listening test).
  - _Default:_ bass in MIDI 36–47, and chords in close position with the top note at or below
    E4, attacked on each chord change and each beat 1.
  - _Changes:_ how the backing sounds.
  - [audio-and-backing.md §8](audio-and-backing.md)
- **Acknowledgement window values** (part of O41). Tune 150 ms early and 200 ms late on the
  Travel Sax 2 and one USB keyboard.

## Related, outside the v2 topic documents

- **O49 — ATD atom lifecycle.** v2 needs these atoms amended or scoped:
  - `rule_optional_midi_privacy` (v1: "no MIDI at all");
  - `req_four_measure_phrase` (the phrase becomes a unit within a session);
  - `rule_seeded_phrase_reproduction` (carry-in joins the reproduction inputs);
  - `rule_generation_failure_alert_copy` (in-session failures never alert).

  `rule_phrase_starts_on_downbeat` and `rule_ephemeral_session_state` still hold under the
  proposed defaults. See the [register](../../open-questions.md).

- **O47 — Ornament representation** only matters if embellishment flags (N2) land in v2.2.
