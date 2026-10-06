# v3 — Player Material and "My Instrument"

Status: direction (2026-09-25; review-tooling candidates added 2026-09-28, D128;
session-keeping candidates added 2026-09-28, D129; favorites moved here from v2 2026-09-28, D130;
a note on saving note density added 2026-09-28, D146; the end-of-measure chord-fit check moved
here from v2 as a nice-to-have 2026-10-03, D174; rhythm candidates added 2026-10-03, D175; a controller-connection candidate added
2026-10-06, D190).
Not yet specced.

**Serves:** P3, the Fledgling Composer: "I liked that gimmick, I play it, and see where it goes."
Also every tester on an instrument v1 doesn't ship. See [personas](../../personas.md).

## Settled direction

- **MIDI-seeded continuation.**
  - The player plays a motif or gimmick, and the generator continues it.
  - This extends v2's continuation from the app's own material to material the player plays.
  - The player-selected key and mode stay authoritative. Automatic key detection is not planned.
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

## End-of-measure chord-fit check (nice-to-have, not committed)

Moved here from v2 on 2026-10-03 (D174). It was v2's release v2.3 (build plan chunks 32–34); the
owner took it out of v2 and recorded it as a **nice-to-have for v3, not committed scope**. Nothing
in v3 depends on it.

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
selective rates; the two should be settled together.

## Controller connection candidates (not committed)

Recorded 2026-10-06 (D190), the owner's idea. **The version is open: this is not a v3
placement**; it sits here as v3 is the next version to be specced.

- **Switch profile from the check.** When the transposition check finds that the controller, as
  it is set, matches another [instrument profile](../../../docs/music/lexicon.md#instrument-profile),
  the check already names that profile in its copy. The candidate turns that line into an action:
  one control in the check that switches to the matching profile, so the player does not have to
  leave the connection sheet. Example: a breath controller set to sound like an E-flat alto
  saxophone, checked against the B-flat tenor saxophone profile.

## Depends on

- v2's session model, played-note tracking, review and export.
- v2's continuation mechanism.
- **O10 (planner authority)**, before any change that couples planner stages. See the
  [register](../../open-questions.md).
- Early building blocks: [prerequisites.md](../prerequisites.md), being drafted.
