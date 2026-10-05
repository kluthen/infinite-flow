---
id: rule_unsupported_rhythm_settings_block_generation
status: DRAFT
human_name: Unsupported Rhythm Settings Block Generation
layer: BUSINESS
version: 0.4
type: RULE
priority: 1
tags: [player-controls, rhythm, generation, v2, release-v2.0, revised-for-v2]
parents:
  - [[user_story_controlled_phrase_generation]]
dependents:
  - [[module_idle_fit_round]]
  - [[module_idle_generation_error_recovery]]
  - [[module_idle_window_width_density]]
  - [[module_rhythm_variety_grammar]]
  - [[rule_unsupported_rhythm_gives_way_to_no_phrase]]
notes: Revised 2026-09-29 by v2 spec ingestion for release v2.0 (previous version 0.3). Changes - a combination is judged on the note density a phrase would be generated with (a chosen Sixteenth counts as Eighth below the tablet-landscape layout width); a blocked combination also blocks session start; a shown phrase stays visible only while it fits the staff. Built - judging a combination on the note density a phrase would be generated with, at Idle, in the workspace's generation, profile switch, phrase action and rhythm-controls notice. Not yet built - blocking a session start (no session exists yet), and a shown phrase staying visible only while it fits the staff.
---

# Unsupported Rhythm Settings Block Generation

## INTENT

Tell the player up front when their rhythm settings cannot form a phrase, instead of letting a generation attempt fail.

## THE RULE / LOGIC
Which note density, silence density, and syncopation combinations have no legal four-bar rhythm depends on the selected rhythmic-variety level. Under `Strict`, six combinations remain unsupported for any tension arc:

- Quarter, Sparse, Active displacement
- Quarter, Breath-heavy, Active displacement
- Sixteenth, Sparse, Active displacement
- Sixteenth, Conversational, Active displacement
- Sixteenth, Breath-heavy, Occasional offbeats
- Sixteenth, Breath-heavy, Active displacement

Under `Slightly varied`, four of those six remain unsupported: Quarter/Sparse/Active displacement, Quarter/Breath-heavy/Active displacement, Sixteenth/Breath-heavy/Occasional offbeats, and Sixteenth/Breath-heavy/Active displacement. The other two, Sixteenth/Sparse/Active displacement and Sixteenth/Conversational/Active displacement, become supported because the eighth-bearing beat cells `Slightly varied` adds rescue the attack band under active displacement. Under `Heavily varied`, none of the density/silence/syncopation combinations are unsupported. Eighth note density is never blocked at any variety level. Presets never select an unsupported combination; both first-release presets use `Slightly varied`.

These values stay individually selectable, except that Sixteenth cannot be newly chosen below the tablet-landscape layout's width. A combination is judged on the note density a phrase would be generated with: below the tablet-landscape layout's width a chosen Sixteenth counts as Eighth, so a combination unsupported only because of Sixteenth blocks nothing there, and a crossing of that width at Idle can newly block or newly unblock generation. When that density, together with the current silence and syncopation selection, matches one of the combinations unsupported for the currently selected rhythmic-variety level, generation, regeneration, and generation retry are unavailable, no session can start, and the player sees a calm explanation that suggests a nearby supported change without applying it. Any previously generated phrase stays visible as long as it still fits the staff, with one exception: when an instrument-profile switch happens while one of these combinations is currently selected, the switch still applies (the written tonal center and collection selection changes) but the phrase is unconditionally cleared to the empty workspace instead of staying visible, and no generation runs -- this no longer depends on whether the unchanged phrase would have been invalid under the new profile's range, because a profile switch never validates or retains the previous phrase at all. Changing the rhythmic-variety level alone, with density, silence, and syncopation unchanged, can newly block or newly unblock generation for the current selection.

This is a known limit of the rhythm grammar, not a musical judgment. The list is keyed by (rhythmic-variety level, note density, silence density, syncopation) and must always equal the set of combinations for which the rhythm planner returns no legal plan under that variety level. A user-confirmed rhythm-grammar feasibility review fixed this per-variety list (6 under `Strict`, 4 under `Slightly varied`, 0 under `Heavily varied`) ahead of implementing rhythmic variety; the list shrinks further only when a later grammar version makes a combination playable.

## TECHNICAL INTERFACE
A single domain-owned list, keyed by rhythmic-variety level, note density, silence density, and syncopation, names the unsupported combinations: 6 entries under `Strict`, 4 under `Slightly varied`, 0 under `Heavily varied`. The workspace reads it, keyed by the current variety selection and the note density a phrase would be generated with, to disable generation and session start and to show the explanation, and a test checks it against the rhythm planner's no-legal-plan results across every control combination and every variety level.

## EXPECTATION
Selecting any combination listed for the currently selected rhythmic-variety level, judged on the note density a phrase would be generated with, disables generation, regeneration, generation retry, and session start, and shows the explanation. Below the tablet-landscape layout's width, a combination listed only because of a chosen Sixteenth blocks nothing. Selecting a supported density/silence/syncopation value, or changing the rhythmic-variety level so the current selection is no longer listed for that level, restores generation; conversely, changing the rhythmic-variety level can newly block a combination that was previously supported. For every (variety, density, silence, syncopation) combination not on that variety level's list, the rhythm planner produces at least one candidate. An instrument-profile switch while a listed combination is selected unconditionally clears the phrase and runs no generation, regardless of whether the retained phrase would have fit the new profile.
