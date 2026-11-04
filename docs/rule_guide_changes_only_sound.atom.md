---
id: rule_guide_changes_only_sound
status: DRAFT
human_name: The Guides Change Only What Is Heard
layer: BUSINESS
version: 0.1
tags: [v3, release-v3.2, session, audio]
parents:
  - [[req_guide_playback]]
type: RULE
priority: 1
dependents: []
---

# The Guides Change Only What Is Heard

## INTENT
Keep the guides a listening aid that leaves the session itself untouched.

## THE RULE / LOGIC
The guides change nothing in acknowledgement, the session's timing, what is generated or what is kept with a session.

## TECHNICAL INTERFACE
Turning either guide on or off, or changing its volume, is no input to acknowledgement, the session's timing, generation or what is kept with a session.

## EXPECTATION
- A session's acknowledgement, timing and generated phrases are the same with the guides on and off.
- What is kept with a session is the same with the guides on and off.
