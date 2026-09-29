import { describe, expect, it } from 'vitest'

import {
  compensatePlayedNote,
  CONNECTION_LATENCY_SECONDS,
  latencyCorrectionFor,
  OUTPUT_LATENCY_SECONDS,
  PlayedOnsetError,
} from '@/domain/acknowledgement/played-onset-latency'
import { makeConcertPitch } from '@/domain/events/concert-pitch'

const C4 = makeConcertPitch(60)

// @test-link [[rule_played_onset_latency_compensation]]
describe('played onset latency compensation', () => {
  it('takes the output latency and the connection delay off the audio-clock time', () => {
    const played = compensatePlayedNote(
      { pitch: C4, audioClockSeconds: 10 },
      { outputLatencySeconds: 0.03, connectionLatencySeconds: 0.0125 },
    )

    expect(played.pitch).toBe(60)
    expect(played.onsetSeconds).toBeCloseTo(9.9575, 12)
  })

  it('ships named constants: no output correction yet, nothing for USB, 12.5 ms for Bluetooth LE', () => {
    expect(OUTPUT_LATENCY_SECONDS).toBe(0)
    expect(CONNECTION_LATENCY_SECONDS).toEqual({ usb: 0, 'bluetooth-le': 0.0125 })
  })

  it('builds the shipped correction for each connection type from those constants', () => {
    expect(latencyCorrectionFor('usb')).toEqual({
      outputLatencySeconds: OUTPUT_LATENCY_SECONDS,
      connectionLatencySeconds: 0,
    })
    expect(latencyCorrectionFor('bluetooth-le')).toEqual({
      outputLatencySeconds: OUTPUT_LATENCY_SECONDS,
      connectionLatencySeconds: 0.0125,
    })
  })

  it('judges a Bluetooth LE note that arrives 12.5 ms late at the moment it was played', () => {
    const played = compensatePlayedNote(
      { pitch: C4, audioClockSeconds: 2.0125 },
      latencyCorrectionFor('bluetooth-le'),
    )

    expect(played.onsetSeconds).toBeCloseTo(2 - OUTPUT_LATENCY_SECONDS, 12)
  })

  it.each([
    [{ pitch: C4, audioClockSeconds: Number.NaN }, latencyCorrectionFor('usb')],
    [
      { pitch: C4, audioClockSeconds: 1 },
      { outputLatencySeconds: -0.01, connectionLatencySeconds: 0 },
    ],
    [
      { pitch: C4, audioClockSeconds: 1 },
      { outputLatencySeconds: 0, connectionLatencySeconds: Number.POSITIVE_INFINITY },
    ],
  ])('rejects a time or correction that is not usable (%o, %o)', (noteOn, correction) => {
    expect(() => compensatePlayedNote(noteOn, correction)).toThrow(PlayedOnsetError)
  })
})
