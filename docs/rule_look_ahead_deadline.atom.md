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
version: 0.3
human_name: One-Phrase Look-Ahead Deadline
notes: Revised 2026-10-13 to version 0.3 (previous version 0.2) on owner sign-off 2026-10-13 (relayed by the coordinator), the change of meaning confirmed, of the wording proposed at the v3.0 wave-2 post-task sync (change set part K2.2; conflict 2 of the wave-2 preflight); stays REVIEW. Phrase N+1 is due when phrase N starts sounding; phrase 2 is due by the end of the count-in; from v3.0 a phrase pre-generated at Idle for its place (phrases 2 to 5 at most) is taken when its look-ahead opens, phrase 2 at Start, and not generated again. This is what chunk 24's merged code (0b744ae, module_session_ready_phrases) does. The v3.2 change pending below is untouched. Earlier: v3.2 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): in a Jam without a held doodle phrase 2 is not generated during the count-in: phrase 1 has a three-measure deadline from the generation measure, and phrase 2 is requested as soon as phrase 1 is ready, its deadline the start of phrase 1's last measure (rule_jam_phrase_one_deadline). Text and status unchanged on purpose: it still describes the running code. Revise it in the change that builds that behaviour, per docs/release/v3.1-v3.2-intent-change-set.md. Earlier: Revised 2026-09-30 in v2 chunk 8 (previous version 0.1) as a clarification of existing behaviour, accepted by the chunk owner under the owner standing rule to settle minor issues and record them; the product owner accepted it on 2026-10-05 (spec D186). The EXPECTATION now allows for the failure ladder repeat decided at the deadline, which the ladder rule already required; the rule itself is unchanged.
---

# One-Phrase Look-Ahead Deadline

## INTENT
Always have the next phrase ready before the player needs to read it.

## THE RULE / LOGIC
During a session the app always looks one phrase ahead. As soon as phrase N starts sounding, phrase N+1 is due, and it must be generated and engraved before its deadline: the start of phrase N's last measure. That leaves at least one measure of read-ahead visible on screen at all times. Phrase 2 is due by the end of the one-measure count-in. From v3.0, a phrase pre-generated at Idle for its place (phrase 2 to phrase 5 at most) is taken as soon as its look-ahead opens, phrase 2 at Start, and is not generated again; any other phrase is requested then, phrase 2 during the count-in, and generated under its deadline.

## TECHNICAL INTERFACE
While a phrase sounds, the next phrase, unless it was pre-generated at Idle and taken, is requested in the background; either way it becomes available as read-ahead before the current phrase's last measure starts.

## EXPECTATION
- Across every seed and supported settings combination, at 60, 120 and 240 BPM, every phrase after the first is generated and engraved before its deadline, except when the session generation failure ladder finds no valid phrase by then, in which case the previous phrase is repeated as that phrase, decided at the deadline.
- At least one measure of read-ahead is visible throughout a session.
- A phrase pre-generated at Idle for its place is taken when its look-ahead opens, with no new generation request, and is ready before its deadline.
