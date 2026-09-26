# v3 — Player Material and "My Instrument"

Status: direction (2026-09-25). Not yet specced.

**Serves:** P3, the Fledgling Composer: "I liked that gimmick, I play it, and see where it goes."
Also every tester on an instrument v1 doesn't ship. See [personas](../../personas/personas.md).

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

## Depends on

- v2's session model, played-note tracking, review and export.
- v2's continuation mechanism.
- **O10 (planner authority)**, before any change that couples planner stages. See the
  [register](../../open-questions.md).
- Early building blocks: [prerequisites.md](../prerequisites.md), being drafted.
