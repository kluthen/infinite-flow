---
id: rule_held_doodle_dropped_on_change
status: DRAFT
dependents: []
layer: BUSINESS
human_name: What Drops a Held Doodle
tags: [v3, release-v3.2, session, jam, idle]
parents:
  - [[rule_jam_again_on_this_doodle]]
type: RULE
version: 0.2
priority: 1
---

# What Drops a Held Doodle

## INTENT
Keep a held doodle only while the phrases prepared from it still match the settings.

## THE RULE / LOGIC
Regenerate, Use it and the end of a Jam played on the held doodle keep it held. Every other change that discards the pre-generated phrases drops it, and its key and mode suggestion with it: a control, a figure level, a preset choice, the instrument, the Jam switch turned off, the rhythm lock, its allowed rhythm changes, the drift, Vary settings and its allowed groups, and Tension across phrases. The tempo, Rising tempo, the audio mix and the theme do not drop it. A controller lost at Idle drops it, since Jam mode leaves with it. Idle then shows what Jam mode shows without a held doodle or, with Jam out of effect, the empty workspace, as at first load: nothing is generated until the player asks for a phrase.

## TECHNICAL INTERFACE
Changes at Idle that discard pre-generated phrases also clear the held doodle.

## EXPECTATION
- Any discarding change other than Regenerate and Use it drops the held doodle and its suggestion.
- The tempo, Rising tempo, the audio mix and the theme leave it held, and so does the end of a Jam played on it.
- A held doodle dropped with Jam out of effect leaves the workspace empty until the player asks for a phrase.
