---
id: rule_start_never_waits_for_pregeneration
status: REVIEW
priority: 1
human_name: Start Never Waits for Pre-Generation
tags: [v3, release-v3.0, idle, session-start]
parents:
  - [[req_idle_pregeneration]]
  - [[rule_session_start_conditions]]
layer: BUSINESS
dependents:
  - [[module_idle_pregeneration_queue]]
  - [[module_session_ready_phrases]]
  - [[service_session_start]]
type: RULE
version: 0.1
---

# Start Never Waits for Pre-Generation

## INTENT
Keep pre-generation from ever delaying a session's start.

## THE RULE / LOGIC
From v3.0, a background pre-generation does not count as a new phrase being generated, so it never stops a session from starting. The session takes whichever pre-generated phrases are ready and generates the rest under its own deadlines, as without pre-generation. Pre-generation never changes phrase 1 or its starting note.

## TECHNICAL INTERFACE
Start conditions ignore background pre-generation; a session starts with whatever pre-generated phrases are ready.

## EXPECTATION
- Start is never refused or delayed because a background pre-generation is running.
- Phrase 1 and its starting note are the same with pre-generation on or off.
