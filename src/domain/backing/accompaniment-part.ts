/**
 * The shape every system voice of a phrase takes beside its lead: a part, with its voice, its
 * accompaniment role, its mix channel and its notes; each note a start and a length in whole notes
 * from the phrase's start, a concert pitch or a drum sound, and a velocity. Also the conversion of
 * the backing renderer's and the guide renderer's notes, whose own output types stay as they are,
 * into parts of this shape, and the phrase an arranger renders parts from.
 */

import type { ConcertPitch } from '../events/concert-pitch'
import { deepFreeze } from '../events/deep-freeze'
import type { ConcertEventTimeline } from '../events/timeline'
import { PHRASE_MEASURE_COUNT } from '../generation/generation-request-envelope'
import type { HarmonyCollection, HarmonyEvent } from '../harmony/harmony-types'
import type { RegisterId } from '../profile/register-id'
import type { RegisterWindow } from '../profile/register-window'
import type { Seed } from '../random/seed'
import { addRational, compareRational, makeRational, type Rational } from '../time/rational'
import type { BackingNote, RenderedBacking } from './backing-renderer'
import type { GuideNote, RenderedGuide } from './guide-renderer'
import type { LeadFacts } from './lead-facts'

/**
 * Every system voice of a phrase, in the fixed order a rendered accompaniment lists its parts:
 * the backing's two voices, the two guides, then the four accompaniment parts.
 */
// @spec-link [[entity_accompaniment_part]]
export const ACCOMPANIMENT_VOICES = [
  'bass',
  'chords',
  'melody-guide',
  'rhythm-guide',
  'thirds',
  'counter-melody',
  'fills',
  'drums',
] as const

/** One system voice of a phrase. */
// @spec-link [[entity_accompaniment_part]]
export type AccompanimentVoice = (typeof ACCOMPANIMENT_VOICES)[number]

/** The four accompaniment parts' voices, in their part order, each computed by its own function. */
// @spec-link [[req_accompaniment_parts]]
export const PART_VOICES = ['thirds', 'counter-melody', 'fills', 'drums'] as const

/** One of the four accompaniment parts' voices. */
// @spec-link [[req_accompaniment_parts]]
export type PartVoice = (typeof PART_VOICES)[number]

/** The job a voice does for the lead; the guides play the lead itself and have a role of their own. */
// @spec-link [[req_accompaniment_parts]]
export type AccompanimentRole =
  'foundation' | 'guide' | 'highlighting' | 'contrasting' | 'responding'

/** The mix channel a voice plays into: the backing's two voices share one. */
// @spec-link [[entity_accompaniment_part]]
export type PartMixChannel =
  'backing' | 'melody-guide' | 'rhythm-guide' | 'thirds' | 'counter-melody' | 'fills' | 'drums'

/** Each voice's role and mix channel, as data. */
// @spec-link [[entity_accompaniment_part]]
// @spec-link [[req_accompaniment_parts]]
export const VOICE_PLACES: Readonly<
  Record<AccompanimentVoice, { readonly role: AccompanimentRole; readonly channel: PartMixChannel }>
> = deepFreeze({
  bass: { role: 'foundation', channel: 'backing' },
  chords: { role: 'foundation', channel: 'backing' },
  'melody-guide': { role: 'guide', channel: 'melody-guide' },
  'rhythm-guide': { role: 'guide', channel: 'rhythm-guide' },
  thirds: { role: 'highlighting', channel: 'thirds' },
  'counter-melody': { role: 'contrasting', channel: 'counter-melody' },
  fills: { role: 'responding', channel: 'fills' },
  drums: { role: 'foundation', channel: 'drums' },
})

/** The three drum sounds a drum note can sound. */
// @spec-link [[entity_accompaniment_part]]
export const DRUM_SOUNDS = ['kick', 'snare', 'closed-hi-hat'] as const

/** One drum sound. */
// @spec-link [[entity_accompaniment_part]]
export type DrumSound = (typeof DRUM_SOUNDS)[number]

/** What a part note sounds: a concert pitch, or a drum sound for the drums. */
// @spec-link [[entity_accompaniment_part]]
export type PartSound =
  | { readonly kind: 'pitch'; readonly pitch: ConcertPitch }
  | { readonly kind: 'drum'; readonly drum: DrumSound }

/** One note of a part: start and length in whole notes from the phrase's start, sound, velocity. */
// @spec-link [[entity_accompaniment_part]]
export interface PartNote {
  readonly start: Rational
  readonly duration: Rational
  readonly sound: PartSound
  readonly velocity: number
}

/** One part of a phrase's accompaniment: its voice, role, mix channel and notes in start order. */
// @spec-link [[entity_accompaniment_part]]
export interface AccompanimentPart {
  readonly voice: AccompanimentVoice
  readonly role: AccompanimentRole
  readonly channel: PartMixChannel
  readonly notes: readonly PartNote[]
}

/** A phrase's rendered accompaniment: one part per voice, in `ACCOMPANIMENT_VOICES` order. */
// @spec-link [[entity_accompaniment_part]]
export type RenderedAccompaniment = readonly AccompanimentPart[]

/**
 * The register window a phrase's lead stays inside: the instrument's window it was generated in
 * (resolved, never Varying) and that window's inclusive concert-MIDI bounds.
 */
// @spec-link [[module_accompaniment_arranger]]
export interface PhraseWindow {
  readonly register: RegisterId
  readonly range: RegisterWindow
}

/**
 * Everything a phrase's parts are rendered from: its concert timeline (the lead), its harmony
 * events, its register window, its scale (the collection of its concert key and mode) and its seed.
 */
