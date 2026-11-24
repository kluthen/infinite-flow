---
id: rule_responding_part_target
status: DRAFT
priority: 1
human_name: A Fill Leads Into the Lead's Next Note
parents:
  - [[req_responding_part]]
type: RULE
layer: BUSINESS
version: 0.2
tags: [v4, release-v4.0, session, audio, accompaniment]
dependents: []
---

# A Fill Leads Into the Lead's Next Note

## INTENT
Make each fill lead the ear to the lead's entry.

## THE RULE / LOGIC
A fill's last note, its target, is a tone of the chord sounding at that note's start: the tone of that chord nearest the lead's next note without being that note, the lower one when two are equally near, so the fill leads into the lead's entry. A rest that ends the phrase has no next lead note in the phrase: its fill targets that chord's root nearest the centre of the lead's register window.

## TECHNICAL INTERFACE
The target is read from the lead's next note and from the phrase's harmony event holding the target note's start.

## EXPECTATION
- A fill's last note is a tone of the chord sounding at that note's start, the one nearest the lead's next note, never equal to it, the lower on a tie.
- A fill in a rest that ends the phrase ends on the root of the chord sounding at its last note's start, the one nearest the window's centre.
