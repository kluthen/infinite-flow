---
id: rule_landscape_lock_during_session
status: REVIEW
priority: 1
dependents:
  - [[service_session_start]]
  - [[service_workspace_session_flow]]
layer: BUSINESS
human_name: Landscape Lock During a Session
tags: [v2, release-v2.0, session, orientation]
parents:
  - [[req_landscape_phrase_workspace]]
  - [[req_rolling_practice_session]]
type: RULE
version: 0.1
---

# Landscape Lock During a Session

## INTENT
Ask the device to hold the session in landscape orientation.

## THE RULE / LOGIC
From the moment the session starts (the Start click or the starting note) until it ends, however it ends, the app asks the browser to lock the screen in landscape orientation, and releases the lock at the end. If the browser refuses the lock or does not support it, the session runs as normal and nothing is shown. On a phone the lock is usually refused, since it is granted only to a page in fullscreen and the app does not go fullscreen, so the rule that ends a session on a portrait-shaped view is what normally applies there.

## TECHNICAL INTERFACE
A session requests a landscape orientation lock at start and releases it at its end.

## EXPECTATION
- From the moment a session starts until it ends, by any means, the app asks for a landscape orientation lock, and it releases the lock when the session ends.
- A refused or unsupported lock changes nothing about the session and shows nothing.
