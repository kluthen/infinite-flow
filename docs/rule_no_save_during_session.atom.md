---
id: rule_no_save_during_session
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.2
priority: 1
tags: [v3, release-v3.0, storage, session]
parents:
  - [[req_on_device_storage]]
human_name: No Saving During a Session
dependents:
  - [[module_save_policy]]
---

# No Saving During a Session

## INTENT
Keep saving out of a running session, whose timing comes first.

## THE RULE / LOGIC
From v3.0, nothing is written to the device's store between a session's start and its end. What a session produces, and any setting the player changed while it ran, is saved once, when it ends. A session cut short by closing or reloading the page is therefore lost, as before v3.0.

## TECHNICAL INTERFACE
Every write to the device's store happens outside the span from a session's start to its end.

## EXPECTATION
- No storage write happens between Start and the session's end.
- A session cut short by closing or reloading the page is not kept.
