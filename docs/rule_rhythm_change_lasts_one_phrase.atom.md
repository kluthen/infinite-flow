---
id: rule_rhythm_change_lasts_one_phrase
status: DRAFT
type: RULE
priority: 1
human_name: A Rhythm Change Lasts One Phrase
parents:
  - [[rule_allowed_rhythm_changes]]
dependents:
  - [[module_rhythm_change_draw]]
layer: BUSINESS
version: 0.1
tags: [v3, release-v3.2, session, rhythm, rhythm-lock]
---

# A Rhythm Change Lasts One Phrase

## INTENT
Keep allowed changes small and temporary, so the locked rhythm stays the reference.

## THE RULE / LOGIC
A phrase makes at most one rhythm change, and phrase 1 never makes one. A change is always measured from the locked rhythm, never from the previous phrase, so changes never add up. The next phrase returns to the locked rhythm, or draws afresh.

## TECHNICAL INTERFACE
Each phrase's rhythm is the locked rhythm or one change from it.

## EXPECTATION
- No phrase makes more than one change; phrase 1 makes none.
- Every change is one edit from the locked rhythm, never from the phrase before.
