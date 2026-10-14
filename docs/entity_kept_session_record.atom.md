---
id: entity_kept_session_record
status: DRAFT
version: 0.2
tags: [v3, release-v3.0, storage, review, session]
parents:
  - [[module_session_seed_plan]]
  - [[req_kept_session_list]]
  - [[rule_kept_session_content]]
  - [[rule_kept_session_holds_no_acknowledgements]]
  - [[rule_played_notes_kept_only_after_opt_in]]
notes: Revised 2026-10-14 to version 0.2 (previous version 0.1) at the v3.0 wave-3 post-task sync, from build plan chunk 9 as merged (kept-session record, merge fcabf7f), recording what the capture left to the leader: the length runs from phrase 1 scheduled start to the end of the last phrase that sounded; the session seed stays in the session-wide record; each body phrase also holds its resolved request; the played-notes record exists exactly when the session-wide record says its played notes are kept. The size line now gives the measured figure: a 30-minute 240 BPM Jazz Sixteenth session measures 4.07 MB for its session-wide record and body (about 9 KB a phrase), its played notes adding about 1.5 MB, against the spec estimate of about 3.5 MB; the coordinator accepted the measured size with no compact encoding, as told to the owner, and the test guards 4.25 MB. Built in storage and not wired yet: nothing saves a session until build plan chunk 10. Status DRAFT, unchanged. Earlier: Created 2026-10-14 at DRAFT by the pre-code architecture capture for v3.0 build plan chunk 9 (wave-3 preflight), from master spec sections 5.1 to 5.4, 7.1 and 12, spec D255, D258, D293 and D295, the storage design module_on_device_database records, and the session list and review designs.
human_name: Kept-Session Record
type: ENTITY
layer: ARCHITECTURE
priority: 1
dependents:
  - [[module_kept_session_codec]]
---

# Kept-Session Record

## INTENT
Give each kept session one fixed stored shape, split so the session list reads only small records, the phrases are read only when a session is opened, and the player's own notes live apart and only when kept.

## THE RULE / LOGIC
A kept session is stored as up to three records, all under the same key, the session's key, which whoever saves the session supplies and which no record holds: its session-wide record in the sessionSummaries store, its body in the sessionBodies store, and its played notes in the playedNotes store, present exactly when the session-wide record says its played notes are kept. Each record carries the record envelope's two versions; in v3.0 each of the three shapes is at data version 1.

The session-wide record holds the session's own facts and what one row of the session list shows: the session's start date and time, on the wall clock, in epoch milliseconds; its length, in seconds from phrase 1's scheduled start to the end of the last phrase that sounded, that phrase's four measures at its tempo; its number of phrases; the musical profile selected at its start, kept as the selection itself (the profile, whether it was customized, and, customized, the controls the list's label names), not as words; the instrument it was played with, by its id, and that instrument's display name as the session showed it; the starting tempo and the tempo it reached; whether it is pinned; its number of favorites; its comment, empty until the player writes one, at most 500 characters; whether its played notes are kept; the app version that recorded it, a field of its own that a later migration never rewrites, unlike the envelope's app version, which names the app that last wrote the record; and its session seed. It holds nothing that can be derived from the session seed: not the later phrases' seeds, the ladder rungs' seeds or the Vary settings mutation seed.

The body holds, for each phrase that sounded, in sounding order: its phrase number; its start, in seconds from the session's start; its generation request as resolved, with the register and the register window it was generated in; its generated concert timeline, as shown; the harmony its chord symbols are drawn from; its generation intent, the inputs that reproduce it, with the instrument profile as data (never only its id), the seed and the carry-in; its tempo; its repeat mark, with the number of the phrase it repeats; its favorite mark; and its clef, the clef the phrase was drawn in, display only (a built-in instrument's is always treble). A later change of My instrument's name or clef changes nothing stored.

The played-notes record holds every played note of the session in onset order, each with its concert pitch, velocity, onset and release in seconds from the session's start, stray notes included, exactly as the session received them after latency compensation. Played notes are kept all or none: a session whose session-wide record says they are kept and that has no played-notes record, or that has one while the record says they are not kept, is unreadable.

The session's start, for every time the records hold, is phrase 1's scheduled start on the audio clock: the earliest moment of the session the history places on that clock, and no played note before it is recorded. Times on the audio clock mean nothing after a reload; seconds from that start do.

No record holds which expected notes were acknowledged, the rhythm or tension provenance, the generation diagnostics, or anything else the review and the exports do not read: with no acknowledgement kept, nothing kept can count the player's hits.

## TECHNICAL INTERFACE
src/storage/records/kept-session-record.ts gathers the three stored shapes, each with RecordVersions from src/storage/record-envelope.ts at data version 1 (KEPT_SESSION_DATA_VERSION, in kept-reading.ts) and an allowlist of keys: the session-wide record, KeptSessionSummaryRecord in kept-session-summary.ts (KEPT_SESSION_SUMMARY_KEYS; lengthSeconds, sessionSeed, recordedByAppVersion among its fields; KEPT_SESSION_COMMENT_MAX_LENGTH is 500); the body, KeptSessionBodyRecord and KeptPhraseRecord in kept-session-body.ts (KEPT_SESSION_BODY_KEYS, KEPT_PHRASE_KEYS: phraseNumber, startsAt, request, timeline, harmony, intent, tempo, isRepeat, an optional repeatOf, favorite, clef); and the played notes, KeptPlayedNotesRecord in kept-played-notes.ts (KEPT_PLAYED_NOTES_KEYS, KEPT_PLAYED_NOTE_KEYS). The stores are the existing sessionSummaries, sessionBodies and playedNotes of the on-device database; no store, index or data version is added. The instrument's id is the profile's id, my-instrument for My instrument. The clef is one of the instrument clefs of src/domain/profile/instrument-clef.ts.

## EXPECTATION
- Every key of every kept-session record is on its shape's allowlist; no acknowledgements, provenance.rhythm, provenance.tensionBinding or diagnostics key appears anywhere.
- The session-wide record holds the session seed and no seed derived from it.
- The session-wide record names the instrument by its id and keeps the display name the session showed.
- The session's length runs from phrase 1's scheduled start to the end of the last phrase that sounded.
- Each kept phrase holds its resolved request and its intent with the instrument profile as data, and its clef beside them.
- Every time stored is in seconds from phrase 1's scheduled start.
- A played-notes record exists exactly when the session-wide record says the played notes are kept; otherwise the session is unreadable.
- A 30-minute 240 BPM Jazz Sixteenth session measures 4.07 MB for its session-wide record and body, its played notes adding about 1.5 MB, and the session-wide record and body together stay within 4.25 MB.
