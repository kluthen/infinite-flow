/**
 * A minimal Standard MIDI File scan for the Review export specs: every note-on (velocity above 0)
 * of every track, in file order, so a spec can tell which notes a downloaded file holds, and the
 * markers of the first track (the conductor track) with their ticks. It reads
 * delta times, running status, meta and SysEx events as the format allows, and throws on a chunk
 * it does not expect or data that runs past the end.
 */

/** One note-on: its key and velocity. */
export interface SmfNoteOn {
  readonly pitch: number
  readonly velocity: number
}

/** Intent: the big-endian unsigned integer of `length` bytes at `at`. */
function uint(bytes: Uint8Array, at: number, length: number): number {
  if (at + length > bytes.length) throw new Error('SMF: unexpected end of data.')
  let value = 0
  for (let index = 0; index < length; index += 1) value = value * 256 + bytes[at + index]!
  return value
}

/** Intent: the chunk name of four ASCII bytes at `at`. */
function chunkName(bytes: Uint8Array, at: number): string {
  return String.fromCharCode(...bytes.subarray(at, at + 4))
}

/** A variable-length quantity's value, and the position after it. */
interface VarLength {
  readonly value: number
  readonly next: number
}

/** Intent: the variable-length quantity at `at` (at most four bytes, as the format allows). */
function varLength(bytes: Uint8Array, at: number): VarLength {
  let value = 0
  for (let position = at; position < at + 4; position += 1) {
    const byte = uint(bytes, position, 1)
    value = value * 128 + (byte & 0x7f)
    if ((byte & 0x80) === 0) return { value, next: position + 1 }
  }
  throw new Error('SMF: a variable-length quantity longer than four bytes.')
}

/** Intent: the note-ons of one track's event data, from `start` to `end`. */
function trackNoteOns(bytes: Uint8Array, start: number, end: number): SmfNoteOn[] {
  const noteOns: SmfNoteOn[] = []
  let position = start
  let status = 0
  while (position < end) {
    position = varLength(bytes, position).next
    const first = uint(bytes, position, 1)
    if (first === 0xff || first === 0xf0 || first === 0xf7) {
      const skip = varLength(bytes, position + (first === 0xff ? 2 : 1))
      position = skip.next + skip.value
      continue
    }
    if (first & 0x80) {
      status = first
      position += 1
    }
    const kind = status & 0xf0
    const dataLength = kind === 0xc0 || kind === 0xd0 ? 1 : 2
    if (kind === 0x90 && uint(bytes, position + 1, 1) > 0) {
      noteOns.push({ pitch: uint(bytes, position, 1), velocity: uint(bytes, position + 1, 1) })
    }
    position += dataLength
  }
  return noteOns
}

/** Intent: every note-on of the file `bytes`, track by track in file order. */
// @test-link [[req_played_notes_export]]
export function smfNoteOns(bytes: Uint8Array): SmfNoteOn[] {
  if (chunkName(bytes, 0) !== 'MThd') throw new Error('SMF: no header chunk.')
  let position = 8 + uint(bytes, 4, 4)
  const noteOns: SmfNoteOn[] = []
  while (position < bytes.length) {
    if (chunkName(bytes, position) !== 'MTrk') throw new Error('SMF: a chunk that is not a track.')
    const end = position + 8 + uint(bytes, position + 4, 4)
    if (end > bytes.length) throw new Error('SMF: a track runs past the end.')
    noteOns.push(...trackNoteOns(bytes, position + 8, end))
    position = end
  }
  return noteOns
}

/** One marker of the conductor track: its tick from the file's start, and its text. */
export interface SmfMarker {
  readonly tick: number
  readonly text: string
}

/** The meta event type of a marker. */
const MARKER = 0x06

/** Intent: the position after the channel event whose data starts at `at` under `status`. */
function afterChannelEvent(status: number, at: number): number {
  const kind = status & 0xf0
  return at + (kind === 0xc0 || kind === 0xd0 ? 1 : 2)
}

/** Intent: every marker of the file's first track, in file order, with its tick. */
export function smfMarkers(bytes: Uint8Array): SmfMarker[] {
  if (chunkName(bytes, 0) !== 'MThd') throw new Error('SMF: no header chunk.')
  const start = 8 + uint(bytes, 4, 4)
  if (chunkName(bytes, start) !== 'MTrk') throw new Error('SMF: no first track.')
  const end = start + 8 + uint(bytes, start + 4, 4)
  const markers: SmfMarker[] = []
  let position = start + 8
  let tick = 0
  let status = 0
  while (position < end) {
    const delta = varLength(bytes, position)
    tick += delta.value
    position = delta.next
    const first = uint(bytes, position, 1)
    if (first === 0xff || first === 0xf0 || first === 0xf7) {
      const length = varLength(bytes, position + (first === 0xff ? 2 : 1))
      if (first === 0xff && uint(bytes, position + 1, 1) === MARKER) {
        const text = bytes.subarray(length.next, length.next + length.value)
        markers.push({ tick, text: new TextDecoder().decode(text) })
      }
      position = length.next + length.value
      continue
    }
    if (first & 0x80) {
      status = first
      position += 1
    }
    position = afterChannelEvent(status, position)
  }
  return markers
}
