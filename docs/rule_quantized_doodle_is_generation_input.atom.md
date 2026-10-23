---
id: rule_quantized_doodle_is_generation_input
status: DRAFT
version: 0.2
priority: 1
parents:
  - [[req_jam]]
layer: BUSINESS
human_name: The Quantized Doodle Is a Generation Input
tags: [v3, release-v3.2, session, jam, privacy, storage]
dependents:
  - [[entity_quantized_doodle]]
  - [[entity_steering_block]]
  - [[module_kept_session_jam_upgrade_step]]
  - [[rule_earlier_sessions_open_without_doodle]]
type: RULE
---

# The Quantized Doodle Is a Generation Input

## INTENT
Let the doodle travel with the music it generated, since the player gave it to the app on purpose.

## THE RULE / LOGIC
The quantized doodle, snapped and reduced to one line, is a generation input the player gave on purpose, not a record of their playing. It travels with the music: in a kept Jam session (without the opt-in that keeping played notes needs), the review's doodle section and the generated-notes export. What reaches the generator is derived from it: the controls read from it and the steering block, which hold rhythm positions and kinds of move, not the doodle's pitches, apart from the last note phrase 1 joins from. The phrase replay key carries that steering block as the generator read it, not the quantized doodle. Neither form of the doodle is ever sent anywhere. Keeping the quantized doodle is what lets a kept Jam session show its doodle after a reload and offer Jam again on this doodle.

## TECHNICAL INTERFACE
The quantized doodle is stored with its kept Jam session and written into the generated-notes export; generation requests and replay keys hold the steering block instead.

## EXPECTATION
- A kept Jam session holds its quantized doodle whether or not played notes are kept.
- No generation request and no replay key holds the quantized doodle.
- No network request ever carries a doodle in either form.
