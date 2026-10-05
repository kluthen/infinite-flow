---
id: module_session_display_fit
status: REVIEW
tags: session,notation,display,fit
notes: Split out on 2026-10-05 from module_session_rolling_display (version 0.5) during documentation debt paydown; the text is moved unchanged in meaning and keeps its DRAFT status.
dependents: []
layer: ARCHITECTURE
version: 0.1
human_name: Session Display Fit
parents:
  - [[module_session_rolling_display]]
  - [[rule_look_ahead_phrase_must_fit_staff]]
  - [[rule_session_ends_when_staff_too_small]]
  - [[rule_session_layout_fixed_at_start]]
type: MODULE
priority: 1
---

# Session Display Fit

## INTENT
Never show a session phrase that does not fit the staff layout held for the session: refuse it before it is readied, and end the session when a layout change leaves one misfit.

## THE RULE / LOGIC
Every look-ahead phrase is checked, before it is readied, against the held viewport and the latest container width, with the intent of the attempt being checked, by the engraver's own staff planner, which the display loads through an injected loader once the engraver and its notation fonts are ready; a phrase that does not fit (notes too wide, or no room) is a failed attempt for the failure ladder and is never drawn. On every staff layout report during a session, after the session window rule has judged it, every phrase shown or waiting is checked again in the held viewport, and any misfit ends the session with the staff-not-shown cause, exactly like Stop.

## TECHNICAL INTERFACE
The controller side, `createSessionDisplay` in `src/components/workspace/workspace-session-display.ts`, supplies the runner's fit check through the controller's `staffFitPlanner: () => Promise<StaffFitPlanner>` dependency (production: `loadSessionStaffFitPlanner` in `src/components/workspace/session-staff-fixed-parts.ts`).

## EXPECTATION
A look-ahead phrase that does not fit the held viewport is never drawn and counts as a failed attempt. A resize that leaves a shown or waiting phrase misfit ends the session with the staff-not-shown cause, like Stop.
