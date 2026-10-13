---
id: rule_start_never_waits_for_pregeneration
status: DRAFT
priority: 1
human_name: Start Never Waits for Pre-Generation
tags: [v3, release-v3.0, idle, session-start]
parents:
  - [[req_idle_pregeneration]]
  - [[rule_session_start_conditions]]
layer: BUSINESS
notes: Synced 2026-10-13 at the v3.0 wave-2 post-task sync, same version 0.1: chunk 24's code (merge 0b744ae) implements it: a background attempt sets no Idle operation state, so the start blocker never counts it; Start's take aborts it and passes the phrases ready that fit the held layout (workspace-session-start.ts, workspace-pregeneration.ts, session-ready-phrases.ts), with linked tests. The text saying nothing of it is built is superseded. No change of meaning; status stays DRAFT. Earlier: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls within the vision since version 0.8 (2026-10-08, spec D246).
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
