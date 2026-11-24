# Decisions

Status: draft v2.150

Append-only record of settled decisions. Earlier logs are archived verbatim:

- D1–D46 (first release): [archive/v1/decisions-D1-D46.md](archive/v1/decisions-D1-D46.md)
- D47–D71 (2026-09-25 persona and vision session):
  [archive/2026-09-25-personas-and-vision/decisions-D47-D71.md](archive/2026-09-25-personas-and-vision/decisions-D47-D71.md)
- D72–D108 (v2 spec consolidated: v2.0–v2.3, from the v1.0 gate close through the rolling-phrase
  spec): [archive/v2/decisions-D72-D108.md](archive/v2/decisions-D72-D108.md)
- D109–D207 (v2 design and build, through the v2.0 release gate):
  [archive/v2/decisions-D109-D207.md](archive/v2/decisions-D109-D207.md)
- D208–D227 (the v2.0 release record, v3's direction, and the v3.0 drafts, master spec and
  design): [archive/v3/decisions-D208-D227.md](archive/v3/decisions-D208-D227.md)
- D252–D258 (the wave-level build workflow and the v3.0 wave-1 rulings):
  [archive/v3/decisions-D252-D258.md](archive/v3/decisions-D252-D258.md)
- D290–D343 (the v3.0 build, through the v3.0 release gate):
  [archive/v3/decisions-D290-D343.md](archive/v3/decisions-D290-D343.md)
- D228–D231 (the owner's first rulings on v3.1's presets and their key and mode restriction):
  [archive/v3/decisions-D228-D231.md](archive/v3/decisions-D228-D231.md)
- D353–D388 (the v3.1 build, from the design's approval to the owner's acceptance at wave 5):
  [archive/v3/decisions-D353-D388.md](archive/v3/decisions-D353-D388.md)
