# Jazz Profile

Status: curated profile summary

## Player Promise

The initial jazz profile keeps the neutral profile's diatonic harmonic plan and phrase construction. Its only added vocabulary is a brief chromatic approach or enclosure resolving to a chord tone. It does not yet add altered dominants, secondary dominants, tritone substitutions, borrowed harmony, or modulation.

## Chromatic Approaches

A chromatic approach is one note a semitone above or below a target chord tone. The target is the next sounding event with no intervening rest or harmony change. It is an ornament, not a new chord or scale. Exact candidate and validation rules are in [Pitch Planner and Validation Policy](pitch-planner-validation.md#neutral-and-jazz-vocabulary).

Constraints:

- Target a chord tone, preferably at a chord change or metrically strong arrival.
- Do not sustain the approach note longer than the target note.
- Do not chain approaches or use one to target a non-chord tone.

## Chromatic Enclosures

An enclosure uses two consecutive short attacks around a target chord tone, one semitone above and one below in either order, then the target. At least one enclosure note lies outside the collection. The three attacks are contiguous, remain under one harmony, and resolve directly to the target.

Constraints:

- Use an enclosure only when the selected subdivision leaves enough room to hear its resolution.
- Do not overlap ornaments or use one when the rhythm does not already supply all three attacks.
- Resolve every enclosure before the final sounding event.
- Keep the harmonic plan unchanged; an enclosure decorates a target and must not imply an altered or substitute chord.

## Why It Is Separate

Approaches and enclosures are stylistic melodic ornaments. Altered dominants and substitutions change the harmonic plan itself. Keeping those concerns separate tests the profile contract: the jazz profile can add a local pitch rule without forcing the neutral profile, harmony planner, notation renderer, or backing arranger to acquire jazz-specific behavior.
