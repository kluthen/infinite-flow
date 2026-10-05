---
id: mechanic_syncopation_enumeration
status: REVIEW
human_name: Syncopation Enumeration
layer: ARCHITECTURE
priority: 1
tags: rhythm,syncopation,step6
type: MECHANIC
version: 0.2
parents:
  - [[rule_complete_four_four_measures]]
  - [[rule_preserve_metrical_anchor]]
  - [[user_story_controlled_phrase_generation]]
dependents: []
---

# Syncopation Enumeration

## INTENT
Enumerate the finite candidate and canonical syncopation transform-descriptor lists available for one rhythm expansion, without ranking, applying, or selecting among them.

## THE RULE / LOGIC
For one pair of adjacent bars, the mechanic enumerates every disjoint single- and paired-descriptor answer transform list in one canonical sort order (by bar index, boundary tick, transform case, then signed displacement), including paired lists only under the tension arcs that permit them. Separately, for the finite canonical v1 syncopation template catalog, it enumerates transform-descriptor lists per bar using memoized pure selectors so repeated selector computation is shared across one expansion's calls. Enumeration never chooses a substitute descriptor, never repairs an invalid descriptor, and never applies a descriptor to a skeleton; those responsibilities belong to descriptor application and to the grammar registry's version selection.

## TECHNICAL INTERFACE
Callers supply the adjacent rhythm bars (or bar list), note density, tension arc, and syncopation setting, plus an optional shared selector memo, and receive an iterator of candidate or canonical transform-descriptor lists. The public enumerators yield deep-frozen lists. Their internal counterparts for the rhythm planner, which never publishes an enumerated list, yield the same lists in the same order without freezing the lists themselves; every descriptor in them is already frozen. A caller may also ask, for a bar list, which Active displacement templates its bars' selectors admit, as a bitmask in canonical template order, where an empty mask over any prefix of a phrase's bars proves no Active template exists for it. The mechanic accepts no seed, random source, harmony, pitch, ranking, or selection policy, and performs no mutation of its inputs.

## EXPECTATION
Enumeration is deterministic and exhaustive for its declared scope: identical bars, density, tension arc, and syncopation setting always yield the same transform-descriptor lists in the same order, and no yielded list violates descriptor-address disjointness.
