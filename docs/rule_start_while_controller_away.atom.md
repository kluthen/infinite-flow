---
id: rule_start_while_controller_away
status: REVIEW
type: RULE
version: 0.1
priority: 1
human_name: Starting While the Selected Controller Is Away
dependents:
  - [[service_session_midi]]
  - [[service_workspace_session_flow]]
layer: BUSINESS
tags: [v2, release-v2.0, midi, session-start]
parents:
  - [[rule_same_controller_reattaches]]
---

# Starting While the Selected Controller Is Away

## INTENT
Keep a session that started without its controller consistent until it ends.

## THE RULE / LOGIC
A Start click while the selected controller is away begins a session with no controller, like any session started without one: it stays controller-less for its whole length, count-in included. If the same device is plugged back in during that session, it is not reattached. The selection is kept throughout, and once the session ends the device reattaches by itself if it is still plugged in. Likewise, a controller lost mid-session and still away when the session ends (by the reconnection window running out, or by Stop) keeps its selection into the review, or into Idle for a session ended during the count-in, exactly like a controller unplugged between sessions.

## TECHNICAL INTERFACE
Reattachment is suspended for the length of a session started while the selected controller was away.

## EXPECTATION
- A Start click while the selected controller is unplugged begins a controller-less session; plugging the same device back in during it, count-in included, does not reattach it.
- Once that session ends, the device reattaches automatically, without re-running the transposition check, if it is still plugged in.
- A controller lost mid-session and still away at the session's end keeps its selection into the review and reattaches there when the same device returns.
