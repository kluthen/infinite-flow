---
id: rule_unsupported_rhythm_settings_block_generation
status: DRAFT
human_name: Unsupported Rhythm Settings Block Generation
layer: BUSINESS
version: 0.3
type: RULE
priority: 1
tags: player-controls,rhythm,generation
parents:
  - [[user_story_controlled_phrase_generation]]
dependents:
  - [[module_rhythm_variety_grammar]]
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

These values stay individually selectable. When the current density, silence, and syncopation selection matches one of the combinations unsupported for the currently selected rhythmic-variety level, generation, regeneration, and generation retry are unavailable and the player sees a calm explanation that suggests a nearby supported change without applying it. Any previously generated phrase stays visible, with one exception: when an instrument-profile switch happens while one of these combinations is currently selected, the switch still applies (the written tonal center and collection selection changes) but the phrase is unconditionally cleared to the empty workspace instead of staying visible, and no generation runs -- this no longer depends on whether the unchanged phrase would have been invalid under the new profile's range, because a profile switch never validates or retains the previous phrase at all. Changing the rhythmic-variety level alone, with density, silence, and syncopation unchanged, can newly block or newly unblock generation for the current selection.

This is a known limit of the rhythm grammar, not a musical judgment. The list is keyed by (rhythmic-variety level, note density, silence density, syncopation) and must always equal the set of combinations for which the rhythm planner returns no legal plan under that variety level. A user-confirmed rhythm-grammar feasibility review fixed this per-variety list (6 under `Strict`, 4 under `Slightly varied`, 0 under `Heavily varied`) ahead of implementing rhythmic variety; the list shrinks further only when a later grammar version makes a combination playable.

## TECHNICAL INTERFACE
A single domain-owned list, keyed by rhythmic-variety level, note density, silence density, and syncopation, names the unsupported combinations: 6 entries under `Strict`, 4 under `Slightly varied`, 0 under `Heavily varied`. The workspace reads it, keyed by the current variety selection, to disable generation and show the explanation, and a test checks it against the rhythm planner's no-legal-plan results across every control combination and every variety level.

## EXPECTATION
Selecting any combination listed for the currently selected rhythmic-variety level disables generation, regeneration, and generation retry, and shows the explanation. Selecting a supported density/silence/syncopation value, or changing the rhythmic-variety level so the current selection is no longer listed for that level, restores generation; conversely, changing the rhythmic-variety level can newly block a combination that was previously supported. For every (variety, density, silence, syncopation) combination not on that variety level's list, the rhythm planner produces at least one candidate. An instrument-profile switch while a listed combination is selected unconditionally clears the phrase and runs no generation, regardless of whether the retained phrase would have fit the new profile.
