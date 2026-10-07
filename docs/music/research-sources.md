# Music Research Sources

Status: draft v0.3 (v3 research sources S18-S99 and S100-S115 merged 2026-10-07)

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
  - Useful for: simple-meter hierarchy and syncopation as weak-position attack or sustain across a stronger position, rather than unstructured density.
  - Applied in: rhythm-grid, displacement, tie, and metrical-anchor policy.
- **S8a - Open Music Theory, notation and simple meter.** Open Music Theory: https://viva.pressbooks.pub/openmusictheory/chapter/notating-rhythm/ and https://viva.pressbooks.pub/openmusictheory/chapter/simple-meter-and-time-signatures/
  - Useful for: notes/rests partitioning measured time, ties sustaining without reattack, and quarter/eighth/sixteenth division in simple meter.
  - Applied in: exact integer-tick representation and tie semantics. The project's quantitative grids/budgets remain implementation inference.
- **S9 - Jazz scales.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/JazzScales.html
  - Useful for: confirming that chromatic jazz vocabulary belongs to a distinct style layer.
  - Applied in: the decision to isolate jazz-only chromatic ornaments.
- **S10 - Standard chord progressions.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/StandardChordProgressions.html
  - Useful for: distinguishing melodic chromatic approaches from harmonic devices such as ii-V-I motion and tritone substitution.
  - Applied in: the jazz profile boundary that defers substitutions and altered dominants.

## Research Gaps

- These sources explain tonal and jazz conventions, not a universal quantitative tension scale.
- Wind-player breath comfort still requires player testing. The adopted tenor and alto ranges are conservative product profiles; any future widening or player-selectable variant is separate scope.
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

Historical note: the cross-saxophone `56-69` shared interval was considered before first-release instrument profiles were adopted. It is not current generator policy. First release instead receives one explicit validated profile: keyboard `48-72`, tenor `46-70`, or alto `51-75`, with the windows in [Saxophone Profile Ranges](saxophone-profile-ranges.md).

## Lexicon References

These sources back the [Music Lexicon](lexicon.md). They are reference only: every lexicon definition is written in the project's own words, and no text is copied or closely paraphrased from them.

- **S14 - Open Music Theory, version 2, glossary.** Mark Gotham et al., VIVA Pressbooks (2023), CC BY-SA: https://viva.pressbooks.pub/openmusictheory/back-matter/glossary/
  - Useful for: the primary fact-check of term meanings across fundamentals, harmony, form and jazz vocabulary.
  - Applied in: most lexicon entries, as the verification source. Reference only; no text copied.
- **S15 - Sound Reasoning, glossary.** Anna Brandt and Brian McClure, LibreTexts: https://human.libretexts.org/Bookshelves/Music/Music_Theory/Sound_Reasoning_(Brandt_and_McClure)/zz:_Back_Matter/20:_Glossary
  - Useful for: cross-checking that beginner-level definitions (beat, meter, register, tempo and similar) are pitched at the right level.
  - Applied in: basic lexicon entries. Reference only; no text copied.
- **S16 - Transposing instrument.** Wikipedia: https://en.wikipedia.org/wiki/Transposing_instrument
  - Useful for: the definition of transposing instruments, their naming by the concert pitch of a written C, and the B-flat and E-flat saxophone intervals.
  - Applied in: the lexicon's instruments and transposition entries. Reference only; no text copied.
- **S17 - Concert pitch.** Wikipedia: https://en.wikipedia.org/wiki/Concert_pitch
  - Useful for: distinguishing sounding (concert) pitch from written pitch, and from the separate tuning-standard meaning of the term.
  - Applied in: the lexicon's concert pitch and written pitch entries. Reference only; no text copied.

## Embellishments (v3)

These back the [embellishment catalogue](embellishment-catalogue.md), research for the v3 embellishment flags, and its lexicon entries. S34-S39 (Wikipedia) were used only to cross-check names and history; each claim they support is also standard textbook knowledge. Reference only; no text copied.

- **S18 - Neighbor tones.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/NeighborTones.html
  - Useful for: upper and lower neighbor definitions and their step-away, step-back shape.
  - Applied in: [embellishment catalogue](embellishment-catalogue.md) (entries 4 and 5).
- **S19 - Escape tone.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/EscapeTone.html
  - Useful for: the step-in, leap-out-opposite shape and its cadential use.
  - Applied in: [embellishment catalogue](embellishment-catalogue.md) (entry 8, escape-tone lexicon entry).
- **S20 - Double neighbor.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/DoubleNeighbor.html
  - Useful for: the upper-and-lower neighbor group around one main note.
  - Applied in: [embellishment catalogue](embellishment-catalogue.md) (entries 6 and 16, double-neighbor lexicon entry).
- **S21 - Anticipation.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/Anticipation.html
  - Useful for: a next-chord note sounding early, at cadences and through syncopation.
  - Applied in: [embellishment catalogue](embellishment-catalogue.md) (entry 9, rhythm interactions, anticipation lexicon entry).
- **S22 - Suspension.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/Suspension.html
  - Useful for: preparation, accented suspension and stepwise downward resolution; optional tie.
  - Applied in: [embellishment catalogue](embellishment-catalogue.md) (entry 10, suspension lexicon entry).
- **S23 - Retardation.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/Retardation.html
  - Useful for: the upward-resolving counterpart of the suspension.
  - Applied in: [embellishment catalogue](embellishment-catalogue.md) (entry 11, retardation lexicon entry).
- **S24 - Incomplete neighbor.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/IncompleteNeighbor.html
  - Useful for: the catch-all label for neighbor figures missing one side, and its note on incomplete double neighbors in jazz.
  - Applied in: [embellishment catalogue](embellishment-catalogue.md) (entry 8 aliases).
