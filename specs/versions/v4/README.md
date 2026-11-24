# v4 — Accompaniment with Roles

Status: direction (2026-09-25; the rhythm ratios and the rhythm editor moved here from v3
2026-10-07, D211; v4.0's scope ruled 2026-11-22, D553: Tone.js and accompaniment with roles, the
other items moved to v5; the lexicon API moved to v3.4, D555; revising the prerequisites noted as
v4.0's first task 2026-11-24, D575; v4.0's spec session opened 2026-11-24, the prerequisites
revised, D583, and three drafts started; the owner's rulings and master spec v1.0 the same day,
D585–D595; the master spec approved the same day, D596). Master spec approved; the design set
next, then the build plan. "v4+" is the
user's placement. The owner expects v4.0 to be this app's last update most probably (D552, a
direction; [O314](../../open-questions.md#after-v34-the-split-and-this-apps-horizon-o313)).

## Drafts (2026-11-24)

- [Accompaniment roles](accompaniment-roles.md): what the player hears and controls; the roles,
  choosing them, the display, responding.
- [Arranger](arranger.md): the multi-voice representation, the arranger, playing, exports,
  keeping, blast radius.
- [Sound library](sound-library.md): the spike, Tone.js's integration, the sound ban's rewording.
- **[Master spec v1.0.1](master-spec.md)** (2026-11-24, D595; v1.0.1 after the intent
  ingestion, D597–D600, nothing approved changed): consolidated from the drafts below
  after the owner's rulings (D585–D594); it wins where they differ. Approved by the owner
  (D596); the build plan waits for `ux-writer`'s design set (§12).
- Open questions: [O322](../../open-questions.md#v40-accompaniment-with-roles-o317), settled by
  the sound-library spike; O317–O321 are ruled (D585–D589).
- Foundations: [prerequisites](../prerequisites.md), revised for v4.0 (D583); K is the urgent one.

## Settled direction

- **v4.0's scope** (D553): the owner, 2026-11-22: "keep tonejs and accompaniment with roles on
  v4.0". v4.0 holds the two items below and nothing else.
- **The player plays the lead only** (D580): the owner, 2026-11-24: "we still expect the player
  only to play the lead role". Every accompaniment voice is a system voice.
- **Today the other sounds have no display beyond volume and on/off** (D581), with the precisions
  in [accompaniment roles §3](accompaniment-roles.md#3-today-as-built-d581). Whether v4.0 keeps it
  so was O320: no score display, a playing light per part (D588).
- **Instrument selection is locked in v4.0** (D590): no setting shows a part's sound; each sound is
  data behind the sound-roles seam, for the game to expose.
- **Accompaniment with side instruments** that have distinct roles: **highlighting,
  contrasting and responding** to the player's line. This goes beyond v2's rudimentary bass and
  chord backing.
- It is the first step from one line to several system voices, which is also the foundation of
  the [endgame](../../vision/endgame.md)'s companions and antagonists.
- **A software sound library (Tone.js, or a comparable one) for the system voices** _(owner,
  2026-10-01; in v4.0 since D553; which library is settled by a spike at the start of v4)_.
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
  - Prepare in v2/v3 at no cost: keep the voice list behind the `audio-ports.ts` seam (until
    v3.2, `BackingVoice` is `'bass' | 'chord'`). v3.2's guide playback does it (spec D490, D491;
    [Part C §C19.6](../v3/master-spec.md#c196-how-it-is-built-and-v4), built by
    [chunk 40](../v3/build-plan-v3.2.md#chunk-40--the-guide-playback)): sound roles, each role's
    voice a data entry, the mix's gains by channel, and one Web Audio part, the bus's note
    sounding. The owner wants those layers kept in v4: the spike replaces only that part.
  - Related: O57, the backing's voicing and timbre listening test
    ([open questions](../../open-questions.md)).

## Moved to v5 (D553)

The owner, 2026-11-22: "ok move rhythm ratio and editors, etc to v5", the "etc" confirmed the
same day as the wider rhythm mutation options and the whole-file seed. Their record is now in
[v5+](../v5-plus/README.md#moved-from-v4-d553):

- the whole-file seed (placed here as a proposal until D553);
- the rhythm ratios and the rhythm editor, with the Custom note density (moved here from v3 by
  D211, recorded D175; open: O100–O102);
- the wider rhythm mutation options (D232).

## Moved to v3.4: the lexicon API (D555)

Planned here or in v5 until 2026-11-22 (D395); the owner then put it in v3.4: "lexicon is for this
version". Its record is in v3.4's [lexicon page §9](../v3/lexicon-page.md#9-step-two-the-lexicon-api-d555).

## Depends on

- v2's backing and audio timing.
- Early building blocks: [prerequisites.md](../prerequisites.md), revised for v4.0 against v3.4's
  structural review (D575, D583): K, the multi-voice representation, is the one urgent foundation,
  proposed in [§2 K](../prerequisites.md#k-multi-voice-representation).
