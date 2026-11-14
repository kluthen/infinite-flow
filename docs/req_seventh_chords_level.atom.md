---
id: req_seventh_chords_level
status: DRAFT
priority: 1
human_name: The Seventh Chords Level
tags: [v3, release-v3.3, generation, player-controls, chords]
type: REQUIREMENT
layer: BUSINESS
version: 0.1
parents:
  - [[user_story_controlled_phrase_generation]]
dependents:
  - [[module_seventh_chords_level_options]]
  - [[rule_carried_seventh_chord_compared_by_triad]]
  - [[rule_earlier_kept_sessions_read_at_off]]
  - [[rule_extensions_never_chord_tones]]
  - [[rule_jam_has_own_seventh_chords_level]]
  - [[rule_join_reads_carried_chord_as_triad]]
  - [[rule_no_export_carries_seventh_chords_level]]
  - [[rule_rhythm_lock_tries_both_forms]]
  - [[rule_seventh_chance_same_at_every_degree]]
  - [[rule_seventh_chord_draws_reproducible]]
  - [[rule_seventh_chord_symbols]]
  - [[rule_seventh_chords_diatonic_only]]
  - [[rule_seventh_chords_keep_the_chord_plan]]
  - [[rule_seventh_chords_level_never_a_quota]]
  - [[rule_seventh_chords_level_steps]]
  - [[rule_seventh_chords_off_changes_nothing]]
  - [[rule_seventh_is_chord_tone]]
  - [[rule_triad_fallback_per_phrase]]
  - [[rule_vary_settings_never_moves_seventh_chords_level]]
---

# The Seventh Chords Level

## INTENT
Let the player allow seventh chords, richer than triads, and say how often the generator prefers them, without ever being forced to hear one.

## THE RULE / LOGIC
A seventh chord is a triad with one more note stacked on top, a seventh above the chord's root: C–E–G–B is a C major seventh chord, written Cmaj7. The Seventh chords level says how often the generator prefers a chord's seventh form to its plain triad on the same scale degree. It has four steps: Off, Sometimes, Favored and Strongly favored. Off allows triads only and is the first-load value. The level is a preference that orders the generator's choices; it never sets a quota, and it never chooses a chord progression, which stays generated. It is a generation setting of the Idle screen, like the controls and the figure levels: set at Idle, the review included, locked while a session runs, saved and restored after a reload, held by every preset, and part of what every phrase is generated from. Session mode and Jam mode each have their own level, and a phrase follows the level of the mode it is generated in.

## TECHNICAL INTERFACE
A Seventh chords level control with four steps sits with the generation settings at Idle and in the review; Jam mode shows its own at Jam's Idle.

## EXPECTATION
- The level has four steps, Off, Sometimes, Favored and Strongly favored, and is Off at first load.
- The level can be changed at Idle and in the review, never during a session.
- After a reload the level is the one the player last set.
- At Off every chord is a triad.
