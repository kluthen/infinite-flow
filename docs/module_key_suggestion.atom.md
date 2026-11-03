---
id: module_key_suggestion
status: DRAFT
human_name: The Key and Mode Suggestion's Method
parents:
  - [[req_key_and_mode_suggestion]]
  - [[rule_doodle_outside_modes_told]]
  - [[rule_suggestion_candidates]]
  - [[rule_suggestion_ignores_restriction]]
  - [[rule_suggestion_named_in_players_family]]
  - [[rule_suggestion_same_doodle_same_answer]]
  - [[rule_suggestion_withheld]]
priority: 1
tags: [v3, release-v3.2, jam, key-and-mode-suggestion, determinism]
dependents: []
type: MODULE
layer: ARCHITECTURE
version: 0.1
---

# The Key and Mode Suggestion's Method

## INTENT
Compute, from a quantized doodle and Jam's key and mode, the one answer a Jam's review and Jam's Idle show about the key and mode the doodle sounds in, always the same for the same inputs.

## THE RULE / LOGIC
Pure functions inside Jam's code, run on the main thread, in whole numbers only: no floating-point operation and no transcendental function runs on the path. The input is the quantized doodle, after the very-short-note filter, in concert pitch, with lengths in ticks (sixteenths).

Scores. Each of the 84 pairs, a home note C to B with a mode Ionian to Locrian, gets a penalty in thousandths: the sum over the notes of the note's role penalty times its weight. The role penalties are the business shares as negative natural logarithms in thousandths: home note 1609, fifth 1802, third 1931, each of the other four notes of the mode 2141, a note outside it 5521. A note's weight is its length in ticks clamped to 2 to 6, times 1.5 when it starts on beat 1 or 3; the last note counts twice and the first one and a half times when it is the candidate's home note. Every factor of 1.5 is taken by doubling the scale, so every weight stays whole. The lower the penalty, the likelier the pair.

Candidates. The pair with the lowest penalty is the best; every pair whose penalty is within 693 thousandths of it (at least half its chance) is a candidate, at most three kept, ordered by penalty, then home note C to B, then mode Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian.

The draw. The seed is the project's 32-bit FNV-1a hash of the versioned domain string infinite-flow/key-suggestion/v1 and the quantized doodle's notes (start, length and concert pitch of each): the doodle alone, no session seed, no pseudorandom stream. Each kept candidate weighs an integer read from a table written once from e^(−gap/1000) for every gap of 0 to 693 thousandths from the best; the drawn candidate is the one the seed modulo the weights' total falls in, the candidates taken in their order.

The answer, judged in this order: nothing, when the doodle has fewer than 5 pitch classes, 6 notes or 2 beats of total sounding length; no fit, when the weighted length lying in the best pair's notes is under 80 % of the doodle's (5 × fitting < 4 × total); nothing, when Jam's key and mode are among the kept candidates, Major compared as Ionian and Minor as Aeolian; otherwise the drawn pair. No fit does not depend on Jam's key and mode, so it is the same in every review of that Jam. No key and mode restriction plays a part.

Naming. The drawn pair is computed in concert pitch and answered as Jam's settings would hold it: its home note in written pitch for the selected instrument, and its collection in the player's family: with Major or Minor as Jam's collection an Ionian answer is Major and an Aeolian one Minor; any other answer is its mode.

## TECHNICAL INTERFACE
src/jam/key-suggestion/, inside Jam's code (module_jam_code_boundary): key-suggestion.ts gives the answer from the quantized doodle (QuantizedDoodle, src/domain/doodle/quantized-doodle.ts), Jam's written tonal centre and collection and the selected instrument; key-suggestion-scores.ts the 84 penalties and the kept candidates; key-suggestion-draw.ts the seed, with fnv1a32 (src/domain/random/hash32.ts), the weight table and the draw; key-suggestion-names.ts the written home note and the family's collection. The answer is a closed union of three kinds: nothing; no fit; and suggested, holding the written tonal centre (a PitchClass, as GenerationControls.tonalCenter holds it) and the Collection that Use it would set. It is read by Jam's path to phrase 1 at the doodle's end, which keeps it with the session, by the review's doodle section and by the kept doodle at Jam's Idle. Not built yet; the function and type names are written in when built.

## EXPECTATION
- The research note's worked examples give its answers; each material threshold and the 80 % rule hold at their edges.
- Jam's key and mode among the kept candidates give nothing; Major and Ionian, Minor and Aeolian compare as the same.
- The same doodle, Jam key and mode and instrument always give the same answer, in Node and in every supported browser, with no floating-point operation on the path.
- A doodle transposed by a fifth gives the penalties and the kept candidates transposed by a fifth.
- No restriction changes the answer.
- Scoring 64 notes takes under a millisecond.