- **S25 - Embellishing tones.** John Peterson, Open Music Theory, version 2, VIVA Pressbooks, CC BY-SA: https://viva.pressbooks.pub/openmusictheory/chapter/embellishing-tones/ (mirror read for this research: https://human.libretexts.org/Bookshelves/Music/Music_Theory/Open_Music_Theory_2e_(Gotham_et_al.)/04%3A_Diatonic_Harmony_Tonicization_and_Modulation/4.04%3A_Embellishing_Tones)
  - Useful for: one table of approach, departure and metric placement for passing, neighbor, appoggiatura, escape, suspension, retardation and anticipation; usual downward direction of appoggiaturas and escape tones.
  - Applied in: [embellishment catalogue](embellishment-catalogue.md) (most family-1 entries and lexicon entries).
- **S26 - Passing notes and target notes.** The Jazz Piano Site: https://www.thejazzpianosite.com/jazz-piano-lessons/jazz-improvisation/passing-notes/
  - Useful for: diatonic and chromatic passing notes leading to a chord-tone target, and the D-flat, B, C enclosure example.
  - Applied in: [embellishment catalogue](embellishment-catalogue.md) (entries 3, 12, 13, 15, 17).
- **S27 - Octave displacement and pivot arpeggios.** The Jazz Piano Site: https://www.thejazzpianosite.com/jazz-piano-lessons/jazz-improvisation/octave-displacement-pivot-arpeggios/
  - Useful for: displacing a note by an octave and continuing there; offbeat placement and jumping against the line's direction; the term "pivoting".
  - Applied in: [embellishment catalogue](embellishment-catalogue.md) (entry 22, octave-displacement lexicon entry).
- **S28 - The concept of target notes for jazz improvisation.** Teerus Laohverapanich, Mahidol Music Journal 7(1), 2024: https://so04.tci-thaijo.org/index.php/mmj/article/view/270580
  - Useful for: target notes reached by chord tones, chromatic approach and enclosure, shown in the playing of four jazz saxophonists including Charlie Parker.
  - Applied in: [embellishment catalogue](embellishment-catalogue.md) (entries 12, 13, 15, 17). Read at abstract level only.
- **S29 - MusicXML 4.0 ornaments and mordent.** W3C Music Notation Community Group: https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/ornaments/ and https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/mordent/
  - Useful for: the export vocabulary for trills, turns and mordents, and the warning that MusicXML and SMuFL disagree on which mordent is "inverted".
  - Applied in: [embellishment catalogue](embellishment-catalogue.md) (entries 24–26, O47 discussion).
- **S30 - MusicXML 4.0 grace.** W3C Music Notation Community Group: https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/grace/
  - Useful for: grace notes as notes without notated duration, slashed (acciaccatura) or not, with time stolen from the previous or following note.
  - Applied in: [embellishment catalogue](embellishment-catalogue.md) (entry 23, O47 discussion).
- **S31 - MusicXML 4.0 articulations.** W3C Music Notation Community Group: https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/articulations/
  - Useful for: `scoop`, `plop`, `doit` and `falloff` as export elements.
  - Applied in: [embellishment catalogue](embellishment-catalogue.md) (entries 27–29, O47 discussion).
- **S32 - ABC notation standard 2.1.** abcnotation.com: https://abcnotation.com/wiki/abc:standard:v2.1
  - Useful for: the example syntax; grace notes in braces with `/` for acciaccatura; decorations `!trill!`, `!uppermordent!`, `!lowermordent!`, `!turn!`, `!slide!` and the roll `~`.
  - Applied in: [embellishment catalogue](embellishment-catalogue.md) (examples, entries 26 and 31).
- **S33 - Jazz articulations.** Steinberg, Dorico 2 operation manual: https://archive.steinberg.help/dorico/v2/en/dorico/topics/notation_reference/notation_reference_jazz_articulations_c.html
  - Useful for: plop and scoop before the note, doit and fall after it; their bend and smooth forms; that they change pitch rather than length or attack.
  - Applied in: [embellishment catalogue](embellishment-catalogue.md) (entries 25, 27–31, jazz-articulation lexicon entries).
- **S34 - Mordent.** Wikipedia: https://en.wikipedia.org/wiki/Mordent
  - Useful for: upper and lower forms, their signs, and the historical swap of the names.
  - Applied in: [embellishment catalogue](embellishment-catalogue.md) (entry 24, mordent and ornament lexicon entries).
- **S35 - Trill.** Wikipedia: https://en.wikipedia.org/wiki/Trill_(music)
  - Useful for: trill interval, start on the upper note (baroque) or main note (later), the closing dip.
  - Applied in: [embellishment catalogue](embellishment-catalogue.md) (entry 25, trill lexicon entry).
- **S36 - Turn.** Wikipedia: https://en.wikipedia.org/wiki/Turn_(music)
  - Useful for: the four-note order, delayed and inverted turns.
  - Applied in: [embellishment catalogue](embellishment-catalogue.md) (entry 26, turn lexicon entry).
- **S37 - Grace note.** Wikipedia: https://en.wikipedia.org/wiki/Grace_note
  - Useful for: acciaccatura versus appoggiatura as small notes; grace notes not counting in the bar.
  - Applied in: [embellishment catalogue](embellishment-catalogue.md) (entry 23, grace-note lexicon entry).
- **S38 - Glissando.** Wikipedia: https://en.wikipedia.org/wiki/Glissando
  - Useful for: discrete versus continuous glissando and its notation.
  - Applied in: [embellishment catalogue](embellishment-catalogue.md) (entry 30, glissando lexicon entry).
- **S39 - Appoggiatura.** Wikipedia: https://en.wikipedia.org/wiki/Appoggiatura
  - Useful for: the appoggiatura written either as a small note or in full size, and its strong-beat placement.
  - Applied in: [embellishment catalogue](embellishment-catalogue.md) (entry 7).

## Mutations (v3)

These back the [mutation catalogue](mutation-catalogue.md), research for the mutations of v3's Jam, and its lexicon entries. Reference only; no text copied.

- **S40 - Motive.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/MotiveSection.html
  - Useful for: the definition of a motive as the smallest identifiable melodic idea.
  - Applied in: [mutation catalogue](mutation-catalogue.md): the purpose, the motif lexicon entry.
