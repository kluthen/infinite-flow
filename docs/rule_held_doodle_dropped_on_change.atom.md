---
id: rule_held_doodle_dropped_on_change
status: DRAFT
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
dependents: []
layer: BUSINESS
human_name: What Drops a Held Doodle
tags: [v3, release-v3.2, session, jam, idle]
parents:
  - [[rule_jam_again_on_this_doodle]]
type: RULE
version: 0.1
priority: 1
---

# What Drops a Held Doodle

## INTENT
Keep a held doodle only while the phrases prepared from it still match the settings.

## THE RULE / LOGIC
Regenerate and Use it keep a held doodle. Every other change that discards the pre-generated phrases drops it, and its key and mode suggestion with it: a control, a figure level, a preset choice, the instrument, the Jam switch turned off, the rhythm lock, its allowed rhythm changes, the drift, Vary settings and its allowed groups, and Tension across phrases. The tempo, Rising tempo, the audio mix and the theme do not drop it. A controller lost at Idle drops it, since Jam mode leaves with it. Idle then shows what Jam mode shows without a held doodle or, with Jam out of effect, generates a phrase as at first load.

## TECHNICAL INTERFACE
Changes at Idle that discard pre-generated phrases also clear the held doodle.

## EXPECTATION
- Any discarding change other than Regenerate and Use it drops the held doodle and its suggestion.
- The tempo, Rising tempo, the audio mix and the theme leave it held.
