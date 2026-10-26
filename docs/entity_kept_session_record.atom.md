---
id: entity_kept_session_record
status: STABLE
version: 0.7
tags: [v3, release-v3.0, storage, review, session]
parents:
  - [[module_session_seed_plan]]
  - [[req_kept_session_list]]
  - [[rule_kept_session_content]]
  - [[rule_kept_session_holds_no_acknowledgements]]
  - [[rule_played_notes_kept_only_after_opt_in]]
human_name: Kept-Session Record
type: ENTITY
layer: ARCHITECTURE
priority: 1
dependents:
  - [[module_kept_session_changes]]
  - [[module_kept_session_codec]]
  - [[module_kept_session_jam_upgrade_step]]
  - [[module_kept_session_save]]
---

# Kept-Session Record

## INTENT
Give each kept session one fixed stored shape, split so the session list reads only small records, the phrases are read only when a session is opened, and the player's own notes live apart and only when kept.

## THE RULE / LOGIC
A kept session is stored as up to three records, all under the same key, the session's key: its session-wide record in the sessionSummaries store, its body in the sessionBodies store, and its played notes in the playedNotes store, present exactly when the session-wide record says its played notes are kept. Each record carries the record envelope's two versions, and each shape holds its own data version: the session-wide record and the body are at data version 4, the played notes at data version 1. A data version 2 session-wide record and body are carried over to these shapes at the upgrade to data version 4 (module_kept_session_jam_upgrade_step), with no Jam part; a data version 1 one reaches data version 2 first (module_kept_session_upgrade_step).

The session's key has the form `session-{startedAt}-{sessionSeed}`, both numbers written in decimal: the session's wall-clock start in epoch milliseconds and its 32-bit session seed, the same two facts the session-wide record holds. The session's save mints it once, when it writes the session; it is never rebuilt from a record. No code reads a fact back from a key. The key stays in no record: the records are found again by it through the on-device database's keyed read.

The session-wide record holds the session's own facts and what one row of the session list shows: the session's start date and time, on the wall clock, in epoch milliseconds; its length, in seconds from phrase 1's scheduled start to the end of the last phrase that sounded, that phrase's four measures at its tempo; its number of phrases; the preset label: the selection's name at the session's start, or Custom and the name of the preset it was based on, kept as text and never rewritten when that preset is later renamed or deleted; the instrument it was played with, by its id, and that instrument's display name as the session showed it; the starting tempo and the tempo it reached; whether it is pinned; its number of favorites; its comment, empty until the player writes one, at most 500 characters; whether its played notes are kept; the app version that recorded it, a field of its own that a later migration never rewrites, unlike the envelope's app version, which names the app that last wrote the record; its session seed; whether it is a Jam session; and, for a Jam session, whether the player declined its key and mode suggestion. It holds nothing that can be derived from the session seed: not the later phrases' seeds, the ladder rungs' seeds or the Vary settings mutation seed.

The body holds, for each phrase that sounded, in sounding order: its phrase number; its start, in seconds from the session's start; its generation request as resolved, with the register and the register window it was generated in; its generated concert timeline, as shown; the harmony its chord symbols are drawn from; its generation intent, the inputs that reproduce it, with the seven figure levels and no musical profile's or preset's name, the instrument profile as data (never only its id), the seed, the carry-in, from the phrase before or, for a Jam's phrase 1, from the doodle, and, when the phrase had them, the rhythm lock group and the steering block, which its resolved request holds too; its tempo; its repeat mark, with the number of the phrase it repeats; its favorite mark; and its clef, the clef the phrase was drawn in, as the session's history recorded it at the session's start, display only (a built-in instrument's is always treble; my instrument's is the one it had when the session started). A later change of My instrument's name or clef changes nothing stored. For a Jam session, the body also holds the quantized doodle with the tempo it was captured at, and, for a fresh Jam, its played-notes clock (below), whether or not its played notes are kept; a session that is not a Jam holds none.

The played-notes record holds every played note of the session in onset order, each with its concert pitch, velocity, onset and release in seconds from the start of its clock: the session's start, or, for a fresh Jam (one whose doodle was played in it), the first beat of its count-in, stray notes included, exactly as the session received them after latency compensation. Played notes are kept all or none: a session whose session-wide record says they are kept and that has no played-notes record, or that has one while the record says they are not kept, is unreadable.

