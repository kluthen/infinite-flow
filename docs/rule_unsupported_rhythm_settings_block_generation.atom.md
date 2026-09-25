---
id: rule_unsupported_rhythm_settings_block_generation
status: REVIEW
human_name: Unsupported Rhythm Settings Block Generation
layer: BUSINESS
version: 0.1
type: RULE
priority: 1
tags: player-controls,rhythm,generation
parents:
  - [[user_story_controlled_phrase_generation]]
dependents: []
---

# Unsupported Rhythm Settings Block Generation

## INTENT
Tell the player up front when their rhythm settings cannot form a phrase, instead of letting a generation attempt fail.

## THE RULE / LOGIC
Under the current rhythm grammar, six combinations of note density, silence density, and syncopation have no legal four-bar rhythm for any tension arc:

- Quarter, Sparse, Active displacement
- Quarter, Breath-heavy, Active displacement
- Sixteenth, Sparse, Active displacement
- Sixteenth, Conversational, Active displacement
- Sixteenth, Breath-heavy, Occasional offbeats
- Sixteenth, Breath-heavy, Active displacement

These values stay individually selectable. When the current selection matches one of these combinations, generation, regeneration, and generation retry are unavailable and the player sees a calm explanation that suggests a nearby supported change without applying it. Any previously generated phrase stays visible, with one exception: when an instrument-profile switch both lands on one of these combinations and finds the unchanged phrase invalid under the new profile's active range and resolved whole-phrase register window, the switch still applies but the phrase is cleared to the empty workspace instead of staying visible, and no generation runs. Presets never select an unsupported combination.

This is a known limit of the rhythm grammar, not a musical judgment. The list shrinks when a grammar version makes a combination playable and must always equal the set of combinations for which the rhythm planner returns no legal plan.

## TECHNICAL INTERFACE
A single domain-owned list names the unsupported combinations. The workspace reads it to disable generation and show the explanation, and a test checks it against the rhythm planner's no-legal-plan results across every control combination.

## EXPECTATION
Selecting any listed combination disables generation, regeneration, and generation retry, and shows the explanation. Selecting a supported value restores generation. For every control combination not on the list, the rhythm planner produces at least one candidate.
