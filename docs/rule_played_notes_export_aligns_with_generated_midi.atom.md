---
id: rule_played_notes_export_aligns_with_generated_midi
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.1
human_name: Played Notes Export Lines Up With Generated MIDI
tags: [v2, release-v2.1, export, midi]
parents:
  - [[req_played_notes_export]]
dependents: []
priority: 1
---

# Played Notes Export Lines Up With Generated MIDI

## INTENT
Make the played-notes file line up with the generated-notes MIDI file of the same session.

## THE RULE / LOGIC
The played-notes file carries the same tempo map and the same phrase markers as the generated-notes MIDI file of the same session, at the same time resolution, with phrase 1 at time zero in both, whether or not the generated notes are exported too. Imported together into a digital audio workstation (DAW, a music production program), the two files line up phrase by phrase.

## TECHNICAL INTERFACE
Both MIDI exports of one session share the tempo map, phrase markers, time resolution and time origin.

## EXPECTATION
Imported together into a real DAW, the played-notes file and the generated-notes MIDI file of the same session line up phrase by phrase, with the same tempo map and markers.
