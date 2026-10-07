---
id: rule_failed_save_never_disturbs_session
status: DRAFT
tags: [v3, release-v3.0, storage, session]
parents:
  - [[req_on_device_storage]]
notes: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed v3 revision of the vision is confirmed.
type: RULE
layer: BUSINESS
dependents: []
version: 0.1
priority: 1
human_name: A Failed Save Never Disturbs a Session
---

# A Failed Save Never Disturbs a Session

## INTENT
Make sure a save that fails never gets in the way of playing.

## THE RULE / LOGIC
From v3.0, a save the browser refuses, whether because storage is full or for any other reason, never stops, interrupts or delays a session. The app keeps working with what it holds in memory, and tells the player that the save failed once no session is running; a running session never asks the player for anything. Nothing already kept is deleted to make room for a save.

## TECHNICAL INTERFACE
A refused save leaves the app running from memory and produces a notice shown only outside a running session.

## EXPECTATION
- A refused save never interrupts or delays a session.
- The player is told about the failed save after the session, never during it.
- Nothing already kept is deleted automatically to make room.
