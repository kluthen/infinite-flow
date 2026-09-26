# v2 — Adaptive Tempo

Status: draft v0.1 (2026-09-26). This is a nice-to-have (N1 in the
[highlights proposal](highlights-proposal.md)). Proposed cut: v2.2, see
[definition-of-done.md](definition-of-done.md).

**Scope of this document.** The opt-in option that raises the tempo gradually while the player
keeps up. Tempo as a transport concept is covered in
[audio-and-backing.md §7](audio-and-backing.md). Note acknowledgement is covered in
[midi-and-acknowledgement.md](midi-and-acknowledgement.md).

## 1. Settled inputs

- **Opt-in.** Adaptive tempo is a voluntary checkbox for players working on reading and playing
  speed (P2) (D66).
- **Rising only while the player keeps up.** While the option is on, the BPM rises slowly as
  long as the player keeps an "acceptable level" of matching notes (v2 README). The README
  records that level as undefined and dependent on O24.
- **Opt-in and visible.** Anything that adapts to how the player plays is opt-in and visible.
  Nothing penalizes, grades, ranks or scores (D66).

## 2. What v1 gives us (checked)

- **Tempo is transport-only.** `TEMPO_VALUES` in `src/domain/controls/generation-controls.ts` is a
  closed list from 60 to 240 in steps of 10, with a default of 90. No planner reads tempo. With
  O38's proposed default (tempo stays transport-only), adaptive tempo never touches generation,
  seeds or reproducibility. It only changes the clock mapping at phrase boundaries.

## 3. The rule `(proposed)` (O67)

- **Availability.** The option is available only when a controller is connected. Without MIDI
  input there is nothing to adapt to. Without a controller the checkbox is shown as unavailable,
  with the reason.
- **Metric: the expected-note acknowledgement rate of one phrase.** This is the number of
  expected notes acknowledged (see
  [midi-and-acknowledgement.md §5](midi-and-acknowledgement.md)) divided by the number of
  expected notes in the phrase.
  - **This proposal departs from the README's framing, and the user must confirm it.** The README
    ties the "acceptable level" to O24, the chord-fit check. The proposal instead uses **exact
    note matching**, for these reasons:
    1. It serves P2's goal directly. P2 practises reading speed, and reading means playing the
       notes that are written.
    2. It is fully specified today, whereas O24 is still open.
    3. It decouples N1 from S1, so adaptive tempo isn't blocked on the chord-fit definition.
  - The alternative is to count a measure as "kept" if it either fits the chord (O24) or has
    most of its expected notes acknowledged. This fits P1, but is only definable once O24 is
    settled.
- **Evaluation.**
  - Each phrase is evaluated once all its acknowledgement windows have closed, which happens at
    most 200 ms into the next phrase.
  - If the rate is **at least 80%**, the tempo rises by **2 BPM**. The rise takes effect at the
    start of the phrase after next, which is the first boundary not yet reached once the
    evaluation is known.
  - Tempo changes only at phrase boundaries, so no phrase is ever played at two tempos.
- **Silence is neutral.** A phrase with no note-on at all neither raises the tempo nor counts
  against the player (D67: breathing and recovering are normal).
- **Never decreases automatically.**
  - Lowering the tempo because the player fell behind would be a penalty in disguise (D66).
  - The player can always lower the tempo by hand. That applies at the next boundary and does
    not turn the option off.
- **Ceiling.** The rise stops at 240 BPM, the control maximum. An optional player-set target
  tempo is a candidate for later.
- **What stays hidden.** The rate is never displayed, stored or exported. Only the tempo itself
  is shown, and the player can always see that adaptive tempo is on (ux-writer decides how).
- **Pace in practice.** At 90 BPM a phrase lasts about 10.7 s. If every phrase qualifies, the
  tempo goes from 90 to 120 BPM in 15 phrases, roughly 2.5 minutes. The numbers (80%, +2 BPM,
  one phrase per step) are starting values to tune with testers.
- **After the session (O74).** The tempo control is a closed list with steps of 10, but adaptive
  steps land in between.
  - Proposed: during the session, the displayed tempo shows the exact value.
  - At session end, the control returns to the tempo the player started from, and the review
    shows the tempo reached.
  - The alternative is for the control to keep the reached tempo, rounded down to its step,
    which would widen or relax `TEMPO_VALUES`.

## 4. Open questions

- **O67 - The adaptive-tempo rule.** Should the metric be the expected-note acknowledgement rate
  per phrase (proposed, which decouples it from O24), or should it include chord-fit measures
  once O24 is settled? And are the proposed numbers acceptable: at least 80%, +2 BPM per
  qualifying phrase, silence neutral, never automatically decreasing, ceiling 240?
- **O74 - Tempo after an adaptive session.** When the session ends, should the tempo control
  return to its starting value (proposed)? Or should it keep the reached tempo, rounded down to
  the 10 BPM step or with the step relaxed?

## 5. Acceptance criteria (proposed)

1. **Opt-in.** With the option off, the tempo never changes on its own.
2. **Rises only on success.** With injected MIDI that matches every expected note, the tempo
   rises by 2 BPM per phrase, applied at boundaries, until 240.
3. **Never punishes.** With injected MIDI below the threshold, or with no input at all, the
   tempo never decreases and nothing else changes.
4. **Visible, never scored.** The current tempo and the "adaptive on" state are visible
   throughout. No rate, percentage or score is rendered anywhere.
5. **Generation untouched.** For the same seeds and controls, generated phrases are identical
   whether adaptive tempo is on or off.
