---
id: rule_part_rests_when_no_note_fits
status: REVIEW
parents:
  - [[req_accompaniment_parts]]
type: RULE
version: 0.1
priority: 1
dependents: []
layer: BUSINESS
human_name: A Part Rests Where No Note Fits
tags: [v4, release-v4.0, session, audio, accompaniment]
---

# A Part Rests Where No Note Fits

## INTENT
Make sure a part can never hold up or break a phrase.

## THE RULE / LOGIC
A rest is always legal for a part: a note its rules cannot place is left out, and the part plays on. A part never makes a phrase fail, and never delays it.

## TECHNICAL INTERFACE
Rendering a part always succeeds; a note its rules cannot place is simply absent.

## EXPECTATION
- Every phrase renders its parts, with notes left out where no rule can place one.
- No phrase fails or comes late because of a part.
