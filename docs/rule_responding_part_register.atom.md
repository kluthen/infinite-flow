---
id: rule_responding_part_register
status: REVIEW
type: RULE
layer: BUSINESS
priority: 1
version: 0.2
human_name: A Fill Stays Inside the Lead's Window
tags: [v4, release-v4.0, session, audio, accompaniment]
parents:
  - [[req_responding_part]]
dependents: []
---

# A Fill Stays Inside the Lead's Window

## INTENT
Keep each answer in the lead's own register, where it sounds like a reply.

## THE RULE / LOGIC
Every fill note lies inside the lead's register window. Only the notes the fill plays count: a fill shorter than four notes is held to the window by its own notes, not by the rest of its shape. When any of those notes would leave the window, the whole shape is built the other way from the target: a rising arpeggio becomes a falling arpeggio, a rising scale a falling scale, and the falling ones rising. The turn keeps its own rule: a step that would leave the window is taken on the target's other side. When the reversed shape leaves the window too, the drawn shape is built note by note back from the target, each note going the other way, and carrying on that way, where it would leave the window, so the fill may zigzag. When no note can be placed even so, the fill is empty.

## TECHNICAL INTERFACE
The window is the phrase's resolved register window; only the notes the fill plays are checked against it.

## EXPECTATION
- No fill note is outside the lead's register window.
- A rising or falling fill whose notes would leave the window plays the same kind of shape the other way from its target when that fits inside the window.
- A rising or falling fill is built note by note only when its shape fits the window in neither direction, and is empty only when that fails too.
- A turn's step that would leave the window is taken on the target's other side, and the turn is empty only when that step leaves the window on both sides.
