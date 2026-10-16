# Infinite Flow Specification Index

Status: draft v0.71

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
  - **v3.3:** richer chords (seventh chords first), opt-in (default stays triads), with flags in
    the app; research on chords comes before any design (D261, 2026-10-12; direction only), as a
    separate docs-only item running on branch `v3.3-chord-research` (D262); the vision's 0.9
    wording is confirmed (D263). **v3.3 master spec: [Part D](versions/v3/master-spec.md#part-d--v33),
    awaiting owner approval** (D264–D275, from the
    [chord research](../docs/music/chord-research.md)): one Seventh chords level, Off by default,
    diatonic sevenths only; three STABLE wording changes wait for the owner (§D12). **Build plan:
    [v3.3](versions/v3/build-plan-v3.3.md), draft v2, not approved; depends on owner approval of
    Part D** (D276–D288): 23 chunks in 9 waves, after v3.2's release;
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
- **v3.0 build, wave 1** (2026-10-09): after its intent preflight the owner ruled that my
  instrument's transposition is entered as octaves and signed semitones, its interval name
  derived and shown (D253); that my instrument has the fixed id `my-instrument`, apart from its
  display name (D254); that a session-wide record keeps the session's own facts, its session seed
  among them (D255); and confirmed the Part D wording of `rule_ephemeral_session_state` (D256).
  The owner then answered the two points those rulings left open: the transposition's sign is the
  direction of the whole transposition, octaves included, entered with one stepper counting
  semitones across octaves (D257); the session-wide record holds what master spec §5.2 lists and
  nothing derivable from the session seed, any further fact replay needs going to the owner from
  chunk 9's architecture capture (D258). Written into master spec Part A v1.6 and build plan v4. Wave-1 gate wording fixes
  (2026-10-12, no decision, no behaviour change): master spec Part A v1.7 (§7.1) and build plan
  v5 (chunk 23).
- **v3.0 build, wave 2** (2026-10-12): after its intent preflight the owner ruled that a
  background pre-generation attempt can be cancelled by any player request at Idle, a MINOR
  contract bump (D290, unblocks chunk 24); that a written key with two spellings takes the one
  with fewer sharps or flats, sharps on a tie, as the code does, the transposition's interval name
  still derived and shown but spelling nothing (D291); and that the staff's shared height follows
  my instrument's written range, changing only when it is saved or deleted (D292). Chunk 18 moves
  to wave 6, after chunk 17 (coordinator's call). Written into master spec Part A v1.8 and build
  plan v6; `documentalist` revises the atoms. D290–D299 are reserved for v3.0 wave 2. Asked
  for the range ruling after chunk 19, the owner chose a **bass clef option for my instrument**
  in v3.0, octave signs later (D293): the clef is display only, follows the phrase into the
  review and the MusicXML export, is not in the replay key, and the shared height reads the range
  in its clef. Master spec Part A v1.9; build plan v7 adds chunk 19b and a clef design gate. The
  owner then ruled the range bound: written C2–C7 in treble clef, E0–E5 in bass clef, refused live in
  note names (D294); and that **kept sessions belong to the instrument they were played with**:
  deleting my instrument deletes its sessions, a range or transposition change erases them after
  a warning, a name or clef change keeps them (each phrase still in its own clef), and a save that
  changes the shared height re-checks pre-generated phrases (D295, D296, closing O181). The
  review's "reachable until the next session starts" gains "or until the player deletes its
  session", which the owner confirmed as MAJOR (CONTRACT 4.0). Master spec Part A v1.10; build
  plan v8 adds chunk 20c (my instrument's sessions) and its design gate.
- **ISS-011, a stale phrase at Start** (2026-10-13, D297): after a key, collection or register
  change at Idle, Start failed silently (reproduced on v2.0.0, 60–220 BPM). The owner: no v2
  hotfix, fix it at the end of v3.0. When the phrase on screen was made under settings that
  differ, in what the generation reads, from the current ones, Start and the starting note ask
  **Regenerate** or **Use it**; Use it joins phrase 2 to phrase 1 as after a settings change
  during a session. The owner then ruled the same day: Regenerate runs the Idle Regenerate and
  stays at Idle, the player pressing Start again (closing O182); the starting note asks too, its
  contract wording accepted as MAJOR (CONTRACT 5.0, `documentalist` applies it). Master spec
  Part A v1.12 §16; build plan v9 adds chunk 24b in wave 9; its **Stale phrase design** gate for
  `ux-writer` can start.
- **Pre-generation and the prewarm** (2026-10-13, D298): master spec §8's "runs after v2's
  prewarm" means after the prewarm is posted, as chunk 24 built it (Part A v1.13, a wording
  clarification). O183 opened: a player request that cancels a background attempt replaces the
  worker and loses its warm rhythm-domain memo; to measure, then put to the owner.
- **v3.0 build, wave 3 done** (2026-10-14, D299): chunks 5 (save policy) and 9 (kept-session
  record) merged, the gate green. A 30-minute 240 BPM Jazz `Sixteenth` session measures about
  4.1 MB kept, plus about 1.5 MB of played notes when kept; the measurement replaces the estimate
  (Part A v1.14 §5.2), with no compact encoding. Build plan v10 writes the preflight's
  corrections and what the two chunks leave to chunks 8, 10, 11, 17 and 24b; ISS-012 filed.
- **v3.0 build, wave 4 preflight** (2026-10-14, D300): chunks 7 (saved settings) and 8 (notice
  row) proceed. Build plan v11 writes the preflight's corrections into both and splits chunk 7
  into 7a (load) and 7b (save); after another tab's `Delete everything` the outdated tab shows the
  newer version's wording, with no cause added to the port. `module_save_policy` 0.2 awaits the
  owner's sign-off. O190 opened: a newer version's database whose read-only reopening fails
  gives an unavailable port, where the design wants an outdated tab.
- **v3.0 build, after chunk 7a** (2026-10-14, D301, D302): build plan v12. `review-privacy`'s
  storage half is narrowed in steps (7b: the database and settings only; 10: the kept session
  too; 11: the final rewrite); 7b also fixes `pregeneration`'s storage test and an
  `offline-and-fonts` race with the start-up wait. A saved preset whose values are not all its
  own loads as custom with its grammar (7b). Chunk 20's start-up read sets `myInstrumentLoaded`.
- **v3.0 build, wave 5 preflight** (2026-10-14, D303–D305): build plan v13. The owner ruled the
  session key: the port gains a keyed read and the loader hands keyed summaries; the key is
  `session-{startedAt}-{sessionSeed}`, in no record (D303). Chunk 10's save: the settings flush,
  then one transaction for the session, deletions read at the save, nothing saved with saving
  off, the most recent session after a reload the readable one with the latest start (D304).
  Chunk 17 splits into 17a (worker, session engine, `workspace-session-start.ts`) and 17b (the
  clef); the Idle-side my-instrument paths go to chunk 20 (D305). O200 opened: an unreadable kept
  session at the next save (proposed: left in place).
- **v3.0 build, wave 5 sync** (2026-10-14, D306–D308): build plan v14. Chunk 20 also takes Idle
  pre-generation's settings with the profile, my instrument's clef on Idle's and the session's
  written phrases, and a worker check free of the clef bound (D306). Chunk 14 takes
  `review-link`'s failed read after a reload and the test that an unsaved session is gone after a
  reload (D307). O201 opened: a session cut short by reloading or closing the page may be saved
  today (proposed: never saved, as §5.1 says); new chunk 27 in wave 7 builds the answer (D308).
- **v3.0 build, the owner's wave-5 rulings** (2026-10-14, D309–D311): build plan v15, master
  spec Part A v1.15. O201 closed: a session cut short by reloading or closing the page is never
  saved (§5.1 kept; chunk 27). O200 closed: a kept session the app cannot read correctly is
  deleted, with an apology, at load, at the next save or when opened, while the visit saves; a
  refusal by the device deletes nothing (§5.1, item 6). New chunk 28 in wave 8 builds it, after a
  Damaged session design gate for `ux-writer`; chunk 14's failed reads are the device's refusals.
  Part M2's items 5(b) and 6 are rewritten for the owner.
- **v3.0 build, wave 6 preflight** (2026-10-15, D312–D315): build plan v16, master spec Part A
  v1.16. Chunks 11, 12 and 25 stay in wave 6 and share the review's files in number order, chunk
  12 building on chunk 11 (D312). Chunk 11 captures how a kept session changes after its save,
  which chunk 12 reuses (D313). Remembering the controller changes two STABLE contract wordings:
  §10's seventh change, major (CONTRACT 6.0), waits for the owner before chunk 22 merges (D314).
  Chunk 25's lane scale leaves out very short notes; O210 opened (D315). Gate A shown done.
- **v3.0 build, wave 6 captures** (2026-10-15, D316–D318): build plan v17, master spec Part A
  v1.17. A change to a kept session reads what is stored at the change, as the session's own save
  does (D316); deleting every kept played note deletes every played-notes record, an unreadable
  session's included (D317, correcting D313); a visit that saves nothing neither remembers nor
  forgets the controller (D318, §7.3).
- **v3.0 build, wave 6 design gates** (2026-10-15, D319): build plan v18 follows ux D307–D314.
  O210 closed by ux D308: `Export played notes` is never offered for a file with no note.
  `Include very short notes` holds for the page visit. Chunk 28 takes the Damaged session design.
- **v3.0 contract 6.0** (2026-10-15, D320): the owner confirmed the remembered-controller wording
  as major; master spec Part A v1.18, build plan v19. No contract wording waits any more.
- **v3.0 stray notes measured** (2026-10-15, D321): the threshold is 38 ms; stray and meant notes
  overlap in length, so it leaves out most stray notes, not all (66 of 77 in the recordings).
  Master spec Part A v1.19 (§9, §14), build plan v20 (M1, H5). O211 opened, for the owner at
  hand check H5. A held note the controller cuts in two is noted for later (§14).
- **v3.0 owner rulings after the wave-6 sync** (2026-10-15, D322, D323): master spec Part A
  v1.20, build plan v21. The owner kept the 38 ms threshold, a length rule only (O211 closed;
  hand check H5 still his to run). A controller reselected at load counts as the same controller
  coming back, so it is not checked again (§7.3); no contract change, a clarifying clause proposed
  for `rule_controller_transposition_check` in change set part B2.
- **v3.0 build, wave 7 preflight** (2026-10-15, D324, D325): master spec Part A v1.21, build plan
  v22. A favorites-only file lays its phrases end to end from time zero, each keeping its session
  phrase number (D324, §6). Chunks 13, 14 and 20 split in halves; chunks 14 (the session
  controller's reach into kept sessions) and 20 (the stored my-instrument record) carry an
  architecture capture; chunk 27's page-leaving signal travels with the session's save; wave 7
  shares four files in number order (D325).
- **v3.0 build, wave 8 preflight** (2026-10-16, D329–D331): master spec Part A v1.22, build plan
  v25. Wave 8 shares the workspace shell and the session controller's files in number order;
  chunk 15 captures Delete every session as one batch from a key-only read, and chunks 15 and 21
  gain split rules (D329). Chunk 28's damaged-session deletions go through the kept-change line,
  their reports reaching the notices through `App.vue` and the workspace shell (D330). Another
  tab's Delete everything outdates every other open tab, now named in §4.3 (D331, ux Q80, closed
  by ux D318). Build plan v26 (D332–D334): Delete every session finding nothing stored is done; it
  never meets a newer version's session; the load's clean-up deleting the most recent session
  gives the readable kept session that started last.
- **Open:** 11 questions: O48 and O49 (later and governance),
  O100–O102 (v4 rhythm), O115 and O116 (v3.x learning), O176 (style packs and the chord level),
  O180 (octave signs, later), O183 (pre-generation's cancellation cost), O190 (a newer
  version's database whose read-only reopening fails). D322 closed O211; ux D308 closed O210. D309 and D310 closed O201 and O200; D295
  and D296 closed O181; the owner's ruling in D297 closed O182.
  O163 and O164 closed by D257 and D258; D262 closed O174; D264–D273 settled O165–O173 and O175
  in Part D, pending the owner's approval.
  v3.1 and v3.2 drafts approved by the owner (D233, D234),
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
  [prerequisites](versions/prerequisites.md). v3's build plans: [v3.0](versions/v3/build-plan.md) (approved; v2 moves the workflow to wave
  level, D252; v3 writes in D253–D256; v4 writes in D257 and D258; v5 a wording fix in chunk 23; v6 writes in D290–D292 and moves chunk 18 to wave 6; v7 adds chunk 19b for D293; v8 writes in D294–D296 and adds chunk 20c; v9 writes in D297 and adds chunk 24b; v10 records wave 3 and writes in D299; v11 writes in the wave-4 preflight's corrections and D300; v12 writes in D301 and D302 after chunk 7a; v13 writes in the wave-5 preflight's corrections and D303–D305; v14 writes in D306–D308 and adds chunk 27), [v3.1](versions/v3/build-plan-v3.1.md) (draft v2, not approved),
  [v3.2](versions/v3/build-plan-v3.2.md) (draft v2, not approved) and
  [v3.3](versions/v3/build-plan-v3.3.md) (draft v2, not approved; depends on owner approval of
  Part D). Every build plan runs wave by
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
