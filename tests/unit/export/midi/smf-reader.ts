/**
 * A small Standard MIDI File reader for the MIDI export specs. It reads a whole file back into its
 * header and its tracks of timed events, so a spec can check the notes, the tempo map and the
 * markers the encoder wrote without trusting the encoder's own byte helpers. It reads what the
 * format allows, running status and a note-on with velocity 0 as a note-off included, and throws
 * on anything malformed: a wrong chunk name, a chunk length that runs past the data, a track that
 * does not end with its end-of-track event, or bytes left over after the last chunk.
 */

/** One event of a track, at its absolute time in MIDI ticks from the start of the file. */
export type SmfEvent =
  | {
      readonly tick: number
      readonly kind: 'meta'
      readonly type: number
      readonly data: Uint8Array
    }
  | {
      readonly tick: number
      readonly kind: 'channel'
      readonly status: number
      readonly channel: number
      readonly data: readonly number[]
    }
  | { readonly tick: number; readonly kind: 'sysex'; readonly data: Uint8Array }

/** A whole file: the header fields and every track's events in file order. */
export interface SmfFile {
  readonly format: number
  readonly division: number
  readonly tracks: readonly (readonly SmfEvent[])[]
}

/** One sounding note, paired from its note-on and note-off. */
export interface SmfNote {
  readonly channel: number
  readonly pitch: number
  readonly velocity: number
  readonly startTick: number
  readonly endTick: number
}

/** A read cursor over the file's bytes that throws instead of reading past the end. */
class ByteCursor {
  position = 0

  constructor(private readonly bytes: Uint8Array) {}

  get atEnd(): boolean {
    return this.position >= this.bytes.length
  }

  byte(): number {
    if (this.position >= this.bytes.length) throw new Error('SMF: unexpected end of data.')
    return this.bytes[this.position++]!
  }

  peek(): number {
    if (this.position >= this.bytes.length) throw new Error('SMF: unexpected end of data.')
    return this.bytes[this.position]!
  }

  take(length: number): Uint8Array {
    if (this.position + length > this.bytes.length) {
      throw new Error(`SMF: ${length} bytes requested past the end of the data.`)
    }
    const slice = this.bytes.slice(this.position, this.position + length)
    this.position += length
    return slice
  }

  ascii(length: number): string {
    return String.fromCharCode(...this.take(length))
  }

  uint(length: number): number {
    let value = 0
    for (let index = 0; index < length; index++) value = value * 256 + this.byte()
    return value
  }

  variableLength(): number {
    let value = 0
    for (let count = 0; count < 4; count++) {
      const next = this.byte()
      value = value * 128 + (next & 0x7f)
      if ((next & 0x80) === 0) return value
    }
    throw new Error('SMF: a variable-length quantity is longer than four bytes.')
  }
}

/** The number of data bytes that follow a channel status byte. */
function channelDataLength(status: number): number {
  const kind = status & 0xf0
  return kind === 0xc0 || kind === 0xd0 ? 1 : 2
}

/** Read the events of one track chunk's body. */
function readTrack(body: Uint8Array): SmfEvent[] {
  const cursor = new ByteCursor(body)
  const events: SmfEvent[] = []
  let tick = 0
  let runningStatus: number | null = null
  let ended = false
  while (!cursor.atEnd) {
    if (ended) throw new Error('SMF: an event follows the end-of-track event.')
    tick += cursor.variableLength()
    const first = cursor.peek()
    if (first === 0xff) {
      cursor.byte()
      const type = cursor.byte()
      const data = cursor.take(cursor.variableLength())
      events.push({ tick, kind: 'meta', type, data })
      if (type === 0x2f) ended = true
    } else if (first === 0xf0 || first === 0xf7) {
      cursor.byte()
      events.push({ tick, kind: 'sysex', data: cursor.take(cursor.variableLength()) })
    } else {
      let status: number
      if ((first & 0x80) !== 0) {
        status = cursor.byte()
        runningStatus = status
      } else if (runningStatus !== null) {
        status = runningStatus
      } else {
        throw new Error('SMF: a data byte appears with no running status.')
      }
      const data = Array.from(cursor.take(channelDataLength(status)))
      events.push({ tick, kind: 'channel', status: status & 0xf0, channel: status & 0x0f, data })
    }
  }
  if (!ended) throw new Error('SMF: a track does not end with an end-of-track event.')
  return events
}

