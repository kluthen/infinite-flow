# Saxophone Profile Ranges

## What written range is conventionally expected without altissimo for tenor and alto saxophone?

### Takeaway
For the modern, commonly used E-flat alto and B-flat tenor saxophones, the conventional written compass is B-flat3 through F-sharp6 (scientific pitch notation), not an altissimo extension. This is a 33-semitone compass. [Source](https://www.britannica.com/art/saxophone) [Source](https://en.wikipedia.org/wiki/Scientific_pitch_notation)

### Cited Findings
- Encyclopaedia Britannica states that the original saxophone compass was expanded down to B-flat and that the commonly used alto and tenor can sound one semitone above F6, i.e. F-sharp6. This establishes written B-flat3 through F-sharp6 as the modern conventional compass for both instruments. [Source](https://www.britannica.com/art/saxophone)
- The same reference states that alto and tenor have different concert pitch even though they share the common saxophone fingering system. [Source](https://www.britannica.com/art/saxophone)
- Yamaha identifies tenor saxophone as a B-flat instrument and alto saxophone as an E-flat instrument; it explains that a written C sounds B-flat on tenor and E-flat on alto. [Source](https://www.yamaha.com/en/musical_instrument_guide/saxophone/play/play003.html)
- Britannica specifies the corresponding octave displacement: E-flat alto sounds a sixth below written pitch, and B-flat tenor sounds a ninth below written pitch. [Source](https://www.britannica.com/art/saxophone)
- In scientific pitch notation, middle C is C4, and octave boundaries occur between B and C; this is the octave convention used in these notes. [Source](https://en.wikipedia.org/wiki/Scientific_pitch_notation)

### Inferences
- Treat B-flat3--F-sharp6 as an established *notated/physical compass*, not as a guarantee that every first-release generated phrase will be equally comfortable at every point. Product policy should reserve margin from both documented endpoints. [Source](https://www.britannica.com/art/saxophone)
- Altissimo is excluded from this research scope: the documented common compass ends at written F-sharp6. [Source](https://www.britannica.com/art/saxophone)

### Gaps
- The consulted authoritative references define compass and transposition, but do not prescribe one universal pedagogical "safe phrase range" across learner levels, dynamics, articulation, or equipment. The active subset below is therefore product policy rather than a sourced performance guarantee.

## What concert-pitch MIDI ranges result under their standard transpositions?

### Takeaway
Using C4 = MIDI 60, the full conventional compass converts to concert MIDI 44--76 for B-flat tenor and 49--81 for E-flat alto. The conversion is exact under 12-tone MIDI note numbering: subtract 14 semitones for tenor and 9 for alto from the written MIDI pitch. [Source](https://www.britannica.com/art/saxophone) [Source](https://en.wikipedia.org/wiki/Scientific_pitch_notation)

### Cited Findings
- Britannica gives the required transposition intervals: tenor sounds a ninth below written pitch (14 semitones) and alto a sixth below written pitch (9 semitones). [Source](https://www.britannica.com/art/saxophone)
- Yamaha independently confirms the pitch classes underlying those intervals: written C sounds B-flat on tenor and E-flat on alto. [Source](https://www.yamaha.com/en/musical_instrument_guide/saxophone/play/play003.html)
- The MIDI Association defines the Note On key field as the key/note number. Separately, the widely used MIDI pitch-label convention maps C4 to 60 and uses `frequency = 440 * 2^((m - 69)/12)`, where `m` is the MIDI Note On number. [Source](https://midi.org/specifications-old/item/table-1-summary-of-midi-message) [Source](https://en.wikipedia.org/wiki/Scientific_pitch_notation)
- Under that convention, written B-flat3 = MIDI 58 and written F-sharp6 = MIDI 90; therefore the documented written compass is MIDI 58--90. [Source](https://en.wikipedia.org/wiki/Scientific_pitch_notation)

### Inferences
- **B-flat tenor, full conventional compass:** written MIDI 58--90 minus 14 = concert A-flat2--E5, MIDI **44--76**. This is a direct calculation from the documented compass and ninth-below transposition. [Source](https://www.britannica.com/art/saxophone)
- **E-flat alto, full conventional compass:** written MIDI 58--90 minus 9 = concert D-flat3--A5, MIDI **49--81**. This is a direct calculation from the documented compass and sixth-below transposition. [Source](https://www.britannica.com/art/saxophone)
- MIDI endpoints are inclusive in the adopted profile policy. A range `46--70`, for example, permits both endpoint note numbers and contains 25 chromatic pitches across a two-octave (24-semitone) span.

### Gaps
- MIDI itself transmits note numbers, not a mandatory human-readable octave-label convention. These notes explicitly adopt the widespread C4 = 60 convention so that the profile values are unambiguous.

## What conservative subset is most appropriate for a generated practice phrase, and why?

### Takeaway
Adopt written C4--C6 for both first-release saxophone profiles: exactly two octaves, fully inside the established non-altissimo compass, and clear of the two lowest conventional notes and the upper C-sharp6--F-sharp6 edge. Generate in concert pitch with tenor MIDI 46--70 (B-flat2--B-flat4) and alto MIDI 51--75 (E-flat3--E-flat5). [Source](https://www.britannica.com/art/saxophone) [Source](https://en.wikipedia.org/wiki/Scientific_pitch_notation)

### Cited Findings
- Written C4--C6 lies inside Britannica's documented B-flat3--F-sharp6 common alto/tenor compass and does not invoke notes above F-sharp6. [Source](https://www.britannica.com/art/saxophone)
- The tenor and alto conversion offsets used for the recommendation are respectively a ninth and a sixth below written pitch. [Source](https://www.britannica.com/art/saxophone)
- The MIDI mapping used for the exact endpoints follows C4 = 60 and semitone-spaced MIDI note numbers. [Source](https://en.wikipedia.org/wiki/Scientific_pitch_notation)

### Inferences
- **Recommended first-release policy, B-flat tenor:** accept generated concert pitches from **MIDI 46 through 70 inclusive**: B-flat2 through B-flat4. These correspond to written C4 through C6 (`60--84` minus 14).
- **Recommended first-release policy, E-flat alto:** accept generated concert pitches from **MIDI 51 through 75 inclusive**: E-flat3 through E-flat5. These correspond to written C4 through C6 (`60--84` minus 9).
- The shared written range gives the generator a musically useful, exactly two-octave vocabulary while keeping profile logic simple and preserving a three-semitone margin below the conventional floor plus a four-semitone margin above C6 before the documented top F-sharp6.
- This policy is conservative rather than beginner-only: C6 is inside the documented common compass rather than above it, and the full two-octave span gives phrase generation room for scalar, intervallic, arpeggiated, and contour-based material. It should nevertheless be treated as a default profile, with later skill-level or style profiles permitted to widen it after validation. [Source](https://www.britannica.com/art/saxophone)

### Gaps
- The sources do not supply empirical error, comfort, or fatigue data for algorithmically generated phrases. Before widening the ranges, validate candidate phrases with experienced alto and tenor players across intended tempos, dynamics, articulations, leaps, and durations.
