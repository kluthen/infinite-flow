---
id: rule_repeat_phrase_marked_internally_only
status: DRAFT
type: RULE
layer: BUSINESS
priority: 1
human_name: Repeated Phrase Marked Only Internally
parents:
  - [[rule_session_generation_failure_ladder]]
  - [[rule_session_history_keeps_timeline_and_inputs]]
dependents: []
version: 0.1
tags: [v2, release-v2.0, session, history]
---

# Repeated Phrase Marked Only Internally

## INTENT
Keep a failure-ladder repeat traceable without ever surfacing it to the player.

## THE RULE / LOGIC
The session history marks any phrase that is a repeat inserted by the session's generation failure handling, the same way whether the attempts failed because no phrase was found or because none fitted the staff. The mark is internal only: the review never visibly distinguishes a repeated phrase from any other phrase, since a repeat is a generator implementation detail, not something worth showing the player.

## TECHNICAL INTERFACE
History entries carry an internal repeat mark that no view displays.

## EXPECTATION
- Every repeated phrase is marked as a repeat in the history, whatever kind of failure caused it.
- The review shows a repeated phrase exactly like any other phrase.
