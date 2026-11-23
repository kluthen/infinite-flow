# Decisions

Status: draft v2.145

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

Archived IDs keep their meaning and may be cited anywhere. Their content is now stated as settled
fact in the live documents (see the [archive index](archive/README.md) and each milestone
folder's README, such as [archive/v3/README.md](archive/v3/README.md)). New IDs come from
`doc-ids next spec D`.

Live here: D259–D260 (style packs, planned with no version, and the sound ban; merged from branch
`v4-accompaniment-research`); D344–D348 (the v3.0 release and its v3.0.x notes, still open); D389
and D393–D395 (v3.4 and its lexicon page, the lexicon API later); D406 (Jam's four answers,
provisional until the owner's checks after the `3.2.0` tag); D521–D523 (v3.2's release as built,
its contract as built and its go, whose checks after the tag are still open); D537–D542 (the
figure restated from M3's deciding runs, the endings-on-the-seventh ruling kept for a later
version, and v3.3's release before its hand and listening checks, which follow the `3.3.0` tag);
and D544 (v3.3 released and archived); D545–D561 (the owner's first rulings on v3.4, his direction for the split and this app's
horizon, v4.0's scope, the lexicon API in v3.4, and the wave driver's rulings under his
delegation of v3.4); D562–D565 (the driver's rulings on the lexicon page's orientation and build
failures, and his approval of Part E and the v3.4 build plan's lexicon wave); D567–D568 (the
driver's rulings on `#lexicon` under an open sheet); D569–D574 (the driver's rulings on the
structural review's report and the build plan's open points after it). D289 and D525 are unused; so are the IDs within the
archived range D407–D509 that its archive notice lists.

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

- **D389 (2026-10-21): v3.4, a structural review, is the last v3 milestone, after v3.3 and before
  v4.** The owner asked for "an overall structural analysis of our app" before v4's endgame work:
  soundness for expansion, the 300 KiB entry budget, refactors worth taking, a split into
  libraries. No player-facing behaviour. Asked whether it should run before v3.2 and v3.3: "leave it
  for the last milestone of v3, there is no need to run it prior". Opens O234–O238. Now in:
  [v3.4](versions/v3/README.md#v34--structural-review), [scoping draft](versions/v3/structural-review.md).

- **D393 (2026-10-21): v3.4 also builds a lexicon page, step one of a side project; D389 is
  amended.** The owner: "have a side page to our app reference all words in there, it must allow
  alphabetical exploration, simple search … That's for step one (include it in 3.4)". Lazy-loaded,
  offline, `src/styles/` only, keyboard use; out: editing, word popups, the API. D389's "no
  player-facing behaviour" now describes the structural review only. Opens O239–O246. Now in:
  [lexicon page](versions/v3/lexicon-page.md#2-settled), [v3.4](versions/v3/README.md#the-lexicon-page-d393).

- **D394 (2026-10-21): the lexicon page's only source is `docs/music/lexicon.md`.** The owner: "it
  must use existing md files and not duplicate information". Read at build time; no hand-copied
  list, no second list, no generated file committed; a lexicon edit shows with no other change,
  and a check proves it. Now in: [lexicon page §5](versions/v3/lexicon-page.md#5-the-single-source-d394).

- **D395 (2026-10-21): the lexicon becomes "a proper API" in v4 or v5, the version decided
  later.** The owner: "For later (v4 or v5 depending on how they goes) we will turn this in a
  proper API." Not specced. Now in:
  [roadmap](roadmap.md#the-lexicon-api--in-v34-d555).

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

- **D544 (2026-11-22): v3.3 is released as version 3.3.0; its working record is archived.** The
  owner's go of 2026-11-18 ("Merge, tag v3.3.0, push"; the wave log's release gate entry): the tag
  `v3.3.0` is on `main` at b2a0e3fa. Moved verbatim to
  [archive/v3/](archive/v3/README.md#v33-release-archived-2026-11-22): D261–D288, D349–D352,
  D511–D520 and D524–D536, the register's notes on the questions closed during v3.3 (O310's
  included), and the former status snapshots of the spec index and the v3 README. Part D, the v3.3
  build plan and its wave log stay in place. Still live: D537–D542 and the checks after the tag
  ([v3.3.x notes](versions/v3/README.md#v33x-notes-after-the-tag)). No question was decided.

- **D545 (2026-11-22): v3.4 delivers the structural review's report and the refactors the owner
  takes, built as a v3.4 build plan; closes O234, its tag sub-question split off as O312.** The
  owner: "it's both the report and the corrective measures should they arise." He did not answer
  the tag; its proposed rule (`3.4.0`, since code ships) waits in O312. Now in:
  [structural review §6](versions/v3/structural-review.md#6-deliverables).
- **D546 (2026-11-22): the review looks at the code as it is now and does not plan for or review
  v4's scope; closes O237.** The owner: "we wont work on reviewing V4.0 right now. we will focus on
  v3.4". Q1's v4 bullets stay as out-of-scope notes. Now in:
  [structural review §3](versions/v3/structural-review.md#3-what-it-is-not),
  [Q1](versions/v3/structural-review.md#q1-is-the-architecture-sound-for-expansion).
- **D547 (2026-11-22): no new runtime dependency besides Tone.js; narrows O238.** The owner: "the
  only dependency we should plan for is tone.js otherwise we don't have need to add a new one."
  The review may weigh Tone.js's weight and where it loads against the start-up budget. O238 keeps
  the rest of its proposal and whether the dev-only analysis tools are covered. Now in:
  [structural review §3](versions/v3/structural-review.md#3-what-it-is-not),
  [Q2](versions/v3/structural-review.md#q2-should-the-entry-budget-be-lowered-and-how).
- **D548 (2026-11-22): the lexicon page's questions O239–O246 go to `ux-writer` first; none is
  ruled.** The owner: "as for lexicon integration i'll let the ux writer look at it and do some web
  research." `ux-writer` researches and proposes the design and an answer to each; `spec-writer`
  checks them against the spec, personas and lexicon and takes them to the owner. Now in:
  [register](open-questions.md#v34-lexicon-page-o239), [lexicon page](versions/v3/lexicon-page.md).
- **D549 (2026-11-22): the lexicon page's design is validated, and `ux-writer`'s answers to
  O239–O244 and O246 are taken as written; closes those seven.** The owner: "OK i validate lexicon
  view." This includes the four choices put to him: the 16 Internal entries hidden (318 shown);
  Back closes the page through one `#lexicon` history entry, the app's first use of the address
  bar; the "Mentioned in other words" group over popup lines from three characters, definitions
  never searched; app meanings shown as written. O245 stays open. Now in:
  [lexicon page §4](versions/v3/lexicon-page.md#4-the-page-d549), [§5](versions/v3/lexicon-page.md#5-the-single-source-d394).
- **D550 (2026-11-22): v3.4 is released with a tag, `3.4.0`; closes O312.** The owner: "v3.4 will
  be tagged." Now in: [structural review §6](versions/v3/structural-review.md#6-deliverables),
  [lexicon page §8](versions/v3/lexicon-page.md#8-its-place-in-v34-and-who-does-what).
- **D551 (2026-11-22): the endgame's game is a separate app; the owner favours a three-way split
  (a library, this app, the game); closes O236.** The owner: "I'm in favor of a 3 way split, this
  app would remain neutral or student oriented. the lib itself, the game on the other side. The
  game and this app don't quite share the same personas." The review's Q4 evaluates this shape;
  the personas and vision are revised later (O313). Now in:
  [structural review, Q4](versions/v3/structural-review.md#q4-should-the-app-split-into-several-libraries-or-packages).
- **D552 (2026-11-22): the owner's direction, not a ruling: v4.0 is most probably this app's last
  update, perhaps in a repository of its own.** The owner: "the last update for this app will most
  probably be v4.0 with basic accompaniments (if i remember well). We may need to create new repo
  to enforce this." Hedged, so nothing is re-scoped: what it leaves to settle is O314, and the
  roadmap and the version folders carry a dated note only. Now in:
  [roadmap](roadmap.md), [versions](versions/README.md),
  [structural review, Q4](versions/v3/structural-review.md#q4-should-the-app-split-into-several-libraries-or-packages).
- **D553 (2026-11-22): v4.0 is Tone.js and accompaniment with roles; v4's other items move to
  v5.** The owner: "ok move rhythm ratio and editors, etc to v5. keep tonejs and accompaniment
  with roles on v4.0"; asked, he confirmed "etc" as the wider rhythm mutation options (D232) and
  the whole-file seed. O100–O102 follow the rhythm ratios to v5. His direction, not ruled: "v5+
  will probably be moved to the game app instead of here, we will have to review this later"
  (O314). Answers O314 (b). Now in: [v4](versions/v4/README.md#settled-direction),
  [v5+](versions/v5-plus/README.md#moved-from-v4-d553), [roadmap](roadmap.md#3-v4--accompaniment-with-roles).
- **D554 (2026-11-22): microphone input is out of scope in any version.** The owner: "microphone
  input is still out whichever the version." Now in:
  [v5+](versions/v5-plus/README.md#out-of-scope-microphone-input-d554).
- **D555 (2026-11-22): the lexicon API moves into v3.4, as step two of the lexicon page.** The
  owner: "lexicon is for this version." Replaces D395's "v4 or v5". Where it lives once the
  split is built is for the structural review's Q4 (O315). Now in:
  [lexicon page §9](versions/v3/lexicon-page.md#9-step-two-the-lexicon-api-d555),
  [roadmap](roadmap.md#the-lexicon-api--in-v34-d555).
- **D556 (2026-11-22): the owner delegates the resolution of v3.4's questions to the wave
  driver.** The owner: "you're free to handle the resolution of v3.4, i'll bow to your
  suggestions." The driver rules v3.4's open questions and the report's recommendations; the
  owner keeps the tag's go, the pushes he asks for and the VPS deploys. D557–D560 are the
  driver's first rulings under it. Now in:
  [structural review §7](versions/v3/structural-review.md#7-who-does-what-proposed).
- **D557 (2026-11-22, the driver under D556): the bounds of a refactor and the analysis tools;
  closes O238.** Behaviour-preserving only, guarded by the existing tests; atom IDs unchanged,
  links moved with the code; no calendar budget: the build plan takes only refactors ranked as
  preparing the three-way split or v4's Tone.js seam, or clearing a recurring gate friction, the
  rest deferred and listed; dev-only analysis tools run in a throwaway worktree, nothing
  committed, keeping one decided with its recommendation. Now in:
  [structural review §3](versions/v3/structural-review.md#3-what-it-is-not),
  [Q3](versions/v3/structural-review.md#q3-which-refactoring-opportunities-are-worth-taking),
  [§7](versions/v3/structural-review.md#7-who-does-what-proposed).
- **D558 (2026-11-22, the driver under D556): the lexicon page and API are their own small part
  of v3.4, and the measurement pass runs after the page is built; closes O245.** So the page is
  measured with the app. Now in:
  [lexicon page §8](versions/v3/lexicon-page.md#8-its-place-in-v34-and-who-does-what).
- **D559 (2026-11-22, the driver under D556): the lexicon API is a plain TypeScript module over
  the page's parser, with a typed read interface, no server and no network; narrows O315 to its
  home.** This app is its first caller; it holds no browser-only assumption and its entry shape
  is written as a language-neutral contract, so a backend (D561) could serve it later without
  its callers changing. Stands unless the structural review's report finds a reason against it.
  Now in: [lexicon page §9](versions/v3/lexicon-page.md#9-step-two-the-lexicon-api-d555).
- **D560 (2026-11-22, the driver under D556): the two lexicon follow-ups are taken, as a
  docs-only lexicon pass inside v3.4 before the page's build.** Player-worthy words moved out of
  Internal, and the eight longest app meanings shortened, by the lexicon's owners as they decide.
  Now in: [lexicon page §10](versions/v3/lexicon-page.md#10-the-lexicon-pass-d560).
- **D561 (2026-11-22): the owner's direction, not scheduled: a backend some day, for the lexicon
  only, in Go.** The owner: "we will need to have a backend at some point anyway"; "currently,
  the backend is only for lexicon which doesn't contains any user information so that's super
  ok"; "i'm usually more of a go team than whateverjs for the backend." No rule changes now; the
  browser-only rule's wording and the rest are O316. Now in:
  [lexicon page §9](versions/v3/lexicon-page.md#9-step-two-the-lexicon-api-d555).
- **D562 (2026-11-22, the driver under D556): the lexicon page works in any orientation.** The
  landscape-only rule covers the phrase workspace only; the rotate-device notice does not replace
  the page, a list of words being readable in portrait. `documentalist`'s wave preflight checks
  that the portrait wordings (first-release master spec, `req_landscape_phrase_workspace`,
  `rule_session_ends_on_portrait_view`) still read true. Now in:
  [Part E §E7](versions/v3/master-spec.md#e7-opening-and-closing).
- **D563 (2026-11-22, the driver under D556): an empty or malformed lexicon fails the build.**
  Malformed is the template's own rules: a required field missing, fields not the template's or
  out of its order, an id twice, a related id naming no entry; empty is no shown entry. The page
  needs no empty state. Now in: [Part E §E5.3](versions/v3/master-spec.md#e53-the-build-fails-on-an-empty-or-malformed-lexicon).
- **D564 (2026-11-22, the driver under D556): master spec Part E v1.0, the lexicon page and the
  lexicon API, is approved.** Consolidated from the draft v2.3 and the design at the `ui_ux/`
  root, with its code facts read again on `main` 828ab396. It also settles: the read interface
  takes its entries as input and leaves A to Z and search to the page; the entry contract's nine
  fields; the Lexicon button does not wait for the session controller; a typed `#lexicon` is a load
  at `#lexicon`. Now in: [Part E](versions/v3/master-spec.md#part-e--v34).
- **D565 (2026-11-22, the driver under D556): the v3.4 build plan's lexicon wave is approved.** One
  wave of three chunks; the read interface is built with the parser in chunk 1, so the page
  (chunk 2) and the API's contract (chunk 3) each follow chunk 1 by one edge, as the in-wave edge
  rule allows. Now in: [build plan v3.4](versions/v3/build-plan-v3.4.md).
- **D567 (2026-11-23, the driver under D556): `#lexicon` reached under an open sheet opens
  nothing; only the address is replaced, the sheet staying as it was.** Gate T0 settled the case
  §E8 left uncovered (ux D495); closing the sheet first was rejected, as it could discard what the
  player typed. Now in: [Part E §E8](versions/v3/master-spec.md#e8-the-browsers-history-and-the-address)
  (v1.1) and [build plan v3.4](versions/v3/build-plan-v3.4.md) chunk 2.
- **D568 (2026-11-23, the driver under D556): the stale-phrase prompt counts as an open sheet for
  `#lexicon`, and a sheet opened during the page's first load stops its opening.** Two choices
  chunk 2's owner made where Part E was silent, extending D567: the page never stacks over a sheet
  or the prompt, as it never opens over a session. Now in:
  [Part E §E7, §E8](versions/v3/master-spec.md#e7-opening-and-closing) (v1.2) and
  [build plan v3.4](versions/v3/build-plan-v3.4.md) chunk 2.
- **D569 (2026-11-23, the driver under D556): v3.4 takes R1, R2 and R3 from the structural review.**
  R1 enforces the library line (a resolving import check in `verify-boundaries.mjs`, a no-DOM
  tsconfig over `domain/`, the README boundary map corrected); R2 makes `session/` import only
  session plus the library set; R3 moves the Jam host wiring out of `WorkspaceShell.vue`. Now in:
  [report §7](versions/v3/structural-review-report.md#7-rulings) and
  [build plan v3.4](versions/v3/build-plan-v3.4.md) waves 2 and 3.
- **D570 (2026-11-23, the driver under D556): R4, the atom-spread limit above 10 is a warning for
  test files only.** Source files keep warn above 5 and error above 10. This relaxes a quality
  gate, knowingly: every atom-limit gate failure so far involved a test file, and broad specs
  legitimately cover many atoms. Chunk reports still name any link they left out because of the
  limit. Now in: [report §7](versions/v3/structural-review-report.md#7-rulings) and
  [build plan v3.4](versions/v3/build-plan-v3.4.md) chunk 4.
- **D571 (2026-11-23, the driver under D556): R5, the start-up budget stays at 400 KiB (409,600 B,
  D536), and an overrun takes a lever, not a raise.** The first lever is R6 (lazy audio voices),
  the second R7 (lazy migration codecs). Raising the budget again is the owner's call only; no
  wave driver or chunk may do it. Answers the review's Q2. Now in:
  [report §3](versions/v3/structural-review-report.md#3-q2-the-start-up-budget) and
  [build plan v3.4](versions/v3/build-plan-v3.4.md).
- **D572 (2026-11-23, the driver under D556): the review's other recommendations are deferred or
  dropped as the principal-advisor's ranking says.** Deferred: R6–R11, R13–R15, R18, R19. Dropped:
  R12 (regrouping `components/workspace/`), and R13's unification of the settings key list, whose
  order feeds the replay-key contract. R16: the doc line is corrected now, the code deferred. No
  analysis tool is kept in the repository (the point D557 left to the report). Now in:
  [report §6, §7](versions/v3/structural-review-report.md#6-ranked-recommendations).
- **D573 (2026-11-23, the driver under D556): the split's form, Q4.** Now: folders with enforced
  boundaries in one package, with no file moves. At game start: a new repository holding the
  library and the game as npm workspaces, seeded from the enforced library folders, with its own
  ATD record; the order of steps is the report's. Informs O314 (c); does not decide O314 (a), on
  which the game-start form depends. Now in:
  [report §5](versions/v3/structural-review-report.md#5-q4-the-split) and O314.
- **D574 (2026-11-23, the driver under D556): the lexicon API's home is this app, not the
  library.** It has no edge to `domain/`, this app is its only caller, and the library is the
  music core; being self-contained, it can move later at no cost. A Go backend (D561) would sit
  beside this app. Closes O315. Now in:
  [report §5](versions/v3/structural-review-report.md#5-q4-the-split).
- **D575 (2026-11-23, the driver under D556): the build plan's open points after the review.**
  Chunk 6 stops and reports if a moved value would pull in code outside the library. Chunk 6
  comes before 7 because κ is 1 and R3 is easier to judge once R2's moves are settled; no file
  forces it. Wave 2's gate is the full `npm run quality`, like any wave's. Session's one-way rule
  in an atom is P3's call. Revising `prerequisites.md` (staleness, the library line, K) is
  `spec-writer`'s first task when v4.0's master spec starts; nothing changes now. Now in:
  [build plan v3.4](versions/v3/build-plan-v3.4.md),
  [report §2.1](versions/v3/structural-review-report.md#21-the-prerequisites).
