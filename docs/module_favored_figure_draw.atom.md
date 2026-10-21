---
id: module_favored_figure_draw
status: STABLE
version: 0.4
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
Decide, the same way in every browser, at which notes a Favored or Strongly favored figure is tried before the chord tones, and try the candidates that may start it first, as that figure, leaving the order of a phrase whose levels are all Off or As today exactly as before the levels existed.

## THE RULE / LOGIC
The draw. Whether a figure is drawn at a note is a function of the phrase's seed, the note's identity (its position in the phrase, as its bar and onset), the figure's id and its level, and of nothing else: not of the search's progress, the harmony or rhythm candidate being searched, or any other stage's choices. It is computed only at Favored and Strongly favored; at Off and As today no draw is made, and no draw is made at a note where a figure already under way fixes the next pitch. It is the project's FNV-1a 32-bit hash of the draw's own versioned hash domain string, `infinite-flow/figure-draw/v1`, the seed, the note's identity and the figure id, joined by `|`, and the figure is drawn when the hash's top 16 bits, read as a whole number, fall under the level's share. Each share is a numerator over 2^16, with Strongly favored's share never below Favored's: at present 0x4000 (1 in 4) for Favored and 0x8000 (1 in 2) for Strongly favored, starting values that may be tuned before v3.1 ships. The draw uses whole-number operations only (32-bit multiplication, unsigned shifts and a mask) and no floating point, so every browser on every machine draws the same notes.

The figures a candidate names. Each pitch candidate names the free figures it may start, among those the levels allow, and the ordering reads them; they are not part of the candidate's identity. A free diatonic tone names the passing tone (the accented passing tone when it starts on beat 1 or 3) and the neighbor tone, since only the next note's resolution decides which of them it becomes. The first note of a free figure path names that figure: a free appoggiatura, a diatonic enclosure, a chromatic approach or a chromatic enclosure. A chord tone, a later note of a figure, a note of Tension's scheduled figure and the tense note a joined phrase may end on name none, so no draw moves them.

The order. At a note where a figure is drawn, each candidate that may start it is tried first as that figure, before the chord tones: a free diatonic tone held to that figure's resolution, the same hold that applies when the levels allow the tone only one resolution (a drawn passing tone goes on by step in the same direction, a drawn neighbor tone steps back), and a figure path's first note as its path already holds it. Where several figures are drawn at one note, these first entries go higher level first, then by a seeded tie key over the candidate and the figure, so a free diatonic tone whose two figures are both drawn has one held entry for each. A free diatonic tone tried first is tried again in its usual place after the chord tones, unheld, so favoring a figure never takes away a phrase the search would otherwise find; a figure path's first note simply moves ahead. Every other candidate keeps the order it had before the levels existed, so a phrase whose levels are all Off or As today is searched in exactly that order and reproduces note for note.

Never a quota. A first entry that leads to a dead end is backed out of like any other candidate, and the next one is tried; nothing rejects or retries a phrase for lacking a drawn figure. A held entry's dead end never makes the search skip the same tone tried later unheld. The draw changes only the order in which candidates are tried, and may try a free diatonic tone twice, held and then unheld; it never adds a candidate to a domain or removes one, so the candidate domains and their memo stay as they are: the draw depends only on the seed and the note, and the figures a candidate names follow from its note and the free-figure allowance the domains already depend on.

## TECHNICAL INTERFACE
src/domain/pitch/figure-draw.ts exports isFigureDrawn(seed, noteIdentity, figureId, level), the hash domain FIGURE_DRAW_DOMAIN, FIGURE_DRAW_SHARE_BITS (16), the two shares, FAVORED_SHARE (0x4000) and STRONGLY_FAVORED_SHARE (0x8000), and isFavoredLevel, hashing `${FIGURE_DRAW_DOMAIN}|${seed}|${noteIdentity}|${figureId}` with fnv1a32 from src/domain/random/hash32.ts and drawing when `((hash >>> 16) & 0xffff) < share`; figureId and level are the ids of src/domain/figures/figure-levels.ts, and the note identity is the attack's identity (`bar:tick`). The figures a candidate names are PitchCandidate.figures (src/domain/pitch/pitch-types.ts), in figure-id order, outside its identity, filled where the candidates are built (src/domain/pitch/pitch-candidates.ts). orderCandidates (src/domain/pitch/pitch-ranking.ts) takes the request's figure levels, which the pitch policy carries, and returns PitchSearchEntry values, each a candidate with an optional FavoredEntry (the figure, its level and, for a free diatonic tone, the hold); the pitch search (searchPitchPlan, src/domain/pitch/pitch-search.ts) passes the levels only where no figure path is under way, and tries each entry through the search transition with its favored entry. pitchRank ranks a favored entry first, Strongly favored before Favored; the ranking facts the search transition publishes (src/domain/pitch/pitch-advance.ts) rank the same way.

## EXPECTATION
- The same seed, note identity, figure and level always give the same draw, in Chrome, on any machine; golden draws for a fixed list of seeds pin it.
- The draw holds no floating-point operation.
- At Off and As today no draw is computed: with Neutral's and Jazz's levels, or any levels all Off or As today, the search order is the one used before the levels existed, and the replay-key corpora and the cold-generation goldens are unchanged.
- At a note where a figure is drawn, a candidate that may start it is tried as that figure before every chord tone; where several are drawn, the higher level first.
- At a note where the passing tone is drawn and the neighbor tone is not, a free tone tried before the chord tones is written only as a passing tone, and the same tone is still found as a neighbor tone after the chord tones; likewise for the neighbor tone and the accented passing tone.
- A chord tone, a later note of a figure, Tension's scheduled figure and the tense note a joined phrase may end on are never moved by a draw.
- No phrase is rejected or retried for lacking a drawn figure.
