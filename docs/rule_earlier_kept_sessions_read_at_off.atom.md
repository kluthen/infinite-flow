---
id: rule_earlier_kept_sessions_read_at_off
status: DRAFT
version: 0.1
priority: 1
tags: [v3, release-v3.3, storage, review, chords]
type: RULE
layer: BUSINESS
human_name: Sessions Kept Before Seventh Chords Read at Off
parents:
  - [[req_seventh_chords_level]]
dependents: []
---

# Sessions Kept Before Seventh Chords Read at Off

## INTENT
Let every session kept before seventh chords existed open, review and export as it always did.

## THE RULE / LOGIC
A session kept before the Seventh chords level existed, a Jam session included, is carried over with the level at Off in each of its phrases' reproduction inputs; its timelines, its chords (all triads), its review and its exports stay exactly as they were.

## TECHNICAL INTERFACE
Each phrase of a session kept before the level existed holds the level at Off once carried over.

## EXPECTATION
- A session kept before the level existed, a Jam session included, opens, reviews and exports exactly as it did, each of its phrases with the level at Off.
