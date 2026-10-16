# v3.0 — Pre-generating Phrases at Idle

> **Archived 2026-10-16.** v3.0 is released as version 3.0.0; this approved draft was
> consolidated into the v3 master spec (D217). Live summary:
> [master spec §8](../../versions/v3/master-spec.md#8-pre-generating-phrases-at-idle).
> Relative links were written from `specs/versions/v3/`; the paths of those to files that stayed
> there were repaired on 2026-10-16 so they resolve from this folder.

Status: draft v2 (2026-10-07). spec-writer's recommendations, approved by the owner at the
overall review (D216).

Recorded by D206, in the owner's words: "while start session isn't pushed have background
generate a few phrases in advance (no more than 4) that give us some time ahead." In v3.0 since
D211 and D212. Serves P2, the Speed Builder, who plays at the fastest tempos
([personas](../../personas.md)). Background:
[v3 README](../../versions/v3/README.md#pre-generating-phrases-at-idle).

## 1. Why

In v2 the failure ladder keeps 1.075 s for a standalone attempt, more than one measure at 240 BPM,
so at 240 BPM phrase 2 is always generated standalone and its join to phrase 1 is never smoothed
(D205). Generated before Start, with no deadline, phrase 2 can carry in from phrase 1 again.

## 2. Rules

- **How many (O107):** up to 4 phrases after phrase 1, generated one after another at Idle. They
  are generated at Idle only and spent by the session, which then looks one phrase ahead as v2
  does. Topping them up during a session would change v2's look-ahead and where a setting change
  lands, and is not part of v3.0.
- **Changes before Start (O108):** anything that replaces phrase 1 or changes a setting phrases
  are generated from (a control, the profile, the instrument, a regeneration) discards every
  pre-generated phrase and starts again from phrase 1. A change of window size that changes the
  note density phrases are generated with, or the layout a session would hold, re-checks them:
  one that no longer fits is discarded with every phrase after it.
- **The prewarm and the player first (O109):** pre-generation runs after v2's prewarm, on the same
  generation worker. Any request the player makes at Idle cancels the background attempt in
  progress, the way a dropped attempt is cancelled in a session, so a regeneration never waits
  behind it.
- **Start never waits (O110):** a pre-generation in progress does not count as "a new phrase is
  being generated", so it never stops a session from starting. The session takes whatever is
  ready and generates the rest under its deadlines, as v2 does. Pre-generation runs only at Idle,
  with a phrase 1 on screen that a session could start from, and not while the review is shown.
  It never changes phrase 1 or its starting note.
- **The same phrases either way (O111):** a pre-generated phrase is the phrase the session would
  have generated at that place: the same request and seed, the same mutation schedule, tension
  arc and density step-down. A session's phrases depend only on which attempts succeeded in time,
  never on whether pre-generation ran. This needs the session's seeds and schedules to be fixed
  before Start, from phrase 1.
- **Never saved:** pre-generated phrases live in memory and are gone on reload.

## 3. To measure

- The share of sessions at 240 BPM whose phrase 2 now carries in, against v2's 0 %.
- Background work at Idle on a tablet on battery: the cost of up to 4 generations after each
  change.

## 4. Open

None: O107–O111 were closed as written here by D216 ([decisions](../../decisions.md)).
