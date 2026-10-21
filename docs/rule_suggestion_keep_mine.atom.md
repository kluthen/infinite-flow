---
id: rule_suggestion_keep_mine
status: DRAFT
type: RULE
layer: BUSINESS
human_name: Keep Mine Declines the Suggestion for Good
version: 0.2
priority: 1
tags: [v3, release-v3.2, jam, key-and-mode-suggestion]
parents:
  - [[req_key_and_mode_suggestion]]
dependents: []
---

# Keep Mine Declines the Suggestion for Good

## INTENT
Respect a declined suggestion: never offer it again for that doodle.

## THE RULE / LOGIC
Keep mine changes nothing, and that doodle's suggestion is not offered again, since the same doodle would give the same answer. The decline is kept with the kept Jam session, so its review, and a doodle Jam mode keeps from it, do not offer it again, after a reload included.

## TECHNICAL INTERFACE
A decline is stored with the kept Jam session.

## EXPECTATION
- After Keep mine, no setting changes and the suggestion is never offered again for that doodle, after a reload included.
