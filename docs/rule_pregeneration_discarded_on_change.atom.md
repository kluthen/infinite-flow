---
id: rule_pregeneration_discarded_on_change
status: DRAFT
type: RULE
tags: [v3, release-v3.0, idle, generation, changes-in-v3.1, changes-in-v3.2]
parents:
  - [[req_idle_pregeneration]]
layer: BUSINESS
version: 0.2
priority: 1
human_name: Pre-Generated Phrases Discarded on Change
notes: v3.1 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): choosing a preset that changes a value or moves the key or mode, changing a figure level, and any change of the restriction in force discard the pre-generated phrases; saving, renaming or deleting a preset that changes neither a setting nor the restriction in force, and choosing an identical preset, discard nothing. v3.2 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): any change at Idle of the Jam switch, the drift, the rhythm lock, the allowed rhythm changes or Vary settings' allowed groups discards them too, and with a held doodle also drops it (rule_held_doodle_dropped_on_change). Text and status unchanged on purpose: it still describes the running code. Revise it in the change that builds that behaviour, per docs/release/v3.1-v3.2-intent-change-set.md. Earlier: Revised 2026-10-07 to version 0.2 (still DRAFT) by the re-sync to the v3.0 master spec v1.3, approved by the product owner: Vary settings and Tension across phrases also discard the pre-generated phrases; the tempo and Rising tempo do not. Earlier: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed v3 revision of the vision is confirmed.
dependents: []
---

# Pre-Generated Phrases Discarded on Change

## INTENT
Never start a session on phrases made for settings or a phrase 1 that no longer hold.

## THE RULE / LOGIC
From v3.0, anything at Idle that replaces phrase 1 or changes a setting phrases are generated from (a generation control, the musical profile, the instrument, a regeneration) discards every pre-generated phrase, and pre-generation starts again after the new phrase 1. So does a change to either of the two session options that shape later phrases, Vary settings and Tension across phrases. A change of the tempo or of Rising tempo discards nothing, since tempo never affects generation. A change of window size that changes the note density phrases would be generated with, or the staff layout a session would hold, re-checks the pre-generated phrases instead: the first one that no longer fits is discarded together with every phrase after it.

## TECHNICAL INTERFACE
Setting, session-option and phrase 1 changes clear the pre-generated queue, tempo and Rising tempo changes leave it, and window-size changes truncate it at the first phrase that no longer fits.

## EXPECTATION
- A settings change, a change to Vary settings or Tension across phrases, or a new phrase 1 discards every pre-generated phrase.
- A change of the tempo or of Rising tempo keeps the pre-generated phrases.
- After a window-size change, the first pre-generated phrase that no longer fits, and every phrase after it, are discarded.
