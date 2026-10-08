---
id: rule_jam_ending_before_phrase_one
status: DRAFT
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
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
