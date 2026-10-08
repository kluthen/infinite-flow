---
id: rule_suggestion_shown_after_jam_only
status: DRAFT
tags: [v3, release-v3.2, jam, key-and-mode-suggestion]
parents:
  - [[req_key_and_mode_suggestion]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
priority: 1
human_name: The Suggestion Is Shown Only After a Jam
dependents: []
type: RULE
layer: BUSINESS
version: 0.1
---

# The Suggestion Is Shown Only After a Jam

## INTENT
Never ask the player anything while they play.

## THE RULE / LOGIC
A running session never asks the player for anything, so the suggestion is never offered during a Jam. It is computed when the doodle ends, during the generation measure, and nothing is shown then. It is shown in the review of that Jam, beside the doodle section: the drawn key and mode, in written pitch, with Use it, Keep mine and Jam again on this doodle. In the review of a kept Jam session it is recomputed against the player's current selection and shown while that selection is not among the kept candidates and the player has not declined it. At Idle with a held doodle it stays shown until the player answers it or the doodle is dropped. Only the drawn answer is shown. The Jam that produced the doodle is always continued in the player's own key and mode; the suggestion serves the next Jam on that doodle.

## TECHNICAL INTERFACE
The suggestion appears in a Jam's review, a kept Jam session's review and at Idle with a held doodle.

## EXPECTATION
- No suggestion appears during a Jam.
- The suggestion appears only in a Jam's review, a kept Jam session's review, or at Idle with a held doodle, and shows one answer.
