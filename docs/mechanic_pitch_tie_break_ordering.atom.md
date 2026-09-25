---
id: mechanic_pitch_tie_break_ordering
status: DRAFT
type: MECHANIC
parents:
  - [[entity_pitch_candidate_domain]]
human_name: Pitch Tie Break Ordering
layer: ARCHITECTURE
priority: 1
version: 0.1
tags: pitch
dependents: []
---

# Pitch Tie Break Ordering

## INTENT
Give the pitch search a deterministic, seed-dependent tie-break so that candidates with otherwise-equal ranking are always compared in the same order on every machine and every run.

## THE RULE / LOGIC
A tie key hashes the seed, a decision identity naming the point in the search where a choice is being made, and a candidate's stable identity into one 32-bit unsigned value using a fixed versioned hash. Comparing two candidates first compares their tie keys as unsigned 32-bit integers, never as signed integers, so no pair of keys can flip order near bit 31; equal tie keys then compare by MIDI value, and equal MIDI values then compare by enumeration index, so the ordering is always a total order with no remaining nondeterminism. A second comparison form accepts already-computed tie keys directly, for callers that hash each candidate once before sorting rather than once per pairwise comparison.

## TECHNICAL INTERFACE
Callers supply a seed, a decision identity string, and a candidate's stable identity to obtain its tie key, or supply an injected tie-key factory in place of the production hash. The comparison functions accept either two full tie-key subjects with a key factory, or two already-computed tie keys, together with each candidate's MIDI value and enumeration index, and return a standard three-way comparison result.

## EXPECTATION
The same seed, decision identity, and candidate identity always produce the same tie key on every machine. Comparing by tie key, then MIDI, then enumeration index always yields a total order with no ties left unresolved, and unsigned comparison never reorders a pair solely because one computed key's bit 31 is set.
