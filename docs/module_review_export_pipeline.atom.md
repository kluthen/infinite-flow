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
  - [[rule_session_data_never_sent_or_stored]]
dependents: []
layer: ARCHITECTURE
version: 0.3
human_name: Review Export Pipeline
---

# Review Export Pipeline

## INTENT
Turn the session the Review shows, the session that just ended or a kept session read back, into exactly one export file per player action, built in the page on demand and handed to the browser as a download, with nothing sent and nothing stored by the export.

## THE RULE / LOGIC
The pipeline runs from the session the Review shows to a browser download. Its input is what the Review draws that session from: the closed history of the session that just ended, or a kept session decoded by the kept-session codec once read back by its key; either way its phrases in session order, each with its clef, and its recorded start time, read only; nothing is generated again. The Review offers one action per content. Export generated notes comes with a format choice, MusicXML or MIDI, and, for MIDI only, a backing-track choice. Export played notes shows only when the history holds at least one played note within a phrase, which is read without loading the export code. One activation builds exactly one file and starts one download.

Each action first loads the export code (the history's encoder adapters, the three encoders and the backing renderer) on demand, in one chunk outside the entry chunk, through a single lazy boundary: later exports share one load, and after a failed load the next export tries the load again. It then builds the file it was asked for:
- generated notes as MusicXML: the history's MusicXML adapter, then the MusicXML encoder, as UTF-8 bytes, in the written pitch of the session's instrument profile, each phrase in the clef its record carries; the backing-track choice is ignored;
- generated notes as MIDI: the history's MIDI adapter, given the backing renderer's notes for each phrase's stored harmony only when the backing track is asked for, then the generated-notes MIDI encoder, at concert pitch;
- played notes as MIDI: the history's played-notes adapter, then the played-notes MIDI encoder.
No played note reaches a generated-notes file, and the played-notes file holds only played notes: the two contents are never merged into one file.

Every file name starts with the session's stem, infinite-flow-{YYYY-MM-DD}-{HHmmss}, from the session's recorded start in the player's local time, never the time of the export, then -generated.musicxml, -generated.mid or -played.mid, so the files of one session sort together and are told apart. The same history and request always give the same name and the same bytes.

The built file is handed to the browser as a download of its bytes, with its MIME type, under its file name. Any failure on the way (the export code failing to load, an adapter's or an encoder's typed error, the browser refusing the download) rejects that export, and the Review shows its one export error until the next export of either content starts; a failure before the download downloads nothing. A successful export shows and announces nothing: the browser's download is the confirmation.

The Review and the file live in memory only, and the pipeline stores nothing: the file is never kept, and the session itself is kept only by the session's own save at its end, never by the export. Nothing is sent; the format and backing-track choices are the player's review preferences, saved as settings when the player changes them. The download the player starts is the only way a session's data leaves the page.

## TECHNICAL INTERFACE
exportGeneratedNotes(history, request, ports) and exportPlayedNotes(history, ports) in src/components/workspace/review-export.ts each run one export of an ExportableHistory (src/export/export-file.ts: phrases() and startedAt, given alike by a live history and a decoded kept session) over ReviewExportPorts { load, download }, by default the page's own from browserReviewExportPorts(document); historyHoldsPlayedNote(records) tells, without loading the export code, whether the played-notes action shows. useReviewExportAction in src/components/review/use-review-export-action.ts holds one export button's state: loading and disabled while its file is built, the Review's one export error set on a failure and cleared as the next export starts. loadGeneratedNotesExport() in src/export/load-generated-notes-export.ts is the lazy boundary, rejecting with a GeneratedNotesExportLoadError on a failed load. buildGeneratedNotesFile(history, request), with request { format: 'musicxml' | 'midi', backingTrack: boolean }, and generatedNotesFileName are in src/export/generated-notes-file.ts; buildPlayedNotesFile(history) and playedNotesFileName are in src/export/played-notes-file.ts; exportFileStem and ExportFile { fileName, mimeType, bytes } are in src/export/export-file.ts. The files are built from the history's adapters musicXmlInputFromHistory, midiInputFromHistory and playedNotesMidiInputFromHistory (src/session/session-history-export.ts) and the encoders encodeGeneratedNotesMusicXml, encodeGeneratedNotesMidi and encodePlayedNotesMidi. The MIME types are application/vnd.recordare.musicxml+xml for MusicXML and audio/midi for both MIDI files. downloadFile(file, document) in src/export/browser-download.ts makes the download, refusing a document with no window with a BrowserDownloadError.

## EXPECTATION
- One export activation downloads exactly one file, of the content and format asked for.
- The MusicXML file is in the session profile's written pitch and never holds a backing; the generated-notes MIDI file is at concert pitch and holds the backing track only when it is asked for; neither generated-notes file holds a played note.
- The played-notes action shows only when the history holds a played note within a phrase, and its file holds the played notes only.
- File names come from the session's recorded start, never the export's time, and end in -generated.musicxml, -generated.mid or -played.mid.
- The same history and request give the same file name and bytes every time.
- The export code is outside the entry chunk and is loaded once for every later export; after a failed load the next export loads it again.
- Any failure rejects the export and shows the Review's export error, which the next export removes as it starts; a failure before the download downloads nothing.
- An export of a kept session read back after a reload is byte-identical to the same export before the reload.
- Nothing from the session or the file is sent over the network, and the export writes nothing to browser storage; the export choices are sent nowhere and are kept only as the player's saved review preferences.
