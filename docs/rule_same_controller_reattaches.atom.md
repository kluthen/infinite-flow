---
id: rule_same_controller_reattaches
status: STABLE
parents:
  - [[rule_controller_attached_definition]]
layer: BUSINESS
version: 0.1
priority: 1
human_name: Same Controller Reattaches by Itself
tags: [v2, release-v2.0, midi]
dependents:
  - [[rule_start_while_controller_away]]
type: RULE
notes: Status REVIEW to STABLE on 2026-10-07 with the product owner's approval, together with the matching CONTRACT 1.8 MINOR bump. Approved earlier the same day but held at REVIEW until every clause of its expectation had a test linked to the atom; the last one, a page reload forgetting the selection, came in 57a254f (tests/e2e/controller/controller-status.spec.ts, after a page reload no controller is remembered: plugging the same device back in attaches nothing). Also backed by the linked tests for a controller unplugged at Idle (tests/e2e/controller/controller-status.spec.ts), in the review (tests/e2e/review/review-no-start.spec.ts, tests/e2e/session/session-midi-controller-loss.spec.ts) and a different device never picked up (tests/e2e/midi/midi-input.spec.ts).
---

# Same Controller Reattaches by Itself

## INTENT
Reattach the player's own controller by itself when it comes back.

## THE RULE / LOGIC
Once a controller is connected, unplugging it does not clear the player's selection. If that same device comes back, it is reattached automatically, with no action from the player, and the transposition check is not re-run. This holds whether the controller was lost during a session or while the app was Idle or showing the review. A different device is never picked up this way: it goes through the connection step, which is only available between sessions. While the selected controller is away between sessions, the app behaves exactly as with no controller connected: this is not an error, and no reconnection window applies, since no session is running. The kept selection lives in memory only and does not survive a page reload: after a reload the player goes through the connection step again.

## TECHNICAL INTERFACE
The selected input is remembered in memory for the page's lifetime and reattached when the same device reappears.

## EXPECTATION
- A connected controller unplugged at Idle or in the review keeps its selection; plugging the same device back in reattaches it automatically, without re-running the transposition check and without any action from the player.
- While it is away, the app behaves as with no controller connected and shows no error.
- A different device is not picked up until the player goes through the connection step; after a page reload no selection is remembered.
