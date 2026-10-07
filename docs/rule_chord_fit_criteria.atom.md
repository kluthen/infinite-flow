---
id: rule_chord_fit_criteria
status: DRAFT
layer: BUSINESS
version: 0.2
priority: 1
tags: [v3, nice-to-have, dropped-in-v3, acknowledgement, midi, harmony]
type: RULE
human_name: Chord-Fit Criteria
parents:
  - [[req_chord_fit_acknowledgement]]
dependents: []
notes: Dropped by the v3 scope (2026-10-07, v3.0 spec ingestion): the approved v3 scope drops the end-of-measure chord-fit check, so this nice-to-have is no longer a candidate for any v3 release. Not deleted yet: the vision as it stands (STABLE) still names it as a v3 nice-to-have, so its retirement is proposed together with the vision revision in docs/release/v3.0-intent-change-set.md. No code or test links it.
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

Not committed scope: like the chord-fit acknowledgement it belongs to, this rule is part of a nice-to-have for v3, not of v2, recorded for when that acknowledgement is scheduled.

## TECHNICAL INTERFACE
The fit judgement takes a measure's played pitch classes, the chord at each onset, the phrase's scale and the next two played notes.

## EXPECTATION
- A measure fits exactly when it has at least one played note, at least one exact chord tone, and every other note in the scale or resolving by one semitone onto a chord tone within the next two played notes.
- Unresolved blue notes and in-scale-landing chromatic passing tones never make a measure fit.
