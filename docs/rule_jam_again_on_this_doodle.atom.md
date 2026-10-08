---
id: rule_jam_again_on_this_doodle
status: DRAFT
layer: BUSINESS
priority: 1
tags: [v3, release-v3.2, session, jam, review]
parents:
  - [[req_jam]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls within the vision since version 0.8 (2026-10-08, spec D246). Revised the same day (version 0.1 to 0.2) after the spec settled that a doodle captured by a fresh Jam is never held by itself.
type: RULE
version: 0.2
human_name: Jam Again on This Doodle
dependents:
  - [[rule_held_doodle_dropped_on_change]]
  - [[rule_held_doodle_in_memory_only]]
  - [[rule_held_doodle_phrase_one_at_idle]]
  - [[rule_jam_on_held_doodle_skips_capture]]
---

# Jam Again on This Doodle

## INTENT
Let the player go round again on the same idea, as often as they like.

## THE RULE / LOGIC
Jam again on this doodle is offered in the review of the Jam that just ended and in the review of any kept Jam session. Choosing it leaves the review for Idle with that doodle held, and turns the Jam switch on if it was off. Like the switch, it needs a controller: without one it is unavailable and says why. Choosing it does not answer a key and mode suggestion. It is the only way a doodle becomes held: a doodle captured by a fresh Jam, one started without a held doodle, is never held by itself.

## TECHNICAL INTERFACE
The review of a Jam offers Jam again on this doodle.

## EXPECTATION
- Jam again on this doodle appears in the review of the Jam just ended and of every kept Jam session, and is unavailable with its reason without a controller.
- Choosing it leads to Idle with the doodle held and Jam on.
- After a fresh Jam, Idle holds no doodle unless the player chooses Jam again on this doodle.
