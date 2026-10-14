/**
 * Shared builders for the specs of a session played with my instrument: my instrument in bass
 * clef (written C2 to C5, sounding a minor third lower), the same instrument in treble clef (whose
 * generator-facing profile is the same), the session settings carrying its profile as data, a real
 * phrase 1 generated at Idle with that profile, and a real session recorded through the session
 * runner into a history drawn in the clef given.
 */

import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { createGenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import type { InstrumentClef } from '@/domain/profile/instrument-clef'
import { makeMyInstrument, type MyInstrument } from '@/domain/profile/my-instrument'
import { makeSeed } from '@/domain/random/seed'
import type { SessionHistory } from '@/session/session-history'
import type { SessionSettings, SessionStart } from '@/session/session-types'
import { BASE_CONTROLS, generateSuccess } from '../domain/generation/carry-in/carry-in-fixture'
import { recordRunnerSession } from './history-recording'

/** Intent: my instrument written C2 to C5 (MIDI 36 to 72), sounding a minor third lower. */
export function lowHorn(clef: InstrumentClef): MyInstrument {
  return makeMyInstrument({
    template: 'c-keyboard',
    name: 'My low horn',
    clef,
    writtenRange: { minMidi: 36, maxMidi: 72 },
    transposition: { octaves: 0, semitones: 3, direction: 'lower' },
  })
}

/** Intent: session settings for my instrument at 120 BPM, its profile carried as data. */
export function myInstrumentSettings(instrument: MyInstrument): SessionSettings {
  return {
    controls: makeGenerationControls({
      ...BASE_CONTROLS,
      tempo: 120,
      instrumentProfileId: 'my-instrument',
    }),
    musicalProfile: { musicalProfile: 'Neutral', isCustom: true },
    instrumentProfile: instrument.profile,
  }
}

/** Intent: a real phrase 1 generated at Idle under the settings, with their profile as data. */
export function myInstrumentPhraseOne(
  settings: SessionSettings,
  seed = 11,
): SessionStart['phraseOne'] {
  const intent = createGenerationIntent({
    requestId: makeRequestId(`my-instrument-phrase-1-${seed}`),
    seed: makeSeed(seed),
    controls: settings.controls,
    musicalProfile: settings.musicalProfile,
    ...(settings.instrumentProfile === undefined
      ? {}
      : { instrumentProfile: settings.instrumentProfile }),
  })
  return { intent, outcome: generateSuccess(intent) }
}

/**
 * Intent: a real session of `phraseCount` phrases played with my instrument, recorded through the
 * session runner into a history drawn in the instrument's clef.
 */
export function recordedMyInstrumentSession(
  instrument: MyInstrument,
  phraseCount: number,
): Promise<SessionHistory> {
  const settings = myInstrumentSettings(instrument)
  return recordRunnerSession({
    settings,
    phraseOne: myInstrumentPhraseOne(settings),
    firstSeed: 7100,
    phraseCount,
    clef: instrument.clef,
  })
}
