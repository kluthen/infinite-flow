---
id: rule_suggestion_shown_after_jam_only
status: DRAFT
tags: [v3, release-v3.2, jam, key-and-mode-suggestion]
parents:
  - [[req_key_and_mode_suggestion]]
priority: 1
human_name: The Suggestion Is Shown Only After a Jam
dependents: []
type: RULE
layer: BUSINESS
version: 0.2
---

# The Suggestion Is Shown Only After a Jam

## INTENT
Never ask the player anything while they play.

## THE RULE / LOGIC
A running session never asks the player for anything, so the suggestion is never offered during a Jam. It is computed when the doodle ends, during the generation measure, and nothing is shown then. It is shown in the review of that Jam, beside the doodle section: the drawn key and mode, in written pitch, with Use it and Keep mine. In the review of a kept Jam session it is recomputed against Jam's current key and mode and shown while they are not among the kept candidates and the player has not declined it. At Jam mode's Idle with a kept doodle it stays shown until the player answers it or the doodle goes, and it goes with the doodle. Only the drawn answer is shown; the other kept candidates are not listed. The Jam that produced the doodle is always continued in Jam's own key and mode; the suggestion serves the next Jam on that doodle.

## TECHNICAL INTERFACE
The suggestion appears in a Jam's review, a kept Jam session's review and at Jam mode's Idle with a kept doodle.

## EXPECTATION
- No suggestion appears during a Jam.
- The suggestion appears only in a Jam's review, a kept Jam session's review, or at Jam mode's Idle with a kept doodle, and shows one answer with Use it and Keep mine.
