---
id: rule_earlier_kept_sessions_export_backing_only
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.1
human_name: Sessions Kept Before the Parts Export the Backing Only
tags: [v4, release-v4.0, export, accompaniment, review]
priority: 1
parents:
  - [[req_accompaniment_parts]]
  - [[req_session_export]]
dependents: []
---

# Sessions Kept Before the Parts Export the Backing Only

## INTENT
Export an older kept session honestly, with nothing it never recorded.

## THE RULE / LOGIC
A session kept before the parts existed holds no record of which parts were on, so its accompaniment export holds the backing track only.

## TECHNICAL INTERFACE
A kept session with no record of its parts is exported as if every part was off.

## EXPECTATION
- The accompaniment export of a session kept before the parts existed holds the backing track and no part track.