The session's start, for every time the records hold but a fresh Jam's played notes, is phrase 1's scheduled start on the audio clock, and no played note before it is recorded but a fresh Jam's raw doodle notes. A fresh Jam times its played notes from its count-in's first beat, on the same clock, which comes before every doodle note, even one played early onto the first beat; its body holds the doodle's first barline and phrase 1's scheduled start in seconds from that beat, and its played notes before phrase 1's start are exactly its raw doodle notes. Times on the audio clock mean nothing after a reload; seconds from these starts do.

No record holds which expected notes were acknowledged, the rhythm or tension provenance, the generation diagnostics, or anything else the review and the exports do not read: with no acknowledgement kept, nothing kept can count the player's hits.

## TECHNICAL INTERFACE
src/storage/records/kept-session-record.ts gathers the three stored shapes, each with RecordVersions from src/storage/record-envelope.ts at its own shape's data version, held in kept-reading.ts (KEPT_SESSION_SUMMARY_DATA_VERSION 4, KEPT_SESSION_BODY_DATA_VERSION 4, KEPT_PLAYED_NOTES_DATA_VERSION 1), and an allowlist of keys: the session-wide record, KeptSessionSummaryRecord in kept-session-summary.ts (KEPT_SESSION_SUMMARY_KEYS; lengthSeconds, presetLabel, sessionSeed, recordedByAppVersion and isJam among its fields, and suggestionDeclined, present exactly on a Jam session; KEPT_SESSION_COMMENT_MAX_LENGTH is 500); the body, KeptSessionBodyRecord and KeptPhraseRecord in kept-session-body.ts (KEPT_SESSION_BODY_KEYS, KEPT_PHRASE_KEYS: phraseNumber, startsAt, request, timeline, harmony, intent, tempo, isRepeat, an optional repeatOf, favorite, clef), with, on a Jam session's body only, doodle, a KeptDoodle (KEPT_DOODLE_KEYS: quantized, captureTempo), and, on a fresh Jam's only, beside it, playedNotesClock, a KeptPlayedNotesClock (KEPT_PLAYED_NOTES_CLOCK_KEYS: doodleFirstBarline, phraseOneStart, in seconds from the count-in's first beat), these two allowlists in kept-session-body-read.ts; and the played notes, KeptPlayedNotesRecord in kept-played-notes.ts (KEPT_PLAYED_NOTES_KEYS, KEPT_PLAYED_NOTE_KEYS). The stores are the existing sessionSummaries, sessionBodies and playedNotes of the on-device database; no store or index is added, and data version 2's step carries the data version 1 records over (module_kept_session_upgrade_step), and data version 4's the data version 2 ones (module_kept_session_jam_upgrade_step). The key is a string, `session-${startedAt}-${sessionSeed}` in decimal, minted by the session's save (keptSessionKey in src/components/workspace/workspace-session-save.ts, module_kept_session_save). The instrument's id is the profile's id, my-instrument for My instrument. The clef is one of the instrument clefs of src/domain/profile/instrument-clef.ts.

## EXPECTATION
- Every key of every kept-session record is on its shape's allowlist; no acknowledgements, provenance.rhythm, provenance.tensionBinding or diagnostics key appears anywhere.
- A kept session's three records sit under one key of the form `session-{startedAt}-{sessionSeed}`, in decimal, and no record holds that key.
- The session-wide record holds the session seed and no seed derived from it.
- The session-wide record names the instrument by its id and keeps the display name the session showed.
- The session's length runs from phrase 1's scheduled start to the end of the last phrase that sounded.
- Each kept phrase holds its resolved request and its intent with the seven figure levels, with the rhythm lock group and the steering block when the phrase had them, no musical profile's or preset's name, and the instrument profile as data, and its clef beside them: the clef the history recorded, whatever clef my instrument has later.
- Every time stored is in seconds from phrase 1's scheduled start, but a fresh Jam's played notes, from its count-in's first beat; no played note before phrase 1 is stored but a fresh Jam's raw doodle notes.
- A session that is not a Jam holds no quantized doodle, and its session-wide record says it is not a Jam session.
- A played-notes record exists exactly when the session-wide record says the played notes are kept; otherwise the session is unreadable.
- A 30-minute 240 BPM Jazz Sixteenth session measures 4.07 MB for its session-wide record and body, its played notes adding about 1.5 MB, and the session-wide record and body together stay within 4.25 MB.
