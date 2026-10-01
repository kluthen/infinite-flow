---
id: rule_session_ends_on_portrait_view
status: DRAFT
priority: 1
tags: [v2, release-v2.0, session, session-end, orientation]
parents:
  - [[req_landscape_phrase_workspace]]
  - [[rule_stop_ends_session]]
type: RULE
layer: BUSINESS
version: 0.1
human_name: Portrait View Ends the Session
dependents:
  - [[service_workspace_session_flow]]
---

# Portrait View Ends the Session

## INTENT
End a session as soon as the view turns portrait-shaped, where the staff cannot be shown.

## THE RULE / LOGIC
As outside a session, the app has no portrait layout below the desktop layout's width: a portrait-shaped view there shows a rotate-device notice instead of the staff and Stop. During a session, count-in included, the session ends exactly like Stop as soon as the view becomes portrait-shaped below the desktop layout's width, whatever caused it: a phone or tablet turned to portrait, a split-screen view, or a window resized on any device.

## TECHNICAL INTERFACE
A running session watches the view's shape and ends as Stop does when it becomes portrait-shaped below the desktop layout's width.

## EXPECTATION
During a session, count-in included, the session ends exactly like Stop as soon as the view becomes portrait-shaped below the desktop layout's width, whether a device was turned, the window was resized or a split screen was opened.
