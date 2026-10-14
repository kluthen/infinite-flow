---
id: rule_held_doodle_phrase_one_at_idle
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.2
priority: 1
tags: [v3, release-v3.2, session, jam, idle]
parents:
  - [[rule_jam_again_on_this_doodle]]
human_name: A Held Doodle's Phrase 1 Is Ready at Idle
dependents: []
---

# A Held Doodle's Phrase 1 Is Ready at Idle

## INTENT
Give a repeat Jam a phrase 1 the player can read before starting.

## THE RULE / LOGIC
At Idle with a held doodle, phrase 1 is generated from the doodle at Idle, with no deadline, through the same three rungs as a Jam's phrase 1, and is on screen. The starting note is phrase 1's first note. The Idle rules for a phrase, and the background generation of the phrases that follow it, run as for any phrase 1, a replacement being generated from the held doodle too. Regenerate generates a new phrase 1 from the held doodle and keeps it. A Jam played on the held doodle keeps it too, so after that Jam's review Idle shows a phrase 1 newly written from the held doodle with a fresh seed, ready to go round again.

## TECHNICAL INTERFACE
Idle with a held doodle shows a phrase 1 generated from it.

## EXPECTATION
- With a held doodle, Idle shows a phrase 1 generated from it, and its first note is the starting note.
- Regenerate keeps the held doodle.
- After the review of a Jam played on a held doodle, the doodle is still held and Idle shows a phrase 1 newly generated from it with a fresh seed.
