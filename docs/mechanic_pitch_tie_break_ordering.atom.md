---
id: mechanic_pitch_tie_break_ordering
status: REVIEW
type: MECHANIC
parents:
  - [[entity_pitch_candidate_domain]]
human_name: Pitch Tie Break Ordering
layer: ARCHITECTURE
priority: 1
version: 0.2
tags: pitch
dependents: []
---

# Pitch Tie Break Ordering

## INTENT
Give the pitch search a deterministic, seed-dependent tie-break so that candidates with otherwise-equal ranking are always compared in the same order on every machine and every run.

## THE RULE / LOGIC
A tie key hashes the seed, a decision identity naming the point in the search where a choice is being made, and a candidate's stable identity into one 32-bit unsigned value using a fixed versioned hash. Comparing two candidates first compares their tie keys as unsigned 32-bit integers, never as signed integers, so no pair of keys can flip order near bit 31; equal tie keys then compare by MIDI value, and equal MIDI values then compare by enumeration index, so the ordering is always a total order with no remaining nondeterminism. A second comparison form accepts already-computed tie keys directly, for callers that hash each candidate once before sorting rather than once per pairwise comparison.

Where the pitch search tries one candidate more than once at a decision, first as a drawn figure and again in its usual place (module_favored_figure_draw), each try is an entry of its own: an entry tried as a drawn figure takes its tie key over the candidate's stable identity followed by the figure's id (`identity|figureId`), its usual entry over the candidate's identity alone, and two entries still equal after the enumeration index compare by the drawn figure's position in the fixed figure order, the usual entry first, so the order stays total.

## TECHNICAL INTERFACE
Callers supply a seed, a decision identity string, and a candidate's stable identity to obtain its tie key, or supply an injected tie-key factory in place of the production hash. The comparison functions accept either two full tie-key subjects with a key factory, or two already-computed tie keys, together with each candidate's MIDI value and enumeration index, and return a standard three-way comparison result. orderCandidates (src/domain/pitch/pitch-ranking.ts) computes each entry's tie key once, with the drawn figure's id appended to the identity of a favored entry, and adds the figure-order comparison after compareUnsignedTieKeys (src/domain/pitch/pitch-tie-key.ts).

## EXPECTATION
The same seed, decision identity, and candidate identity always produce the same tie key on every machine. Comparing by tie key, then MIDI, then enumeration index always yields a total order with no ties left unresolved, and unsigned comparison never reorders a pair solely because one computed key's bit 31 is set.