- **S41 - Melodic alteration.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/MelodicAlteration.html
  - Useful for: the standard list of motif changes (inversion real and tonal, intervallic change, augmentation and diminution, rhythmic change, ornamentation, extension, retrograde) and the note that sequence is too common to count as one.
  - Applied in: [mutation catalogue](mutation-catalogue.md): most motif-development entries.
- **S42 - Fragment.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/FragmentSection.html
  - Useful for: splitting a compound motive into fragments developed separately.
  - Applied in: [mutation catalogue](mutation-catalogue.md): fragmentation entries.
- **S43 - The sentence.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/SentenceStructure.html
  - Useful for: a phrase whose opening idea is repeated or sequenced before the music moves on.
  - Applied in: [mutation catalogue](mutation-catalogue.md): repetition and sequence.
- **S44 - Anticipation (non-chord tone).** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/Anticipation.html
  - Useful for: the harmony meaning of anticipation, distinct from the rhythmic push.
  - Applied in: [mutation catalogue](mutation-catalogue.md): the anticipation entry and lexicon entry.
- **S45 - Phrase archetypes.** Open Music Theory, "The Phrase, Archetypes, and Unique Forms": https://viva.pressbooks.pub/openmusictheory/chapter/phrase-archetypes-unique-forms/
  - Useful for: the sentence's continuation traits: fragmentation, faster durations, sequence, faster harmonic rhythm.
  - Applied in: [mutation catalogue](mutation-catalogue.md): fragmentation, diminution, sequence.
- **S46 - Rhythm and meter in pop music.** Open Music Theory 2e (Gotham et al.), LibreTexts mirror: https://human.libretexts.org/Bookshelves/Music/Music_Theory/Open_Music_Theory_2e_(Gotham_et_al.)/07%3A_Popular_Music/7.01%3A_Rhythm_and_Meter_in_Pop_Music
  - Useful for: syncopation made by shifting notes early by half their length, and the 3 + 3 + 2 tresillo.
  - Applied in: [mutation catalogue](mutation-catalogue.md): anticipation, regrouping.
- **S47 - Metrical dissonance.** Open Music Theory 2e (Gotham et al.), LibreTexts mirror: https://human.libretexts.org/Bookshelves/Music/Music_Theory/Open_Music_Theory_2e_(Gotham_et_al.)/11%3A_Rhythm_and_Meter/11.06%3A_Metrical_Dissonance
  - Useful for: displacement dissonance and the displacement index.
  - Applied in: [mutation catalogue](mutation-catalogue.md): whole-motif displacement, metric displacement lexicon entry.
- **S48 - Basics of twelve-tone theory.** Open Music Theory: https://viva.pressbooks.pub/openmusictheory/chapter/basics-of-twelve-tone-theory/
  - Useful for: the four row forms (prime, inversion, retrograde, retrograde inversion) as exact operations.
  - Applied in: [mutation catalogue](mutation-catalogue.md): inversion, retrograde, retrograde inversion; the note that "rhythmic inversion" has no settled meaning.
- **S49 - Schoenberg, _Fundamentals of Musical Composition_.** Arnold Schoenberg, ed. Gerald Strang and Leonard Stein, Faber and Faber, 1967. As commonly referenced; not read in full for this catalogue.
  - Useful for: varying a motif by changing its rhythm and intervals while preserving its important features, and the loss of coherence when too much changes.
  - Applied in: [mutation catalogue](mutation-catalogue.md): the motif-development frame, split a note, the distance scale's intent.
- **S50 - Sequence (music).** Wikipedia: https://en.wikipedia.org/wiki/Sequence_(music)
  - Useful for: real versus tonal sequence, typical length of two to four segments, one direction.
  - Applied in: [mutation catalogue](mutation-catalogue.md): sequence entry and lexicon entry.
- **S51 - Augmentation (music).** Wikipedia: https://en.wikipedia.org/wiki/Augmentation_(music)
  - Useful for: rhythmic augmentation and diminution as lengthening or shortening every value.
  - Applied in: [mutation catalogue](mutation-catalogue.md): augmentation and diminution.
- **S52 - Call and response (music).** Wikipedia: https://en.wikipedia.org/wiki/Call_and_response_(music)
  - Useful for: the definition, its African and African-American roots, antiphony, the question-and-answer form.
  - Applied in: [mutation catalogue](mutation-catalogue.md): call and response.
- **S53 - Dowling, recognition of melodic transformations.** W. J. Dowling, "Recognition of melodic transformations: Inversion, retrograde, and retrograde inversion", _Perception & Psychophysics_ 12(5), 1972, 417 ff.: https://labs.utdallas.edu/mpac/files/2021/03/1972.pdf
  - Useful for: all three recognized above chance in easier conditions, difficulty rising from inversion to retrograde to retrograde inversion; no distinction between exact and contour-only versions.
  - Applied in: [mutation catalogue](mutation-catalogue.md): recognizability fields, the "not in the first list" group.
- **S54 - Dowling, scale and contour.** W. J. Dowling, "Scale and contour: Two components of a theory of memory for melodies", _Psychological Review_ 85(4), 1978, 341–354: https://doi.org/10.1037/0033-295X.85.4.341
  - Useful for: contour as the main thing remembered of a short new melody.
  - Applied in: [mutation catalogue](mutation-catalogue.md): recognizability, sequence, interval change.
- **S55 - Hébert and Peretz, melodic and temporal patterns.** S. Hébert and I. Peretz, "Recognition of music in long-term memory: Are melodic and temporal patterns equal partners?", _Memory & Cognition_ 25(4), 1997: https://link.springer.com/article/10.3758/BF03195003
  - Useful for: familiar tunes are named far more often from their pitches alone than from their rhythm alone.
  - Applied in: [mutation catalogue](mutation-catalogue.md): recognizability; the lock as a matter of feel more than recognition.
- **S56 - Post and Toussaint, edit distance and rhythm similarity.** O. Post and G. Toussaint, "The edit distance as a measure of perceived rhythmic similarity", _Empirical Musicology Review_ 6(3), 2011: https://doaj.org/article/02173439e1c24e4cb83f2e9d3be90081
  - Useful for: the count of insert/delete/substitute edits predicts perceived rhythmic difference (r = 0.87 in the first experiment), and metric placement affects an edit's salience.
  - Applied in: [mutation catalogue](mutation-catalogue.md): the distance scale.
