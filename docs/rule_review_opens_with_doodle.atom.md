---
id: rule_review_opens_with_doodle
status: DRAFT
dependents: []
layer: BUSINESS
version: 0.1
priority: 1
human_name: A Jam's Review Opens With the Doodle
tags: [v3, release-v3.2, session, jam, review]
parents:
  - [[req_jam]]
type: RULE
---

# A Jam's Review Opens With the Doodle

## INTENT
Show the player what the app heard before the phrases it wrote from it.

## THE RULE / LOGIC
The review of a Jam opens with the doodle, before phrase 1, as its own labelled section, engraved from the quantized doodle in written pitch, in the key signature the Jam started with: what the app heard. It has no phrase number and no chord symbols, and cannot be a favorite. Its notes are not expected notes, so nothing in it is ever acknowledged. It engraves what the app used, not a record of the playing, which the played-notes lane keeps. The list of kept sessions marks a Jam session as such.

## TECHNICAL INTERFACE
The review of a Jam has a doodle section before phrase 1.

## EXPECTATION
- A Jam's review shows the doodle section first, engraved from the quantized doodle, with no phrase number, chord symbol or favorite action.
- Kept Jam sessions are marked in the session list.
