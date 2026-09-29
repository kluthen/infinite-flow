---
id: rule_staff_needs_room_notice
status: DRAFT
tags: [v2, release-v2.0, idle, notation, v1-change]
parents:
  - [[req_landscape_phrase_workspace]]
layer: BUSINESS
priority: 1
human_name: Staff Needs More Room Notice
dependents:
  - [[module_notation_layout_preflight]]
  - [[rule_staff_notice_gives_way_to_new_phrase]]
  - [[rule_too_dense_notice_retry_rounds]]
  - [[rule_unsupported_rhythm_gives_way_to_no_phrase]]
type: RULE
version: 0.1
---

# Staff Needs More Room Notice

## INTENT
Show a calm notice instead of an error when the staff cannot be shown at Idle for lack of space.

## THE RULE / LOGIC
This changes the first release's behaviour, where a phrase that could not be drawn in the window showed the notation error, whose retry action cannot help until the window changes. At Idle, when the staff cannot be shown for lack of space, the app shows, instead of the staff, a plain notice that the staff needs more room, with no retry action. The notice has two causes:

1. no room for the staff: the window is too narrow, or, below the tablet-landscape layout's width, too short for the staff's minimum readable size (the height counts the staff together with the row above it where a session shows its count-in and notices, measured with the browser's toolbars showing);
2. notes too dense for the room: the window has room for the staff, but every retry to replace a phrase whose notes do not fit has failed.

No partial or substitute staff is ever drawn. The notation error, with its retry action, is kept only for failures that retrying can cure. The rotate-device notice for portrait-shaped views is unchanged. No session starts while the notice shows. The notice never appears during a session: there, a staff that can no longer be shown ends the session instead. Its wording and look belong to the interface design.

## TECHNICAL INTERFACE
At Idle, the staff area shows the staff, the rotate-device notice, the plain "staff needs more room" notice with no retry action, or, only for failures retrying can cure, the notation error with its retry action.

## EXPECTATION
- At Idle, a window too narrow for the staff, a window too short for it below the tablet-landscape layout's width, and a failed round of too-dense retries each show the plain notice with no retry action, never the notation error.
- No partial or substitute staff is ever drawn.
- The notice never shows during a session.
