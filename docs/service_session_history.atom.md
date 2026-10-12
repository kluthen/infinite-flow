---
id: service_session_history
status: REVIEW
human_name: Session History
type: SERVICE
layer: ARCHITECTURE
version: 0.4
priority: 1
tags: session,history,determinism
parents:
  - [[rule_adaptive_tempo_resets_after_session]]
  - [[rule_repeat_phrase_marked_internally_only]]
  - [[rule_session_data_never_sent_or_stored]]
  - [[rule_session_history_keeps_timeline_and_inputs]]
  - [[rule_session_history_records_played_notes]]
  - [[rule_session_settings_locked]]
  - [[service_session_engine]]
dependents: []
notes: Revised 2026-10-12 at the v3.0 wave-1 post-task sync (previous version 0.3) for build plan chunk 23's session seed plan (module_session_seed_plan, merge aee776c): the history holds the session seed among the session's own facts (spec D255), given at creation, with nothing derived from it. Status unchanged; no status advanced. Earlier: Revised 2026-10-03 before code in v2 chunk 27 (previous version 0.2, pre-code architecture capture) for adaptive tempo: each record takes its tempo from its phrase-sounding output instead of the locked settings, and the tempo the session reached is the last recorded phrase tempo. Completed 2026-10-03 in the v2 chunk 27 post-task sync, as built: tempoReached() and the refusal of a phrase-sounding output at an unusable tempo. Status stays DRAFT.
---

# Session History

## INTENT
Record, in memory only, every phrase of a session that started sounding, with the timeline as shown and the inputs that reproduce it, together with when the session started and the instrument profile it ran with, so the review and the exports read one faithful history.

## THE RULE / LOGIC
The history is a pure in-memory recorder: no browser API, no Vue, no storage and no network access, and its only clock read is the one injected wall-clock read at creation; it never reads the system time directly.
- It is created for one session, at the session's start, from the settings locked at that start; it never defaults a tempo and refuses settings whose tempo is not a positive, finite BPM. Each phrase is recorded at its own tempo, the one its phrase-sounding output carries, never at the locked settings' tempo, which stays the starting tempo. The tempo the session reached, which the review shows, is the last recorded phrase's tempo.
- At creation it reads the injected wall clock once and keeps the result as the session's start time: the player's local wall-clock moment of the Start click or of the starting note, stored as epoch milliseconds. It is never read again or updated during the session. Formatting it (in local time, for example for export file names) is the reader's job, not the history's.
- At creation it keeps the instrument profile id of the locked settings as the session's instrument profile. The instrument profile stays locked for the whole session, so this id holds for every recorded phrase and may differ from whatever profile is selected after the session ends.
- It takes every output of the session engine in order and records from the phrase-sounding outputs only (phrase 1 when the count-in is over, then each later phrase); read-ahead phrase-ready outputs and every other kind are ignored. A phrase only ever shown as read-ahead is therefore never recorded, and a session ended during the count-in records nothing.
- It keeps one record per sounded phrase, in sounding order: the phrase number; the moment on the audio clock it started sounding, which the session controller hands in as the phrase's scheduled start on the audio transport, where consecutive phrases sit exactly back to back, never the engine's time, which may already have passed that start when the wake-up fired; the whole generation outcome exactly as shown, which holds the concert timeline and the harmony its chord symbols are drawn from; the generation intent it came from, kept as its reproduction inputs (the resolved request with the note density it was generated with, the seed, and the carry-in, none for phrase 1 or a standalone phrase); the tempo, from its phrase-sounding output; the internal repeat mark, with the number of the phrase repeated; the acknowledgements, as the expected-note identities acknowledgement reports; and the played notes, each with its concert pitch, velocity, onset and release on the audio clock.
- Until the end it also takes every finished played note, its onset and release already latency-compensated, and every acknowledgement, and places them in the records on read, whatever order they arrived in: a played note in the recorded phrase its onset falls in (the last one started at or before it, the last phrase taking every later onset), ordered by onset, and in none when its onset comes before phrase 1 starts; an acknowledgement in the record of its phrase number, in arrival order, and nowhere when that phrase was never recorded.
- It crash-checks what it is fed. A sounding phrase that is not the next number or starts before the phrase before it, a sounding phrase whose intent was generated for an instrument profile other than the session's, a sounding phrase whose tempo is not a positive, finite BPM, a repeat mark that names no earlier phrase or a non-repeat that names one, an end in the count-in after a sounded phrase, an end whose count of sounded phrases differs from the records, a played note with a time that is not finite, a release before its onset or a velocity outside 1 to 127, an acknowledgement that names no possible note of the session or one already acknowledged, and any output, played note or acknowledgement after the end each throw a typed history error instead of being recorded or ignored.
- Records are deep-frozen once recorded. The history only grows while the session runs and is read back as one ordered, frozen list for the review and the exports, alongside the session's start time, instrument profile id and session seed.
- The export adapter builds the encoder inputs from the stored records and never regenerates a phrase. For the generated-notes MusicXML and MIDI encoders it gives, for each record in order, its phrase number, its stored phrase (written as the staff showed it for MusicXML, the concert timeline for MIDI) and its tempo, plus the backing the caller asked for on the MIDI side. For the played-notes MIDI encoder it gives, for each record in order, its phrase number, its tempo, its start on the audio clock and its played notes, each as its pitch, velocity, onset and release, and nothing else: no generated phrase and no backing. It takes the instrument from the records' intents and refuses every input, with a typed export error, for an empty history or records generated for more than one instrument. The repeat mark never travels to the encoders, so a repeat encodes exactly like any other phrase.
- Session length has no cap, so recording a phrase and reading the history back stay proportional to its length.

