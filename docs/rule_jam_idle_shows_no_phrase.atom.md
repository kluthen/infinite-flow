---
id: rule_jam_idle_shows_no_phrase
status: DRAFT
type: RULE
version: 0.3
priority: 1
human_name: Jam Mode's Idle Shows No Phrase Without a Kept Doodle
tags: [v3, release-v3.2, session, jam, idle]
parents:
  - [[req_jam]]
layer: BUSINESS
dependents: []
---

# Jam Mode's Idle Shows No Phrase Without a Kept Doodle

## INTENT
Show nothing to read before the doodle, since the Jam's first phrase does not exist yet.

## THE RULE / LOGIC
At Jam mode's Idle without a kept doodle, no generated phrase is shown: nothing is read before the doodle. The staff shows the key signature of Jam's key and mode, and the line that names the starting note names the home note. The Idle rules for a phrase (replacing a phrase that does not fit the staff, the notice for notes too dense for it) and the background generation of the phrases that follow phrase 1 do not run. With a kept doodle, Idle shows that doodle's phrase 1 instead.

## TECHNICAL INTERFACE
Jam mode's Idle staff shows the key signature of Jam's key and mode and no phrase, and names the home note as the starting note.

## EXPECTATION
- At Jam mode's Idle without a kept doodle, the staff shows Jam's key signature and no phrase, the home note is named as the starting note, and no phrase is generated in the background.
- With a kept doodle, Jam mode's Idle shows that doodle's phrase 1.
