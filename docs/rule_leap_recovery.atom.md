---
id: rule_leap_recovery
status: STABLE
human_name: Leap Recovery
layer: BUSINESS
parents:
  - [[req_four_measure_phrase]]
type: RULE
version: 0.3
priority: 2
tags: melody,leaps,playability
dependents:
  - [[rule_join_inherits_leap_recovery]]
---

# Leap Recovery

## INTENT
Make larger melodic leaps recover in a playable, directional way.

## THE RULE / LOGIC
Only a large leap (7-12 semitones) creates recovery debt; skips, leaps, and arpeggio runs never create debt on their own. Recovery is the next interval moving in the opposite direction by 1-4 semitones. By default the debt is due on the next sounding note. At Leaping and Angular, a large leap inside a recognized three-note chord-tone run defers its debt to the note after the run's final note; Shaped always recovers immediately and Smooth never has debt. The final sounding event of a phrase generated without carry-in cannot carry debt. In a session, a phrase generated with carry-in may end with its debt still owed: the next phrase generated with that carry-in repays it with its first note under these same rules. If no phrase generated with that carry-in follows (the session ends, or the next phrase is a standalone or repeated phrase), the debt stays unpaid. The planner reserves enough active range for the selected contour and required recovery before accepting an outward leap.

## TECHNICAL INTERFACE
Leapiness and register controls constrain melodic interval selection.

## EXPECTATION
Every large leap is followed by its recovery, either on the next sounding note or, where deferral is permitted, directly after the recognized run containing it; a debt left owing at the end of a phrase generated with carry-in is repaid by the first note of the next phrase generated with that carry-in. The final sounding event of a phrase generated without carry-in carries no pending recovery, and selected contour remains feasible after every accepted outward leap.
