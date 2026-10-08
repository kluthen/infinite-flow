---
id: req_favorite_phrases
status: DRAFT
type: REQUIREMENT
layer: BUSINESS
human_name: Favorite Phrases
parents:
  - [[req_kept_session_review]]
notes: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls within the vision since version 0.8 (2026-10-08, spec D246).
dependents:
  - [[rule_favorite_pins_session]]
  - [[rule_favorites_only_export]]
version: 0.1
priority: 1
tags: [v3, release-v3.0, storage, review, favorites]
---

# Favorite Phrases

## INTENT
Let the player mark the phrases they liked.

## THE RULE / LOGIC
From v3.0, in the review of any kept session, the session that just ended included, the player can mark a whole phrase as a favorite; marking it again removes the mark. A favorite is always a whole phrase. The list of kept sessions shows each session's number of favorites.

## TECHNICAL INTERFACE
A favorite toggle per phrase in the review.

## EXPECTATION
- A phrase can be marked as a favorite in the review of any kept session, and marking it again removes the mark.
- Favorites survive a reload with their session.
