# Infinite Flow v3.2 — Wave log

The execution record of the [v3.2 build plan](build-plan-v3.2.md), kept by the wave driver: what
each wave preflight found, each gate's results and figures, what was moved and why, and each
report to the owner. Rulings live in [`decisions.md`](../../decisions.md); the plan holds only the
current state.

## Wave 0 (2026-10-21)

Chunks 0 (intent re-sync and the contract drafts), 1 (token-source pass, part 2) and 2
(baselines). Branch `v3.2-w0`, worktree `../infinite_flow-v3.2-w0`, cut from `main` cb6e6e6 (the
v3.2 re-scope: Jam as its own mode, Part C v1.2, the reworked design, plan v5).

Before the preflight: the owner approved plan v5 and waived v3.2 H9 (v3.1 data carried over) on
the ground of D399's H5 waiver; `spec-writer` recorded both (spec D417, plan v6, d5f6ed8). The
owner was deploying 3.1.0 to the VPS at the time; nothing in this wave depends on it.

### Preflight

`documentalist` ran the full pass over the three chunks without `atd audit` (grep in place of
`atd search`, no semantic index in the worktree). `atd:lint` and `atd:check` pass. No record
change, no commit. No chunk names an architecture capture, and none is needed.

| Chunk | Verdict | Governing atoms |
| --- | --- | --- |
| 0 | PROCEED-WITH-SIGNOFF-PENDING | 67 DRAFT `release-v3.2`; 33 `changes-in-v3.2` (25 REVIEW, 8 STABLE); CONTRACT STABLE 7.2.0. Owner signs off at CS. |
| 1 | PROCEED | none (styling) |
| 2 | PROCEED | `rule_jam_and_lock_off_reproduce_earlier_phrases`, `rule_vary_settings_allowed_groups` (DRAFT); `rule_seeded_phrase_reproduction`, `module_phrase_replay_key` (REVIEW); none revised |

Plan corrections, sent to `spec-writer` before chunk 0 starts:

