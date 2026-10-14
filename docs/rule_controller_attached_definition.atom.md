---
id: rule_controller_attached_definition
status: REVIEW
dependents:
  - [[rule_controller_loss_mid_session]]
  - [[rule_same_controller_reattaches]]
layer: BUSINESS
version: 0.1
priority: 1
human_name: When a Controller Counts as Attached or Lost
tags: [v2, release-v2.0, midi]
parents:
  - [[req_midi_controller_input]]
type: RULE
---

# When a Controller Counts as Attached or Lost

## INTENT
Define exactly when a controller counts as connected, and when it counts as lost.

## THE RULE / LOGIC
A controller counts as connected ("attached") once MIDI permission is granted, one input is selected (the player's pick, or the only device present), and that input's port is present and open; no note has to be played first. This is what "with a controller attached" means for the silence timeout, for starting a session from MIDI and for adaptive tempo. The transposition check is a separate step that follows. A controller counts as lost when that port reports it has disconnected.

## TECHNICAL INTERFACE
Attachment is derived from permission, selection and the selected port's state.

## EXPECTATION
- A controller counts as attached exactly when permission is granted, one input is selected and its port is present and open, whether or not a note has been played.
- A controller counts as lost exactly when its port reports disconnected.
