---
id: req_kept_session_list
status: STABLE
priority: 1
tags: [v3, release-v3.0, storage, review, changes-in-v3.2]
parents:
  - [[req_kept_sessions]]
type: REQUIREMENT
version: 0.5
human_name: List of Kept Sessions
dependents:
  - [[entity_kept_session_record]]
  - [[module_kept_session_changes]]
  - [[module_kept_session_reach]]
layer: BUSINESS
---

# List of Kept Sessions

## INTENT
Let the player find a kept session and manage it.

## THE RULE / LOGIC
From v3.0, a list shows every kept session, newest first, whatever instrument is selected now. A kept session the app cannot read has no row and is not counted; a session saved by a newer version of the app still has its row. For each it shows the date and time, the length, the number of phrases, the preset label (the preset selected at the session's start, or Custom based on one) and the instrument it was played with, under the name it was played under, whether it is pinned, the number of favorites, the start of its comment, and whether it is a Jam session. It shows no figure about how well the player played. From the list, or from the session's review, the player can open, pin or unpin, and delete each session; deleting asks for confirmation. Your data offers deleting every session at once. The sessions of My instrument also go when My instrument is deleted, or when a change to its range or transposition is saved, after a warning. The list is available on every device, the phone included.

## TECHNICAL INTERFACE
A list of kept sessions with per-session open, pin or unpin, and delete actions.

## EXPECTATION
- The list shows each kept session's date and time, length, number of phrases, preset label, instrument, pinned state, number of favorites, comment start and whether it is a Jam session, newest first.
- The list shows no figure about how well the player played.
- Each kept session can be opened, pinned, unpinned and deleted; deletion asks for confirmation.
- The list shows every kept session whatever instrument is selected now, each naming the instrument it was played with under the name it was played under.
- A kept session the app cannot read has no row and is not counted.
