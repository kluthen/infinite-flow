---
id: rule_part_switch_takes_effect
status: DRAFT
type: RULE
human_name: A Part's Switch and Volume Take Effect at Once
tags: [v4, release-v4.0, session, audio, accompaniment]
parents:
  - [[req_accompaniment_parts]]
dependents: []
layer: BUSINESS
version: 0.1
priority: 1
---

# A Part's Switch and Volume Take Effect at Once

## INTENT
Let the player change a part mid-session without hearing a note caught half way.

## THE RULE / LOGIC
During a session a part's volume change applies at once; a part switched off is silent at once, a ringing note included; a part switched on joins at its next note, so no note that started before is heard part way. Its playing light follows its switch.

## TECHNICAL INTERFACE
During a session, each part's switch and volume act on its sound without stopping or restarting the session.

## EXPECTATION
- A part's volume change is heard at once.
- A part switched off is silent at once, a ringing note included, and its light goes dark.
- A part switched on sounds from its next note; no note that started before is heard part way.
