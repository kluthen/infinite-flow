---
id: rule_allowed_rhythm_changes
status: DRAFT
priority: 1
human_name: Allowed Rhythm Changes
tags: [v3, release-v3.2, session, rhythm, rhythm-lock]
parents:
  - [[req_rhythm_lock]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
type: RULE
layer: BUSINESS
dependents:
  - [[rule_rhythm_change_kinds]]
  - [[rule_rhythm_change_lasts_one_phrase]]
  - [[rule_rhythm_change_share]]
version: 0.1
---

# Allowed Rhythm Changes

## INTENT
Let the player hear one rhythm varied by small, named edits, without losing the lock.

## THE RULE / LOGIC
The player keeps a list of five kinds of small rhythm edit, each on or off, all off by default, so the lock is strict by default. The list is set at Idle or in the review and saved like the options for during a session; presets neither hold nor change it. It acts only while the lock is on; with the lock off it is kept and does nothing. Each change lasts one phrase, so while the lock is set a change can never alter the rhythm for good. The option's description tells the player that what it offers depends on the rhythm settings.

## TECHNICAL INTERFACE
Five on/off kinds of allowed rhythm change, used only under the lock.

## EXPECTATION
- All five kinds start off and survive a reload.
- With the lock off, the list changes nothing.
