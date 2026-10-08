---
id: req_rhythm_lock
status: DRAFT
type: REQUIREMENT
version: 0.1
human_name: The Rhythm Lock
layer: BUSINESS
priority: 1
tags: [v3, release-v3.2, session, rhythm, rhythm-lock]
parents:
  - [[req_rolling_practice_session]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls within the vision since version 0.8 (2026-10-08, spec D246).
dependents:
  - [[rule_allowed_rhythm_changes]]
  - [[rule_forced_bend]]
  - [[rule_locked_rhythm_is_phrase_one]]
  - [[rule_rhythm_changes_never_shown]]
  - [[rule_rhythm_distance]]
  - [[rule_rhythm_lock_relocks_after_step_down]]
  - [[rule_rhythm_lock_strict]]
---

# The Rhythm Lock

## INTENT
Let the player hold one rhythm through a session so their eyes can go to the notes.

## THE RULE / LOGIC
From v3.2 the rhythm lock is a switch that makes every phrase of a session repeat one rhythm while the pitches keep changing. It is off by default, set at Idle or in the review, and saved like the options for during a session; presets neither hold it nor change it. The player may allow small rhythm changes, each lasting one phrase.

## TECHNICAL INTERFACE
A rhythm-lock switch at Idle and in the review.

## EXPECTATION
- With the lock on, the phrases of a session share one rhythm, apart from the changes the player allows and the forced bends.
- The switch starts off, survives a reload, and no preset changes it.
