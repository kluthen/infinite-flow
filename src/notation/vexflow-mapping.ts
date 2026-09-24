/**
 * Pure 1:1 mapping helpers from the written-phrase model to VexFlow objects: pitch/duration
 * spelling into VexFlow key/duration codes, and the construction of individual StaveNote,
 * Accidental, Dot, ChordSymbol, Beam and StaveTie instances from the model's own fields. Nothing
 * here re-decides music (no auto-accidentals, no auto-beaming): every glyph, accidental, beam
 * group and tie is taken verbatim from the WrittenPhrase. Together with ./vexflow-engraver.ts and
 * ./vexflow-two-system-engraver.ts, this is the only trio of files allowed to import 'vexflow'.
 */
import {
  Accidental,
  Beam,
  ChordSymbol,
  Dot,
  StaveNote,
  StaveTie,
  type StaveNoteStruct,
} from 'vexflow/bravura'

import type {
  Alter,
  DisplayedAccidental,
  NotatedDuration,
  SpelledPitch,
  SpelledPitchClass,
  WrittenChordSymbol,
  WrittenEvent,
  WrittenMeasure,
} from '../domain/notation/written-phrase-types'

/**
 * The rest key position for every notated rest: the middle line, except a whole rest, which by
 * engraving convention hangs from the fourth line.
 */
const REST_KEY = 'b/4'
const WHOLE_REST_KEY = 'd/5'

/** Intent: render a spelled alteration as the VexFlow accidental-letter suffix ('', '#', 'bb', ...). */
function alterSuffix(alter: Alter): string {
  if (alter === 0) return ''
  return alter > 0 ? '#'.repeat(alter) : 'b'.repeat(-alter)
}

/** Intent: map one spelled pitch to a VexFlow key string, for example 'F#/5'. */
function mapPitchKey(pitch: SpelledPitch): string {
  return `${pitch.letter}${alterSuffix(pitch.alter)}/${pitch.octave}`
}

/** Intent: map a written key's Ionian tonic to a VexFlow key-signature spec, for example 'Eb'. */
// @spec-link [[module_notation_display_convention]]
export function mapKeySpec(ionianTonic: SpelledPitchClass): string {
  return `${ionianTonic.letter}${alterSuffix(ionianTonic.alter)}`
}

/** Intent: choose the conventional vertical position for a rest of the given notated duration. */
function restKey(duration: NotatedDuration): string {
  return duration.value === 'whole' ? WHOLE_REST_KEY : REST_KEY
}

const DURATION_CODES: Readonly<Record<NotatedDuration['value'], string>> = {
  whole: 'w',
  half: 'h',
  quarter: 'q',
  eighth: '8',
  sixteenth: '16',
}

/**
 * Intent: map a notated duration and rest flag to a VexFlow duration code, for example 'qdr'. The
 * dot is encoded in the code itself (not only via a Dot modifier) because VexFlow derives a note's
 * tick length from the duration code, and an undotted code would under-count a dotted note's ticks.
 */
function mapDurationCode(duration: NotatedDuration, isRest: boolean): string {
  const dotCode = duration.dots === 1 ? 'd' : ''
  return `${DURATION_CODES[duration.value]}${dotCode}${isRest ? 'r' : ''}`
}

const ACCIDENTAL_CODES: Readonly<Record<DisplayedAccidental, string>> = {
  'double-flat': 'bb',
  flat: 'b',
  natural: 'n',
  sharp: '#',
  'double-sharp': '##',
}

/**
 * Build one StaveNote glyph for a written note or rest event verbatim: pitch/rest position,
 * duration and dot come straight from the model; the displayed accidental (if any) is attached
 * as-is, never recomputed.
 */
// @spec-link [[module_notation_display_convention]]
export function buildStaveNote(event: WrittenEvent): StaveNote {
  const isRest = event.kind === 'rest'
  const struct: StaveNoteStruct = {
    keys: [isRest ? restKey(event.duration) : mapPitchKey(event.pitch)],
    duration: mapDurationCode(event.duration, isRest),
  }
  const note = new StaveNote(struct)

  if (event.kind === 'note' && event.accidental !== null) {
    note.addModifier(new Accidental(ACCIDENTAL_CODES[event.accidental]))
  }
  if (event.duration.dots === 1) {
    Dot.buildAndAttach([note])
  }
  return note
}

