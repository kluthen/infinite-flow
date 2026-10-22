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
version: 0.2
human_name: Use It Sets the Key and Mode as by Hand
---

# Use It Sets the Key and Mode as by Hand

## INTENT
Make accepting a suggestion behave exactly like choosing that key and mode for Jam oneself.

## THE RULE / LOGIC
Use it sets Jam's Written key and Collection exactly as a change by hand in Jam mode does: it is saved with Jam's settings, it discards Jam's pre-generated phrases, and it leaves session mode's key and mode untouched, wherever the review was opened from. With a kept doodle, phrase 1 is regenerated from it in the new key and mode and the doodle stays kept, so the next Jam continues the doodle in the key and mode it sounds in. Without a kept doodle nothing is regenerated: Jam mode's Idle shows no phrase, and the next Jam simply generates in the new key and mode.

## TECHNICAL INTERFACE
Use it writes Jam's Written key and Collection.

## EXPECTATION
- Use it changes Jam's key and mode exactly as a change by hand in Jam mode would, and never session mode's.
- With a kept doodle, Use it keeps the doodle and regenerates phrase 1 from it in the new key and mode.