- **S57 - Pachet, the Continuator.** F. Pachet, "The Continuator: Musical interaction with style", _Journal of New Music Research_ 32(3), 2003, 333–341: https://www.francoispachet.fr/?p=4360
  - Useful for: a system that continues what a musician just played, in their style; the nearest prior art to Jam.
  - Applied in: [mutation catalogue](mutation-catalogue.md): call and response, Jam framing.
- **S58 - Biles, GenJam.** J. A. Biles, "GenJam: A genetic algorithm for generating jazz solos", _Proceedings of the International Computer Music Conference_, 1994; papers list: https://genjam.org/al-biles/genjam-the-genetic-jammer/genjam-papers/
  - Useful for: "musically meaningful" mutation operators on measures (reverse, rotate, invert, sort, transpose), designed not to destroy musical structure.
  - Applied in: [mutation catalogue](mutation-catalogue.md): rhythmic retrograde, rotation; the idea of a curated mutation list.
- **S59 - Fernández and Vico, survey.** J. D. Fernández and F. Vico, "AI methods in algorithmic composition: A comprehensive survey", _Journal of Artificial Intelligence Research_ 48, 2013: https://arxiv.org/abs/1402.0585
  - Useful for: independent description of GenJam's measure mutations and of musically meaningful operators in evolutionary composition.
  - Applied in: [mutation catalogue](mutation-catalogue.md): cross-check of S58.

## Key and Mode Estimation (v3)

These back [key and mode estimation](key-and-mode-estimation.md), research for v3's key and mode suggestion, and its lexicon entries. Reference only; no text copied.

- **S60 - Krumhansl–Kessler key profiles.** Carol L. Krumhansl and Edward J. Kessler, "Tracing the dynamic changes in perceived tonal organization in a spatial representation of musical keys", Psychological Review 89(4), 334–368 (1982): https://doi.org/10.1037/0033-295X.89.4.334 ; and Carol L. Krumhansl, Cognitive Foundations of Musical Pitch, Oxford University Press (1990; online edition 2001): https://doi.org/10.1093/acprof:oso/9780195148367.001.0001
  - Useful for: the probe-tone key profiles and the Krumhansl–Schmuckler correlation algorithm (described most fully in the 1990 book, per S63).
  - Applied in: [key and mode estimation](key-and-mode-estimation.md): the methods survey and the shape of the proposed role profile.
- **S61 - Temperley's revision of Krumhansl–Schmuckler.** David Temperley, "What's Key for Key? The Krumhansl-Schmuckler Key-Finding Algorithm Reconsidered", Music Perception 17(1), 65–100 (1999): https://doi.org/10.2307/40285812
  - Useful for: revised profile values, presence-per-segment instead of summed durations, a modulation penalty; tests on the Bach fugue subjects (abstract read).
  - Applied in: [key and mode estimation](key-and-mode-estimation.md): the profile table and the duration-weighting discussion.
- **S62 - Bayesian key finding.** David Temperley, "A Bayesian Approach to Key-Finding", in Music and Artificial Intelligence (ICMAI 2002), Lecture Notes in Computer Science 2445, 195–206: https://doi.org/10.1007/3-540-45722-4_18 ; expanded in David Temperley, Music and Probability, MIT Press (2007).
  - Useful for: framing key finding as choosing the key that makes the notes most probable.
  - Applied in: [key and mode estimation](key-and-mode-estimation.md): the probabilistic method and the softmax-at-T=1 reading of the proposal.
- **S63 - Probabilistic model of melody perception.** David Temperley, "A Probabilistic Model of Melody Perception", Cognitive Science 32(2), 418–444 (2008): https://doi.org/10.1080/03640210701864089 (author copy: https://davidtemperley.com/wp-content/uploads/2015/11/temperley-cs08.pdf)
  - Useful for: a key-finding model for single melodies (key profile, range, pitch proximity); Essen profiles (degree 1 = 18.4% of major-melody notes); Table 2 accuracies on 65 Essen songs and 48 Bach fugue subjects for this and four other models; descriptions of the Longuet-Higgins–Steedman and Krumhansl–Schmuckler models. Read in full.
  - Applied in: [key and mode estimation](key-and-mode-estimation.md): accuracy figures throughout, the first-note cue, the role-profile shares.
- **S64 - Distribution alone and listeners.** David Temperley and Elizabeth West Marvin, "Pitch-Class Distribution and the Identification of Key", Music Perception 25(3), 193–212 (2008): https://doi.org/10.1525/mp.2008.25.3.193
  - Useful for: listeners matched the generating key in slightly more than half of their judgments on melodies drawn at random from key distributions, so note counts are far from the whole story (abstract, as summarised by the indexing services consulted).
  - Applied in: [key and mode estimation](key-and-mode-estimation.md): why short melodies are ambiguous.
- **S65 - Aarden–Essen profiles.** Bret J. Aarden, Dynamic Melodic Expectancy, PhD dissertation, The Ohio State University (2003). Profile values as published in S73 and S74.
  - Useful for: key profiles counted in folk melodies of the Essen collection, the corpus closest to a one-voice doodle.
  - Applied in: [key and mode estimation](key-and-mode-estimation.md): the profile table and the worked-example comparison.
- **S66 - Albrecht–Shanahan profiles.** Joshua Albrecht and Daniel Shanahan, "The Use of Large Corpora to Train a New Type of Key-Finding Algorithm: An Improved Treatment of the Minor Mode", Music Perception 31(1), 59–67 (2013): https://doi.org/10.1525/mp.2013.31.1.59
  - Useful for: distance instead of correlation; trained on 490 and tested on 492 pieces; most models do better in major than minor; combined with Aarden–Essen it beat all other models (abstract read; accuracy figures and profile values not checked).
  - Applied in: [key and mode estimation](key-and-mode-estimation.md): the profile discussion.
