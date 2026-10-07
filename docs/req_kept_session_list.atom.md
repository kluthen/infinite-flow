---
id: req_kept_session_list
status: DRAFT
priority: 1
tags: [v3, release-v3.0, storage, review]
parents:
  - [[req_kept_sessions]]
notes: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed v3 revision of the vision is confirmed.
type: REQUIREMENT
version: 0.1
human_name: List of Kept Sessions
dependents: []
layer: BUSINESS
---

# List of Kept Sessions

## INTENT
Let the player find a kept session and manage it.

## THE RULE / LOGIC
From v3.0, a list shows every kept session, newest first. For each it shows the date and time, the length, the number of phrases, the musical profile and the instrument, whether it is pinned, the number of favorites, and the start of its comment. It shows no figure about how well the player played. From the list, or from the session's review, the player can open, pin or unpin, and delete each session; deleting asks for confirmation. Your data offers deleting every session at once. The list is available on every device, the phone included.

## TECHNICAL INTERFACE
A list of kept sessions with per-session open, pin or unpin, and delete actions.

## EXPECTATION
- The list shows each kept session's date and time, length, number of phrases, profile, instrument, pinned state, number of favorites and comment start, newest first.
- The list shows no figure about how well the player played.
- Each kept session can be opened, pinned, unpinned and deleted; deletion asks for confirmation.
