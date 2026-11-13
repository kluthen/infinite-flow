---
id: rule_seventh_chords_level_never_a_quota
status: REVIEW
type: RULE
layer: BUSINESS
version: 0.1
priority: 1
human_name: The Seventh Chords Level Is Never a Quota
dependents:
  - [[service_generation_orchestration]]
tags: [v3, release-v3.3, generation, chords]
parents:
  - [[req_seventh_chords_level]]
---

# The Seventh Chords Level Is Never a Quota

## INTENT
Let a raised level add seventh chords without ever making a phrase impossible or slow to find.

## THE RULE / LOGIC
The level only orders what the generator tries; it never requires a seventh chord. No phrase is rejected or retried for lacking one, and at every level each chord plan stays reachable in its triad form, so a plan that works only as triads is still found.

## TECHNICAL INTERFACE
Phrase acceptance never checks how many seventh chords a phrase holds.

## EXPECTATION
- No phrase is rejected or generated again because it holds no seventh chord, or too few.
- At every level above Off, a chord plan whose seventh forms lead to no phrase is still found in its triad form.
