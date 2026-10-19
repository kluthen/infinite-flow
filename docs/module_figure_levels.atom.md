---
id: module_figure_levels
status: DRAFT
type: MODULE
priority: 1
human_name: Figures and Their Levels
dependents:
  - [[module_generation_request_construction]]
  - [[module_musical_profile_capabilities]]
  - [[module_phrase_replay_key]]
  - [[module_stored_profile_to_levels]]
layer: ARCHITECTURE
version: 0.2
tags: [v3, release-v3.1, generation, figures]
parents:
  - [[req_embellishment_figure_levels]]
  - [[rule_chromatic_notes_need_a_chromatic_figure]]
  - [[rule_embellishment_figures_defined]]
  - [[rule_figure_level_orders_search]]
  - [[rule_neutral_and_jazz_figure_levels]]
---

# Figures and Their Levels

## INTENT
Give the seven figures and their four levels one fixed internal vocabulary, which the generation request, the replay key and the stored records hold, and one place from which the generator learns what the levels allow it to write.

## THE RULE / LOGIC
The seven figures have fixed internal ids, in a fixed order that every value, key and record listing them follows: passingTone, accentedPassingTone, neighborTone, appoggiatura, diatonicEnclosure, chromaticApproach, chromaticEnclosure. The four levels have fixed internal ids, in increasing order: off, asToday, favored, stronglyFavored. These ids are internal and never change, since replay keys and stored records hold them; the interface's labels (Off, Rarely, Often, Very often) and the spec's working names (Off, As today, Favored, Strongly favored) can change without touching them. A figure-levels value gives exactly one level to each of the seven figures, no more and no fewer.

Neutral's levels are passingTone, accentedPassingTone and neighborTone asToday, every other figure off. Jazz's levels are the same with chromaticApproach and chromaticEnclosure asToday. levelsForProfile is the one mapping from a musical profile to levels: Neutral gives Neutral's levels and Jazz gives Jazz's, whatever the profile's customized mark, since being customized never changed the figures. It serves wherever a musical profile still stands for the levels: the musical profile selection the request is built from, and what earlier versions recorded (the profile in a replay key of version 1 or 2, or in a kept phrase).

The allowance is what the levels let the generator write, worked out from the levels alone: a figure may be written as a free figure exactly when its level is not off, and a note from outside the key and mode exactly when the chromatic approach or the chromatic enclosure is not off. The pitch search and the result validator read the allowance from the generation request's figure levels, which the pitch policy and the validation context carry; no generator or validator code reads a musical profile's or a preset's name, or a table keyed by one, to decide a note. Neutral's levels allow no chromatic note and Jazz's allow it, so with them the generator writes exactly what it wrote before the levels existed.

The module is pure data and functions: it reads no storage, interface, clock or random source.

## TECHNICAL INTERFACE
src/domain/figures/figure-levels.ts exports the seven figure ids in their order, the four level ids in their order, the FigureLevels type (one level per figure id), NEUTRAL_FIGURE_LEVELS and JAZZ_FIGURE_LEVELS, frozen, levelsForProfile(profile), parseFigureLevels(value), which reads an untrusted value as exactly one known level per figure or throws a FigureLevelsError naming the cause, and the allowance helpers allowsFreeFigure(levels, figure) and allowsChromaticNotes(levels). makePitchPolicy (src/domain/pitch/pitch-policy.ts) keeps the request's levels in the pitch policy and the result validator (src/domain/validation/generation-result-validator.ts) puts them in its validation context; the pitch search (src/domain/pitch/pitch-candidates.ts) and the validator's figure rules (src/domain/pitch/validation/figure-rules.ts) call the helpers. The generation request carries the levels as figureLevels (module_generation_request_construction).

## EXPECTATION
- There are exactly seven figure ids and four level ids, in the orders above, and a figure-levels value holds each of the seven exactly once.
- NEUTRAL_FIGURE_LEVELS and JAZZ_FIGURE_LEVELS hold exactly Neutral's and Jazz's levels.
- levelsForProfile gives the same levels for a profile customized or not.
- The chromatic allowance holds exactly when the chromatic approach or the chromatic enclosure is not off: not for Neutral's levels, yes for Jazz's.
- No source file outside src/domain/figures/ and the profile-selection module reads a musical profile's name or a table keyed by one to decide a note.
- With Neutral's and Jazz's levels, the replay-key corpora and the cold-generation goldens are unchanged.
