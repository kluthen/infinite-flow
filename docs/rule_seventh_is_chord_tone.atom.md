---
id: rule_seventh_is_chord_tone
status: DRAFT
tags: [v3, release-v3.3, generation, melody, chords]
parents:
  - [[req_seventh_chords_level]]
layer: BUSINESS
version: 0.1
dependents: []
type: RULE
priority: 1
human_name: A Seventh Chord's Seventh Is a Chord Tone
---

# A Seventh Chord's Seventh Is a Chord Tone

## INTENT
Treat the seventh as the stable, wanted note it is in the styles that use seventh chords.

## THE RULE / LOGIC
When a harmony event takes its seventh form, its seventh is a chord tone everywhere inside the phrase: in the order the pitch search tries notes (chord tones first), as the chord tone a figure resolves onto, in a recognized run, in Arpeggio chaos's ordering of chord tones, as the landing of Tension's scheduled figure, and in the ranks a Jam's doodle orders. The check of the result accepts exactly that. A four-note chord leaves three of the seven scale notes outside it, so decorating notes have fewer places, and between the seventh and the root, one scale step apart, no passing tone or neighbor tone fits. Over a harmony event in its triad form the chord tones are the triad's three notes. Phrase endings and the join between phrases are the exception: they read each chord as its triad (rule_open_phrase_ending, rule_join_reads_carried_chord_as_triad).

## TECHNICAL INTERFACE
Inside a phrase, the chord tones of a seventh-form event are its four notes.

## EXPECTATION
- In a seventh-form event, the seventh is tried and accepted as a chord tone by the search order, the figure targets, runs, Arpeggio chaos, Tension's scheduled figure and a Jam's ranks.
- In a triad-form event, the chord tones are the triad's three notes.
