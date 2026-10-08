---
id: rule_rhythm_changes_never_shown
status: DRAFT
human_name: Rhythm Changes and Forced Bends Are Never Shown
parents:
  - [[req_rhythm_lock]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls within the vision since version 0.8 (2026-10-08, spec D246).
dependents: []
type: RULE
layer: BUSINESS
version: 0.1
priority: 1
tags: [v3, release-v3.2, session, rhythm, rhythm-lock, non-scoring]
---

# Rhythm Changes and Forced Bends Are Never Shown

## INTENT
Let the player simply read what is written, with no marks to interpret.

## THE RULE / LOGIC
Nothing in the live view, the review or the exports marks a rhythm change or a forced bend. The player reads the notes as written, just as a repeated phrase or an automatic setting change is never marked.

## TECHNICAL INTERFACE
No view or export marks a changed or bent rhythm.

## EXPECTATION
- No rhythm change and no forced bend is marked in the live view, the review or an export.
