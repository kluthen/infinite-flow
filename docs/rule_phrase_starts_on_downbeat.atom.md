---
id: rule_phrase_starts_on_downbeat
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.1
priority: 2
human_name: Phrase Starts on the Downbeat
tags: rhythm,pulse,phrase-start
parents:
  - [[req_four_measure_phrase]]
---

# Phrase Starts on the Downbeat

## INTENT
Make every generated phrase begin with a clear, playable downbeat so the player hears the meter from the first note.

## THE RULE / LOGIC
The first event of the phrase is a fresh note attack at bar 1, tick 0 (beat 1). A phrase never opens with a rest, a pickup, or a tie continuation. Later bars remain free to start with rests or ties within the other rhythm rules.

## TECHNICAL INTERFACE
The rhythm planner emits only candidates whose first bar's first event is a non-tie note at tick 0, and rhythm validation rejects any other candidate. The rule must not make any control combination that produced a rhythm candidate before it infeasible. Settings that the rhythm grammar cannot satisfy for other reasons are governed by [[rule_unsupported_rhythm_settings_block_generation]].

## EXPECTATION
For every control combination and seed, the first sounding event of the generated phrase starts at bar 1, beat 1.
