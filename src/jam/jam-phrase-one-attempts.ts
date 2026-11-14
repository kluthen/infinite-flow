/**
 * What a fresh Jam's phrase 1 attempts are built from (master spec C5.7, C5.9, C7.1): at each end
 * of the doodle (a candidate end, or the end by length), the controls read from the doodle, the
 * steering block, the join from the doodle's last note and, with Jam's rhythm lock on, the lock
 * "on, nothing locked yet"; then the intent of each of the ladder's six attempts. Rung 1 (attempts
 * 0 to 3) joins the doodle and carries the block; rung 2 (attempt 4) carries the block and no
 * join; rung 3 (attempt 5) is v2's standalone phrase, with no block and no lock group, under the
 * same controls. The note density steps down from phrase 1 on narrow windows, and only down. Each
 * attempt's seed comes from the caller. Pure; part of Jam's code (src/jam/), loaded on demand.
 */
import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { resolveGeneratedNoteDensity } from '@/domain/controls/generated-note-density'
import type { QuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import { deepFreeze } from '@/domain/events/deep-freeze'
import { makeCarryInGenerationIntent } from '@/domain/generation/carry-in/carry-in-intent'
import {
  makeGenerationIntent,
  type GenerationIntent,
  type GenerationIntentInput,
} from '@/domain/generation/generation-intent'
import type { RequestId } from '@/domain/generation/generation-request-envelope'
import {
  makeRequestRhythmLock,
  type RequestRhythmLock,
} from '@/domain/generation/request-rhythm-lock'
import type { SteeringBlock } from '@/domain/generation/steering-block'
import { MY_INSTRUMENT_ID } from '@/domain/profile/instrument-profiles'
import { deriveRegisterWindowCandidates } from '@/domain/profile/register-window-derivation'
import type { Seed } from '@/domain/random/seed'
import { sessionInstrumentProfile } from '@/session/session-intents'
import type { SessionSettings } from '@/session/session-types'

import { readDoodleControls, type DoodleReadings } from './doodle-controls'
import { doodleJoin, type DoodleJoin } from './doodle-join'
import { suggestKeyAndMode, type KeySuggestion } from './key-suggestion/key-suggestion'
import { buildSteeringBlock, type JamDrift } from './steering-block-builder'

/**
 * The ladder's six attempts, by their index in the session seed plan: 0 rung 1's first attempt,
 * 1 to 3 its retries, 4 rung 2, 5 rung 3.
 */
// @spec-link [[rule_jam_phrase_one_failure_ladder]]
// @spec-link [[module_session_seed_plan]]
export type JamPhraseOneAttemptIndex = 0 | 1 | 2 | 3 | 4 | 5

/** The ladder's three rungs: the join and the block, the block alone, v2's standalone phrase. */
// @spec-link [[rule_jam_phrase_one_failure_ladder]]
export type JamPhraseOneRung = 'join-and-block' | 'block' | 'standalone'

/** The first attempt of rung 2, the block with no join. */
export const BLOCK_ATTEMPT: JamPhraseOneAttemptIndex = 4

/** Rung 3's one attempt, v2's standalone phrase. */
export const STANDALONE_ATTEMPT: JamPhraseOneAttemptIndex = 5

/** Intent: the rung an attempt belongs to. */
// @spec-link [[rule_jam_phrase_one_failure_ladder]]
export function rungOfAttempt(index: JamPhraseOneAttemptIndex): JamPhraseOneRung {
  if (index < BLOCK_ATTEMPT) return 'join-and-block'
  return index === BLOCK_ATTEMPT ? 'block' : 'standalone'
}

/**
 * What phrase 1 reads besides the doodle: Jam's settings (its key and mode, tempo, instrument,
 * figure levels, rhythm lock and allowed rhythm changes; Vary settings' groups kept and inert)
 * and Jam's drift. The rhythm and shape controls in them are replaced by the doodle's readings.
 */
// @spec-link [[rule_doodle_sets_jam_controls]]
// @spec-link [[rule_two_measures_before_jam_phrase_one]]
export interface JamPhraseOneSettings {
  readonly settings: SessionSettings
  readonly drift: JamDrift
}

/**
 * What one end of the doodle gives every attempt: phrase 1's settings (Jam's with the controls
 * read from the doodle, those in effect once phrase 1 is handed over), the readings, the steering
 * block every phrase of the Jam carries, the join (or why there is none) and, with the lock on,
 * the lock group "on, nothing locked yet".
 */
// @spec-link [[rule_two_measures_before_jam_phrase_one]]
// @spec-link [[rule_every_jam_phrase_carries_doodle]]
export interface DoodleAttempts {
  readonly settings: SessionSettings
  readonly readings: DoodleReadings
  readonly steering: SteeringBlock
  readonly join: DoodleJoin
  readonly pendingLock: RequestRhythmLock | undefined
}

/**
 * Intent: what the doodle gives phrase 1's attempts, read now: the seven controls read from the
 * quantized doodle for Jam's instrument (its rhythmic variety stepped to a supported combination
 * at the note density as read, at no window width), set into Jam's settings; the steering block
 * from the doodle and Jam's drift; the join from the doodle's last note; and, with Jam's lock on,
 * the pending lock group with Jam's allowed changes, not a tenser phrase.
 */
// @spec-link [[rule_doodle_sets_jam_controls]]
// @spec-link [[rule_jam_phrase_one_joins_doodle]]
// @spec-link [[rule_every_jam_phrase_carries_doodle]]
// @spec-link [[rule_two_measures_before_jam_phrase_one]]
export function doodleAttempts(doodle: QuantizedDoodle, jam: JamPhraseOneSettings): DoodleAttempts {
  const instrument = sessionInstrumentProfile(jam.settings)
  const windows = deriveRegisterWindowCandidates(
    instrument.concertRange,
    instrument.registerWindows,
  )
  const readings = readDoodleControls(doodle, windows)
  const controls = makeGenerationControls({
    ...jam.settings.controls,
    noteDensity: readings.noteDensity.value,
    rhythmicVariety: readings.rhythmicVariety.value,
    syncopation: readings.syncopation.value,
    silenceDensity: readings.silenceDensity.value,
    contour: readings.contour.value,
    leapiness: readings.leapiness.value,
    register: readings.register.value,
  })
  const { rhythmLockOn, allowedRhythmChanges } = jam.settings
  return deepFreeze({
    settings: { ...jam.settings, controls },
    readings,
    steering: buildSteeringBlock(doodle, jam.drift),
    join: doodleJoin(doodle, instrument, readings.register),
    pendingLock: rhythmLockOn
      ? makeRequestRhythmLock({
          state: { kind: 'pending' },
          allowedChanges: allowedRhythmChanges,
          tenserPhrase: false,
        })
      : undefined,
  })
}

/** What one attempt's intent reads besides the doodle: its request id, its seed, the window. */
// @spec-link [[rule_session_density_only_steps_down]]
export interface JamAttemptSeams {
  readonly requestId: RequestId
  readonly seed: Seed
  readonly belowTabletLandscape: boolean
  readonly steppedDown: boolean
}

/**
 * One attempt as the session asks for it: its step (carry-in for rung 1, standalone otherwise),
 * its intent, the settings it is generated under, and whether the Jam has stepped down after it.
 */
// @spec-link [[rule_jam_phrase_one_failure_ladder]]
export interface JamAttempt {
  readonly step: 'carry-in' | 'standalone'
  readonly intent: GenerationIntent
  readonly settings: SessionSettings
  readonly steppedDown: boolean
}

/**
 * Intent: the intent of attempt `index` on what the doodle gives: the controls read from the
 * doodle with the note density as it generates now (a Sixteenth as Eighth below the
 * tablet-landscape width or once stepped down), my instrument's profile as data when selected,
 * the attempt's own Seventh chords level (Jam's, which the doodle never sets), and the caller's
 * request id and seed. Rung 1 carries the join and the block (and the pending lock); rung 2 the
 * block (and the pending lock) with the register read from the doodle; rung 3 neither. Asking
 * rung 1 of a doodle with no join is a caller defect and throws.
 */
// @spec-link [[rule_jam_phrase_one_failure_ladder]]
// @spec-link [[rule_session_density_only_steps_down]]
// @spec-link [[rule_doodle_only_orders_candidates]]
// @spec-link [[rule_jam_has_own_seventh_chords_level]]
export function jamAttempt(
  attempts: DoodleAttempts,
  index: JamPhraseOneAttemptIndex,
  seams: JamAttemptSeams,
): JamAttempt {
  const { settings, steering, join, pendingLock } = attempts
  const chosen = settings.controls
  const noteDensity = resolveGeneratedNoteDensity(chosen.noteDensity, {
    belowTabletLandscape: seams.belowTabletLandscape,
    sessionSteppedDown: seams.steppedDown,
  })
  const rung = rungOfAttempt(index)
  const steered = rung === 'standalone' ? {} : { steering }
  const locked =
    rung === 'standalone' || pendingLock === undefined ? {} : { rhythmLock: pendingLock }
  const mine = chosen.instrumentProfileId === MY_INSTRUMENT_ID
  const input: GenerationIntentInput = {
    requestId: seams.requestId,
    seed: seams.seed,
    controls: { ...chosen, noteDensity },
    figureLevels: settings.figureLevels,
    chordFamilies: settings.chordFamilies,
    ...(mine ? { instrumentProfile: sessionInstrumentProfile(settings) } : {}),
    ...locked,
    ...steered,
  }
  const steppedDown = seams.steppedDown || noteDensity !== chosen.noteDensity
  if (rung !== 'join-and-block')
    return { step: 'standalone', intent: makeGenerationIntent(input), settings, steppedDown }
  if (join.kind !== 'join')
    throw new Error(`Jam's phrase 1: attempt ${index} needs the doodle's join, and it has none.`)
  return {
    step: 'carry-in',
    intent: makeCarryInGenerationIntent({
      ...input,
      controls: { ...input.controls, register: join.register },
      carryIn: join.carryIn,
    }),
    settings,
    steppedDown,
  }
}

/**
 * Intent: the key and mode suggestion for the doodle that ended, worked out against Jam's written
 * key and mode for its instrument's transposition; nothing about it is shown during the Jam.
 */
// @spec-link [[module_key_suggestion]]
export function doodleSuggestion(
  doodle: QuantizedDoodle,
  jam: JamPhraseOneSettings,
): KeySuggestion {
  const { tonalCenter, collection } = jam.settings.controls
  return suggestKeyAndMode(
    doodle,
    { tonalCenter, collection },
    sessionInstrumentProfile(jam.settings),
  )
}
