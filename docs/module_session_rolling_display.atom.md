---
id: module_session_rolling_display
status: DRAFT
layer: ARCHITECTURE
version: 0.6
priority: 1
dependents:
  - [[module_session_display_fit]]
  - [[module_session_staff_engraving_outcomes]]
  - [[module_session_staff_overlays]]
  - [[module_session_staff_refill]]
type: MODULE
human_name: Session Rolling Display
tags: v2,session,notation
parents:
  - [[req_adaptive_tempo]]
  - [[req_rolling_practice_session]]
  - [[rule_look_ahead_deadline]]
  - [[rule_look_ahead_phrase_must_fit_staff]]
  - [[rule_phrase_one_is_idle_phrase]]
  - [[rule_playhead_follows_audio_clock]]
  - [[rule_session_end_generates_next_phrase_one]]
  - [[rule_session_ends_when_staff_too_small]]
  - [[rule_session_layout_fixed_at_start]]
notes: Split on 2026-10-05 during documentation debt paydown (previous version 0.5): refill, fit, engraving outcomes, and overlays and assistive text moved unchanged in meaning into child atoms; this atom keeps the placement plan and the playhead and indexes its children. Status stays DRAFT. Earlier: Revised 2026-10-05 in v2 chunk 25 (previous version 0.4): whether a phrase is on screen is the engine's display reading, and a discarded look-ahead phrase is taken back and readied again. Earlier: revised 2026-10-03 before code in v2 chunk 27 (previous version 0.3, pre-code architecture capture) for adaptive tempo: the playhead maps heard time to a measure through the transport tempo map, each phrase at its own tempo. Completed 2026-10-03 in the v2 chunk 27 post-task sync, as built: the playhead keeps its own per-phrase tempo map anchored at the transport's phraseStartsAt, fed by phraseTempo(n, tempo); playheadAt(heardTime, map). Status stays DRAFT.
---

# Session Rolling Display

## INTENT
Show a running practice session on the staff's two system positions as a rolling display: the phrase being played and the next one once it is ready, refilled one position at a time behind a playhead that steps per measure on the audio the player hears, and never a phrase that does not fit the staff layout held for the session.

## THE RULE / LOGIC
Placement plan. A pure plan, which reads no time and touches no page, decides what each of the two system positions shows from three inputs: the layout held at start, the playhead, and the highest phrase number readied so far (1 while only the Idle phrase is). A position shows one slot, a phrase number and a part (the whole phrase, bars 1-4; its opening, bars 1-2; or its closing, bars 3-4), or nothing. In the one-system layout phrase n lives in the top position when n is odd and in the bottom one when n is even; the phrase being played (phrase 1 during the count-in) shows in its position, and the other position shows the next phrase once it is readied, else nothing. In the split layout, while the playhead is in a phrase's measures 1-2 (or in the count-in, for phrase 1), the top position shows its opening and the bottom one its closing; from its measure 3 on, the bottom keeps its closing and the top shows the next phrase's opening once it is readied, else nothing. Waiting material is every part of every readied phrase, from the phrase being played on, that the positions do not show. Because the playhead runs on heard time and the engine on the audio context's time, the phrase after next can be readied while the heard playhead is still in the current phrase's last measure; it then waits, and is shown only once the playhead reaches the phrase before it. The position holding the playhead never changes content between two successive states: a position changes only after the playhead has left it. The plan also tells whether a given phrase is on screen, which phrases are shown or waiting, and how many measures after the one being played are on screen. Whether a phrase is on screen is also the session engine's display reading for a settings change. A look-ahead phrase the engine discards for a settings change, none of it on screen and its tempo not yet fixed, is taken back, so the same phrase number is readied next; nothing on screen changes.

Playhead. The playhead is a phrase number and a measure index from 0 to 3, or none before phrase 1's first barline, during the count-in. Heard time maps to a measure through the display's own per-phrase tempo map, never a beat reading of the transport: one segment from phrase 1 at the starting tempo, then one from each phrase whose tempo differs from the one before, anchored at the transport's start of that phrase and added when that phrase's tempo is handed to the display, in phrase order, once the transport has the phrase queued. Within a segment, barline k lies at the segment's start plus its measures since then at the segment's own measure length, computed by multiplication and never by accumulation; the last segment runs on past the phrases known so far; exactly at a barline the playhead is on the new measure. It is read on heard time, the audio clock's time minus the audio output latency, once per frame through an injected frame loop (the browser's animation frames in the app, a fake in tests), and the display's state changes only when the position changes. The loop runs from the session's start until its end and is stopped at teardown. The display keeps the written phrase of every readied phrase from the playhead's phrase on, and forgets the ones the playhead has left.

Parts. Refilling a position, the fit of every session phrase to the held layout, the routing of the session staff's engraving outcomes, and the overlays and assistive text each have their own child atom: [[module_session_staff_refill]], [[module_session_display_fit]], [[module_session_staff_engraving_outcomes]] and [[module_session_staff_overlays]].

## TECHNICAL INTERFACE
The pure plan lives in `src/session/rolling-display.ts`: types `SystemSlot { phraseNumber, part: SystemPart }` (with `SystemPart = 'whole' | 'opening' | 'closing'` from the notation layout policy), `RollingSystems { top: SystemSlot | null, bottom: SystemSlot | null }` and `PlayheadPosition { phraseNumber, measureIndex: 0 | 1 | 2 | 3 }`; functions `playheadAt(heardTime, map: PlayheadTempoMap): PlayheadPosition | null`, where `PlayheadTempoMap` is an ordered list of `PlayheadTempoSegment { phraseNumber, startsAt, measureSeconds }` starting with phrase 1, rising in phrase number and time (a broken map throws), `systemsAt(layout, playhead | null, latestReady): RollingSystems`, `waitingMaterial(layout, playhead | null, latestReady): SystemSlot[]`, `phrasesShownOrWaiting(layout, playhead | null, latestReady): number[]`, `readAheadMeasures(layout, playhead, latestReady)`, `isPhraseOnScreen(layout, playhead | null, latestReady, n): boolean` and `slotKey(slot)`. PhraseScore takes an optional `session: SessionStaff | null` (default null), with `SessionStaff = { layout, top, bottom, playhead }`, `top` and `bottom` each a `SessionSystem | null`, and `SessionSystem = SystemSlot & { phrase: WrittenPhrase }` (`src/components/notation/session-staff.ts`). The controller side, `createSessionDisplay` in `src/components/workspace/workspace-session-display.ts`, built from the session's `startingTempo`, keeps the readied written phrases, the latest readied phrase number, the playhead and the playhead's tempo map, whose first segment starts at the transport's `phraseStartsAt(1)` and which its `phraseTempo(phraseNumber, tempo)` extends in phrase order (out of order throws) with a segment at the transport's `phraseStartsAt(phraseNumber)` when the tempo changes, and drives the playhead through the `frames: { request(cb): number; cancel(handle): void }` port of the controller's clock dependencies. The controller state exposes reactive `sessionStaff: SessionStaff | null` and `latestReady: number | null`, both null outside a session, and the controller an `isPhraseOnScreen(n)` query, false outside a session.

## EXPECTATION
- During the count-in there is no playhead; from phrase 1's first barline the playhead moves one measure at each barline of the heard audio, each phrase's barlines at that phrase's own tempo, and exactly at a barline it is on the new measure.
- The position holding the playhead never changes content between two successive states.
- In the one-system layout odd phrases show in the top position and even ones in the bottom; in the split layout the top position takes the next phrase's opening from the current phrase's measure 3.
- A phrase readied beyond what the positions show waits, and is shown only once the playhead reaches the phrase before it.
