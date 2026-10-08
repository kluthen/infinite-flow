---
id: rule_jam_idle_shows_no_phrase
status: DRAFT
type: RULE
version: 0.2
priority: 1
human_name: Idle in Jam Mode Shows No Phrase
tags: [v3, release-v3.2, session, jam, idle]
parents:
  - [[req_jam]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls within the vision since version 0.8 (2026-10-08, spec D246). Revised the same day (version 0.1 to 0.2) after the spec settled that turning Jam off leaves the workspace empty, as at first load, instead of generating a phrase.
layer: BUSINESS
dependents: []
---

# Idle in Jam Mode Shows No Phrase

## INTENT
Show nothing to read before the doodle, since the Jam's first phrase does not exist yet.

## THE RULE / LOGIC
At Idle in Jam mode, with no held doodle, no generated phrase is shown: the staff shows only the key signature of the selected key and mode. The rules that replace an Idle phrase that does not fit the staff, the notice for notes too dense for it, and the background generation of the phrases that would follow phrase 1 do not run; the preparation of the rhythm candidates still does, since a Jam's phrases use the same rhythms as its settings. Turning Jam on discards the phrase on screen and every pre-generated phrase. Turning Jam off leaves the workspace empty, as at first load: nothing is generated until the player asks for a phrase.

## TECHNICAL INTERFACE
The Idle staff in Jam mode shows a key signature and no phrase.

## EXPECTATION
- In Jam mode without a held doodle, Idle shows the key signature and no phrase, and generates nothing in the background.
- Turning Jam off leaves the workspace empty, as at first load, and generates nothing until the player asks for a phrase.
