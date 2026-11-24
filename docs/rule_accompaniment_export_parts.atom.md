---
id: rule_accompaniment_export_parts
status: DRAFT
priority: 1
tags: [v4, release-v4.0, export, accompaniment, review]
parents:
  - [[req_accompaniment_parts]]
  - [[req_session_export]]
dependents: []
type: RULE
layer: BUSINESS
version: 0.1
human_name: The Accompaniment Export Carries the Parts That Were On
---

# The Accompaniment Export Carries the Parts That Were On

## INTENT
Let the player take out the accompaniment they heard, beside the generated line.

## THE RULE / LOGIC
When the generated-notes MIDI file carries its accompaniment, it holds the backing track and, beside it, one track for each part that was on when the session ended, rendered for every exported phrase, under the whole-session scope and the favorites-only scope alike. A part switched on partway through a session is exported for the whole session, since only each part's state at the session's end is kept. A part that was off at the session's end has no track. The MusicXML file holds no part.

## TECHNICAL INTERFACE
The generated-notes MIDI file's accompaniment option, off by default, adds the backing track and one track per part that was on at the session's end.

## EXPECTATION
- With the accompaniment chosen, the MIDI file has one track per part that was on at the session's end, covering every exported phrase.
- A part that was off at the session's end has no track.
- The MusicXML file is the same with any parts on or off.
