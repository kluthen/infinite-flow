---
id: rule_rhythm_changes_never_shown
status: DRAFT
human_name: Rhythm Changes and Forced Bends Are Never Shown
parents:
  - [[req_rhythm_lock]]
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
