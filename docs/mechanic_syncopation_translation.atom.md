---
id: mechanic_syncopation_translation
status: REVIEW
type: MECHANIC
priority: 1
tags: rhythm,syncopation,metrical-anchor,step6
version: 0.1
dependents: []
human_name: Syncopation Translation
layer: ARCHITECTURE
parents:
  - [[rule_complete_four_four_measures]]
  - [[rule_preserve_metrical_anchor]]
  - [[user_story_controlled_phrase_generation]]
---

# Syncopation Translation

## INTENT
Apply one immutable versioned rhythm-transform descriptor to a nominal skeleton without mutation.

## THE RULE / LOGIC
A transform descriptor records the grammar version, transform case, stable source coordinates, signed displacement when applicable, transformed coordinates, and roles. The mechanic applies exactly that descriptor's declared boundary translation, onset displacement, redistribution, final-pattern exchange, or tied-sustain split to one immutable skeleton and returns a new immutable skeleton or a typed transform failure. It neither chooses a substitute descriptor nor repairs an invalid descriptor; descriptor enumeration and version selection belong to the grammar registry. Any new transform case or changed application semantics requires a new grammar version rather than reinterpretation of rhythm-mvp-v1.

## TECHNICAL INTERFACE
The mechanic receives one immutable nominal skeleton and one immutable RhythmTransformDescriptor and returns a new immutable skeleton or typed transform failure. It accepts no seed, random source, harmony, pitch, profile, instrument, ranking, selection, calibration table, catalog ordering table, or tooling fixture.

## EXPECTATION
Application never mutates its input skeleton or descriptor. A successful result preserves every invariant declared by the descriptor's algebra; an invalid or inapplicable descriptor returns a typed failure and never falls back to another target or silently changes the requested rhythm.
