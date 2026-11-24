---
id: rule_responding_part_register
status: DRAFT
type: RULE
layer: BUSINESS
priority: 1
version: 0.1
human_name: A Fill Stays Inside the Lead's Window
tags: [v4, release-v4.0, session, audio, accompaniment]
parents:
  - [[req_responding_part]]
dependents: []
---

# A Fill Stays Inside the Lead's Window

## INTENT
Keep each answer in the lead's own register, where it sounds like a reply.

## THE RULE / LOGIC
Every fill note lies inside the lead's register window. A note that would leave the window reverses the shape's direction.

## TECHNICAL INTERFACE
The window is the phrase's resolved register window.

## EXPECTATION
- No fill note is outside the lead's register window.
