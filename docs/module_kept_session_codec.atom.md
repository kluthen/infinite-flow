---
id: module_kept_session_codec
status: DRAFT
human_name: Kept-Session Codec
type: MODULE
priority: 1
parents:
  - [[entity_kept_session_record]]
  - [[req_kept_session_review]]
  - [[rule_kept_session_content]]
  - [[rule_outdated_tab_reads_what_it_can]]
  - [[service_session_history]]
notes: Revised 2026-10-14 to version 0.2 (previous version 0.1) at the v3.0 wave-3 post-task sync, from build plan chunk 9 as merged (kept-session record, merge fcabf7f), recording what the capture left to the leader: the narrower phrase type the review and the exports read, ReviewedPhrase with ReviewedOutcome, is declared in src/session/session-history.ts (a type-only change; the notation input takes the matching NotatedOutcome), so no review input adapter was needed; a stored harmony and a stored intent are validated by the codec own validators in src/storage/records/kept-phrase-parsers.ts, the profile through parseInstrumentProfile on the data the record holds, never rebuilt from its id; the encoder refuses a My instrument phrase until build plan chunk 17 puts the clef in the history. Built in storage and not wired yet: nothing saves or opens a kept session until build plan chunk 10. Status DRAFT, unchanged. Earlier: Created 2026-10-14 at DRAFT by the pre-code architecture capture for v3.0 build plan chunk 9 (wave-3 preflight), from master spec sections 4.3, 5.2 and 5.4, the build plan chunk 9 scope, and the session history, worker protocol and export code as merged on main 488d9e0.
dependents: []
layer: ARCHITECTURE
version: 0.2
tags: [v3, release-v3.0, storage, review, session]
---

# Kept-Session Codec

## INTENT
Turn a finished session's in-memory history into the records a kept session is stored as, and those records back into exactly what the review and the exports read, so a kept session reviews and exports as it did when it ended.

## THE RULE / LOGIC
The codec is pure: it maps between values and never opens the database, reads a clock or draws a seed. Saving the records, choosing the session's key and deleting older sessions belong to whoever saves the session.

Encoding takes a finished session's in-memory history, with the session's facts the history does not hold (whether it is pinned, its favorites, its comment, whether its played notes are kept), and gives the session-wide record, the body and, only when the played notes are kept, the played-notes record. It reads the start time, the instrument id, the session seed, the phrases and their tempos from the history; the musical profile selected at the start and the instrument's display name from phrase 1's intent, made under the settings locked at Start; the starting tempo from phrase 1 and the tempo reached from the last phrase; the length from phrase 1's scheduled start to the end of the last phrase. Each phrase's clef is the clef its review draws it in: treble for a built-in instrument. Until the history records the clef a My instrument phrase was drawn in, the encoder refuses a My instrument phrase, by throwing, rather than guess its clef. It also throws, as a defect of the caller, for a history with no phrase, a phrase played on another instrument than the session's, a favorite that is not a phrase of the session or is listed twice, a comment over 500 characters or an empty app version. Every field is copied by name onto the stored shape, never by copying a history object whole, so the acknowledgements, the rhythm and tension provenance and the diagnostics the history holds never reach a record. Played notes are taken from every phrase, in onset order. Every time is rebased to seconds from phrase 1's scheduled start.

Decoding classifies each stored value through the record envelope first. A newer record leaves the whole session unread and reported as newer, so a session saved by a newer version is listed as such and does not open. An unreadable value, or a current one that fails validation, makes the session unreadable, never repaired, defaulted or partly decoded. A current record is validated field by field: the generation request through its own parser, the timeline through the timeline parser, the clef as one of the instrument clefs, and the harmony and the generation intent through the codec's own validators, which check every field against the domain types and call the domain's parsers where they exist (the carry-in's among them). The intent's instrument profile goes through the profile parser on the data the record holds, never rebuilt from its id. Records that disagree are unreadable too: a request and an intent with another request id or seed, a body whose phrase count, favorites count or instrument differs from the session-wide record's, or a played-notes record present when the played notes are not kept, or missing when they are.

Decoding gives what the review and the exports read for that session: its session-wide facts, and its phrases in order, each with its number, start, outcome, intent, tempo, repeat mark, favorite mark and clef, and the played notes placed in the phrase their onset falls in, as the history places them, phrase 1 starting at time 0. The review and the exports read a phrase through a narrower type that a live history record and a decoded kept phrase both give: its number, start, outcome, intent, tempo and played notes, the outcome holding only the result, with its request id, seed and timeline, and the harmony. Decoding fills no field the records do not hold: no acknowledgement, provenance or diagnostics is made up. A session decoded this way reviews and exports exactly as the same session did in memory when it ended.

The history and the export modules never import the codec, and stay free of storage.

## TECHNICAL INTERFACE
src/storage/records/kept-session-record.ts exports encodeKeptSession(history, facts, appVersion), from the history (KeptSessionHistory: its phrases, startedAt, instrumentProfileId and sessionSeed) and the session's KeptSessionFacts to KeptSessionRecords (summary, body, and playedNotes or null), and decodeKeptSession(stored), from the stored values (StoredKeptSession: summary, body, and playedNotes or undefined) to a KeptReading of a KeptSession (its KeptSessionSummary and its KeptPhrase list) or a newer or unreadable report. decodeKeptSessionSummary reads a session-wide record alone. The work is split over kept-session-summary.ts, kept-session-body.ts, kept-played-notes.ts, kept-reading.ts (the envelope classification through src/storage/record-envelope.ts, KEPT_SESSION_DATA_VERSION), kept-record-shape.ts (exact-key and value checks, KeptRecordError) and kept-phrase-parsers.ts (parseKeptHarmony, parseKeptIntent, parseKeptProfileSelection). Validation uses parseGenerationRequest (src/domain/generation/generation-request.ts), parseCarryIn (src/domain/generation/carry-in/carry-in.ts), parseConcertEventTimeline (src/domain/events/timeline-parser.ts), parseInstrumentProfile (src/domain/profile/instrument-profile.ts) and isInstrumentClef (src/domain/profile/instrument-clef.ts); never rebuildGenerationWorkerIntent or parseGenerationWorkerIntent, which rebuild the profile from its id. The narrower phrase type, ReviewedPhrase with ReviewedOutcome, is declared in src/session/session-history.ts; SessionHistoryRecord and KeptPhrase both extend it, the review components and the export adapters of src/session/session-history-export.ts take it, and notationInputFromOutcome (src/domain/notation/notation-input.ts) takes the matching NotatedOutcome. src/session/ and src/export/ do not import the codec; the history's storage trap test stays green.

## EXPECTATION
- A recorded five-phrase session with played notes and acknowledgements encodes to records whose keys are on the allowlist: no acknowledgements, provenance.rhythm, provenance.tensionBinding or diagnostics anywhere.
- Decoding gives a review input from which the MusicXML and MIDI exports are byte-identical to those of the in-memory session, for the three built-in instruments.
- Played-note times decode relative to the session's start and export identically.
- The session seed decodes to the value the history held, and the instrument to its id with the display name it had then.
- A newer record is reported as newer and not decoded; an invalid one, or records that disagree, as unreadable, never repaired.
- A stored harmony or intent with a missing, extra, ill-typed or out-of-range field is refused.
- A profile is decoded from the data the record holds, never rebuilt from its id.
- Encoding a My instrument phrase throws until the history records its clef.
- The session history and the export modules stay storage-free.
