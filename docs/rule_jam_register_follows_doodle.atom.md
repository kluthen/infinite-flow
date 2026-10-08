---
id: rule_jam_register_follows_doodle
status: DRAFT
human_name: A Jam's Register Follows the Doodle
dependents: []
type: RULE
layer: BUSINESS
version: 0.1
tags: [v3, release-v3.2, session, jam, register]
parents:
  - [[req_jam]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
priority: 1
---

# A Jam's Register Follows the Doodle

## INTENT
Let the phrases continue in the part of the instrument where the player left off.

## THE RULE / LOGIC
With Register on Varying, a Jam takes the register window holding the doodle's last note, the nearest by its centre when several do; when none does, Varying resolves as it does for any session. With Low, Middle or High, the window is the player's.

## TECHNICAL INTERFACE
Register resolution for a Jam takes the doodle's last note as an input.

## EXPECTATION
- Under Varying, a Jam's window holds the doodle's last note whenever a window does.