// @spec-link [[module_accompaniment_arranger]]
// @spec-link [[rule_parts_rendered_from_phrase_alone]]
export interface ArrangerPhrase {
  readonly timeline: ConcertEventTimeline
  readonly harmony: readonly HarmonyEvent[]
  readonly window: PhraseWindow
  readonly scale: HarmonyCollection
  readonly seed: Seed
}

/** One accompaniment part's function: the phrase and its lead facts to the part's notes. */
// @spec-link [[module_accompaniment_arranger]]
export type PartRenderer = (phrase: ArrangerPhrase, lead: LeadFacts) => readonly PartNote[]

/** The velocity of the backing's notes in their parts: the MIDI export's backing velocity. */
// @spec-link [[entity_accompaniment_part]]
export const BACKING_PART_VELOCITY = 72

/** The velocity of the guides' notes in their parts. */
// @spec-link [[entity_accompaniment_part]]
export const GUIDE_PART_VELOCITY = 64

/** Typed failure for a part or part note outside the part shape; never repaired. */
// @spec-link [[entity_accompaniment_part]]
export class AccompanimentPartError extends Error {
  readonly kind = 'AccompanimentPartError' as const

  constructor(message: string) {
    super(message)
    this.name = 'AccompanimentPartError'
  }
}

/**
 * Build one frozen part note. Throws an AccompanimentPartError on a start before the phrase, a
 * length that is not positive, an end after the phrase's four measures, a velocity that is not a
 * MIDI note-on velocity (an integer 1-127) or a drum sound not among `DRUM_SOUNDS`.
 */
// @spec-link [[entity_accompaniment_part]]
export function makePartNote(
  start: Rational,
  duration: Rational,
  sound: PartSound,
  velocity: number,
): PartNote {
  const at = `part note at ${start.numerator}/${start.denominator}`
  if (compareRational(start, ZERO) < 0) {
    throw new AccompanimentPartError(`${at}: it starts before the phrase`)
  }
  if (compareRational(duration, ZERO) <= 0) {
    throw new AccompanimentPartError(
      `${at}: its length ${duration.numerator}/${duration.denominator} is not positive`,
    )
  }
  if (compareRational(addRational(start, duration), PHRASE_LENGTH) > 0) {
    throw new AccompanimentPartError(`${at}: it ends after the phrase`)
  }
  if (!Number.isInteger(velocity) || velocity < 1 || velocity > MAX_VELOCITY) {
    throw new AccompanimentPartError(`${at}: velocity ${velocity} is not an integer 1-127`)
  }
  if (sound.kind === 'drum' && !DRUM_SOUNDS.includes(sound.drum)) {
    throw new AccompanimentPartError(`${at}: ${String(sound.drum)} is not a drum sound`)
  }
  return deepFreeze({ start, duration, sound: { ...sound }, velocity })
}

const ZERO = makeRational(0, 1)
const PHRASE_LENGTH = makeRational(PHRASE_MEASURE_COUNT, 1)
const MAX_VELOCITY = 127

/**
 * Build one frozen part of `voice` from its notes, with the voice's role and mix channel. Throws
 * an AccompanimentPartError when the notes are not in start order, or when a drum part holds a
 * pitched note or another part a drum note. An empty part is valid.
 */
// @spec-link [[entity_accompaniment_part]]
// @spec-link [[rule_part_rests_when_no_note_fits]]
export function makeAccompanimentPart(
  voice: AccompanimentVoice,
  notes: readonly PartNote[],
): AccompanimentPart {
  const soundKind = voice === 'drums' ? 'drum' : 'pitch'
  notes.forEach((note, index) => {
    if (note.sound.kind !== soundKind) {
      throw new AccompanimentPartError(`${voice} part: note ${index} is not a ${soundKind} note`)
    }
    if (index > 0 && compareRational(notes[index - 1]!.start, note.start) > 0) {
      throw new AccompanimentPartError(
        `${voice} part: note ${index} starts before the one before it`,
      )
    }
  })
  return deepFreeze({ voice, ...VOICE_PLACES[voice], notes: [...notes] })
}

/** A renderer's notes as part notes, each at its pitch, start and length, at `velocity`. */
function pitchedPartNotes(
  notes: readonly (BackingNote | GuideNote)[],
  velocity: number,
): PartNote[] {
  return notes.map((note) =>
    makePartNote(note.start, note.duration, { kind: 'pitch', pitch: note.pitch }, velocity),
  )
}

/**
 * The backing renderer's notes as the bass part and the chords part, each note unchanged in
 * pitch, start and length, at `BACKING_PART_VELOCITY`.
 */
// @spec-link [[entity_accompaniment_part]]
export function backingParts(
  backing: RenderedBacking,
): readonly [AccompanimentPart, AccompanimentPart] {
  return [
    makeAccompanimentPart('bass', pitchedPartNotes(backing.bass, BACKING_PART_VELOCITY)),
    makeAccompanimentPart('chords', pitchedPartNotes(backing.chords, BACKING_PART_VELOCITY)),
  ]
}

/**
 * The guide renderer's notes as the melody guide part and the rhythm guide part, each note
 * unchanged in pitch, start and length, at `GUIDE_PART_VELOCITY`.
 */
// @spec-link [[entity_accompaniment_part]]
export function guideParts(guide: RenderedGuide): readonly [AccompanimentPart, AccompanimentPart] {
  return [
    makeAccompanimentPart('melody-guide', pitchedPartNotes(guide.melody, GUIDE_PART_VELOCITY)),
    makeAccompanimentPart('rhythm-guide', pitchedPartNotes(guide.rhythm, GUIDE_PART_VELOCITY)),
  ]
}
