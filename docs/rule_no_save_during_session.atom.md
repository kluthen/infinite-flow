---
id: rule_no_save_during_session
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.1
priority: 1
tags: [v3, release-v3.0, storage, session]
parents:
  - [[req_on_device_storage]]
notes: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed v3 revision of the vision is confirmed.
human_name: No Saving During a Session
dependents: []
---

# No Saving During a Session

## INTENT
Keep saving out of a running session, whose timing comes first.

## THE RULE / LOGIC
From v3.0, nothing is written to the device's store between a session's start and its end. What a session produces is saved once, when it ends. A session cut short by closing or reloading the page is therefore lost, as before v3.0. A setting the player changes while no session runs is saved at once.

## TECHNICAL INTERFACE
Every write to the device's store happens outside the span from a session's start to its end.

## EXPECTATION
- No storage write happens between Start and the session's end.
- A session cut short by closing or reloading the page is not kept.
