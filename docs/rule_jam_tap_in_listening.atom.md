---
id: rule_jam_tap_in_listening
status: DRAFT
version: 0.1
tags: [v3, release-v3.2, jam, tempo, midi]
dependents: []
type: RULE
layer: BUSINESS
priority: 1
human_name: Tap-In Listens Only After the Tap Button
parents:
  - [[rule_jam_tempo_range]]
---

# Tap-In Listens Only After the Tap Button

## INTENT
Let the player set Jam's tempo by tapping the beat, on screen and then on the instrument, without warming up ever moving it.

## THE RULE / LOGIC
At Jam mode's Idle, each press of the tap button is a tap and starts listening. While tap-in listens, every controller note is a tap too, the starting note included, which then starts nothing; a Start click still starts a Jam. Listening ends two seconds after the last tap, or as soon as anything else is used. Notes alone never tap: without a press of the tap button, notes at Jam mode's Idle stay ignored, so warming up never moves the tempo. A very short note is not a tap. Tap-in starts nothing: no count-in, no Jam, no sound.

## TECHNICAL INTERFACE
A tap button at Jam mode's Idle; while it listens, controller notes count as taps.

## EXPECTATION
- Controller notes count as taps only while tap-in listens, which a press of the tap button starts and which ends two seconds after the last tap or when anything else is used.
- While tap-in listens, no note starts a Jam.
- Tap-in never starts a count-in, a Jam or a sound.
