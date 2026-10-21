---
id: rule_jam_settings_load_tolerantly
status: DRAFT
version: 0.1
priority: 1
dependents: []
human_name: Jam's Saved Settings Load One by One
tags: [v3, release-v3.2, jam, player-controls, storage]
parents:
  - [[req_jam_settings]]
type: RULE
layer: BUSINESS
---

# Jam's Saved Settings Load One by One

## INTENT
Keep every valid saved Jam choice when one saved value no longer makes sense.

## THE RULE / LOGIC
Each of Jam's saved settings is checked on its own when the app loads: an unknown or invalid value takes that setting's first value, the one it starts from on a new device (drift Near, the lock off, every allowed rhythm change off, Gentle diatonic, Lift, Embellishments Rarely, a tempo inside 60 to 180 BPM), and every other saved setting still loads. Settings saved before v3.2 hold no Jam settings, which then start from their first values.

## TECHNICAL INTERFACE
Loading checks each saved Jam setting separately and replaces only an invalid one with its first value.

## EXPECTATION
- An unknown or invalid saved Jam setting loads as its first value, and every other saved setting still loads.
- With settings saved before v3.2, Jam's settings start from their first values.
