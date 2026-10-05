---
id: module_session_settings_change
status: REVIEW
priority: 1
human_name: Session Settings Change
tags: session,look-ahead,settings-change
parents:
  - [[req_settings_mutation_flag]]
  - [[rule_session_change_applies_at_phrase_boundary]]
  - [[service_session_engine]]
notes: Split out on 2026-10-05 from service_session_engine (version 0.5) during documentation debt paydown; the text is moved unchanged in meaning and keeps its DRAFT status.
dependents: []
type: MODULE
layer: ARCHITECTURE
version: 0.1
---

# Session Settings Change

## INTENT
Apply a settings change to a running session at the earliest phrase it can still reach without changing anything already on screen.

## THE RULE / LOGIC
A settings change replaces the settings in effect at its time, even when it equals them: no change is treated as a special case. A decided phrase keeps its look-ahead, with its deadline, until it starts sounding. A look-ahead phrase not yet decided, or decided but not yet sounding, is dropped and requested again from the first rung with the new settings, from the same phrase before and keeping its deadline, only if none of it is on screen and at least one measure, at the tempo of the phrase sounding then (the starting tempo during the count-in), remains before its deadline; the display is read only when the time allows the drop. An attempt still in flight for an undecided phrase is superseded. A decided phrase is taken back as if never decided: the phrase before is the latest decided again, with the settings it was generated under, the struggling notice is as it was before that decision, and the drop is output as phrase discarded. Otherwise the phrase stays as it is and the change applies from the phrase after it. Settings changed names the first phrase the change applies to.

## TECHNICAL INTERFACE
The engine takes the `settings-change { settings }` event and outputs `settings-changed { phraseNumber, settings, cause: 'automatic' }` and `phrase-discarded { phraseNumber }`; whether a phrase is on screen is read through the injected `display` (`SessionDisplayReading`). The settings change handling (accepted change, discard decision, attempt plan per rung) is in `src/session/session-settings-change.ts`.

## EXPECTATION
A settings change drops and requests again a waiting look-ahead phrase, with its deadline unchanged, only when none of it is on screen and at least one measure remains before its deadline; otherwise the change applies from the phrase after it. Only a dropped phrase that was already decided is output as phrase discarded; its decision is taken back, the phrase before and the struggling notice returning to what they were before it.
