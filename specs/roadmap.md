# Infinite Flow Roadmap

Status: draft v1.10 (rewritten 2026-09-25 after the persona and vision session; browser scope
added 2026-09-28, D127; review candidates added 2026-09-28, D128; session-keeping candidates and
export by content added 2026-09-28, D129; favorites moved to v3 2026-09-28, D130; staff-only
session view placed in v5 2026-09-28, D133; v2 replanned 2026-10-03: real-hardware checks as
v2.4, D173, and the chord-fit check moved to v3 as a nice-to-have, D174; v3 rhythm candidates
added, D175; v2.1, v2.2 and v2.4 compacted into one v2.0 release 2026-10-05, D183; Tone.js noted
as a candidate, D185; real-program export checks after the v2.0 tag and Bluetooth MIDI
best-effort 2026-10-06, D191, D193; USB keyboard checks after the v2.0 tag and the vision
rewrite carry-over 2026-10-06, D198, D199; pre-generating phrases at Idle added as a v3
candidate 2026-10-07, D206; v1.0 and v2.0 marked released 2026-10-07, D208; MIDI-seeded
continuation named Jam, with three candidates, 2026-10-07, D209; embellishment flags and
player-made presets in v3, sequence writing as a later candidate, 2026-10-07, D210; v3 split
into releases, rhythm ratios and editor moved to v4, four candidates dropped, 2026-10-07, D211;
v3.0.1 merged into v3.0 and played signal patterns tied to learning, D212; style packs recorded
as planned, version not yet assigned, 2026-10-11, D259)

This is an ordered timeline with no dates. Each version's scope lives in its folder under
[versions/](versions/README.md). The principles every version follows are in the
[far vision](vision/far-vision.md). Work that later versions need built early is tracked in
[prerequisites.md](versions/prerequisites.md), which is being drafted.

The old stages 2 ("Minimal MIDI Integration") and 3 ("MIDI-Seeded Continuation") are
**superseded** by the v2/v3 split below. v2 bundles MIDI acknowledgement with the rolling phrase.
MIDI-seeded continuation moves to v3. The previous roadmap, which `docs/release/` cites by section,
is archived verbatim as [2026-09-25-roadmap-pre-vision.md](archive/2026-09-25-personas-and-vision/roadmap-pre-vision.md).

## Timeline

### 0. v1.0 gate (done)

Released as `v1.0` on 2026-09-26. Its working record is archived at
[archive/v1/](archive/v1/README.md).

- **Intent:** close the first release. v1 is implemented; the rc1 commit is `2418069`.
- **Scope:** in this order:
  1. **ISS-003:** transposition becomes open data on the instrument template, and the key is
     chosen in written pitch. The display selector is removed.
  2. **ISS-004:** the rhythm-grammar **feasibility review** goes to the user first, then rhythmic
     variety is implemented and _Mixed_ is retired.

  Both issues go through ux-writer, then implementation. The contract may be amended.

- **Depends on:** nothing new.
- **Folder:** [versions/v1](versions/v1/README.md).

### 1. v2 — Rolling phrase (released)

Released on 2026-10-07 as v2.0, version 2.0.0, with its tag pending the owner's approval (D208).
The hand checks the spec lets follow the tag remain, as v2.0.x checks. The milestone's working
record is archived at [archive/v2/](archive/v2/README.md).

- **Intent:** real-time reading and playing with mild pressure. This is the Speed Builder's
  release, and it gives the Curious Improviser their real-time goal.
- **Headline scope:**
  - a rolling phrase that continues from its own material;
  - MIDI acknowledgement of expected notes (the measure-end check against the chord moved to v3
    as a nice-to-have, D174);
  - rudimentary bass and chord backing;
  - sessions with Start and Stop;
  - last-session review with export of the whole session: the generated notes as MusicXML or
    MIDI, the played notes as MIDI, each by its own action (D129, D130); no favorites (v3, D130);
  - adaptive tempo as an opt-in (nice to have).
