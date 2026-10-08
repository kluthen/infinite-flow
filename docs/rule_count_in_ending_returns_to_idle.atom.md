---
id: rule_count_in_ending_returns_to_idle
status: REVIEW
version: 0.1
priority: 1
human_name: Session Ended During the Count-In Returns to Idle
dependents:
  - [[module_session_staff_engraving_outcomes]]
  - [[service_session_end]]
  - [[service_session_engine]]
  - [[service_workspace_session_flow]]
tags: [v2, release-v2.0, session, session-end, changes-in-v3.2]
parents:
  - [[rule_stop_ends_session]]
type: RULE
layer: BUSINESS
notes: v3.2 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): a Jam ended at any time before its phrase 1 sounds ends the same way, and in Jam mode Idle may show no phrase (rule_jam_ending_before_phrase_one, rule_jam_idle_shows_no_phrase). Text and status unchanged on purpose: it still describes the running code. Revise it in the change that builds that behaviour, per docs/release/v3.1-v3.2-intent-change-set.md.
---

# Session Ended During the Count-In Returns to Idle

## INTENT
Return straight to Idle when a session ends before any phrase has sounded.

## THE RULE / LOGIC
A session ended during the count-in, before phrase 1 starts sounding (by Stop, a hidden tab or the staff no longer being shown), has nothing to review: no phrase started sounding, so its history holds no phrase. The app goes straight back to Idle with phrase 1 still on screen as the Idle phrase, and no review opens. The previous session's review is not restored either: starting this session already discarded it, and it stays discarded.

## TECHNICAL INTERFACE
Ending during the count-in leads to Idle, not to the review.

## EXPECTATION
- A session ended during the count-in, by Stop, a hidden tab or the staff no longer being shown, goes back to Idle with phrase 1 still on screen.
- No review opens, and the previous session's review is not restored.
