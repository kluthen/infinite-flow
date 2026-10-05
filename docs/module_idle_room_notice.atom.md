---
id: module_idle_room_notice
status: DRAFT
type: MODULE
layer: ARCHITECTURE
priority: 1
tags: [v2, release-v2.0, idle, notation, generation]
parents:
  - [[module_idle_fit_round]]
  - [[rule_idle_phrase_too_dense_is_replaced]]
  - [[rule_retry_round_window_changes]]
  - [[rule_staff_needs_room_notice]]
  - [[rule_staff_notice_gives_way_to_new_phrase]]
  - [[rule_too_dense_notice_retry_rounds]]
  - [[rule_unsupported_rhythm_gives_way_to_no_phrase]]
notes: Split out on 2026-10-05 from module_idle_fit_round (version 0.4) during documentation debt paydown; the text is moved unchanged in meaning and keeps its DRAFT status.
version: 0.1
human_name: Idle Room Notice
dependents: []
---

# Idle Room Notice

## INTENT
Show the "staff needs more room" notice for a staff layout failure at Idle, and decide which change clears it into a new phrase or starts a new round under it.

## THE RULE / LOGIC
Layout failures at Idle. Outside a run (Ready, Generation error, Notation error, Notation error over a retained generation failure, and a Retry notation whose re-engraving hits a layout failure), a no-room failure shows the notice with its no-room cause, starts no retries and leaves any banner in place. A notes-too-wide failure of the phrase on screen starts a replacement run with no score shown or, while the rhythm-settings combination blocks generation, shows no phrase with the unsupported-rhythm alert, with no retries and no notice. Every other notation failure keeps the retryable notation error.

Under the notice. While the notice shows with its no-room cause, every change of the staff's layout inputs, and every change to a setting the phrase is generated from other than an instrument-profile switch (tempo, the audio mix and the theme excluded), runs a phrase-independent room check, from the height budget and the width of the layout's fixed parts with the key signature the next phrase would have (the written key sets that leading width). Once there is room, the notice clears and a run starts with no score shown; the phrase last on screen is never drawn again. If the rhythm-settings combination then blocks generation, no phrase shows, with the unsupported-rhythm alert, and nothing is generated afterwards by itself. An instrument-profile switch under the no-room notice only changes the selection: it runs no room check, and the notice and any generation-failure banner stay. Regenerate or Retry generation under the no-room notice runs with the notice kept, and an attempt that finds no room ends back on it. While the notice shows with its notes-too-wide cause and no run is active, a wider staff container (compared with the previous layout report, the reference updating on every report, during a run too), a change to a setting the phrase is generated from (an instrument-profile switch included; tempo, the audio mix and the theme excluded), Regenerate, or Retry generation under a banner each starts a round, the notice kept, dimmed, while it runs; if that change makes the combination one that blocks generation, no phrase shows, with the unsupported-rhythm alert, and no round starts. A narrower window starts nothing; narrowed to no room, the notice takes its no-room cause, silently.

Exposed state. The workspace session exposes, read-only, which notice shows and with which cause (no room, notes too wide, or none) and whether retries are running, true from an attempt found too wide, or from the start of a round under the notice, until the run ends; and a notice-announcement count that goes up by one each time the notice begins and each time a round under the notice ends with every attempt too wide, so the interface can announce the notice again.

## TECHNICAL INTERFACE
The workspace session's read-only state gains roomNotice: 'no_room' | 'notes_too_wide' | null, retriesRunning: boolean and roomNoticeAnnouncements: number. The phrase-independent room check goes through src/composables/use-notation-coordinator.ts, from the same planning code the drawing uses.

## EXPECTATION
At Idle a no-room failure shows the notice, a notes-too-wide failure of the phrase on screen starts a replacement run (or gives no phrase with the alert under a blocked combination), and only other notation failures show the retryable notation error. Under the no-room notice, a layout-input change or a generation-setting change other than a profile switch runs the room check, room regained clears it into a new run, never a redraw, and a profile switch only changes the selection. Under the notes-too-wide notice, a wider container, a generation-setting change, Regenerate or Retry generation starts a round with the notice kept; tempo, mix, theme and a narrower window start nothing. roomNotice, retriesRunning and roomNoticeAnnouncements are read-only and follow the rules above; roomNoticeAnnouncements goes up by exactly one when the notice begins and when a round under the notice ends with every attempt too wide, and at no other time.
