---
id: service_session_end
status: REVIEW
type: SERVICE
version: 0.1
priority: 1
human_name: Practice Session End
tags: workspace,session,end,review
layer: ARCHITECTURE
parents:
  - [[req_last_session_review]]
  - [[rule_count_in_ending_returns_to_idle]]
  - [[rule_hidden_tab_ends_session]]
  - [[rule_new_session_discards_review]]
  - [[rule_session_end_generates_next_phrase_one]]
  - [[rule_session_ends_on_portrait_view]]
  - [[rule_session_ends_when_staff_too_small]]
  - [[rule_stop_ends_session]]
  - [[service_workspace_session_flow]]
notes: Split out on 2026-10-05 from service_workspace_session_flow (version 1.6) during documentation debt paydown; the text is moved unchanged in meaning and keeps its DRAFT status.
dependents: []
---

# Practice Session End

## INTENT
End a practice session through one path whatever its cause, return the workspace to Idle, and keep what the ended session leaves for its review.

## THE RULE / LOGIC
During a session, a staff layout report after which a phrase shown or waiting no longer fits, or a failure of the session's staff, ends the session with the staff-not-shown cause. Every end takes one path: Stop, an interruption of the audio by the browser (ended with the stop cause), and what the end watchers report. The runner gets the end, then the scheduled events, the wake-ups, the audio, both locks and the end watchers are torn down, the session state returns to Idle, and the end's summary (cause, phase, number of phrases that started sounding) and the closed history are kept. An end once phrase 1 has started sounding then opens the last session's review over that closed history, shown in place of the staff, and, the staff's reports handed back to Idle, asks Idle for the next phrase through its fresh-phrase action (the Idle fit round's fresh run), without waiting for it; an end during the count-in opens no review and asks for nothing. While the review shows no session starts; closing it keeps it, and it can be shown again at Idle until the next start discards it. From start to end, the end watchers end the session for a hidden page (the hidden-tab cause), and for a window change or a staff layout report the session window rule rejects for the held layout, or any notation error of phrase 1's engraving (the staff-not-shown cause). A programming error propagates uncaught, after ending the session it belongs to if that session still runs.

## TECHNICAL INTERFACE
The session controller's end actions: stop (throws with no session running), closeReview (throws unless the review shows) and showReview (throws unless a review exists, does not show, and no session runs). Its readonly state keeps the last end's summary and closed history, and the last session's review, its closed history, whether it shows and tempoReached, the last sounded phrase's tempo, or null when none exists.

## EXPECTATION
Every end, whatever its cause, ends the runner, releases both locks, stops the wake-ups, fades the audio out unless the transport already stopped it, stops the end watchers and returns the session state to Idle exactly once; a second cause arriving in the same tick ends nothing more. After an end once phrase 1 has started sounding, the review opens over the closed history and Idle starts a fresh phrase at once; no session starts while the review shows, and the next accepted start discards it. An end during the count-in opens no review and generates nothing.
