# Infinite Flow Roadmap

Status: draft v1.4 (rewritten 2026-09-25 after the persona and vision session; browser scope
added 2026-09-28, D127; review candidates added 2026-09-28, D128; session-keeping candidates and
export by content added 2026-09-28, D129; favorites moved to v3 2026-09-28, D130)

This is an ordered timeline with no dates. Each version's scope lives in its folder under
[versions/](versions/README.md). The principles every version follows are in the
[far vision](vision/far-vision.md). Work that later versions need built early is tracked in
[prerequisites.md](versions/prerequisites.md), which is being drafted.

The old stages 2 ("Minimal MIDI Integration") and 3 ("MIDI-Seeded Continuation") are
**superseded** by the v2/v3 split below. v2 bundles MIDI acknowledgement with the rolling phrase.
MIDI-seeded continuation moves to v3. The previous roadmap, which `docs/release/` cites by section,
is archived verbatim as [2026-09-25-roadmap-pre-vision.md](archive/2026-09-25-personas-and-vision/roadmap-pre-vision.md).

## Timeline

### 0. v1.0 gate (current)

- **Intent:** close the first release. v1 is implemented; the rc1 commit is `2418069`.
- **Scope:** in this order:
  1. **ISS-003:** transposition becomes open data on the instrument template, and the key is
     chosen in written pitch. The display selector is removed.
  2. **ISS-004:** the rhythm-grammar **feasibility review** goes to the user first, then rhythmic
     variety is implemented and _Mixed_ is retired.

  Both issues go through ux-writer, then implementation. The contract may be amended.

- **Depends on:** nothing new.
- **Folder:** [versions/v1](versions/v1/README.md).

### 1. v2 — Rolling phrase

- **Intent:** real-time reading and playing with mild pressure. This is the Speed Builder's
  release, and it gives the Curious Improviser their real-time goal.
- **Headline scope:**
  - a rolling phrase that continues from its own material;
  - MIDI acknowledgement of expected notes, and a measure-end check against the chord;
  - rudimentary bass and chord backing;
  - sessions with Start and Stop;
  - last-session review with export of the whole session: the generated notes as MusicXML or
    MIDI, the played notes as MIDI, each by its own action (D129, D130); no favorites (v3, D130);
  - adaptive tempo as an opt-in (nice to have).
- **Depends on:** the v1.0 gate (instrument transposition as data); the first audio and timing
  foundation; **O10** once continuation reuses earlier material. (O24, what "fits the chord"
  means, is resolved — see D108.)
- **Folder:** [versions/v2](versions/v2/README.md), consolidated into
  [v2/master-spec.md](versions/v2/master-spec.md). The original highlights proposal is archived at
  [archive/v2/highlights-proposal.md](archive/v2/highlights-proposal.md).

### 2. v3 — Player material and "my instrument"

- **Intent:** the Fledgling Composer's release: grow the player's own ideas.
- **Headline scope:**
  - MIDI-seeded continuation from a played motif;
  - a "my instrument" configuration (input kind, range, transposition);
  - first local persistence;
  - review of earlier sessions, with opt-in retention of played notes;
  - favorites: marking the phrases the player liked and exporting them, moved from v2 and settled
    here (D130).
- **Depends on:** v2's continuation, sessions, review and export; **O10** before planner stages
  couple.
- **Folder:** [versions/v3](versions/v3/README.md).

### 3. v4 — Accompaniment with roles

- **Intent:** move from one line to several voices.
- **Headline scope:** side instruments that highlight, contrast with and respond to the player's
  line; a whole-file seed (MusicXML or MIDI) (proposed placement).
- **Depends on:** v2's backing and audio timing; v3's continuation from outside material.
- **Folder:** [versions/v4](versions/v4/README.md).

### 4. v5+ — Library and microphone

- **Intent:** broaden where seeds and input come from.
- **Headline scope:** a library where files and past sessions are displayed alike, with snippet
  selection as a seed (not a DAW); microphone input "v5 or 8".
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

- **Richer review tooling, tablet and desktop only (version open; D128).** Selecting a passage to
  replay, and showing what was expected against what was played on the same measure. The phone's
  Review stays the plain baseline (ux D64). The comparison view is bounded by the permanent "no
  wrong-note signal, grading or scoring" constraint. Recorded in
  [v3](versions/v3/README.md#later-review-tooling-candidates-not-committed), next to the review of
  earlier sessions; that is not a v3 placement.
- **Keeping sessions (version open; D129).** Storing more than one session only when the player
  asks for it (for example by pinning it), suitable access to older sessions, and an optional
  comment on a session. v2 stays ephemeral (ux D67). Recorded in
  [v3](versions/v3/README.md#keeping-sessions-candidates-not-committed), where they meet the
  planned local persistence and review of earlier sessions; that is not a v3 placement.
- **Cross-device review by export, then import (no earlier than v6; D128).** A player exports a
  phone session and reopens it for review on a larger screen. It serves P3. Recorded in
  [v5+](versions/v5-plus/README.md#candidates-not-committed).
