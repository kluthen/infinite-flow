# v3.0 — My Instrument

> **Archived 2026-10-16.** v3.0 is released as version 3.0.0; this approved draft was
> consolidated into the v3 master spec (D217). Live summary:
> [master spec §7](../../versions/v3/master-spec.md#7-my-instrument).
> Relative links were written from `specs/versions/v3/`; the paths of those to files that stayed
> there were repaired on 2026-10-16 so they resolve from this folder.

Status: draft v2 (2026-10-07). spec-writer's recommendations, approved by the owner at the
overall review (D216).

Serves every tester on an instrument v1 doesn't ship, and P1 and P2, who play a real instrument
or a controller set to sound like one ([personas](../../personas.md)). Code facts:
[storage-grounding.md](storage-grounding.md) §A1; instrument policy:
[saxophone profile ranges](../../../docs/music/saxophone-profile-ranges.md).

## 1. Settled direction (from the v3 README)

- A small interface lets the player describe their instrument: the input kind (a MIDI controller
  now; the microphone much later, v5+), the expected range and the transposition, saved locally.
- It builds on v1.0's instrument templates, where transposition is open data.
- v2's controller transposition check should feed it, so the player does not redo or re-enter the
  check every session (D79).
- Switching instrument is expected to be rare. The instrument will eventually belong to a user
  profile.

## 2. What "my instrument" is

- **One saved instrument, made from a template.** The player starts from one of the three
  built-in profiles (C MIDI keyboard, B-flat tenor saxophone, E-flat alto saxophone) and may
  change:
  - its **name**;
  - its **range**, lowest and highest note, entered in written pitch and stored in concert pitch;
  - its **transposition**, any constant interval between written and sounding pitch.
- **The same rules as the built-in profiles**, which the code already enforces for any profile
  given as data: integer endpoints, a span of at least 24 semitones (two octaves), and Low, Middle
  and High register windows derived by the same algorithm (`overlapping-three-window-v1`), never
  hand-set. A range under two octaves is refused, with the reason.
- **The input kind is "MIDI controller"**, the only value in v3. It is stored so the microphone
  can be added later without changing the saved shape.
- **The built-in profiles stay**, unchanged and selectable. "My instrument" is a fourth choice in
  the same instrument control.
- **No Concert-display override** in v3.0: it returns only if someone needs it.

**What the code needs (fact):** the instrument id set is closed today. The three ids are a
literal union, the generation worker rebuilds the profile from its id and rejects anything else,
and the phrase replay key names the profile by id (storage grounding §A1). A player-made
instrument has to cross the worker boundary, enter the replay key and the session history as
data. Proposed: a new replay-key version, `ifk2.`, carries the instrument inline when it is not a
built-in; `ifk1.` keys keep decoding.

## 3. The transposition check feeds it

The check compares what the controller sends with what the selected instrument expects, and finds
a constant offset: a match, whole octaves, or some number of semitones (v2 master spec §8).

- **When the offset is not a match,** the check's result offers one action: **use this for my
  instrument**, which sets my instrument's transposition so the written notes match what the
  controller plays. The player confirms it once; the result is then saved and the check need not
  be redone. Anything that adapts stays visible and opt-in (far vision), hence one confirmation
  rather than a silent change.
- **The app still applies no input offset.** Played notes are compared at the exact concert pitch
  received, as in v2. Changing the instrument's transposition is what makes the written part match
  the controller. This was enough on the reference breath controller, whose own setting covers
  every case (2026-10-06 hardware sitting).
- **Overlap with a dropped idea:** D211 dropped "switch profile from the check" (D190),
  a one-control switch to the built-in profile the controller matches. The action above is the
  same idea aimed at "my instrument", and it is what D79 asked for. It is kept here because D79 is
  settled v3 direction; the owner accepted it (D216, closing O122).

## 4. Remembering the controller

The input kind leads naturally to remembering which controller the player uses: the app reselects
the last chosen controller at load when it is connected. This changes the STABLE contract atom
`rule_same_controller_reattaches` ("does not survive a page reload"), so it needs the owner's
explicit confirmation and a MAJOR contract version ([persistence.md](persistence.md) §8). If the
owner had declined, the controller would be chosen each visit, as in v2. Accepted by D216
(O122); the contract change still needs the owner's explicit confirmation at handoff.

## 5. Deleting

"My instrument" can be deleted; the instrument control then falls back to the template it was
made from. Deleting everything ([persistence.md](persistence.md) §1) deletes it too.

## 6. Open

None: O122 and O123 were closed by D216 ([decisions](../../decisions.md)). The generator's
success on narrow and extreme ranges is measured before the v3.0 gate.
