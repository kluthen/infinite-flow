---
id: module_review_export_pipeline
status: REVIEW
tags: review,export,session-history,privacy
type: MODULE
priority: 1
parents:
  - [[req_last_session_review]]
  - [[req_played_notes_export]]
  - [[req_session_export]]
  - [[rule_export_contents_never_merged]]
  - [[rule_generated_notes_midi_export]]
  - [[rule_generated_notes_musicxml_export]]
  - [[rule_played_notes_export_aligns_with_generated_midi]]
  - [[rule_played_notes_export_omits_stray_notes]]
  - [[rule_session_data_never_sent_or_stored]]
dependents: []
layer: ARCHITECTURE
version: 0.4
human_name: Review Export Pipeline
---

# Review Export Pipeline

## INTENT
Turn the session the Review shows, the session that just ended or a kept session read back, into exactly one export file per player action, built in the page on demand and handed to the browser as a download, with nothing sent and nothing stored by the export.

## THE RULE / LOGIC
The pipeline runs from the session the Review shows to a browser download. Its input is what the Review draws that session from: the closed history of the session that just ended, or a kept session decoded by the kept-session codec once read back by its key; either way its phrases in session order, each with its clef, and its recorded start time, read only; nothing is generated again. The Review offers one action per content. Export generated notes comes with a format choice, MusicXML or MIDI, and, for MIDI only, a backing-track choice. Export played notes shows only when the history holds at least one played note within a phrase, a very short one included, which is read without loading the export code. It is disabled while the file it would build holds no note, every played note being very short and Include very short notes off, which is read the same way, so an export never fails for want of a note. One activation builds exactly one file and starts one download.

Each action first loads the export code (the history's encoder adapters, the three encoders and the backing renderer) on demand, in one chunk outside the entry chunk, through a single lazy boundary: later exports share one load, and after a failed load the next export tries the load again. It then builds the file it was asked for:
- generated notes as MusicXML: the history's MusicXML adapter, then the MusicXML encoder, as UTF-8 bytes, in the written pitch of the session's instrument profile, each phrase in the clef its record carries; the backing-track choice is ignored;
- generated notes as MIDI: the history's MIDI adapter, given the backing renderer's notes for each phrase's stored harmony only when the backing track is asked for, then the generated-notes MIDI encoder, at concert pitch;
- played notes as MIDI: the history's records with their very short notes left out, unless Include very short notes is on, then the history's played-notes adapter, then the played-notes MIDI encoder.
No played note reaches a generated-notes file, and the played-notes file holds only played notes: the two contents are never merged into one file.

Every file name starts with the session's stem, infinite-flow-{YYYY-MM-DD}-{HHmmss}, from the session's recorded start in the player's local time, never the time of the export, then -generated.musicxml, -generated.mid or -played.mid, so the files of one session sort together and are told apart. The same history and request always give the same name and the same bytes.

The built file is handed to the browser as a download of its bytes, with its MIME type, under its file name. Any failure on the way (the export code failing to load, an adapter's or an encoder's typed error, the browser refusing the download) rejects that export, and the Review shows its one export error until the next export of either content starts; a failure before the download downloads nothing. A successful export shows and announces nothing: the browser's download is the confirmation.

The Review and the file live in memory only, and the pipeline stores nothing: the file is never kept, and the session itself is kept only by the session's own save at its end, never by the export. Nothing is sent; the format and backing-track choices are the player's review preferences, saved as settings when the player changes them, and Include very short notes, off at first, is held for the page visit only and never saved. The download the player starts is the only way a session's data leaves the page.

## TECHNICAL INTERFACE
exportGeneratedNotes(history, request, ports) and exportPlayedNotes(history, request, ports), its request a PlayedNotesExportRequest { includeVeryShortNotes }, in src/components/workspace/review-export.ts each run one export of an ExportableHistory (src/export/export-file.ts: phrases() and startedAt, given alike by a live history and a decoded kept session) over ReviewExportPorts { load, download }, by default the page's own from browserReviewExportPorts(document); historyHoldsPlayedNote(records) tells, without loading the export code, whether the played-notes action shows, and playedNotesFileHoldsNote(records, request) whether its file would hold a note, the action being disabled while it would not; both read the records through recordsWithoutVeryShortNotes (src/domain/played-notes/stray-notes.ts) as the request asks. src/components/workspace/use-review-area.ts runs these for the session the Review shows, with Include very short notes as the Review host (src/components/workspace/use-review-host.ts) holds it for the page. useReviewExportAction in src/components/review/use-review-export-action.ts holds one export button's state: loading and disabled while its file is built, the Review's one export error set on a failure and cleared as the next export starts. loadGeneratedNotesExport() in src/export/load-generated-notes-export.ts is the lazy boundary, rejecting with a GeneratedNotesExportLoadError on a failed load. buildGeneratedNotesFile(history, request), with request { format: 'musicxml' | 'midi', backingTrack: boolean }, and generatedNotesFileName are in src/export/generated-notes-file.ts; buildPlayedNotesFile(history, options), options { includeVeryShortNotes } leaving very short notes out by default, and playedNotesFileName are in src/export/played-notes-file.ts; exportFileStem and ExportFile { fileName, mimeType, bytes } are in src/export/export-file.ts. The files are built from the history's adapters musicXmlInputFromHistory, midiInputFromHistory and playedNotesMidiInputFromHistory (src/session/session-history-export.ts) and the encoders encodeGeneratedNotesMusicXml, encodeGeneratedNotesMidi and encodePlayedNotesMidi. The MIME types are application/vnd.recordare.musicxml+xml for MusicXML and audio/midi for both MIDI files. downloadFile(file, document) in src/export/browser-download.ts makes the download, refusing a document with no window with a BrowserDownloadError.

## EXPECTATION
- One export activation downloads exactly one file, of the content and format asked for.
- The MusicXML file is in the session profile's written pitch and never holds a backing; the generated-notes MIDI file is at concert pitch and holds the backing track only when it is asked for; neither generated-notes file holds a played note.
- The played-notes action shows only when the history holds a played note within a phrase, very short ones included, and its file holds the played notes only: by default without the very short ones, and every one as received with Include very short notes.
- The played-notes action is disabled while its file would hold no note, and the export never reaches the encoder's no-played-note error.
- File names come from the session's recorded start, never the export's time, and end in -generated.musicxml, -generated.mid or -played.mid.
- The same history and request give the same file name and bytes every time.
- The export code is outside the entry chunk and is loaded once for every later export; after a failed load the next export loads it again.
- Any failure rejects the export and shows the Review's export error, which the next export removes as it starts; a failure before the download downloads nothing.
- An export of a kept session read back after a reload is byte-identical to the same export before the reload.
- Nothing from the session or the file is sent over the network, and the export writes nothing to browser storage; the export choices are sent nowhere; the format and backing track are kept only as the player's saved review preferences, and Include very short notes is never saved.