- **Release:** one release, **v2.0** (D183), with one release gate. It holds the core loop and
  the parts first planned as releases of their own: v2.1 (played notes in the review and their
  export, the settings-mutation flag), v2.2 (adaptive tempo, the multi-phrase tension arc) and
  v2.4, the real-hardware checks: the controller check, the acknowledgement windows and latency
  tuned on the reference hardware, real exports opened in MuseScore, a MIDI tool and a DAW, the
  playhead and main-thread measurements in real Chromium, and the cold run re-measured on the
  reference machine (D173, D180). v2.0 does not ship before those checks, apart from the
  real-program export checks (MuseScore, a MIDI tool, a DAW), which may follow the tag as a v2.0.x
  hand-check note (D193), and the checks that need a USB keyboard, which follow it the same way
  (D199). USB is the tested controller connection; Bluetooth MIDI is best-effort (D191). v2.3 is empty since the chord-fit check
  left for v3 (D174); the number is not reused.
- **Depends on:** the v1.0 gate (instrument transposition as data); the first audio and timing
  foundation; **O10** once continuation reuses earlier material. (O24, what "fits the chord"
  means, is resolved — see D108.)
- **Folder:** [versions/v2](versions/v2/README.md), consolidated into
  [v2/master-spec.md](versions/v2/master-spec.md). The original highlights proposal is archived at
  [archive/v2/highlights-proposal.md](archive/v2/highlights-proposal.md).

### 2. v3 — Player material and "my instrument"

- **Intent:** the Fledgling Composer's release: grow the player's own ideas.
- **Releases (D211):**
  - **v3.0, storage:** first local persistence; a "my instrument" configuration (input kind,
    range, transposition); review of earlier sessions, with opt-in retention of played notes;
    favorites, marking the phrases the player liked and exporting them (D130); keeping sessions
    (D129). With them, merged from a v3.0.1 (D212): pre-generating phrases at Idle (D206) and the
    stray-note filter (D196).
  - **v3.1:** embellishment flags, with weights as preferences, and presets, built-in and
    player-made (D210).
  - **v3.2:** Jam, MIDI-seeded continuation from a played motif (D209), with the key and mode
    suggestion (a weighted draw when several answers fit, D212), and the rhythm lock with a
    mutation option (O118).
  - **v3.x:** learning from positive signals, tied to recognising played signal patterns (cues,
    D212; mandatory for the endgame); kept for now, likely to be removed or moved later.
  - Dropped (D211): the end-of-measure chord-fit check, review tooling, and the two
    controller-connection ideas.
- **Depends on:** v2's continuation, sessions, review and export; **O10** before planner stages
  couple.
- **Folder:** [versions/v3](versions/v3/README.md).

### 3. v4 — Accompaniment with roles

- **Intent:** move from one line to several voices.
- **Headline scope:** side instruments that highlight, contrast with and respond to the player's
  line; a whole-file seed (MusicXML or MIDI) (proposed placement).
- **Depends on:** v2's backing and audio timing; v3's continuation from outside material.
- **Folder:** [versions/v4](versions/v4/README.md).

### Planned, version not yet assigned — Style packs

- **Status:** planned, not yet assigned to a version (the owner, 2026-10-11, D259). Research only
  so far; no spec, no scope settled. Kept here with its reasoning for future reference.
- **Intent:** widen what a phrase and its accompaniment can sound like by grouping the
  generator's settings and new capabilities into **style packs**, one per dialect (for example
  Folk reel, Bebop, Blues, Baroque, Bossa, JRPG battle), layered style → character identity
  (idiolect) → situation (location, event, status effect). Groundwork for the endgame's
  characters and places.
