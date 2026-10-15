---
id: service_session_end
status: REVIEW
type: SERVICE
version: 0.3
priority: 1
human_name: Practice Session End
tags: workspace,session,end,review
layer: ARCHITECTURE
parents:
  - [[req_last_session_review]]
  - [[rule_count_in_ending_returns_to_idle]]
  - [[rule_hidden_tab_ends_session]]
  - [[rule_most_recent_session_kept]]
  - [[rule_new_session_discards_review]]
  - [[rule_session_end_generates_next_phrase_one]]
  - [[rule_session_ends_on_portrait_view]]
  - [[rule_session_ends_when_staff_too_small]]
  - [[rule_stop_ends_session]]
  - [[service_workspace_session_flow]]
dependents: []
---

# Practice Session End

## INTENT
End a practice session through one path whatever its cause, return the workspace to Idle, and keep what the ended session leaves for its review, as the most recent session.

## THE RULE / LOGIC
During a session, a staff layout report after which a phrase shown or waiting no longer fits, or a failure of the session's staff, ends the session with the staff-not-shown cause. Every end takes one path: Stop, an interruption of the audio by the browser (ended with the stop cause), and what the end watchers report. The runner gets the end, then the scheduled events, the wake-ups, the audio, both locks and the end watchers are torn down, the session state returns to Idle, and the end's summary (cause, phase, number of phrases that started sounding) and the closed history are kept. An end once phrase 1 has started sounding then opens the last session's review over that closed history, shown in place of the staff, named from the session's own data (the instrument's display name from phrase 1's intent), makes that session the most recent one, asks for the session's own save, after the release of the saves held during it, without waiting for it, its outcome settling how the session is kept (not saved when the page went away before the save could finish), and, the staff's reports handed back to Idle, asks Idle for the next phrase through its fresh-phrase action (the Idle fit round's fresh run), without waiting for it; an end during the count-in opens no review, saves nothing, asks for nothing and leaves the most recent session as it was. While the review or the session list shows no session starts; closing it keeps it, and the next start closes it; the most recent session stays, and Review last session shows it again at Idle, until the next session ends with a review and takes its place. From start to end, the end watchers end the session for a hidden page (the hidden-tab cause), and for a window change or a staff layout report the session window rule rejects for the held layout, or any notation error of phrase 1's engraving (the staff-not-shown cause). A programming error propagates uncaught, after ending the session it belongs to if that session still runs.

## TECHNICAL INTERFACE
The session controller's end actions: stop (throws with no session running), closeReview (leaves the review mode, from the review or the session list, the review kept; throws unless one of them shows) and showReview (shows the most recent session's review: at once for one held in memory, after reading it by its key for one kept on the device; resolves a SessionOpening, 'shown', 'failed' when the read does not give it and the session list shows instead, or 'superseded' when a session started or the most recent session changed meanwhile; throws unless a most recent session exists, neither the review nor the list shows, no session runs and no read is under way). Its readonly state keeps the last end's summary and closed history; the review, the session it draws (its history, its instrument's name, tempoReached, the last sounded phrase's tempo, and how it is kept) and whether it shows, or null when none exists; mostRecent, the most recent session, held in memory or kept on the device under its key, or null; readingMostRecent; and listShowing.

## EXPECTATION
Every end, whatever its cause, ends the runner, releases both locks, stops the wake-ups, fades the audio out unless the transport already stopped it, stops the end watchers and returns the session state to Idle exactly once; a second cause arriving in the same tick ends nothing more. After an end once phrase 1 has started sounding, the review opens over the closed history, that session becomes the most recent one, its save is asked for without delaying the end, and Idle starts a fresh phrase at once; no session starts while the review shows, and the next accepted start closes it while the most recent session stays. An end during the count-in opens no review, saves and generates nothing, and leaves the most recent session as it was.
