---
id: rule_guide_switch_takes_effect
status: DRAFT
human_name: A Guide's Switch and Volume Take Effect at Once
type: RULE
priority: 1
tags: [v3, release-v3.2, session, audio]
layer: BUSINESS
version: 0.1
parents:
  - [[req_guide_playback]]
dependents: []
---

# A Guide's Switch and Volume Take Effect at Once

## INTENT
Let the player change a guide mid-session without hearing a note caught half way.

## THE RULE / LOGIC
During a session a guide's volume change applies at once; a guide turned off is silent at once, a ringing note included; a guide turned on sounds from the next of its notes the session plans, so no note that started before is caught half way.

## TECHNICAL INTERFACE
During a session, each guide's switch and volume act on its sound without stopping or restarting the session.

## EXPECTATION
- A guide's volume change is heard at once.
- A guide turned off is silent at once, a ringing note included.
- A guide turned on sounds from its next planned note; no note that started before is heard part way.