- D390–D391 (v3.1's wave-5 sign-offs and hand checks H1 and H2):
  [archive/v3/decisions-D390-D391.md](archive/v3/decisions-D390-D391.md)
- D232–D251 (v3.2's drafts, master spec Part C v1.0 and its approval, with v3.1's last
  precisions): [archive/v3/decisions-D232-D251.md](archive/v3/decisions-D232-D251.md)
- D392 (v3.1's release gate, run without hand checks H3–H5):
  [archive/v3/decisions-D392.md](archive/v3/decisions-D392.md)
- D396–D405 (v3.1's release sync, go, archive and closed hand checks; v3.2's Jam re-scope):
  [archive/v3/decisions-D396-D405.md](archive/v3/decisions-D396-D405.md)
- D407–D509 (the v3.2 build, from the approved Part C v1.2 through wave 7 and the guide playback):
  [archive/v3/decisions-D407-D509.md](archive/v3/decisions-D407-D509.md)
- D261–D288 (v3.3's direction, the chord research, master spec Part D's answers and its planning
  answers): [archive/v3/decisions-D261-D288.md](archive/v3/decisions-D261-D288.md)
- D349–D352 (the v3.1–v3.3 plan migrations and the merge of branch `plan-migration`):
  [archive/v3/decisions-D349-D352.md](archive/v3/decisions-D349-D352.md)
- D511–D520 (Part D refreshed against v3.2 as built; the owner's approval of v3.3):
  [archive/v3/decisions-D511-D520.md](archive/v3/decisions-D511-D520.md)
- D524–D536 (v3.2's archive; the v3.3 build, from gates I0 and C1 through wave 4's gate):
  [archive/v3/decisions-D524-D536.md](archive/v3/decisions-D524-D536.md)
- D389 (v3.4 opened as a structural review, the last v3 milestone):
  [archive/v3/decisions-D389.md](archive/v3/decisions-D389.md)
- D393–D395 (the lexicon page added to v3.4, its one source, and the lexicon API placed later):
  [archive/v3/decisions-D393-D395.md](archive/v3/decisions-D393-D395.md)
- D544–D574 (v3.3's archive; v3.4's rulings, from the owner's first ones and his delegation to the
  wave driver through the structural review's report):
  [archive/v3/decisions-D544-D574.md](archive/v3/decisions-D544-D574.md)

Archived IDs keep their meaning and may be cited anywhere. Their content is now stated as settled
fact in the live documents (see the [archive index](archive/README.md) and each milestone
folder's README, such as [archive/v3/README.md](archive/v3/README.md)). New IDs come from
`doc-ids next spec D`.

Live here: D259–D260 (style packs, planned with no version, and the sound ban; merged from branch
`v4-accompaniment-research`); D344–D348 (the v3.0 release and its v3.0.x notes, still open); D406 (Jam's four answers,
provisional until the owner's checks after the `3.2.0` tag); D521–D523 (v3.2's release as built,
its contract as built and its go, whose checks after the tag are still open); D537–D542 (the
figure restated from M3's deciding runs, the endings-on-the-seventh ruling kept for a later
version, and v3.3's release before its hand and listening checks, which follow the `3.3.0` tag);
D575 (the build plan's open points after the structural review, whose revision of
`prerequisites.md` is `spec-writer`'s first task when v4.0's master spec starts); D576–D577
(`NotationError` in chunk 6, and O230's close); D578 (v3.4 tagged before H1, which follows the
`3.4.0` tag with the lexicon four's STABLE promotion); and D579 (v3.4 released and archived).
D289, D525, D543 and D566 are unused; so are the IDs within the archived range D407–D509 that its
archive notice lists.

## Decision Log

- **D259 (2026-10-11): style packs are recorded as planned, version not yet assigned.** The
  owner's call: keep the style-pack plan and the reasoning behind it in the
  [roadmap](roadmap.md#planned-version-not-yet-assigned--style-packs) for future reference, with
  no version, no scope and no spec yet. The plan groups the generator's settings and new
  capabilities into style packs (dialects such as Folk reel, Bebop, Blues, Baroque), layered style
  → character identity → situation, as declarative data over the one generator (the breadth
  review's option B), in the style atlas's greedy unlock order and tiers. Nothing it would revisit
  (D11–D13, D15, D20, D28, the voice-leading minimum rules, the fixed four-bar phrase) changes
  now. The research behind it is on branch `v4-accompaniment-research`:
  `docs/music/styles/README.md`, `docs/music/generation-breadth-review.md`,
  `docs/music/identity-modelling.md`, `docs/music/README.md` and `docs/sound-library-survey.md`.
- **D260 (2026-10-11): the only sound ban is on samples.** The owner's position, from the v4 sound
  library survey (its open question 1): the one true ban is on samples, recorded audio and audio
  assets. Generated buffers (noise, a reverb impulse response, a wavetable computed in code),
  AudioWorklets, WASM DSP and effect chains are open in principle. The "oscillators and gains
  only" wording of `req_session_backing_track` and of the `verify:boundaries` check (which bans
  `createBufferSource` and `new AudioBuffer(` in authored code) is narrower than this intent; the
  v4 spec rewords both to ban recorded audio and audio assets rather than buffers
  (`documentalist` for the atom). It does not touch the separate no-network rule.

- **D344 (2026-10-16): `createSessionMidi` keeps no code link to `service_session_midi`.** The
  owner accepted ("ok") the wave-10 final sync's recommendation: its file,
  `src/components/workspace/workspace-session-midi.ts`, already links ten atoms, the code-health
  cap, so it stays as it is; the atom stays traced through `workspace-session-starting-note.ts`
  and two test files. Stated in
  [v3 README, v3.0.x notes](versions/v3/README.md#v30x-notes-after-the-tag).

- **D345 (2026-10-16): the 17 REVIEW `release-v3.0` atoms are promoted later.** The owner
  accepted ("ok") the final sync's recommendation: 22 STABLE atoms sit under REVIEW parents for
  now, and the 17 are promoted after the tag as v3.0.x notes, for example once H5's
  played-notes-export half and H8 have run. Stated in
  [v3 README, v3.0.x notes](versions/v3/README.md#v30x-notes-after-the-tag).

- **D346 (2026-10-16): ten promoted atoms tagged `changes-in-v3.1` or `changes-in-v3.2` now
  cross the contract gate.** The owner accepted ("ok") the final sync's finding: being STABLE and
  on the surface, their v3.1 and v3.2 revisions each need the contract bump their level requires.
  Stated in [v3 README, v3.0.x notes](versions/v3/README.md#v30x-notes-after-the-tag).

- **D347 (2026-10-16): the CONTRACT's EXPECTATION is trimmed now, at the v3.0 archive.** The owner
  accepted ("ok") keeping it as a version history until archive time, and left the time to the
  archive pass; spec-writer's call: this release's archive is that time, since the notes for
  versions shipped in 2.0.0 and 3.0.0 are release history. `documentalist` applies the trim
  listed in [v3 README, v3.0.x notes](versions/v3/README.md#v30x-notes-after-the-tag).

- **D348 (2026-10-16): v3.0 is released as version 3.0.0; its working record is archived.** The
  release gate (build plan chunk 26) passed; the tag `v3.0.0` is at e288d98, approved by the
  owner, and the app is deployed. The v3.0 decisions (D208–D227, D252–D258, D290–D343), the
  register's notes on closed v3.0 questions, the spec index's status snapshot, the five v3.0
  drafts and the storage grounding move verbatim to [archive/v3/](archive/v3/README.md). The
  master spec, the v3.0 build plan and the v3 README stay in place. Live: D228–D251 (v3.1, v3.2),
  D261–D288 (v3.3) and D344–D347. No question was decided; the v3.0.x notes stay live.

- **D406 (2026-10-21): Jam's settings, its controls taken from the doodle, its tempo and its
  rhythm lock are settled as proposed, provisionally until the owner's checks.** The owner: "your
  propositions seem nice, will need testing to be sure." Closes O247, O248, O249 and O253 as
  [Jam mode §3](versions/v3/jam-mode.md#3-jams-settings-set) and [§5](versions/v3/jam-mode.md#5-tempo-in-jam) say, with the check that
  confirms each in [§3.1](versions/v3/jam-mode.md#31-what-confirms-them). A failed check comes back as a ruling for the
  owner; nothing changes silently.

- **D521 (2026-11-09): v3.2 is released as built, before the owner's hand and listening checks,
  which follow the `3.2.0` tag; closes O306.** The owner: "for now let's considere this version 3.2
  worthy of being tagged. the next version doesn't build up "much" on top of current one. if need
  be, we will have corrective measure decided later." This goes further than option B: the
  release gate runs its machine half; L1, L2, L3, H3, H7, H8, HG, the DR recordings and O267
  follow the tag as v3.2.x follow-ups, as v3.1's hand checks did (D397). R0 clears at the tag; a
  later 3.2.x fix re-records v3.3's chunk 1 corpus. Now in:
  [build plan v3.2, chunk 27](versions/v3/build-plan-v3.2.md#chunk-27--v32-release-gate),
  [Part C §C16](versions/v3/master-spec.md#c16-definition-of-done),
  [build plan v3.3, gate R0](versions/v3/build-plan-v3.3.md#gates).

- **D522 (2026-11-09): v3.2's contract stated as built, seven MAJOR bumps to CONTRACT 14.0.0 (a
  clarification).** The release-notes writer found C13 counting three bumps and item 49, C17 and
  chunk 27 naming 8.0.0's one sign-off; the owner signed each of 8.0.0 to 14.0.0 (release notes
  item 49). No ruling changes. Now in:
  [Part C §C13](versions/v3/master-spec.md#c13-what-v32-changes-in-v2-v30-and-v31-guarantees-and-atoms),
  [build plan v3.2, chunk 27](versions/v3/build-plan-v3.2.md#chunk-27--v32-release-gate).

- **D523 (2026-11-09): the owner gives his go; `3.2.0` is tagged on `main` now, its checks after
  the tag (D521, as D397 for v3.1); gate R0 of v3.3 clears.** After the release sync, the owner:
  "Accept all (Recommended)", "Keep all 23 at review (Recommended)", "Merge and tag
  (Recommended)", "Push main + tag". Now in:
  [build plan v3.2, chunk 27](versions/v3/build-plan-v3.2.md#chunk-27--v32-release-gate),
  [build plan v3.3, gates](versions/v3/build-plan-v3.3.md#gates).

- **D537 (2026-11-14): `documentalist` restates `rule_earlier_kept_sessions_carried_over`'s figure
  at the release gate, from the owner's reference-machine M3; no owner ruling.** Chunk 17's M3
  reaches the 2 s wait at about 500 sessions of 105 kB bodies from v3.0 data (2,002 ms; 1,478 ms
  from v3.1's), not the atom's "about 220 sessions of about 13 minutes"; the behaviour holds
  (D376). An overrun at fewer sessions than the atom says goes to the owner. Now in:
  [build plan v3.3, chunk 22](versions/v3/build-plan-v3.3.md#chunk-22--v33-release-gate).
- **D538 (2026-11-14): wave 5 closes without chunk 21, which becomes its own conditional wave 6.**
  The owner's ruling: chunk 21 is still blocked on L1 (H1 not listened to yet) and O310. Wave 6
  runs only if L1 approves the seventh as an ending (then O310 ruled, C2 drafted and confirmed, a
  peek, C2's 20.0.0 at its sync), before the release gate; otherwise chunk 21 is recorded as
  skipped. Now in: [build plan v3.3, waves](versions/v3/build-plan-v3.3.md#waves),
  [chunk 21](versions/v3/build-plan-v3.3.md#chunk-21--endings-on-the-seventh-second-option-conditional).
- **D539 (2026-11-17): O310 ruled as proposed: what a phrase may end owing keeps reading the tonic
  triad; closes O310.** `phrase-ending-debt.ts` admits only a recovery or a tense note a tonic-triad
  note can settle; only the landing (`pitch-advance.ts`, `join-rules.ts`) may admit the seventh,
  when the next first chord has it. The owner's reason: every debt across the join stays payable
  whatever that chord's form; accepting unpaid debts was considered and declined. Applies whenever
  endings on the seventh are built. Now in: [chunk 21](versions/v3/build-plan-v3.3.md#chunk-21--endings-on-the-seventh-second-option-conditional).
- **D540 (2026-11-17): the owner skips L1 ("skip the listening test"): chunk 21 is skipped, wave 6
  does not run, C2 is not drafted, and v3.3 ships the triad reading (§D12's first option).** D538's
  "otherwise" branch; L1's recorded result is "skipped by the owner", and the release gate is next.
  Endings on the seventh become a candidate for a later version, D539 standing. Now in:
  [build plan v3.3, gates](versions/v3/build-plan-v3.3.md#gates), [waves](versions/v3/build-plan-v3.3.md#waves),
  [roadmap candidates](roadmap.md#candidates-not-committed).
- **D541 (2026-11-17): v3.3 is released first; its hand and listening checks follow the `3.3.0`
  tag, as v3.2's did (D521, D523).** The owner's ruling: the release gate runs now, final M1 and M2
  at the shares as they stand (no L2 tuning before the tag), DP re-checked on them. After the tag:
  L2 (H2, and any share tuning shipped as a 3.3.x patch with M1, M2 and U1b run again), U1b, H3–H6,
  M3's deciding runs and D537's restatement. §D15 item 9 now records L1 as skipped (D540), the triad
  reading shipping. Now in: [Part D §D15](versions/v3/master-spec.md#d15-definition-of-done),
  [§D16](versions/v3/master-spec.md#d16-deferred-and-open),
  [build plan v3.3, chunk 22](versions/v3/build-plan-v3.3.md#chunk-22--v33-release-gate),
  [gates](versions/v3/build-plan-v3.3.md#gates), [hand checks](versions/v3/build-plan-v3.3.md#hand-checks).
- **D542 (2026-11-17): `rule_jam_phrase_one_failure_ladder` is not revised for v3.3; the release
  sync removes its `changes-in-v3.3` tag.** Wave 5's sync found it in the change set's part E under
  chunk 23 but in no Revisions line. Its wording names the rungs and their order, not what they
  read, and holds; Jam's level on every rung is `rule_jam_has_own_seventh_chords_level`'s (§D15
  item 22), linked at the attempts' builder. `documentalist` moves part E's row to the atoms
  checked whose wording holds. Now in: [build plan v3.3, chunk 22](versions/v3/build-plan-v3.3.md#chunk-22--v33-release-gate).

- **D575 (2026-11-23, the driver under D556): the build plan's open points after the review.**
  Chunk 6 stops and reports if a moved value would pull in code outside the library. Chunk 6
  comes before 7 because κ is 1 and R3 is easier to judge once R2's moves are settled; no file
  forces it. Wave 2's gate is the full `npm run quality`, like any wave's. Session's one-way rule
  in an atom is P3's call. Revising `prerequisites.md` (staleness, the library line, K) is
  `spec-writer`'s first task when v4.0's master spec starts; nothing changes now. Now in:
  [build plan v3.4](versions/v3/build-plan-v3.4.md),
  [report §2.1](versions/v3/structural-review-report.md#21-the-prerequisites).
- **D576 (2026-11-23, the driver under D556): `NotationError` moves with chunk 6's cut 2.** It
  goes into `src/domain/notation/` beside the moved layout names and `src/notation/` re-exports
  it, so the class keeps one identity. The two planners throw it, so cut 2 can't meet the library
  line without it; it imports nothing, so no non-library value enters. Chunk 6's stop condition
  stays for anything else. Now in:
  [build plan v3.4, chunk 6](versions/v3/build-plan-v3.4.md#chunk-6--session-one-way).
- **D577 (2026-11-24, the driver under D556, settling v3.4's leftovers at the owner's request):
  O230's proposal is taken.** `module_tension_arc_cycle`'s replay-key wording becomes a
  wording-only revision that names no key version; no guarantee changes. `documentalist` applies
  it now, on branch `v3.4-tidy-intent`. Closes O230. Now in:
  [`module_tension_arc_cycle`](../docs/module_tension_arc_cycle.atom.md).
- **D578 (2026-11-24): v3.4 is tagged first; H1 follows the `3.4.0` tag, as D541 did for v3.3.**
  The owner: "you may do the tagging and archiving of v3.4; i'll deploy later", the go of D550
  before H1. H1 becomes a v3.4.x follow-up; the lexicon four stay REVIEW until it, then their
  STABLE promotion (change set H3) is proposed again. The VPS deploy is the owner's, later. Now in:
  [Part E §E15](versions/v3/master-spec.md#e15-definition-of-done) item 18,
  [build plan v3.4, gates](versions/v3/build-plan-v3.4.md#gates),
  [release notes, H1](../docs/release/v3.4-release-notes.md#h1-the-owner-sees-the-page).

- **D579 (2026-11-24): v3.4 is released as version 3.4.0; its working record is archived.** Tag
  `v3.4.0` on `main` at 17e631e4, by the owner's go (D578). Moved verbatim to
  [archive/v3/](archive/v3/README.md#v34-release-archived-2026-11-24): D389, D393–D395, D544–D574,
  the register's notes on the questions closed during v3.4, and the former status snapshots. Part
  E, the v3.4 build plan, its wave log, both scoping drafts and the structural review's report and
  evidence stay in place. Still live: D575–D578 and H1 ([v3.4.x notes](versions/v3/README.md#v34x-notes-after-the-tag)). No question was decided.

- **D580 (2026-11-24): the player plays the lead only.** The owner: "Note we still expect the
  player only to play the lead role." Every accompaniment voice is a system voice the app always
  plays; the player never takes one in v4.0. Consequence: v4.0's several voices sit beside the one
  monophonic lead, so K need not make the timeline polyphonic; whether a responding voice answers
  the written phrase or the notes played stays open (O321). Now in:
  [v4 README](versions/v4/README.md#settled-direction), [roles §1](versions/v4/accompaniment-roles.md#1-concept).
- **D581 (2026-11-24): today the other sounds have no display beyond volume and on/off.** The
  owner: "There are currently no display provided for other tracks (except, volume and
  activation)." True as built, with three precisions: bass and chords share one switch and slider;
  the backing's harmony shows as chord symbols, and the count-in as beat marks; the count-in
  sounds whatever the click's switch says. Whether v4.0 keeps it so is O320. Now in:
  [roles §3](versions/v4/accompaniment-roles.md#3-today-as-built-d581).
- **D582 (2026-11-24): v4.0's spec uses the lexicon's terms.** Accompaniment, accompaniment role
  (named by technique), voice and system voice; "lead" is the player's line; the owner's "tracks"
  are system voices heard through mix channels. Keeps one term per concept across the drafts.
  Now in: [roles §2](versions/v4/accompaniment-roles.md#2-terms-d582).
- **D583 (2026-11-24): the prerequisites are revised for v4.0, D575's first task done.** What is
  built is marked, the endgame rows are the game's (D551), the whole-file seed and snippets v5's
  (O314 (a)), the library line added as foundation O, and K worked out: the lead stays the
  timeline, system voices are parts beside it from one seeded arranger (proposed). Now in:
  [prerequisites](versions/prerequisites.md#0-where-this-stands-2026-11-24).
- **D584 (2026-11-24): Tone.js issue #1457 does not block v4.0.** It breaks `setContext` on our
  own context in Firefox only, and Chrome is the one supported browser (D399). Revisit if the
  browser scope widens. Now in: [sound library §1](versions/v4/sound-library.md#1-settled).