- **S67 - Parallel-processing key finding.** Piet G. Vos and Erwin W. Van Geenen, "A Parallel-Processing Key-Finding Model", Music Perception 14(2), 185–223 (1996): https://doi.org/10.2307/40285717
  - Useful for: a model for single-voiced music using pitch class, duration, scale and chord evidence, and primacy of the first notes (abstract read).
  - Applied in: [key and mode estimation](key-and-mode-estimation.md): the first-note cue and the summary table.
- **S68 - Intervallic rivalry and tone order.** Helen Brown, David Butler and Mari Riess Jones, "Musical and Temporal Influences on Key Discovery", Music Perception 11(4), 371–407 (1994): https://doi.org/10.2307/40285632
  - Useful for: the rare-interval hypothesis and listener evidence that the order of the same tones changes the heard key (abstract read).
  - Applied in: [key and mode estimation](key-and-mode-estimation.md): interval-based methods and why short melodies are ambiguous.
- **S69 - Scale elimination with a first-note rule.** H. Christopher Longuet-Higgins and Mark J. Steedman, "On Interpreting Bach", Machine Intelligence 6, Edinburgh University Press (1971). Not read directly; its algorithm and results are taken from S63.
  - Useful for: the classic one-voice key finder: drop keys whose scale lacks a played note, then prefer the key whose home is the first note.
  - Applied in: [key and mode estimation](key-and-mode-estimation.md): first-note cue, summary table.
- **S70 - Mode profiles for chant.** David Huron and Joshua Veltman, "A Cognitive Approach to Medieval Mode: Evidence for an Historical Antecedent to the Major/Minor System", Empirical Musicology Review 1(1), 33–55 (2006): https://doi.org/10.18061/1811/24072
  - Useful for: per-mode pitch-class profiles built from 98 chants and used to predict mode; three modes with very similar profiles (abstract read).
  - Applied in: [key and mode estimation](key-and-mode-estimation.md): mode detection beyond major and minor; per-mode profiles in the proposal.
- **S71 - Mode classification in plainchant.** Bas Cornelissen, Willem Zuidema and John Ashley Burgoyne, "Mode Classification and Natural Units in Plainchant", Proceedings of the 21st ISMIR Conference, 869–875 (2020): https://archives.ismir.net/ismir2020/paper/000232.pdf
  - Useful for: textbook mode determination by final, range and first note; final alone expected near 50%; 86–90% for classical and profile methods, 93–95% F1 for fragment-based vectors on 20,865 chants. Read in full.
  - Applied in: [key and mode estimation](key-and-mode-estimation.md): the final-note cue, mode detection, the lexicon entry Final.
- **S72 - Mode identification in Irish dance tunes.** John M. McBride and W. Tecumseh Fitch, "Contrasting statistical patterns in melodic and molecular evolution reveal distinctive constraints in a culturally evolving system", arXiv:2607.12673 (2026), supplementary section "Mode identification algorithm": https://arxiv.org/abs/2607.12673 ; and Juan José Navarro-Cáceres et al., "Exploring Mode Identification in Irish Folk Music with Unsupervised Machine Learning and Template-Based Techniques", Mathematics and Computation in Music (MCM 2024), LNCS, 412–420: https://doi.org/10.1007/978-3-031-60638-0_34 , with a follow-up in Applied Sciences 15(6), 3162 (2025): https://doi.org/10.3390/app15063162
  - Useful for: a third/sixth/seventh decision tree for Ionian, Mixolydian, Aeolian and Dorian with a known home note (94% agreement with user labels; 52% major); the remark that joint home-and-mode estimation is non-trivial (McBride and Fitch, read in full); the existence of template and unsupervised comparisons (Navarro-Cáceres, metadata only).
  - Applied in: [key and mode estimation](key-and-mode-estimation.md): mode detection beyond major and minor.
- **S73 - Humdrum Extras `keycor` manual.** Craig Stuart Sapp, keycor manpage, Humdrum Extras: https://extras.humdrum.org/man/keycor/ (read through https://web.archive.org/web/2023/https://extras.humdrum.org/man/keycor/). The Bellman–Budge profiles it lists come from Héctor Bellmann, "About the Determination of Key of a Musical Excerpt", CMMR 2005, Lecture Notes in Computer Science 3902, 76–91 (2006): https://doi.org/10.1007/11751069_7
  - Useful for: full numeric Krumhansl–Kessler, Aarden–Essen, simple, Bellman–Budge and Temperley–Kostka–Payne profiles; the duration switch; each profile's confusion tendency.
  - Applied in: [key and mode estimation](key-and-mode-estimation.md): the profile table, tendencies, the worked-example comparison.
- **S74 - music21 key analysis.** music21 `analysis.discrete` module, documentation and source: https://www.music21.org/music21docs/moduleReference/moduleAnalysisDiscrete.html and https://github.com/cuthbertLab/music21/blob/master/music21/analysis/discrete.py ; licence BSD 3-Clause: https://github.com/cuthbertLab/music21/blob/master/LICENSE
  - Useful for: a reference implementation of five profile sets with duration-weighted histograms and Pearson correlation; licence check.
  - Applied in: [key and mode estimation](key-and-mode-estimation.md): the methods survey and licence notes.
- **S75 - Essentia key algorithm.** Essentia `Key` reference: https://essentia.upf.edu/reference/std_Key.html ; source https://github.com/MTG/essentia/blob/master/src/algorithms/tonal/key.cpp ; licence AGPL-3.0: https://github.com/MTG/essentia/blob/master/COPYING.txt ; essentia.js licence AGPL-3.0: https://github.com/MTG/essentia.js/blob/master/LICENSE
  - Useful for: Temperley 1999 and Temperley–Kostka–Payne profile values; input is an audio-derived pitch-class profile; licence check.
  - Applied in: [key and mode estimation](key-and-mode-estimation.md): the profile table and licence notes.
- **S76 - tonal (TypeScript music theory library).** tonal, `Scale.detect`: https://github.com/tonaljs/tonal/tree/main/packages/scale ; licence MIT (npm registry metadata for `tonal` 6.5.0).
  - Useful for: a browser-ready set lookup (scales containing given notes), with the first note taken as home unless a tonic is given.
  - Applied in: [key and mode estimation](key-and-mode-estimation.md): the summary table.
