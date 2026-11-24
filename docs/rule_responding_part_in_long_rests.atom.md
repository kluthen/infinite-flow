---
id: rule_responding_part_in_long_rests
status: DRAFT
type: RULE
layer: BUSINESS
priority: 1
tags: [v4, release-v4.0, session, audio, accompaniment]
parents:
  - [[req_responding_part]]
dependents: []
version: 0.1
human_name: The Responding Part Plays Only in Rests of a Beat or More
---

# The Responding Part Plays Only in Rests of a Beat or More

## INTENT
Answer the lead only where it leaves room for an answer.

## THE RULE / LOGIC
The responding part plays a fill in every lead rest at least one beat long, and nowhere else.

## TECHNICAL INTERFACE
The rests are read from the phrase's timeline.

## EXPECTATION
- Every lead rest of at least one beat holds one fill, unless its rules can place no note.
- No fill note sounds outside such a rest.
