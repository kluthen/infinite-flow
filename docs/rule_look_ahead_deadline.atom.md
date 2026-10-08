---
id: rule_look_ahead_deadline
status: REVIEW
type: RULE
layer: BUSINESS
priority: 1
tags: [v2, release-v2.0, session, look-ahead, changes-in-v3.2]
parents:
  - [[req_rolling_practice_session]]
dependents:
  - [[module_session_look_ahead_timing]]
  - [[module_session_rolling_display]]
  - [[rule_look_ahead_phrase_must_fit_staff]]
  - [[rule_session_generation_failure_ladder]]
  - [[service_session_engine]]
  - [[service_session_runner]]
version: 0.2
human_name: One-Phrase Look-Ahead Deadline
notes: v3.2 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): in a Jam without a held doodle phrase 2 is not generated during the count-in: phrase 1 has a three-measure deadline from the generation measure, and phrase 2 is requested as soon as phrase 1 is ready, its deadline the start of phrase 1's last measure (rule_jam_phrase_one_deadline). Text and status unchanged on purpose: it still describes the running code. Revise it in the change that builds that behaviour, per docs/release/v3.1-v3.2-intent-change-set.md. Earlier: Revised 2026-09-30 in v2 chunk 8 (previous version 0.1) as a clarification of existing behaviour, accepted by the chunk owner under the owner standing rule to settle minor issues and record them; the product owner accepted it on 2026-10-05 (spec D186). The EXPECTATION now allows for the failure ladder repeat decided at the deadline, which the ladder rule already required; the rule itself is unchanged.
---

# One-Phrase Look-Ahead Deadline

## INTENT
Always have the next phrase ready before the player needs to read it.

## THE RULE / LOGIC
During a session the app always looks one phrase ahead. As soon as phrase N starts sounding, phrase N+1 is requested, and it must be generated and engraved before its deadline: the start of phrase N's last measure. That leaves at least one measure of read-ahead visible on screen at all times. Phrase 2 is generated during the one-measure count-in and is ready before the count-in ends.

## TECHNICAL INTERFACE
While a phrase sounds, the next phrase is requested in the background and becomes available as read-ahead before the current phrase's last measure starts.

## EXPECTATION
- Across every seed and supported settings combination, at 60, 120 and 240 BPM, every phrase after the first is generated and engraved before its deadline, except when the session generation failure ladder finds no valid phrase by then, in which case the previous phrase is repeated as that phrase, decided at the deadline.
- At least one measure of read-ahead is visible throughout a session.
