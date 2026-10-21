# v4 — Accompaniment with Roles

Status: direction (2026-09-25; the rhythm ratios and the rhythm editor moved here from v3
2026-10-07, D211). Not yet specced. "v4+" is the user's placement.

## Settled direction

- **Accompaniment with side instruments** that have distinct roles: **highlighting,
  contrasting and responding** to the player's line. This goes beyond v2's rudimentary bass and
  chord backing.
- It is the first step from one line to several system voices, which is also the foundation of
  the [endgame](../../vision/endgame.md)'s companions and antagonists.

## Placed here (proposed)

- **Whole-file seed.**
  - A complete MusicXML or MIDI file can be fed in as a continuation seed.
  - The whole file is used: there is no preview, cutting or editing. Infinite Flow is not a DAW.
  - The user said it "shouldn't be too difficult" but gave no version. v4 is a proposed
    placement, after v3's played-motif seed.

- **Rhythm ratios and the rhythm editor** _(moved from v3, D211; recorded 2026-10-03, D175)_.
  - **Rhythm ratios:** the player sets how likely each note value is to appear, from the whole
    note down to the sixteenth note.
  - **Rhythm editor:** copy the rhythm of one of the bars, or enter a rhythm by hand.
  - Both are reached through a new note-density value, **Custom** (working name). A mutation can
    never move note density into Custom; while Custom is set, a mutation may alter the ratios.
  - The rhythm lock recorded with them stays in v3.2, with Jam
    ([v3](../v3/README.md#rhythm-lock-and-mutation)). Their full record is in
    [v3](../v3/README.md#moved-to-v4-rhythm-ratios-and-the-rhythm-editor).
  - Open: O100, O101, O102 ([register](../../open-questions.md#v3-rhythm-candidates-o100)).

- **Wider rhythm mutation options** _(owner, 2026-10-08, D232)_. v3.2's rhythm lock is "a good
  first iteration on mutations": a short list of small, one-phrase rhythm changes. v4 widens it,
  for example to changes that stay (a rhythm that evolves), the catalogue's larger mutations
  (augmentation, diminution, metric displacement, regrouping) and mutations under the rhythm
  editor's own rhythm. See the [mutation catalogue](../../../docs/music/mutation-catalogue.md).

- **A software sound library (Tone.js, or a comparable one) for the system voices** _(owner,
  2026-10-01; proposed, to be settled by a spike at the start of v4)_.
  - Why: several voices with distinct timbres, and drums, need more than v2's raw Web Audio
    oscillators (a bass triangle and chord sines). The sound stays fully software-generated:
    synths (`PolySynth`, `FMSynth`, `MembraneSynth`, `NoiseSynth`, `MetalSynth`) and effects,
    no samples and no audio assets.
  - Constraints to keep:
    1. Our look-ahead scheduler and audio clock stay the only timing source: use the
       library's instruments and effects, never its `Transport`.
    2. One shared `AudioContext` with the click and the mix.
    3. The library is dynamic-imported at session start, not in the main bundle.
    4. Re-measure latency and CPU with its nodes in the path, on the phone too (reverb is the
       heaviest); the v2 latency goal still holds.
    5. `verify:boundaries` keeps its no-sample and no-audio-asset rules.
    6. The MIDI and MusicXML exports stay on the pure renderer in `src/domain/backing/`.
  - Prepare in v2/v3 at no cost: keep the voice list behind the `audio-ports.ts` seam (today
    `BackingVoice` is `'bass' | 'chord'`).
  - Related: O57, the backing's voicing and timbre listening test
    ([open questions](../../open-questions.md)).

## Here or in v5: the lexicon API (D395)

The owner, 2026-10-21: "For later (v4 or v5 depending on how they goes) we will turn this in a
proper API." Built on v3.4's [lexicon page](../v3/lexicon-page.md). Which version takes it is
decided later; its record is in the [roadmap](../../roadmap.md#planned-v4-or-v5--the-lexicon-api).

## Depends on

- v2's backing and audio timing, and v3's continuation from outside material.
- Early building blocks: [prerequisites.md](../prerequisites.md), being drafted.
