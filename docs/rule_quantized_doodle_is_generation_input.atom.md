---
id: rule_quantized_doodle_is_generation_input
status: DRAFT
version: 0.1
priority: 1
parents:
  - [[req_jam]]
layer: BUSINESS
human_name: The Quantized Doodle Is a Generation Input
tags: [v3, release-v3.2, session, jam, privacy, storage]
dependents: []
type: RULE
---

# The Quantized Doodle Is a Generation Input

## INTENT
Let the doodle travel with the music it generated, since the player gave it to the app on purpose.

## THE RULE / LOGIC
The quantized doodle, snapped and reduced to one line, is a generation input the player gave on purpose, not a record of their playing. It travels with the music: in each Jam phrase's generation request, the phrase replay key printed on the browser's console, a kept Jam session (without the opt-in that keeping played notes needs), the review's doodle section and the generated-notes export. It is never sent anywhere. Keeping it is what lets a kept Jam session keep its doodle after a reload and a replay key reproduce a Jam phrase.

## TECHNICAL INTERFACE
The quantized doodle is stored with its kept Jam session and written into the generated-notes export.

## EXPECTATION
- A kept Jam session holds its quantized doodle whether or not played notes are kept.
- No network request ever carries a doodle in either form.
