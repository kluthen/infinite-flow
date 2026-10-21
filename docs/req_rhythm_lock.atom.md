---
id: req_rhythm_lock
status: DRAFT
type: REQUIREMENT
version: 0.2
human_name: The Rhythm Lock
layer: BUSINESS
priority: 1
tags: [v3, release-v3.2, session, rhythm, rhythm-lock]
parents:
  - [[req_rolling_practice_session]]
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
From v3.2 the rhythm lock is a switch that makes every phrase of a session repeat one rhythm while the pitches keep changing. In session mode it is off by default, set at Idle or in the review, and saved like the options for during a session. Jam mode has its own value, off by default, set at Jam mode's Idle and saved with Jam's settings; neither mode's value reaches the other. Presets neither hold it nor change it. The player may allow small rhythm changes, each lasting one phrase.

## TECHNICAL INTERFACE
A rhythm-lock switch in session mode, at Idle and in the review, and another among Jam's settings.

## EXPECTATION
- With the lock on, the phrases of a session share one rhythm, apart from the changes the player allows and the forced bends.
- Each mode's switch starts off and survives a reload, no preset changes it, and neither mode's value changes the other's.
