---
id: rule_failed_read_told_to_player
status: DRAFT
layer: BUSINESS
human_name: The Player Is Told When Saved Data Could Not Be Read
tags: [v3, release-v3.0, storage]
parents:
  - [[rule_first_phrase_waits_for_saved_settings]]
dependents: []
type: RULE
version: 0.1
priority: 1
---

# The Player Is Told When Saved Data Could Not Be Read

## INTENT
Never let a visit that cannot use or keep the player's saved data pass as an ordinary one: the player knows their changes will not be kept, and how to try again.

## THE RULE / LOGIC
From v3.0, when the saved settings could not be read at load, because reading failed or took longer than the short start-up wait, the player is told three things: that the saved data could not be read, that this visit saves nothing, and that reloading may fix it. The player is told outside a running session, never during one.

## TECHNICAL INTERFACE
After a start-up read that failed or outlasted the start-up wait, a notice shown outside a running session states that the saved data could not be read, that nothing is saved during this visit, and that a reload may fix it.

## EXPECTATION
- After a read of the saved settings that fails, or that outlasts the start-up wait, the player is told that the saved data could not be read, that this visit saves nothing, and that reloading may fix it.
- This is never shown during a running session.
