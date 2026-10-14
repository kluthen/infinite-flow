---
id: rule_doodle_ends_by_silence
status: DRAFT
human_name: A Doodle Ends at a Silent Measure
parents:
  - [[req_jam]]
type: RULE
layer: BUSINESS
version: 0.1
priority: 1
tags: [v3, release-v3.2, session, jam]
dependents: []
---

# A Doodle Ends at a Silent Measure

## INTENT
Let the player end the doodle simply by stopping, with no button to press.

## THE RULE / LOGIC
From the end of the doodle's first measure on, at each barline where no note is sounding, a generation attempt starts from the doodle as it stands. If the player plays a note that passes the very-short-note filter inside that measure, the attempt is cancelled where it runs and that measure becomes part of the doodle. If the measure stays silent, the doodle ended at its start, and that measure is the generation measure. A measure that begins with a note still sounding is not a silent measure, even if the note ends at once.

## TECHNICAL INTERFACE
At each barline with nothing sounding, a doodle attempt starts and is cancelled if the measure turns out not silent.

## EXPECTATION
- The doodle ends at the first measure that begins with nothing sounding and stays silent.
- A note played inside that measure cancels the attempt and extends the doodle.
- A measure beginning with a note still sounding never ends the doodle.
