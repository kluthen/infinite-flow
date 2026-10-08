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
notes: Revised 2026-10-07 to version 0.2 (still DRAFT) by the re-sync to the v3.0 master spec v1.3, approved by the product owner: the offset found maps to the named interval, octaves included, and My instrument's written range is kept. Earlier: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls within the vision since version 0.8 (2026-10-08, spec D246).
version: 0.2
---

# Transposition Check Can Set My Instrument

## INTENT
Turn a transposition mismatch found by the check into a lasting fix, in one step.

## THE RULE / LOGIC
From v3.0, when the controller-transposition check finds anything other than a match, it offers one action: use this for my instrument. It sets My instrument's transposition so that the written notes match what the controller plays, the offset in semitones mapping to its named interval, octaves included, and creates My instrument from the selected profile if there is none yet; My instrument's written range is kept. The player confirms it once; it is then saved, and the check need not be redone on later visits. The app still applies no offset to played notes: they are compared at exactly the concert pitch received; changing the instrument's transposition is what makes the written part match the controller.

## TECHNICAL INTERFACE
On a non-matching result, the check offers use this for my instrument, which asks for one confirmation and saves the resulting transposition.

## EXPECTATION
- After one confirmation, the action sets the transposition, as the named interval matching the offset found, so that the written notes match the controller, and the result survives a reload.
- My instrument's written range is the same before and after the action.
- Played notes are still compared at the concert pitch received.
