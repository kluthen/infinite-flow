/**
 * The input of the generated-notes MIDI encoder, and its boundary check. A session reaches the
 * encoder as its phrases in session order, each carrying only its session number, the concert
 * timeline that sounded, and the tempo it played at, plus, only when the player asks for it, the
 * backing's notes for each phrase. Nothing else can travel with it: in particular, no note the
 * player played. The generated-notes file never holds played notes; they leave the app only
 * through their own export. The check below rejects any extra field at run time, so the type and
 * the value agree on that.
 */
import type { ConcertPitch } from '@/domain/events/concert-pitch'
import type { ConcertEventTimeline } from '@/domain/events/timeline'
import { addRational, compareRational, makeRational, type Rational } from '@/domain/time/rational'

/** Typed failure for an encoder input that breaks the encoder's contract; never repaired. */
// @spec-link [[rule_generated_notes_midi_export]]
// @spec-link [[req_played_notes_export]]
export class MidiExportError extends Error {
  readonly kind = 'MidiExportError' as const

  constructor(message: string) {
    super(message)
    this.name = 'MidiExportError'
  }
}

/**
 * One phrase of the session as the MIDI export sees it: its session phrase number (1 for the first
 * phrase that sounded; a favorites-only file keeps each phrase's own), its concert timeline exactly
 * as generated, and its tempo in quarter notes per minute.
 */
// @spec-link [[rule_generated_notes_midi_export]]
// @spec-link [[req_session_export]]
export interface MidiSessionPhrase {
  readonly number: number
  readonly timeline: ConcertEventTimeline
  readonly tempo: number
}

/**
 * One backing note: its concert pitch, and its start and length in whole notes, the start counted
 * from the beginning of its phrase. The backing renderer produces these; the encoder only writes
 * them down.
 */
// @spec-link [[rule_generated_notes_midi_export]]
export interface MidiBackingNote {
  readonly pitch: ConcertPitch
  readonly start: Rational
  readonly duration: Rational
}

/** The backing notes of one phrase, under that phrase's session number. */
// @spec-link [[rule_generated_notes_midi_export]]
export interface MidiBackingPhrase {
  readonly number: number
  readonly notes: readonly MidiBackingNote[]
}

/**
 * The whole encoder input: the phrases the file holds (every phrase that sounded, or the
 * favorites only), in session order, and the backing: `null` when the player left it off (the
 * default), or one entry per phrase, in the same order and with the same numbers, when they asked
 * for it. It has no field for played notes, and the run-time check rejects one.
 */
// @spec-link [[rule_generated_notes_midi_export]]
// @spec-link [[req_session_export]]
// @spec-link [[rule_export_contents_never_merged]]
export interface GeneratedNotesMidiInput {
  readonly phrases: readonly MidiSessionPhrase[]
  readonly backing: readonly MidiBackingPhrase[] | null
}

/**
 * The tempo range the export accepts, in quarter notes per minute: the Tempo control's range,
 * which adaptive tempo never leaves either. The file's time resolution keeps every onset within
 * 1 ms of its exact time from the slowest of these tempos up.
 */
const SLOWEST_BPM = 60
const FASTEST_BPM = 240
const MIDI_PITCH_MAX = 127
const PHRASE_LENGTH_WHOLE_NOTES = makeRational(4, 1)
const ZERO = makeRational(0, 1)

const INPUT_KEYS: readonly string[] = ['phrases', 'backing']
const PHRASE_KEYS: readonly string[] = ['number', 'timeline', 'tempo']
const BACKING_PHRASE_KEYS: readonly string[] = ['number', 'notes']
const BACKING_NOTE_KEYS: readonly string[] = ['pitch', 'start', 'duration']

/** Intent: crash early unless `value` has exactly the named own keys, no more and no fewer. */
// @spec-link [[rule_generated_notes_midi_export]]
// @spec-link [[req_played_notes_export]]
export function assertExactKeys(value: object, expected: readonly string[], what: string): void {
  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new MidiExportError(
      `${what} must have exactly the fields ${wanted.join(', ')}; got ${actual.join(', ')}.`,
    )
  }
}

/**
 * Intent: crash early unless a list's session numbers are whole numbers from 1 up, each greater
 * than the one before, as phrases come in session order: 1, 2, 3 … for a whole session, the
 * favorites' own numbers (2, 5, 6, say) for a favorites-only file.
 */
// @spec-link [[rule_generated_notes_midi_export]]
// @spec-link [[req_played_notes_export]]
// @spec-link [[rule_favorites_only_export]]
export function assertNumberedInOrder(
  items: readonly { readonly number: number }[],
  what: string,
): void {
  items.forEach((item, position) => {
    const floor = position === 0 ? 1 : items[position - 1]!.number + 1
    if (!Number.isInteger(item.number) || item.number < floor) {
      throw new MidiExportError(
        `${what} must be numbered from 1 up in session order, each above the one before; ` +
          `position ${position} holds number ${item.number}.`,
      )
    }
  })
}

