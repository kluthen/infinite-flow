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
