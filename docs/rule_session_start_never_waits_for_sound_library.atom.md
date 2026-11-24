---
id: rule_session_start_never_waits_for_sound_library
status: DRAFT
priority: 1
human_name: Starting a Session Never Waits for the Sound Library
tags: [v4, release-v4.0, session, audio, accompaniment]
parents:
  - [[req_accompaniment_parts]]
dependents: []
type: RULE
layer: BUSINESS
version: 0.1
---

# Starting a Session Never Waits for the Sound Library

## INTENT
Keep Start instant, whatever the state of the sound library.

## THE RULE / LOGIC
A session starts at once whether or not the sound library has finished loading. When it is ready at Start, the session uses it. When it is still loading, the backing plays its fallback sound, made from the browser's oscillators, for the whole session, and the parts switched on join at the first phrase start after the library is ready.

## TECHNICAL INTERFACE
Start never waits on the sound library.

## EXPECTATION
- Start takes as long with the library loading as with it ready.
- A session started before the library is ready keeps the backing's fallback sound to its end.
- Parts switched on in such a session sound from the first phrase start after the library is ready.
