---
id: rule_session_layout_fixed_at_start
status: DRAFT
version: 0.1
human_name: Session Staff Layout Fixed at Start
parents:
  - [[req_landscape_phrase_workspace]]
  - [[req_rolling_practice_session]]
dependents:
  - [[module_notation_layout_preflight]]
  - [[module_session_rolling_display]]
  - [[rule_session_ends_when_staff_too_small]]
  - [[service_workspace_session_flow]]
type: RULE
layer: BUSINESS
priority: 1
tags: [v2, release-v2.0, session, notation]
---

# Session Staff Layout Fixed at Start

## INTENT
Fix a session's staff layout at Start so that its phrases are always drawn the same way.

## THE RULE / LOGIC
The staff layout a session holds is chosen at Start from the window's width alone, never from phrase 1's content: the same width always gives the same layout. It stays in use until the session ends. Which layouts exist, and at which widths, belongs to the interface design. A change to the window's size during a session that does not end it redraws the staff at the new size, in the same layout.

## TECHNICAL INTERFACE
Starting a session records the staff layout for the window's width; every phrase of the session is checked and drawn in that layout.

## EXPECTATION
- The same window width at Start always gives the same session layout, whatever phrase 1 contains.
- The layout never changes during a session; a window resize that does not end the session redraws the staff at the new size in the same layout.
