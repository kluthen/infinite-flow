---
id: module_pitch_search_transition
status: REVIEW
human_name: Pitch Search Transition
type: MODULE
layer: ARCHITECTURE
version: 0.4
tags: pitch,search-transition
parents:
  - [[entity_pitch_candidate_domain]]
  - [[rule_join_reads_carried_chord_as_triad]]
  - [[rule_seventh_is_chord_tone]]
priority: 1
dependents: []
---

# Pitch Search Transition

## INTENT
Evaluate one proposed pitch candidate against a search state and the full selected melodic policy in one shared transition, producing either the accepted next state or a typed rejection reason, without ever rescanning the assignment prefix.

## THE RULE / LOGIC
The search starts from the first-release empty state, or, when the bound request carries a carry-in, from a motion state whose prior note is the carried pitch, with a chain of skips or leaps arriving at it still open and any recovery it owes due on the first attack; the carried pitch never prepares a non-chord tone of the new phrase. The transition resolves the proposed candidate to its canonical domain-member entry at the next unassigned attack by stable identity and MIDI, rejecting anything outside that attack's compiled candidate domain; a search run resolves this lookup through a per-run lazily built identity index rather than rescanning the domain on every call. A proposed candidate may come with a favored entry, when the search tries it first as a drawn figure (module_favored_figure_draw): the transition then rejects it with favored_figure_not_named when the candidate does not name that figure, and with favored_hold_mismatch when the entry holds a figure path's member to a resolution or leaves a free diatonic tone unheld; an accepted favored free tone goes through the figure step with the entry's hold as its one allowed resolution, as a free tone the levels allow only one resolution does. It derives the candidate's chord-tone and collection-membership facts, the chord-tone fact read against the attack's chord tones (the seventh included when the event takes its seventh form) and, on the final attack, against the final chord's triad. It rejects a final-attack candidate (open_endpoint_violation) unless its MIDI is one of the context's precompiled final-attack values and the candidate itself may end the phrase, as an open endpoint or as a tense ending, so the final chord's seventh, offered there both as a chord tone and as a tense ending, never passes as a chord tone on its tense ending's MIDI value; rejects a first-attack candidate that fails to resolve a tense carried pitch by a step onto a triad tone of its chord (carried_tension_unresolved); rejects a first-attack candidate that repays a recovery the carried pitch owes on its chord's seventh, a chord tone outside the triad (carried_recovery_on_seventh), any other note 1 to 4 semitones back still repaying it; then composes the figure, motion, and contour reducers for that one candidate in order -- a rejection from any of the three rejects the whole transition -- and, once the final attack is accepted, checks that every whole-phrase obligation is already settled (figure closed, leap-recovery settled, contour complete), rejecting an otherwise-accepted final candidate that leaves any of them open. A phrase generated with carry-in may instead leave open exactly a tense final note or a large leap's recovery, when the next phrase's first note can settle it inside the window. An accepted transition's next state always advances exactly one attack past the state it was given. Candidates are ranked by their distance from the pitch sounding before them, which for the first attack is the carried pitch when there is one, and a favored entry ranks as the search orders it. The module's own published transition freezes its result and computes the candidate's ranking facts; the search's internal step transition skips both, since the search only reads the transition's kind and next state and never exposes or mutates either.

## TECHNICAL INTERFACE
Callers supply a compiled search context, a search state, and one proposed pitch candidate, with an optional favored entry (FavoredEntry, src/domain/pitch/pitch-types.ts), plus for the internal step a domain-member lookup, and receive either an accepted result carrying the next state (and, for the published transition, ranking facts) or a rejected result carrying one typed reason: advance(context, state, proposed, favored?) and advanceSearchStep(context, state, proposed, member, favored?) in src/domain/pitch/pitch-advance.ts. noteFacts(context, attack, midi) in the same file gives a note's chord-tone and collection facts, reading the attack's chordPitchClasses, or its triadPitchClasses on the final attack; the final check calls mayEndPhrase (src/domain/pitch/pitch-context.ts, module_pitch_search_context) on the candidate. The module also exposes the search's initial pre-first-attack state, a lazily-indexed domain-member lookup builder, and a state's exact memo key covering every field that can influence the remainder of the search, a favored tone's hold included.

## EXPECTATION
The same context, state, and proposed candidate always produce the same accepted-or-rejected transition and, on acceptance, the same next state. A transition never mutates the state or context it was given, and the internal search step's next state is exactly reproducible by the published transition given the same domain-member resolution. Over triad-form events every transition is the one made before seventh chords existed; over a seventh-form final event the seventh is accepted only as a tense ending of a phrase generated with carry-in.
