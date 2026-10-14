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
notes: Created 2026-10-14 at DRAFT by the pre-code architecture capture for v3.0 build plan chunk 9 (wave-3 preflight), from master spec sections 4.3, 5.2 and 5.4, the build plan's chunk 9 scope, and the session history, worker protocol and export code as merged on main 488d9e0. Describes intended v3.0 behaviour: no code implements it yet. Left to chunk 9's leader, recorded at its post-task sync: where the narrower phrase type the review and the exports read is declared, and how a stored harmony and a whole stored intent are validated, since no existing parser validates a harmony beyond its being an object, and the only whole-intent parser rebuilds the profile from its id.
dependents: []
layer: ARCHITECTURE
version: 0.1
tags: [v3, release-v3.0, storage, review, session]
---

# Kept-Session Codec

## INTENT
Turn a finished session's in-memory history into the records a kept session is stored as, and those records back into exactly what the review and the exports read, so a kept session reviews and exports as it did when it ended.

## THE RULE / LOGIC
The codec is pure: it maps between values and never opens the database, reads a clock or draws a seed. Saving the records, choosing the session's key and deleting older sessions belong to whoever saves the session.

Encoding takes a finished session's in-memory history, with the session's facts the history does not hold (whether it is pinned, its favorites, its comment, whether its played notes are kept), and gives the session-wide record, the body and, only when the played notes are kept, the played-notes record. It reads the start time, the instrument id, the session seed, the phrases and their tempos from the history; the musical profile selected at the start and the instrument's display name from phrase 1's intent, made under the settings locked at Start; the starting tempo from phrase 1 and the tempo reached from the last phrase. Each phrase's clef is the clef its review draws it in: treble for a built-in instrument, My instrument's clef as the phrase recorded it. Every field is copied by name onto the stored shape, never by copying a history object whole, so the acknowledgements, the rhythm and tension provenance and the diagnostics the history holds never reach a record. Played notes are taken from every phrase, in onset order. Every time is rebased to seconds from phrase 1's scheduled start.

Decoding classifies each stored value through the record envelope first. A newer record is reported as newer and left unread, so a session saved by a newer version is listed as such and does not open. An unreadable value, or a current one that fails validation, is reported as unreadable, never repaired, defaulted or partly decoded. A current record is validated through the project's existing parsers: the generation request and the carry-in through their own parsers, the timeline through the timeline parser, the instrument profile through the profile parser on the profile the record holds, never rebuilt from its id, and the clef as one of the instrument clefs.

Decoding gives what the review and the exports read for that session: its facts, and its phrases in order, each with its number, start, timeline, harmony, intent, tempo, repeat mark, favorite mark and clef, and the played notes placed in the phrase their onset falls in, as the history places them, phrase 1 starting at time 0. It holds no field the records do not hold: no acknowledgement, provenance or diagnostics is made up, so the review and the exports read only what is kept. A session decoded this way reviews and exports exactly as the same session did in memory when it ended.

The history and the export modules never import the codec, and stay free of storage.

## TECHNICAL INTERFACE
src/storage/records/kept-session-record.ts (new; a helper file such as kept-session-summary.ts if size limits need it) exports the encoder, from a SessionHistory and the session's list facts to the three records of entity_kept_session_record, and the decoder, from stored values to the review's input or a newer or unreadable report. It classifies through the envelope reader of src/storage/record-envelope.ts and validates through existing parsers where they fit: parseGenerationRequest (src/domain/generation/generation-request.ts), parseCarryIn (src/domain/generation/carry-in/carry-in.ts), parseConcertEventTimeline (src/domain/events/timeline-parser.ts), parseInstrumentProfile (src/domain/profile/instrument-profile.ts) and isInstrumentClef (src/domain/profile/instrument-clef.ts); never rebuildGenerationWorkerIntent or parseGenerationWorkerIntent, which rebuild the profile from its id. A review input adapter in src/components/review/ may map the review's reading of a phrase onto the narrower type. src/session/ and src/export/ do not import the codec; the history's storage trap test stays green.

## EXPECTATION
- A recorded five-phrase session with played notes and acknowledgements encodes to records whose keys are on the allowlist: no acknowledgements, provenance.rhythm, provenance.tensionBinding or diagnostics anywhere.
- Decoding gives a review input from which the MusicXML and MIDI exports are byte-identical to those of the in-memory session, for the three built-in instruments.
- Played-note times decode relative to the session's start and export identically.
- The session seed decodes to the value the history held, and the instrument to its id with the display name it had then.
- A newer record is reported as newer and not decoded; an invalid one as unreadable, never repaired.
- A profile is decoded from the data the record holds, never rebuilt from its id.
- The session history and the export modules stay storage-free.
