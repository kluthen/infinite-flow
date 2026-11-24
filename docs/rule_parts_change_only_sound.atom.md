---
id: rule_parts_change_only_sound
status: DRAFT
version: 0.1
dependents: []
type: RULE
layer: BUSINESS
priority: 1
human_name: The Parts Change Nothing but the Sound
tags: [v4, release-v4.0, session, audio, accompaniment]
parents:
  - [[req_accompaniment_parts]]
---

# The Parts Change Nothing but the Sound

## INTENT
Keep the lead, the player's line, the one authority of a session.

## THE RULE / LOGIC
No part changes the phrase, its timing, what acknowledgement accepts or what is kept about the phrase. Turning a part on or off, or changing its volume, is no input to generation, acknowledgement or the session's timing.

## TECHNICAL INTERFACE
The parts' switches and volumes are no input to generation, acknowledgement or the session's timing.

## EXPECTATION
- A session's phrases, acknowledgement and timing are the same with any parts on or off.
- What is kept about each phrase is the same with any parts on or off.
