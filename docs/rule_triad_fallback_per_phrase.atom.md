---
id: rule_triad_fallback_per_phrase
status: DRAFT
priority: 1
human_name: A Phrase Falls Back to Triads as a Whole
parents:
  - [[req_seventh_chords_level]]
dependents: []
type: RULE
version: 0.1
tags: [v3, release-v3.3, generation, chords]
layer: BUSINESS
---

# A Phrase Falls Back to Triads as a Whole

## INTENT
When seventh chords do not fit a phrase, give a clean all-triad phrase rather than one chord oddly missing its seventh.

## THE RULE / LOGIC
For each candidate chord plan, in the order the generator already tries plans, the generator first tries the plan with the seventh forms drawn for it, then, when at least one seventh form was drawn, the same plan with every harmony event as a triad, before it moves on to the next plan. So a phrase either keeps every seventh form drawn for it or is all triads; it never swaps one seventh chord for a triad. At Strongly favored a phrase is all seventh chords or, where they lead to no phrase, all triads. The list of candidate plans grows by at most one variant per plan.

## TECHNICAL INTERFACE
Each candidate chord plan with a drawn seventh form is followed by its triads-only variant.

## EXPECTATION
- Every phrase holds either every seventh form drawn for its plan or none of them.
- A plan whose drawn seventh forms lead to no phrase is tried as triads only before the next plan is tried.
- At Strongly favored, every phrase is all seventh chords or all triads.
