# Music Research Sources

Status: draft v0.1

## How To Use This Record

This is a retained research trail for later generator design and player documentation. The profile documents state the applicable rules in full; they remain self-contained and do not require a reader to follow these links. Sources are not implementation requirements and do not turn style conventions into universal musical laws.

## Phrase, Function, and Cadence

- **S1 - Phrase structure.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/PhraseSection.html
  - Useful for: treating four measures as one phrase with an intentional endpoint rather than four unrelated bars.
  - Applied in: neutral profile phrase construction and the open-ending policy.
- **S2 - Harmonic function.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/HarmonicFunction.html
  - Useful for: distinguishing tonic, predominant, and dominant roles in tonal major/minor plans.
  - Applied in: neutral profile harmonic motion.
- **S3 - Cadences.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/cadences.html
  - Useful for: describing a phrase as closed at tonic or open at dominant without treating either choice as objectively better.
  - Applied in: neutral profile endpoint rules and the open-ending policy.

## Melody, Tension, and Resolution

- **S4 - Non-chord-tone introduction.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/NonChordTonesIntroduction.html
  - Useful for: defining passing tones, neighbor tones, and the distinction between diatonic and chromatic embellishment.
  - Applied in: neutral tension rules and the neutral/jazz profile boundary.
- **S5 - Passing tones.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/PassingTones.html
  - Useful for: the stepwise approach-and-departure rule for passing notes, including chromatic examples.
  - Applied in: neutral pitch selection and jazz chromatic approach constraints.
- **S6 - Appoggiaturas.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/Appoggiatura.html
  - Useful for: a controlled high-tension neutral event: leap into an accented non-chord tone, then resolve by step.
  - Applied in: neutral profile high-tension candidate rule.
- **S7 - Rules of melody.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/RulesOfMelody.html
  - Useful for: conservative defaults for stepwise motion, accountable leaps, recovery after large intervals, and contour.
  - Applied in: neutral pitch and contour rules. Its common-practice focus means it is a default, not a universal restriction.

## Rhythm and Jazz Vocabulary

- **S8 - Open Music Theory, rhythmic essentials.** Open Music Theory: https://viva.pressbooks.pub/openmusictheory/chapter/other-rhythmic-essentials/
  - Useful for: syncopation as deliberate displacement against a stable pulse rather than unstructured density.
  - Applied in: neutral rhythm and space rules.
- **S9 - Jazz scales.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/JazzScales.html
  - Useful for: confirming that chromatic jazz vocabulary belongs to a distinct style layer.
  - Applied in: the decision to isolate jazz-only chromatic ornaments.
- **S10 - Standard chord progressions.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/StandardChordProgressions.html
  - Useful for: distinguishing melodic chromatic approaches from harmonic devices such as ii-V-I motion and tritone substitution.
  - Applied in: the jazz profile boundary that defers substitutions and altered dominants.

## Research Gaps

- These sources explain tonal and jazz conventions, not a universal quantitative tension scale.
- Wind-player breath policy still needs saxophone-specific sources or player testing. The initial tenor range is deliberately conservative and may later become player-configurable.
- Modal practice varies materially by tradition. The generator must not force tonal dominant behavior on every selected mode.

## Saxophone Range and Transposition

- **S11 - Modern saxophone mechanical ranges.** Yamaha saxophone model specifications:
  - Alto: https://usa.yamaha.com/products/musical_instruments/winds/saxophones/yas-62iii/specs.html
  - Tenor: https://usa.yamaha.com/products/musical_instruments/winds/saxophones/yts-62iii/specs.html
  - Soprano: https://usa.yamaha.com/products/musical_instruments/winds/saxophones/yss-875ex/specs.html
  - Baritone: https://usa.yamaha.com/products/musical_instruments/winds/saxophones/ybs-62_03/specs.html
  - Useful for: establishing the ordinary written `B-flat3` through `F-sharp6` baseline on modern instruments and documenting low-A baritone as a variant.
- **S12 - Saxophone transposition.** Yamaha Musical Instrument Guide: https://www.yamaha.com/en/musical_instrument_guide/saxophone/play/play003.html
  - Useful for: confirming B-flat soprano/tenor and E-flat alto/baritone sounding transposition.
  - Applied in: the requirement that generated events stay in concert pitch and written transposition remains display-only.
- **S13 - MIDI pitch-number convention.** Inspired Acoustics: https://www.inspiredacoustics.com/en/MIDI_note_numbers_and_center_frequencies
  - Useful for: recording MIDI note numbers as the canonical range boundary, avoiding device-specific octave-label differences.

For a phrase that must be mechanically playable by soprano, alto, tenor, and baritone without knowing which physical saxophone is active, the common non-altissimo concert interval is approximately `A-flat3` through `A4` (MIDI 56 through 69, where MIDI 60 is middle C). This shared interval is deliberately narrow. A wider two-octave range requires an active physical-instrument range policy separate from notation transposition.
