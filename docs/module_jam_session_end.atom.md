---
id: module_jam_session_end
status: DRAFT
layer: ARCHITECTURE
version: 0.4
human_name: A Jam's End in the Workspace
parents:
  - [[req_jam]]
  - [[rule_jam_ending_before_phrase_one]]
  - [[rule_jam_ends_when_phrase_one_never_comes]]
  - [[rule_jam_runs_as_session_from_phrase_one]]
  - [[rule_leaving_jam_mode_keeps_session_mode]]
  - [[rule_raw_doodle_notes_are_played_notes]]
  - [[rule_review_opens_with_doodle]]
  - [[rule_session_end_generates_next_phrase_one]]
  - [[rule_suggestion_shown_after_jam_only]]
  - [[service_session_end]]
priority: 1
tags: [v3, release-v3.2, session, jam, review]
dependents:
  - [[module_kept_jam_session]]
type: MODULE
---

# A Jam's End in the Workspace

## INTENT
Carry a Jam's end through the workspace's one end path, so that the review of an ended Jam has everything its doodle section, its played-notes lane and its suggestion are drawn from, and the workspace is left in Jam mode's Idle with session mode untouched.

## THE RULE / LOGIC
One end path. A Jam ends through the session controller's one end path, as every session does (service_session_end): whatever its cause, the same teardown, and an end once phrase 1 has sounded opens the review over the closed history and makes that session the most recent one. The session engine never knows it ran a Jam.

What the review receives. The reviewed session of an ended Jam says that it is a Jam session and carries the Jam's part beside its closed history, gathered at the end from that history and from the running session: the quantized doodle with the tempo it was captured at; the doodle's first barline and its end barline; the raw doodle notes, the played notes the history marks as the doodle's, which belong to no phrase; for a fresh Jam, the first beat of its count-in, the clock its played notes are kept on; the key and mode suggestion the Jam worked out at its doodle's end, nothing to suggest, no mode fits, or a written key and mode, as the history kept it; whether the player has declined that suggestion, which at the end they have not; and the controls taken from the doodle. A reviewed session that is no Jam carries no Jam part. The review, and every change made to the session afterwards, read the Jam part only through the reviewed session, never from Jam's running state; a kept Jam session read back gives a Jam part of the same type from its records (module_kept_jam_session), its times on its phrases' clock and with no suggestion and no controls, which the records do not hold; the review works the suggestion out again from the doodle, the same doodle giving the same answer, so it reads one shape for a just-ended Jam and a kept one. The review draws the doodle section, the raw doodle notes in its played-notes lane and the suggestion from the Jam part; it shows none of the controls taken from the doodle, which are carried for Jam's view, whose readings show them.

The workspace after the end. A Jam's end never changes the mode, whatever its cause, a lost controller included: the workspace stays in Jam mode. Session mode stays held as it was left: a Jam's end asks session mode's Idle for no fresh phrase and discards nothing of session mode's. The shell learns of the end from the controller's end summary, lets the running Jam go and returns Jam mode's Idle; after an end with a review, that Idle lies hidden under the review until the review mode is left. The end summary of an end with a review carries the Jam part that review shows, with its session's key, and the shell hands it to Jam's kept doodle (module_kept_doodle), so Jam mode's Idle then shows phrase 1 written from that doodle; a Jam on the kept doodle hands the same doodle, now coming from its own session. An end before phrase 1 hands none: a fresh Jam's doodle is not kept, and a doodle kept already stays.

Ends before phrase 1. A Jam that ends before phrase 1 sounds ends as a count-in end: no review, nothing saved or kept, the most recent session as it was, and no Jam part reaches the review. The workspace returns at once to Jam mode's Idle, focus where the design puts it for the cause. Only an end because no phrase 1 came by the deadline, every rung having failed, shows Jam's notice at Idle, until the next start, a change of a control or leaving Jam mode; every other cause before phrase 1 shows nothing more.

## TECHNICAL INTERFACE
The end path is src/components/workspace/workspace-session-ends.ts; the reviewed session is ReviewedSession (src/components/workspace/workspace-session-controller-types.ts), whose optional jam is the Jam part, a ReviewedJamPart (src/components/workspace/session-jam-part.ts): doodle, the SessionDoodle the closed history kept (the quantized doodle, captureTempo, firstBarlineAt, endBarlineAt and playedNotes, the raw doodle notes; src/session/session-history-played-notes.ts), countInStartAt, suggestion (a DoodleSuggestion, or null), suggestionDeclined, and doodleControls (DoodleReadings, src/jam/doodle-controls.ts, or null). At the end, jamPartOf(session) gathers it from the closed history's doodle() and suggestion() (src/session/session-history.ts) and from the running session's timeline and doodleControls, a session started with phrase 1 giving none and a Jam that sounded phrase 1 missing any of the three throwing; endedSession(history, keeping, saving, jam) (src/components/workspace/session-review-state.ts) puts it beside the history, and for a kept session keptJamPart in src/components/workspace/workspace-kept-session-read.ts reads it from the decoded KeptJam (module_kept_jam_session). withoutRawDoodleNotes and declinedJamPart (session-jam-part.ts) give it after Delete played notes and Keep mine. A fresh Jam is started by Jam's driver, startFreshJam (src/jam/fresh-jam.ts), through the shell's useFreshJam (src/components/workspace/use-fresh-jam.ts) over the session controller's startWithoutPhraseOne (module_session_start_without_phrase_one); the driver hands the session the doodle (recordDoodle), its suggestion (recordSuggestion) and, at phrase 1's hand-over, the controls taken from the doodle (recordDoodleControls, kept as the running session's doodleControls), and phrase 1 enters the workspace through enterPhraseOne (phraseOneEntry, src/components/workspace/workspace-session-phrase-one-entry.ts). A session started without phrase 1 hands session mode no tempo reached and asks its Idle for no fresh phrase (workspace-session-ends.ts). The end reaches Jam's side through useFreshJam, which watches the controller's lastEnd, a SessionEndSummary whose optional jam, an EndedJam {part, sessionKey}, it hands to its keepDoodle seam (the workspace's kept doodle, src/components/workspace/use-kept-doodle-host.ts), lets the running Jam go, and shows jam-notice only after an end because no phrase 1 came; the end's focus in Jam mode is jamSessionEndFocusTarget (src/components/workspace/session-end-focus.ts). Jam's view and its Idle are Jam's code (module_jam_code_boundary), reached through the workspace's mode (module_workspace_mode).

## EXPECTATION
- The review of an ended fresh Jam receives its quantized doodle with its capture tempo, the doodle's barlines, its raw doodle notes, its count-in's first beat, the suggestion as worked out at the doodle's end and no decline; a session that is no Jam has no Jam part.
- The review shows none of the controls taken from the doodle.
- After any Jam end the mode is still Jam, and session mode's phrase, prepared phrases and banners are as left: no session-mode phrase is generated.
- After a Jam's end with a review, Jam's kept doodle is that review's doodle, and leaving the review mode shows Jam mode's Idle with phrase 1 written from it; an end before phrase 1 keeps no fresh Jam's doodle and leaves a kept one kept.
- A Jam ended before phrase 1 opens no review, saves and keeps nothing, and returns to Jam mode's Idle with the design's focus; only an end with no phrase 1 by the deadline shows Jam's notice.
- A kept Jam session read back gives a Jam part of the same type, with no suggestion and no controls.
