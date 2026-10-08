---
id: rule_jam_phrase_one_deadline
status: DRAFT
layer: BUSINESS
priority: 1
tags: [v3, release-v3.2, session, jam, look-ahead]
dependents:
  - [[rule_jam_phrase_one_failure_ladder]]
type: RULE
version: 0.1
human_name: A Late Phrase 1 Extends the Wait by Whole Measures
parents:
  - [[req_jam]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls within the vision since version 0.8 (2026-10-08, spec D246).
---

# A Late Phrase 1 Extends the Wait by Whole Measures

## INTENT
Wait for a late phrase 1 in step with the music, within a fixed limit.

## THE RULE / LOGIC
If phrase 1 is not ready within the generation measure, the wait extends by whole measures: phrase 1 is shown at the first barline at or after the moment it is ready, followed by its read-in measure. The click goes on and the row above the staff keeps saying the app is writing. The deadline for phrase 1 is three measures after the generation measure begins (3 s at 240 BPM, 12 s at 60 BPM), the same span a look-ahead phrase gets.

## TECHNICAL INTERFACE
Phrase 1's deadline is three measures after the generation measure begins.

## EXPECTATION
- A late phrase 1 is shown at a barline, then read in for one measure.
- No phrase 1 is accepted after the three-measure deadline.
