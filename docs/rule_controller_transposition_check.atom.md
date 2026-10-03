---
id: rule_controller_transposition_check
status: DRAFT
priority: 1
human_name: Controller-Transposition Check
tags: [v2, release-v2.0, v2.4-check, midi]
type: RULE
layer: BUSINESS
version: 0.2
parents:
  - [[rule_controller_connects_between_sessions]]
dependents: []
---

# Controller-Transposition Check

## INTENT
Catch a controller and instrument template that silently disagree about transposition.

## THE RULE / LOGIC
A wind or breath controller and a written-pitch instrument template can silently disagree: for example, a controller left at its factory default sends untransposed MIDI, while a tenor-saxophone template expects concert pitch 14 semitones below written pitch. Since acknowledgement never gives a mismatch hint, a player in that state would get total silence with no clue why. As part of connecting a controller, the app runs a one-time check, re-runnable between sessions only: it shows one written note from the instrument's own range, the player plays it, and the app reports "matches", "transposed by n octaves" or "transposed by n semitones", suggesting either a device setting to change or a better-matching instrument template. No note played during the check can start a session, even one that happens to be phrase 1's first note. The check ships regardless of any later decision about a manual input-transposition setting.

## TECHNICAL INTERFACE
The connection step shows one written note and reports the played note's constant offset from its expected concert pitch.

## EXPECTATION
- The check correctly reports a match, a constant octave offset or a constant semitone offset for injected test offsets.
- It can be re-run only between sessions, and no note played during it starts a session.
- Its verification on the reference hardware is a check of the later real-hardware release, v2.4, and does not block v2.0: with the device's own transpose setting at each of C, B♭ tenor and E♭ alto, confirm which MIDI note a written middle C actually sends, whether an octave setting changes it, and what note-on velocity it uses.
