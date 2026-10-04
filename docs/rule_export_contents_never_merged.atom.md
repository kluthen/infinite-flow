---
id: rule_export_contents_never_merged
status: REVIEW
layer: BUSINESS
version: 0.1
tags: [v2, release-v2.1, export]
parents:
  - [[req_session_export]]
dependents: []
type: RULE
priority: 1
human_name: Export Contents Never Merged
---

# Export Contents Never Merged

## INTENT
Keep each content in its own file so the player always knows what leaves the app.

## THE RULE / LOGIC
Exporting both contents means using both actions: two separate files from the same session, the generated-notes file in the format the player picked (MusicXML or MIDI) and the played-notes MIDI file. They are never merged into one file, and no single action ever delivers both. Their file names make clear which content each holds and that they come from the same session; the exact names belong to the interface design.

## TECHNICAL INTERFACE
Two export actions, two files, with names identifying content and session.

## EXPECTATION
- Each export action delivers exactly one file; exporting both contents takes both actions and gives two separate files.
- No generated-notes file, MusicXML or MIDI, ever holds a played note.
