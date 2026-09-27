# v2 — Adaptive Tempo

> **Archived 2026-09-27.** Consolidated into the v2 master spec. Live summary:
> [versions/v2/master-spec.md §10](../../versions/v2/master-spec.md).

Status: draft v0.1 (2026-09-26). This is a nice-to-have (N1 in the
[highlights proposal](highlights-proposal.md)). Cut: v2.2 (D104), see
[definition-of-done.md](definition-of-done.md).

**Scope of this document.** The opt-in option that raises the tempo on a flat schedule while it
is on (D101) — not a performance-linked rule; see §3. Tempo as a transport concept is covered in
[audio-and-backing.md §7](audio-and-backing.md). Note acknowledgement is covered in
[midi-and-acknowledgement.md](midi-and-acknowledgement.md).

## 1. Settled inputs

- **Opt-in.** Adaptive tempo is a voluntary checkbox for players working on reading and playing
  speed (P2) (D66).
- **Rising on a flat schedule (D101).** While the option is on, the BPM rises by a fixed amount
  every few phrases, independent of how well the player is keeping up. A performance-linked
  version (reacting to note-matching or to O24's chord fit) is deferred to v3+.
- **Opt-in and visible.** Anything that adapts to how the player plays is opt-in and visible.
  Nothing penalizes, grades, ranks or scores (D66).

## 2. What v1 gives us (checked)

- **Tempo is transport-only.** `TEMPO_VALUES` in `src/domain/controls/generation-controls.ts` is a
  closed list from 60 to 240 in steps of 10, with a default of 90. No planner reads tempo. Since
  tempo stays transport-only (D84), adaptive tempo never touches generation, seeds or
  reproducibility. It only changes the clock mapping at phrase boundaries.

## 3. The rule (settled, D101)

- **Availability.** The option is available only when a controller is connected. Even though the
  D101 schedule no longer reacts to what's played, the feature still assumes a MIDI session is
  running — it's aimed at players building speed on their instrument, and a session without a
  controller has no note acknowledgement to build speed against. Without a controller the
  checkbox is shown as unavailable, with the reason.
- **The v2.2 rule is a flat schedule, not a performance-linked one (D101).** Every **2 phrases**,
  the tempo rises by a flat **+5 BPM**, unconditionally — this replaces the earlier proposed
  "expected-note acknowledgement rate" metric (≥80% match adds 2 BPM) entirely, rather than just
  its numbers. The user's own framing ("let's set this for now; later, v3+, we will have more
  complex behavior") explicitly defers a performance-sensitive version — one that reacts to how
  well the player is keeping up, whether via exact-note matching or O24's chord fit — to v3 or
  later. This also means adaptive tempo in v2.2 no longer depends on O24 at all.
  - Tempo changes only at phrase boundaries, so no phrase is ever played at two tempos.
- **Ceiling.** The rise stops at 240 BPM, the control maximum.
- **Never decreases automatically.** The schedule only ever raises the tempo. Under D91's
  full session-UI lock there is no manual mid-session edit at all — a lower tempo can only be
  chosen at Idle or Review, before the next session starts, and does not itself turn the option
  off.
- **What stays hidden.** Nothing is displayed, stored or exported about performance. Only the
  tempo itself is shown, and the player can always see that adaptive tempo is on (ux-writer
  decides how).
- **Pace in practice.** At 90 BPM a phrase lasts about 10.7 s. The tempo goes from 90 to 120 BPM
  in 12 phrases (6 steps of +5 BPM), roughly 2.1 minutes. The cadence and step size are starting
  values to tune with testers, same as before.
- **After the session (settled, D102).** The tempo control is a closed list with steps of 10, but
  the flat schedule can land on values outside that list.
  - During the session, the displayed tempo shows the exact value reached.
  - At session end (Stop, or the next Start), the control **resets to the tempo the player
    started from**, and the review shows the tempo actually reached.

## 4. Open questions

None remain in this document. **O67** and **O74** are settled (D101, D102, above).

## 5. Acceptance criteria (proposed)

1. **Opt-in.** With the option off, the tempo never changes on its own.
2. **Flat, unconditional schedule (D101).** With the option on, the tempo rises by exactly +5
   BPM every 2 phrases, applied at phrase boundaries, until it reaches 240 — regardless of what
   MIDI input is received, including no input at all.
3. **Never punishes.** No injected-MIDI condition, including silence or wrong notes throughout
   the session, ever makes the tempo decrease or changes anything else about the schedule.
4. **Visible, never scored.** The current tempo and the "adaptive on" state are visible
   throughout. No rate, percentage or score is rendered anywhere.
5. **Generation untouched.** For the same seeds and controls, generated phrases are identical
   whether adaptive tempo is on or off.
6. **Resets (D102).** After Stop, or at the next Start, the tempo control shows the value the
   session started from, not the value it reached. The review shows the tempo actually reached.
