---
id: rule_contrasting_part_voice_leading
status: REVIEW
tags: [v4, release-v4.0, session, audio, accompaniment]
parents:
  - [[req_contrasting_part]]
layer: BUSINESS
dependents: []
type: RULE
version: 0.1
priority: 1
human_name: The Contrasting Part Moves by the Nearest Note
---

# The Contrasting Part Moves by the Nearest Note

## INTENT
Make the counter-melody a smooth line that moves mostly by step or holds a shared note.

## THE RULE / LOGIC
The first note is the candidate nearest the centre of the lane; each next note is the candidate nearest the previous note, so the line moves mostly by step or holds a common tone. A candidate that would make parallel fifths or parallel octaves with the bass's move at that chord change is skipped when another candidate exists. Between two equally near candidates, the lower is taken. A note equal to the previous one is held: the two sound as one longer note.

## TECHNICAL INTERFACE
The choice reads the previous contrasting note and the bass's move at each chord change.

## EXPECTATION
- The first note is the candidate nearest the lane's centre; every later note is the candidate nearest the one before, the lower on a tie.
- No move makes parallel fifths or octaves with the bass unless no other candidate exists.
- A repeated note sounds as one held note.
