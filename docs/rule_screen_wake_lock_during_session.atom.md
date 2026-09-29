---
id: rule_screen_wake_lock_during_session
status: DRAFT
human_name: Screen Stays Awake During a Session
parents:
  - [[req_rolling_practice_session]]
type: RULE
tags: [v2, release-v2.0, session]
dependents: []
layer: BUSINESS
version: 0.1
priority: 1
---

# Screen Stays Awake During a Session

## INTENT
Stop the device from dimming or locking while the player plays hands-on through a session.

## THE RULE / LOGIC
A session runs for minutes with no touch, so a tablet, phone or laptop would otherwise dim and lock mid-session, and on a phone a locked screen hides the tab, which ends the session. The app holds a screen wake lock from the moment the session starts (the Start click or the starting note, so the count-in is covered) until the session ends, however it ends, and releases it then. If the browser refuses the lock or does not support it, the session runs as normal and nothing is shown: a message is not worth pulling the player's eyes off the staff.

## TECHNICAL INTERFACE
A session requests a screen wake lock at start and releases it at its end.

## EXPECTATION
- From the moment a session starts until it ends, by any means, the app holds a screen wake lock, and it releases the lock when the session ends.
- When the browser refuses or does not support the lock, the session starts and runs exactly as it otherwise would, and nothing is shown about the lock.
