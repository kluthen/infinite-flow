---
id: rule_multi_phrase_tension_arc_cycle
status: STABLE
dependents:
  - [[module_tension_arc_cycle]]
type: RULE
layer: BUSINESS
priority: 1
tags: [v2, release-v2.0, part-v2.2, session, tension]
parents:
  - [[req_multi_phrase_tension_arc]]
version: 0.2
human_name: Multi-Phrase Tension Arc Four-Phrase Cycle
notes: Revised 2026-10-08 to version 0.2 (previous version 0.1) with the explicit confirmation of the product owner, given on 2026-10-08 (spec D246), of contract change set part A (docs/release/v3.1-v3.2-intent-change-set.md, A14), together with the CONTRACT 3.0 MAJOR bump; stays STABLE. Wording only: phrase 1 may be generated at Idle or, in a Jam, after the doodle; the cycle still counts from phrase 1. Earlier: Status REVIEW to STABLE on 2026-10-07 with the product owner's approval, together with the matching CONTRACT 1.5 MINOR bump. Backed by the v2.0 gate tests linked to it, among them tests/unit/session/tension-arc-cycle.spec.ts (the group-of-four cycle, never past Settled or Edge), tests/unit/session/session-engine-tension-arc-generation.spec.ts (the cycle around a mutated tension arc, and same seeds giving the same session with the flag alone, added in 4dbf0e2) and tests/e2e/session/session-tension-across-phrases.spec.ts (the Tension control keeps showing the choice).
---

# Multi-Phrase Tension Arc Four-Phrase Cycle

## INTENT
Make the multi-phrase tension arc rise and fall over a fixed four-phrase cycle around the player's chosen tension arc.

## THE RULE / LOGIC
While the multi-phrase tension arc is on, it runs in groups of four phrases (16 measures), counted from phrase 1 of the session. The first phrase of each group is generated with the chosen tension arc (so phrase 1, whether generated at Idle or, in a Jam, after the doodle, already fits), the second one step tenser, the third with the chosen tension arc again, and the fourth one step calmer. The steps follow the order Settled, Lift, Build, Edge, from calmest to tensest, and never go past either end: a step tenser from Edge stays Edge, and a step calmer from Settled stays Settled. The tension-arc setting keeps showing the player's choice; only what each phrase is generated with changes. When the settings-mutation flag changes the tension arc, the cycle steps around whatever value is then in effect.

## TECHNICAL INTERFACE
The tension arc each session phrase is generated with is derived from the tension arc in effect and the phrase's position in its group of four; the tension-arc control keeps showing the player's choice.

## EXPECTATION
- With the flag on, phrases 1 to 4 of each group are generated with the tension arc in effect, one step tenser, the tension arc in effect, and one step calmer, never past Settled or Edge.
- The tension-arc control shows the player's choice throughout, whatever each phrase is generated with.
- After the settings-mutation flag changes the tension arc, the cycle steps around the new value.
- The same seeds give the same session.
