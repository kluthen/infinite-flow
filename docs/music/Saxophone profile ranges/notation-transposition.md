# Saxophone Written-Notation Transposition Profiles

## What concert-to-written transposition applies to tenor saxophone?

### Takeaway
The B-flat tenor saxophone part is conventionally written a major ninth above concert pitch: written C sounds concert B-flat one octave lower. For a deterministic concert-to-written renderer, use the signed interval `+14 semitones` / `+8 diatonic steps` (up a major ninth), displayed in treble clef.

### Cited Findings
- Yamaha identifies tenor saxophone as a B-flat instrument and states that a written C produces B-flat; it gives concert F major -> written G major for tenor saxophone. [Source](https://www.yamaha.com/en/musical_instrument_guide/saxophone/play/play003.html)
- The tenor-saxophone written-to-sounding relation is a major ninth down: a specialist educational reference describes tenor as reading treble clef and sounding a major ninth below the part. [Source](https://tunableapp.com/transposition/tenor-saxophone/)
- MusicXML defines `<transpose>` as the amount added to written pitch to obtain sounding pitch. Its `chromatic` value excludes octave displacement, and `octave-change` must be included for octave-or-greater transpositions. [Source](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/transpose/) [Source](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/chromatic/) [Source](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/octave-change/)
- MusicXML's `diatonic` transposition carries staff-step information specifically so enharmonic transpositions can be spelled correctly. [Source](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/diatonic/)

### Inferences
- Renderer profile: `Concert -> B-flat tenor written = +14 chromatic semitones, +8 diatonic steps`; use `G2` (treble) clef. The inverse, suitable for an interchange/export field defined as written-to-sounding, is `chromatic=-2`, `diatonic=-1`, `octave-change=-1`. This separates the octave from the B-flat interval as MusicXML requires. [Source](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/chromatic/) [Source](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/octave-change/)
- Apply the concert-to-written transform only while deriving visible pitch names, staff positions, key signatures, and harmonic labels. Keep event time, duration, and canonical concert MIDI/pitch data unchanged; rendering a tenor part is a view transformation, not a source-pitch or generation-policy change.
- For spelled notes, transpose by the diatonic major-ninth interval first and derive the required accidental from the resulting target pitch class. A chromatic-only modulo-12 mapping can produce enharmonically incorrect written notation; for example, concert F major must display as G major, not an arbitrary enharmonic key. [Source](https://www.yamaha.com/en/musical_instrument_guide/saxophone/play/play003.html) [Source](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/diatonic/)

### Gaps
- The strongest directly accessible source for tenor's treble-clef and full major-ninth wording was a specialist educational reference rather than a formal engraving manual. Yamaha independently confirms the B-flat and key relationship but does not state the octave in the retrieved page.

## What concert-to-written transposition applies to alto saxophone?

### Takeaway
The E-flat alto saxophone part is conventionally written a major sixth above concert pitch: written C sounds concert E-flat a major sixth lower. For a deterministic concert-to-written renderer, use `+9 semitones` / `+5 diatonic steps` (up a major sixth), displayed in treble clef.

### Cited Findings
- Yamaha identifies alto saxophone as an E-flat instrument: a written C produces E-flat, and concert F major is written as D major for alto saxophone. [Source](https://www.yamaha.com/en/musical_instrument_guide/saxophone/play/play003.html)
- An alto-saxophone transposition reference states that the instrument is in E-flat, sounds a major sixth below written pitch, and requires concert pitch to be transposed up a major sixth for the written part. [Source](https://piano.org/theory/transposing-instruments/alto-saxophone/)
- MusicXML permits a clef to be represented separately from instrument transposition, using sign, line, and optional octave-change fields. [Source](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/clef/)

### Inferences
- Renderer profile: `Concert -> E-flat alto written = +9 chromatic semitones, +5 diatonic steps`; use `G2` (treble) clef. The inverse written-to-sounding values are `chromatic=-9`, `diatonic=-5`, with no octave-change. [Source](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/chromatic/) [Source](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/diatonic/)
- Do not infer an octave displacement from the E-flat instrument label. Alto's complete written-to-sounding interval is below an octave, unlike tenor's major ninth, so `octave-change` is absent. [Source](https://piano.org/theory/transposing-instruments/alto-saxophone/) [Source](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/octave-change/)
- The deterministic Concert display profile should retain canonical concert spelling and use `G2` when a uniform single-staff saxophone-oriented view is required. Its pitch transform is `0 semitones` / `0 diatonic steps`; tenor and alto then differ only in display-profile data, not in the timeline or source events.

### Gaps
- No formal standards document retrieved here prescribes a renderer's generic Concert-view clef. `G2` for Concert is therefore an explicit product convention for a uniform saxophone display, not a claim that all concert-pitch instruments or scores use treble clef.

## How do these conventions apply consistently to key signatures, accidentals, and chord symbols?

### Takeaway
Transpose every pitch-bearing notation item with the same concert-to-written diatonic interval used for notes. This yields tenor `+M9` and alto `+M6` for key tonic, note spelling/accidentals, and chord-symbol root and bass, while chord quality/extensions remain unchanged; octave displacement affects staff notes, but not chord-symbol pitch classes.

### Cited Findings
- Yamaha's examples establish consistent key conversion: concert F major becomes written G major for tenor and written D major for alto; it also gives concert C -> written D for B-flat instruments and concert C -> written A for E-flat saxophones. [Source](https://www.yamaha.com/en/musical_instrument_guide/saxophone/play/play003.html)
- MusicXML states that diatonic transposition is needed for correct enharmonic spelling, while chromatic transposition represents semitone distance. [Source](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/diatonic/) [Source](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/chromatic/)
- MusicXML describes transposition as written-to-sounding pitch conversion for transposing-instrument parts, supporting an explicit, reversible display transform rather than changing the underlying musical events. [Source](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/transpose/)

### Inferences
- Key signatures: transpose the concert key's tonic and mode by the profile's diatonic interval, then render the normal target key signature. Examples: concert C major -> tenor D major / alto A major; concert F major -> tenor G major / alto D major. [Source](https://www.yamaha.com/en/musical_instrument_guide/saxophone/play/play003.html)
- Accidentals: derive each written letter name by the same signed diatonic transform and compute its accidental against the transposed key signature and measure state. This preserves notation spelling, including sharps, flats, naturals, and double accidentals, rather than merely selecting an enharmonic MIDI equivalent. [Source](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/diatonic/)
- Chord symbols: transpose the root and any slash-bass pitch class by the same `+M9` (tenor) or `+M6` (alto) spelling transform; preserve the chord quality, alterations, extensions, additions, and omissions. Do not encode tenor's extra octave in chord text because chord-symbol roots and basses name pitch classes rather than fixed staff-register pitches.
- Keep the transforms centralized in a display-profile table: `concert { chromatic: 0, diatonic: 0, clef: G2 }`; `tenorBb { concertToWrittenChromatic: +14, concertToWrittenDiatonic: +8, clef: G2 }`; `altoEb { concertToWrittenChromatic: +9, concertToWrittenDiatonic: +5, clef: G2 }`. Apply this table at render time only.

### Gaps
- The retrieved authoritative notation-format source specifies pitch and enharmonic transposition fields but does not prescribe a universal chord-symbol transposition algorithm. The root/bass-only rule is the renderer convention derived from the semantic distinction between pitch-bearing chord labels and non-pitch chord-quality text.
