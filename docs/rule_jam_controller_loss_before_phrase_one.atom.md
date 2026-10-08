---
id: rule_jam_controller_loss_before_phrase_one
status: DRAFT
parents:
  - [[req_jam]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
dependents: []
priority: 1
tags: [v3, release-v3.2, session, jam, midi, session-end]
type: RULE
layer: BUSINESS
version: 0.1
human_name: A Lost Controller Before Phrase 1 Ends the Jam
---

# A Lost Controller Before Phrase 1 Ends the Jam

## INTENT
End a Jam at once when the doodle can no longer be played or followed.

## THE RULE / LOGIC
A controller lost during a Jam's capture, its generation measure, an extended wait or its read-in measure ends the Jam at once, as a Jam ends before phrase 1 sounds. From phrase 1 on, the 30-second reconnection rule of any session applies. A Jam on a held doodle has no capture, so it follows that rule from its count-in on.

## TECHNICAL INTERFACE
Controller loss before a fresh Jam's phrase 1 ends the Jam immediately.

## EXPECTATION
- A controller lost between the capture and phrase 1 ends the Jam at once, with no review and nothing kept.
- From phrase 1, and throughout a Jam on a held doodle, a lost controller has 30 seconds to return.
