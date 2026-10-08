---
id: rule_notes_after_doodle_belong_nowhere
status: DRAFT
human_name: Notes Between the Doodle and Phrase 1 Belong to Nothing
layer: BUSINESS
version: 0.1
priority: 1
tags: [v3, release-v3.2, session, jam, midi]
parents:
  - [[req_jam]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls within the vision since version 0.8 (2026-10-08, spec D246).
dependents: []
type: RULE
---

# Notes Between the Doodle and Phrase 1 Belong to Nothing

## INTENT
Keep the doodle and the phrases free of notes played while the app is writing.

## THE RULE / LOGIC
Notes played after the doodle ended and before phrase 1 sounds, in the generation measure after an end by length, in an extended wait or in the read-in measure, belong to no doodle and no phrase, like notes played during a count-in.

## TECHNICAL INTERFACE
Played notes between the doodle's end and phrase 1 are attached to neither.

## EXPECTATION
- A note played after the doodle ended and before phrase 1 is in neither the doodle nor any phrase.
