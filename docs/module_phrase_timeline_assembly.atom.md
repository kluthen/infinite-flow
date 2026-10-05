---
id: module_phrase_timeline_assembly
status: REVIEW
type: MODULE
layer: ARCHITECTURE
priority: 1
version: 0.1
tags: generation
parents:
  - [[entity_concert_event_timeline]]
dependents: []
human_name: Phrase Timeline Assembly
---

# Phrase Timeline Assembly

## INTENT
Assemble one resolved generation request, a chosen rhythm candidate, and a flat list of synthesized attack MIDI pitches into the final immutable GenerationResult, without attaching any annotation or performing any planning of its own.

## THE RULE / LOGIC
Walking the chosen rhythm candidate's bars and events in order, each rest becomes a rest event of the same duration; each fresh (non-tie-continuation) note event consumes the next unconsumed value from the flat attack-pitch list in order and becomes a note event at that pitch; each tie-continuation note event repeats the most recently consumed attack's pitch without consuming a new value from the list. Assembly rejects up front, as a typed failure, an attack-pitch list whose length does not exactly equal the rhythm candidate's count of fresh note attacks, and separately rejects a tie continuation that has no preceding attack to repeat, rather than guessing a pitch or silently truncating either input.

## TECHNICAL INTERFACE
Callers supply one resolved GenerationRequest, one chosen RhythmCandidate, and a flat list of attack MIDI pitches in chronological fresh-attack order, and receive the assembled immutable GenerationResult carrying the request's identity and seed. A length mismatch between the attack-pitch list and the rhythm's fresh-attack count, or a tie continuation with no preceding attack, throws a typed PhraseAssemblyError instead of returning a result.

## EXPECTATION
The assembled result's timeline has exactly one measure per rhythm bar, with every event's kind, duration, and tie-continuation flag mirroring the source rhythm bar exactly, and every fresh note's pitch equal to the corresponding value from the attack-pitch list in consumption order. Every tie continuation's pitch exactly repeats its preceding attack's pitch. A mismatched attack-pitch count or a tie continuation with no preceding attack always throws rather than producing a partial or guessed result.
