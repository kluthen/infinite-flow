---
id: module_favored_figure_draw
status: DRAFT
version: 0.1
priority: 1
dependents: []
human_name: The Favored Figure Draw
type: MODULE
layer: ARCHITECTURE
tags: [v3, release-v3.1, generation, figures, pitch]
parents:
  - [[module_figure_levels]]
  - [[rule_figure_draws_reproducible]]
  - [[rule_figure_level_never_a_quota]]
  - [[rule_figure_level_orders_search]]
---

# The Favored Figure Draw

## INTENT
Decide, the same way in every browser, at which notes a Favored or Strongly favored figure is tried before the chord tones, and put the candidates that start it first in the pitch search's order, leaving the order of a phrase whose levels are all Off or As today exactly as before the levels existed.

## THE RULE / LOGIC
The draw. Whether a figure is drawn at a note is a function of the phrase's seed, the note's identity (its position in the phrase), the figure's id and its level, and of nothing else: not of the search's progress, the harmony or rhythm candidate being searched, or any other stage's choices. It is computed only at Favored and Strongly favored; at Off and As today no draw is made. Like every seeded key of generation, it is the project's FNV-1a 32-bit hash of the seed, the note's identity and the figure id, and the figure is drawn when that hash falls under the level's share. Each share is a numerator over a power of two, about 1 in 4 for Favored and 1 in 2 for Strongly favored as starting values, tuned before v3.1 ships, with Strongly favored's share never below Favored's. The draw uses whole-number operations only (32-bit multiplication, unsigned shifts and a mask) and no floating point, so every browser on every machine draws the same notes.

The candidate's figure. Each pitch candidate names the free figure it starts, if it starts one, and the ranking reads that name: the first note of a chromatic approach names the chromatic approach, the first note of a chromatic enclosure the chromatic enclosure. A chord tone, a later note of a figure, a note of Tension's scheduled figure and the tense note a joined phrase may end on start no free figure, so no draw moves them.

The order. At each note, a candidate that starts a drawn figure is tried before every candidate that starts none, the chord tones included. Among candidates that start drawn figures, the one whose figure has the higher level goes first, then the usual order: the seeded pitch tie key, then MIDI, then enumeration index. Every other candidate keeps the order it had before the levels existed, so a phrase whose levels are all Off or As today is searched in exactly that order and reproduces note for note.

Never a quota. A candidate that starts a drawn figure and leads to a dead end is backed out of like any other, and the next candidate is tried; nothing rejects or retries a phrase for lacking a drawn figure. The draw changes only the order of the candidates, never which candidates exist, so the candidate domains and their memo stay as they are.

## TECHNICAL INTERFACE
src/domain/pitch/figure-draw.ts exports isFigureDrawn(seed, noteIdentity, figureId, level) and the two shares, FAVORED_SHARE and STRONGLY_FAVORED_SHARE, hashing with fnv1a32 from src/domain/random/hash32.ts; figureId and level are the ids of src/domain/figures/figure-levels.ts. The pitch ranking (pitchRank and orderCandidates, src/domain/pitch/pitch-ranking.ts) reads each candidate's named figure and the request's figure levels, which the pitch policy carries; the candidates are built, each naming the figure it starts, in src/domain/pitch/pitch-candidates.ts. Not built yet.

## EXPECTATION
- The same seed, note identity, figure and level always give the same draw, in Chrome and Edge, on any machine; golden draws for a fixed list of seeds pin it.
- The draw holds no floating-point operation.
- At Off and As today no draw is computed: with Neutral's and Jazz's levels, or any levels all Off or As today, the search order is the one used before the levels existed, and the replay-key corpora and the cold-generation goldens are unchanged.
- At a note where a figure is drawn, a candidate that starts it is tried before every candidate that starts no drawn figure, chord tones included; where several are drawn, the higher level first.
- A chord tone, a later note of a figure, Tension's scheduled figure and the tense note a joined phrase may end on are never moved by a draw.
- No phrase is rejected or retried for lacking a drawn figure.
