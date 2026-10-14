---
id: module_session_staff_refill
status: REVIEW
priority: 1
human_name: Session Staff Refill
tags: session,notation,display
parents:
  - [[module_session_rolling_display]]
  - [[req_rolling_practice_session]]
  - [[rule_phrase_one_is_idle_phrase]]
layer: ARCHITECTURE
version: 0.1
dependents: []
type: MODULE
---

# Session Staff Refill

## INTENT
Change what one of the session staff's two system positions shows without disturbing the other, and redraw nothing when a session starts.

## THE RULE / LOGIC
When a position's slot changes, that position alone is refilled: the notes it held start fading out, and at that moment they lose every overlay mark and are hidden from assistive technology; the old engraving is removed once its fade has finished (at once when there is no animation, as under reduced motion), then the new slot, engraved off-screen first, enters with its own entrance fade. A blank slot leaves the position empty. A newer refill of a position supersedes an older one still under way. Re-engraving after a resize is not a refill: every slot shown is re-engraved at the new size in the held viewport (the held layout with the current window's height budget), in place and without a fade, all of them staged first and swapped in only if every one succeeds. Phrase 1's slot carries the very written phrase object Idle shows, not a copy, and entering the session with the slots Idle already shows at the same inputs redraws nothing, so the start never redraws phrase 1.

## TECHNICAL INTERFACE
The session staff's positions are kept by `src/components/notation/session-staff-positions.ts`; each `staff-content` unit carries `data-phrase-number` and `data-system-part`.

## EXPECTATION
A refill touches only its own position: fade-out, with the fading notes unmarked and hidden from assistive technology at once, then the new slot's entrance; a resize re-engraves the shown slots in place with no fade. Starting a session redraws nothing.
