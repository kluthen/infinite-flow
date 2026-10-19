---
id: rule_tension_resolution_delay_permits_rests
status: REVIEW
type: RULE
tags: tension,melody,harmony,rhythm,controls,changes-in-v3.1
parents:
  - [[req_four_measure_phrase]]
human_name: Tension Resolution Delay Permits Rests
layer: BUSINESS
priority: 1
version: 0.2
dependents: []
---

# Tension Resolution Delay Permits Rests

## INTENT
Permit rests to separate the members of a bound tension figure and its target, provided each subsequent member still starts within the tension arc's maximum resolution delay.

## THE RULE / LOGIC
A bound tension figure (passing/neighbor, appoggiatura, or two-note diatonic approach) and its resolution target are consecutive sounding attacks under one harmony event, and rests may separate them. Each attack after the figure's first member must start no later than the resolution deadline measured from the end of the previous sounding attack (tie-inclusive): for the Lift, Build, and Edge tension arcs, the next beat boundary after that end; for the Settled tension arc, the next strong-onset boundary (beat 1 or beat 3) after that end. The preparation note immediately before the figure's first member may also be separated from it by a rest, and no delay bound applies to that preparation note. This rest allowance does not extend to chromatic approaches or enclosures, whichever preset's figure levels allow them, which keep their stricter no-intervening-rest rule.

## TECHNICAL INTERFACE
The rule applies uniformly to every tension arc's bound figures once a harmony candidate's abstract tension requirement (allowed bars, maximum resolution delay, permitted figure kinds) has been bound to a concrete rhythm candidate; the maximum resolution delay is expressed abstractly as next_beat_or_bar or next_strong_sounding_onset, never as a concrete tick or onset.

## EXPECTATION
A candidate tension-figure binding is accepted only if every attack after the figure's first member starts within its arc's resolution deadline of the prior attack's end, even when a rest intervenes; a binding that exceeds the deadline is rejected regardless of any intervening rest, and chromatic approach and enclosure bindings, under any figure levels, never accept an intervening rest at all.