1. Chunk 0 also revises VISION (`vision_infinite_flow_first_release`, STABLE 0.9): two of its lines
   state retired v1.0 behaviour (the Jam switch and its drift; Jam "without ever changing a
   setting"). Its draft joins the CS sign-off.
2. Chunk 2's **Atoms** line names the atoms its new tests link to.
3. The lexicon entries move from chunk 0 (`documentalist`) to `spec-writer`, whose document the
   lexicon is.

`spec-writer` applied all three (plan v7, f6970fc). It also updated the lexicon (v1.8): Jam,
Doodle, Drift, Rhythm lock, Starting note and Key and mode suggestion now follow Part C v1.2, and
Collection and Written key no longer say v1.0's "Use it" sets them. No decision recorded: a
preflight correction needs none.

### Chunks

- Chunk 0 dispatched to `documentalist` (spec ingestion, milestone refinement), on `v3.2-w0`.
- Chunk 0 done (f3b4abe, `documentalist`): 48 DRAFT atoms revised, 14 of them restating a retired
  v1.0 rule under the same id (no id renamed: four ids still say "held", their text says "kept");
  26 added; none retired. `release-v3.2` holds 93 DRAFT atoms; 19 rows of change-set part E
  rewritten for v1.2. `atd:lint`, `atd:check`, `lint:links` pass; `atd crawl --gaps` shows no
  orphaned STABLE atom. CS drafts in change-set part M (M1–M21), in the owner's report.
  Findings (part L2), sent to `spec-writer`:
  1. `rule_start_while_controller_away` (STABLE) relied on v1.0's "without a controller Jam is out
     of effect"; C13 doesn't name it. Wording drafted (M2); C13 must add it.
  2. `module_session_seed_plan` (STABLE) says phrase 1 is the Idle phrase and nothing in a session
     draws a seed; Part C doesn't say where a fresh Jam's phrase 1 seed comes from.
  3. Not v3.2: the vision still names Chromium-based browsers, where D399 says Chrome.
- `spec-writer` settled the three findings (ab8e223; Part C v1.3, plan v8): D418 adds
  `rule_start_while_controller_away` to C13; D419 has a fresh Jam draw its session seed once at
  Start and derive each phrase 1 attempt's seed under new `jam-phrase-one` labels, so
  `module_session_seed_plan` joins C13 (chunks 17, 18 and 24 name it in their drift checks);
  D420 puts the vision's browser line (Chrome, after D399) into the CS redraft. `documentalist`
  drafts the three added CS items in the change set.
- Chunk 1 dispatched to `ux-writer`, on `v3.2-w0`.
- `documentalist` drafted the three added CS items (58b6b03): M2 now on C13 (weakens), new M22
  `module_session_seed_plan` 0.2 → 0.3 (extends), M20 gains the browser line (no contract
  promise weakened), M21's 8.0.0 summary updated. Proposed, not applied: add
  `rule_jam_phrase_one_failure_ladder` to M22's parents.
- Chunk 1 done (c241b22, `ux-writer`, ux D349): part 2's 15 classes in one `v3.2 new` block of
  `src/styles/components.css`, no new token; the token-source document deleted, the plan's three
  links repointed. `test:notation` 107 passed, no snapshot change (it needs `npm run build` first:
  `vite preview` serves `dist/`); `lint:links` passes. Markup the interface chunks must respect:
  `jam-notice` follows `jam-instruction` as a sibling; the tempo row uses
  `.field-group:has(> .tap-tempo)`; `staff-jam` centres on `[data-system-position='bottom']`.
  Prose mentions of the deleted file remain in `jam-mode.md` and `build-plan-v3.1.md`
  (`spec-writer`'s, harmless).
- Chunk 2 dispatched to `coding-leader` (worktree `../infinite_flow-v3.2-c2`, branch
  `v3.2-c2-baselines`).
- Chunk 2 merged (66aea49, merge bdd382c, `coding-leader`): phrase corpus 250 `ifk3.` cases
  (865 kB, 6 tests, about 5 s), Vary settings corpus 240 sessions, 2,400 landings (296 kB, 10
  tests, about 2 s); both 16/16 on `v3.1.0` (55364e7) and green on the branch; each goes red on a
  value changed by hand. Entry chunk 265,431 B after `npm run build` on ec221b1 (matches M4;
  41,769 B headroom). The corpus guard is one command in `docs/testing.md`. Beyond the Files line:
  a cases module per corpus, two recorder scripts, `.prettierignore` entries.
  Risk sent to `spec-writer` for chunk 15: the draws corpus hashes the full `SessionSettings`;
  when chunk 15 adds fields, the test must compare the v3.1 keys only (all six groups on), and the
  fixture is never regenerated.
- `spec-writer` wrote chunk 2's risk into the plan (v9, 80abdaa): chunk 15's Done when compares the
  draws corpus on `SessionSettings`' v3.1.0 keys only, with each row's move, draw count and
  selection exact; chunk 16 likewise if its lock state lands in `SessionSettings`; the corpus
  guard bullet says the fixtures are never regenerated.

### Wave gate (2026-10-21, on 80abdaa)

`npm run quality` on the reference machine, idle (no intent audit): exit 0.

- Unit: 493 files, 7,566 tests passed.
- `lint:health`: 0 errors (746 warnings, as before).
- `verify:boundaries`: passed (422 source files, 52 JS chunks within budget).
- End to end: 557 passed, 1 skipped (2.0 min); pregeneration: 557 passed, 1 skipped (2.1 min);
  a11y: 59 passed; notation: 107 passed, 4 skipped.
- `atd:lint` and `atd:check` pass.
- **Entry chunk: 265,431 B** of 307,200 B (unchanged from 3.1.0; chunk 1's CSS is outside it).
  No Jam chunk yet.

### Wave sync

`documentalist`, over `cb6e6e6..v3.2-w0`: no change, no drift. Chunk 2's five `@test-link`s
resolve and sit directly above their `describe`/`it`; `atd check --full` 438 atoms, 334 OK, 104
NO_IMPL (the v3.2 drafts and the vision). Part M stays unapplied until the owner signs off at CS.
Optional for the owner: `module_phrase_replay_key`, `rule_seeded_phrase_reproduction` and
`module_settings_mutation` to STABLE (the corpora add evidence).

### Report to the owner

Chunks 0, 1 and 2 done, none moved; gate passed; entry chunk 265,431 B. Asked for: the CS sign-off
(change set part M, M1–M22; needed before wave 3's sync), the merge of `v3.2-w0` into `main` and the
push. Open for the next driver: CS (owner); wave 1 (chunks 4, 5, 6, 15) in a fresh session, chunk
15's brief carrying the draws corpus projection (plan v9); test:notation needs `npm run build`
first in a fresh worktree.

### The owner's answers (2026-10-22)

"agreed for your questions": the CS sign-off on M1–M22, the merge of `v3.2-w0` into `main` with
the push, and the three promotions.

- `spec-writer` recorded D421 (e8d354c; Part C v1.4, plan v10): the wording is applied at once, so
  a chunk's "(contract, CS)" revision is now its wave sync's check that the code meets the signed
  wording.
- `documentalist` applied part M (3fe768f): 20 STABLE atoms rewritten, the vision 0.10, CONTRACT
  8.0.0; then the three promotions (5a0c991), CONTRACT 8.1.0. `atd:lint`, `atd:check`, `atd crawl
  --gaps` and `lint:links` pass.
- For the next drivers: `module_session_seed_plan`'s interface names are filled at the sync of the
  wave building chunks 17 and 18. The promotions put two more contract changes ahead, outside CS:
  chunk 15 (wave 1) on `module_settings_mutation` and chunk 12 (wave 2) on
  `module_phrase_replay_key` and `rule_seeded_phrase_reproduction`. Each needs the owner's
  confirmation of its wording and a contract bump at its wave's sync; the wave 1 and wave 2
  preflights carry it.
- Gate CS done. Wave 0 merged into `main` and pushed.

## Wave 1 (2026-10-22)

Chunks 4 The quantized doodle · 5 Rhythm bars, distance and change kinds · 6 The request carries
v3.2's inputs · 15 Vary settings' allowed groups. The owner said to start ("you may start working on
wave 1"). Branch `v3.2-w1` from `main` 1013e13, worktree `/home/bastien/work/infinite_flow-v3.2-w1`.

### Preflight

`documentalist` (cde06fe captures, 896ee7f change set part N):

| Chunk | Verdict | Captures |
| --- | --- | --- |
| 4 | proceed with corrections | `entity_quantized_doodle` 0.1, `module_doodle_quantizer` 0.1 (new, DRAFT) |
| 5 | proceed (one clarification) | `entity_rhythm_candidate_domain` 0.1 → 0.2 (REVIEW) |
| 6 | proceed with corrections | `entity_steering_block` 0.1, `entity_request_rhythm_lock` 0.1 (new); `entity_phrase_carry_in` 0.4 → 0.5 (REVIEW): a carry-in from a phrase keeps v3.1's exact fields and form |
| 15 | proceed, sign-off pending | its capture revises the STABLE `module_settings_mutation`: drafted as change set part N1 (not applied) |

Contract sign-off outside CS: chunk 15 changes `module_settings_mutation` (STABLE since 8.1.0), so
it does not merge into `v3.2-w1` before the owner confirms change set part N (N1, N3 CONTRACT 8.1.0
→ 9.0.0, N2 optional). Asked of the owner at preflight. Chunks 4, 5 and 6 change no STABLE contract
atom.

Driver's rulings on minor points (owner's standing delegation): each contract change is applied at
the sync of the wave that builds it, so `main` never holds code that disagrees with a STABLE atom:
9.0.0 at wave 1's sync (part N), another MAJOR at wave 2's for chunk 12 (`module_phrase_replay_key`,
`rule_seeded_phrase_reproduction`); C13's "one bump" is superseded by the 8.1.0 promotions.

Sent to `spec-writer`: the preflight's plan corrections 1–13 (chunks 4, 5, 6, 15, the gates table,
the build workflow's sign-off wording, chunk 12's revisions) and the open points (chunk 6's
encoder refusal, the skipped mutation's record, the draw bound's typed error).

`spec-writer` (edde017): plan v11, D422 (a MAJOR contract bump per changed STABLE guarantee, at the
sync of the wave that builds it: gate CN, part N, before chunk 15's merge; gate CK before chunk
12's), D423 (chunk 6's `ifk3.` encoder refuses an intent it cannot encode until chunk 12; the
skipped mutation is in the in-memory history only; N1's draw bound stays a typed error); build
workflow v2 (sign-off recorded in the change set and the applying commit); Part C v1.5. For the wave
1 sync: check whether `module_phrase_replay_key` 0.6 needs a word for the refusal (spec-writer
thinks not). Gate CN asked of the owner.

### Chunks

- Chunk 4: dispatched to `coding-leader`, branch `v3.2-c4-quantized-doodle`.
- Chunk 4 merged (6387187, merge c80701d): `QuantizedDoodle` and its parser, `quantizeDoodle`,
  `snappedTickOf`, `doodleMeasureOf`; ESLint keeps the quantizer inside `src/jam/`; 76 new tests,
  related 529 pass, static checks pass. For the sync: `module_doodle_quantizer` gains the input
  `endMeasure` (the capture's end barline, from chunk 17); revise
  `rule_stray_notes_filtered_on_reading`. Chunk 3's recorded doodles join the quantizer's tests in
  wave 2.
- Chunk 5: dispatched to `coding-leader`, branch `v3.2-c5-rhythm-bars`.
- Chunk 5 stopped before merge (WIP 8cbb67f on `v3.2-c5-rhythm-bars`, worktree kept): the bar
  key, the distance and the five kinds are built and green, and the bar key reproduces §D.2's
  domain facts. But two things don't match the spec. First, C7.3 and `rule_rhythm_change_kinds`
  say that under Strict and Straight, Sixteenth has no available change; the built definitions find
  repeated note↔rest changes there (20 % per measure pair). Second, several of §D.2's per-kind
  shares don't reproduce within a point; the 2026-10-08 script is not in the repo. Keying the
  largest domain takes 14.4 ms (median), not about 10. Probe results are in the session scratchpad.
  Sent to `spec-writer` for a ruling. Chunk 6 goes on meanwhile (it doesn't depend on 5).
- Chunk 6: dispatched to `coding-leader`, branch `v3.2-c6-request-inputs`.
- Gate CN cleared by the owner (2026-10-22): "ok for the vary settings." That confirms change set
  part N as drafted: N1 (`module_settings_mutation` 0.5), N2 (the optional rewording of
  `rule_vary_settings_figure_step`, which the driver recommended) and N3 (CONTRACT 9.0.0).
  `documentalist` applies it at wave 1's sync. Chunk 15 may merge into `v3.2-w1`. The gate's status
  in the plan is set once `spec-writer`'s chunk 5 ruling is committed, since it is editing the plan
  now.
- Chunk 5 ruling: `spec-writer` D424 (26d21c0; Part C v1.6, §D.2 re-measured, plan v12). The five
  kinds stay as built. "Repeated" means the identical edit in k and k+2. "With Sixteenth, none" was
  wrong: Sixteenth / Strict / Straight / Sparse offers adding or removing a rest (16 of 80). §D.2's
  2026-10-08 figures are replaced by a census of the built code, and the chunk's availability test
  must match them exactly. Keying takes about 15 ms; distance to all takes about 27 ms. Knock-ons:
  - chunks 8, 10 and 11 get budgets: rank once per request, and look candidates up by group;
  - chunk 11's Sixteenth row changes;
  - M2 compares against the new §D.2 and records each preset;
  - H2 now uses the Pop song preset at 120 BPM.

  For the wave 1 sync: `rule_rhythm_change_kinds` is reworded as in D424's report. The new rule
  text, from `spec-writer`, replaces THE RULE / LOGIC; INTENT and TECHNICAL INTERFACE are
  unchanged:

  > One change is one edit of an allowed kind, made in one measure, or made in measure 1 or 2 and
  > repeated identically (the same kind, at the same place in the measure, by the same shift) in
  > measure 3 or 4, since the app builds measures 3 and 4 as a varied copy of measures 1 and 2.
  > Rhythms are compared by their written bars; a tie added or removed outside the edited notes
  > makes it more than one change. The five kinds are: move the start of a note that follows
  > another note by a sixteenth or an eighth (the note before it absorbs the difference; this also
  > covers dotting or undotting a note; the number of notes stays); move a rest that lies between
  > two notes by a sixteenth or an eighth, with the note after it (it keeps its length and the
  > phrase its silence); split a note into two; merge two notes into one; and turn a note into a
  > rest of the same length, or a rest into a note. Ties added or removed, a note and the rest
  > beside it trading places, a moved start that changes a rest's length, and larger edits are not
  > offered. Which changes exist depends on the rhythm settings: under Strict rhythmic variety with
  > Straight syncopation almost none exists (only adding or removing a rest, with Eighth notes
  > under Conversational silence and with Sixteenth notes under Sparse silence; with Quarter notes,
  > none), and neither Strict variety nor Active displacement ever offers a split or a merge. A
  > list that finds nothing simply leaves the lock strict.

  The EXPECTATION gains one line: "A repeated change is the identical edit in measures k and k + 2;
  the same kind at another place or by another shift is not one change."
  For the owner, for information only: under Neutral, "Move a note" and "Move a rest" offer
  nothing. Pop song offers all five kinds.
  Chunk 5 resumes after chunk 6 (κ = 1).
- Chunk 6 merged: halves 6a (4021188) and 6b (899c152), merge 83ac43c.
  - The corpus guard stayed green after each half (12 files, 425 tests). The related tests
    passed: 287 files, 4,089 tests. The static checks and code health passed.
  - New file `request-rhythm-lock.ts`.
  - A carry-in from no phrase requires phrase number 1.
  - The key decoders read carry-ins through `parsePhraseCarryIn`.
  - Deviation sent to `spec-writer`: C5.9 and C11 say the steering block's target holds "note
    starts". It also holds rest starts, since C8's distance needs them. This must be confirmed
    before chunks 12 and 22 store the block.
  - For the gate: the two group parsers join `parseGenerationRequest` in the entry chunk, a few KB.
  - For the sync: drift-check the three captured entities and the two modules, and check whether
    `module_phrase_replay_key` needs a word for the refusals.
  - Risks: the locked bars' tie continuations are not checked yet (chunk 10 may tighten this).
    There are three code-health warnings.
- Chunk 5 resumed: a fresh `coding-leader` from WIP 8cbb67f, with D424's instruction.
- Chunk 6's deviation: `spec-writer` D425 (69d3ed4; Part C v1.7, plan v13). The steering block's
  target holds note starts and rest starts; the code stays as built. Settled under the owner's
  delegation: a doodle measure's starts are what is heard, and against the doodle a candidate's
  rest start right after another rest is dropped. About 18 % of candidates write one silence as
  two rests. Against the lock every start counts, as written. This stays inside chunk 8, which
  gets a new Done-when; chunk 28 gets one too. No code change.

  For the wave 1 sync, reword two DRAFT atoms as follows.

  `entity_steering_block`:
  - Replace the first three sentences of THE RULE / LOGIC with:

    > The steering block is one immutable value with two parts. A target rhythm: exactly four
    > measures, the doodle's measures already laid over the phrase, each the list of its note
    > starts and rest starts in strictly increasing measure-relative sixteenths (0 to 15), a tie
    > continuation being no start, so a measure may hold none; with a band (close, near, or
    > unbounded, under which every candidate counts as near and the seeded order stands). A list
    > of at most 63 melodic moves, in order, each up or down by a size (step, skip or leap) or the
    > same note with no size, with one strength for the list (size and direction, direction only,
    > or none).

  - Replace "an unknown band, move or strength is refused" with "an unknown band, move, start kind
    or strength, a start off the measure's sixteenths or out of order, or a measure count other
    than four, is refused".
  - Add to EXPECTATION: "The target rhythm holds rest starts beside note starts, since the rhythm
    distance compares both."
  - Drop "(new; not built yet)" from TECHNICAL INTERFACE.

  `rule_jam_steering_block`: replace "(note starts per measure, in sixteenths, laid over the
  phrase's four measures)" with "(the note starts and rest starts of each of the phrase's four
  measures, in sixteenths, the doodle's measures laid over them)".

  For chunk 8's sync in wave 4, not now, reword two more atoms.

  `rule_jam_rhythm_ordered_by_doodle`:
  - Replace "built from the doodle's note starts" with "built from the doodle's note starts and
    silences, one rest start per silence in a measure".
  - Add after its first sentence: "A candidate is compared with it as heard: a rest written right
    after another rest starts nothing."

  `rule_rhythm_distance`: add after "ties are not starts.": "Against the doodle, a candidate's rest
  start right after another rest is not counted, so one silence written as two rests is no edit;
  against the locked rhythm every start counts, as written."
- Chunk 5 merged (53c45b7, merge baf924b). The census equals §D.2 count for count.
  - Timings: keying takes 13.2 ms. Distance to all takes 20.4 ms with start lists computed once,
    29.7 ms without.
  - Checks: 971 related tests pass, and the static checks pass.
  - The kind names come from chunk 6's type.
  - For the sync: the D424 rewording above, and a drift check on `entity_rhythm_candidate_domain`
    0.2.
  - Risk: `src/domain/rhythm` uses a type from `src/domain/generation`.
- Chunk 15: dispatched to `coding-leader`, branch `v3.2-c15-allowed-groups`. Gate CN is done, so
  it may merge.
- Chunk 15 merged: halves 15a (b03c104) and 15b (3995fc1), merge 6be387f. The merge cites gate CN.
  - The corpus guard passed after each half (425/425). Related tests passed after each half:
    1,941, then 1,955. The static checks pass.
  - Interface names for N1 at the sync:
    - the groups: `VarySettingsGroup`, `VARY_SETTINGS_GROUPS`, `AllowedGroups`,
      `ALL_GROUPS_ALLOWED`, `MUTABLE_SETTING_GROUPS` and `isGroupAllowed`;
    - the settings fields: `SessionSettings.allowedGroups` and `rhythmLockOn`;
    - the dead end: `MutationDeadEnd`, `MUTATION_DEAD_END` and `isMutationDeadEnd`;
    - the legal-move check: `hasLegalMove(settings, context)`;
    - the session side: `MutationSkippedOutput`, `SkippedMutation`,
      `SessionHistory.skippedMutations()`, `mutationContextAtStart` and
      `mutationFlagFor(varySettings, sessionSeed, settings, context)`.
  - Deviation, in the test's trigger only: an exhaustive search found no step-down dead end under
    today's rules. The dead-end path is defensive; the test reaches it by turning the lock on
    mid-session. Sent to `spec-writer` (C9's wording).
  - `hasLegalMove` on settings whose rhythm combination is blocked from the start follows N1
    literally.
  - Two atoms' tags were placed off the busiest files because of code health's 10-atom limit; the
    sync should check where they sit.
  - Code health has one error on the branch, from chunk 5
    (`rhythm-bars-domain.spec.ts:171`, nesting). It is fixed before the gate.

- `spec-writer` D426 (06c8061; Part C v1.8, plan v14). C9 now says a mid-session dead end cannot
  happen under today's rules and that the skip is a defensive guarantee. Chunk 15's Done-when item 4
  matches the test's trigger. For the wave 1 sync, reword `rule_vary_settings_skips_dead_end`
  (DRAFT):
  - INTENT becomes "Keep a session running should Vary settings ever be left with no move."
  - THE RULE / LOGIC becomes:

    > During a session a reached setting can always step back to where it came from, and the
    > narrow-window step-down never removes the last move, so under today's rules a dead end
    > cannot occur. Should one occur all the same, that move is skipped and recorded in the session
    > history, and the next one is drawn as usual. Nothing stops or fails.

### Gate

Before the gate: a `coding-executor` cleared code health's one error, chunk 5's census test nesting
(96f3a0f; 951 rhythm tests before and after).

`npm run quality` ran on the reference machine on 96f3a0f, idle, with no intent audit. It exited 0.

- Unit: 509 files, 7,975 tests passed. `lint:health`: 0 errors.
- `verify:boundaries`: passed (429 source files, 52 JS chunks within budget).
- End to end: 557 passed, 1 skipped. Pregeneration: 557 passed, 1 skipped. a11y: 59 passed.
  Notation: 107 passed, 4 skipped.
- `atd:lint` and `atd:check` pass.
- **Entry chunk: 265,436 B** of 307,200 B, +5 B since wave 0. Chunk 6's group parsers are almost
  entirely outside it. There is no Jam chunk yet.

`npm run test:sweep` exited 0: 5 files, 16 tests, 126 s. At 240 BPM, Eighth loses its carry-in to
the time rule in 216 of 216 cases from phrase 2. That is recorded here, not compared: wave 0 ran no sweep. C5.17
keeps 240 BPM best effort.

### Wave sync

`documentalist` applied the wave 1 sync in 3b0ce9a.

- Part N is applied under gate CN, with the owner's quote and the date in the commit and the change
  set:
  - `module_settings_mutation` 0.4 → 0.5, with chunk 15's names written in;
  - `rule_vary_settings_figure_step` 0.1 → 0.2;
  - **CONTRACT 9.0.0**.
- Chunk revisions:
  - `rule_stray_notes_filtered_on_reading` 0.2 → 0.3, now in part E;
  - `req_settings_mutation_flag` 0.4;
  - `rule_mutation_rerolls_unsupported_combination` 0.4;
  - `rule_mutation_draws_setting_then_direction` 0.3.
- Rewordings applied verbatim:
  - `rule_rhythm_change_kinds` 0.2 (D424);
  - `entity_steering_block` 0.2 and `rule_jam_steering_block` 0.2 (D425);
  - `rule_vary_settings_skips_dead_end` 0.2 (D426).
- Drift checks found no drift; built names were written in:
  - `entity_quantized_doodle` 0.2;
  - `module_doodle_quantizer` 0.2;
  - `entity_rhythm_candidate_domain` 0.3;
  - `entity_request_rhythm_lock` 0.2;
  - `entity_phrase_carry_in` 0.6;
  - `module_generation_request_construction` 0.8;
  - `module_generation_worker_protocol` 0.10.
- Two STABLE atoms were checked:
  - `module_phrase_replay_key` 0.6 holds, so nothing was drafted.
  - `module_kept_session_codec` holds its guarantee, but one interface name is stale
    (`parseCarryIn` → `parsePhraseCarryIn`). The fix is drafted as change set O4, to ride with
    gate CK.
- Tags: the wave added 387 links, all above their declarations.
- `atd check --full`: 442 atoms, 350 OK, 92 NO_IMPL. `atd:lint`, `atd:check` and `lint:links`
  pass.
- Part O records the sync (O1–O4).

For the wave 2 preflight and later:
- **Chunk 22.** Since chunk 6, the kept body's stored request is parsed by `parseGenerationRequest`,
  which now accepts the two groups. A hand-crafted kept record whose request holds a group its
  intent lacks would read, where v3.1 refused it. No record the app writes holds one. Chunk 22
  closes this or rules it acceptable; the wave 2 or 3 preflight sends it to `spec-writer`.
- **Gate CK (chunk 12).** It covers `module_phrase_replay_key`, `rule_seeded_phrase_reproduction`
  and O4, with another MAJOR bump (D422).
- **Chunk 19's sync.** Drop "(not built yet)" from `module_settings_mutation`'s Idle call. That
  atom is STABLE, so tell the owner.
- **Chunk 8's sync (wave 4).** Apply D425's two rewordings (change set O3).
- **Release sync.** Remove the `changes-in-v3.2` tag from chunk 15's three atoms.
- **Status candidates, offered to the owner.** `rule_vary_settings_skips_dead_end` DRAFT → REVIEW.
  Four ARCHITECTURE atoms (`entity_quantized_doodle`, `module_doodle_quantizer`,
  `entity_steering_block`, `entity_request_rhythm_lock`) are better left until something reads
  them.

### Report to the owner

- Chunks 4, 5, 6 and 15 merged; none moved.
- Chunk 5 stopped once on §D.2's figures; D424 settled it.
- The gate passed. The entry chunk is 265,436 B (+5).
- The sync applied part N, so CONTRACT is now 9.0.0.
- Asked: the merge of `v3.2-w1` into `main` with the push, and the optional status step for
  `rule_vary_settings_skips_dead_end`.

### The owner's answers (2026-10-22)

"agreed. merge and move to review."
- `documentalist` moved `rule_vary_settings_skips_dead_end` from DRAFT to REVIEW, version 0.2
  (c95969e, change set O5).
- Wave 1 merged into `main` and pushed. Its worktree and branch are removed.
- Wave 2 starts in a fresh session, after the owner compacts. Wave 2 is chunks 3, 10, 11, 12
  and 22, with gate CK before chunk 12 merges. Its preflight carries the items listed under
  "For the wave 2 preflight and later" above.

## Wave 2 (2026-10-23)

Chunks 3 Measurement tools · 10 The rhythm lock in the generator · 11 Allowed rhythm changes · 12
Replay key `ifk4.` · 22 v3.2's kept-session shape. The owner said to start ("i believe we're ready
to work on next wave"). Branch `v3.2-w2` from `main` 8e78dae, worktree
`/home/bastien/work/infinite_flow-v3.2-w2`.

### Preflight

`documentalist` (80ebf45 preflight and captures, d3fb1b3 change set part P):

| Chunk | Verdict | Captures |
| --- | --- | --- |
| 3 | proceed | none (measurement) |
| 10 | proceed with corrections 1–2 | `module_ranked_candidate_ordering` 0.3 → 0.4, `service_generation_window_search` 0.1 → 0.2 (REVIEW); `module_rhythm_lock_order` 0.1 (new, DRAFT) |
| 11 | proceed | `module_rhythm_change_draw` 0.1 (new, DRAFT) |
| 12 | proceed, sign-off pending (CK), correction 4 | the `ifk4.` format drafted as change set P1 (not applied to the STABLE atom) |
| 22 | proceed, sign-off pending, corrections 5–9 before its brief | `module_kept_session_jam_upgrade_step` 0.1 (new, DRAFT) |

Gate CK is drafted as change set part P: P1 `module_phrase_replay_key` 0.7, P2
`rule_seeded_phrase_reproduction` 0.3, P3 `module_kept_session_codec` 0.7 (O4 folded in, P3b
optional: the loophole closure), P4 `entity_kept_session_record` 0.7, P5 `module_on_device_database`
0.7, P6 and P7 optional rewordings, P8 CONTRACT 9.0.0 → 10.0.0.

Plan corrections found (all sent to `spec-writer`): 1 chunk 10's capture makes the search
rhythm-major only when the request holds locked bars; 2 chunk 10's drift check and Revisions; 3
chunk 16's re-lock phrase carries no allowed change, chunk 11's drift check adds
`module_rhythm_change_draw`; 4 chunk 12's drift check adds `service_headless_phrase_replay`; 5 chunk
22 revises three STABLE contract atoms (P3–P5), so it needs a sign-off; 6 the kept-record loophole
is not closed by chunk 22 as written; 7 chunk 22's data versions (summary and body 4, played notes
1); 8 a Jam's raw doodle notes come before phrase 1, which the played-notes reader and the STABLE
`entity_kept_session_record` refuse; 9 chunk 22's Atoms and drift check.

Driver's rulings on minor points (owner's standing delegation):
- Correction 5: gate CK widens to P3–P5 under the same 10.0.0 and also blocks chunk 22's merge,
  as D422 does for every changed STABLE guarantee.
- Correction 6: close the loophole (as v3.1 refused such a record; crash early). P3b goes into CK.
- Chunk 3's doodle set: the chunk writes the doodles by hand and leaves a documented way to add the
  owner's Travel Sax recordings (played-notes exports); the owner records them before wave 4
  (chunk 28, v3.2 H5). Nothing in the wave waits on it.

Correction 8 is `spec-writer`'s to settle; a change to the STABLE wording goes to the owner before
chunk 30 (wave 6).

### Chunks
- `spec-writer` (06e6fec): plan v15, master spec Part C v1.9. D427 the preflight's corrections
  (chunk 16's re-lock request holds no allowed change; chunk 22's summary and body take data
  version 4; new gate DR, the owner's doodle recordings, blocks chunk 28); D428 only locked bars
  make the search rhythm-major, a steering block alone keeps v3.1's harmony-major walk (chunk 8's
  capture says so); D429 gate CK also covers chunk 22 (P3–P5, P3b, P6, P7) under CONTRACT 10.0.0
  and blocks its merge, the loophole is closed; D430 a fresh Jam's played notes are timed from its
  count-in's first beat (played notes stay at data version 1; the body holds the doodle's first
  barline and phrase 1's start on that clock). New open question O267 (where the export and the
  review lane put a doodle note played just before the doodle's first barline; before chunk 23).
  D430's STABLE wording (`entity_kept_session_record`, `module_kept_session_codec`) joins CK:
  sent to `documentalist` to draft in part P. Next free IDs: D431, O268.
- `documentalist` (2e6879e): D430's clock wording folded into P3 and P4; P3b part of CK (presence
  check, not value equality, reason in the change set); P8 covers both; P6 and P7 recommended;
  `module_kept_session_jam_upgrade_step` 0.2. Gate CK put to the owner (2026-10-23): P1, P2, P3
  (with P3b and the clock), P4, P5, P8, and P6, P7.
- Gate CK cleared by the owner (2026-10-23): "i approve it all". That confirms change set part P as
  drafted: P1–P5 (with P3b and D430's clock), P6, P7 and P8 (CONTRACT 9.0.0 → 10.0.0), applied at
  wave 2's sync. Chunks 12 and 22 may merge into `v3.2-w2` once built.
- `documentalist` recorded the owner's CK confirmation in part P (c2eb69c); applied at the sync.
- Chunk 3: dispatched to `coding-leader`, branch `v3.2-c3-measurement-tools`.
- Chunk 3 merged (e70a845, merge 97952f9): 12 hand-written doodles in `tests/fixtures/doodles/`
  with traits, checked against `quantizeDoodle`; `scripts/import-doodle-recording.mjs` for the
  owner's recordings (procedure in `docs/testing.md`); `measure:jam` (M1, M5), `measure:lock` (M2),
  `render:rhythms` (32 MIDI files for v3.2 H1 and H2, checked by parsing: no synth on the machine);
  v3.2 H1 written in `HARDWARE-CHECKLIST.md`. Baselines (Ryzen 5 PRO 8640HS, not a VM,
  2026-10-23, desktop open, load 1.2–2.2) in `docs/generation-latency.md`: M1 phrase 1 from rung 3
  in 100 % of Jams, no repeat or shortfall, slowest standalone a cold phrase 1 at 180 BPM charged
  1.020 s of the 1.075 s reserve; M5 matches v3.1; M2 Pop song's per-kind availability agrees with
  D424 (any of the five 83 %). `test:sweep` now also runs the Jam sweep and the census specs.
  Findings sent to `spec-writer`: 1 detached doodles (a note released before the next starts) leave
  sixteenth rest starts no grammar rhythm writes, so 4 of the 6 listening doodles sit "beyond" every
  domain measure (drift, the steering block, gate LD); 2 C5.16.1's rhythmic-variety rule reads most
  legato doodles as Heavily varied (chunk 28, H5); 3 the lexicon's Drift entry says Near is "on or
  next to beat 1 or 3", C8 says "touching tick 0 or 8"; 4 the census cannot tell a forced bend that
  lands one allowed change away from a change without the session history (chunk 13).
- Chunk 10: dispatched to `coding-leader`, branch `v3.2-c10-rhythm-lock`.
- `spec-writer` (24e75dd): plan v16, Part C v1.10, on chunk 3's findings. D431 C4 and the lexicon
  word Close and Near as C8 and the code do; D432 chunk 13's census reads the lock outcome from the
  provenance (Files and Done when updated); D433 O268 (how a short silence between doodle notes is
  read; recommendation: part of the notes unless a whole rest of the doodle's value fits) becomes
  new gate DS, blocking chunk 28 (wave 4 waits for DR and DS); O269 (legato doodles read Heavily
  varied; recommendation: keep, ask at v3.2 H5 step 6, gate L1). LD opens as planned (H1's renders
  give the same starts under either answer to O268). O268 put to the owner (2026-10-23), due
  before wave 4's preflight. Next free IDs: D434, O270.
- Chunk 10 merged (6179f7f, merge bdd858c): `src/domain/rhythm/rhythm-lock-order.ts`
  (`makeRhythmLockOrder`, `walkRhythmLockOrder`, ranks: locked bars 1, forced bend 2 + distance,
  rank 0 left for chunk 11's change); `orderRhythmByPreference` in `candidate-ranking.ts`;
  `walkHarmonyMajor` / `walkRhythmMajor` in `window-search.ts` (rhythm-major only with locked
  bars); `GenerationProvenance.rhythmLockOutcome`. Corpus guard 448/448, related 3,516 pass, static
  checks pass. Forced-bend order 24–37 ms on the largest domain in Node (D424: about 27). Beyond
  its Files: the orchestrator builds the order once per request; the worker protocol accepts the
  new provenance key. For the sync: write the built names into `module_rhythm_lock_order`,
  `module_ranked_candidate_ordering` and `service_generation_window_search`; drift-check
  `module_generation_worker_protocol` (new provenance key). Sent to `spec-writer`: the orderings'
  time is not reported to the sweep (`docs/generation-latency.md` says chunks 9–10 add it; no
  chunk's Files or Done when carries it).
- Chunk 11: dispatched to `coding-leader`, branch `v3.2-c11-rhythm-changes`.
- `spec-writer` (a6d51e3): plan v17, D434. Chunk 13 (wave 3) reports the orderings' time: an
  optional clock in `GenerationOrchestrationOptions`; only with it do the diagnostics carry the
  seconds spent building the request's rhythm order (the provenance and the deep-equal outcome
  stay as they are); the sweep's ladder double and the session sweep's `OutcomeCache` read it into
  `orderingSeconds`. Chunk 13 gains a capture (for wave 3's preflight) and a split rule (13a, 13b);
  chunk 8 builds its steering rank inside the timed span; chunk 29's Files add
  `tests/sweep/jam-sweep-ladder.ts`. Next free IDs: D435, O270.
- Chunk 11 merged (d37cd69, merge fa96819): `src/domain/rhythm/rhythm-change-draw.ts` (hash
  `fnv1a32('infinite-flow/rhythm-change/v1|' + encodeSeed(seed))`, top 16 bits under 16,384 or
  32,768; each domain grouped once in a WeakMap); the drawn candidates take rank 0 (tier
  `rhythm_change`) in the lock order; provenance `rhythmChange?: kind | 'no_change_available'`,
  validated by the worker protocol. Shares over 8,000 phrase seeds within ±0.02 of 1/4 and 1/2;
  D424's Strict/Straight/Sixteenth case holds; no floating point; golden draws. Corpus guard
  448/448, related 3,484 pass, static checks pass. Cost on the largest domain: about 17.5 ms cold
  once, 0.28 ms per phrase. Sent to `spec-writer`: (a) the reading that a drawn change whose
  candidates all fail to make a phrase records `no_change_available` and keeps the lock's order
  (the spec names only "no candidate"; it keeps "a draw happened exactly when the record is
  present" for D432's census); (b) FNV-1a's top bits cluster on raw consecutive seeds (seeds 0–7
  never draw), while real phrase seeds from the seed plan spread well (0.2475 and 0.490 over
  20,000); a final mixing step would be an architecture change. For the sync: the built names in
  `module_rhythm_change_draw`; `module_named_stream_pseudorandomness` (a hash tie key, not a
  stream). `move_rest` is covered at the draw level only.
- Chunk 12: dispatched to `coding-leader`, branch `v3.2-c12-replay-key` (gate CK cleared, so it
  merges into the wave branch once built).
- `spec-writer` (766e9f7): plan v18, Part C v1.11. D435 agrees with chunk 11's reading: C7.4's
  "no usable candidate, no change" covers a drawn change whose candidates all fail (the history
  records "no change available" beside any forced bend), and the history records every draw and
  only draws; M2 counts the two cases apart. D436 the hash stays as built (raw consecutive seeds
  cluster, seed-plan seeds spread: 0.2474 / 0.4975 over 20,000 sessions); M2 and any test of the
  shares use seed-plan seeds. For the sync, optional: note the clustering on raw seeds in
  `module_rhythm_change_draw`. Next free IDs: D437, O270.
- Chunk 12 merged (cecd20b, merge 4f8178d, citing gate CK): every phrase's key is `ifk4.`, a
  9-tuple whose first seven entries are `ifk3.`'s, slots 7 `rhythmLock` and 8 `steering` (null when
  absent), the carry-in slot taking the no-phrase form; D423's encoder refusal removed; `ifk5.`
  refused as unsupported; `replay:phrase` replays one key of each version; the in-browser replay
  test replays five hand-written `ifk4.` keys (locked, changed, forced bend, steering, join from no
  phrase) and a v3.1 corpus slice. Corpus guard pass (676 tests in its run), related 324 pass,
  Playwright 10 pass, static checks pass. No deviation from P1 or P2. The chunk owner's first
  squash would have undone 766e9f7 and ad8e545 on the wave branch; it caught and redid it before
  merging, and the driver checked `specs/` is unchanged by the merge. For the sync: P1, P2 as
  signed; built names `PHRASE_REPLAY_KEY_V4_PREFIX`, `PhraseReplayKeyVersion`; new links on
  `encodePhraseReplayKey` and `decodePhraseReplayKey`; `service_headless_phrase_replay` prints the
  two groups.
- Chunk 22: dispatched to `coding-leader`, branch `v3.2-c22-kept-session-shape`.
- Chunk 22 paused (2026-10-23): its owner stopped on the account's usage limit, mid-22a. Its
  worktree `/home/bastien/work/infinite_flow-v3.2-c22` (branch `v3.2-c22-kept-session-shape`) is
  kept, with WIP commits fe37f45 (kept intent and body at data version 4, step 4; new
  `kept-intent-parsers.ts`, `kept-sessions-v4.ts`, `rewrite-each.ts`), 51b3fe9 (the migration
  steps now run after the work of the step before, in `database.ts`; tests adapted), 68f2226
  (codec, agreement and step-sequencing tests), 92535f2 (step 4 specs, code-health fixes) and
  e7e0cf4 (the driver's safety commit of two uncommitted edits, `kept-sessions-v2.ts` and
  `kept-session-record.ts`, unchecked). No report was made: the state of the checks is unknown, 22b
  (summary, reading envelope, played-notes clock) is not started, M3 is not run.

### To resume (for the next session's driver)

1. Read this entry and the model; nothing else of the wave needs re-reading.
2. Start a fresh `coding-leader` on chunk 22 with the same brief as before (the chunk's section,
   gate CK cleared, P3–P5 with P3b and D430's clock, the split 22a then 22b, M3, the git-care note:
   squash onto `git merge-base HEAD v3.2-w2`, never `reset --soft v3.2-w2`), plus: "Resume from
   WIP e7e0cf4 on `v3.2-c22-kept-session-shape` in its existing worktree; first run the checks and
   find where 22a stands. 51b3fe9 changed the order in which the migration steps run in
   `database.ts`; say whether that is within the capture (`module_kept_session_jam_upgrade_step`,
   `module_on_device_database`) or an uncaptured architectural decision, and stop and report if
   it is the latter."
3. Then the wave gate on `v3.2-w2`, on an idle machine: `npm run quality`, `npm run test:sweep`,
   the entry chunk's size against wave 1's 265,436 B.
4. Then the wave sync by `documentalist`: apply part P (P1–P8 with P3b and the clock; CONTRACT
   9.0.0 → 10.0.0, quoting the owner's "i approve it all", 2026-10-23), the built names each chunk
   entry above lists, the optional note on raw-seed clustering in `module_rhythm_change_draw`.
5. Report to the owner and ask for the merge into `main`.

Open with the owner: gate DS (O268, how a short silence between doodle notes is read; asked
2026-10-23, needed before wave 4's preflight) and gate DR (the owner's Travel Sax doodle
recordings, made with `scripts/import-doodle-recording.mjs` as `docs/testing.md` says, before
chunk 28). Gate LD opens once wave 2 is merged (v3.2 H1; the renders come from `npm run
render:rhythms`).

### Chunk 22 resumed and merged (2026-10-26)

- A fresh `coding-leader` resumed chunk 22 from e7e0cf4. 51b3fe9's step sequencing is within the
  capture (`module_kept_session_jam_upgrade_step` 0.2: every earlier step runs first, in order;
  signed P6: data version 2 before any later step); only the mechanism, `MigrationUpgrade.hold`,
  is new, for `module_on_device_database`'s interface at the sync. e7e0cf4's two edits were
  comment rewraps, kept.
- Chunk 22 merged: 22a 30a5e73, 22b 9dd3d07, merge b5cfc5d (gate CK). `vitest related` 120 files,
  1,320 tests pass on the merged wave branch; typecheck, lint, format, link lint pass. All six Done
  when items met. For the sync: P3–P8 with the built names in the chunk's report (summary and body
  data version 4, `doodle`, `playedNotesClock`, `isJam`, `suggestionDeclined` on a Jam only,
  `kept-intent-parsers.ts`, `KEPT_SESSIONS_V4`, `rewriteEach`, `MigrationUpgrade.hold`,
  `encodeKeptPlayedNotes(…, fresh?)`), `module_kept_session_jam_upgrade_step`'s interface (still
  "Not built yet"), the new link to `rule_raw_doodle_notes_are_played_notes` (DRAFT).
- M3 (2026-10-26, Ryzen 5 PRO 8640HS, not a VM, 5-minute load about 2): v3.1 → step 4, 500
  sessions 808 / 948 ms cold (47 % of the 2 s wait, v3.1's upgrade was 38 %); v3.0 → steps 2–4, 500
  sessions 1,684 / 1,881 ms (94 %, inside the wait but not well under it; D376 accepts a failed-read
  visit past it). Start-up read at most 37 ms cold. Put to the owner with the wave report; the owner
  repeats the deciding runs on the reference machine.
- Left for the wave gate: the full suite and e2e (the harness seam rename,
  `kept-sessions-carried-over.spec.ts` now at data version 4). Chunk 30 must pass `jam.fresh` and
  `fresh` (codec wiring). Not checked by the codec, as the wording doesn't ask: a raw doodle note's
  release past phrase 1's start, a Jam's phrase 1 joining from no phrase.
- Unrelated to the wave, on `main` meanwhile: 254bccb (`.tech`, `SECURITY_TODO.md`) and 316199d
  (Docker runtime on nginx 1.30); merge `main` in or merge the wave cleanly, no shared files.

### Wave gate (2026-10-26)

On `v3.2-w2` d9308fe, Ryzen 5 PRO 8640HS, not a VM, load about 2.2 (other sessions open):
- `npm run quality` passed: unit 522 files, 8,232 tests; Playwright 559 passed; boundaries pass.
- `npm run test:sweep` passed: 8 files, 60 tests.
- **Entry chunk 290,292 B** (+24,856 B since wave 1). Traced per merge: chunks 3, 10, 11 and 12 add
  0 B; all of it is chunk 22's. About 18.5 kB was rolldown folding three files the entry already
  imported statically (`generation-request-*`, `timeline-parser-*`, `deep-equal-*`) into `index`;
  the real first-load growth was +6,401 B (315,691 → 322,099 B over the entry and its static
  imports), of which about 2.9 kB was the data version 4 Jam-parts reader (doodle, played-notes
  clock) reached by the start-up migration through `kept-session-body.ts`.
- Fix c6bbdba (`coding-executor`, the driver's call): the data version 4 body reader moves to
  `kept-session-body-read.ts`, imported only by the on-demand codec; the doodle error classes move
  to `quantized-doodle-errors.ts` (`isKeptPhraseRefusal` checks them on the start-up path). No
  behaviour or format change. `vitest related` 124 files, 1,458 tests; storage Playwright 139;
  lint, format, health (769 warnings, unchanged), boundaries, `atd:check` pass.
- **After the fix: entry chunk 271,179 B** of 307,200 B (+5,743 B since wave 1); first-load JS
  318,964 B over 16 files (+3,273 B since wave 1). rolldown re-split the two shared files out again.
- Note for the owner: `verify:boundaries` measures `index-*.js` alone, so a change in rolldown's
  splitting moves it by about 18 kB without any change in what loads. Proposed to record the
  first-load total beside it from wave 3 on (a plan change, the owner's call).

### Wave sync (2026-10-26)

`documentalist` (e324a99, change set part Q; part P marked applied): CONTRACT 9.0.0 → 10.0.0
(P8, gate CK). P1–P5 with P3b and D430's clock, P6, P7 applied; the code meets every signed
sentence. Built names of chunks 10, 11, 12 and 22 written in; D436's note on raw-seed clustering in
`module_rhythm_change_draw`; the gate fix's two files in the codec's file list and
`entity_quantized_doodle`. The step sequencing (`MigrationUpgrade.hold`) confirmed within
`module_kept_session_jam_upgrade_step` and P6, now in `module_on_device_database`'s interface.
`atd check --full`: 445 atoms, 360 with an implementation, 359 OK, 85 NO_IMPL. `atd audit` run,
scoped to the 9 revised non-STABLE atoms: no collision.

Drift, none blocking (proposals in Q3, not applied): 1 `module_ranked_candidate_ordering` (REVIEW)
says the rhythm cache is sorted by rank, the code ranks once per request over the seeded cache
(same walk); 2 `rule_rhythm_change_share` (DRAFT) predates D435's "none makes a phrase"; 3
`module_stored_profile_to_levels` (STABLE) names an old file for `parseKeptIntentV1` (name only).
Observation: step 3 takes no hold; harmless while no later step reads `settings`.
Status candidates (DRAFT → REVIEW): `module_rhythm_lock_order`, `module_rhythm_change_draw`,
`module_kept_session_jam_upgrade_step`.

### Report to the owner (2026-10-26)

- Chunks 3, 10, 11, 12 and 22 merged; none moved. Chunk 22 paused once on the usage limit and was
  resumed.
- Gate passed. Entry chunk 271,179 B (+5,743 B), after the fix c6bbdba.
- The sync applied part P. CONTRACT is now 10.0.0.
- Asked:
  - the merge of `v3.2-w2` into `main`;
  - M3's v3.0 → v3.2 figure (94 % of the wait at 500 sessions);
  - recording the first-load total beside the entry figure;
  - Q3's three proposals (3 touches a STABLE atom);
  - the three status candidates.

### The owner's answers (2026-10-26)

"right now there are no true users so upgrade time isn't a problem. otherwise we're okay to proceed
on the next wave" — "you may merge into main of course".
- M3's v3.0 → v3.2 figure (94 % of the wait at 500 sessions) accepted: no real users yet.
- Wave 2 merged into `main` (not pushed). Its worktrees and branches removed.
- Carried to wave 3 (not yet answered explicitly): Q3's three proposals (3 touches a STABLE atom),
  the three status candidates, recording the first-load total beside the entry figure. Ask at wave
  3's start.
- Next: wave 3 (chunks 16, 13, 19) in a fresh session; CS before its sync. Dev-tool security batch
  (vite 8.3.5, vitest and @vitest/coverage-v8 5.0.3, lockfile undici 8.12.2, fast-uri 3.1.9,
  serialize-javascript 7.1.3) as its own unit from `main`.

## Wave 3 (2026-10-26)

Chunks 16, 13, 19 (order 16 → 13 → 19). Branch `v3.2-w3` from `main` 5591a76, worktree
`/home/bastien/work/infinite_flow-v3.2-w3`.

### The owner's answers on wave 2's leftovers (2026-10-26)

- Q3's three drift proposals: apply all three at this wave's sync (the third, on STABLE
  `module_stored_profile_to_levels`, a file name only, signed off by this answer).
- Status candidates `module_rhythm_lock_order`, `module_rhythm_change_draw`,
  `module_kept_session_jam_upgrade_step`: DRAFT → REVIEW at this wave's sync.
- Each wave gate records the first-load JS total beside the entry chunk's figure (information only;
  the 300 KiB entry budget is unchanged). Sent to `spec-writer` as a workflow delta.

### Preflight

`documentalist` (fad111f, "ATD: wave 3 preflight and captures"). No halt.
- 16: PROCEED-WITH-SIGNOFF-PENDING. `module_session_ready_phrases` (STABLE, contract) likely needs
  a wording extension at the sync (the ready phrase's intent also reads the session's lock state);
  the owner signs it off then.
- 13: PROCEED. The change shares stay as they are (tuned at L3, per the plan); tuning them would
  change `rule_rhythm_change_share` and need the owner.
- 19: PROCEED. Its "(contract, CS)" revisions are checked at the sync.

Captures: `module_session_rhythm_lock` 0.1 (16); `entity_generation_diagnostics` 1.1,
`service_generation_orchestration` 0.5 (13, the orderings' optional clock); `ui_field_dependent`,
`ui_toggle_list`, `entity_session_option_records` 0.1, `module_idle_pregeneration_queue` 0.8 (19).

Plan corrections sent to `spec-writer` before chunk 16 starts: 16's re-lock only when the locked
bars use sixteenths (C7.1); the tenser flag's condition; 16's Files (drop the seed plan, add the
session files that hold the requests) and split rule; 16's atoms and drift checks; 13's census
reads the re-lock class from the history's mark; 19's Files (`setting-defaults.ts`, new specs in
`test:e2e`), atoms and drift checks. Also two readings in the capture to confirm ("uses sixteenth
notes", a repeat leaves the re-lock pending).

Plan v19 (`spec-writer`, 85e8e22; spec D437, D438): every preflight correction applied, both
readings confirmed. New gate CR: `module_session_ready_phrases`' wording extension, signed off by
the owner at this wave's sync (chunk 16 merges first, as for CS); it blocks the sync and the merge
into `main`. The first-load total is recorded beside the entry figure (M4, workflow deltas).

### Chunks

- 16 dispatched (2026-10-26) to `coding-leader`, branch `v3.2-c16-session-rhythm-lock`.
- 16 merged (79ac60d; 84645e6 16a, 7890771 16b). Done when met item by item; corpus guard 425/425
  after each half. Gap: nothing passes the Idle lock choice into a session yet (Start and
  `startOf` pass the lock off); sent to `spec-writer` for chunk 19's Files. For the sync: new atom
  tags left off five session files at the ten-atom cap; CR's wording. Risks noted: seeds differing
  only in low bits draw alike (`rhythmChangeHash`, chunk 11; real seeds are random); no forced bend
  from Build under Tension across phrases in any seeded session; the census at the gate checks it.
- Plan v20 (`spec-writer`, c769530, spec D439): chunk 19 also wires the saved lock, allowed changes
  and allowed groups into Start and `startOf` (both still hard-code the lock off and every group);
  corpus guard on 19a; split re-cut (19a the saved choices into the session, 19b the controls).
- `documentalist` peek over chunk 19's added files: PROCEED, no sign-off. Capture
  `module_session_lock_and_groups_choices` 0.1 (069dbf5); carried in chunk 19's brief. For the
  sync: `module_idle_pregeneration_queue`'s interface names the three choices (names only).
- 13 dispatched (2026-10-26), branch `v3.2-c13-session-measurements`.
- 13 merged (94bbbe5; 7e08ec8 13a, 2d7eab6 13b). Reference machine (Ryzen 5 PRO 8640HS), 2026-10-26.
  M5 orderings share of attempt time: 2.2 % (all changes, 60/120 BPM), 0.8 % (240), 0.5 % strict,
  ~0.005 % off; 0 repeats, 0 shortfalls; slowest standalone 0.565 s of the 1.075 s reserve. Census:
  0 mismatches (9 groups × 7,952 sessions); replays kept 45/45, changed 30/30, bent 10/10. Draw
  shares 25.8–26.4 % normal, 52.4–54.2 % tenser (targets 1 in 4, 1 in 2); changed 15.5–19.1 % in
  sweep cases (0 % at Gentle, Reel, Bebop: C7.3's known limit). Forced bends 2.5 % strict with
  Tension across phrases (Lift 5.5 %), 0.5 % without; Build → Lift does bend (52 of 523 strict).
  Shares untouched (for L3). For the gate: `test:sweep` (deadline-sweep changed). For the sync:
  the two atoms' clock names. Risk: no sweep session re-locks; only chunk 16's tests cover it.
- 19 dispatched, then merged (2d375f3; f0db02d 19a, f07f0d3 19b). Done when met item by item;
  corpus guard 425/425; Playwright on its specs 104/104, axe clean; landscape phone run clean.
  Deviations: holders in a new `workspace-session-lock-choices.ts` (ten-atom cap); Vary settings'
  availability a new controller reading (`workspace-vary-settings-availability.ts`), judged part of
  chunk 15's check; the three records at data version 1, no upgrade step. Question for `ux-writer`:
  a read-only toggle list's cue for assistive technology. For the sync: revise
  `rule_pregeneration_discarded_on_change`, the CS halves; fill the interface names of
  `entity_session_option_records`, `module_session_lock_and_groups_choices`,
  `module_idle_pregeneration_queue`. Hand checks H2 and H3 after the wave.

### Wave gate (2026-10-26)

Reference machine (Ryzen 5 PRO 8640HS, idle), on `v3.2-w3`.
- First `npm run quality`: unit 530 files / 8,327 tests pass; Playwright 591 passed, 1 skipped,
  4 failed, all in `key-and-mode-marks.spec.ts`: its no-note locator also matched Vary settings'
  v3.2 note (chunk 19b, wording as the design gives it, "…what your preset is meant for…"). Fixed
  in the test, scoped to the Written key and Collection fields (`coding-executor`, fae3b84).
- `npm run test:sweep`: 9 files / 83 tests pass (before the fix; the fix touched one e2e spec).
- Second `npm run quality` after fae3b84: pass (unit 8,327; Playwright 595 passed, 1 skipped).
- Bundle: entry chunk 282,098 B (+10,919 B on wave 2's 271,179; budget 307,200 B, 25,102 B left);
  first-load JS 329,885 B over 16 files (+10,921 B on 318,964; spec D438). The two moved together:
  real growth (chunks 16 and 19's session and controls code), not a re-split.
- No dependency changed (`package.json`: the `test:e2e` list only), so no `security-advisor`
  post-change check.

### Wave sync (2026-10-26)

`documentalist` (1d608c0; change set parts R, S; Q3 marked applied). Applied: Q3's three proposals
(`module_stored_profile_to_levels` 0.4, a file name, no bump); DRAFT → REVIEW for
`module_rhythm_lock_order`, `module_rhythm_change_draw`, `module_kept_session_jam_upgrade_step`;
chunk 19's revision `rule_pregeneration_discarded_on_change` 0.5; built names for chunks 13, 16, 19.
CS check (chunk 19's two contract rules, session mode): met. Tags off the five capped session files:
coverage adequate. `atd check` 19/19, `atd lint` pass, `atd audit` on 16 atoms: no collision.

Drafted, not applied (the owner's word): CR as part R (R1 `module_session_ready_phrases` 0.2, R2
CONTRACT 10.0.0 → 11.0.0, MAJOR); S3 `module_settings_mutation` name-only fix (STABLE); S3 Vary
settings' availability under `module_session_vary_settings_flag` 0.3. Status candidates DRAFT →
REVIEW: `module_session_rhythm_lock`, `module_session_lock_and_groups_choices`,
`entity_session_option_records`, `ui_toggle_list`, `ui_field_dependent`.
