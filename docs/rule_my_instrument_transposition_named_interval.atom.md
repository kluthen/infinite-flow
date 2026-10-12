---
id: rule_my_instrument_transposition_named_interval
status: DRAFT
version: 0.2
priority: 1
human_name: My Instrument's Transposition Derives Its Interval Name
parents:
  - [[req_my_instrument]]
dependents:
  - [[entity_my_instrument]]
type: RULE
layer: BUSINESS
tags: [v3, release-v3.0, instrument-profile]
notes: Revised 2026-10-11 to version 0.2 (still DRAFT) at the v3.0 chunk 16 architecture capture, applying the owner rulings D253 and D257: the transposition is entered as octaves, semitones and one direction for the whole transposition, with one stepper counting semitones across octaves, never chosen by interval name; the name and letter-name steps are derived from the fixed table and shown. The id keeps its original wording so links stay valid. Earlier: created 2026-10-07 at DRAFT by the re-sync to the v3.0 master spec v1.3, approved by the product owner. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls within the vision since version 0.8 (2026-10-08, spec D246).
---

# My Instrument's Transposition Derives Its Interval Name

## INTENT
Spell My instrument's written part correctly, whatever transposition the player gives it.

## THE RULE / LOGIC
From v3.0, My instrument's transposition is a number of octaves (from 0 up), a number of semitones (from 0 to 11) and one direction for the whole transposition, octaves included: lower, the same or higher, as a written note sounds lower than written, at the same pitch, or higher. It is "the same" exactly when octaves and semitones are both 0. The octaves have no bound of their own: the only bound is that both ends of the range still sound inside MIDI notes 0 to 127. The player enters it with one stepper that counts semitones across octaves ("14 lower" is 1 octave and 2 semitones lower), not with separate octave and semitone inputs, and never chooses it by interval name. The interval name is derived from the semitones by a fixed table and shown beside the stepper, already carrying the octaves: 0 unison (with octaves, one or more octaves), 1 minor second, 2 major second, 3 minor third, 4 major third, 5 perfect fourth, 6 augmented fourth, 7 perfect fifth, 8 minor sixth, 9 major sixth, 10 minor seventh, 11 major seventh. Each name fixes a number of letter-name steps (0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6 in the same order), and each octave adds 12 semitones and 7 steps: 1 octave and 2 semitones lower, as for the tenor saxophone, is a major ninth lower, 14 semitones and 8 steps. Those steps are how notes, the key signature and chord symbols are spelled in written pitch, exactly as for the built-in profiles. The tritone, 6 semitones, is always spelled as an augmented fourth.

## TECHNICAL INTERFACE
The transposition is entered as octaves, semitones and one direction, through one stepper counting semitones across octaves; the derived interval name is shown beside it and is never chosen.

## EXPECTATION
- The transposition is a number of octaves from 0 up, a number of semitones from 0 to 11 and one direction for the whole transposition, "the same" exactly when both counts are 0.
- One stepper counting semitones across octaves enters it; "14 lower" is 1 octave and 2 semitones lower.
- Every semitone count, with or without octaves, in either direction, derives its interval name and letter-name steps from the fixed table, and the name is shown.
- Written notes, the key signature and chord symbols are spelled by the derived letter-name steps, as for the built-in profiles.
- A 6-semitone transposition is spelled as an augmented fourth.
- 1 octave and 2 semitones lower is a major ninth lower, 8 letter-name steps.
