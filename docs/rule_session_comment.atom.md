---
id: rule_session_comment
status: REVIEW
layer: BUSINESS
priority: 1
parents:
  - [[req_kept_session_review]]
dependents:
  - [[module_kept_session_changes]]
type: RULE
version: 0.1
human_name: A Comment on a Session
tags: [v3, release-v3.0, storage, review]
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
