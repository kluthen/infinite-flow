# v3.0 — Stray Notes from Controllers

> **Archived 2026-10-16.** v3.0 is released as version 3.0.0; this approved draft was
> consolidated into the v3 master spec (D217). Live summary:
> [master spec §9](../../versions/v3/master-spec.md#9-stray-notes).
> Relative links were written from `specs/versions/v3/`; the paths of those to files that stayed
> there were repaired on 2026-10-16 so they resolve from this folder.

Status: draft v2 (2026-10-07). spec-writer's recommendations, approved by the owner at the
overall review (D216).

Recorded by D196; in v3.0 since D211 and D212. Background:
[v3 README](../../versions/v3/README.md#stray-notes-from-controllers).

## 1. The problem (settled)

A controller can send short "stray" notes while the fingers change position: in-between notes a
real instrument would swallow. The reference breath controller sends them often, at in-between
pitches, often in pairs at velocity 127. This is a generic controller matter: nothing is built
for one device (D196).

- They bloat the review's played notes and the played-notes export.
- They do not affect acknowledgement: an expected note lights only for a played note with exactly
  its pitch inside its window. **No filter is added to acknowledgement** (D196).
- They would distort Jam's doodle and the key and mode suggestion (v3.2), which is why the filter
  comes first.

## 2. Rules

- **A very short note** is a played note whose length, from note-on to note-off, is under a fixed
  threshold.
- **The threshold is a constant, not a player setting,** tuned from recordings of the reference
  controller. It must stay well under the shortest note the app writes at its fastest tempo: a
  sixteenth note at 240 BPM lasts 62.5 ms. A value around 30–40 ms is the starting point to
  measure, not a decision.
- **Where it applies:** the review's `Played notes` lane, the played-notes export, and later the
  doodle and the key and mode suggestion. Never acknowledgement.
- **Stored as received, filtered on reading.** Kept played notes ([kept-sessions.md](kept-sessions.md))
  keep every note, so a later change of threshold loses nothing.
- **The export offers to include them:** the played-notes export leaves very short notes out by
  default, with an option to include them (the D196 export-pruning idea). The review's lane
  follows the default, with no switch of its own.

## 3. To measure

- Lengths of stray notes and of the shortest intended notes on the reference breath controller,
  at 240 BPM, to place the threshold.
- The same on a USB keyboard when one is available (v2.0.x hand checks).

## 4. Open

None. The threshold is measured before the v3.0 gate (§3).
