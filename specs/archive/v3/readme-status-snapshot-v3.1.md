> **Archived 2026-10-21.** The v3.1 milestone closed: v3.1 is released as version 3.1.0 (tag
> `v3.1.0`, 55364e7). This is the status snapshot of the spec index, `specs/README.md` at draft
> v0.81, moved here verbatim: a running record of the v3.1 build's decisions as they were made.
> The current snapshot is in the live [spec index](../../README.md). Relative links were written
> from `specs/`; their paths were repaired on 2026-10-21 so they resolve from this folder.

## Status Snapshot

- **v3.0 is released as version 3.0.0** (2026-10-16, D348): the tag `v3.0.0` is at e288d98, and
  the app is deployed at <https://infinite.upsilon-hub.com>. The release gate, build plan
  [chunk 26](../../versions/v3/build-plan.md#chunk-26--v30-release-gate), passed: every definition of
  done item has its evidence in the [release notes](../../../docs/release/v3.0-release-notes.md). Master
  spec [Part A](../../versions/v3/master-spec.md#part-a--v30) is the contract for the running code; the
  milestone's working record is in [archive/v3/](README.md). Still to come after the
  tag, as v3.0.x notes: hand check H8, the played-notes-export half of H5, the later promotion of
  17 REVIEW atoms and the CONTRACT's trimmed EXPECTATION; H7 is for information only
  ([v3.0.x notes](../../versions/v3/README.md#v30x-notes-after-the-tag)).
- **v2 is released as version 2.0.0**, tagged `v2.0.0` at f6bcefe and deployed on 2026-10-07
  (D208, D209). Four hand checks follow its tag as v2.0.x checks: the USB keyboard's two,
  MuseScore and a MIDI tool, and a DAW. The [v2 master spec](../../versions/v2/master-spec.md) states
  what v2 built; its working record is in [archive/v2/](../v2/README.md).
- **v1 is released as `v1.0`** (2026-09-26). Its working record, the v1.0 gate's included, is in
  [archive/v1/](../v1/README.md).
- Infinite Flow is a client-side web practice partner for a monophonic player. It rolls
  four-measure phrases one after another over a backing, a click and a count-in, acknowledges the
  expected notes a MIDI controller plays, and ends each session with a review and its export.
  Since v3.0 it keeps the player's settings, "my instrument", kept sessions with their favorites
  and comments, and, only after an opt-in, played notes on the player's device; nothing is sent.
- **Guiding principle:** Infinite Flow acknowledges and encourages; it never penalizes, grades,
  ranks or scores the player. Anything that adapts to how you play is opt-in and visible. See the
  [far vision](../../vision/far-vision.md).
- **Personas:** P1, the Curious Improviser (primary); P2, the Speed Builder; P3, the Fledgling
  Composer. A shared [context of use](../../personas.md#context-of-use) covers all three: a laptop or
  desktop in Chrome or Edge first, at music-stand distance, no click while playing.
- **Next: the rest of v3** ([v3](../../versions/v3/README.md#releases-d211)):
  - **v3.1:** embellishment flags and presets. Master spec
    [Part B](../../versions/v3/master-spec.md#part-b--v31), approved (D239); design approved (D353);
    build plan [v3.1](../../versions/v3/build-plan-v3.1.md), v22 (v4 approved, D357): waves 0–3 went
    ahead first and may merge into `main`; the owner has allowed the token-source pass (gate T1,
    D382, reversing D355), so waves 4 and 5 wait only for the waves before them; no release before
    wave 5 merges. Entry budget 300 KiB (D359); v3.0's
    contract atoms v3.1 revises take a MAJOR bump, its wordings confirmed (D361–D363); wave 0
    merged, wave 1's preflight corrections written in (D364–D366), version 1's third phrase shape (D367);
    the tense note at a join follows the levels (D368, Part B v1.3); wave 2's preflight corrections:
    a favored scale tone is tried as the drawn figure, played notes stay at data version 1, the
    label in B9's form (D369–D372, Part B v1.4); from chunk 9's report, chunk 22 adds {length} to
    the review's summary (D373), the heavy-body upgrade case went to the owner as O233 (D374),
    and a hole in a timeline goes to ISS-013 (D375); the owner accepts that case: v3.0's sessions
    are carried over at open only, and B9 states the rare overrun of the start-up wait (D376, Part B
    v1.5); wave 3's preflight corrections: chunk 12 keeps v3.0's saved selection until chunk 16
    (D377); the owner rejects the passing-and-neighbor rule, chunk 20 is dropped (gate DP, D378),
    the cost guard's settings are the ones chunk 11 ran (D379), the last "musical profile"
    strings go to chunks 13 and 18 (D381); ISS-014 (D380) is fixed before wave 3 merges (D383); choosing again the option a control already
    shows makes Custom and may discard the pre-generated phrases, accepted by the owner (D388,
    Part B v1.8); at wave 5's report the owner approves the sync's sign-offs and asks for its
    merge (D390); H1 and H2 passed on the owner's word, L1 and L2 done with no tuning (D391); the
    release gate's automated part runs now, H3–H5 and the `3.1.0` tag wait on the owner (D392);
    the automated part passed and the owner accepts the sync's proposals, so `v3.1-release` merges
    into `main` now (D396); the owner gives his go, so `3.1.0` is tagged on `main` once the merge is
    pushed, and H3–H5 become post-release hand checks he runs later (D397).
  - **v3.2:** Jam, the key and mode suggestion, the rhythm lock and its mutation option. Master
    spec [Part C](../../versions/v3/master-spec.md#part-c--v32), approved (D239); build plan
    [v3.2](../../versions/v3/build-plan-v3.2.md), v3, not approved. The contract wording v3.1 and
    v3.2 change was confirmed by the owner (D246).
  - **v3.3:** richer chords, opt-in: one Seventh chords level, Off by default, diatonic sevenths
    only. Master spec [Part D](../../versions/v3/master-spec.md#part-d--v33), awaiting owner approval
    (D264–D275); build plan [v3.3](../../versions/v3/build-plan-v3.3.md), v3, not approved, after
    v3.2's release (D276–D288).
  - **v3.4:** a structural review before v4, with no player-facing change: soundness for
    expansion, the entry budget, refactors worth taking, a split into libraries. The last v3
    milestone, after v3.3 (D389); [scoping draft](../../versions/v3/structural-review.md), the analysis
    not started. v3.4 also builds a **lexicon page**, its one player-facing item (D393, amending
    D389): every lexicon word, A–Z and by search, read from `docs/music/lexicon.md` alone (D394);
    [scoping draft](../../versions/v3/lexicon-page.md), a separate draft because it is built, not
    analysed. Its second step, the lexicon as an API, is planned for v4 or v5 (D395,
    [roadmap](../../roadmap.md#planned-v4-or-v5--the-lexicon-api)).
  - **v3.x:** learning from positive signals, with recognising played signals (D213, D214);
    likely to move or go. Rhythm ratios and the rhythm editor are v4; the chord-fit check, review
    tooling and the two controller-connection ideas are dropped (D211).
- **Open:** 25 questions: O48 and O49 (later and governance), O100–O102 (v4 rhythm), O115 and
  O116 (v3.x learning), O176 (style packs and the chord level), O180 (octave signs, later), O183
  (pre-generation's cancellation cost), O190 (a newer version's database whose read-only
  reopening fails), O230 (a stale replay-key wording in a STABLE atom), O234–O238 (v3.4's
  structural review) and O239–O246 (v3.4's lexicon page). See the
  [register](../../open-questions.md).
- The snapshots this index kept through v2's design and build and through v3.0's are archived
  verbatim at [archive/v2/readme-status-snapshot.md](../v2/readme-status-snapshot.md) and
  [archive/v3/readme-status-snapshot.md](readme-status-snapshot.md).