- **S77 - ECMAScript implementation-approximated maths.** ECMA-262, ECMAScript Language Specification, clause 4.4 "implementation-approximated": https://tc39.es/ecma262/
  - Useful for: "Some mathematical operations, such as Math.exp, are implementation-approximated", so results may differ between engines.
  - Applied in: [key and mode estimation](key-and-mode-estimation.md): the integers-only rule for the seeded draw.
- **S78 - General music-theory terms.** Wikipedia articles "Pitch class" https://en.wikipedia.org/wiki/Pitch_class , "Relative key" https://en.wikipedia.org/wiki/Relative_key , "Parallel key" https://en.wikipedia.org/wiki/Parallel_key , "Minor scale" https://en.wikipedia.org/wiki/Minor_scale , "Blue note" https://en.wikipedia.org/wiki/Blue_note
  - Useful for: fact-checking the beginner definitions of pitch class, relative and parallel keys, harmonic minor and blue notes. Reference only; no text copied.
  - Applied in: [key and mode estimation](key-and-mode-estimation.md): the problem statement and the lexicon entries.

## Played Patterns (v3)

These back [played-pattern recognition](played-pattern-recognition.md), research for recognising played signals, and its lexicon entries. Reference only; no text copied.

- **S80 - Call and response (music).** Wikipedia: https://en.wikipedia.org/wiki/Call_and_response_(music)
  - Useful for: the definition of call and response, its African origins, the master drummer's coordinating pattern, and its place in blues, gospel, jazz and soul.
  - Applied in: [played-pattern recognition](played-pattern-recognition.md): the vocabulary section and the `call-and-response` lexicon entry.
- **S81 - Trading fours.** Wikipedia, Drum solo: https://en.wikipedia.org/wiki/Drum_solo and A Way with Words, "trade fours": https://www.waywordradio.org/trade_fours_1/
  - Useful for: alternating four-bar solos, and the variants (eights, twelves, twos, single bars, choruses).
  - Applied in: [played-pattern recognition](played-pattern-recognition.md): the vocabulary and jam-practice sections, the turn-by-form argument, the `trading-fours` lexicon entry.
- **S82 - Motif, leitmotif and cue notes.** Wikipedia: https://en.wikipedia.org/wiki/Motif_(music) and https://en.wikipedia.org/wiki/Cue_note
  - Useful for: the motif as the smallest unit with thematic identity, the leitmotif as a motif tied to a person or idea, and cue notes as entrance hints after long rests.
  - Applied in: [played-pattern recognition](played-pattern-recognition.md): the vocabulary section and the `motif`, `leitmotif` and `cue` lexicon entries.
- **S83 - Lick, riff and head.** Wikipedia: https://en.wikipedia.org/wiki/Lick_(music), https://en.wikipedia.org/wiki/Riff and https://en.wikipedia.org/wiki/Head_(music)
  - Useful for: the lick as stock vocabulary, the riff as a repeated figure (and big-band riff exchanges), the head and the head-solos-head form, and the head-pat signal.
  - Applied in: [played-pattern recognition](played-pattern-recognition.md): the vocabulary section and the `lick`, `riff` and `head` lexicon entries.
- **S84 - Jam session hand signals.** Sonicbids blog, "8 Jam Session Hand Signals That Every Musician Should Know": https://blog.sonicbids.com/8-jam-session-hand-signals-musicians
  - Useful for: how players cue solos, the head, trading fours and endings with gestures.
  - Applied in: [played-pattern recognition](played-pattern-recognition.md): the vocabulary and jam-practice sections. A practitioner blog, not a reference work.
- **S85 - Tihai.** Wikipedia: https://en.wikipedia.org/wiki/Tihai
  - Useful for: a phrase played three times that lands on the first beat of the cycle and marks the end of a section.
  - Applied in: [played-pattern recognition](played-pattern-recognition.md): played cues, repetition as a frame, accidental-trigger reasoning.
- **S86 - Samba band.** Wikipedia: https://en.wikipedia.org/wiki/Samba_band
  - Useful for: the mestre leading with the repinique and whistles that signal breaks and calls.
  - Applied in: [played-pattern recognition](played-pattern-recognition.md): played cues and jam-practice sections.
- **S87 - _The Legend of Zelda: Ocarina of Time_ songs.** Wikipedia: https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Ocarina_of_Time ; Wikibooks, Ocarina Songs: https://en.wikibooks.org/wiki/The_Legend_of_Zelda:_Ocarina_of_Time/Ocarina_Songs ; Zelda Wiki, Scarecrow's Song: https://zeldawiki.wiki/wiki/Scarecrow%27s_Song
  - Useful for: the five-note ocarina, the 12 songs and their effects, song lengths, songs taught by characters, the player-composed eight-note Scarecrow's Song and its refusal of existing songs or one repeated note.
  - Applied in: [played-pattern recognition](played-pattern-recognition.md): the games table, framing, discoverability, player-defined signals. The Zelda Wiki page refused direct access; its content was read through search summaries.
- **S88 - _Patapon_.** Wikipedia: https://en.wikipedia.org/wiki/Patapon
  - Useful for: four-drum, four-beat commands on a visible beat, the sung-back confirmation, and the combo and fever lost off the beat.
  - Applied in: [played-pattern recognition](played-pattern-recognition.md): the games table, beat framing, feedback, the endgame needs.
- **S89 - _Loom_.** Wikipedia: https://en.wikipedia.org/wiki/Loom_(video_game)
  - Useful for: four-note drafts on a C-to-C scale, learning by observation, reversed drafts, per-game randomisation and the no-labels Expert level.
  - Applied in: [played-pattern recognition](played-pattern-recognition.md): the games table, discoverability.
