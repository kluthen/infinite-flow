---
id: rule_held_doodle_phrase_one_at_idle
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.3
priority: 1
tags: [v3, release-v3.2, session, jam, idle]
parents:
  - [[rule_jam_again_on_this_doodle]]
human_name: A Kept Doodle's Phrase 1 Is Ready at Idle
dependents:
  - [[rule_jam_pregeneration_only_for_kept_doodle]]
  - [[rule_jam_setting_change_rewrites_kept_phrase_one]]
---

# A Kept Doodle's Phrase 1 Is Ready at Idle

## INTENT
Give a repeat Jam a phrase 1 the player can read before starting.

## THE RULE / LOGIC
At Jam mode's Idle with a kept doodle, phrase 1 is generated from the doodle at Idle, with no deadline, through the same three rungs as a fresh Jam's phrase 1, and is on screen. After the review of a Jam, Idle shows a phrase 1 newly written from the kept doodle with a fresh seed, ready to go round again. The starting note is phrase 1's first note. The Idle rules for a phrase, and the background generation of the phrases that follow it, run as for any phrase 1, a replacement being generated from the kept doodle too. Regenerate generates a new phrase 1 from the kept doodle and keeps it. The key and mode suggestion, when there is one, stays shown.

## TECHNICAL INTERFACE
Jam mode's Idle with a kept doodle shows a phrase 1 generated from it.

## EXPECTATION
- With a kept doodle, Jam mode's Idle shows a phrase 1 generated from it, and its first note is the starting note.
- Regenerate keeps the kept doodle and writes a new phrase 1 from it.
- After a Jam's review, Idle shows a phrase 1 newly generated from the kept doodle with a fresh seed.
