---
id: rule_click_volume_never_silent
status: STABLE
layer: BUSINESS
priority: 1
type: RULE
version: 0.1
human_name: Click Volume Never Reaches Silence
tags: [v2, release-v2.0, session, audio]
parents:
  - [[req_session_audio_mix]]
dependents: []
---

# Click Volume Never Reaches Silence

## INTENT
Keep the click audible at every volume setting so that turning it off stays an explicit choice.

## THE RULE / LOGIC
The click volume control never reaches silence: its lowest setting is still audible. Turning the click off is the on/off switch's job alone. The exact range and default level belong to the interface design.

## TECHNICAL INTERFACE
The click volume control's lowest setting is audible.

## EXPECTATION
No setting of the click volume control makes the click silent.
