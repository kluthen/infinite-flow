---
id: rule_jam_has_own_seventh_chords_level
status: DRAFT
priority: 1
human_name: Jam Has Its Own Seventh Chords Level
parents:
  - [[req_jam_settings]]
  - [[req_seventh_chords_level]]
layer: BUSINESS
version: 0.1
tags: [v3, release-v3.3, jam, player-controls, chords]
dependents:
  - [[module_jam_settings]]
  - [[module_seventh_chords_level_options]]
type: RULE
---

# Jam Has Its Own Seventh Chords Level

## INTENT
Let a Jam's chords follow Jam's own choice, never one made for session mode.

## THE RULE / LOGIC
Jam mode has its own Seventh chords level, apart from session mode's, with the same four steps and Off as its first value. Every phrase of a Jam is generated with Jam's level as it stands when the Jam starts, each rung of a fresh Jam's phrase 1 included, and so is a Jam started with Jam again on this doodle; the phrases of a kept Jam session keep the level they were generated with. Changing one mode's level never changes the other's, and neither enters the other mode's pre-generation.

## TECHNICAL INTERFACE
Jam's request builder reads Jam's own level, never session mode's.

## EXPECTATION
- Changing session mode's level never changes Jam's, and the other way round.
- Every phrase of a Jam, each rung of a fresh Jam's phrase 1 included, is generated with Jam's level.
- A Jam again on a kept session's doodle generates with Jam's level as it stands then, while the kept session's phrases keep the level they were generated with.
- Neither mode's level enters the other mode's pre-generation.
