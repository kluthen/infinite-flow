---
id: req_kept_session_list
status: DRAFT
priority: 1
tags: [v3, release-v3.0, storage, review, changes-in-v3.1, changes-in-v3.2]
parents:
  - [[req_kept_sessions]]
notes: Revised 2026-10-12 to version 0.2 (previous version 0.1) on the owner's rulings of 2026-10-12, spec D295 and D296, master spec Part A v1.10 (sections 5.1 and 5.4), relayed to documentalist: the list is not filtered by the instrument selected now (the owner confirmed that a session is tied to the instrument it was played with, not the one selected now); each session names its instrument as the session recorded it; the sessions of My instrument also go when it is deleted or its range or transposition changes, after a warning. The v3.1 and v3.2 pending changes below still stand. Status unchanged (DRAFT). Earlier: v3.1 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): the musical profile shown becomes the preset label (rule_preset_label_kept_with_session). v3.2 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): a Jam session is marked as such (rule_review_opens_with_doodle). Text and status unchanged on purpose: it still describes the running code. Revise it in the change that builds that behaviour, per docs/release/v3.1-v3.2-intent-change-set.md. Earlier: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls within the vision since version 0.8 (2026-10-08, spec D246).
type: REQUIREMENT
version: 0.2
human_name: List of Kept Sessions
dependents: []
layer: BUSINESS
---

# List of Kept Sessions

## INTENT
Let the player find a kept session and manage it.

## THE RULE / LOGIC
From v3.0, a list shows every kept session, newest first, whatever instrument is selected now. For each it shows the date and time, the length, the number of phrases, the musical profile and the instrument it was played with, under the name it was played under, whether it is pinned, the number of favorites, and the start of its comment. It shows no figure about how well the player played. From the list, or from the session's review, the player can open, pin or unpin, and delete each session; deleting asks for confirmation. Your data offers deleting every session at once. The sessions of My instrument also go when My instrument is deleted, or when a change to its range or transposition is saved, after a warning. The list is available on every device, the phone included.

## TECHNICAL INTERFACE
A list of kept sessions with per-session open, pin or unpin, and delete actions.

## EXPECTATION
- The list shows each kept session's date and time, length, number of phrases, profile, instrument, pinned state, number of favorites and comment start, newest first.
- The list shows no figure about how well the player played.
- Each kept session can be opened, pinned, unpinned and deleted; deletion asks for confirmation.
- The list shows every kept session whatever instrument is selected now, each naming the instrument it was played with under the name it was played under.
