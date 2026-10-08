---
id: rule_suggestion_use_it
status: DRAFT
priority: 1
tags: [v3, release-v3.2, jam, key-and-mode-suggestion]
parents:
  - [[req_key_and_mode_suggestion]]
dependents: []
type: RULE
layer: BUSINESS
version: 0.1
human_name: Use It Sets the Key and Mode as by Hand
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
---

# Use It Sets the Key and Mode as by Hand

## INTENT
Make accepting a suggestion behave exactly like choosing that key and mode oneself.

## THE RULE / LOGIC
Use it sets the Written key and the Collection exactly as a change by hand does: it is saved like any setting, it discards the pre-generated phrases, and under a preset whose restriction excludes the answer the selection becomes Custom. With a held doodle it is the one key and mode change that keeps the doodle: phrase 1 is regenerated from it in the new key and mode, so the next Jam continues the doodle in the key and mode it sounds in. Without a held doodle nothing is regenerated, as after any change at Idle. Vary settings, when on, moves from the confirmed key and mode during the next session.

## TECHNICAL INTERFACE
Use it writes the Written key and Collection controls.

## EXPECTATION
- Use it changes the key and mode exactly as a change by hand would.
- With a held doodle, Use it keeps the doodle and regenerates phrase 1 from it.