- **S90 - _PaRappa the Rapper_.** Wikipedia: https://en.wikipedia.org/wiki/PaRappa_the_Rapper
  - Useful for: call and response with a teacher, the Good/Bad/Awful/Cool rating, and freestyle that flips into Cool mode.
  - Applied in: [played-pattern recognition](played-pattern-recognition.md): the games table, the endgame outcomes discussion.
- **S91 - _Rock Band_ and _Guitar Hero_.** Wikipedia: https://en.wikipedia.org/wiki/Rock_Band and https://en.wikipedia.org/wiki/Guitar_Hero_(video_game)
  - Useful for: freestyle drum fills closed by a crash to trigger Overdrive, the Big Rock Ending, and Star Power triggered by tilting the guitar.
  - Applied in: [played-pattern recognition](played-pattern-recognition.md): the games table, the separate-channel frame.
- **S92 - _Theatrhythm Final Fantasy_.** Wikipedia: https://en.wikipedia.org/wiki/Theatrhythm_Final_Fantasy
  - Useful for: tap, slide and hold triggers, battle stages where timing deals damage, and reviews of its RPG layer.
  - Applied in: [played-pattern recognition](played-pattern-recognition.md): the games table, the endgame outcomes discussion.
- **S93 - The Continuator, system paper.** François Pachet, "Interacting with a Musical Learning System: The Continuator", ICMAI 2002: https://www.francoispachet.fr/wp-content/uploads/2021/01/pachet-02-icmai-final.pdf
  - Useful for: the phrase-end detection thread and its threshold, and the hierarchy of reduction functions (pitch, pitch regions) used when an exact match fails.
  - Applied in: [played-pattern recognition](played-pattern-recognition.md): interactive systems, matching approaches.
