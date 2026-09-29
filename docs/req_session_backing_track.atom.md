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
dependents: []
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
