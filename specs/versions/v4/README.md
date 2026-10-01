# v4 — Accompaniment with Roles

Status: direction (2026-09-25). Not yet specced. "v4+" is the user's placement.

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

## Depends on

- v2's backing and audio timing, and v3's continuation from outside material.
- Early building blocks: [prerequisites.md](../prerequisites.md), being drafted.
