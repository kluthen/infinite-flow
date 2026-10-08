# Infinite Flow Specification Index

Status: draft v0.47

## Status Snapshot

- **v1 is released as `v1.0`** (2026-09-26). Its working record, the v1.0 gate's included, is in
  [archive/v1/](archive/v1/README.md).
- **v2 is released as v2.0, version 2.0.0** (2026-10-07, D208); the tag `v2.0.0` waits for the
  owner's approval. The release gate passed: 57 rows in the
  [release notes](../docs/release/v2.0-release-notes.md), 0 not met. Four hand checks follow the
  tag as v2.0.x checks: the USB keyboard's two, MuseScore and a MIDI tool, and a DAW. The
  [v2 master spec](versions/v2/master-spec.md) is the contract for the running code; the
  milestone's working record is in [archive/v2/](archive/v2/README.md).
- Infinite Flow is a client-side web practice partner for a monophonic player. v2 rolls
  four-measure phrases one after another over a backing, a click and a count-in, acknowledges the
  expected notes a MIDI controller plays, and ends each session with a review of the last session
  and its export. Nothing is saved between page loads.
- **Guiding principle:** Infinite Flow acknowledges and encourages; it never penalizes, grades,
  ranks or scores the player. Anything that adapts to how you play is opt-in and visible. See the
  [far vision](vision/far-vision.md).
- **Personas:** P1, the Curious Improviser (primary); P2, the Speed Builder; P3, the Fledgling
  Composer. A shared [context of use](personas.md#context-of-use) covers all three: a laptop or
  desktop in Chrome or Edge first, at music-stand distance, no click while playing.
- **Next: v3**, player material and "my instrument", in direction, not yet specced; its
  release plan is settled (D211, D212, [v3](versions/v3/README.md#releases-d211)):
  - **v3.0, storage:** local persistence, "my instrument", review of earlier sessions, favorites,
    keeping sessions, plus pre-generating phrases at Idle and the stray-note filter;
  - **v3.1:** embellishment flags and presets (the embellishment catalogue is not started);
  - **v3.2:** Jam, the key and mode suggestion (a weighted draw when several answers fit), the
    rhythm lock and its mutation option;
  - **v3.x:** learning from positive signals, with recognising played signals (D213, D214);
    likely to move or go;
  - v3.0's [master spec](versions/v3/master-spec.md) is consolidated (D217) and with
    `documentalist` and `ux-writer`; a build plan follows the design. Drafts, approved (D216): [persistence](versions/v3/persistence.md),
    [kept sessions and favorites](versions/v3/kept-sessions.md), [my instrument](versions/v3/my-instrument.md),
    [pre-generation](versions/v3/pre-generation.md), [stray notes](versions/v3/stray-notes.md);
  - research done (D212): embellishment and mutation catalogues, key and mode estimation,
    played-pattern recognition (in `docs/music/`); storage and Jam grounding (in
    `specs/versions/v3/`);
  - rhythm ratios and the editor moved to v4; the chord-fit check, review tooling and the two
    controller-connection ideas dropped.
- **Open:** 7 questions, none blocking: O48 and O49 (later and governance), O100–O102 (v4
  rhythm), O115 and O116 (v3.x learning). v3.1 and v3.2 drafts approved by the owner (D233, D234),
  after D228–D232 on presets and the rhythm lock; consolidated as master spec Parts B and C and
  approved (D239), refined by D240–D245 and D247–D249; the contract wording they change confirmed by the owner
  (D246, `docs/release/v3.1-v3.2-intent-change-set.md`).
  See the [register](open-questions.md).
- The snapshot this index kept through v2's design and build is archived verbatim at
  [archive/v2/readme-status-snapshot.md](archive/v2/readme-status-snapshot.md).

## Documents

### Direction

- [Roadmap](roadmap.md): the ordered timeline from the v1.0 gate to the endgame, with no dates,
  plus uncommitted candidates.
- [Versions](versions/README.md): one folder per version (v1, v2, v3, v4, v5+) holding its scope,
  dependencies and version-specific open questions. Also holds the cross-version
  [prerequisites](versions/prerequisites.md). v3's build plans: [v3.0](versions/v3/build-plan.md) (approved) and
  [v3.1](versions/v3/build-plan-v3.1.md) (draft v1, not approved) and
  [v3.2](versions/v3/build-plan-v3.2.md) (draft v1, not approved).
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
- [Decisions](decisions.md): the live append-only log, numbered from D208.

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
