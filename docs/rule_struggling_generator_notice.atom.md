---
id: rule_struggling_generator_notice
status: DRAFT
layer: BUSINESS
version: 0.2
human_name: Struggling Generator Notice
tags: [v2, release-v2.0, session, error-handling]
parents:
  - [[rule_session_generation_failure_ladder]]
priority: 1
dependents: []
type: RULE
---

# Struggling Generator Notice

## INTENT
Tell the player, without interrupting them, when the generator keeps failing with the current settings.

## THE RULE / LOGIC
After two consecutive repeated phrases in a session, the app shows a small, non-blocking notice that the generator is struggling with these settings. The session keeps running. The notice stays until a newly generated phrase starts sounding (a standalone phrase generated without carry-in counts; a repeat does not), and it goes when the session ends. Its exact wording and look belong to the interface design.

## TECHNICAL INTERFACE
A non-blocking notice appears in the session view after two consecutive repeats and is removed when a newly generated phrase starts sounding or the session ends.

## EXPECTATION
- Two consecutive repeated phrases show the notice.
- The notice never stops or pauses the session.
- The notice stays through further repeats and clears when a newly generated phrase, including a standalone fallback phrase, starts sounding.
- The notice goes when the session ends.
