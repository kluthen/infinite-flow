# Infinite Flow Specification Index

Status: draft v0.101

## Status Snapshot

- **v3.4 is released as version 3.4.0** (2026-11-24, D579): tagged `v3.4.0` on `main` at
  17e631e4, by the owner's go to tag before his hand check H1 (D578). Its release gate passed,
  with the evidence in the [release notes](../docs/release/v3.4-release-notes.md); CONTRACT is at
  19.1.0. Master spec [Part E](versions/v3/master-spec.md#part-e--v34), the lexicon page and the
  lexicon API, is with Parts A to D the contract for the running code. The structural review
  delivered its [report](versions/v3/structural-review-report.md), ruled by the wave driver under
  the owner's delegation; the refactors it took (the library line enforced, `session/` one-way,
  the Jam host out of the shell, the test files' atom-spread limit) were built as waves 2 and 3 of
  the [v3.4 build plan](versions/v3/build-plan-v3.4.md); the start-up budget stays at 400 KiB,
  raised only by the owner; the rest is deferred or dropped
  ([report §6](versions/v3/structural-review-report.md#6-ranked-recommendations)). The
  milestone's working record is in [archive/v3/](archive/v3/README.md#v34-release-archived-2026-11-24)
  (D579). Still to come after the tag, as
  [v3.4.x follow-ups](versions/v3/README.md#v34x-notes-after-the-tag): H1 (the owner sees the
  page), then the lexicon four's STABLE promotion proposed again (D578), and the VPS deploy, the
  owner's.
- **v3.3 is released as version 3.3.0** (2026-11-18, D544): tagged `v3.3.0` on `main` at
  b2a0e3fa, released before the owner's hand and listening checks by his ruling (D541). Its
  release gate, build plan [chunk 22](versions/v3/build-plan-v3.3.md#chunk-22--v33-release-gate),
  passed its machine half, with the evidence in the
  [release notes](../docs/release/v3.3-release-notes.md); the release sync left CONTRACT at
  19.0.0. Master spec [Part D](versions/v3/master-spec.md#part-d--v33), richer chords (one
  Seventh chords level, Off by default, diatonic sevenths only; Jam mode has its own), is with
  Parts A, B and C the contract for the running code. The owner skipped L1, so v3.3 ships the
  triad reading for endings and the join (D540); endings on the seventh are a
  [roadmap candidate](roadmap.md#candidates-not-committed). The milestone's working record is in
  [archive/v3/](archive/v3/README.md#v33-release-archived-2026-11-22) (D544). Still to come after
  the tag, as [v3.3.x follow-ups](versions/v3/README.md#v33x-notes-after-the-tag): L2 (v3.3 H2,
  not yet written in `HARDWARE-CHECKLIST.md`, and any share tuning as a 3.3.x patch), U1b, H3–H6,
  M3's deciding runs and the figure restated from them (D537), and ISS-020.
- **v3.2 is released as version 3.2.0** (2026-11-09, D523): tagged `v3.2.0` on `main` at
  f93e552d, released as built by the owner's ruling (D521). Its release gate, build plan
  [chunk 27](versions/v3/build-plan-v3.2.md#chunk-27--v32-release-gate), passed its machine half,
  with the evidence in the [release notes](../docs/release/v3.2-release-notes.md); the release sync
  left CONTRACT at 14.1.0. Master spec [Part C](versions/v3/master-spec.md#part-c--v32), Jam, the
  key and mode suggestion, the rhythm lock and the guide playback, is with Parts A and B the
  contract for the running code; the milestone's working record is in
  [archive/v3/](archive/v3/README.md#v32-release-archived-2026-11-09) (D524). Still to come after
  the tag, as [v3.2.x follow-ups](versions/v3/README.md#v32x-notes-after-the-tag): the owner's hand
  and listening checks (L1, L2, L3, H3, H7, H8, HG), the Travel Sax recordings (DR) and O267, with
  the atoms waiting on them. They confirm or send back D406's provisional answers
  ([what confirms them](versions/v3/build-plan-v3.2.md#what-confirms-d406s-provisional-answers))
  and tune the suggestion's weights and cues; a finding becomes a later 3.2.x fix, decided then.
- **v3.1 is released as version 3.1.0** (2026-10-21, D397): the tag `v3.1.0` is on `main` at
  55364e7, with the evidence in the [release notes](../docs/release/v3.1-release-notes.md). Master
  spec [Part B](versions/v3/master-spec.md#part-b--v31), embellishment figures and presets, states
  it; its working record is in [archive/v3/](archive/v3/README.md) (D398, D524). Its hand checks
  after the tag are closed (D399): H4 passed, H3 and H5 waived, since Chrome is the one supported
  browser and v3.0 had no live users
  ([v3.1.x notes](versions/v3/README.md#v31x-notes-after-the-tag)).
- **v3.0 is released as version 3.0.0** (2026-10-16, D348), tagged `v3.0.0` at e288d98 and
  deployed. Master spec [Part A](versions/v3/master-spec.md#part-a--v30) states it. Still to come
  as v3.0.x notes: hand check H8, the played-notes-export half of H5 and the later promotion of
  17 REVIEW atoms; H7 is for information only
  ([v3.0.x notes](versions/v3/README.md#v30x-notes-after-the-tag)).
- **v2 is released as version 2.0.0**, tagged `v2.0.0` at f6bcefe and deployed on 2026-10-07
  (D208, D209). Four hand checks follow its tag as v2.0.x checks: the USB keyboard's two,
  MuseScore and a MIDI tool, and a DAW. The [v2 master spec](versions/v2/master-spec.md) states
  what v2 built; its working record is in [archive/v2/](archive/v2/README.md).
- **v1 is released as `v1.0`** (2026-09-26). Its working record, the v1.0 gate's included, is in
  [archive/v1/](archive/v1/README.md).
- Infinite Flow is a client-side web practice partner for a monophonic player. It rolls
  four-measure phrases one after another over a backing, a click and a count-in, acknowledges the
  expected notes a MIDI controller plays, and ends each session with a review and its export.
  Since v3.0 it keeps the player's settings, "my instrument", kept sessions with their favorites
  and comments, and, only after an opt-in, played notes on the player's device; nothing is sent.
  Since v3.1 the player sets how often each of seven embellishment figures appears, and chooses
  among eight built-in presets or saves their own.
  Since v3.2 a Jam mode grows phrases from a short motif, the doodle, that the player plays on a
  MIDI controller, and suggests a key and mode for it; a rhythm lock keeps the rhythm while the
  pitches change, with optional one-phrase rhythm changes; and a melody guide and a rhythm guide
  can play beside the backing, off by default.
  Since v3.3 the player may let seventh chords into the harmony, through one Seventh chords level
  (Off, Sometimes, Often, Always), Off by default, with its own level in Jam mode.
  Since v3.4 a lexicon page lists every word of the music lexicon, A to Z and by search, read from
  the lexicon file alone, with the lexicon as a typed read interface beside it.
- **Guiding principle:** Infinite Flow acknowledges and encourages; it never penalizes, grades,
  ranks or scores the player. Anything that adapts to how you play is opt-in and visible. See the
  [far vision](vision/far-vision.md).
- **Personas:** P1, the Curious Improviser (primary); P2, the Speed Builder; P3, the Fledgling
  Composer. A shared [context of use](personas.md#context-of-use) covers all three: a laptop or
  desktop in Chrome first (the one supported browser, D399), at music-stand distance, no click
  while playing.
- **Now: v4.0's spec session** ([v4](versions/v4/README.md), opened 2026-11-24): Tone.js and
  accompaniment with roles, the other v4 items moved to v5 (D553); most probably this app's last
  update (D552, a direction; O314). The player plays the lead only (D580); today the other sounds
  have only a switch and a volume (D581). [Prerequisites](versions/prerequisites.md) revised
  (D583): K, the multi-voice representation, is the urgent foundation, proposed as parts beside
  the monophonic lead from one seeded arranger. Three drafts:
  [accompaniment roles](versions/v4/accompaniment-roles.md), [arranger](versions/v4/arranger.md),
  [sound library](versions/v4/sound-library.md). Waiting on the owner: O317–O321.
  - **The owner's direction** (2026-11-22): the endgame's game is a separate app, with a
    three-way split (a library, this app, the game; D551); its form, folders with enforced
    boundaries in one package now and a new repository for the library and the game at game
    start ([report §5](versions/v3/structural-review-report.md#5-q4-the-split)); microphone input
    is out (D554); v5+ will probably move to the game's app (O314); a lexicon-only backend in Go
    some day (D561, O316).
  - **v3.x:** learning from positive signals, with recognising played signals (D213, D214);
    likely to move or go. Rhythm ratios and the rhythm editor are v5 (D553); the chord-fit check,
    review tooling and the two controller-connection ideas are dropped (D211).
- **Open:** 23 questions: O317–O322 (v4.0: roles, choosing them, drums, display, responding, the
  sound-library spike), O48 and O49 (later and governance), O100–O102 (v5 rhythm), O115 and
  O116 (v3.x learning), O176 (style packs and the chord level), O180 (octave signs, later), O183
  (pre-generation's cancellation cost), O190 (a newer version's database whose read-only
  reopening fails), O313, O314 and O316 (the
  personas once the game is separate; what the v4.0 horizon leaves to settle; the lexicon backend), O267 (a doodle note
  played before the
  doodle's first barline, v3.2 wave 6), O269 (a legato doodle read as Heavily varied, at v3.2
  H5) and O271 (a note start off the doodle's grid, at v3.2 H4); the last three after the `3.2.0`
  tag (D521). No v3.3 or v3.4 question is open. See the [register](open-questions.md).
- The snapshots this index kept through v2's design and build, through v3.0's, v3.1's, v3.2's,
  v3.3's and v3.4's are archived verbatim at
  [archive/v2/readme-status-snapshot.md](archive/v2/readme-status-snapshot.md),
  [archive/v3/readme-status-snapshot.md](archive/v3/readme-status-snapshot.md),
  [archive/v3/readme-status-snapshot-v3.1.md](archive/v3/readme-status-snapshot-v3.1.md),
  [archive/v3/readme-status-snapshot-v3.2.md](archive/v3/readme-status-snapshot-v3.2.md),
  [archive/v3/readme-status-snapshot-v3.3.md](archive/v3/readme-status-snapshot-v3.3.md) and
  [archive/v3/readme-status-snapshot-v3.4.md](archive/v3/readme-status-snapshot-v3.4.md).

## Documents

### Direction

- [Roadmap](roadmap.md): the ordered timeline from the v1.0 gate to the endgame, with no dates,
  plus uncommitted candidates.
- [Versions](versions/README.md): one folder per version (v1, v2, v3, v4, v5+) holding its scope,
  dependencies and version-specific open questions. Also holds the cross-version
  [prerequisites](versions/prerequisites.md). v3's build plans: [v3.0](versions/v3/build-plan.md) (complete; chunk 26 is the release gate's
  record), [v3.1](versions/v3/build-plan-v3.1.md) (v23, complete; chunk 21 is the release gate's
  record, and its hand checks after the tag are closed, D399; on the build-plan model with the shared
  [v3 build workflow](versions/v3/build-workflow.md), D349; its [wave log](versions/v3/wave-log-v3.1.md)),
  [v3.2](versions/v3/build-plan-v3.2.md) (v43, complete; chunk 27 is the release gate's record,
  and its gates L1, L2, L3 and DR, hand checks and follow-ups after the tag are live, D521; approved
  as v5, D416, D417, its revisions listed in its header; its [wave log](versions/v3/wave-log-v3.2.md))
  and [v3.3](versions/v3/build-plan-v3.3.md) (v25, complete; chunk 22 is the release gate's
  record, and its hand checks and follow-ups after the tag are live, D541, D544; approved with
  Part D, D520; its [wave log](versions/v3/wave-log-v3.3.md)), then
  [v3.4](versions/v3/build-plan-v3.4.md) (v5.5, complete; its release gate's record, and its gate
  H1 after the tag is live, D578, D579; its lexicon wave approved by the wave driver, D565, its
  refactor waves from the structural review's report, D569–D575; its
  [wave log](versions/v3/wave-log-v3.4.md)). Every build plan runs wave by
  wave (D252): one intent preflight and one full wave gate per wave; a chunk checks only its own
  change.
- [Personas](personas.md) (draft): who the product serves.
- [Far vision](vision/far-vision.md) (draft): the long-term direction and the guiding principles.
  The [endgame](vision/endgame.md) describes the rhythm RPG horizon.
- [Product foundation](product-foundation.md): the v1-era product intent. Where it conflicts with
  the documents above, they win. It will be revised when the vision is consolidated.

### Engineering

- [Generator architecture](generator-architecture.md): decoupling rules and seams for evolving
  musical generators.
- [Generator contract](generator-contract.md): the request, result and event boundary.
- [Features](features/): feature notes. For now this holds the
  [v1 feature note](features/v1-first-release.md).

### Tracking

- [Open questions](open-questions.md): only truly open questions.
- [Decisions](decisions.md): the live append-only log; earlier ranges are archived, and its
  header names them.

### v1 reference (kept in place because other files link to them)

- [First-release master spec](first-release-master-spec.md): what v1 was built against.
- [First-release plan](first_release_plan.md): v1 implementation steps.
- [Generative process](generative-process.md): the generation-process reference.
- Music reference: [`docs/music/`](../docs/music/README.md).

### Archive

- [Archive index](archive/README.md): archived records (kept verbatim), and where each archived
  decision now lives as settled fact.
  - [v1 archive](archive/v1/README.md): the first-release working record, including decisions
    D1–D46 and the closed v1.0 gate's working documents (the gate execution report and the
    ISS-004 feasibility review).
  - [2026-09-25 persona and vision session](archive/2026-09-25-personas-and-vision/README.md):
    decisions D47–D71 and the pre-vision stage roadmap cited by `docs/release/`.
  - [v2 archive](archive/v2/README.md): the v2 working record — the spec-consolidation drafts
    and decisions D72–D108 (2026-09-27), then, at the v2.0 release (2026-10-07), decisions
    D109–D207, the register's notes on closed questions and the former status snapshots. The
    [v2 master spec](versions/v2/master-spec.md) and the [build plan](versions/v2/build-plan.md)
    stay in place.
  - [v3 archive](archive/v3/README.md): the v3.0 working record, archived at the v3.0 release
    (2026-10-16): decisions D208–D227, D252–D258 and D290–D343, the register's notes on closed
    v3.0 questions, the former status snapshot, the five v3.0 drafts and the storage grounding.
    The [v3 master spec](versions/v3/master-spec.md), the [v3.0 build plan](versions/v3/build-plan.md)
    and the [v3 README](versions/v3/README.md) stay in place.
    At the v3.1 release (2026-10-21, D398) it also took decisions D228–D231, D353–D388 and
    D390–D391, the register's notes on O231–O233, the two v3.1 drafts and the former status
    snapshots; the v3.1 build plan and its wave log stay in place.
    At the v3.2 release (2026-11-09, D524) it also took decisions D232–D251, D392, D396–D405 and
    D407–D509, the register's notes on the questions closed during v3.2, the three v3.2 drafts,
    the Jam grounding and the former status snapshots; master spec Part C, the v3.2 build plan,
    its wave log and the [Jam mode](versions/v3/jam-mode.md) draft stay in place.
    At the v3.3 release (3.3.0 on 2026-11-18, archived 2026-11-22, D544) it also took decisions D261–D288, D349–D352, D511–D520
    and D524–D536, the register's notes on the questions closed during v3.3 and the former status
    snapshots; master spec Part D, the v3.3 build plan and its wave log stay in place.
    At the v3.4 release (3.4.0 on 2026-11-24, D579) it also took decisions D389, D393–D395 and
    D544–D574, the register's notes on the questions closed during v3.4 and the former status
    snapshots; master spec Part E, the v3.4 build plan, its wave log, the two v3.4 scoping drafts
    and the structural review's report and evidence stay in place.
