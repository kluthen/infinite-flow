> **Archived 2026-11-22.** Closed range for the v3.3 milestone: v3.3 is released as version
> 3.3.0 (tag `v3.3.0`, b2a0e3fa). These decisions are v3.2's archive event and the v3.3 build,
> from gates I0 and C1 to wave 4's gate. D525 was never issued. D537–D542, which follow them, stay
> live (the figure restated after the tag, the endings-on-the-seventh ruling for a later version,
> and v3.3's release before its hand and listening checks). Archived IDs keep their meaning and may
> be cited anywhere; each decision's content is now stated as settled fact in a live document, or
> is history, as the "where it now lives" table in
> [archive/v3/README.md](README.md#v33-release-archived-2026-11-22) records. Relative links were
> written from `specs/`; their paths were repaired on 2026-11-22 so they resolve from this folder.

- **D524 (2026-11-09): v3.2 is released as version 3.2.0; its working record is archived.** The
  tag `v3.2.0` is on `main` at f93e552d (D523). Moved verbatim to
  [archive/v3/](README.md#v32-release-archived-2026-11-09): D232–D251, D392, D396–D405
  and D407–D509 (v3.1's last closed decisions with them), the register's notes on the questions
  closed during v3.2, the three v3.2 drafts, the Jam grounding, and the former status snapshots
  of the spec index and the v3 README. Master spec Part C, the v3.2 build plan, its wave log and
  the Jam mode draft stay in place. Still live: D406, D521–D523, the checks after the tag and
  O267, O269 and O271 ([v3.2.x notes](../../versions/v3/README.md#v32x-notes-after-the-tag)). No
  question was decided.

- **D526 (2026-11-10): gate I0 is cleared and the owner confirms C1, the bumps and the vision's
  v3.3 line.** I0: `documentalist`'s ingestion 521359be (in `main` eb28071d). Shown the change
  set's parts A, B and C in plain words, the owner answered "approved" to all three: A1–A11 as
  written (A10 rides 15.0.0 at wave 1; A11 at wave 5, no bump, only if the level sits outside the
  controls), each applied at its building wave's sync (D517); one MAJOR bump per sync, 15.0.0 to
  19.0.0 from 14.1.0; part C as shown (VISION 0.12), its out-of-scope addition included, which part
  C offers as optional and recommends. Chunk 0 applies part C. Now in:
  [Part D §D12](../../versions/v3/master-spec.md#d12-contract-changes-needing-owner-confirmation),
  [build plan v3.3, gates](../../versions/v3/build-plan-v3.3.md#gates).

- **D527 (2026-11-10): A8's sentences on the Idle state apply with chunk 16, at wave 3's sync.**
  Found by wave 1's preflight: `module_generative_profile_selection` 1.5's Idle state holding the
  level and the request taking it from those settings, the "current settings" half of
  `rule_choosing_preset_sets_its_settings` and the level's routing in
  `module_profile_control_customization` describe code chunk 16 builds. They apply at wave 3's sync
  under 17.0.0 (any needing the level's control, at chunk 19's); the rest of A8 and 15.0's paragraph hold at the preset domain once chunk 11 merges
  and stay at wave 1. The confirmed wording is unchanged, only its wave moves (D517's rule in
  spirit), so the owner is told but need not re-confirm. Rejected: widening chunk 11 into the Idle
  state, which would pull session code into a wave-1 preset chunk. Now in:
  [build plan v3.3, C1](../../versions/v3/build-plan-v3.3.md#gates), chunks
  [11](../../versions/v3/build-plan-v3.3.md#chunk-11--presets-hold-the-level) and
  [16](../../versions/v3/build-plan-v3.3.md#chunk-16--the-level-in-a-session-and-in-pre-generation).

- **D528 (2026-11-10): a seventh reaches the app only after every writer and reader knows it; no
  interim refusal.** Wave 1 left the `ifk4.` encoder and the data-version-4 body writer accepting a
  carried seventh. Nothing in the app makes a seventh before chunk 19 (D286), so ordering suffices:
  chunks 15 and 17 retire those writers, and chunk 19 depends on 9, 10, 13, 14, 15 and 17. Chunk 13
  moves to wave 4 so 19 does not wait on it in-wave (13 → 19 → 23 would chain three). The ordering
  is load-bearing: after `Start with this phrase` (D519) phrase 2 can carry a seventh at Off. A
  carry-in's seventh is checked for shape, not key, like its triad; fit is judged by the triad
  (§D8.3), so no check is added. Rejected: a refusal in each writer, removed again within two
  waves. Now in: [build plan v3.3](../../versions/v3/build-plan-v3.3.md#chunk-15--replay-key-ifk5),
  chunks 13, 15, 17 and 19, and the [waves](../../versions/v3/build-plan-v3.3.md#waves).

- **D529 (2026-11-12): `rule_doodle_only_orders_candidates` is revised with Jam's own level
  (chunk 23), not with the chord tones (chunk 5).** Its change ("the chords' forms come from Jam's
  level, never from the doodle") is built by chunk 23; the atom says nothing about chord tones, so
  chunk 5 leaves its wording as it is. Found by wave 2's preflight; the change set's part E row
  and §D12's grouping of it under §D6.1 read accordingly. Now in:
  [build plan v3.3, chunk 23](../../versions/v3/build-plan-v3.3.md#chunk-23--jams-own-seventh-chords-level).

- **D530 (2026-11-12): a leap recovery owed across the join is never repaid on the tonic chord's
  seventh; it need not land on a chord tone.** Found by chunk 5: §D6.3's "settles on a note of the
  tonic triad" overstated v3.2, whose recovery could land on a figure's decorating note; requiring a
  triad tone would change phrases at Off. Excluding only the seventh keeps D267's v3.2 landings and
  leaves Off untouched. Built as chunk 5's addendum, mirrored by chunk 6. Now in:
  [Part D §D6.3](../../versions/v3/master-spec.md#d63-phrase-endings-and-the-join-read-the-triad-until-a-listening-check),
  [build plan v3.3, chunk 5](../../versions/v3/build-plan-v3.3.md#chunk-5--the-seventh-as-a-chord-tone-in-the-pitch-search).

- **D531 (2026-11-12): chunk 18 reports join loss by cause; Jam above Off is measured first
  through the ladder's double.** Chunk 5's addendum feared D530 leaves some joins without a first
  note; the ending side already requires a tonic-triad tone 1 to 4 semitones back, so it should be
  rare, and the cause count shows it. The real ladder reads Jam's level only from chunk 23, so the
  release gate's final M2 runs it. Now in: [build plan v3.3, M2](../../versions/v3/build-plan-v3.3.md#m2--the-cost-guard)
  and [chunk 18](../../versions/v3/build-plan-v3.3.md#chunk-18--measurements-first-run-shares-cost-guard-and-ending-examples).
- **D532 (2026-11-13): chunk 16 builds the level's change at the routing point; A4 rides with
  chunk 12.** Wave 3's preflight found A8's `module_profile_control_customization` half with no
  edit to route. Chunk 16 adds the level action through `applyChosen`, saving nothing until chunk 17
  and called by no control until chunk 19, so the wording holds at wave 3's 17.0.0 sync, as the
  change set expects. A4 is reproduction from request and seed, which chunk 12's draw makes true;
  the key is A3's, with chunk 15. Neither changes a wording or a bump. Rejected: moving A8's half to
  chunk 19 and 19.0.0. Now in: [build plan v3.3, C1](../../versions/v3/build-plan-v3.3.md#gates), chunks
  [12](../../versions/v3/build-plan-v3.3.md#chunk-12--the-level-orders-the-plans) and
  [16](../../versions/v3/build-plan-v3.3.md#chunk-16--the-level-in-a-session-and-in-pre-generation).
- **D533 (2026-11-13): M1 gives each phrase a seed of its own**, the same at the four levels; D281's
  count is unchanged, M2 and the other sweeps keep seeds 7 and 13. The draw reads only the seed and
  the event's start, so those two give M1 16 draw bytes and Sometimes and Favored nearly equal
  shares (chunk 12's report). Now in: [build plan v3.3, M1](../../versions/v3/build-plan-v3.3.md#m1--the-seventh-share) and
  [chunk 18](../../versions/v3/build-plan-v3.3.md#chunk-18--measurements-first-run-shares-cost-guard-and-ending-examples).
- **D534 (2026-11-13): gate DP: no finer fallback; chunk 20 is skipped.** Chunk 18's M1 (reference
  machine, 10,224 phrases per level, a seed per phrase): Strongly favored 100 % of events in their
  seventh form (28,682 of 28,682), Sometimes 25.3 %, Favored 50.3 %, the fallback share 0 in every
  cell, so 3 in 4 is reached. DP reopens if the release gate's final M1, after L2's tuning, misses
  it. Now in: [build plan v3.3, gates](../../versions/v3/build-plan-v3.3.md#gates),
  [M1](../../versions/v3/build-plan-v3.3.md#m1--the-seventh-share).
- **D535 (2026-11-13): ISS-019 is a bug against §D6.1 and §D6.3, no new ruling; chunk 5's second
  addendum fixes it in wave 4, before the gate.** A figure's goal on the final attack reads the
  triad, as the validator does; the gate then covers the fix and chunk 21 starts from a consistent
  generator. Now in: [build plan v3.3, chunk 5](../../versions/v3/build-plan-v3.3.md#chunk-5--the-seventh-as-a-chord-tone-in-the-pitch-search),
  [waves](../../versions/v3/build-plan-v3.3.md#waves).
- **D536 (2026-11-14): the first-load budget counts all start-up JavaScript, 400 KiB (409,600 B);
  closes O235.** The owner's ruling ("Count all startup JS") at wave 4's gate: the entry file,
  330,428 B against D504's 327,680 B, grew mostly because chunk 17a's step 5 made the bundler fold
  three chunks already loaded at start-up into it; all start-up JavaScript (the entry file and its
  static imports, transitively, minified bytes on disk) rose only from 380,072 B to 385,440 B. The
  total gates; each wave reports the entry file too. O235's proposal, the time until usable on a
  phone, is not a gate; the v3.4 review may report it. Rejected: raising the entry budget, loading
  the migration steps lazily. Now in: [Part D §D13](../../versions/v3/master-spec.md#d13-existing-code-and-risks),
  [build plan v3.3, M4](../../versions/v3/build-plan-v3.3.md#m4--the-first-load-bundle),
  [build workflow, wave gate](../../versions/v3/build-workflow.md#wave-gate).