- **Reasoning:**
  1. **Breadth was frozen, not cut.** The [breadth review](../docs/music/generation-breadth-review.md#verdict-was-breadth-cut)
     found that the v1 scope choices (D11–D15, D20, D28) became permanent by default: v2 and v3
     widened everything around the generator (sessions, MIDI, storage, Jam, presets), not what a
     phrase can contain. Swing, sevenths, chosen progressions, closed endings, other metres,
     harmonic minor and five-note scales were proposed once and never scheduled.
  2. **Most styles live in the backing, the groove and the sound.** The
     [style atlas](../docs/music/styles/README.md#capability-ranking-the-roadmap-hint) describes
     63 styles against 43 capabilities. Accompaniment roles are in the core of 42 styles, so v4's
     voices, drums and timbres unlock the most; without them, each melody-only capability makes at
     most one more style recognisable.
  3. **One generator, packs as data (option B).** The
     [breadth review's recommendation](../docs/music/generation-breadth-review.md#recommendation-inference):
     a pack is declarative data over the one generator. Each missing device is built once as a
     capability, off by default, with its own invariant and cost check; a pack switches
     capabilities on and sets defaults; the replay key carries the pack id and version, frozen
     once published. Separate planner code only where data cannot reach: stored rhythm patterns,
     forms longer than four bars, motif development. A character restricts and weights its pack
     ([identity schema](../docs/music/identity-modelling.md#draft-identity-schema-inference)).
- **Proposed order** (the atlas's [greedy unlock order](../docs/music/styles/README.md#greedy-unlock-order),
  condensed): v4 voices with drums and timbres → rhythm cells and timelines → five-note scales →
  3/4 and 6/8 with triplets → swing → seventh chords with progression templates → motif
  repetition and sequences → drone → parallel harmony → call and response → forms longer than
  one phrase → closed endings. Styles that reach "recognisable": 2 today, 24 after the first five
  steps, 42 after twelve.
- **Proposed tiers** ([atlas](../docs/music/styles/README.md#proposed-tiers)):
  1. **Voices and sound:** accompaniment roles, timbres, drums, drone, parallel harmony. Roles
     and the sound library are already v4; drums as a named v4 item, the drone and parallel
     harmony are new.
  2. **Cheap vocabulary:** five-note scales, progression templates, closed endings, seventh
     chords, swing, rhythm cells.
  3. **Metre and form:** 3/4, 6/8, triplets, odd metres, longer forms, motif development,
     sequences, call and response.
  4. **Colour:** harmonic minor, other scales, borrowed chords, blue notes, extended chords,
     substitutions, ornaments, slides, suspensions.
  5. **Approximations:** microtones, counterpoint, four-part voicing, modulation, polyrhythm and
     the rest; v5+ or the endgame.
- **Decisions it would revisit, per style pack** (each stays the default for existing presets; a
  versioned pack may lift it, [atlas](../docs/music/styles/README.md#conflicts-with-current-decisions)):
  D13 chosen progressions (29 styles), D12 triads only (26), D11 diatonic only (25), D15 4/4 only
  (22), D28 open endings only (19), D20 no swing (17); the voice-leading minimum rules (10); one
  collection for melody and chords (8); the fixed four-bar phrase (3).
- **Depends on:** v3.1's presets shipped (the breadth review says start after v3.1); v4's
  accompaniment roles and sound library.
- **Open:** the atlas's [open questions](../docs/music/styles/README.md#open-questions-for-the-owner)
  (when packs come, closed endings, leaving 4/4, the raised leading tone, blue notes, swing,
  repetition, microtones, cultural framing, JRPG contexts) and the two
  [identity contradictions](../docs/music/README.md#endgame-research-musical-identity-2026-10-11):
  whether location and event rank above or below the character, and whether a character may add
  vocabulary its pack lacks. Not yet in the open-questions register.
- **Research** (branch `v4-accompaniment-research`):
  [style atlas](../docs/music/styles/README.md),
  [breadth review](../docs/music/generation-breadth-review.md),
  [identity modelling](../docs/music/identity-modelling.md),
  [music reference](../docs/music/README.md),
  [sound library survey](../docs/sound-library-survey.md).

### 4. v5+ — Library and microphone

- **Intent:** broaden where seeds and input come from.
- **Headline scope:** a library where files and past sessions are displayed alike, with snippet
  selection as a seed (not a DAW); microphone input "v5 or 8"; a staff-only session view, hiding
  everything but the staff and Stop while a session runs (v5, D133).
- **Depends on:** v3's persistence; v4's file seed; v3's "my instrument" input kind.
- **Folder:** [versions/v5-plus](versions/v5-plus/README.md).

### 5. Endgame — Rhythm RPG

- **Intent:** Infinite Flow as the music factory of a _Theatrhythm_-style game.
- **Headline scope:** the v2 loop with choices, companions and antagonists as system voices;
  characters as restrictive musical presets; fights as exchanges of short phrases; off-phases for
  team building, improvement and quests; status effects that change display and generation.
- **Depends on:** every version above, especially v4's multiple voices and v3/v4 continuation.
- **Direction only:** [vision/endgame.md](vision/endgame.md).

## Engineering carry-overs (not tied to one version)

- **Rewriting the product vision.** The owner accepted the vision
  ([`vision_infinite_flow_first_release`](../docs/vision_infinite_flow_first_release.atom.md))
  for v2.0 as it stands, and plans to sit down later and rewrite it entirely (D198). Not
  scheduled; it blocks nothing.

- **O10, planner authority:** can a later planner stage revise an earlier one without
  recoupling them? See the [register](open-questions.md).
- **Rhythm settings with no legal phrase:** which density, silence and syncopation combinations
  are blocked by the rhythm grammar depends on the selected rhythmic-variety level: six under
  `Strict`, four under `Slightly varied`, none under `Heavily varied`. It is a grammar limit, not
  a musical rule. The ISS-004 feasibility review fixed this per-variety list. See
  [`rule_unsupported_rhythm_settings_block_generation`](../docs/rule_unsupported_rhythm_settings_block_generation.atom.md).
- **Listening-test calibration** continues. See
  [`docs/release/deferred-scope.md`](../docs/release/deferred-scope.md).
- **Browser scope: wider support at v4 or v5 (which one is open).** v1 and v2 run in Chromium
  browsers only (Chrome, Edge), because Web MIDI works reliably only there
  ([v2 master spec §8](versions/v2/master-spec.md#8-midi-input-and-note-acknowledgement)). In
  particular, v2 has no iPad support (D127). The owner places widening support to the three major
  engines (Chromium, Firefox and Safari's WebKit) at v4 or v5; the version is not decided.
  Caveat: supporting Safari does not bring MIDI controllers to the iPad. iPad browsers run on
  WebKit, which has no Web MIDI, so Safari support would give an iPad player the app without a
  controller. A controller becomes usable on an iPad only if Apple ships Web MIDI in WebKit, or
  through the microphone input planned for v5+.

## Candidates (not committed)

The owner's ideas, recorded so they are not lost. None of them is scope for any version.

- **Rhythm ratios and the rhythm editor (v4 since D211; D175).** How likely each note value is,
  from the whole note to the sixteenth note, and a rhythm editor (copy a bar's rhythm, or enter
  one by hand), reached by a new note-density value, Custom. The rhythm lock, recorded with them,
  is v3.2. Recorded in [v4](versions/v4/README.md#placed-here-proposed). Open: O100–O102.
- **Tone.js for the backing (version open; D185).** Using the Tone.js audio library, mainly to add
  more accompaniment voices; v2 synthesizes its backing with plain Web Audio and bundles no audio
  library. An idea for later, not decided; more voices are v4's accompaniment with roles.
- **Presets that carry gimmicks and stored rhythm patterns (later; D217).** The owner expects
  most presets to carry gimmicks and specific rhythm patterns the app does not store today, and
  mentions storing rhythms and "favorites cues"; later features, not v3.
- **Sequence writing with an up-front rhythm grammar (v4, v5 or v6; D210).** Writing whole
  sequences from requirements set before generation, for example "double beat 1 of every third
  measure". Beyond v3's embellishment weights, which stay preferences. Noted in
  [v3](versions/v3/README.md#embellishment-flags).
- **Cross-device review by export, then import (no earlier than v6; D128).** A player exports a
  phone session and reopens it for review on a larger screen. It serves P3. Recorded in
  [v5+](versions/v5-plus/README.md#candidates-not-committed).
