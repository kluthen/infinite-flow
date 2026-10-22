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
