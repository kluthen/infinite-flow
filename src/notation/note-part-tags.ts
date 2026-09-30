/**
 * Writes note identities onto an engraved system's SVG, with no engraving library involved: the
 * engraver hands over, per note glyph, where its own parts were drawn (the DOM ids of its notehead
 * group, stem group and chord symbols, the glyph texts of its notehead, accidentals and dots, and
 * whether it drew a flag), and this file tags those parts in place. Every tagged part is a `<g>`,
 * so the note-ack class a later overlay adds recolours it by inheritance without ever reaching a
 * bare `<text>`. Wrapping a glyph text in an attribute-less group changes no pixel: the text keeps
 * its own presentation attributes and inherits the same values through the new group.
 */
import type { ExpectedNoteIdentity } from '../domain/acknowledgement/expected-note'
import { noteIdentityKey } from './note-identity'

const SVG_NS = 'http://www.w3.org/2000/svg'

/** A tagged part's kind, the value of its `data-note-part` attribute. */
export type NotePartName = 'notehead' | 'stem' | 'flag' | 'accidental' | 'dot'

/**
 * Where one note glyph's own parts were drawn in its system's SVG. Ids are the DOM ids of the
 * drawn groups; texts are the glyph strings of the bare texts drawn inside the notehead group.
 */
export interface NotePartRefs {
  /** The glyph's `g.vf-stavenote` group, which holds its ledger lines, own stem, notehead, flag. */
  readonly stavenoteDomId: string
  /** The glyph's `g.vf-notehead` group: its notehead text, accidental and dot texts, chord symbols. */
  readonly noteheadDomId: string
  readonly noteheadText: string
  /** The glyph's `g.vf-stem` group (inside the beam's group for a beamed note), or null if none. */
  readonly stemDomId: string | null
  /** Whether the glyph drew its own `g.vf-flag` (an unbeamed flagged note). */
  readonly hasFlag: boolean
  readonly accidentalTexts: readonly string[]
  readonly dotTexts: readonly string[]
  /** The glyph's `g.vf-chordsymbol` groups, drawn inside its notehead group. */
  readonly chordSymbolDomIds: readonly string[]
}

/** One note glyph of a system: its parts, the attack it sounds as, and whether it is that attack. */
export interface TaggedNoteGlyph {
  readonly parts: NotePartRefs
  readonly identity: ExpectedNoteIdentity
  readonly isAttack: boolean
}

/** Intent: find one drawn element by DOM id inside the SVG, crashing if the engraving lacks it. */
function requireById(svg: SVGSVGElement, domId: string): Element {
  const element = svg.querySelector(`[id="${domId}"]`)
  if (element === null) throw new Error(`Engraved SVG has no element with id "${domId}".`)
  return element
}

/** Intent: mark one part group with its identity key and part name. */
function markPart(group: Element, key: string, part: NotePartName): void {
  group.setAttribute('data-note-id', key)
  group.setAttribute('data-note-part', part)
}

/** Intent: wrap a bare glyph text in a new attribute-less `<g>` at the same place, and tag it. */
function wrapAndMark(text: Element, key: string, part: NotePartName): void {
  const group = document.createElementNS(SVG_NS, 'g')
  text.replaceWith(group)
  group.appendChild(text)
  markPart(group, key, part)
}

/**
 * Intent: name each bare text of a notehead group as the notehead, an accidental or a dot, by its
 * glyph string. The notehead text is drawn first; every expected accidental and dot must be found
 * exactly once, and any other bare text is an engraving this file does not understand.
 */
function classifyNoteheadTexts(
  noteheadGroup: Element,
  parts: NotePartRefs,
): [Element, NotePartName][] {
  const texts = Array.from(noteheadGroup.children).filter((child) => child.tagName === 'text')
  const [first, ...rest] = texts
  if (first === undefined || first.textContent !== parts.noteheadText) {
    throw new Error(
      `Notehead group "${parts.noteheadDomId}" does not open with its notehead glyph.`,
    )
  }
  const accidentals = [...parts.accidentalTexts]
  const dots = [...parts.dotTexts]
  const named: [Element, NotePartName][] = [[first, 'notehead']]
  for (const text of rest) {
    const glyph = text.textContent ?? ''
    const accidentalIndex = accidentals.indexOf(glyph)
    const dotIndex = dots.indexOf(glyph)
    if (accidentalIndex >= 0) {
      accidentals.splice(accidentalIndex, 1)
      named.push([text, 'accidental'])
    } else if (dotIndex >= 0) {
      dots.splice(dotIndex, 1)
      named.push([text, 'dot'])
    } else {
      throw new Error(
        `Notehead group "${parts.noteheadDomId}" holds an unexpected text "${glyph}".`,
      )
    }
  }
  if (accidentals.length > 0 || dots.length > 0) {
    throw new Error(`Notehead group "${parts.noteheadDomId}" lacks an accidental or dot it drew.`)
  }
  return named
}

/**
 * Intent: tag one note glyph's own parts with its attack's key: its notehead, accidental and dot
 * texts wrapped each in a tagged group, its stem group (wherever the stem was drawn) and its flag
 * group; and, for an attack only, mark each attached chord symbol group with `data-chord-for`.
 * Ledger lines, beams, ties, the stavenote and notehead groups and chord symbols carry no identity.
 */
function tagNoteGlyph(svg: SVGSVGElement, glyph: TaggedNoteGlyph): void {
  const { parts } = glyph
  const key = noteIdentityKey(glyph.identity)
  const noteheadGroup = requireById(svg, parts.noteheadDomId)
  for (const [text, part] of classifyNoteheadTexts(noteheadGroup, parts)) {
    wrapAndMark(text, key, part)
  }
  if (parts.stemDomId !== null) markPart(requireById(svg, parts.stemDomId), key, 'stem')
  if (parts.hasFlag) {
    const flags = requireById(svg, parts.stavenoteDomId).querySelectorAll(':scope > g.vf-flag')
    if (flags.length !== 1) {
      throw new Error(`Stavenote "${parts.stavenoteDomId}" drew ${flags.length} flags, not one.`)
    }
    markPart(flags[0]!, key, 'flag')
  }
  for (const chordSymbolId of parts.chordSymbolDomIds) {
    const chordSymbol = requireById(svg, chordSymbolId)
    if (glyph.isAttack) chordSymbol.setAttribute('data-chord-for', key)
  }
}

/**
 * Tag every note glyph drawn in one system's SVG with the identity of the attack it sounds as
 * (`data-note-id="<phrase>:<measure>:<event>"`, `data-note-part`), so overlays can address a note's
 * own ink. Crashes on an engraving whose structure does not match the parts the engraver reported.
 */
// @spec-link [[module_notation_note_identity_overlays]]
export function tagSystemNoteParts(svg: SVGSVGElement, glyphs: readonly TaggedNoteGlyph[]): void {
  for (const glyph of glyphs) tagNoteGlyph(svg, glyph)
}
