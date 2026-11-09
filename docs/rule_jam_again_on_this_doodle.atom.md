---
id: rule_jam_again_on_this_doodle
status: REVIEW
layer: BUSINESS
priority: 1
tags: [v3, release-v3.2, session, jam, review]
parents:
  - [[req_jam]]
type: RULE
version: 0.4
human_name: Jam Again on This Doodle
dependents:
  - [[module_kept_doodle]]
  - [[rule_held_doodle_dropped_on_change]]
  - [[rule_held_doodle_in_memory_only]]
  - [[rule_held_doodle_phrase_one_at_idle]]
  - [[rule_jam_on_held_doodle_skips_capture]]
---

# Jam Again on This Doodle

## INTENT
Let the player go round again on the idea of a kept Jam session, after a reload too.

## THE RULE / LOGIC
Jam again on this doodle is offered in the review of every Jam session, in either mode: the review that follows a Jam, and the review of a kept Jam session opened from the session list. Choosing it leaves the review for Jam mode's Idle, entering Jam mode if needed, with that session's doodle kept in place of any other; in the review that follows a Jam, whose doodle Jam mode keeps already, it does what Close review does, focus included. Without a controller it still opens Jam mode with the doodle kept, and Jam's Start says why it is unavailable. Choosing it does not answer a key and mode suggestion.

## TECHNICAL INTERFACE
The doodle section of every Jam session's review, the one that follows a Jam and a kept Jam session's opened from the session list, offers Jam again on this doodle.

## EXPECTATION
- Jam again on this doodle appears in the review that follows every Jam and in the review of every kept Jam session opened from the session list, in session mode and in Jam mode.
- Choosing it leads to Jam mode's Idle with that doodle kept, entering Jam mode if needed, with or without a controller; in the review that follows a Jam it closes the review as Close review does, the same doodle kept.
- Choosing it leaves a key and mode suggestion unanswered.
