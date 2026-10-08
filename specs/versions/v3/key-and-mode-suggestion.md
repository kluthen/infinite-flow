# v3.2 — Key and Mode Suggestion

Status: draft v2 (2026-10-08). Approved by the owner as proposed (D234). Every item below is
settled and cites its decision; the gaps closed while settling the draft cite "draft v2".

Serves P3, the Fledgling Composer, C3 "grow an idea": the next Jam on a doodle can be continued in
the key and mode the doodle sounds in
([personas](../../personas.md#p3--the-fledgling-composer-secondary-d61)). It also serves P1.G1
(vocabulary by exposure) a little: the app names the mode the player's own idea sounds in. Part of
[Jam](jam.md), whose plain words (doodle, Jam, held doodle) this document shares. Research:
[key and mode estimation](../../../docs/music/key-and-mode-estimation.md).

Plain words used here:

- **Key and mode suggestion**: the key and mode the app proposes for a doodle, which the player
  confirms or declines. "The suggestion" for short.
- **Key**: the home note ([tonic](../../../docs/music/lexicon.md#tonic)) plus the scale or mode on
  it. In the app, Written key names the home note and
  [Collection](../../../docs/music/lexicon.md#collection) the scale or mode.
- **Pitch class**: a note name regardless of octave: every C is the same pitch class.
- **Mode**: one of the seven scales made from the same seven notes, each starting on a different
  one ([mode](../../../docs/music/lexicon.md#mode)).

## 1. Settled before the draft

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

## 2. The method and its details

Settled by D234 as draft v1 proposed, apart from what cites draft v2.

- **Input: the quantised doodle** ([Jam §3.3](jam.md#33-quantising-d234-o142)), after the
  stray-note filter. Lengths are in ticks, so the whole computation stays in integers, and the doodle
  has a beat grid, so the research's optional strong-beat weight (×1.5 for a note starting on beat 1
  or 3) applies.
- **Role shares and cue strengths** as the research proposes: home 0.200, fifth 0.165, third 0.145,
  the other four notes 0.1175 each, notes outside 0.004; final ×2, first ×1.5; lengths clamped to
  half a beat and a beat and a half. They are a starting point, stored as integer penalties
  (thousandths), and checked by the owner's listening (§6).
- **Equal chances for all seven modes beforehand, and no head start for the current selection**
  (D234, O150). The research's optional ×2 head start is not needed: "the selection is among the
  kept candidates" already lets the player's choice win every close call. Locrian, which ties with
  Phrygian when the fifth is missing, stays equal until listening shows it surprises players.
- **Ties at the cap**: candidates are ordered by penalty, then home note C to B, then mode Ionian,
  Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian, so three-way cuts are always the same.
- **"The selection is among the candidates"**: Major is compared as Ionian and Minor as Aeolian,
  since they hold the same notes.
- **The seed: the quantised doodle alone** (D234, O149): a 32-bit FNV-1a hash of its notes
  (ticks and concert pitches), read with a hash tie key like the generator's own
  (`infinite-flow/key-suggestion/v1`). So **the same doodle always gives the same suggestion**,
  across sessions too. Two live doodles are never identical, so the dice still varies in practice.
  There is no session seed to use (each phrase's seed is a fresh random value), so a
  session-seeded draw could not be reproduced. The draw needs no new named stream.
- **The suggestion changes no phrase** unless the player confirms it, and then only as a key and
  mode setting change. So no replay key needs to carry the suggestion: a confirmed suggestion is
  recorded as the settings it set.
- **A preset's key and mode restriction does not bound the candidates** (draft v2): the suggestion
  reports what the doodle sounds in, and v3.1's restriction guides and never blocks (D231). Using an
  answer outside the restriction leaves the preset like any key and mode chosen by hand (§4).
  Whether the suggestion marks such an answer is `ux-writer`'s call, with D231's highlight.
- **Cost**: scoring 84 pairs over at most a few dozen notes is integer arithmetic, far under a
  millisecond; it runs during the generation measure without touching the time budget
  ([Jam §4.3](jam.md#43-the-time-budget)).

## 3. Where and when it is shown

Settled by D234 (O148).

A running session never asks the player for anything (v3.0 §4.1, personas), and the doodle is only
known once the Jam has started. So the suggestion is never offered during a Jam.

- **Computed** when the doodle ends, during the generation measure; nothing is shown then.
- **Shown in the review of that Jam**, beside the doodle section: the drawn key and mode, in written
  pitch, with **Use it** and **Keep mine**. Also in the review of a kept Jam session, while the
  player's selection still differs and the player has not declined it (§4).
- **"Jam again on this doodle"** sits with it: back at Idle, the doodle is held, phrase 1 is
  generated from it, and Start runs a Jam that skips the capture ([Jam §2](jam.md#2-entering-a-jam-d234-o140)).
  **Use it** then means this next Jam continues the doodle in the key and mode it sounds in.
- **At Idle with a held doodle**, the suggestion stays shown until the player answers it or drops
  the doodle; dropping the doodle drops its suggestion.
- **Accepted consequence** (D234): the Jam that produced the doodle is always continued in the
  player's own key. The two-step Jam (capture the doodle, return to Idle with the suggestion, then
  Start) was rejected: it contradicts D215 and D216's continuous doodle-then-phrases flow.
- **Only the drawn answer is shown** (D234, O150), as D216 has the player confirm "the drawn
  answer". The other kept candidates are not listed.

## 4. Confirming and declining

Settled by D234, apart from what cites draft v2.

- **Use it** sets Written key and Collection exactly as if the player had changed them by hand:
  phrase 1 is regenerated (from the held doodle, when there is one), and pre-generated phrases are
  discarded ([v3.0 master spec §8](master-spec.md#8-pre-generating-phrases-at-idle)). At Idle and
  in the review nothing is queued for a session, so nothing else is discarded. The choice is saved
  like any setting. Under a v3.1 preset whose restriction excludes the answer, the selection then
  reads Custom (D231).
- **Keep mine** changes nothing, and that doodle's suggestion is not offered again: the same doodle
  would give the same answer. The decline is kept with the kept Jam session, so its review and a
  doodle held from it do not offer it again (draft v2).
- **Labels follow the player's family** (D234, O150). With Major or Minor selected, an Ionian
  answer reads "Major" and an Aeolian one "Minor" (the app's Major and Minor use tonal chord plans,
  its modes modal ones). Any other answer is named as its mode, and **Use it** then moves the
  Collection from the Major and Minor group to the modes; the player's confirmation is what allows
  that, since Vary settings never crosses between the two groups.
- **Vary settings** is unaffected: the suggestion is a one-time setting change by the player; Vary
  settings, when on, mutates from the confirmed key during the next session (O121).
- **A visit that saves nothing** (draft v2): in an outdated tab or after a failed read
  ([v3.0 master spec §4.3, §4.4](master-spec.md#44-loading-saved-settings)), the suggestion, Use it
  and Keep mine work in memory for that visit; nothing is saved, the decline included.

## 5. When nothing is suggested

Settled by D216 and D234, apart from what cites draft v2.

- Fewer than 5 pitch classes, 6 notes or 2 beats of sounding time after the filter (D216). Nothing
  is shown about it (draft v2): a short doodle is normal, not a failure.
- The player's selection is among the kept candidates (D216): the doodle fits the selection, and
  nothing is shown.
- Under 80 % of the doodle's weighted length fits the winner (D216): the doodle uses a scale the app
  does not offer, such as harmonic minor or blues notes. The review then says so plainly, once,
  without naming a "wrong" note; the never-penalize rule applies (D234).
- A Jam whose phrase 1 never came has no review ([Jam §4.2](jam.md#42-when-phrase-1-is-late)), so
  no suggestion either.

## 6. Conflicts and checks

- **README wording** (v3 README, D212): "the same doodle in the same session gives the same
  suggestion" and "the same doodle always gives the same suggestion, so a phrase replay key still
  reproduces a session" disagreed, and the second reason did not hold (the suggestion changes no
  phrase on its own). Settled (D234): "the same doodle always gives the same suggestion" (§2); the
  [v3 README](README.md#key-and-mode-suggestion) now says so.
- **"A running session never asks"** against "the player confirms": settled by placement (§3,
  D234).
- **Listening check before the gate**: the owner hears a handful of doodles and their suggestions
  (the research's worked examples included) and judges whether the shares, cues and the Locrian
  question need changing.

### Definition of done (D234)

1. The method gives the same answer for the same quantised doodle in Chrome and Edge, on any
   machine, across sessions and reloads.
2. Nothing is suggested below the thresholds, when the selection is among the kept candidates, or
   when under 80 % of the doodle fits; the last case is said plainly, once, with no "wrong" note.
3. The suggestion appears only in the review and at Idle with a held doodle, never during a Jam.
4. Use it changes Written key and Collection exactly as a change by hand does; Keep mine changes
   nothing, and a declined suggestion is not offered again for that doodle.
5. The owner's listening check is recorded.

## 7. Open

None: closed by D234 (O148, O149, O150).
