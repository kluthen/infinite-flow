---
id: req_session_backing_track
status: DRAFT
layer: BUSINESS
human_name: Session Backing Track
parents:
  - [[req_rolling_practice_session]]
type: REQUIREMENT
version: 0.1
priority: 1
tags: [v2, release-v2.0, session, audio]
dependents:
  - [[module_session_phrase_steps]]
  - [[module_session_transport_tempo_map]]
notes: Recorded 2026-09-30 in v2 chunk 11 (backing); requirement text unchanged. Each phrase backing is rendered from its harmony by a pure function and scheduled on the session audio clock, on the beat grid of the click, from the end of the count-in; it is synthesized from oscillators and gains only, and the boundary check rejects sampled or decoded audio calls in the source and audio or sample files in the build output. Readings the chunk made, AWAITING THE OWNER ACCEPTANCE. (1) A four-beat harmony event is read as every full measure held under one chord, so a chord held for two measures gets the fifth in each and a four-beat chord starting on beat 3 gets none. (2) The chords are attacked only at chord changes and on downbeats and are held through beat 3, whereas re-attacked in the same way can also be read as re-attacking them with the bass fifth on beat 3. (3) The chord voicing is the close-position stack whose top note is the highest at or below E4. (4) The bass plays in MIDI 36 to 47 (C2 to B2) with the fifth in the same band as the root, so the fifth can sound below the root. The register is a placeholder until a listening test. The backing is not yet wired to the running session of the app; only the workspace harness queues it.
---

# Session Backing Track

## INTENT
Give the player a simple harmonic bed that follows each session phrase's own harmony.

## THE RULE / LOGIC
- During a session the app plays a backing of a bass line and block chords that follow the phrase's own generated harmony, in pitch and on the beat.
- The backing is a pure, deterministic rendering of that harmony, not a generated voice with its own seed: the bass plays the chord's root at each harmony event and on every beat 1, adding the fifth on beat 3 for a four-beat harmony event; the chords play a close-position triad, re-attacked in the same way.
- It is synthesized in the app itself, with no sample library and no extra download, so it stays usable offline and carries no licensing entanglement.
- It plays only while a session is running, and keeps playing through the player's silences.
- There is no playback of the generated lead line, and no accompaniment with musical roles such as harmonizing, responding to or contrasting with the player.

## TECHNICAL INTERFACE
The backing sounds during a session under the backing on/off and backing volume controls.

## EXPECTATION
- The backing stays in pitch with, and on the beat of, each phrase's harmony.
- The same harmony always renders the same backing.
- Nothing of the backing plays outside a session, and it requires no additional audio assets.
