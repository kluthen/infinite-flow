---
id: rule_session_ends_when_staff_too_small
status: REVIEW
type: RULE
layer: BUSINESS
tags: [v2, release-v2.0, session, session-end, notation]
version: 0.1
priority: 1
human_name: Session Ends When the Staff No Longer Fits
parents:
  - [[rule_session_layout_fixed_at_start]]
  - [[rule_stop_ends_session]]
dependents:
  - [[module_session_display_fit]]
  - [[module_session_rolling_display]]
  - [[module_session_staff_engraving_outcomes]]
  - [[service_session_end]]
  - [[service_workspace_session_flow]]
---

# Session Ends When the Staff No Longer Fits

## INTENT
End a session, instead of showing a notation error, when the window becomes too small to draw its staff readably.

## THE RULE / LOGIC
A session never shows a notation error, so a staff that can no longer be drawn at its minimum readable size, in the layout the session holds, ends the session exactly like Stop, count-in included.

- Width and height. From the tablet-landscape layout's width up, only the window's width counts: the window is too small when it gets too narrow. Below that width, the staff must fit the window's height as well: the whole staff, together with the row above it where the session shows the count-in and its notices, has to fit inside the window, so a window too short counts as well as one too narrow. The height is measured with the browser's toolbars showing, so a toolbar appearing or hiding never ends a session.
- What is checked. On every change to the window's size, the check covers what is on screen and every part of a phrase already checked and waiting to be drawn (in a layout that draws a phrase in parts, the part of the next phrase, or of a repeated phrase, not yet drawn). If any of it no longer fits, the session ends, and that material is not retried. A look-ahead phrase still being generated at the time is checked when it arrives, against the window as it is then, and one that does not fit is retried as a failed attempt instead.

Any other change to the window's size keeps the session running.

## TECHNICAL INTERFACE
Every window-size change during a session re-checks the drawn and waiting phrase material against the session's layout at the staff's minimum readable size.

## EXPECTATION
- During a session, count-in included, the session ends exactly like Stop as soon as the window becomes too narrow to draw the staff at its minimum readable size in the session's layout, or, below the tablet-landscape layout's width, too short to fit it with the row above it.
- Material already checked and waiting to be drawn that no longer fits ends the session and is not retried; a look-ahead phrase arriving after the change is checked against the new size.
- A browser toolbar appearing or hiding never ends a session; no notation error is ever shown during a session.
