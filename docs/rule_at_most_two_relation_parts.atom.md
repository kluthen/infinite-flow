---
id: rule_at_most_two_relation_parts
status: REVIEW
type: RULE
layer: BUSINESS
version: 0.1
priority: 1
tags: [v4, release-v4.0, session, audio, accompaniment]
parents:
  - [[req_accompaniment_parts]]
human_name: At Most Two Relation Parts Sound at Once
dependents: []
---

# At Most Two Relation Parts Sound at Once

## INTENT
Limit how much sounds against the lead, so reading stays manageable.

## THE RULE / LOGIC
Of the three parts that relate to the lead's notes (the highlighting, contrasting and responding parts), at most two sound at any moment. This holds by their own rules: the highlighting part sounds only while a lead note sounds and the responding part only in the lead's rests, so those two never overlap, and the contrasting part may sound with either. The drum part and the backing are the foundation and are not counted.

## TECHNICAL INTERFACE
No setting changes this limit; it follows from the parts' rules.

## EXPECTATION
- At no moment do all three of the highlighting, contrasting and responding parts sound.
- At no moment do the highlighting part and the responding part both sound.
