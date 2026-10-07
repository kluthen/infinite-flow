# v3 — Player Material and "My Instrument"

Status: direction (2026-09-25; review-tooling candidates added 2026-09-28, D128;
session-keeping candidates added 2026-09-28, D129; favorites moved here from v2 2026-09-28, D130;
a note on saving note density added 2026-09-28, D146; the end-of-measure chord-fit check moved
here from v2 as a nice-to-have 2026-10-03, D174; rhythm candidates added 2026-10-03, D175; two controller-connection candidates added
2026-10-06, D190 and D192; stray notes from controllers, a played-notes pruning candidate and a
note on the chord-fit check added 2026-10-06, D196; pre-generating phrases at Idle added as a
candidate 2026-10-07, D206; MIDI-seeded continuation named Jam and made v3's lead feature, with
a key and mode suggestion, the rhythm candidates tied to it and learning from positive signals as
candidates, 2026-10-07, D209).
Not yet specced.

**Serves:** P3, the Fledgling Composer: "I liked that gimmick, I play it, and see where it goes."
Also every tester on an instrument v1 doesn't ship. See [personas](../../personas.md).

## Settled direction

- **Jam: MIDI-seeded continuation** (working name Jam, D209; v3's lead feature and its most
  complex part).
  - The player plays a motif or gimmick, and the generator continues it.
  - This extends v2's continuation from the app's own material to material the player plays.
  - The player-selected key and mode stay authoritative. **Amended by D209:** "automatic key
    detection is not planned" no longer holds. A key and mode suggestion that the player confirms
    is now a candidate; the app never switches the key on its own. See
    [Jam](#jam-growing-the-players-doodle) below.
- **"My instrument" configuration, saved locally.**
  - A small interface lets the player describe their instrument: the input kind (MIDI
    controller now; the microphone much later, see [v5+](../v5-plus/README.md)), the expected
    range and the transposition.
  - It builds on v1.0's instrument templates, where transposition is open data.
  - **Feeds from v2's controller check (D79):** v2.0's controller check (D77) detects a constant
    pitch offset between the controller and the selected template — octave, semitone, or any
    other constant delta — but only for the session (D77: no persistence in v2). Once "my
    instrument" exists, the same check's result should populate or update the saved template
    automatically, instead of asking the player to redo or re-enter it every session.
  - The instrument will eventually belong to a user profile. Switching instrument is expected to
    be rare.
  - A Concert-display override, absent from v1.0, may return here if someone needs it.
- **Local persistence (first in the product).**
  - This deliberately departs from v1's ephemeral sessions.
  - Data stays on the player's system: local storage, or a file export the player triggers.
  - **Feeds from v2's narrow-window density rule (D146):** below the tablet-landscape width, v2
    generates with `Eighth` while keeping a `Sixteenth` the player chose, in memory only. If v3
    saves settings, it saves the chosen value, not the one generated with.
- **Review of earlier sessions.**
  - This extends v2's last-session review through persistence.
  - Keeping played notes across sessions requires the player's explicit opt-in and a way to
    delete them.

## Jam: growing the player's doodle

Recorded 2026-10-07 (D209), the owner's insight, in their words: "I've a doodle in mind, but I'm
not good enough to iterate on it. I give it to the app, and it generates matching phrases." This
is the settled MIDI-seeded continuation above, named and given its purpose. **The core is v3
scope; the three extensions below are candidates, not committed, and not designed.**

- **Name.** "Jam" (working name), proposed by the owner along with "improvisation". Jam is
  preferred: in music, improvisation means the player inventing on the spot, while here the app
  develops the player's idea; and "the Curious Improviser" is already P1's name
  ([personas](../../personas.md)). Musicians call the doodle a **motif**, and building on it
  (repeating, varying, moving it to other notes, changing its rhythm) **developing a motif**.
- **The core.** The doodle feeds the generator its [rhythm](../../../docs/music/lexicon.md#rhythm),
  its [contour](../../../docs/music/lexicon.md#contour) and its
  [interval](../../../docs/music/lexicon.md#interval) character, as the
  [product foundation](../../product-foundation.md) planned for the second deliverable; the
  generated phrases match it. It serves P3's C3, "grow an idea"
  ([personas](../../personas.md#p3--the-fledgling-composer-secondary-d61)).
- **Prerequisite: stray notes.** A stray note from the controller would distort the doodle and
  every signal below, so a minimum duration for a played note to count
  ([stray notes](#stray-notes-from-controllers-candidates-not-committed)) is likely needed first.

### Candidate: key and mode suggestion

The owner's proposal, aware that "it's highly possible to have multiple valid replies depending on
the size and content of the snippet". It reverses the earlier "automatic key detection is not
planned" (D209).

- **Why several answers are valid.** The app's seven modes (Ionian to Locrian, with Major and
  Minor as other names for Ionian and Aeolian) share the same seven notes, each starting on a
  different one. Detection has two steps of very different difficulty:
  1. **Which set of notes.** Fairly easy: a doodle with five or more different notes usually fits
     only one of the 12 sets.
  2. **Which note is home** (the [tonic](../../../docs/music/lexicon.md#tonic), which decides the
     [mode](../../../docs/music/lexicon.md#mode)). Hard: the same notes are C Ionian or D Dorian
     depending on where the doodle settles. The clues are the first and last notes, the longest
     notes and the notes on strong beats, and a short doodle often doesn't decide.
- **Proposed shape (strawman, not decided):**
  - The app suggests a key and mode, maybe with one or two alternatives; the player confirms or
    keeps their setting. The player's choice stays authoritative.
  - When the doodle fits the selected key and mode, nothing is suggested.
  - When too many answers fit equally well, nothing is suggested rather than a guess.
  - Very short notes are ignored (the stray-notes prerequisite above).
  - The suggestion is deterministic: the same doodle always gives the same suggestion, so a
    phrase replay key still reproduces a session.
- **Scheduling.** It makes Jam bigger, not easier; it may follow the core as its own step.

### Candidate: Jam and the rhythm controls

The owner expects Jam to "heavily link" with the
[rhythm candidates](#rhythm-candidates-custom-note-density-candidates-not-committed) (lock,
mutation, Custom note density). They may be best designed as one feature:

- the doodle's rhythm could be what the rhythm lock holds, which would answer part of O102 (which
  rhythm the editor takes) and O103 (what the lock holds);
- mutation could become how far the phrases may drift from the doodle, from close variations to
  looser ones.

### Candidate: learning from how the player plays

The owner's idea: infer "silent approval" from how the player follows, or leaves, the phrases the
app provides. The owner's own caveat: players may "simply fail at following the phrase". The
personas sharpen it: P1 "can already play" and is a beginner at improvisation, but struggles to
read and play at speed ([personas](../../personas.md#p1--the-curious-improviser-primary-d48)), so
a miss most likely means "too fast or too hard to read", not "I don't like it".

- **Proposed rule (strawman, not decided): learn taste from positive signals only; a miss never
  counts against a phrase.**
  - **Positive: a deliberate departure that still fits.** The player leaves the written line but
    stays in the scale, fits the chords and keeps the pulse: an embellishment, a sign of
    engagement. This is what the
    [end-of-measure chord-fit check](#end-of-measure-chord-fit-check-nice-to-have-not-committed)
    already defines, positive-only; Jam would give it a second use, as a taste signal.
  - **Positive: the player repeats a fragment of a phrase, or comes back to their doodle.**
  - **Explicit: a [favorite](#favorites-v3-scope-to-be-settled)** is a clean "more like this". It
    is marked after the session, since a running session never asks the player for anything.
  - **Difficulty, not taste: misses, late notes, silence on dense passages.** These could only
    ever adjust difficulty (tempo, density), never taste. The tempo that reacts to how the player
    plays was deferred from v2 to v3+ (D101; see [personas](../../personas.md)).
- **Bounds.** The guiding principle holds: acknowledge, never score; adaptation is opt-in and
  visible ([far vision](../../vision/far-vision.md)). Learning would be switched on by the player,
  show what it leans toward, and never reshape a jam because of mistakes. The permanent constraint
  of no wrong-note signal, grading or scoring
  ([v2 master spec §2](../v2/master-spec.md#2-scope)) applies.

**Open, in the [register](../../open-questions.md#v3-jam-o112):** O112–O116.

## Favorites (v3 scope, to be settled)

Moved here from v2 on 2026-09-28 (D130, from ux D69). The owner: "favorite and the like will be
decided in v3". **This is a v3 placement**, unlike the candidates below: marking favorites is v3
scope, and how it works is settled when v3 is specced. v2's review has no favorites, every v2
export covers the whole session, and starting a new session from the v2 review asks no
confirmation ([v2 master spec §7](../v2/master-spec.md#7-sessions-review-export-and-privacy)).

- **Serves P3's C1 and C2** ([personas](../../personas.md#p3--the-fledgling-composer-secondary-d61)):
  marking the parts the player liked, and exporting the marked material. v2 serves C1 by looking
  back at the last session, and C2 by exporting the whole session.
- **Starting point, not binding.** What v2's spec had settled before the move (D88, D129): a
  favorite marks a whole phrase; the export offers a favorites-only scope, in session order, each
  phrase keeping its session phrase number; played notes exported with favorites are those of the
  favorite phrases, and a note held past a favorite phrase stops at its end when the next phrase
  is not exported; starting a new session asks for confirmation when the review holds unexported
  favorites. Marking a bar range instead of a whole phrase was already noted as a v3 idea, tied
  to seeding a continuation.
- **Open: O86**, what makes a favorite "exported" ([register](../../open-questions.md)). It only
  matters if v3 keeps a confirmation before discarding unexported favorites. With local
  persistence, a favorite may survive the session, which could change the question.
- **Meets the candidates below.** Pinning a session (keeping sessions) and selecting a passage
  (review tooling) are also ways of marking what the player liked. How favorites relate to them
  is part of settling favorites.

## Later review tooling (candidates, not committed)

Recorded 2026-09-28 (D128, from ux D64). They sit here because v3 is where the review next
evolves. The owner gave no version, so **this is not a v3 placement: the version is open.**

- **Tablet and desktop only.** On the phone the Review stays the plain baseline: the functions
  the spec gives it on every device, and nothing more
  ([context of use](../../personas.md#context-of-use)).
- **Select a passage to replay.** Note: the v2 review has no playback at all
  ([v2 master spec §7](../v2/master-spec.md#7-sessions-review-export-and-privacy)), so this
  candidate also means adding review playback.
- **Expected against played, on the same measure.** Show what the phrase expected next to what
  the player played. **Bounded by a permanent product constraint**
  ([v2 master spec §2](../v2/master-spec.md#2-scope)): no wrong-note signal, grading or scoring,
  in any view. v2 already shows played notes only on a toggle, neutrally colored, with no
  coloring for a note that didn't match (§7). Any comparison view has to stay inside that
  constraint.

## Keeping sessions (candidates, not committed)

Recorded 2026-09-28 (D129, from ux D67). v2 stays ephemeral: nothing survives a reload
([v2 master spec §7](../v2/master-spec.md#7-sessions-review-export-and-privacy)). The owner's
ideas for later sit here, next to the review-tooling candidates above, for the same reason. **The
version is open: this is not a v3 placement.**

- **Store more than one session only when the player asks for it**, for example by pinning a
  session.
  - It meets **local persistence** above, and would answer a question v3's direction leaves open:
    whether sessions are kept automatically or only on request. Pinning is "only on request".
  - It fits the opt-in already required for **keeping played notes across sessions**. Whether
    pinning a session also counts as that opt-in, or the two stay separate choices, is not
    decided.
  - A pinned session needs a way to unpin and delete it, as v3 already requires for played notes.
- **Suitable access to older sessions.** It meets **review of earlier sessions** above: how the
  player finds and opens a kept session.
- **An optional comment on a session.** New player-written data stored with a kept session. It
  lives only where the session lives: on the player's system, under local persistence. Whether a
  comment travels in an export is not decided.

v2 already stores each phrase's generated timeline and reproduction inputs in memory, which is
what a kept session would need
([v2 master spec §7](../v2/master-spec.md#7-sessions-review-export-and-privacy)).

## Stray notes from controllers (candidates, not committed)

Recorded 2026-10-06 (D196), the owner's ruling after the hardware sitting. **The version is
open: v3 or later.**

A controller can send short "stray" notes while the fingers change position: in-between notes a
real instrument would swallow. The reference breath controller sends them often, at in-between
pitches, often in pairs at velocity 127. The owner's ruling: this is a **generic controller
matter**, so nothing is built for one device.

- **What they cost today.** Played notes are bloated with notes the player never meant: stray
  notes show in the review's played notes and go into the played-notes MIDI export. v2 changes
  nothing about this.
- **What they do not cost: acknowledgement.** An expected note lights only when a played note has
  exactly its pitch inside its window, and a note that does not match changes nothing on screen
  (v2 master spec §8). Stray notes, being in-between pitches, normally light nothing. Do not add
  a filter there for them.
- **What they would cost later:** the
  [end-of-measure chord-fit check](#end-of-measure-chord-fit-check-nice-to-have-not-committed)
  and any later chord recognition from played notes, which a stray out-of-scale note can fail.
  The owner's idea: a note that does not last "long enough" would not be considered; the
  threshold is not decided.
- **Candidate: prune short notes from the played-notes export.** An option on the played-notes
  export that removes notes shorter than a threshold. Whether the threshold is fixed or set by the
  player, and whether the review's played notes follow the same option, are not decided.

## End-of-measure chord-fit check (nice-to-have, not committed)

Moved here from v2 on 2026-10-03 (D174). It was v2's release v2.3 (build plan chunks 32–34); the
owner took it out of v2 and recorded it as a **nice-to-have for v3, not committed scope**. Nothing
in v3 depends on it. Jam's learning candidate would give it a second use, as a taste signal (D209;
see [Jam](#candidate-learning-from-how-the-player-plays)).

- **What it is.** Beyond acknowledging the exact expected note (v2.0), the app would also
  acknowledge a player who embellishes or improvises on the written line, at the end of a measure,
  when what they played fits the harmony. It is positive-only: a measure that doesn't fit, or
  where nothing was played, shows nothing.
- **Its definition is settled and kept** (D108, from O24): judged per measure by pitch class; it
  runs only on a measure the player played differently from the written phrase; a measure fits
  when one played note is a chord tone of the chord sounding at its onset and every other is in
  the phrase's scale or a chromatic note resolving by a half step onto a chord tone within the
  player's next two notes; "blue" notes and passing chromatic notes that don't resolve get no
  signal, by design. Full text, with its acceptance criterion, in
  [v2 master spec §9](../v2/master-spec.md#9-the-end-of-measure-chord-fit-check).
- **The build notes are kept** in the v2 build plan: the
  [engine](../v2/build-plan.md#chunk-32--chord-fit-engine) (pure logic, sixteenth-note grid
  assignment, the property test that the app's own line never triggers it), the
  [presentation](../v2/build-plan.md#chunk-33--chord-fit-presentation) (not designed; interface
  unit 9 in `ui_ux/todo.md`) and a [gate](../v2/build-plan.md#chunk-34--v23-release-gate).
- **Caveat carried with it** (master spec §9): the rule relies on one scale per phrase. If harmony
  leaves the phrase's scale before it is built (secondary dominants, borrowed chords), each
  measure must be judged against its own chord's scale.
- **Stray notes would likely break it** (D196). Controllers can send short in-between notes while
  the fingers change position (see
  [stray notes from controllers](#stray-notes-from-controllers-candidates-not-committed)). One
  stray note outside the phrase's scale makes a measure fail the condition that every other note
  is in the scale or a resolving chromatic note, so an embellishing player would miss the
  acknowledgement for a note they never meant to play. A minimum duration for a played note to
  count is a likely prerequisite; how long, and whether it applies to this check only, is not
  decided.

## Rhythm candidates: Custom note density (candidates, not committed)

Recorded 2026-10-03 (D175), the owner's ideas. **The version is open: this is not a v3
placement**; they sit here as v3 is the next version to be specced. All three belong to the rhythm
category of the settings, and are reachable only when
[note density](../../../docs/music/lexicon.md#note-density) is set to a new value, **Custom**
(working name). Today note density has three values: quarter notes, eighth notes and sixteenth
notes.

- **Rhythm ratios.** The player sets how likely each note value is to appear, from the
  [whole note](../../../docs/music/lexicon.md#whole-note) down to the
  [sixteenth note](../../../docs/music/lexicon.md#sixteenth-note). (A note value is how long a
  note lasts as written: whole, half, quarter, eighth, sixteenth.)
- **Rhythm editor.** Two ways to give the rhythm: copy the rhythm of one of the bars, or enter a
  rhythm by hand.
- **Rhythm lock.** When set, the rhythm does not change. Generation may bend that rule a little
  to create [tension and release](../../../docs/music/lexicon.md#tension-and-resolution), but the
  rhythm stays stable across the session.

**With the settings-mutation flag** (v2.1, master spec §5):

- a mutation can never move note density **into** Custom;
- while Custom is set, a mutation may alter the ratios;
- while the lock is set, a mutation cannot alter the rhythm durably: a temporary bend is the only
  latitude.

**Open, in the [register](../../open-questions.md#v3-rhythm-candidates-o100):**

- **O100:** how Custom meets [rhythmic variety](../../../docs/music/lexicon.md#rhythmic-variety),
  [syncopation](../../../docs/music/lexicon.md#syncopation-1) and
  [silence density](../../../docs/music/lexicon.md#silence-density), which combinations the
  rhythm grammar blocks under Custom, and the narrow-window rule for sixteenth notes.
- **O101:** which note values get a ratio (dotted values, rests), how finely, what one mutation
  step on the ratios is, and whether a mutation can move density out of Custom.
- **O102:** which bar the editor copies from, how long an entered rhythm is, and whether it must
  pass the rhythm grammar's feasibility rules
  ([unsupported rhythm combination](../../../docs/music/lexicon.md#unsupported-rhythm-combination)).
- **O103:** what the lock holds (the editor's rhythm, or any rhythm in effect), what "a little
  bending" means, and whether a bend is shown.

They may overlap with the embellishment and style-figure flags of the
[v2 direction](../v2/README.md#direction-not-yet-scoped), which may turn rhythmic variety into
selective rates; the two should be settled together. The owner also expects them to link closely
with Jam, whose doodle could supply the rhythm the lock holds (D209; see
[Jam and the rhythm controls](#candidate-jam-and-the-rhythm-controls)).

## Controller connection candidates (not committed)

Recorded 2026-10-06 (D190, D192), the owner's ideas. **The version is open: this is not a v3
placement**; they sit here as v3 is the next version to be specced.

- **Switch profile from the check.** When the transposition check finds that the controller, as
  it is set, matches another [instrument profile](../../../docs/music/lexicon.md#instrument-profile),
  the check already names that profile in its copy. The candidate turns that line into an action:
  one control in the check that switches to the matching profile, so the player does not have to
  leave the connection sheet. Example: a breath controller set to sound like an E-flat alto
  saxophone, checked against the B-flat tenor saxophone profile.
- **A voluntary "Bluetooth" checkbox (D192).** The owner's words: "We may add a volontary
  checkbox (bluetooth) in the device dialog that will extend grace period a slight bit." The
  device dialog is the connection sheet. The player ticks the box when the controller is connected
  over Bluetooth, and played notes then get a little more timing tolerance. Why: v2.0 makes
  Bluetooth MIDI best-effort (D191). On the reference breath controller, Bluetooth LE adds roughly
  70–80 ms over USB and delivers notes in batches, and since Web MIDI does not say how a
  controller is connected, the app applies the USB correction to every controller. For whoever
  designs it:
  - The plumbing for a correction per connection already exists: the code has a connection type,
    `'usb' | 'bluetooth-le'`, with a constant for each (`CONNECTION_LATENCY_SECONDS` and
    `latencyCorrectionFor` in `src/domain/acknowledgement/played-onset-latency.ts`); the session
    always asks for the USB one today (`src/components/workspace/workspace-session-midi.ts`). The
    Bluetooth constant there (12.5 ms) predates the measurement and is far below it.
  - Two ways to give the tolerance, left open: shift the played onset back by the Bluetooth delay,
    which keeps the expected note's early edge as strict as over USB; or widen the expected note's
    timing window, which is closer to the owner's wording ("extend grace period") but also lets
    notes count that were played earlier than over USB.
  - It needs a design pass before it is scheduled: it touches the expected-note timing window
    (`rule_expected_note_window`), the latency compensation of the played onset
    (`rule_played_onset_latency_compensation`), and v2's stance that there is no player-facing
    calibration step (v2's master spec defers such a step to v3, where it pairs with "my
    instrument").

## Pre-generating phrases at Idle (candidate, not committed)

Recorded 2026-10-07 (D206), the owner's proposal for the next version, in their words: "while
start session isn't pushed have background generate a few phrases in advance (no more than 4)
that give us some time ahead." **A v3 candidate, not committed scope and not designed.**

- **What it is.** While the app is Idle, before Start, the app generates in the background up to 4
  look-ahead phrases following the phrase on screen, so a session starts with time in hand.
- **Why.** In v2 the failure ladder keeps 1.075 s for the standalone attempt, more than one
  measure at 240 BPM, so at 240 BPM phrase 2 is always generated standalone and its join to phrase
  1 is never smoothed; the owner keeps that for v2 (D205). Generated before Start, with no
  deadline, phrase 2 could carry in from phrase 1 again at fast tempos. It serves P2, the Speed
  Builder, who reads and plays at the fastest tempos ([personas](../../personas.md)).
- **What it changes in v2.** Idle has no deadline and generates no phrase with carry-in (D203);
  pre-generated phrases would be phrases with carry-in, generated at Idle.
- **Not v2's prewarm.** The prewarm (`module_generation_prewarm`) only warms the generator's
  rhythm memo for the current settings on the one generation worker, and produces no phrase.
- **Open, with proposals,** in the [register](../../open-questions.md#v3-pre-generation-at-idle-o107):
  - O107: how many, and whether the session keeps them ahead or only spends them;
  - O108: what happens to them when the player changes a setting, switches profile, regenerates
    phrase 1, or resizes the window before Start;
  - O109: how it relates to the prewarm, and a regeneration at Idle that must not wait behind it;
  - O110: the starting note, and whether a pre-generation in progress keeps a session from
    starting;
  - O111: whether a pre-generated phrase must be exactly the phrase the session would have
    generated there (mutations, tension arc, density step-down, seeds).

## Depends on

- v2's session model, played-note tracking, review and export.
- v2's continuation mechanism.
- **O10 (planner authority)**, before any change that couples planner stages. See the
  [register](../../open-questions.md).
- Early building blocks: [prerequisites.md](../prerequisites.md), being drafted.
