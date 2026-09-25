---
id: mechanic_pitch_contour_forward_check
status: DRAFT
human_name: Pitch Contour Forward Check
type: MECHANIC
priority: 1
version: 0.1
tags: pitch
parents:
  - [[entity_pitch_candidate_domain]]
layer: ARCHITECTURE
dependents: []
---

# Pitch Contour Forward Check

## INTENT
Enforce the selected melodic contour shape (Rising, Falling, Wandering, or Arch) across a phrase's four bar checkpoints by forward-checking every candidate pitch before it is assigned, so an unreachable contour is rejected before the search wastes fuel on it.

## THE RULE / LOGIC
A contour plan is compiled once per bound planner input from the four checkpoint attack indices, each checkpoint's candidate MIDI domain, the final attack's open-endpoint MIDI values, and a caller-supplied reach function bounding how far pitch can move over a given number of intervals. The plan encodes, for each checkpoint value, a bit-mask suffix table of which contour progress tags can still complete the remaining checkpoints and reach an open-ending final MIDI; the table is built backward from the last checkpoint so every entry already accounts for everything after it. A phrase whose rhythm yields fewer than four checkpoints is marked impossible and can never satisfy the contour. Rising and Falling track a single strict-direction tag; Wandering tracks which directions have been seen and requires both by the end; Arch tracks which of its two peak-position patterns (checkpoint 2 or checkpoint 3) remain possible after each observed step direction. Advancing the contour for one assigned note updates the tag when the note lands on a checkpoint, and otherwise only confirms that some future checkpoint value within reach keeps the suffix table's completion bit set; a non-checkpoint note between checkpoints, or after the last checkpoint before the open ending, is checked against reach and the final MIDI set without touching the tag. A separate reach-oblivious feasibility check answers whether some assignment of the four checkpoint domains satisfies the contour at all, used to fail fast when even a completely free choice of values still cannot reach a legal contour.

## TECHNICAL INTERFACE
Callers supply the selected contour, the four checkpoint attack indices, each checkpoint's candidate MIDI domain, the final attack index and its open-ending MIDI values, and a reach function, and receive back an immutable compiled contour plan. Advancing one assigned note takes the plan, the current contour state, the attack index and MIDI being assigned, and a reach function reflecting remaining leap budget, and returns the next contour state or undefined when the note cannot keep the contour completable. A separate pure check reports whether a full set of per-checkpoint candidate choices can satisfy the contour at all, without reference to a compiled plan or reach.

## EXPECTATION
A compiled contour plan for a phrase with all four checkpoints correctly classifies, for every checkpoint value, exactly the contour-progress tags from which the remaining checkpoints and open ending are still reachable within the supplied reach function. Advancing rejects a note the instant no remaining assignment of later checkpoints could satisfy the contour, and never rejects a note when a satisfying continuation still exists. A phrase missing one or more checkpoints is always impossible. The reach-oblivious feasibility check agrees with the compiled plan's completability whenever reach is unconstrained.
