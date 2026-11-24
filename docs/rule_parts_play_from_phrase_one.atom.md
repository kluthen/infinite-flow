---
id: rule_parts_play_from_phrase_one
status: DRAFT
dependents: []
type: RULE
layer: BUSINESS
parents:
  - [[req_accompaniment_parts]]
version: 0.1
priority: 1
human_name: The Parts Play From Phrase 1 of a Running Session
tags: [v4, release-v4.0, session, audio, accompaniment]
---

# The Parts Play From Phrase 1 of a Running Session

## INTENT
Play the parts only over the phrases the player is reading.

## THE RULE / LOGIC
The parts play in a running session only, in session mode and in Jam mode, from phrase 1's first beat, each phrase at its own tempo; never before phrase 1 (the count-in, a fresh Jam's capture, generation measure, extended wait or read-in measure), and never at Idle or in the review. They end with the session, faded out with the backing.

## TECHNICAL INTERFACE
In a running session in either mode, the parts switched on sound from phrase 1's first beat.

## EXPECTATION
- No part's note sounds before phrase 1's first beat.
- No part's note sounds at Idle or in the review.
- Each phrase's parts play at that phrase's tempo.
