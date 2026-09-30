---
id: service_session_history
status: DRAFT
human_name: Session History
type: SERVICE
layer: ARCHITECTURE
version: 0.1
priority: 1
tags: session,history,determinism
parents:
  - [[rule_repeat_phrase_marked_internally_only]]
  - [[rule_session_data_never_sent_or_stored]]
  - [[rule_session_history_keeps_timeline_and_inputs]]
  - [[rule_session_history_records_played_notes]]
  - [[rule_session_settings_locked]]
  - [[service_session_engine]]
dependents: []
---

# Session History

## INTENT
Record, in memory only, every phrase of a session that started sounding, with the timeline as shown and the inputs that reproduce it, together with when the session started and the instrument profile it ran with, so the review and the exports read one faithful history.

## THE RULE / LOGIC
The history is a pure in-memory recorder: no browser API, no Vue, no storage and no network access, and its only clock read is the one injected wall-clock read at creation; it never reads the system time directly.
- It is created for one session, at the session's start, from the settings locked at that start and takes the session's tempo from the tempo chosen in those settings; it never defaults a tempo and refuses settings whose tempo is not a positive, finite BPM. Every phrase of the session is recorded at that one tempo.
- At creation it reads the injected wall clock once and keeps the result as the session's start time: the player's local wall-clock moment of the Start click or of the starting note, stored as epoch milliseconds. It is never read again or updated during the session. Formatting it (in local time, for example for export file names) is the reader's job, not the history's.
- At creation it keeps the instrument profile id of the locked settings as the session's instrument profile. The instrument profile stays locked for the whole session, so this id holds for every recorded phrase and may differ from whatever profile is selected after the session ends.
- It takes every output of the session engine in order and records from the phrase-sounding outputs only (phrase 1 when the count-in is over, then each later phrase); read-ahead phrase-ready outputs and every other kind are ignored. A phrase only ever shown as read-ahead is therefore never recorded, and a session ended during the count-in records nothing.
- It keeps one record per sounded phrase, in sounding order: the phrase number; the moment on the audio clock it started sounding; the whole generation outcome exactly as shown, which holds the concert timeline and the harmony its chord symbols are drawn from; the generation intent it came from, kept as its reproduction inputs (the resolved request with the note density it was generated with, the seed, and the carry-in, none for phrase 1 or a standalone phrase); the tempo; the internal repeat mark, with the number of the phrase repeated; and two slots left empty until played-note tracking fills them: the acknowledgements, as the expected-note identities acknowledgement reports, and the played notes, each with its concert pitch, velocity, onset and release on the audio clock.
- It crash-checks what it is fed. A sounding phrase that is not the next number or starts before the phrase before it, a sounding phrase whose intent was generated for an instrument profile other than the session's, a repeat mark that names no earlier phrase or a non-repeat that names one, an end in the count-in after a sounded phrase, an end whose count of sounded phrases differs from the records, and any output after the end each throw a typed history error instead of being recorded or ignored.
- Records are deep-frozen once recorded. The history only grows while the session runs and is read back as one ordered, frozen list for the review and the exports, alongside the session's start time and instrument profile id.
- The export adapter builds the MusicXML and MIDI encoder inputs from the stored shown phrases and never regenerates a phrase: for each record in order, its phrase number, its stored phrase (written as the staff showed it for MusicXML, the concert timeline for MIDI) and its tempo, plus the backing the caller asked for on the MIDI side. It takes the instrument from the records' intents and refuses, with a typed export error, an empty history or records generated for more than one instrument. The repeat mark never travels to the encoders, so a repeat encodes exactly like any other phrase.
- Session length has no cap, so recording a phrase and reading the history back stay proportional to its length.

## TECHNICAL INTERFACE
src/session/session-history.ts: createSessionHistory takes the session's locked settings and an injected wall clock (returning the current epoch milliseconds), is called once at session start, and returns a frozen history with record(output), fed every session-engine output in order; phrases(), the ordered frozen list of records; phraseCount; startedAt, the session's start time in epoch milliseconds read once from the injected wall clock; and instrumentProfileId, the instrument profile id of the locked settings. A SessionHistoryRecord holds phraseNumber, startedAt (audio clock), outcome (the successful generation outcome as shown), intent (the generation intent), tempo, isRepeat, an optional repeatOf, acknowledgements (expected-note identities) and playedNotes (RecordedPlayedNote: pitch, velocity, onsetAt, releaseAt). Settings with an unusable tempo, outputs a session cannot produce, or a phrase generated for another instrument profile throw SessionHistoryError.

src/session/session-history-export.ts: musicXmlInputFromHistory(records) and midiInputFromHistory(records, backing) build the generated-notes encoder inputs from the stored records; an empty or mixed-instrument history throws SessionHistoryExportError.

## EXPECTATION
- Only phrases output as sounding are recorded, in order; a phrase only ever output as read-ahead is absent, and a session ended during the count-in leaves the history empty.
- Each record keeps the shown outcome, the intent with its seed and carry-in, and the tempo of the session's locked settings.
- The history's start time is the injected wall clock's value at creation, in epoch milliseconds, read exactly once and unchanged by any later output; the history never reads the system time directly.
- The history's instrument profile id is that of the locked settings, and a sounding phrase whose intent was generated for another instrument profile throws a typed history error.
- Regenerating each record from its stored intent gives a timeline equal to the stored one, across the seed matrix with carry-in.
- Encoding the recorded session with the MusicXML and MIDI encoders gives the same bytes as encoding the phrases regenerated from the stored inputs, and a repeat encodes exactly like any other phrase.
- Every phrase generated with Eighth records Eighth as its density.
- The caller cannot change a record or the read-back list, and the acknowledgement and played-note slots stay empty until played-note tracking fills them.
- A phrase out of order, a repeat that names no earlier phrase, an end that disagrees with the records and any output after the end each throw a typed history error; an empty or mixed-instrument history refuses to export.
- A history of 2000 phrases is built and read back within a set time budget.
- Nothing about the history or its export, its start time and instrument profile id included, is written to browser storage or sent over the network.
