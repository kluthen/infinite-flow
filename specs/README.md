# Infinite Flow Specification Index

Status: draft v0.9

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
- **Controller connection and session start (2026-09-27, D111–D118)**, from the owner's answers to
  ux Q23/Q24 on `ux-critic`'s findings. Silence and losing the controller are different events.
  A controller connects only between sessions. A controller lost mid-session is shown clearly and
  may be reconnected; after 30 s without a reconnection the session ends (**D114** replaces the
  old "becomes a no-controller session" rule). A MIDI note starts a session only if it is phrase
  1's first note (**D115** overrides the old "any first note" count-in rule). Nothing played while
  connecting or during the transposition check can start a session. Blind and screen-reader users
  are not a target (D117). The same day the owner settled the six sub-points this opened
  (O78–O83, **D119–D124**): the 30 s count from the moment the controller is unplugged, and the
  silence timer is suspended meanwhile (D119); the phrase keeps playing at tempo while the player
  is silent or unplugged, and notes after a reconnection are handled as usual (D120); the starting
  note only starts the count-in, which is shown as well as heard, with phrase 1's first measure
  visible (D121); "connected" = permission, one input selected, port open (D122); only the same
  device reconnects, automatically (D123); the starting note must be that exact note, octave
  included, and a neutral line always names it (D124). **D125** (owner, ux Q26) extends D123 to
  between sessions: a controller unplugged at Idle or in the Review keeps its selection and the
  same device reattaches by itself, with no new transposition check; while away it counts as no
  controller, not an error. **D126** (owner, O85 / ux Q29) settles starting while the selected
  controller is away: a Start click then begins a controller-less session, the device is not
  reattached during it, and it reattaches by itself once the session ends; a controller lost
  mid-session and still away at the end keeps its selection into the Review. The selection lives
  in memory only and does not survive a page reload (v2 saves nothing to browser storage). The
  master spec is at v1.5. One gap is open (**O84**: starting a session from the Review).
- **Open:** 9 questions remain live: O84 above, plus the 8 older ones this bullet goes
  on to describe. None is flagged ★. The 5 most-blocking ones
  settled first (**D104** O75 v2.0 cut line is the full loop; **D105** O34 continuation boundary;
  **D76** O54 audio unlock; **D77** O55 controller check ships; **D78** O41 acknowledgement
  window), then two large 2026-09-27 batches closed nearly everything else (**D80–D88**:
  leap-across-join, tense-note resolution at a join, register window, planner authority,
  tempo-as-input, count-in, backing, click, timeout arming, trailing silence, MIDI activity,
  browser scope, history storage, export scope/extras, favorites, discard confirmation, session
  length; **D92–D102**: the live view highlights a matched expected note, never the played
  pitch; the review always shows generated notes with played notes optional on a toggle;
  look-ahead/failure ladder, event identity and the v1-workspace-in-v2 shape all confirmed;
  the rolling display ships two candidate modes behind a toggle rather than picking one; the
  harmonic horizon stays phrase-by-phrase for v2.0, with a v2.2 multi-phrase arc noted as
  non-urgent; latency calibration moves to v3, not v2.1; adaptive tempo (v2.2) is a flat +5 BPM
  every 2 phrases, unconditional, resetting to the starting tempo on Stop/Start). Three of that
  series are **overrides** of the proposed default rather than confirmations (**D89** hidden tab
  now ends the session immediately; **D90** v2.0 expects a single MIDI input, no merging;
  **D101**, which replaces the proposed performance-linked adaptive-tempo metric with an
  unconditional flat schedule, decoupling it from O24 entirely), and one is a **substantive
  modification** (**D91**: the settings UI is locked for the whole session, not just the
  instrument selector). **O24 is settled (D108):** the chord-fit check is kept, judged per
  measure by pitch class, fires only when the player deviates from the written phrase (accepting
  that "blue"/passing chromatic notes get no signal), and ships in its own new release, **v2.3**.
  **O77's release is settled at v2.1 (D107)**; it is otherwise narrowed by **D103**: every
  setting except instrument selection and tempo is eligible, each mutation shifts one by at most
  one grade in either direction, and landing on an unsupported combination re-mutates until a
  supported one is found — but the exact cadence and the flag's default on/off state are still
  open. The rest of what's open is verification/research work, not a design decision: O47,
  O48, O49 (later/governance, outside v2's own scope), and O57, O68, O69, O71 (listening test,
  prototype, measurement, and Bluetooth-MIDI research). **D79** notes that v3's "my instrument"
  should inherit the controller check's detected offset. **The v2 spec (v2.0–v2.3) is now
  consolidated** into [versions/v2/master-spec.md](versions/v2/master-spec.md); the draft topic
  documents that fed it, including the original questions-for-user, are archived at
  [archive/v2/](archive/v2/README.md). See the live [register](open-questions.md) for what
  remains open.

## Documents

### Direction

- [Roadmap](roadmap.md): the ordered timeline from the v1.0 gate to the endgame, with no dates.
- [Versions](versions/README.md): one folder per version (v1, v2, v3, v4, v5+) holding its scope,
  dependencies and version-specific open questions. Also holds the cross-version
  [prerequisites](versions/prerequisites.md).
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
- [Decisions](decisions.md): the live append-only log, numbered from D109.

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
  - [v2 archive](archive/v2/README.md): the v2.0–v2.3 spec-consolidation working record —
    decisions D72–D108 and the eight draft topic documents, superseded by
    [versions/v2/master-spec.md](versions/v2/master-spec.md).
