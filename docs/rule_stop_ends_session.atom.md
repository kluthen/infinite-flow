---
id: rule_stop_ends_session
status: DRAFT
version: 0.1
priority: 1
tags: [v2, release-v2.0, session, session-end]
type: RULE
layer: BUSINESS
human_name: Stop Ends the Session
parents:
  - [[req_rolling_practice_session]]
dependents:
  - [[rule_count_in_ending_returns_to_idle]]
  - [[rule_hidden_tab_ends_session]]
  - [[rule_session_ends_on_portrait_view]]
  - [[rule_session_ends_when_staff_too_small]]
  - [[rule_silence_timeout_ends_session]]
  - [[service_session_engine]]
  - [[service_workspace_session_flow]]
notes: Recorded 2026-09-30 in v2 chunk 10 (audio transport); rule text unchanged. A Stop during the count-in also fades the click out over about 100 ms before the app returns to Idle. The rule states the fade for every Stop, while its expectation states it only for a Stop after phrase 1 has started sounding; the chunk applies it to both. AWAITING THE OWNER ACCEPTANCE. Chunk 11 (backing, 2026-09-30) fades the backing out with the click over the same 100 ms, and plans no backing after the Stop.
---

# Stop Ends the Session

## INTENT
Define how a session ends, so that every other ending can behave exactly like it.

## THE RULE / LOGIC
Stop ends the session: the backing and the click fade out over about 100 ms, and the review of that session opens; if the session ends during the count-in, the app goes back to Idle instead, with no review. Stop stays reachable throughout a session, count-in included. A hidden browser tab, and a staff that can no longer be shown, end a session exactly like Stop.

## TECHNICAL INTERFACE
The session view always offers Stop.

## EXPECTATION
- Stop, at any point after phrase 1 has started sounding, fades the backing and click out over about 100 ms and opens the review of that session.
- Stop during the count-in returns to Idle with no review.