## TECHNICAL INTERFACE
src/session/session-history.ts: createSessionHistory takes the session's locked settings, an injected wall clock (returning the current epoch milliseconds) and the session seed (a 32-bit unsigned integer, else SessionHistoryError), is called once at session start, and returns a frozen history with record(output), fed every session-engine output in order; recordPlayedNote(note), fed every finished played note with compensated onset and release; recordAcknowledgement(identity), fed every acknowledged expected note; phrases(), the ordered frozen list of records with their acknowledgements and played notes placed; tempoReached(), the last record's tempo, or null before phrase 1 sounds; phraseCount; startedAt, the session's start time in epoch milliseconds read once from the injected wall clock; instrumentProfileId, the instrument profile id of the locked settings; and sessionSeed, the session seed given at creation, with no seed derived from it. A SessionHistoryRecord holds phraseNumber, startedAt (audio clock, the phrase's scheduled start), outcome (the successful generation outcome as shown), intent (the generation intent), tempo (from the phrase-sounding output), isRepeat, an optional repeatOf, acknowledgements (expected-note identities) and playedNotes (RecordedPlayedNote: pitch, velocity, onsetAt, releaseAt). The placement on read lives in src/session/session-history-played-notes.ts (withPlayedNotes). Settings with an unusable tempo, a phrase-sounding output at an unusable tempo, outputs a session cannot produce, a phrase generated for another instrument profile, an invalid played note or acknowledgement, or anything fed after the end throw SessionHistoryError.

src/session/session-history-export.ts: musicXmlInputFromHistory(records) and midiInputFromHistory(records, backing) build the generated-notes encoder inputs, and playedNotesMidiInputFromHistory(records) builds the played-notes MIDI encoder input (PlayedNotesMidiInput), from the stored records; an empty or mixed-instrument history throws SessionHistoryExportError.

## EXPECTATION
- Only phrases output as sounding are recorded, in order; a phrase only ever output as read-ahead is absent, and a session ended during the count-in leaves the history empty.
- Each record keeps the shown outcome, the intent with its seed and carry-in, and the tempo its phrase-sounding output carries; the last record's tempo is the tempo the session reached, which tempoReached() returns, null before phrase 1 sounds.
- Each record's start is its phrase's scheduled start on the audio transport, even when the engine's time had passed it before the wake-up fired.
- The history's start time is the injected wall clock's value at creation, in epoch milliseconds, read exactly once and unchanged by any later output; the history never reads the system time directly.
- The history's instrument profile id is that of the locked settings, and a sounding phrase whose intent was generated for another instrument profile throws a typed history error.
- Regenerating each record from its stored intent gives a timeline equal to the stored one, across the seed matrix with carry-in.
- Encoding the recorded session with the MusicXML and MIDI encoders gives the same bytes as encoding the phrases regenerated from the stored inputs, and a repeat encodes exactly like any other phrase.
- The played-notes MIDI input holds, for each record in order, only its phrase number, tempo, start and played notes.
- Every phrase generated with Eighth records Eighth as its density.
- The caller cannot change a record or the read-back list. Each played note is read back in the phrase its onset falls in, ordered by onset, a note played before phrase 1 starts in none, and each acknowledgement in its phrase's record.
- A phrase out of order, a repeat that names no earlier phrase, an end that disagrees with the records, an invalid played note or acknowledgement and anything fed after the end each throw a typed history error; an empty or mixed-instrument history refuses every export.
- A history of 2000 phrases is built and read back within a set time budget.
- Nothing about the history or its export, its start time, instrument profile id and session seed included, is written to browser storage or sent over the network.
