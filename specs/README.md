# Infinite Flow Specification Index

Status: draft v0.85

## Status Snapshot

- **v3.1 is released as version 3.1.0** (2026-10-21, D397): the tag `v3.1.0` is on `main` at
  55364e7. Its release gate, build plan
  [chunk 21](versions/v3/build-plan-v3.1.md#chunk-21--v31-release-gate), passed its automated part,
  with the evidence in the [release notes](../docs/release/v3.1-release-notes.md). Master spec
  [Part B](versions/v3/master-spec.md#part-b--v31), embellishment figures and presets, is with
  Part A the contract for the running code; the milestone's working record is in
  [archive/v3/](archive/v3/README.md) (D398). Its hand checks after the tag are closed (D399): H4
  passed on the owner's word, H3 (Edge) and H5 (v3.0 data carried over) waived, since Chrome is
  the one supported browser and v3.0 had no live users; the 13 promotions that waited on them
  are applied (5618971, CONTRACT 7.2.0) ([v3.1.x notes](versions/v3/README.md#v31x-notes-after-the-tag)).
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
- **Guiding principle:** Infinite Flow acknowledges and encourages; it never penalizes, grades,
  ranks or scores the player. Anything that adapts to how you play is opt-in and visible. See the
  [far vision](vision/far-vision.md).
- **Personas:** P1, the Curious Improviser (primary); P2, the Speed Builder; P3, the Fledgling
  Composer. A shared [context of use](personas.md#context-of-use) covers all three: a laptop or
  desktop in Chrome first (the one supported browser, D399), at music-stand distance, no click
  while playing.
- **Next: the rest of v3** ([v3](versions/v3/README.md#releases-d211)):
  - **v3.2:** Jam, the key and mode suggestion, the rhythm lock and its mutation option. Master
    spec [Part C](versions/v3/master-spec.md#part-c--v32), approved (D239), **re-scoped**: Jam
    becomes its own mode, entered by a button at Idle, needing a MIDI controller, with its own
    settings, loaded on demand, its generator steering at the edges, its tempo set before the
    doodle in 60–180 BPM; v3.2 splits into session-mode work, then Jam (D400–D408;
    [draft](versions/v3/jam-mode.md), settled, four answers provisional until the owner's checks),
    consolidated as **Part C v1.1, awaiting the owner's approval** (D409), with seven choices
    proposed for the owner (O260–O266) and one sign-off on its re-scoped contract wording
    (CONTRACT 7.2.0 to 8.0.0). Build plan [v3.2](versions/v3/build-plan-v3.2.md), v3, stale
    (D405), rewritten as v4 after the design's approval; its design not approved (D353 approved
    v3.1's only).
  - **v3.3:** richer chords, opt-in: one Seventh chords level, Off by default, diatonic sevenths
    only. Master spec [Part D](versions/v3/master-spec.md#part-d--v33), awaiting owner approval
    (D264–D275); build plan [v3.3](versions/v3/build-plan-v3.3.md), v3, not approved, after
    v3.2's release (D276–D288).
  - **v3.4:** a structural review before v4, with no player-facing change: soundness for
    expansion, the entry budget, refactors worth taking, a split into libraries. The last v3
    milestone, after v3.3 (D389); [scoping draft](versions/v3/structural-review.md), the analysis
    not started. v3.4 also builds a **lexicon page**, its one player-facing item (D393, amending
    D389): every lexicon word, A–Z and by search, read from `docs/music/lexicon.md` alone (D394);
    [scoping draft](versions/v3/lexicon-page.md), a separate draft because it is built, not
    analysed. Its second step, the lexicon as an API, is planned for v4 or v5 (D395,
    [roadmap](roadmap.md#planned-v4-or-v5--the-lexicon-api)).
  - **v3.x:** learning from positive signals, with recognising played signals (D213, D214);
    likely to move or go. Rhythm ratios and the rhythm editor are v4; the chord-fit check, review
    tooling and the two controller-connection ideas are dropped (D211).
- **Open:** 25 questions: O48 and O49 (later and governance), O100–O102 (v4 rhythm), O115 and
  O116 (v3.x learning), O176 (style packs and the chord level), O180 (octave signs, later), O183
  (pre-generation's cancellation cost), O190 (a newer version's database whose read-only
  reopening fails), O230 (a stale replay-key wording in a STABLE atom), O234–O238 (v3.4's
  structural review) and O239–O246 (v3.4's lexicon page). See the
  [register](open-questions.md).
- The snapshots this index kept through v2's design and build, through v3.0's and through
  v3.1's are archived verbatim at
  [archive/v2/readme-status-snapshot.md](archive/v2/readme-status-snapshot.md),
  [archive/v3/readme-status-snapshot.md](archive/v3/readme-status-snapshot.md) and
  [archive/v3/readme-status-snapshot-v3.1.md](archive/v3/readme-status-snapshot-v3.1.md).

## Documents

### Direction

- [Roadmap](roadmap.md): the ordered timeline from the v1.0 gate to the endgame, with no dates,
  plus uncommitted candidates.
- [Versions](versions/README.md): one folder per version (v1, v2, v3, v4, v5+) holding its scope,
  dependencies and version-specific open questions. Also holds the cross-version
  [prerequisites](versions/prerequisites.md). v3's build plans: [v3.0](versions/v3/build-plan.md) (complete; chunk 26 is the release gate's
  record), [v3.1](versions/v3/build-plan-v3.1.md) (v23, complete; chunk 21 is the release gate's
  record, and its hand checks H3–H5 follow the tag; on the build-plan model with the shared
  [v3 build workflow](versions/v3/build-workflow.md), D349; its [wave log](versions/v3/wave-log-v3.1.md)), [v3.2](versions/v3/build-plan-v3.2.md) (v3, on the build-plan model, D350; not approved)
  and [v3.3](versions/v3/build-plan-v3.3.md) (v3, on the build-plan model, D351; not approved;
  depends on owner approval of Part D). Every build plan runs wave by
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
