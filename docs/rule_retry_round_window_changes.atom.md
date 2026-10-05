---
id: rule_retry_round_window_changes
status: REVIEW
type: RULE
layer: BUSINESS
version: 0.1
priority: 1
human_name: Window Changes During an Idle Retry Round
dependents:
  - [[module_idle_fit_round]]
  - [[module_idle_room_notice]]
tags: [v2, release-v2.0, idle, notation, v1-change]
parents:
  - [[rule_idle_phrase_too_dense_is_replaced]]
  - [[rule_too_dense_notice_retry_rounds]]
---

# Window Changes During an Idle Retry Round

## INTENT
Keep an Idle retry round running through window changes instead of restarting or queuing rounds.

## THE RULE / LOGIC
A retry round at Idle (replacing a phrase too dense for the staff) carries on through changes to the window's size. The window getting wider while a round runs neither restarts it nor queues another round after it: each remaining attempt is generated with the note density the window gives when that attempt is generated, and checked against the window's size when it is drawn; if the round fails, the notice stays until the next wider window, setting change or regeneration by hand. A single widening that lands inside a round's brief run can therefore look as if it did nothing; this is accepted, since a player dragging a window edge keeps widening after the round ends. A narrowing below the tablet-landscape layout's width during a round steps its remaining attempts down to Eighth note density, and the round carries on. The one exception is a widening that makes the rhythm-settings combination one that blocks generation: it stops the round at once, under the unsupported-settings behaviour.

## TECHNICAL INTERFACE
Each attempt of a running round reads the window's width when it is generated and the window's size when it is drawn.

## EXPECTATION
- A wider window during a round neither restarts it nor starts another after it; the round carries on.
- Each attempt uses the note density the window gives when that attempt is generated and is checked against the window's size when drawn.
- A narrowing below the tablet-landscape layout's width during a round steps its remaining attempts down to Eighth.
