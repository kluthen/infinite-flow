/**
 * The Jam on the kept doodle specs' shared rig, over the session controller rig (fake audio clock,
 * fake MIDI, scripted generations; 240 BPM, a 1 s measure, a 4 s phrase): a connected controller,
 * the kept doodle as Jam's code keeps it (the fixture's two-measure doodle unless given, its
 * suggestion, decline and readings), its phrase 1 written at Idle through the kept doodle's three
 * rungs from fixed providers under the rig's settings (real generation), drawn in the built-in
 * clef, and Jam's prepared phrases for it, planned as Jam's own queue plans them.
 */
import { keptDoodleSessionStart } from '@/components/workspace/jam-pregeneration'
import type { StartedOnKeptDoodle } from '@/components/workspace/session-jam-part'
import type { KeptDoodlePhraseResult } from '@/components/workspace/use-kept-doodle-phrase'
import type { StartOnKeptDoodle } from '@/components/workspace/workspace-session-controller-types'
import type { QuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import { notationInputFromOutcome } from '@/domain/notation/notation-input'
import { transformToWrittenPhrase } from '@/domain/notation/written-phrase'
import { BUILT_IN_INSTRUMENT_CLEF } from '@/domain/profile/instrument-clef'
import { C_KEYBOARD_PROFILE } from '@/domain/profile/instrument-profiles'
import { deriveRegisterWindowCandidates } from '@/domain/profile/register-window-derivation'
import { makeSeed, type Seed } from '@/domain/random/seed'
import { readDoodleControls } from '@/jam/doodle-controls'
import { climbKeptDoodleLadder } from '@/jam/kept-doodle-phrase-one'
import type { DoodleSuggestion } from '@/session/session-history'
import type { ReadyPhrase } from '@/session/session-ready-phrases'
import type { SessionSettings } from '@/session/session-types'
import {
  controllerRig,
  type ControllerRig,
  type ControllerRigOptions,
  type GenerateScript,
} from '../components/workspace/session-controller-rig'
import { connectKeys } from '../components/workspace/session-controller-midi'
import { planSeams, plannedReadyPhrases } from '../session/pregeneration-harness'
import { queuedProviders, realOutcomeFor } from '../session/session-harness'
import { KEPT_DOODLE } from '../storage/kept-session-v32-fixtures'

/** The session seed Jam's phrase 1 at Idle was published with. */
export const KEPT_PHRASE_SESSION_SEED = makeSeed(0x0d00_d1e5)

/** The suggestion the kept doodle carries: a written key and mode. */
export const KEPT_SUGGESTION: DoodleSuggestion = {
  kind: 'suggested',
  tonalCenter: 'D',
  collection: 'Dorian',
}

/** Intent: the kept doodle as Jam's code keeps it, its suggestion declined or not. */
export function keptDoodleOf(
  doodle: QuantizedDoodle = KEPT_DOODLE.quantized,
  suggestionDeclined = false,
): StartedOnKeptDoodle {
  return {
    doodle,
    captureTempo: KEPT_DOODLE.captureTempo,
    suggestion: KEPT_SUGGESTION,
    suggestionDeclined,
    readings: readDoodleControls(
      doodle,
      deriveRegisterWindowCandidates(
        C_KEYBOARD_PROFILE.concertRange,
        C_KEYBOARD_PROFILE.registerWindows,
      ),
    ),
  }
}

/** How a phrase 1 is written from the kept doodle at Idle: the window, the seeds, the session seed. */
export interface KeptPhraseOptions {
  readonly belowTabletLandscape?: boolean
  readonly firstSeed?: number
  readonly sessionSeed?: Seed
}

/**
 * Intent: phrase 1 written at Idle from `doodle` under Jam's `settings` (Near drift), climbing the
 * kept doodle's rungs with real generation from fixed providers, as Jam's Idle publishes it.
 */
export function keptPhraseOneFrom(
  doodle: QuantizedDoodle,
  settings: SessionSettings,
  options: KeptPhraseOptions = {},
): KeptDoodlePhraseResult {
  const providers = queuedProviders(options.firstSeed ?? 21, 20)
  const ladder = climbKeptDoodleLadder(
    doodle,
    { settings, drift: 'Near' },
    {
      nextRequestId: providers.nextRequestId,
      nextSeed: providers.nextSeed,
      isBelowTabletLandscape: () => options.belowTabletLandscape ?? false,
    },
  )
  for (;;) {
    const attempt = ladder.attempt()
    const outcome = realOutcomeFor(attempt.intent)
    if (outcome.kind === 'generation_success') {
      return {
        outcome,
        intent: attempt.intent,
        settings: attempt.settings,
        step: attempt.step,
        steering: attempt.steering,
        sessionSeed: options.sessionSeed ?? KEPT_PHRASE_SESSION_SEED,
      }
    }
    if (!ladder.failed({ kind: 'generation-failure', code: outcome.code }))
      throw new Error('kept doodle rig: no rung wrote phrase 1')
  }
}

/** A connected rig with the kept doodle, its phrase 1 at Idle and what a Jam on it starts from. */
export interface KeptDoodleJamRig {
  readonly rig: ControllerRig
  readonly kept: StartedOnKeptDoodle
  readonly phraseOne: KeptDoodlePhraseResult
  /** The start request, its take giving `prepared` (none unless asked for). */
  readonly request: StartOnKeptDoodle
  /** Jam's prepared phrases the take hands over. */
  readonly prepared: readonly ReadyPhrase[]
  /** How many times the take was asked. */
  readonly takes: () => number
}

/** What a rig is built with; every field has a default. */
export interface KeptDoodleJamRigOptions {
  readonly script?: GenerateScript
  readonly controller?: ControllerRigOptions
  readonly doodle?: QuantizedDoodle
  readonly suggestionDeclined?: boolean
  readonly phrase?: KeptPhraseOptions
  /** Whether Jam's queue has prepared phrases 2 to 5 for phrase 1; none by default. */
  readonly prepared?: boolean
}

/** Intent: a connected controller rig with a doodle kept and its phrase 1 shown at Jam's Idle. */
export async function keptDoodleJamRig(
  options: KeptDoodleJamRigOptions = {},
): Promise<KeptDoodleJamRig> {
  const rig = controllerRig(options.script, undefined, options.controller)
  await connectKeys(rig)
  rig.sessionModeHeld.value = true
  const kept = keptDoodleOf(options.doodle, options.suggestionDeclined)
  const phraseOne = keptPhraseOneFrom(kept.doodle, rig.settings, options.phrase)
  const tempo = rig.settings.controls.tempo
  const prepared =
    options.prepared === true
      ? plannedReadyPhrases(planSeams(), keptDoodleSessionStart(phraseOne, tempo))
      : []
  let takes = 0
  const request: StartOnKeptDoodle = {
    phraseOne,
    tempo,
    written: transformToWrittenPhrase(
      notationInputFromOutcome(phraseOne.outcome, phraseOne.intent, BUILT_IN_INSTRUMENT_CLEF),
    ),
    take: () => {
      takes += 1
      return prepared
    },
    keptDoodle: kept,
  }
  return { rig, kept, phraseOne, request, prepared, takes: () => takes }
}
