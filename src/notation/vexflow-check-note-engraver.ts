/**
 * The controller-connection check's one written note, engraved through the score's own pipeline:
 * a short treble staff with no key or time signature, holding one whole note spelled in C major
 * and built by the score's own StaveNote mapping (./vexflow-mapping.ts), in an SVG marked like a
 * score system (`staff-svg`, image role, an accessible name in the score description's words) so
 * the stylesheet recolours it like the score. The SVG is sized to the note: its height grows with
 * the note's ledger lines. Re-exported by ./vexflow-engraver.ts, so it ships in the lazy engraver
 * chunk; with that file, ./vexflow-mapping.ts and ./vexflow-two-system-engraver.ts, one of the
 * only four files allowed to import 'vexflow'.
 */
import { Formatter, Renderer, Stave, Voice } from 'vexflow/bravura'

import {
  displayedAccidentalOf,
  spellMidiInKey,
  spellWrittenKey,
} from '../domain/notation/pitch-spelling'
import type { Alter, SpelledPitch, WrittenNote } from '../domain/notation/written-phrase-types'
import { TICKS_PER_BAR } from '../domain/time/ticks'
import { NotationError } from './notation-error'
import {
  NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE,
  NOTATION_MAX_STAFF_SPACE_PX,
} from './notation-layout-policy'
import { buildStaveNote } from './vexflow-mapping'

/** The check note's scale: the score's largest staff space, so the lone note reads at a glance. */
const CHECK_NOTE_SCALE = NOTATION_MAX_STAFF_SPACE_PX / NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE

/** A wide scratch width (raw units) used only to measure where notes start after the clef. */
const SCRATCH_WIDTH_UNITS = 1000

/** Raw units of staff kept after the note, before the closing barline: two staff spaces. */
const TRAILING_UNITS = 20

/**
 * The treble clef's ink beyond the staff, in raw units (Bravura's G clef box): about 1.4 spaces
 * over the top line and 1.7 under the bottom line.
 */
const CLEF_INK_ABOVE_TOP_LINE_UNITS = 14
const CLEF_INK_BELOW_BOTTOM_LINE_UNITS = 17

/**
 * A whole note's ink around its staff position, in raw units, with the tallest accidental it may
 * carry: a flat reaches about 1.8 spaces over the notehead's centre, a sharp about 1.4 under it.
 */
const NOTE_INK_ABOVE_UNITS = 18
const NOTE_INK_BELOW_UNITS = 14

/** Clear room kept around the ink and the barlines' strokes, in raw units: half a staff space. */
const MARGIN_UNITS = 5

/** The lowest and highest MIDI note numbers. */
const MIDI_MIN = 0
const MIDI_MAX = 127

/** The written key the check note is spelled in: C major, so no key signature is drawn. */
const C_MAJOR = spellWrittenKey(0, 'Major')

/**
 * Each alteration in the spoken words the score's description uses for it
 * (src/domain/notation/score-description.ts), so the note is named as the score names it. Kept
 * here rather than imported, so naming the check note adds nothing to the entry chunk.
 */
const ALTER_WORDS: Readonly<Record<Alter, string>> = {
  [-2]: ' double flat',
  [-1]: ' flat',
  0: '',
  1: ' sharp',
  2: ' double sharp',
}

