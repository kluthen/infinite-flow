---
id: rule_jam_phrase_one_joins_doodle
status: DRAFT
priority: 1
dependents: []
type: RULE
layer: BUSINESS
human_name: Phrase 1 Continues From the Doodle's Last Note
tags: [v3, release-v3.2, session, jam, phrase-join]
parents:
  - [[req_jam]]
version: 0.2
---

# Phrase 1 Continues From the Doodle's Last Note

## INTENT
Make the app's first phrase sound like the continuation of the player's idea.

## THE RULE / LOGIC
Phrase 1 continues from the doodle's last note, the way one phrase joins the next: its first interval obeys the same limits as two notes inside a phrase. Only the last pitch crosses, as if reached by no interval; no chord crosses, and no leap recovery is owed, since two measures of silence come between. When the last note lies outside the register window or the instrument's range, phrase 1 is generated without the join, and the steering block still applies. Notes outside the range or the window stay in the doodle and shape the steering block like any other note.

## TECHNICAL INTERFACE
Phrase 1's request carries a join from the doodle's last pitch, with no chord and no owed recovery.

## EXPECTATION
- Phrase 1's first interval from the doodle's last note obeys the in-phrase interval limits.
- With the doodle's last note outside the window or the range, phrase 1 has no join.
