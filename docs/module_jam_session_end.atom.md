---
id: module_jam_session_end
status: DRAFT
layer: ARCHITECTURE
version: 0.1
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

What the review receives. The reviewed session of an ended Jam says that it is a Jam session and carries the Jam's part beside its closed history, gathered at the end from that history and from the running session: the quantized doodle with the tempo it was captured at; the doodle's first barline and its end barline; the raw doodle notes, the played notes the history marks as the doodle's, which belong to no phrase; for a fresh Jam, the first beat of its count-in, the clock its played notes are kept on; the key and mode suggestion the Jam worked out at its doodle's end, nothing to suggest, no mode fits, or a written key and mode, as the history kept it; whether the player has declined that suggestion, which at the end they have not; and the controls taken from the doodle. A reviewed session that is no Jam carries no Jam part. The review, and every change made to the session afterwards, read the Jam part only through the reviewed session, never from Jam's running state; a kept Jam session read back gives a Jam part of the same shape from its records (module_kept_jam_session), so the review reads one shape for a just-ended Jam and a kept one. The review draws the doodle section, the raw doodle notes in its played-notes lane and the suggestion from the Jam part; it shows none of the controls taken from the doodle, which are carried for Jam's view, whose readings show them.

The workspace after the end. A Jam's end never changes the mode, whatever its cause, a lost controller included: the workspace stays in Jam mode. Session mode stays held as it was left: a Jam's end asks session mode's Idle for no fresh phrase and discards nothing of session mode's. Jam's code is told that the Jam ended, with its Jam part, and fills Jam mode's Idle; after an end with a review, that Idle lies hidden under the review until the review mode is left. No doodle is kept after a fresh Jam yet: Jam mode's Idle then shows no phrase, as with no doodle kept.

Ends before phrase 1. A Jam that ends before phrase 1 sounds ends as a count-in end: no review, nothing saved or kept, the most recent session as it was, and no Jam part reaches the review. The workspace returns at once to Jam mode's Idle, focus where the design puts it for the cause. Only an end because no phrase 1 came by the deadline, every rung having failed, shows Jam's notice at Idle, until the next start or a change of a control; every other cause before phrase 1 shows nothing more.

## TECHNICAL INTERFACE
Not built yet; the names of the Jam part and of the end's report to Jam's code are written in at the sync of the wave that builds it. The end path is src/components/workspace/workspace-session-ends.ts; the reviewed session is ReviewedSession (src/components/workspace/workspace-session-controller-types.ts), built at the end by endedSession (src/components/workspace/session-review-state.ts) and, for a kept session, by src/components/workspace/workspace-kept-session-read.ts. The Jam part is read from the closed history's doodle() and suggestion() (src/session/session-history.ts; SessionDoodle and DoodleSuggestion in src/session/session-history-played-notes.ts) and from the session started without phrase 1 (module_session_start_without_phrase_one), which Jam's code starts through the session controller's startWithoutPhraseOne. Jam's view and its Idle are Jam's code (module_jam_code_boundary), reached through the workspace's mode (module_workspace_mode).

## EXPECTATION
- The review of an ended fresh Jam receives its quantized doodle with its capture tempo, the doodle's barlines, its raw doodle notes, its count-in's first beat, the suggestion as worked out at the doodle's end and no decline; a session that is no Jam has no Jam part.
- The review shows none of the controls taken from the doodle.
- After any Jam end the mode is still Jam, and session mode's phrase, prepared phrases and banners are as left: no session-mode phrase is generated.
- After a Jam's end with a review, leaving the review mode shows Jam mode's Idle.
- A Jam ended before phrase 1 opens no review, saves and keeps nothing, and returns to Jam mode's Idle with the design's focus; only an end with no phrase 1 by the deadline shows Jam's notice.
