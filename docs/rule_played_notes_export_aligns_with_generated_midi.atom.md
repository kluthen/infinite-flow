---
id: rule_played_notes_export_aligns_with_generated_midi
status: REVIEW
type: RULE
layer: BUSINESS
version: 0.3
human_name: Played Notes Export Lines Up With Generated MIDI
tags: [v2, release-v2.0, part-v2.1, v2.4-check, export, midi]
parents:
  - [[req_played_notes_export]]
dependents:
  - [[module_review_export_pipeline]]
priority: 1
notes: Revised 2026-10-05 (previous version 0.2) for spec D183 - v2 ships as one release, v2.0, and the real-hardware check this atom names is part of its single release gate rather than of a later release; the check itself is unchanged.
---

# Played Notes Export Lines Up With Generated MIDI

## INTENT
Make the played-notes file line up with the generated-notes MIDI file of the same session.

## THE RULE / LOGIC
The played-notes file carries the same tempo map and the same phrase markers as the generated-notes MIDI file of the same session, at the same time resolution, with phrase 1 at time zero in both, whether or not the generated notes are exported too. Imported together into a digital audio workstation (DAW, a music production program), the two files line up phrase by phrase.

## TECHNICAL INTERFACE
Both MIDI exports of one session share the tempo map, phrase markers, time resolution and time origin.

## EXPECTATION
- The played-notes file and the generated-notes MIDI file of the same session share the same tempo map, phrase markers, time resolution and time origin, as automated tests check.
- Imported together into a real DAW, the two files line up phrase by phrase, with the same tempo map and markers. This real-DAW import is one of the real-hardware checks of the v2.0 release gate.
