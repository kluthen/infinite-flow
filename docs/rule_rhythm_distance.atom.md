---
id: rule_rhythm_distance
status: DRAFT
priority: 1
human_name: How Far One Rhythm Is From Another
layer: BUSINESS
version: 0.1
tags: [v3, release-v3.2, rhythm, jam, rhythm-lock]
parents:
  - [[req_jam]]
  - [[req_rhythm_lock]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls within the vision since version 0.8 (2026-10-08, spec D246).
dependents: []
type: RULE
---

# How Far One Rhythm Is From Another

## INTENT
Measure, the same way everywhere, how different two rhythms sound.

## THE RULE / LOGIC
Two rhythms are compared measure by measure, as two lists of note starts and rest starts in sixteenths. An edit adds one start, removes one, or moves one by at most an eighth note. No edit is Same. One edit away from beats 1 and 3 is Close. One edit touching beat 1 or 3, or two Close edits, is Near. Anything more is beyond. The total number of edits over the four measures orders rhythms outside a drift band, chooses the rhythm nearest the doodle under the lock, the forced bend's rhythm, and the rhythm re-locked after a narrow-window step-down, measured against the locked rhythm for the last two.

## TECHNICAL INTERFACE
A per-measure edit count classifies two rhythms as Same, Close, Near or beyond.

## EXPECTATION
- Two measures with no edit are Same; one edit off beats 1 and 3 is Close; one edit on them, or two Close edits, is Near.
