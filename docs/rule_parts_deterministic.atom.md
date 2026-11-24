---
id: rule_parts_deterministic
status: DRAFT
human_name: The Same Phrase Gives the Same Parts
parents:
  - [[req_accompaniment_parts]]
layer: BUSINESS
version: 0.1
priority: 1
tags: [v4, release-v4.0, session, audio, accompaniment]
dependents: []
type: RULE
---

# The Same Phrase Gives the Same Parts

## INTENT
Let a phrase's accompaniment be heard again, and exported, exactly as it sounded.

## THE RULE / LOGIC
The same phrase with the same settings always renders the same notes for every part, across a reload too. The only random choice among the parts is the responding part's fill shapes, drawn from a stream of its own derived from the phrase's seed, so the lead's own draws are unchanged.

## TECHNICAL INTERFACE
A part's notes depend only on the phrase and the settings; the fill shapes draw from their own stream of the phrase's seed.

## EXPECTATION
- Rendering a phrase's parts twice, or after a reload, gives the same notes.
- Every phrase's lead is the same as before the parts existed, for the same request and seed.
