---
id: rule_controller_attached_definition
status: DRAFT
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
notes: Recorded 2026-10-01 in v2 chunk 12 (MIDI input); rule text unchanged. A selected input whose port is present but not open (for example, its open failed) is not attached, since attachment requires an open port; it is not lost either, since its port has not reported disconnected. Chunk 12 reads it as away with the selection kept, and the port's next input change (a replug) tries to open it again, a technical choice recorded in docs/midi-input.md AWAITING THE OWNER ACCEPTANCE. No screen shows the controller state yet.
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
