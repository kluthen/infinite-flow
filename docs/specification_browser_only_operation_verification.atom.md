---
id: specification_browser_only_operation_verification
status: DRAFT
tags: [verification, browser-only, release-gate, v2, release-v2.0, revised-for-v2]
dependents: []
layer: ARCHITECTURE
priority: 1
parents:
  - [[req_browser_only_first_release]]
  - [[rule_audio_unlocked_by_player_click]]
  - [[rule_session_data_never_sent_or_stored]]
human_name: Browser-Only Operation Verification
type: SPECIFICATION
version: 0.2
---

# Browser-Only Operation Verification

## INTENT
Verify that required behavior operates entirely in the browser without a server dependency.

## THE RULE / LOGIC
The browser-only verification boundary exercises the required workflow (phrase generation, notation, controls and regeneration, and from v2 sessions, backing audio, MIDI controller input, the review and export) in a client runtime. It rejects a release when that workflow requires a server, sends any request beyond the page's own origin, starts audio or requests MIDI access before the player clicks Start or "Connect controller", or uses an excluded capability: microphone capture, playback of the generated lead line, or scoring. A connected MIDI controller is never required outside MIDI-specific behaviour.

## TECHNICAL INTERFACE
Release verification receives a built client runtime and the required workflow.

## EXPECTATION
The required workflow completes in a browser with no server dependency and no request leaving the page's origin; no audio context is created and no MIDI access is requested before a player click on Start or "Connect controller"; the microphone, lead-line playback and scoring are never used; and everything except MIDI-specific behaviour works without a connected controller.
