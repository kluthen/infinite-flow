---
id: rule_highlighting_part_doubled_notes
status: REVIEW
layer: BUSINESS
tags: [v4, release-v4.0, session, audio, accompaniment]
dependents: []
type: RULE
version: 0.1
priority: 1
human_name: Which Lead Notes the Highlighting Part Doubles
parents:
  - [[req_highlighting_part]]
---

# Which Lead Notes the Highlighting Part Doubles

## INTENT
Double only the lead notes that carry the line, so the doubling stays light.

## THE RULE / LOGIC
A lead note is doubled when it lasts at least one beat, tied notes counting as one note, or when it starts on beat 1 or beat 3 of a measure. A chromatic lead note, one outside the phrase's scale (the collection of its key and mode), is never doubled. No other lead note is doubled.

## TECHNICAL INTERFACE
The highlighting part's notes are chosen from the phrase's own lead notes.

## EXPECTATION
- Every lead note in the scale that lasts at least one beat, tied notes counted as one, or starts on beat 1 or 3, is doubled unless its pitch rules leave it out.
- No chromatic lead note is doubled.
- No other lead note is doubled.
