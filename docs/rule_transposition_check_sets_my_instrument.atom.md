---
id: rule_transposition_check_sets_my_instrument
status: DRAFT
priority: 1
tags: [v3, release-v3.0, midi, instrument-profile]
parents:
  - [[req_my_instrument]]
  - [[rule_controller_connects_between_sessions]]
dependents: []
type: RULE
layer: BUSINESS
human_name: Transposition Check Can Set My Instrument
notes: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed v3 revision of the vision is confirmed.
version: 0.1
---

# Transposition Check Can Set My Instrument

## INTENT
Turn a transposition mismatch found by the check into a lasting fix, in one step.

## THE RULE / LOGIC
From v3.0, when the controller-transposition check finds anything other than a match, it offers one action: use this for my instrument. It sets My instrument's transposition so that the written notes match what the controller plays, creating My instrument from the selected profile if there is none yet. The player confirms it once; it is then saved, and the check need not be redone on later visits. The app still applies no offset to played notes: they are compared at exactly the concert pitch received; changing the instrument's transposition is what makes the written part match the controller.

## TECHNICAL INTERFACE
On a non-matching result, the check offers use this for my instrument, which asks for one confirmation and saves the resulting transposition.

## EXPECTATION
- After one confirmation, the action sets the transposition so that the written notes match the controller, and the result survives a reload.
- Played notes are still compared at the concert pitch received.
