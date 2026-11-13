---
id: rule_seventh_chords_off_changes_nothing
status: DRAFT
priority: 1
human_name: At Off, Phrases Are as Before Seventh Chords
tags: [v3, release-v3.3, generation, chords]
parents:
  - [[req_seventh_chords_level]]
dependents:
  - [[service_generation_orchestration]]
type: RULE
layer: BUSINESS
version: 0.1
---

# At Off, Phrases Are as Before Seventh Chords

## INTENT
Keep everything a player made before seventh chords existed sounding, showing and exporting exactly as it did.

## THE RULE / LOGIC
At Off the generator makes no seventh-form draw and adds no candidate, so a phrase at Off is searched exactly as before the level existed: for the same request and seed it is, note for note, the phrase v3.2 generates, with Jam and the rhythm lock included, and its backing, chord symbols and exported files are the same byte for byte.

## TECHNICAL INTERFACE
A request at Off is generated with no seventh-form draw and no triads-only variant.

## EXPECTATION
- At Off, on a fixed sweep of seeds and settings in every mode, Jam and the rhythm lock included, each phrase equals the phrase v3.2 generates for the same request and seed.
- At Off, the backing, the chord symbols and the MusicXML and MIDI files are byte-identical to v3.2's for the same phrase.