/** Intent: crash early unless a phrase's tempo is a whole number of BPM in the accepted range. */
// @spec-link [[rule_generated_notes_midi_export]]
// @spec-link [[req_played_notes_export]]
export function assertTempo(phrase: { readonly number: number; readonly tempo: number }): void {
  const { tempo } = phrase
  if (!Number.isInteger(tempo) || tempo < SLOWEST_BPM || tempo > FASTEST_BPM) {
    throw new MidiExportError(
      `Phrase ${phrase.number} tempo must be a whole number from ${SLOWEST_BPM} to ` +
        `${FASTEST_BPM} BPM, got ${tempo}.`,
    )
  }
}

/**
 * Intent: crash early unless a backing note has a MIDI pitch, a positive length, and lies wholly
 * inside its four-measure phrase.
 */
function assertBackingNote(note: MidiBackingNote, phraseNumber: number): void {
  assertExactKeys(note, BACKING_NOTE_KEYS, `A backing note of phrase ${phraseNumber}`)
  const pitch: number = note.pitch
  if (!Number.isInteger(pitch) || pitch < 0 || pitch > MIDI_PITCH_MAX) {
    throw new MidiExportError(
      `Phrase ${phraseNumber} has a backing pitch ${pitch} outside the MIDI range 0 to 127.`,
    )
  }
  if (compareRational(note.duration, ZERO) <= 0) {
    throw new MidiExportError(`Phrase ${phraseNumber} has a backing note with no length.`)
  }
  const end = addRational(note.start, note.duration)
  if (
    compareRational(note.start, ZERO) < 0 ||
    compareRational(end, PHRASE_LENGTH_WHOLE_NOTES) > 0
  ) {
    throw new MidiExportError(`Phrase ${phraseNumber} has a backing note outside the phrase.`)
  }
}

/**
 * Intent: crash early when two backing notes of the same pitch overlap: one MIDI channel cannot
 * sound the same pitch twice at once, so the file could not say which release ends which note.
 * A note may start exactly where the same pitch ends.
 */
function assertNoSamePitchOverlap(notes: readonly MidiBackingNote[], phraseNumber: number): void {
  const ordered = [...notes].sort((a, b) => a.pitch - b.pitch || compareRational(a.start, b.start))
  ordered.forEach((note, index) => {
    const next = ordered[index + 1]
    if (next === undefined || next.pitch !== note.pitch) return
    if (compareRational(addRational(note.start, note.duration), next.start) > 0) {
      throw new MidiExportError(
        `Phrase ${phraseNumber} has two overlapping backing notes of pitch ${note.pitch}.`,
      )
    }
  })
}

/** Intent: crash early unless the backing holds one valid entry per phrase, numbered alike. */
function assertBacking(
  backing: readonly MidiBackingPhrase[],
  phrases: readonly MidiSessionPhrase[],
): void {
  if (backing.length !== phrases.length) {
    throw new MidiExportError(
      `The backing must hold one entry per phrase (${phrases.length}); got ${backing.length}.`,
    )
  }
  backing.forEach((phrase, position) => {
    assertExactKeys(phrase, BACKING_PHRASE_KEYS, `Backing entry at position ${position}`)
    if (phrase.number !== phrases[position]!.number) {
      throw new MidiExportError(
        `Backing entry at position ${position} is numbered ${phrase.number}, not ` +
          `${phrases[position]!.number} as its phrase.`,
      )
    }
  })
  for (const phrase of backing) {
    phrase.notes.forEach((note) => assertBackingNote(note, phrase.number))
    assertNoSamePitchOverlap(phrase.notes, phrase.number)
  }
}

/**
 * Intent: reject an encoder input that breaks the contract: an extra field anywhere (a
 * played-note list among them), an empty session, phrase numbers that are not whole numbers from 1
 * up, each above the one before, a tempo outside whole numbers from 60 to 240 BPM, or a backing that does not match the
 * phrases or holds a note the file could not represent.
 */
// @spec-link [[rule_generated_notes_midi_export]]
// @spec-link [[req_session_export]]
// @spec-link [[rule_export_contents_never_merged]]
export function validateMidiExportInput(input: GeneratedNotesMidiInput): void {
  assertExactKeys(input, INPUT_KEYS, 'The MIDI export input')
  if (input.phrases.length === 0) {
    throw new MidiExportError('A MIDI export needs at least one phrase.')
  }
  input.phrases.forEach((phrase, position) =>
    assertExactKeys(phrase, PHRASE_KEYS, `Phrase at position ${position}`),
  )
  assertNumberedInOrder(input.phrases, 'Phrases')
  input.phrases.forEach(assertTempo)
  if (input.backing !== null) assertBacking(input.backing, input.phrases)
}
