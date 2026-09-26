# Infinite Flow Specification Index

Status: draft v0.5

## Status Snapshot

- **v1 (First Release) is released as `v1.0`** (2026-09-26; `v1.0-rc1` = `2418069` is now history).
  The v1.0 gate — "no open issue in `issues/`" — is closed: ISS-005 (capability flags, D73),
  ISS-003 (written-pitch key, transposition as instrument data) and ISS-004 (rhythmic variety,
  D74) are all resolved and merged. The master spec reflects them at draft v2.1. The gate's
  working record is archived: [gate-execution-report.md](archive/v1/gate-execution-report.md) and
  [iss004-feasibility-review.md](archive/v1/iss004-feasibility-review.md).
- Infinite Flow is a client-side web practice partner for a monophonic player. v1 generates one
  coherent four-measure 4/4 phrase with harmony, in staff notation. The player regenerates it
  explicitly. It has no playback, MIDI or persistence.
- **Guiding principle:** Infinite Flow acknowledges and encourages; it never penalizes, grades,
  ranks or scores the player. Anything that adapts to how you play is opt-in and visible. See the
  [far vision](vision/far-vision.md).
- **Personas:** P1, the Curious Improviser (primary); P2, the Speed Builder; P3, the Fledgling
  Composer.
- **Timeline** ([roadmap](roadmap.md)):
  - **v2:** a rolling phrase, MIDI acknowledgement, backing, sessions, and last-session review
    with export.
  - **v3:** MIDI-seeded continuation, "my instrument" and local persistence.
  - **v4:** accompaniment with roles.
  - **v5+:** a library and microphone input.
  - **Endgame:** a rhythm RPG.
- **Open:** O10 (planner authority) and O24 (what "fits the chord" means). No other question is
  open.

## Documents

### Direction

- [Roadmap](roadmap.md): the ordered timeline from the v1.0 gate to the endgame, with no dates.
- [Versions](versions/README.md): one folder per version (v1, v2, v3, v4, v5+) holding its scope,
  dependencies and version-specific open questions. Also holds the cross-version
  [prerequisites](versions/prerequisites.md).
- [Personas](personas/personas.md) (draft): who the product serves.
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

- [Open questions](open-questions.md): only truly open questions (O10, O24).
- [Decisions](decisions.md): the live append-only log, numbered from D72.

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
  - [Decisions D47–D71](archive/2026-09-25-decisions-D47-D71.md): the 2026-09-25 persona and
    vision session.
  - [Pre-vision roadmap](archive/2026-09-25-roadmap-pre-vision.md): the stage roadmap cited by
    `docs/release/`.
