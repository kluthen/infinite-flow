/**
 * The session engine's way in without phrase 1: until its caller hands phrase 1 over, every event
 * goes to the phase before phrase 1 (./session-before-phrase-one.ts); from the hand-over on, the
 * engine opens on that phrase 1 (./session-engine.ts gives the opening and the event handler, so
 * neither module imports the other's code) and runs as any session from phrase 1 on.
 */

import { deepFreeze } from '../domain/events/deep-freeze'
import type { SteeringBlock } from '../domain/generation/steering-block'
import { makeSeed } from '../domain/random/seed'
import {
  beforePhraseOneAt,
  handleBeforePhraseOne,
  type BeforePhraseOne,
  type PhraseOneHandover,
} from './session-before-phrase-one'
import type { EngineContext, EngineState, Step } from './session-engine-state'
import { freezeSessionSettings } from './session-intents'
import type { ReadyPhrase } from './session-ready-phrases'
import { nextPhraseDeadline } from './session-timing'
import type {
  AudioTime,
  SessionEngine,
  SessionEngineDependencies,
  SessionEvent,
  SessionOutput,
  SessionPhrase,
  SessionSettings,
  SessionStart,
  SessionStartWithoutPhraseOne,
} from './session-types'
import { requireTensionArcFlag } from './tension-arc-cycle'

/** The fields of a start every session has, with or without phrase 1. */
// @spec-link [[module_session_start_without_phrase_one]]
export type CommonStart = Omit<SessionStart, 'phraseOne' | 'phraseOneSettings' | 'readyPhrases'>

/**
 * What the engine opens from once phrase 1 is known: the time it opens at, the settings in effect
 * (frozen), phrase 1 and the settings it was generated under, the ready phrases, the next attempt
 * id, whether the session started without phrase 1, phrase 2's deadline, whether the session has
 * already stepped its note density down (phrase 1 generated as Eighth for a Sixteenth in effect),
 * and the steering block every later request carries (none: no phrase steered).
 */
// @spec-link [[module_session_start_without_phrase_one]]
export interface EngineOpening {
  readonly at: AudioTime
  readonly settings: SessionSettings
  readonly phraseOne: SessionPhrase
  readonly phraseOneSettings: SessionSettings
  readonly readyPhrases: readonly ReadyPhrase[]
  readonly nextAttemptId: number
  readonly startedWithoutPhraseOne: boolean
  readonly phraseTwoDue: AudioTime
  readonly steppedDown: boolean
  readonly steering: SteeringBlock | undefined
}

/** The context and the state an opened engine runs on, with the outputs of its opening. */
// @spec-link [[module_session_start_without_phrase_one]]
export interface OpenedEngine {
  readonly context: EngineContext
  readonly step: Step
}

/** What the engine lends this way in: its opening, its event handler and its time check. */
// @spec-link [[module_session_start_without_phrase_one]]
export interface EngineCore {
  readonly open: (
    deps: SessionEngineDependencies,
    start: CommonStart,
    opening: EngineOpening,
  ) => OpenedEngine
  readonly handle: (context: EngineContext, state: EngineState, event: SessionEvent) => Step
  readonly assertAudioTime: (at: AudioTime) => void
}

/**
 * Intent: open the engine of a session started without phrase 1 on the phrase 1 its caller
 * handed over: decided under the settings it was generated with, which are the settings in effect
 * from then on, its origin the step its attempt took, and phrase 2 requested at once, due at the
 * start of phrase 1's last measure, counted from the time phrase 1 starts sounding. Phrase 1
 * generated with a note density other than the one in effect (Eighth for a Sixteenth, on a narrow
 * window) has stepped the session down, so the step-down holds from phrase 1; every later request
 * carries the steering block the hand-over names. The phrase 1 decided is reported as the phrase
 * to show next.
 */
// @spec-link [[module_session_start_without_phrase_one]]
// @spec-link [[rule_every_jam_phrase_carries_doodle]]
// @spec-link [[rule_session_density_only_steps_down]]
function openOnHandedPhraseOne(
  deps: SessionEngineDependencies,
  start: CommonStart,
  handover: PhraseOneHandover,
  core: EngineCore,
): OpenedEngine {
  const settings = freezeSessionSettings(handover.settings)
  const phraseOne: SessionPhrase = deepFreeze({ ...handover.phraseOne })
  const opened = core.open(deps, start, {
    at: handover.at,
    settings,
    phraseOne,
    phraseOneSettings: settings,
    readyPhrases: [],
    nextAttemptId: handover.nextAttemptId,
    startedWithoutPhraseOne: true,
    phraseTwoDue: nextPhraseDeadline(handover.soundsAt, settings.controls.tempo),
    steppedDown: phraseOne.intent.controls.noteDensity !== settings.controls.noteDensity,
    steering: handover.steering,
  })
  const { state, outputs } = opened.step
  return {
    context: opened.context,
    step: { state, outputs: [{ kind: 'phrase-ready', phrase: phraseOne }, ...outputs] },
  }
}

/**
 * Intent: a session started without phrase 1: until its caller hands phrase 1 over, every event
 * goes to the phase before phrase 1 (./session-before-phrase-one.ts); from the hand-over on, to the
 * engine opened on that phrase 1, which stays in its count-in phase until `count-in-over`, the
 * moment phrase 1 starts sounding. Its start requests nothing and has no output.
 */
// @spec-link [[module_session_start_without_phrase_one]]
// @spec-link [[module_session_seed_plan]]
// @spec-link [[rule_jam_runs_as_session_from_phrase_one]]
export function createSessionEngineWithoutPhraseOne(
  deps: SessionEngineDependencies,
  start: SessionStartWithoutPhraseOne,
  core: EngineCore,
): SessionEngine {
  makeSeed(start.sessionSeed)
  requireTensionArcFlag(start.multiPhraseTensionArc)
  freezeSessionSettings(start.settings)
  let before: BeforePhraseOne = beforePhraseOneAt(start.at)
  let opened: { readonly context: EngineContext; state: EngineState } | undefined
  return Object.freeze({
    outputsAtStart: deepFreeze([]),
    handle(event: SessionEvent): readonly SessionOutput[] {
      core.assertAudioTime(event.at)
      if (opened !== undefined) {
        const step = core.handle(opened.context, opened.state, event)
        opened.state = step.state
        return deepFreeze([...step.outputs])
      }
      const step = handleBeforePhraseOne(before, event)
      before = step.state
      if (step.handover === undefined) return deepFreeze([...step.outputs])
      const fresh = openOnHandedPhraseOne(deps, start, step.handover, core)
      opened = { context: fresh.context, state: fresh.step.state }
      return deepFreeze([...step.outputs, ...fresh.step.outputs])
    },
  })
}
