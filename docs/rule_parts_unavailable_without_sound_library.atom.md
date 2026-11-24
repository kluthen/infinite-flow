---
id: rule_parts_unavailable_without_sound_library
status: DRAFT
type: RULE
priority: 1
human_name: The Parts Are Unavailable When the Sound Library Fails
parents:
  - [[req_accompaniment_parts]]
dependents: []
layer: BUSINESS
version: 0.1
tags: [v4, release-v4.0, session, audio, accompaniment]
---

# The Parts Are Unavailable When the Sound Library Fails

## INTENT
Tell the player plainly when the parts cannot play, without breaking anything else.

## THE RULE / LOGIC
When the sound library fails to load, the parts are unavailable until the page is reloaded: at Idle the four parts' switches are disabled, with a short reason, and the backing keeps its fallback sound, made from the browser's oscillators. Sessions run as they would with every part off.

## TECHNICAL INTERFACE
The four parts' switches are disabled, with a short reason, while the sound library has failed to load.

## EXPECTATION
- After the library fails to load, no part can be switched on and none sounds until a reload.
- The backing, the click and the guides still play.
