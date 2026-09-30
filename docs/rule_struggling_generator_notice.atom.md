---
id: rule_struggling_generator_notice
status: DRAFT
layer: BUSINESS
version: 0.3
human_name: Struggling Generator Notice
tags: [v2, release-v2.0, session, error-handling]
parents:
  - [[rule_session_generation_failure_ladder]]
priority: 1
dependents:
  - [[service_session_engine]]
type: RULE
notes: Revised 2026-09-30 in v2 chunk 8 (previous version 0.2) as a clarification of existing behaviour, accepted by the chunk owner under the owner standing rule to settle minor issues and record them; AWAITING THE OWNER ACCEPTANCE. States that the notice shows when the second repeat in a row is decided, at that phrase deadline, as the play-session flow diagram draws it, rather than the ambiguous after two consecutive repeated phrases.
---

# Struggling Generator Notice

## INTENT
Tell the player, without interrupting them, when the generator keeps failing with the current settings.

## THE RULE / LOGIC
When the second repeated phrase in a row of a session is decided, at that phrase's deadline, the app shows a small, non-blocking notice that the generator is struggling with these settings. The session keeps running. The notice stays until a newly generated phrase starts sounding (a standalone phrase generated without carry-in counts; a repeat does not), and it goes when the session ends. Its exact wording and look belong to the interface design.

## TECHNICAL INTERFACE
A non-blocking notice appears in the session view when the second consecutive repeat is decided and is removed when a newly generated phrase starts sounding or the session ends.

## EXPECTATION
- Two consecutive repeated phrases show the notice, as soon as the second repeat is decided at its deadline.
- The notice never stops or pauses the session.
- The notice stays through further repeats and clears when a newly generated phrase, including a standalone fallback phrase, starts sounding.
- The notice goes when the session ends.
