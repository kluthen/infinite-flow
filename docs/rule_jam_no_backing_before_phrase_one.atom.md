---
id: rule_jam_no_backing_before_phrase_one
status: DRAFT
tags: [v3, release-v3.2, session, jam, audio]
type: RULE
layer: BUSINESS
priority: 1
parents:
  - [[req_jam]]
dependents: []
version: 0.1
human_name: No Backing Before a Jam's Phrase 1
---

# No Backing Before a Jam's Phrase 1

## INTENT
Play no chords before the app has chosen any.

## THE RULE / LOGIC
The backing follows a phrase's generated chords, and there are none before phrase 1, so nothing of the backing sounds during the count-in, the capture, the generation measure, an extended wait or the read-in measure. It starts with phrase 1.

## TECHNICAL INTERFACE
The backing schedules nothing before phrase 1.

## EXPECTATION
- No backing note sounds before a Jam's phrase 1.
