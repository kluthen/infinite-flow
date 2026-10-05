---
id: req_session_backing_track
status: STABLE
layer: BUSINESS
human_name: Session Backing Track
parents:
  - [[req_rolling_practice_session]]
type: REQUIREMENT
version: 0.2
priority: 1
tags: [v2, release-v2.0, session, audio]
dependents:
  - [[module_session_phrase_steps]]
  - [[module_session_transport_tempo_map]]
notes: Recorded 2026-09-30 in v2 chunk 11 (backing). Revised 2026-10-05 (previous version 0.1) on the product owner answer to O57 (spec D185), who accepted the backing as chunk 11 built it after listening to it in sessions - the bass register, the fifth on beats 3 and 4 of a measure under one chord in the same band as the root, the highest close-position triad at or below E4 attacked on each chord change and downbeat and never on beat 3, and voices synthesized from simple oscillators. The four readings chunk 11 left awaiting acceptance and the placeholder register are settled by that answer. The audio mix levels are a separate open question (ux Q31). Since v2 chunk 15 the backing plays in the running session, no longer only in the workspace harness.
---

# Session Backing Track

## INTENT
Give the player a simple harmonic bed that follows each session phrase's own harmony.

## THE RULE / LOGIC
- During a session the app plays a backing of a bass line and block chords that follow the phrase's own generated harmony, in pitch and on the beat.
- The backing is a pure, deterministic rendering of that harmony, not a generated voice with its own seed: the bass plays the chord's root, in MIDI 36 to 47 (C2 to B2), at each harmony event and on every beat 1, with the fifth, kept in the same band, on beats 3 and 4 of a measure held under one chord; the chords play the highest close-position triad whose top note is at or below E4, attacked at each chord change and on each downbeat, never on beat 3.
- It is synthesized in the app itself from simple oscillators, with no sample library and no extra download, so it stays usable offline and carries no licensing entanglement.
- It plays only while a session is running, and keeps playing through the player's silences.
- There is no playback of the generated lead line, and no accompaniment with musical roles such as harmonizing, responding to or contrasting with the player.

## TECHNICAL INTERFACE
The backing sounds during a session under the backing on/off and backing volume controls.

## EXPECTATION
- The backing stays in pitch with, and on the beat of, each phrase's harmony.
- The same harmony always renders the same backing.
- Nothing of the backing plays outside a session, and it requires no additional audio assets.