/** Intent: read a whole Standard MIDI File, throwing on any malformed structure. */
// @test-link [[rule_generated_notes_midi_export]]
export function readSmf(bytes: Uint8Array): SmfFile {
  const cursor = new ByteCursor(bytes)
  if (cursor.ascii(4) !== 'MThd') throw new Error('SMF: the file does not start with MThd.')
  const headerLength = cursor.uint(4)
  if (headerLength !== 6) throw new Error(`SMF: header length ${headerLength}, expected 6.`)
  const format = cursor.uint(2)
  const trackCount = cursor.uint(2)
  const division = cursor.uint(2)
  const tracks: SmfEvent[][] = []
  for (let index = 0; index < trackCount; index++) {
    if (cursor.ascii(4) !== 'MTrk') throw new Error(`SMF: chunk ${index} is not an MTrk chunk.`)
    tracks.push(readTrack(cursor.take(cursor.uint(4))))
  }
  if (!cursor.atEnd) throw new Error('SMF: bytes remain after the last track.')
  return { format, division, tracks }
}

/** Intent: the text of every meta event of `type` in a track, with its tick. */
export function metaTexts(
  track: readonly SmfEvent[],
  type: number,
): { tick: number; text: string }[] {
  return track.flatMap((event) =>
    event.kind === 'meta' && event.type === type
      ? [{ tick: event.tick, text: new TextDecoder().decode(event.data) }]
      : [],
  )
}

/** Intent: a track's tempo map, as microseconds per quarter note at each tempo event's tick. */
export function tempoMap(
  track: readonly SmfEvent[],
): { tick: number; microsecondsPerQuarter: number }[] {
  return track.flatMap((event) => {
    if (event.kind !== 'meta' || event.type !== 0x51) return []
    if (event.data.length !== 3) throw new Error('SMF: a tempo event does not hold 3 bytes.')
    const [high, middle, low] = Array.from(event.data)
    return [{ tick: event.tick, microsecondsPerQuarter: (high! << 16) | (middle! << 8) | low! }]
  })
}

/**
 * Intent: pair a track's note-ons with their note-offs into notes, in onset order. A note-on with
 * velocity 0 is a note-off. Throws on a note-off with nothing sounding, on a second note-on of a
 * pitch already sounding on the same channel, and on a note left sounding at the end.
 */
export function notesOf(track: readonly SmfEvent[]): SmfNote[] {
  const sounding = new Map<string, { velocity: number; startTick: number }>()
  const notes: SmfNote[] = []
  for (const event of track) {
    if (event.kind !== 'channel' || (event.status !== 0x90 && event.status !== 0x80)) continue
    const [pitch, velocity] = event.data as [number, number]
    const key = `${event.channel}:${pitch}`
    const isOn = event.status === 0x90 && velocity > 0
    if (isOn) {
      if (sounding.has(key)) throw new Error(`SMF: pitch ${pitch} is attacked while sounding.`)
      sounding.set(key, { velocity, startTick: event.tick })
    } else {
      const open = sounding.get(key)
      if (open === undefined) throw new Error(`SMF: pitch ${pitch} is released while silent.`)
      sounding.delete(key)
      notes.push({ channel: event.channel, pitch, ...open, endTick: event.tick })
    }
  }
  if (sounding.size > 0) throw new Error('SMF: a note is still sounding at the end of the track.')
  return notes.sort((a, b) => a.startTick - b.startTick || a.pitch - b.pitch)
}
