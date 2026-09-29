---
id: rule_chord_fit_criteria
status: DRAFT
layer: BUSINESS
version: 0.1
priority: 1
tags: [v2, release-v2.3, acknowledgement, midi, harmony]
type: RULE
human_name: Chord-Fit Criteria
parents:
  - [[req_chord_fit_acknowledgement]]
dependents: []
---

# Chord-Fit Criteria

## INTENT
Define when an off-script measure fits the harmony.

## THE RULE / LOGIC
Matching is by pitch class, not exact pitch: octave does not matter here, because a note belongs to a chord in any octave. A measure fits when all of these hold:

- at least one note was played in it;
- at least one of those notes is an exact chord tone of the harmony sounding at its own onset;
- every other note is either in the phrase's own scale, or is a chromatic note that resolves, within the next two notes the player plays (possibly landing in the very next measure), onto a chord tone one semitone away; this covers a chromatic approach or enclosure figure, whether or not the current settings would let the generator itself write one.

As a deliberate simplification, "blue" notes that do not resolve onto a chord tone (for example a flatted third or fifth over a major chord) and bebop-style chromatic passing tones that land on an in-scale note rather than resolving onto a chord tone get no acknowledgement. The rule relies on the harmony staying inside one scale per phrase, as all current harmony does, so any chromatic note the generator itself writes already resolves this way.

## TECHNICAL INTERFACE
The fit judgement takes a measure's played pitch classes, the chord at each onset, the phrase's scale and the next two played notes.

## EXPECTATION
- A measure fits exactly when it has at least one played note, at least one exact chord tone, and every other note in the scale or resolving by one semitone onto a chord tone within the next two played notes.
- Unresolved blue notes and in-scale-landing chromatic passing tones never make a measure fit.
