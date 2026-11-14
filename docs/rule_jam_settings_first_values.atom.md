---
id: rule_jam_settings_first_values
status: REVIEW
dependents:
  - [[module_jam_settings]]
type: RULE
priority: 1
tags: [v3, release-v3.2, jam, player-controls, storage, changes-in-v3.3]
parents:
  - [[req_jam_settings]]
layer: BUSINESS
version: 0.2
human_name: Where Jam's Settings Start
---

# Where Jam's Settings Start

## INTENT
Start Jam from where the player already is, with safe values for what is new.

## THE RULE / LOGIC
The first time Jam's settings are needed on a device, they start as follows: the key and mode from session mode's current values; the tempo from session mode's tempo, kept inside Jam's range of 60 to 180 BPM; drift at Near; the rhythm lock off and every allowed rhythm change off; harmonic motion at Gentle diatonic and tension at Lift, session mode's first-visit values; Embellishments at Rarely; and the Seventh chords level at Off. These are Jam's first values.

## TECHNICAL INTERFACE
Jam's settings missing from the device start from session mode's current values and the fixed first values.

## EXPECTATION
- On a device with no Jam settings saved, Jam's key and mode equal session mode's, its tempo is session mode's kept inside 60 to 180 BPM, drift is Near, the lock and every allowed rhythm change are off, harmonic motion is Gentle diatonic, tension is Lift, Embellishments is Rarely and the Seventh chords level is Off.
