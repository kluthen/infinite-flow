---
id: rule_jam_click_runs_until_phrase_one
status: DRAFT
type: RULE
priority: 1
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls within the vision since version 0.8 (2026-10-08, spec D246).
dependents: []
layer: BUSINESS
version: 0.1
human_name: A Jam's Click Runs Until Phrase 1
tags: [v3, release-v3.2, session, jam, audio]
parents:
  - [[req_jam]]
---

# A Jam's Click Runs Until Phrase 1

## INTENT
Give the doodle a steady beat to be played against.

## THE RULE / LOGIC
A Jam begins with one measure of count-in, shown and heard, its beats counted on screen in time with the click; without a held doodle no phrase is on screen meanwhile. The click then goes on through the capture, the generation measure, any extended wait and the read-in measure, whatever the click switch says, at the click volume: it sets the measure grid the doodle is played and snapped against. From phrase 1 on, the click switch governs as in any session.

## TECHNICAL INTERFACE
The click sounds from the count-in to phrase 1 whatever the click switch says.

## EXPECTATION
- Between the count-in and phrase 1 the click sounds even with the click switched off.
- From phrase 1 on the click follows the click switch.
