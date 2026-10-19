# Infinite Flow v3.1 — Wave log

The execution record of the [v3.1 build plan](build-plan-v3.1.md), kept by the wave driver: what
each wave preflight found, each gate's results and figures, what was moved and why, and each
report to the owner. Rulings live in [`decisions.md`](../../decisions.md); the plan holds only the
current state.

## Wave 0 (2026-10-19)

Chunks 0 (intent re-sync), 2 (baselines) and 3 (measurement tools). Branch `v3.1-w0`, worktree
`../infinite_flow-v3.1-w0`, cut from `main` 1d6dee3 (the approved plan v4 with the v3.1 design
freeze, ux D324). `main` then received the `v4-accompaniment-research` merge (3861edc, D259 and
D260) and a lexicon follow-up (b2ddec2), was pushed, and was merged into the wave branch
(f8b9793).

Before the preflight: the owner approved plan v4, including the transitional state of waves 0–3
on `main` while T1 waits (spec D357); `spec-writer` checked master spec Part B's code facts
(B12) against the code and raised Part B to v1.1 (spec D358), opening O231.

### Preflight

`documentalist` ran the full pass over the three chunks without `atd audit`. `atd lint` passes;
`atd check --full` shows only the expected NO_IMPL rows (DRAFT v3.1/v3.2 atoms, CONTRACT, VISION
and a few requirement atoms), none in wave 0's files. No chunk names an architecture capture, so
no atom was written.

| Chunk | Verdict               | Governing atoms                                                                                                                                        | Open before code                                                                                                                      |
| ----- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | PROCEED, inputs ready | the 38 `release-v3.1` and 17 `changes-in-v3.1` atoms; `contract_infinite_flow_first_release` (STABLE, 6.3.1)                                           | none; the chunk may find a STABLE or CONTRACT atom that needs the owner                                                               |
| 2     | PROCEED               | none (test plumbing); backs `rule_seeded_phrase_reproduction`, `module_phrase_replay_key`, `rule_neutral_and_jazz_figure_levels` without changing them | none; the new corpus spec gets its `@test-link` in chunk 8, so the wave sync treats it as deferred                                    |
| 3     | PROCEED               | none (measurement)                                                                                                                                     | none; keep the `@test-link [[rule_look_ahead_deadline]]` tags of the sweep specs if they are touched (they are not on its Files line) |

Plan corrections, applied by `spec-writer` before the first chunk (5b5d55f): chunk 0's Atoms line
gives the contract at 6.3.1 and checks that the CONTRACT 3.0 wordings still hold in it; chunk 2's
Files line names `scripts/record-replay-key-corpus.mjs` (it writes only the `ifk1-v2.0.json`
corpus, which must stay unchanged); the Read-first box counts about fifty files that read the
profile (48 on d007b27).

Open for the owner, not blocking wave 0: **O231**, the entry chunk's 230 B of headroom under the
224 KiB budget, due before wave 1's gate; **T1**, asked again before wave 4.

### Chunks
