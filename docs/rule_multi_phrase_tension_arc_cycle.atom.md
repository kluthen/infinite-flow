---
id: rule_multi_phrase_tension_arc_cycle
status: DRAFT
dependents: []
type: RULE
layer: BUSINESS
priority: 1
tags: [v2, release-v2.2, session, tension]
parents:
  - [[req_multi_phrase_tension_arc]]
version: 0.1
human_name: Multi-Phrase Tension Arc Four-Phrase Cycle
---

# Multi-Phrase Tension Arc Four-Phrase Cycle

## INTENT
Make the multi-phrase tension arc rise and fall over a fixed four-phrase cycle around the player's chosen tension arc.

## THE RULE / LOGIC
While the multi-phrase tension arc is on, it runs in groups of four phrases (16 measures), counted from phrase 1 of the session. The first phrase of each group is generated with the chosen tension arc (so phrase 1, generated at Idle, already fits), the second one step tenser, the third with the chosen tension arc again, and the fourth one step calmer. The steps follow the order Settled, Lift, Build, Edge, from calmest to tensest, and never go past either end: a step tenser from Edge stays Edge, and a step calmer from Settled stays Settled. The tension-arc setting keeps showing the player's choice; only what each phrase is generated with changes. When the settings-mutation flag changes the tension arc, the cycle steps around whatever value is then in effect.

## TECHNICAL INTERFACE
The tension arc each session phrase is generated with is derived from the tension arc in effect and the phrase's position in its group of four; the tension-arc control keeps showing the player's choice.

## EXPECTATION
- With the flag on, phrases 1 to 4 of each group are generated with the tension arc in effect, one step tenser, the tension arc in effect, and one step calmer, never past Settled or Edge.
- The tension-arc control shows the player's choice throughout, whatever each phrase is generated with.
- After the settings-mutation flag changes the tension arc, the cycle steps around the new value.
- The same seeds give the same session.
