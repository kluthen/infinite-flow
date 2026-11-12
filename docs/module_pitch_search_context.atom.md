---
id: module_pitch_search_context
status: REVIEW
priority: 1
tags: pitch,search-context
parents:
  - [[entity_pitch_candidate_domain]]
  - [[rule_extensions_never_chord_tones]]
  - [[rule_join_reads_carried_chord_as_triad]]
  - [[rule_seventh_is_chord_tone]]
dependents: []
human_name: Pitch Search Context
version: 0.4
type: MODULE
layer: ARCHITECTURE
---

# Pitch Search Context

## INTENT
Compile every static fact one pitch search needs from a bound planner input exactly once, so every search transition reads only this immutable snapshot instead of recomputing shared facts.

## THE RULE / LOGIC
From the bound input's rhythm and harmony, the module rebuilds chronological sounding attacks (tie-inclusive spans, each attack's absolute-beat harmony index and identity, and its checkpoint/beat-one/harmony-change/final flags) using the shared attack-timeline rebuild, then derives each bar's contour checkpoint attack index: its first fresh attack at tick 0 or 8, or, when a bar's anchors are only tie continuations, its first fresh attack at any tick; a bar with no fresh attack at all has no checkpoint, which leaves the contour plan impossible.

Each attack carries two chord facts about the harmony event sounding under it: its chord tones, the pitch classes of the chord as the phrase plays it (the triad's root, third and fifth, then the seventh when the event takes its seventh form), and its triad tones, the triad's three alone. Over a triad-form event the two are equal, so a phrase with no seventh-form event compiles exactly as before seventh chords existed. Everything inside the phrase reads the chord tones: the chord tones each candidate domain offers and the decorating notes it offers beside them (the collection's notes outside the chord tones, so a seventh chord leaves three), figure targets and the notes a free figure resolves onto, Arpeggio chaos's ordering of chord tones, the landing of Tension's scheduled figure, each note's chord-tone fact that runs are recognized from, and the rank a Jam's doodle orders within. The phrase's two ends read the triad tones, as the open phrase ending and the join require: the final attack's open endpoints, the first attack's landing after a tense carried pitch, and the tense endings a phrase generated with carry-in may end on.

It derives the collection's pitch classes, the canonical per-attack candidate domain for every attack, each checkpoint's distinct candidate MIDI values, and the final attack's allowed MIDI values: the open endpoints -- a triad tone of a degree-5 harmony under a tonal-gentle/active endpoint, collection degree 5 as a triad tone under a tonal-static endpoint, or a non-tonic triad tone under a modal endpoint, so never the final chord's seventh -- plus, only when the request carries a carry-in, the tense scale tones outside the final chord's triad (its seventh included) that the next phrase's first note could resolve onto the tonic triad. It records which debts the final note may still owe (none without carry-in) and a carried pitch that is a tense note for the first attack to resolve, by a step onto a triad tone of its chord. It resolves the selected policy's leapiness limits and compiles the whole-phrase contour plan from the checkpoint domains, the final allowed MIDI values, and a reach function bounded by those leapiness limits. The compiled context is immutable and never recomputed once compiled for one input.

## TECHNICAL INTERFACE
Callers supply one immutable bound planner input and receive one immutable compiled search context, plus a standalone open-endpoint check that takes one attack, one candidate MIDI value, and the collection's pitch classes, and reads the attack's triad tones. The module performs no search of its own. Each PitchAttack (src/domain/pitch/pitch-types.ts) holds the two chord facts: chordPitchClasses, the event's chordTones(event) (src/domain/harmony/harmony-types.ts), and triadPitchClasses, the event's triad; compileAttacks (src/domain/pitch/pitch-context.ts) sets both, and isOpenEndpointMidi reads triadPitchClasses. The module memoizes the facts it derives for one request (each rhythm/harmony pair's attacks and contour plans, and the free attacks' candidate domains) in a weak map keyed by the frozen request object, shared across the bindings and pairs searched under that one request and released with the request; unfrozen inputs are never shared. A free attack's domain key holds its chord tones, which list the triad first, so it determines both facts. A context built from the memo is identical to one built fresh, so no state is observable across calls.

## EXPECTATION
Compiling the same bound input twice yields two contexts with identical attacks, candidate domains, checkpoint indices and domains, contour plan, and open-endpoint MIDI values. A bar whose only anchors are tie continuations still resolves to a checkpoint at its first fresh attack rather than having none, and a bar with no fresh attack at all has no checkpoint, leaving the compiled contour plan impossible. Over a triad-form event an attack's chord tones and triad tones are equal and the compiled context is the one compiled before seventh chords existed. Over a seventh-form event the attack's chord tones hold four pitch classes and its triad tones three; the final attack's open endpoints never include the final chord's seventh, and with carry-in its tense endings may.
