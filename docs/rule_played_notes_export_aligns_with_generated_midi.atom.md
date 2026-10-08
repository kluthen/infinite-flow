---
id: rule_played_notes_export_aligns_with_generated_midi
status: REVIEW
type: RULE
layer: BUSINESS
version: 0.4
human_name: Played Notes Export Lines Up With Generated MIDI
tags: [v2, release-v2.0, part-v2.1, v2.4-check, export, midi, changes-in-v3.2]
parents:
  - [[req_played_notes_export]]
dependents:
  - [[module_review_export_pipeline]]
priority: 1
notes: v3.2 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): for a Jam, the doodle section, not phrase 1, is at time zero in both files (rule_jam_exports_line_up). Text and status unchanged on purpose: it still describes the running code. Revise it in the change that builds that behaviour, per docs/release/v3.1-v3.2-intent-change-set.md. Earlier: Revised 2026-10-06 (previous version 0.3) on spec D193, the product owner answer to O105 - the checks of exports in real programs do not block the v2.0 tag; they follow it and are validated at a later date as v2.0.x hand checks, because the owner has no MuseScore account or DAW at hand (hardware checklist part F, 2026-10-06). The automated checks and the rest of the rule are unchanged; still part of release v2.0. Revised 2026-10-05 (previous version 0.2) for spec D183 - v2 ships as one release, v2.0, and the real-hardware check this atom names is part of its single release gate rather than of a later release; the check itself is unchanged.
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
- Imported together into a real DAW, the two files line up phrase by phrase, with the same tempo map and markers. This real-DAW import is a hand check that follows the v2.0 tag, validated later as a v2.0.x hand check; it does not block the tag.
