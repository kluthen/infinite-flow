---
id: module_session_staff_overlays
status: DRAFT
priority: 1
tags: session,notation,display,overlays
dependents: []
type: MODULE
human_name: Session Staff Overlays
parents:
  - [[module_session_rolling_display]]
  - [[rule_acknowledgement_highlights_expected_note_only]]
  - [[rule_playhead_follows_audio_clock]]
notes: Split out on 2026-10-05 from module_session_rolling_display (version 0.5) during documentation debt paydown; the text is moved unchanged in meaning and keeps its DRAFT status.
layer: ARCHITECTURE
version: 0.1
---

# Session Staff Overlays

## INTENT
Draw the session's overlays and assistive descriptions phrase by phrase, only on the systems of each phrase on screen.

## THE RULE / LOGIC
Overlays are applied phrase by phrase, each on that phrase's systems on screen only, never on an engraving that is fading out. The playhead band is drawn on the measure being played, on the systems of the phrase that owns the playhead. No start marker is drawn during a session. A phrase's acknowledged notes are marked only when a system of that phrase on screen draws them; an acknowledged note of a part not on screen is left out. Each phrase on screen is described once to assistive technology, on the first of its systems shown, its other system hidden from it; the hidden description follows the playhead's phrase, phrase 1 during the count-in.

## TECHNICAL INTERFACE
The session staff's marks are `src/components/notation/session-staff-marks.ts`.

## EXPECTATION
During a session no start marker is drawn, the band shows only on the playhead's phrase, and only acknowledged notes drawn on screen are marked.
