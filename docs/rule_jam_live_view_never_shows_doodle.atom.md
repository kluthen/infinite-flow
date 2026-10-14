---
id: rule_jam_live_view_never_shows_doodle
status: DRAFT
priority: 1
human_name: The Live View Never Shows the Doodle
tags: [v3, release-v3.2, session, jam]
parents:
  - [[req_jam]]
dependents: []
type: RULE
layer: BUSINESS
version: 0.1
---

# The Live View Never Shows the Doodle

## INTENT
Keep the live view free of the player's own notes, as in every session, while telling them where the Jam is.

## THE RULE / LOGIC
The live view never shows the doodle's notes, as it never draws a played note. The row above the staff counts the doodle's measures, one to four, then says the app is writing, during the generation measure and any extended wait, then counts the read-in measure's beats.

## TECHNICAL INTERFACE
The cue row shows the Jam's stage; the staff shows no played note.

## EXPECTATION
- No doodle note is drawn in the live view.
- The cue row counts the doodle's measures, says the app is writing, then counts the read-in beats.