/** Intent: append a root/bass spelled pitch class (letter plus accidental glyph) to a chord symbol. */
function addSpelledPitchClass(chordSymbol: ChordSymbol, pitchClass: SpelledPitchClass): void {
  chordSymbol.addText(pitchClass.letter)
  const suffix = alterSuffix(pitchClass.alter)
  if (suffix.length > 0) chordSymbol.addGlyphOrText(suffix)
}

/**
 * Build one ChordSymbol modifier verbatim from a written chord symbol: root letter, root
 * accidental glyph, suffix text and an optional slash bass, positioned above the staff.
 */
// @spec-link [[module_notation_display_convention]]
export function buildChordSymbol(chord: WrittenChordSymbol): ChordSymbol {
  const chordSymbol = new ChordSymbol()
  addSpelledPitchClass(chordSymbol, chord.root)
  if (chord.suffix.length > 0) chordSymbol.addText(chord.suffix)
  if (chord.bass !== null) {
    chordSymbol.addText('/')
    addSpelledPitchClass(chordSymbol, chord.bass)
  }
  chordSymbol.setVertical(ChordSymbol.VerticalJustify.TOP)
  return chordSymbol
}

/**
 * Attach every measure's chord symbols to the glyph sharing its startTick, and every note's dot
 * to its own glyph (dots and accidentals already applied by buildStaveNote); this only wires the
 * chord-symbol modifiers since they depend on the whole measure, not a single event.
 */
export function attachMeasureChordSymbols(
  measure: WrittenMeasure,
  glyphs: readonly StaveNote[],
): void {
  for (const chord of measure.chords) {
    const eventIndex = measure.events.findIndex((event) => event.startTick === chord.startTick)
    if (eventIndex === -1) {
      throw new Error(`Chord symbol startTick ${chord.startTick} matches no event in the measure.`)
    }
    glyphs[eventIndex]!.addModifier(buildChordSymbol(chord))
  }
}

/** Intent: build one Beam per written beam group, from the glyphs at its listed event indices. */
export function buildMeasureBeams(measure: WrittenMeasure, glyphs: readonly StaveNote[]): Beam[] {
  return measure.beamGroups.map((group) => new Beam(group.map((index) => glyphs[index]!)))
}

/** One glyph plus the tie flags of the written event it came from, flattened across all measures. */
export interface FlatGlyph {
  readonly glyph: StaveNote
  readonly tieToNext: boolean
}

/**
 * Build one StaveTie for every glyph whose written event has `tieToNext`, connecting it to the
 * immediately following glyph in phrase order (including across a barline within the system).
 */
export function buildPhraseTies(flatGlyphs: readonly FlatGlyph[]): StaveTie[] {
  const ties: StaveTie[] = []
  for (let index = 0; index < flatGlyphs.length - 1; index += 1) {
    const current = flatGlyphs[index]!
    if (!current.tieToNext) continue
    ties.push(
      new StaveTie({
        firstNote: current.glyph,
        lastNote: flatGlyphs[index + 1]!.glyph,
      }),
    )
  }
  return ties
}

/**
 * Build the phrase's ties for the two-system phone layout: identical to `buildPhraseTies` except
 * the one tie crossing `lineBreakGlyphIndex` (the last glyph of line one tying into the first
 * glyph of line two) is split into two partial StaveTies -- one hanging from the line-one glyph to
 * its own stave's right edge (`firstNote` only), the other hanging from the line-two glyph back to
 * its own stave's left edge (`lastNote` only) -- so no single curve is ever drawn spanning back
 * across the SVG between the two lines.
 */
// @spec-link [[module_notation_layout_preflight]]
export function buildPhraseTiesTwoSystem(
  flatGlyphs: readonly FlatGlyph[],
  lineBreakGlyphIndex: number,
): StaveTie[] {
  const ties: StaveTie[] = []
  for (let index = 0; index < flatGlyphs.length - 1; index += 1) {
    const current = flatGlyphs[index]!
    if (!current.tieToNext) continue
    if (index + 1 === lineBreakGlyphIndex) {
      ties.push(new StaveTie({ firstNote: current.glyph }))
      ties.push(new StaveTie({ lastNote: flatGlyphs[index + 1]!.glyph }))
      continue
    }
    ties.push(
      new StaveTie({
        firstNote: current.glyph,
        lastNote: flatGlyphs[index + 1]!.glyph,
      }),
    )
  }
  return ties
}
