---
id: rule_screen_wake_lock_during_session
status: STABLE
human_name: Screen Stays Awake During a Session
parents:
  - [[req_rolling_practice_session]]
type: RULE
tags: [v2, release-v2.0, session]
dependents:
  - [[service_session_start]]
  - [[service_workspace_session_flow]]
layer: BUSINESS
version: 0.2
priority: 1
notes: Status REVIEW to STABLE on 2026-10-06 - the product owner accepted the version 0.2 wording (a wake lock the browser drops mid-session is asked for again, silently, and a refused re-ask is not repeated; spec D187) together with the matching CONTRACT 1.4 MINOR bump.
---

# Screen Stays Awake During a Session

## INTENT
Stop the device from dimming or locking while the player plays hands-on through a session.

## THE RULE / LOGIC
A session runs for minutes with no touch, so a tablet, phone or laptop would otherwise dim and lock mid-session, and on a phone a locked screen hides the tab, which ends the session. The app holds a screen wake lock from the moment the session starts (the Start click or the starting note, so the count-in is covered) until the session ends, however it ends, and releases it then. If the browser refuses the lock or does not support it, the session runs as normal and nothing is shown: a message is not worth pulling the player's eyes off the staff. If the browser drops a granted lock on its own while the session runs and the page is visible (power saving, for example), the app asks for it again at once, silently; a refusal of that ask is not followed by another ask, and nothing is shown either way. A lock dropped while the page is hidden is not asked for again, since a hidden page already ends the session.

## TECHNICAL INTERFACE
A session requests a screen wake lock at start, requests it again when the browser drops it while the page is visible, and releases it at its end.

## EXPECTATION
- From the moment a session starts until it ends, by any means, the app holds a screen wake lock, and it releases the lock when the session ends.
- When the browser refuses or does not support the lock, the session starts and runs exactly as it otherwise would, and nothing is shown about the lock.
- When the browser drops a granted lock while the session runs and the page is visible, the app asks for it again once, silently; a refused ask is not repeated, and nothing is shown whether the lock is granted or refused.
