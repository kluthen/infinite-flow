---
id: rule_rhythm_lock_tries_both_forms
status: REVIEW
dependents:
  - [[service_generation_orchestration]]
layer: BUSINESS
tags: [v3, release-v3.3, rhythm-lock, generation, chords]
parents:
  - [[req_rhythm_lock]]
  - [[req_seventh_chords_level]]
type: RULE
version: 0.1
priority: 1
human_name: Under the Rhythm Lock, Each Plan Is Tried in Both Forms
---

# Under the Rhythm Lock, Each Plan Is Tried in Both Forms

## INTENT
Keep a locked rhythm holding with seventh chords as often as without them.

## THE RULE / LOGIC
With locked bars, where every chord plan is tried for one locked rhythm before that rhythm gives way, each plan's seventh-form variant and its triads-only variant are tried side by side: a locked rhythm gives way only after every plan has been tried in both forms, so every triad plan that keeps a locked rhythm at Off is still reached before the rhythm gives way. Only the search allowance, which is not raised for seventh chords, can cut that walk short.

## TECHNICAL INTERFACE
Under locked bars, each plan's two forms are adjacent in the order plans are tried for one locked rhythm.

## EXPECTATION
- With locked bars and the level above Off, a locked rhythm gives way only after every chord plan has been tried in both its forms, within the search allowance.
