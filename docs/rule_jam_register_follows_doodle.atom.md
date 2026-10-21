---
id: rule_jam_register_follows_doodle
status: DRAFT
human_name: A Jam's Register Is Read From the Doodle's Last Note
dependents: []
type: RULE
layer: BUSINESS
version: 0.2
tags: [v3, release-v3.2, session, jam, register]
parents:
  - [[req_jam]]
priority: 1
---

# A Jam's Register Is Read From the Doodle's Last Note

## INTENT
Let the phrases continue in the part of the instrument where the player left off.

## THE RULE / LOGIC
Jam's register control is read from the doodle: it is the register window, Low, Middle or High, that holds the doodle's last note, the nearest by its centre when several do, and Varying when none does, Varying then resolving as it does for any session. Every doodle shows a register, one of a single note included.

## TECHNICAL INTERFACE
Register resolution for a Jam takes the doodle's last note as an input.

## EXPECTATION
- A Jam's register is the window holding the doodle's last note, the nearest by its centre when several do, and Varying when none does.
- Every doodle, one of a single note included, sets the register.
