---
id: module_rhythm_skeleton_allocator
status: REVIEW
priority: 1
version: 0.1
dependents: []
human_name: Rhythm Skeleton Allocator
type: MODULE
layer: ARCHITECTURE
tags: rhythm,skeleton,density,silence,step6
parents:
  - [[req_four_measure_phrase]]
  - [[rule_complete_four_four_measures]]
  - [[user_story_controlled_phrase_generation]]
---

# Rhythm Skeleton Allocator

## INTENT
Enumerate finite version-owned nominal rhythm skeletons from note and silence density.

## THE RULE / LOGIC
The allocator enumerates immutable nominal skeletons from the selected grammar version's finite canonical production catalog using only NoteDensity and SilenceDensity. It constructs the gesture skeleton before answer and syncopation transforms, preserves the selected version's production order, and rejects partial skeletons that cannot satisfy irreversible structural constraints. Catalog contents, numerical calibration, and ordering tables remain policy-document detail; changing a production or its order requires a new grammar version instead of changing an existing version's meaning.

## TECHNICAL INTERFACE
The grammar registry invokes the allocator with RhythmSkeletonInput containing NoteDensity and SilenceDensity and receives a lazy finite iterable iterator of immutable nominal skeletons. The allocator accepts no Syncopation, TensionArc, seed, random source, harmony, pitch, profile, instrument, ranking, selection, arbitrary candidate limit, or tooling fixture.

## EXPECTATION
For the same grammar version and skeleton input, traversal is finite, deterministic, and replayable in the version's canonical order. The allocator never eagerly materializes a four-bar Cartesian product, consumes randomness, or applies a time-, seed-, or arbitrary-count cutoff.
