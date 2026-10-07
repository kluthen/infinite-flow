---
id: rule_session_comment
status: DRAFT
layer: BUSINESS
priority: 1
parents:
  - [[req_kept_session_review]]
dependents: []
type: RULE
version: 0.1
human_name: A Comment on a Session
tags: [v3, release-v3.0, storage, review]
notes: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed v3 revision of the vision is confirmed.
---

# A Comment on a Session

## INTENT
Let the player note a few words about a session for themselves.

## THE RULE / LOGIC
From v3.0, each kept session can carry one optional comment: plain text of at most 500 characters, written and edited in that session's review and shown, by its start, in the list of kept sessions. A comment is never written into any exported MusicXML or MIDI file.

## TECHNICAL INTERFACE
A plain-text comment field in the review of a kept session, limited to 500 characters.

## EXPECTATION
- A comment of up to 500 characters is kept with its session; a longer one cannot be entered.
- No exported file contains the comment.
