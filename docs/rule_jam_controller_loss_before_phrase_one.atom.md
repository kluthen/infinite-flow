---
id: rule_jam_controller_loss_before_phrase_one
status: DRAFT
parents:
  - [[req_jam]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls within the vision since version 0.8 (2026-10-08, spec D246). Revised the same day (version 0.1 to 0.2) after the spec settled that a controller lost during a fresh Jam count-in also ends the Jam at once.
dependents: []
priority: 1
tags: [v3, release-v3.2, session, jam, midi, session-end]
type: RULE
layer: BUSINESS
version: 0.2
human_name: A Lost Controller Before Phrase 1 Ends the Jam
---

# A Lost Controller Before Phrase 1 Ends the Jam

## INTENT
End a Jam at once when the doodle can no longer be played or followed.

## THE RULE / LOGIC
A controller lost during the count-in of a fresh Jam (one started without a held doodle), its capture, its generation measure, an extended wait or its read-in measure ends the Jam at once, as a Jam ends before phrase 1 sounds, since the doodle can no longer be played or followed. From phrase 1 on, the 30-second reconnection rule of any session applies. A Jam on a held doodle has no capture, so it follows that 30-second rule from its count-in on.

## TECHNICAL INTERFACE
Controller loss from a fresh Jam's count-in until its phrase 1 sounds ends the Jam immediately.

## EXPECTATION
- A controller lost from a fresh Jam's count-in until its phrase 1 sounds, the count-in included, ends the Jam at once, with no review and nothing kept.
- From phrase 1, and throughout a Jam on a held doodle, its count-in included, a lost controller has 30 seconds to return.
