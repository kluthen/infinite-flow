# v3 — Player Material and "My Instrument"

Status: direction (2026-09-25; review-tooling candidates added 2026-09-28, D128;
session-keeping candidates added 2026-09-28, D129; favorites moved here from v2 2026-09-28, D130).
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

## Depends on

- v2's session model, played-note tracking, review and export.
- v2's continuation mechanism.
- **O10 (planner authority)**, before any change that couples planner stages. See the
  [register](../../open-questions.md).
- Early building blocks: [prerequisites.md](../prerequisites.md), being drafted.
