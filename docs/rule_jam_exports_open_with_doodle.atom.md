---
id: rule_jam_exports_open_with_doodle
status: DRAFT
version: 0.1
priority: 1
human_name: A Jam's Exports Open With the Doodle
tags: [v3, release-v3.2, session, jam, export]
dependents:
  - [[rule_jam_exports_line_up]]
type: RULE
layer: BUSINESS
parents:
  - [[req_jam]]
  - [[req_session_export]]
---

# A Jam's Exports Open With the Doodle

## INTENT
Let the doodle go out with the music in every export, in the form each export carries.

## THE RULE / LOGIC
In both scopes, the whole session and its favorites: the generated-notes export (MusicXML and MIDI) opens with the quantized doodle as its own section marked Doodle, with no backing under it in the MIDI file; the played-notes export opens with the raw doodle notes in the same section. Other notes played before phrase 1 (during the count-in, the generation and read-in measures and an extended wait) are still never exported, and very short notes follow the played-notes export's option for them.

## TECHNICAL INTERFACE
Both exports gain a Doodle section ahead of phrase 1 for Jam sessions.

## EXPECTATION
- Every export of a Jam session, in both scopes, opens with the Doodle section.
- No note played before phrase 1 outside the doodle is ever exported.
