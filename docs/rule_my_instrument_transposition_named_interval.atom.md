---
id: rule_my_instrument_transposition_named_interval
status: REVIEW
version: 0.3
priority: 1
human_name: My Instrument's Transposition Derives Its Interval Name
parents:
  - [[req_my_instrument]]
dependents:
  - [[entity_my_instrument]]
type: RULE
layer: BUSINESS
tags: [v3, release-v3.0, instrument-profile]
---

# My Instrument's Transposition Derives Its Interval Name

## INTENT
Let the player give My instrument any transposition by counting semitones, and show them which interval that is.

## THE RULE / LOGIC
From v3.0, My instrument's transposition is a number of octaves (from 0 up), a number of semitones (from 0 to 11) and one direction for the whole transposition, octaves included: lower, the same or higher, as a written note sounds lower than written, at the same pitch, or higher. It is "the same" exactly when octaves and semitones are both 0. The octaves have no bound of their own: the only bound is that both ends of the range still sound inside MIDI notes 0 to 127. The player enters it with one stepper that counts semitones across octaves ("14 lower" is 1 octave and 2 semitones lower), not with separate octave and semitone inputs, and never chooses it by interval name. The interval name is derived from the semitones by a fixed table and shown beside the stepper, already carrying the octaves: 0 unison (with octaves, one or more octaves), 1 minor second, 2 major second, 3 minor third, 4 major third, 5 perfect fourth, 6 augmented fourth, 7 perfect fifth, 8 minor sixth, 9 major sixth, 10 minor seventh, 11 major seventh. Each name fixes a number of letter-name steps (0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6 in the same order), and each octave adds 12 semitones and 7 steps: 1 octave and 2 semitones lower, as for the tenor saxophone, is a major ninth lower, 14 semitones and 8 steps. The tritone, 6 semitones, is always named an augmented fourth. The steps stay part of the instrument's data, as for the built-in profiles, and an exported MusicXML file states them, with the semitones, as the part's transposition; they decide no spelling in the app. My instrument's written part is spelled as the built-in profiles' is: the player chooses the key in written pitch, so the transposition never moves the written key, only the concert key the phrase is generated in; a written key with two spellings takes the one whose key signature has fewer sharps or flats, the sharp one when both have the same number, and written notes and chord symbols are spelled in that key. An instrument whose written notes sound 6 semitones higher writes concert C major as F♯ major, not G♭ major, though its interval is an augmented fourth.

## TECHNICAL INTERFACE
The transposition is entered as octaves, semitones and one direction, through one stepper counting semitones across octaves; the derived interval name is shown beside it and is never chosen.

## EXPECTATION
- The transposition is a number of octaves from 0 up, a number of semitones from 0 to 11 and one direction for the whole transposition, "the same" exactly when both counts are 0.
- One stepper counting semitones across octaves enters it; "14 lower" is 1 octave and 2 semitones lower.
- Every semitone count, with or without octaves, in either direction, derives its interval name and letter-name steps from the fixed table, and the name is shown.
- A 6-semitone transposition is named an augmented fourth.
- 1 octave and 2 semitones lower is a major ninth lower, 8 letter-name steps.
- The letter-name steps spell nothing in the app: written notes, the key signature and chord symbols follow the written key the player chose, spelled with fewer sharps or flats, sharps on a tie, as for the built-in profiles; with written notes sounding 6 semitones higher, concert C major is written in F♯ major, not G♭ major.
