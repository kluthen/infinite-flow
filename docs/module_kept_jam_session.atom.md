---
id: module_kept_jam_session
status: REVIEW
type: MODULE
version: 0.3
priority: 1
human_name: Keeping a Jam Session
layer: ARCHITECTURE
tags: [v3, release-v3.2, jam, storage, privacy, review]
parents:
  - [[entity_kept_session_record]]
  - [[module_jam_session_end]]
  - [[req_kept_session_list]]
  - [[rule_deleting_played_notes_keeps_quantized_doodle]]
  - [[rule_jam_in_visits_that_save_nothing]]
  - [[rule_kept_session_content]]
  - [[rule_quantized_doodle_is_generation_input]]
  - [[rule_raw_doodle_notes_are_played_notes]]
  - [[rule_suggestion_keep_mine]]
dependents: []
---

# Keeping a Jam Session

## INTENT
Keep a Jam session on the device in v3.2's kept-session shape, its doodle in both forms by the privacy split, so that its review, its list row and its deletions read the same after a reload.

## THE RULE / LOGIC
The save. A Jam session is saved at its end as any session with a review, through the same save (module_kept_session_save); a Jam ended before phrase 1 saves nothing. The save passes the session's Jam facts from the reviewed session's Jam part (module_jam_session_end): that it is a Jam session; its quantized doodle with its capture tempo, always, whatever Keep my played notes says; whether its suggestion was declined, which at the end it has not been; and, for a fresh Jam, its fresh moments: its count-in's first beat, its doodle's first barline and its raw doodle notes. A Jam on a kept doodle has no fresh moments.

What lands where, in the shape the kept-session record already has (entity_kept_session_record). The session-wide record holds the Jam mark and the decline, the decline present exactly on a Jam session. The body holds the quantized doodle with its capture tempo, each phrase's steering block and phrase 1's join from the doodle in their generation intents, and, for a fresh Jam, its played-notes clock (the doodle's first barline and phrase 1's scheduled start, in seconds from the count-in's first beat), whatever Keep my played notes says. The played-notes record exists only while Keep my played notes is on: for a fresh Jam it holds the raw doodle notes with every other played note, all timed from the count-in's first beat, the raw ones being those before phrase 1's start. For a Jam on a kept doodle, whose body holds no played-notes clock, it holds the played notes timed from phrase 1's start, as session mode's, and no raw doodle note.

Raw doodle notes are played notes. A session holds played notes to keep when a phrase holds a played note or, in a fresh Jam, the doodle has a raw note. So a Jam in which only the doodle was played keeps its raw doodle notes under the opt-in, at its end or when Keep my played notes is turned on in its review, and Delete played notes then shows for it.

Changes after the save, through the path every kept session's changes take (module_kept_session_changes). Keep mine writes the decline into the session-wide record, a change of the same kind as a pin: kept in memory as made when the device refuses it, held for the visit while saving is off, and carried by a retry of a session whose own save was refused. Deleting a Jam session's played notes, one session's or every session's, deletes its played-notes record, the raw doodle notes with it, and keeps the body, its doodle and its clock; Delete played notes' confirmation for a Jam session reads the design's Jam copy. Deleting a Jam session deletes its three records, so both forms of its doodle; Delete every session and Delete everything leave no Jam session.

The list and the summary. A Jam session's list row and its review's summary read the Jam mark from the session-wide record: "Jam" comes first in the detail line, with no preset part. A session kept before v3.2 is never a Jam session. A Jam session a newer version wrote is listed as any newer session.

Visits that save nothing. In an outdated tab or a visit started from the defaults, a Jam runs and is reviewed in memory: nothing is written, the decline included.

## TECHNICAL INTERFACE
The save is src/components/workspace/workspace-session-save.ts: endedSessionSave(history, keepPlayedNotes, presets, jam) gives the EndedSessionSave's jam, a KeptJamSave from keptJamSave(jam) (the quantized doodle with its capture tempo, and the fresh moments keptFreshJam(jam) gives, a KeptFreshJam: countInStartsAt, doodleFirstBarlineAt, rawDoodleNotes), and saveEndedSession hands encodeKeptSession its KeptJamFacts {doodle, suggestionDeclined, fresh}, suggestionDeclined from HeldSessionFacts.suggestionDeclined, and encodeKeptPlayedNotes the KeptFreshJam (src/storage/records/kept-session-record.ts); whether a session holds played notes to keep is holdsPlayedNote (src/components/workspace/session-review-state.ts), a raw doodle note counting, and keeping them later passes keptFreshJam(jam) to keepSessionPlayedNotes (src/components/workspace/workspace-kept-played-notes.ts). The decline is the controller's declineSuggestion(key), through createKeptSessionEdits (src/components/workspace/workspace-kept-session-edits.ts) and changeKeptDecline in src/components/workspace/kept-session-review-changes.ts; deleting played notes gives the Jam part withoutRawDoodleNotes (src/components/workspace/session-jam-part.ts). A kept Jam session is read back through decodeKeptSession's KeptJam and keptJamPart in src/components/workspace/workspace-kept-session-read.ts, every time moved onto its phrases' clock (phrase 1 starting at 0), its suggestion and its controls null, since the records hold neither; a Jam on a kept doodle, which holds no played-notes clock, reads back as its review showed it at its end: the kept doodle at its capture tempo (keptSessionDoodle, src/components/workspace/session-jam-part.ts), its measures ending at phrase 1's start, no raw doodle note and no count-in (countInStartAt null). keptFreshJam(jam) gives null for a Jam on a kept doodle, so its save holds no fresh moments. The row's text is src/components/review/session-row-text.ts, from the row's summary (src/storage/records/kept-session-summary.ts, isJam, and NewerKeptSummaryFacts.isJam for a row a newer version wrote); the review's summary is in src/components/review/ReviewPanel.vue; Delete played notes' Jam copy is in src/components/workspace/review-confirmation-copy.ts, and Your data's played-notes deletions say the doodles stay when a Jam session keeps played notes (jamKeepsPlayedNotes, src/components/workspace/your-data-copy.ts).

## EXPECTATION
- With Keep my played notes off, a Jam session reloaded has its doodle and capture tempo back and no raw doodle note in storage; with it on, its raw doodle notes are back, told apart from the others by their times.
- A Jam in which only the doodle was played keeps its raw doodle notes under the opt-in, and Delete played notes shows for it, its confirmation in the Jam copy.
- Deleting a Jam session's played notes keeps its doodle; deleting the session removes both forms; Delete everything leaves no Jam session.
- Keep mine is still declined after a reload; in a visit that saves nothing, nothing is written, the decline included.
- A Jam session's list row and review summary begin with "Jam" and have no preset part; a session kept before v3.2 has no Jam mark.
- A Jam on a kept doodle, kept and reloaded, has no played-notes clock and no raw doodle note, its played notes timed from phrase 1; its review reads back with the kept doodle at its capture tempo and an empty lane, as at its end.