- **S94 - The Continuator with children.** Anna Rita Addessi and François Pachet, "Experiments with a musical machine: musical style replication in 3 to 5 year old children", British Journal of Music Education 22(1), 2005, DOI 10.1017/S0265051704005972: https://www.francoispachet.fr/wp-content/uploads/2021/01/pachet-04j.pdf
  - Useful for: the three turn-taking rules (a silence threshold of about 400 ms, an answer as long as the phrase, the player's priority) and children learning them implicitly.
  - Applied in: [played-pattern recognition](played-pattern-recognition.md): interactive systems, the silence frame, the "your turn" recommendation.
- **S95 - GenJam trading fours.** John A. Biles, "Interactive GenJam: Integrating Real-Time Performance with a Genetic Algorithm", International Computer Music Conference: https://genjam.org/wp-content/uploads/2019/07/bilesicmc98.pdf
  - Useful for: trading fours with a human through pitch-to-MIDI, the per-slot filter for noisy input, and a human mentor's "good"/"bad" feedback training the system's taste.
  - Applied in: [played-pattern recognition](played-pattern-recognition.md): interactive systems, stray notes, the never-penalize discussion, the endgame needs.
- **S96 - Score following.** Wikipedia: https://en.wikipedia.org/wiki/Score_following ; Roger B. Dannenberg, "An On-Line Algorithm for Real-Time Accompaniment", ICMC 1984: https://hdl.handle.net/2027/spo.bbp2372.1984.025
  - Useful for: tracking a live player in a known score, and dynamic-programming matching that tolerates wrong, extra and missing notes.
  - Applied in: [played-pattern recognition](played-pattern-recognition.md): interactive systems, tolerant matching.
- **S97 - Query by humming and contour codes.** Asif Ghias, Jonathan Logan, David Chamberlin and Brian C. Smith, "Query By Humming", ACM Multimedia 1995: https://www.cs.cornell.edu/zeno/papers/humming/humming.html ; Wikipedia, Parsons code: https://en.wikipedia.org/wiki/Parsons_code
  - Useful for: up/down/same contour matching with k mismatches, 10–12 steps to tell apart 90% of 183 songs, and the 23% share of the "up, up" opening.
  - Applied in: [played-pattern recognition](played-pattern-recognition.md): contour-only matching, accidental-trigger reasoning.
- **S98 - Edit distance and time warping for melodies.** Marcel Mongeau and David Sankoff, "Comparison of musical sequences", Computers and the Humanities 24, 1990, DOI 10.1007/BF00117340: https://doi.org/10.1007/BF00117340 ; Wikipedia, Dynamic time warping: https://en.wikipedia.org/wiki/Dynamic_time_warping
  - Useful for: melodic edit distance with insertion, deletion, substitution, fragmentation and consolidation; time warping for sequences at varying speed and its cost.
  - Applied in: [played-pattern recognition](played-pattern-recognition.md): matching approaches.
- **S99 - TapSongs.** Jacob O. Wobbrock, "TapSongs: Tapping Rhythm-Based Passwords on a Single Binary Sensor", UIST 2009, DOI 10.1145/1622176.1622194: https://doi.org/10.1145/1622176.1622194
  - Useful for: rhythm-only pattern matching learned from 12 examples, with genuine and imposter success rates.
  - Applied in: [played-pattern recognition](played-pattern-recognition.md): tempo-invariant rhythm matching, player-defined signals.

## Presets (v3)

These back the [preset catalogue](preset-catalogue.md), research for the v3.1 built-in presets, and its lexicon entries. Wikipedia pages are used as pointers for widely documented genre facts. Reference only; no text copied. S116-S119 were reserved for this block and are unused.

- **S100 - Pentatonic scale.** Wikipedia: https://en.wikipedia.org/wiki/Pentatonic_scale
  - Useful for: major and minor pentatonic contents; the minor pentatonic as the basis of the blues scale and of blues and rock soloing; its use in Scottish, Irish and Appalachian folk; why it suits improvisers.
  - Applied in: [preset catalogue](preset-catalogue.md): [What no setting can express today](preset-catalogue.md#what-no-setting-can-express-today), Blues, Considered, the pentatonic-scale and blues-scale lexicon drafts.
- **S101 - Twelve-bar blues.** Wikipedia: https://en.wikipedia.org/wiki/Twelve-bar_blues
  - Useful for: the I–IV–V twelve-bar pattern, seventh-chord variants, the AAB melodic shape.
  - Applied in: [preset catalogue](preset-catalogue.md): Blues, the twelve-bar-blues lexicon draft.
- **S102 - Swing.** Wikipedia: https://en.wikipedia.org/wiki/Swing_(jazz_performance_style)
  - Useful for: unequal eighths, the triplet (2:1) approximation, the ratio narrowing at faster tempos, the styles that swing.
  - Applied in: [preset catalogue](preset-catalogue.md): What no setting can express today (swing, acknowledgement of swung notes), Bebop, Blues.
- **S103 - Bebop.** Wikipedia: https://en.wikipedia.org/wiki/Bebop
  - Useful for: fast tempos, quick and complex chord changes, angular lines, extended and altered chords; early-1940s origin with Parker and Gillespie.
  - Applied in: [preset catalogue](preset-catalogue.md): Bebop, What no setting can express today.
- **S104 - Modal jazz.** Wikipedia: https://en.wikipedia.org/wiki/Modal_jazz
  - Useful for: modes in front instead of changing chords; "So What" and _Kind of Blue_ (1959); D Dorian in "So What"; chords voiced in fourths.
  - Applied in: [preset catalogue](preset-catalogue.md): Modal (Dorian), the vamp lexicon draft.
- **S105 - "Oye Como Va".** Ethan Hein, blog post: https://ethanhein.com/wp/2021/oye-como-va/
  - Useful for: a whole tune in A Dorian on a two-chord i–IV vamp, and the raised 6th as the source of its color.
  - Applied in: [preset catalogue](preset-catalogue.md): Modal (Dorian), the vamp lexicon draft. A practitioner blog, used for one well-known example.
- **S106 - Reel.** Wikipedia: https://en.wikipedia.org/wiki/Reel_(dance)
  - Useful for: 4/4 or 2/2; mostly eighth-note movement accented on beats 1 and 3; played even, without swing; eight-bar parts divisible into four-bar phrases; AABB form.
  - Applied in: [preset catalogue](preset-catalogue.md): Folk reel, the reel lexicon draft.
- **S107 - Modes in Irish and Scottish music.** John Chambers, "A Brief Tutorial on Musical Modes", ABC notation pages at MIT: https://trillian.mit.edu/~jc/doc/abc/Modes.html
  - Useful for: Dorian and Mixolydian as very common in Irish and Scottish tunes; a "minor" tune often being Dorian.
  - Applied in: [preset catalogue](preset-catalogue.md): Folk reel.
- **S108 - Irish ornamentation.** The Celtic Room, "Irish music ornamentation": https://thecelticroom.org/playing-irish-music/irish-music-ornamentation.html
  - Useful for: the cut (a grace note above), the tap or strike (below), the long and short roll, the cran; ornaments varied freely by the player.
  - Applied in: [preset catalogue](preset-catalogue.md): Folk reel, the reel lexicon draft. A practitioner page, cross-checked against the ornament entries of the [embellishment catalogue](embellishment-catalogue.md).
- **S109 - Fortspinnung.** Wikipedia: https://en.wikipedia.org/wiki/Fortspinnung
  - Useful for: "spinning out" a motif through sequences, repetition and variation; the opening–development–cadence shape; Baroque usage.
  - Applied in: [preset catalogue](preset-catalogue.md): Baroque.
- **S110 - Sequence.** Wikipedia: https://en.wikipedia.org/wiki/Sequence_(music)
  - Useful for: a passage restated at another pitch level; the descending-fifths sequence; its strong association with Baroque music and Vivaldi.
  - Applied in: [preset catalogue](preset-catalogue.md): Baroque.
- **S111 - Ornament (music).** Wikipedia: https://en.wikipedia.org/wiki/Ornament_(music)
  - Useful for: Baroque performers improvising trills, mordents and appoggiaturas; most Baroque ornaments falling on the beat.
  - Applied in: [preset catalogue](preset-catalogue.md): Baroque.
- **S112 - Bossa nova.** Wikipedia: https://en.wikipedia.org/wiki/Bossa_nova
  - Useful for: late-1950s Rio de Janeiro origin (Gilberto, Jobim); the guitar pattern and clave-like percussion; syncopation; played without swing; complex chords; usual 2/4 notation.
  - Applied in: [preset catalogue](preset-catalogue.md): Bossa, What no setting can express today, the bossa-nova lexicon draft.
- **S113 - Four-chord schemas.** Open Music Theory 2e (Gotham et al.), LibreTexts mirror, CC BY-SA: https://human.libretexts.org/Bookshelves/Music/Music_Theory/Open_Music_Theory_2e_(Gotham_et_al.)/07%3A_Popular_Music/7.09%3A_Four-Chord_Schemas
  - Useful for: I, IV, V and vi as pop's most common chords; the doo-wop schema I–vi–IV–V (1950s–60s) and the singer/songwriter schema I–V–vi–IV (from the mid-1990s).
  - Applied in: [preset catalogue](preset-catalogue.md): Pop song.
- **S114 - Melody and phrasing in pop music.** Open Music Theory 2e (Gotham et al.), LibreTexts mirror, CC BY-SA: https://human.libretexts.org/Bookshelves/Music/Music_Theory/Open_Music_Theory_2e_(Gotham_et_al.)/07%3A_Popular_Music/7.03%3A_Melody_and_Phrasing
  - Useful for: a pop phrase typically lasting four bars; the SRDC (statement, response, departure, conclusion) sentence form.
  - Applied in: [preset catalogue](preset-catalogue.md): Pop song.
- **S115 - Minimal music.** Wikipedia: https://en.wikipedia.org/wiki/Minimal_music
  - Useful for: repetition, process, steady pulse, consonant diatonic harmony with slow harmonic rhythm.
  - Applied in: [preset catalogue](preset-catalogue.md): Considered, not proposed.

Licence note: Music Theory for the 21st-Century Classroom (S1-S7, S9-S10, S18-S24, S40-S44) is © 2017 Robert Hutchinson and distributed under the GNU Free Documentation License, version 1.2 or later. Open Music Theory (S8, S8a, S14, S25, S45-S48, S113-S114) is CC BY-SA. The project cites both for verification and does not reproduce their text.
