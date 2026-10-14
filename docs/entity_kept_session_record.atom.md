---
id: entity_kept_session_record
status: DRAFT
version: 0.1
tags: [v3
parents:
  - [[module_session_seed_plan]]
  - [[req_kept_session_list]]
  - [[rule_kept_session_content]]
  - [[rule_kept_session_holds_no_acknowledgements]]
  - [[rule_played_notes_kept_only_after_opt_in]]
notes: Created 2026-10-14 at DRAFT by the pre-code architecture capture for v3.0 build plan chunk 9 (wave-3 preflight)
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
A kept session is stored as up to three records, all under the same key, the session's key, which whoever saves the session supplies and which no record holds: its session-wide record in the sessionSummaries store, its body in the sessionBodies store, and its played notes in the playedNotes store, present only while the player keeps them. Each record carries the record envelope's two versions; in v3.0 each of the three shapes is at data version 1.

The session-wide record holds the session's own facts and what one row of the session list shows: the session's start date and time, on the wall clock, in epoch milliseconds; its length; its number of phrases; the musical profile selected at its start, kept as the selection itself (the profile, whether it was customized, and, customized, the controls the list's label names), not as words; the instrument it was played with, by its id, and that instrument's display name as the session showed it; the starting tempo and the tempo it reached; whether it is pinned; its number of favorites; its comment, empty until the player writes one, at most 500 characters; whether its played notes are kept; the app version that recorded it, a field of its own that a later migration never rewrites, unlike the envelope's app version, which names the app that last wrote the record; and its session seed. It holds nothing that can be derived from the session seed: not the later phrases' seeds, the ladder rungs' seeds or the Vary settings mutation seed.

The body holds, for each phrase that sounded, in sounding order: its phrase number; its start, in seconds from the session's start; its generated concert timeline, as shown; the harmony its chord symbols are drawn from; its generation intent, the inputs that reproduce it, with the request, the instrument profile as data (never only its id), the seed and the carry-in; its tempo; its repeat mark, with the number of the phrase it repeats; its favorite mark; and its clef, the clef the phrase was drawn in, display only (a built-in instrument's is always treble). A later change of My instrument's name or clef changes nothing stored.

The played-notes record holds every played note of the session in onset order, each with its concert pitch, velocity, onset and release in seconds from the session's start, stray notes included, exactly as the session received them after latency compensation.

The session's start, for every time the records hold, is phrase 1's scheduled start on the audio clock: the earliest moment of the session the history places on that clock, and no played note before it is recorded. Times on the audio clock mean nothing after a reload; seconds from that start do.

No record holds which expected notes were acknowledged, the rhythm or tension provenance, the generation diagnostics, or anything else the review and the exports do not read: with no acknowledgement kept, nothing kept can count the player's hits.

## TECHNICAL INTERFACE
src/storage/records/kept-session-record.ts (new) declares the three stored shapes, the session-wide record (summary), the body and the played notes, each with RecordVersions from src/storage/record-envelope.ts at data version 1, and their allowlisted keys; a helper file such as kept-session-summary.ts may hold the summary if size limits need it. The stores are the existing sessionSummaries, sessionBodies and playedNotes of the on-device database; no store, index or data version is added. The instrument's id is the profile's id, my-instrument for My instrument. The clef is one of the instrument clefs of src/domain/profile/instrument-clef.ts.

## EXPECTATION
- Every key of every kept-session record is on its shape's allowlist; no acknowledgements, provenance.rhythm, provenance.tensionBinding or diagnostics key appears anywhere.
- The session-wide record holds the session seed and no seed derived from it.
- The session-wide record names the instrument by its id and keeps the display name the session showed.
- Each kept phrase holds its intent with the instrument profile as data and its clef beside it.
- Every time stored is in seconds from phrase 1's scheduled start.
- No played-notes record exists for a session whose played notes are not kept.
- A 30-minute 240 BPM Jazz Sixteenth session takes at most about 3.5 MB.
