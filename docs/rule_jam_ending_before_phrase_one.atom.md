---
id: rule_jam_ending_before_phrase_one
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.1
priority: 1
dependents: []
human_name: A Jam Ended Before Phrase 1 Leaves Nothing
tags: [v3, release-v3.2, session, jam, session-end]
parents:
  - [[req_jam]]
---

# A Jam Ended Before Phrase 1 Leaves Nothing

## INTENT
Treat a Jam that never reached its phrases like a session ended during its count-in.

## THE RULE / LOGIC
A Jam that ends before phrase 1 sounds, by Stop, a hidden tab, a staff that can no longer be shown, a lost controller, or no doodle note, ends as a session ended during its count-in: back to Idle, no review, nothing kept. The doodle is not held.

## TECHNICAL INTERFACE
A Jam end before phrase 1 returns to Idle without a review.

## EXPECTATION
- Stop, a hidden tab or a staff that can no longer be shown before phrase 1 sounds returns to Idle with no review, nothing kept and no doodle held.
