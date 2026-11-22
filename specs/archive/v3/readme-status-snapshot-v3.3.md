> **Archived 2026-11-22.** The v3.3 milestone closed: v3.3 is released as version 3.3.0 (tag
> `v3.3.0`, b2a0e3fa). This is the status snapshot of the spec index, `specs/README.md` at draft
> v0.93, moved here verbatim: the snapshot as it stood while v3.3's release gate ran. The current
> snapshot is in the live [spec index](../../README.md). Relative links were written from
> `specs/`; their paths were repaired on 2026-11-22 so they resolve from this folder.

## Status Snapshot

- **v3.2 is released as version 3.2.0** (2026-11-09, D523): tagged `v3.2.0` on `main` at
  f93e552d, released as built by the owner's ruling (D521). Its release gate, build plan
  [chunk 27](../../versions/v3/build-plan-v3.2.md#chunk-27--v32-release-gate), passed its machine half,
  with the evidence in the [release notes](../../../docs/release/v3.2-release-notes.md); the release sync
  left CONTRACT at 14.1.0. Master spec [Part C](../../versions/v3/master-spec.md#part-c--v32), Jam, the
  key and mode suggestion, the rhythm lock and the guide playback, is with Parts A and B the
  contract for the running code; the milestone's working record is in
  [archive/v3/](README.md#v32-release-archived-2026-11-09) (D524). Still to come after
  the tag, as [v3.2.x follow-ups](../../versions/v3/README.md#v32x-notes-after-the-tag): the owner's hand
  and listening checks (L1, L2, L3, H3, H7, H8, HG), the Travel Sax recordings (DR) and O267, with
  the atoms waiting on them. They confirm or send back D406's provisional answers
  ([what confirms them](../../versions/v3/build-plan-v3.2.md#what-confirms-d406s-provisional-answers))
  and tune the suggestion's weights and cues; a finding becomes a later 3.2.x fix, decided then.
- **v3.1 is released as version 3.1.0** (2026-10-21, D397): the tag `v3.1.0` is on `main` at
  55364e7, with the evidence in the [release notes](../../../docs/release/v3.1-release-notes.md). Master
  spec [Part B](../../versions/v3/master-spec.md#part-b--v31), embellishment figures and presets, states
  it; its working record is in [archive/v3/](README.md) (D398, D524). Its hand checks
  after the tag are closed (D399): H4 passed, H3 and H5 waived, since Chrome is the one supported
  browser and v3.0 had no live users
  ([v3.1.x notes](../../versions/v3/README.md#v31x-notes-after-the-tag)).
- **v3.0 is released as version 3.0.0** (2026-10-16, D348), tagged `v3.0.0` at e288d98 and
  deployed. Master spec [Part A](../../versions/v3/master-spec.md#part-a--v30) states it. Still to come
  as v3.0.x notes: hand check H8, the played-notes-export half of H5 and the later promotion of
  17 REVIEW atoms; H7 is for information only
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
  Since v3.1 the player sets how often each of seven embellishment figures appears, and chooses
  among eight built-in presets or saves their own.
  Since v3.2 a Jam mode grows phrases from a short motif, the doodle, that the player plays on a
  MIDI controller, and suggests a key and mode for it; a rhythm lock keeps the rhythm while the
  pitches change, with optional one-phrase rhythm changes; and a melody guide and a rhythm guide
  can play beside the backing, off by default.
- **Guiding principle:** Infinite Flow acknowledges and encourages; it never penalizes, grades,
  ranks or scores the player. Anything that adapts to how you play is opt-in and visible. See the
  [far vision](../../vision/far-vision.md).
- **Personas:** P1, the Curious Improviser (primary); P2, the Speed Builder; P3, the Fledgling
  Composer. A shared [context of use](../../personas.md#context-of-use) covers all three: a laptop or
  desktop in Chrome first (the one supported browser, D399), at music-stand distance, no click
  while playing.
- **Next: the rest of v3** ([v3](../../versions/v3/README.md#releases-d211)):
  - **v3.3:** richer chords, opt-in: one Seventh chords level, Off by default, diatonic sevenths
    only; Jam mode has its own. Master spec [Part D](../../versions/v3/master-spec.md#part-d--v33) v1.6,
    refreshed against v3.2 as built (D511–D519), **approved by the owner** on 2026-11-09 with its
    build plan [v3.3](../../versions/v3/build-plan-v3.3.md), 23 chunks (two conditional) in six waves
    (D276–D288), and its design (D520). Gate R0 cleared at v3.2's `v3.2.0` tag (D523); gate I0
    (the ingestion) cleared and C1 (the contract wordings, one MAJOR bump per wave sync, 15.0.0 to
    19.0.0) confirmed by the owner (D526). Waves 0–5 merged; L1 skipped by the owner, so chunk 21
    is skipped and v3.3 ships the triad reading (D540). The release gate runs now, its hand and
    listening checks after the `3.3.0` tag (D541).
  - **v3.4:** a structural review before v4, with no player-facing change: soundness for
    expansion, the entry budget, refactors worth taking, a split into libraries. The last v3
    milestone, after v3.3 (D389); [scoping draft](../../versions/v3/structural-review.md), the analysis
    not started. v3.4 also builds a **lexicon page**, its one player-facing item (D393, amending
    D389): every lexicon word, A–Z and by search, read from `docs/music/lexicon.md` alone (D394);
    [scoping draft](../../versions/v3/lexicon-page.md), a separate draft because it is built, not
    analysed. Its second step, the lexicon as an API, is planned for v4 or v5 (D395,
    [roadmap](../../roadmap.md#the-lexicon-api--in-v34-d555)).
  - **v3.x:** learning from positive signals, with recognising played signals (D213, D214);
    likely to move or go. Rhythm ratios and the rhythm editor are v4; the chord-fit check, review
    tooling and the two controller-connection ideas are dropped (D211).
- **Open:** 27 questions: O48 and O49 (later and governance), O100–O102 (v4 rhythm), O115 and
  O116 (v3.x learning), O176 (style packs and the chord level), O180 (octave signs, later), O183
  (pre-generation's cancellation cost), O190 (a newer version's database whose read-only
  reopening fails), O230 (a stale replay-key wording in a STABLE atom), O234 and O236–O238 (v3.4's
  structural review), O239–O246 (v3.4's lexicon page), O267 (a doodle note played before the
  doodle's first barline, v3.2 wave 6), O269 (a legato doodle read as Heavily varied, at v3.2
  H5) and O271 (a note start off the doodle's grid, at v3.2 H4); the last three after the `3.2.0`
  tag (D521). See the
  [register](../../open-questions.md).
- The snapshots this index kept through v2's design and build, through v3.0's, through v3.1's
  and through v3.2's are archived verbatim at
  [archive/v2/readme-status-snapshot.md](../v2/readme-status-snapshot.md),
  [archive/v3/readme-status-snapshot.md](readme-status-snapshot.md),
  [archive/v3/readme-status-snapshot-v3.1.md](readme-status-snapshot-v3.1.md) and
  [archive/v3/readme-status-snapshot-v3.2.md](readme-status-snapshot-v3.2.md).