/** The SVG's drawn box in raw units: the viewBox, which may start above the stave's own y. */
interface CheckNoteBox {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** Intent: reject a value that is no MIDI note number, before anything is drawn. */
function assertMidiNote(writtenMidi: number): void {
  if (!Number.isInteger(writtenMidi) || writtenMidi < MIDI_MIN || writtenMidi > MIDI_MAX) {
    throw new RangeError(`Written MIDI note ${writtenMidi} is not an integer in 0-127.`)
  }
}

/** Intent: the note's accessible name, in the score description's words ("Written note C sharp 5"). */
function checkNoteLabel(pitch: SpelledPitch): string {
  return `Written note ${pitch.letter}${ALTER_WORDS[pitch.alter]} ${pitch.octave}`
}

/** Intent: the written model of the check's one note: a whole note, its accidental drawn if any. */
function checkNoteEvent(pitch: SpelledPitch): WrittenNote {
  return {
    kind: 'note',
    startTick: 0,
    duration: { value: 'whole', dots: 0, ticks: TICKS_PER_BAR },
    pitch,
    accidental: pitch.alter === 0 ? null : displayedAccidentalOf(pitch.alter),
    tieFromPrevious: false,
    tieToNext: false,
    sourceEventIndex: 0,
  }
}

/**
 * Intent: the box holding the staff, the clef and the note with its ledger lines and accidental,
 * from the formatted note's staff position, plus the margin on every side.
 */
function checkNoteBox(stave: Stave, noteY: number): CheckNoteBox {
  const top = Math.min(
    stave.getYForLine(0) - CLEF_INK_ABOVE_TOP_LINE_UNITS,
    noteY - NOTE_INK_ABOVE_UNITS,
  )
  const bottom = Math.max(
    stave.getYForLine(stave.getNumLines() - 1) + CLEF_INK_BELOW_BOTTOM_LINE_UNITS,
    noteY + NOTE_INK_BELOW_UNITS,
  )
  return {
    x: -MARGIN_UNITS,
    y: top - MARGIN_UNITS,
    width: stave.getWidth() + 2 * MARGIN_UNITS,
    height: bottom - top + 2 * MARGIN_UNITS,
  }
}

/**
 * Intent: draw the staff and the note into `target` and return the box they need. The stave is
 * built twice: once to measure where the note starts after the clef, then at its final width.
 */
function drawCheckNote(target: HTMLElement, pitch: SpelledPitch): CheckNoteBox {
  const note = buildStaveNote(checkNoteEvent(pitch))
  const voice = new Voice({ numBeats: 4, beatValue: 4 }).setStrict(true).addTickables([note])
  const noteWidth = new Formatter().joinVoices([voice]).preCalculateMinTotalWidth([voice])
  const leading = new Stave(0, 0, SCRATCH_WIDTH_UNITS).addClef('treble').getNoteStartX()

  const stave = new Stave(0, 0, leading + noteWidth + TRAILING_UNITS, { spaceAboveStaffLn: 0 })
  stave.addClef('treble')
  // The note's staff position is computed when it is given its stave, not by formatting.
  note.setStave(stave)
  new Formatter().joinVoices([voice]).formatToStave([voice], stave)
  const box = checkNoteBox(stave, note.getYs()[0]!)

  const renderer = new Renderer(target as HTMLDivElement, Renderer.Backends.SVG)
  const context = renderer.getContext()
  stave.setContext(context).draw()
  voice.draw(context, stave)
  clearLedgerLineColour(target)
  return box
}

/**
 * Intent: drop the colour VexFlow writes on each ledger line (a whole note's only bare path in its
 * note group), so the line inherits the staff colour the stylesheet sets, as every other shape
 * does, in both themes.
 */
function clearLedgerLineColour(target: HTMLElement): void {
  for (const ledgerLine of target.querySelectorAll('g.vf-stavenote > path')) {
    ledgerLine.removeAttribute('stroke')
  }
}

/**
 * Intent: size and mark the drawn SVG like a score system: the `staff-svg` class the stylesheet
 * recolours, the image role, the accessible name, its pixel size and the viewBox of its box.
 */
function finishCheckNoteSvg(target: HTMLElement, box: CheckNoteBox, pitch: SpelledPitch): void {
  const svg = target.querySelector('svg')
  if (!svg) {
    throw new NotationError(
      'notation_container_unavailable',
      'VexFlow did not create an SVG root.',
      {},
    )
  }
  const widthPx = box.width * CHECK_NOTE_SCALE
  const heightPx = box.height * CHECK_NOTE_SCALE
  svg.setAttribute('class', 'staff-svg')
  svg.setAttribute('role', 'img')
  svg.setAttribute('aria-label', checkNoteLabel(pitch))
  svg.setAttribute('width', String(widthPx))
  svg.setAttribute('height', String(heightPx))
  svg.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`)
  svg.style.width = `${widthPx}px`
  svg.style.height = `${heightPx}px`
  svg.style.display = 'block'
  svg.style.overflow = 'visible'
}

/**
 * Engrave one written note into `target`, replacing its content: a whole note on a short treble
 * staff with no time signature and no key signature, spelled in C major (a black key as the sharp
 * of the letter below), its accidental drawn when the spelling has one. The SVG is a `staff-svg`
 * with role `img` and an accessible name in the score description's words ("Written note C 5",
 * "Written note C sharp 5"). Call it once `ensureNotationFonts()` has resolved, as the score does.
 * A value that is not an integer MIDI note number (0-127) is a caller error: it throws a
 * RangeError before `target` is touched. Should drawing fail, `target` is left empty and the
 * failure is thrown as a NotationError (`notation_engraving_failed` for a non-NotationError).
 */
// @spec-link [[rule_controller_transposition_check]]
export function engraveCheckNote(target: HTMLElement, writtenMidi: number): void {
  assertMidiNote(writtenMidi)
  const pitch = spellMidiInKey(writtenMidi, C_MAJOR)
  target.replaceChildren()
  try {
    finishCheckNoteSvg(target, drawCheckNote(target, pitch), pitch)
  } catch (error) {
    target.replaceChildren()
    if (error instanceof NotationError) throw error
    throw new NotationError(
      'notation_engraving_failed',
      `VexFlow engraving failed: ${error instanceof Error ? error.message : String(error)}`,
      {},
      error,
    )
  }
}
