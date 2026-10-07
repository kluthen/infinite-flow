# v3.2 — Key and Mode Suggestion

Status: draft v1 (2026-10-07). spec-writer's proposals for the owner's review. Settled items cite
their decision; everything else is `(proposed)`.

Serves P3, the Fledgling Composer, C3 "grow an idea": the next Jam on a doodle can be continued in
the key and mode the doodle sounds in
([personas](../../personas.md#p3--the-fledgling-composer-secondary-d61)). It also serves P1.G1
(vocabulary by exposure) a little: the app names the mode the player's own idea sounds in. Part of
[Jam](jam.md). Research: [key and mode estimation](../../../docs/music/key-and-mode-estimation.md).

Plain words used here:

- **Key**: the home note ([tonic](../../../docs/music/lexicon.md#tonic)) plus the scale or mode on
  it. In the app, Written key names the home note and
  [Collection](../../../docs/music/lexicon.md#collection) the scale or mode.
- **Pitch class**: a note name regardless of octave: every C is the same pitch class.
- **Mode**: one of the seven scales made from the same seven notes, each starting on a different
  one ([mode](../../../docs/music/lexicon.md#mode)).

## 1. Settled

- **Suggest only; the player confirms** (D209, D212, D216). The player-selected key and mode stay
  authoritative; the app never switches them on its own. This governs the suggestion only: Vary
  settings keeps mutating the key and mode when the player turns it on (O121, D216).
- **A weighted draw when several answers fit** (D212): the app rates them and "casts a dice", so the
  likeliest answer comes up most often. The draw is seeded. The player confirms the drawn answer
  (D216).
- **The method** (D216, closing O113; detail in the
  [research](../../../docs/music/key-and-mode-estimation.md#ranking-and-the-dice-proposed)):
  - score all 84 key and mode pairs (12 home notes × 7 modes) from each note's role in the
    candidate, weighted by the note's length, with a bonus when the first or last note is the
    candidate's home;
  - keep at most 3 candidates, each within half the best one's chance;
  - draw among them in integers only (`Math.exp` can differ between browsers);
  - compute in concert pitch, name the answer in written pitch.
- **Thresholds** (D216): at least 5 pitch classes, 6 notes and 2 beats of sounding time. Nothing is
  suggested when the player's selection is among the kept candidates, or when under 80 % of the
  doodle fits the winner.
- **Very short notes are ignored** (the stray-note filter, v3.0).
- Reimplemented in TypeScript: Essentia is AGPL, music21 is Python (D216).

## 2. The method (settled) and its proposed details

- **Input: the quantised doodle** ([Jam §3.3](jam.md#33-quantising-proposed-o142)), after the
  stray-note filter. Lengths are in ticks, so the whole computation stays in integers, and the doodle
  has a beat grid, so the research's optional strong-beat weight (×1.5 for a note starting on beat 1
  or 3) applies (proposed).
- **Role shares and cue strengths** as the research proposes: home 0.200, fifth 0.165, third 0.145,
  the other four notes 0.1175 each, notes outside 0.004; final ×2, first ×1.5; lengths clamped to
  half a beat and a beat and a half. They are a starting point, stored as integer penalties
  (thousandths), and checked by the owner's listening (§6).
- **Equal chances for all seven modes beforehand, and no head start for the current selection**
  (proposed, O150). The research's optional ×2 head start is not needed: "the selection is among the
  kept candidates" already lets the player's choice win every close call. Locrian, which ties with
  Phrygian when the fifth is missing, stays equal until listening shows it surprises players.
- **Ties at the cap**: candidates are ordered by penalty, then home note C to B, then mode Ionian,
  Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian, so three-way cuts are always the same.
- **"The selection is among the candidates"**: Major is compared as Ionian and Minor as Aeolian,
  since they hold the same notes.
- **The seed: the quantised doodle alone** (proposed, O149): a 32-bit FNV-1a hash of its notes
  (ticks and concert pitches), read with a hash tie key like the generator's own
  (`infinite-flow/key-suggestion/v1`). So **the same doodle always gives the same suggestion**,
  across sessions too. Two live doodles are never identical, so the dice still varies in practice.
  Why not "the session": there is no session seed (each phrase's seed is a fresh random value), so a
  session-seeded draw could not be reproduced. The draw needs no new named stream.
- **The suggestion changes no phrase** unless the player confirms it, and then only as a key and
  mode setting change. So no replay key needs to carry the suggestion: a confirmed suggestion is
  recorded as the settings it set.

## 3. Where and when it is shown (proposed, O148)

A running session never asks the player for anything (v3.0 §4.1, personas), and the doodle is only
known once the Jam has started. So the suggestion is never offered during a Jam.

- **Computed** when the doodle ends, during the generation measure; nothing is shown then.
- **Shown in the review of that Jam**, beside the doodle section: the drawn key and mode, in written
  pitch, with **Use it** and **Keep mine**. Also in the review of a kept Jam session, while the
  player's selection still differs.
- **"Jam again on this doodle"** sits with it: back at Idle, the doodle is held, phrase 1 is
  generated from it, and Start runs a Jam that skips the capture ([Jam §2](jam.md#2-entering-a-jam-proposed-o140)).
  **Use it** then means this next Jam continues the doodle in the key and mode it sounds in.
- **At Idle with a held doodle**, the suggestion stays shown until the player answers it or drops
  the doodle.
- **Consequence:** the Jam that produced the doodle is always continued in the player's own key.
  The alternative is a two-step Jam (capture the doodle, return to Idle with the suggestion, then
  Start), which contradicts D215 and D216's continuous doodle-then-phrases flow. **Owner decision.**
- **Only the drawn answer is shown** (proposed, O150), as D216 has the player confirm "the drawn
  answer". The other kept candidates are not listed.

## 4. Confirming and declining

- **Use it** sets Written key and Collection exactly as if the player had changed them by hand:
  phrase 1 is regenerated (from the held doodle, when there is one), and pre-generated phrases are
  discarded ([v3.0 master spec §8](master-spec.md#8-pre-generating-phrases-at-idle)). At Idle and
  in the review nothing is queued for a session, so nothing else is discarded. The choice is saved
  like any setting.
- **Keep mine** changes nothing, and that doodle's suggestion is not offered again: the same doodle
  would give the same answer.
- **Labels follow the player's family** (proposed, O150). With Major or Minor selected, an Ionian
  answer reads "Major" and an Aeolian one "Minor" (the app's Major and Minor use tonal chord plans,
  its modes modal ones). Any other answer is named as its mode, and **Use it** then moves the
  Collection from the Major and Minor group to the modes; the player's confirmation is what allows
  that, since Vary settings never crosses between the two groups.
- **Vary settings** is unaffected: the suggestion is a one-time setting change by the player; Vary
  settings, when on, mutates from the confirmed key during the next session (O121).

## 5. When nothing is suggested

- Fewer than 5 pitch classes, 6 notes or 2 beats of sounding time after the filter (D216).
- The player's selection is among the kept candidates (D216).
- Under 80 % of the doodle's weighted length fits the winner (D216): the doodle uses a scale the app
  does not offer, such as harmonic minor or blues notes. Proposed: the review then says so plainly,
  once, without naming a "wrong" note; the never-penalize rule applies.
- A Jam whose phrase 1 never came has no review (Jam §4.2), so no suggestion either.

## 6. Conflicts and checks

- **README wording** (v3 README, D212): "the same doodle in the same session gives the same
  suggestion" and "the same doodle always gives the same suggestion, so a phrase replay key still
  reproduces a session" disagree, and the second reason does not hold (the suggestion changes no
  phrase on its own). Proposed: "the same doodle always gives the same suggestion" (§2).
- **"A running session never asks"** against "the player confirms": settled by placement (§3), at
  the cost the owner should weigh.
- **Listening check before the gate**: the owner hears a handful of doodles and their suggestions
  (the research's worked examples included) and judges whether the shares, cues and the Locrian
  question need changing.

## 7. Open

- **O148 - Where the suggestion is shown** _(v3.2; D212, D216)_: during the Jam is ruled out by "a
  running session never asks". Proposed: in the Jam's review and a kept Jam session's review, with
  "Jam again on this doodle" holding the doodle at Idle, where the suggestion stays shown until
  answered; the Jam that produced the doodle stays in the player's key. Alternative: a two-step
  Jam, against D215 and D216's flow. Needs the owner.
- **O149 - The draw's seed** _(v3.2; D212)_: which seed makes the draw reproducible. Proposed: an
  FNV-1a hash of the quantised doodle alone, so the same doodle always gives the same suggestion;
  there is no session seed to use.
- **O150 - Labels, priors and alternatives** _(v3.2; D216)_: how answers are named, whether modes
  get unequal chances, whether alternatives show. Proposed: keep the player's family (Major and
  Minor for Ionian and Aeolian answers); equal chances and no head start for the selection; show
  only the drawn answer; revisit Locrian after the listening check.
