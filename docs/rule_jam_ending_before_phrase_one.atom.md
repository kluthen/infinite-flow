---
id: rule_jam_ending_before_phrase_one
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.2
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
A Jam that ends before phrase 1 sounds, by Stop, a hidden tab, a staff that can no longer be shown, a lost controller, or no doodle note, ends as a session ended during its count-in: back to Idle, no review, nothing kept. A fresh Jam's doodle is not kept. A Jam on a kept doodle that ends this way keeps that doodle, and Idle shows the same phrase 1 again.

## TECHNICAL INTERFACE
A Jam end before phrase 1 returns to Idle without a review.

## EXPECTATION
- Stop, a hidden tab or a staff that can no longer be shown before phrase 1 sounds returns to Idle with no review and nothing kept.
- A fresh Jam ended this way keeps no doodle; a Jam on a kept doodle ended this way keeps it, with the same phrase 1 on screen.
