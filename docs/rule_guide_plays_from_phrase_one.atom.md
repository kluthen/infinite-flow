---
id: rule_guide_plays_from_phrase_one
status: DRAFT
type: RULE
version: 0.1
priority: 1
tags: [v3, release-v3.2, session, audio]
parents:
  - [[req_guide_playback]]
human_name: The Guides Play From Phrase 1 of a Running Session
layer: BUSINESS
dependents: []
---

# The Guides Play From Phrase 1 of a Running Session

## INTENT
Play the guides only over the phrases the player is reading.

## THE RULE / LOGIC
The guides play in a running session only, in both modes, from phrase 1's first beat, every phrase at its own tempo; never before phrase 1 (the count-in, a fresh Jam's capture, generation measure, extended wait or read-in measure), and never at Idle or in the review.

## TECHNICAL INTERFACE
In a running session in either mode, the guides sound from phrase 1's first beat, each phrase at its own tempo.

## EXPECTATION
- No guide note sounds before phrase 1's first beat: not in the count-in, a fresh Jam's capture, its generation measure, an extended wait or a read-in measure.
- No guide note sounds at Idle or in the review.
- Each phrase's guide notes play at that phrase's tempo.
