/**
 * Pure 1:1 mapping helpers from the written-phrase model to VexFlow objects: pitch/duration
 * spelling into VexFlow key/duration codes, and the construction of individual StaveNote,
 * Accidental, Dot, ChordSymbol, Beam and StaveTie instances from the model's own fields. Nothing
 * here re-decides music (no auto-accidentals, no auto-beaming, no auto-stemming): every glyph,
 * accidental, stem direction, beam group and tie is taken verbatim from the WrittenPhrase. It
 * also reports where a drawn note's own parts are, for the note-identity tagging
 * (./note-part-tags.ts). Together with
 * ./vexflow-engraver.ts, ./vexflow-two-system-engraver.ts and ./vexflow-check-note-engraver.ts,
 * this is one of the only four files allowed to import 'vexflow'.
 */
import {
  Accidental,
  Beam,
  ChordSymbol,
  Dot,
  StaveNote,
  StaveTie,
  Stem,
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
import type { InstrumentClef } from '../domain/profile/instrument-clef'
import type { NotePartRefs } from './note-part-tags'

/** Where a clef's staff places its rests, as VexFlow keys read in that clef. */
interface ClefRestKeys {
  /** Every rest but a whole rest: the middle line. */
  readonly rest: string
  /** A whole rest, which by engraving convention hangs from the fourth line from the bottom. */
  readonly wholeRest: string
}

/**
 * The rest key positions for every notated rest, per clef: the middle line (written B4 in treble,
 * D3 in bass), except a whole rest, which hangs from the fourth line from the bottom (written D5
 * in treble, F3 in bass). The keys are read in the note's own clef, so both sit on the same lines.
 */
// @spec-link [[module_notation_display_convention]]
const REST_KEYS: Readonly<Record<InstrumentClef, ClefRestKeys>> = {
  treble: { rest: 'b/4', wholeRest: 'd/5' },
  bass: { rest: 'd/3', wholeRest: 'f/3' },
}

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

/**
 * Intent: choose the conventional vertical position for a rest of the given notated duration, on
 * the staff of `clef`.
 */
function restKey(duration: NotatedDuration, clef: InstrumentClef): string {
  const keys = REST_KEYS[clef]
  return duration.value === 'whole' ? keys.wholeRest : keys.rest
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

/** VexFlow's own ledger line width, in engraving units, kept so ledger lines draw as wide as ever. */
const LEDGER_LINE_WIDTH_UNITS = 2

/**
 * Intent: give a note's ledger lines no colour of their own, so they inherit the staff colour the
 * stylesheet sets, like every other drawn shape, in both themes. VexFlow builds a note's ledger
 * line style from its stave's own style (stroke #999999), then the stave's default ledger line
 * style (stroke #444, width 2), then the note's own, and writes the resulting stroke as an
 * attribute on every ledger line path; the stylesheet colours the score by inheritance only, which
 * never overrides an attribute the shape carries itself. An empty stroke style overrides both
 * greys and is skipped when VexFlow applies the style, so the drawing context keeps the stroke it
 * already had; VexFlow's SVG context writes a stroke attribute only when it differs from the
 * enclosing group's, and here it matches, so none is written. A note given its own style (through
 * setStyle) would lend that colour to its ledger lines; no note is given one.
 */
// @spec-link [[module_notation_note_identity_overlays]]
function inheritStaffColourOnLedgerLines(note: StaveNote): void {
  note.setLedgerLineStyle({ strokeStyle: '', lineWidth: LEDGER_LINE_WIDTH_UNITS })
}

/**
 * Build one StaveNote glyph for a written note or rest event verbatim, on the staff of `clef`:
 * pitch/rest position, duration, dot and a note's stem direction come straight from the model; the
 * glyph is given the clef, so VexFlow places its key on that clef's lines; the displayed accidental
 * (if any) is attached as-is, never recomputed. The stem direction is set in the constructor
 * struct, never by `autoStem` and never later through `setStemDirection` (which would drop a beam
 * already attached), so `new Beam(...)` finds it preset. A rest gets no stem direction. Every
 * engraved note, the score's and the check note's, is built here, so every ledger line inherits
 * the staff colour.
 */
// @spec-link [[module_notation_display_convention]]
// @spec-link [[module_notation_stem_direction]]
export function buildStaveNote(event: WrittenEvent, clef: InstrumentClef): StaveNote {
  const isRest = event.kind === 'rest'
  const struct: StaveNoteStruct = {
    keys: [isRest ? restKey(event.duration, clef) : mapPitchKey(event.pitch)],
    duration: mapDurationCode(event.duration, isRest),
    clef,
    ...(isRest ? {} : { stemDirection: event.stemDirection === 'down' ? Stem.DOWN : Stem.UP }),
  }
  const note = new StaveNote(struct)
  inheritStaffColourOnLedgerLines(note)

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

/**
 * Intent: build one Beam per written beam group, from the glyphs at its listed event indices. No
 * `autoStem`: each beam keeps the stem direction its notes were built with, which the written
 * phrase made the same for the whole group.
 */
// @spec-link [[module_notation_stem_direction]]
export function buildMeasureBeams(measure: WrittenMeasure, glyphs: readonly StaveNote[]): Beam[] {
  return measure.beamGroups.map((group) => new Beam(group.map((index) => glyphs[index]!)))
}

/** One glyph plus the tie flags of the written event it came from, flattened across all measures. */
export interface FlatGlyph {
  readonly glyph: StaveNote
  readonly tieToNext: boolean
}

/**
 * Build the StaveTies one system draws, for the glyphs `[start, end)` of the phrase's flattened
 * glyphs (the whole phrase in the one-system layout; bars 1-2 or bars 3-4 in the split layout).
 * A tie between two glyphs of the system is one StaveTie. A tie crossing the system's edge becomes a
 * partial StaveTie in each system: the earlier system draws one hanging from its last glyph to its
 * stave's right edge (`firstNote` only), the later one draws one arriving at its first glyph from
 * its stave's left edge (`lastNote` only), since each system is its own SVG and no curve can span
 * two of them. The phrase's very last glyph never ties out: the phrase ends there.
 */
// @spec-link [[module_notation_layout_preflight]]
export function buildSystemTies(
  flatGlyphs: readonly FlatGlyph[],
  start: number,
  end: number,
): StaveTie[] {
  const ties: StaveTie[] = []
  if (start > 0 && flatGlyphs[start - 1]!.tieToNext) {
    ties.push(new StaveTie({ lastNote: flatGlyphs[start]!.glyph }))
  }
  for (let index = start; index < end; index += 1) {
    const current = flatGlyphs[index]!
    if (!current.tieToNext || index + 1 >= flatGlyphs.length) continue
    if (index + 1 === end) {
      ties.push(new StaveTie({ firstNote: current.glyph }))
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

/** Intent: the DOM id VexFlow's SVG context gives the group it opens for a drawn element. */
function drawnGroupId(element: { getAttribute(name: string): unknown }): string {
  return `vf-${String(element.getAttribute('id'))}`
}

/**
 * Report where a drawn note glyph's own parts are in its system's SVG, for the note-identity
 * tagging: its stavenote and notehead groups, its stem group (drawn inside the beam's group for a
 * beamed note), whether it drew a flag, the glyph strings of its notehead, accidental and dot
 * texts, and its chord symbol groups. Every written note is a single-key glyph.
 */
// @spec-link [[module_notation_note_identity_overlays]]
export function describeNoteParts(glyph: StaveNote): NotePartRefs {
  const noteHeads = glyph.noteHeads
  if (noteHeads.length !== 1) {
    throw new Error(`A written note glyph has ${noteHeads.length} noteheads, not one.`)
  }
  const noteHead = noteHeads[0]!
  let stemDomId: string | null = null
  if (glyph.hasStem()) {
    const stem = glyph.getStem()
    if (stem === undefined) throw new Error('A stemmed written note glyph has no stem to tag.')
    stemDomId = drawnGroupId(stem)
  }
  return {
    stavenoteDomId: drawnGroupId(glyph),
    noteheadDomId: drawnGroupId(noteHead),
    noteheadText: noteHead.getText(),
    stemDomId,
    hasFlag: glyph.shouldDrawFlag(),
    accidentalTexts: glyph.getModifiersByType(Accidental.CATEGORY).map((m) => m.getText()),
    dotTexts: glyph.getModifiersByType(Dot.CATEGORY).map((m) => m.getText()),
    chordSymbolDomIds: glyph.getModifiersByType(ChordSymbol.CATEGORY).map(drawnGroupId),
  }
}
