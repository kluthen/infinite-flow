/**
 * Jam mode's own Idle pre-generation queue (master spec C10.5; module_kept_doodle): an instance of
 * the queue (./workspace-pregeneration-queue.ts) apart from session mode's, which prepares the
 * phrases a Jam on the kept doodle would play after its phrase 1. It runs only while Jam mode
 * shows with a doodle kept and its phrase 1 written and shown at Idle, never in session mode, and
 * under the session start conditions that still apply there (no session running, no review
 * showing, no rotate-device notice, no Idle operation, error or room notice on Jam's phrase 1).
 * Its key is Jam's phrase 1 (its result, and so its session seed), the kept doodle and what that
 * phrase 1 is written from: every Jam setting but the tempo, and the shared instrument, my
 * instrument's range and clef included while it is the one; any change of it, letting the doodle
 * go and a new phrase 1 (Regenerate) among them, discards its phrases. The tempo, the theme, the
 * audio mix and a controller are not in it, and a window crossing re-checks them as session
 * mode's does. Its phrases are planned from the start a Jam on the kept doodle takes
 * (`keptDoodleSessionStart`): Jam's settings with the controls read from the doodle, phrase 1's
 * session seed, Jam's rhythm lock as phrase 1 leaves it, no settings mutation and no tension arc
 * across phrases, and the kept doodle's steering block on every attempt. It never reads or touches
 * session mode's queue or its ready phrases, and shares the one background slot with it and with
 * Idle's own requests. Loaded with the session controller's chunk, outside the entry chunk.
 */
import type { GenerationSessionState } from '@/composables/use-generation-session'
import type { IdlePhraseStateView } from '@/composables/generation-session-types'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import type { QuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import { instrumentClefOf } from '@/domain/profile/instrument-clef'
import type { WindowShapeReading } from '@/session/session-browser-ports'
import type { PregenerationStart } from '@/session/session-pregeneration'
import type { SessionSettings } from '@/session/session-types'
import { SETTINGS_MUTATION_OFF } from '@/session/settings-mutation'
import type { IdleLayoutPort } from './idle-layout-gate'
import type { KeptDoodlePhraseResult } from './use-kept-doodle-phrase'
import type { StaffFitPlanner } from './workspace-session-controller-seams'
import {
  createPregenerationQueue,
  type PregenerationWorkspaceSeams,
  type WorkspacePregeneration,
} from './workspace-pregeneration-queue'

/**
 * What Jam's queue reads of the workspace besides Jam's phrase 1, every reading current: Jam mode
 * shows (its code loaded, not while it opens), a session runs (count-in included), the review
 * mode shows (a Review or the session list), and the rotate-device notice shows.
 */
// @spec-link [[rule_jam_pregeneration_only_for_kept_doodle]]
export interface JamPregenerationFacts {
  readonly jamShowing: boolean
  readonly sessionActive: boolean
  readonly reviewShowing: boolean
  readonly orientationNoticeShown: boolean
}

/**
 * What the workspace's Jam side gives Jam's queue, every reading current and reactive: Jam's
 * phrase 1 at Idle written from the kept doodle (its Idle state), the kept doodle's quantized
 * doodle (null with none kept), what that phrase 1 is written from but the doodle (every Jam
 * setting but the tempo and the shared instrument, as one value; null before Jam's settings
 * exist), Jam's tempo, and the workspace's facts.
 */
// @spec-link [[rule_jam_pregeneration_only_for_kept_doodle]]
export interface JamPregenerationSeams {
  readonly phrase: IdlePhraseStateView<KeptDoodlePhraseResult>
  readonly doodle: () => QuantizedDoodle | null
  readonly writtenFrom: () => string | null
  readonly tempo: () => number
  readonly facts: () => JamPregenerationFacts
}

/**
 * What the composition binds besides its worker seams: session mode's Idle state for what the two
 * modes share (the selected instrument, my instrument and the window's note-density context), the
 * window's shape, the staff's latest layout inputs and their observer (the staff a session is drawn
 * on), the staff planner's loader, and where a programming error is reported.
 */
export interface JamPregenerationBindings {
  readonly shared: Pick<
    Readonly<GenerationSessionState<WorkspaceSessionResult>>,
    'controls' | 'myInstrument' | 'noteDensityContext'
  >
  readonly windowShape: () => WindowShapeReading
  readonly idleLayout: Pick<IdleLayoutPort, 'latestInputs' | 'observeInputs'>
  readonly loadPlanner: () => Promise<StaffFitPlanner>
  readonly fail: (error: unknown) => void
}

/** Everything Jam's queue is built from. */
export type JamPregenerationDependencies = PregenerationWorkspaceSeams &
  JamPregenerationBindings &
  JamPregenerationSeams

/** How the workspace's Jam side gets Jam's queue: loaded with its chunk, then built over `seams`. */
export type JamPregenerationLoader = (
  seams: JamPregenerationSeams,
) => Promise<WorkspacePregeneration>

/** Intent: `settings` at `tempo`: the tempo never affects generation, and a Jam starts at Jam's. */
function atTempo(settings: SessionSettings, tempo: number): SessionSettings {
  return settings.controls.tempo === tempo
    ? settings
    : { ...settings, controls: { ...settings.controls, tempo } }
}

/**
 * Intent: the start a Jam on the kept doodle takes from its phrase 1 at Idle, at Jam's `tempo`, and
 * Jam's queue plans from: phrase 1's settings (Jam's, with the controls read from the doodle,
 * those in effect from phrase 1 on, so phrase 2 joins phrase 1 with no change between them; with
 * Jam's lock on, the lock taken from phrase 1's written bars), phrase 1's intent, outcome and
 * session seed, Vary settings and Tension across phrases off, as in any Jam, and the kept
 * doodle's steering block, which every attempt from phrase 2 on carries. A session start spreads
 * it and adds its start time, adaptive tempo off and the ready phrases it takes.
 */
// @spec-link [[rule_pregenerated_phrase_matches_session]]
// @spec-link [[rule_jam_pregeneration_only_for_kept_doodle]]
// @spec-link [[rule_every_jam_phrase_carries_doodle]]
export function keptDoodleSessionStart(
  phraseOne: KeptDoodlePhraseResult,
  tempo: number,
): PregenerationStart {
  return {
    settings: atTempo(phraseOne.settings, tempo),
    phraseOne: { intent: phraseOne.intent, outcome: phraseOne.outcome },
    sessionSeed: phraseOne.sessionSeed,
    mutation: SETTINGS_MUTATION_OFF,
    multiPhraseTensionArc: false,
    steering: phraseOne.steering,
  }
}

/**
 * Intent: whether Jam's queue may run: Jam mode shows with a doodle kept and its phrase 1 written
 * and shown, nothing running or failed on it and no room notice, no session running, no review
 * showing and no rotate-device notice.
 */
// @spec-link [[rule_jam_pregeneration_only_for_kept_doodle]]
export function jamPregenerationRunnable(
  phrase: IdlePhraseStateView<KeptDoodlePhraseResult>,
  doodleKept: boolean,
  facts: JamPregenerationFacts,
): boolean {
  return (
    facts.jamShowing &&
    doodleKept &&
    !facts.sessionActive &&
    !facts.reviewShowing &&
    !facts.orientationNoticeShown &&
    phrase.result !== null &&
    phrase.resultEngraved &&
    phrase.operation === 'idle' &&
    !phrase.retriesRunning &&
    phrase.generationError === null &&
    phrase.notationError === null &&
    phrase.roomNotice === null
  )
}

/**
 * Intent: build Jam's queue and start it; see the module comment. A disabled policy builds one
 * that never runs, as session mode's. A layout re-check asked for while a session runs or Jam mode
 * does not show waits until the queue may run again.
 */
// @spec-link [[rule_jam_pregeneration_only_for_kept_doodle]]
// @spec-link [[rule_pregeneration_discarded_on_change]]
// @spec-link [[module_kept_doodle]]
export function createJamPregeneration(deps: JamPregenerationDependencies): WorkspacePregeneration {
  const { phrase, shared } = deps
  return createPregenerationQueue<KeptDoodlePhraseResult>({
    generate: deps.generate,
    providers: deps.providers,
    viewport: deps.viewport,
    slot: deps.slot,
    policy: deps.policy,
    source: {
      phraseOne: () => phrase.result,
      key: [() => phrase.result, deps.doodle, deps.writtenFrom],
      runnable: () => jamPregenerationRunnable(phrase, deps.doodle() !== null, deps.facts()),
      recheckWaits: () => {
        const facts = deps.facts()
        return facts.sessionActive || !facts.jamShowing
      },
      startOf: (phraseOne) => keptDoodleSessionStart(phraseOne, deps.tempo()),
      tempo: deps.tempo,
      // The clef a Jam's session draws its phrases in: the shared instrument's.
      clef: () => instrumentClefOf(shared.controls.instrumentProfileId, shared.myInstrument),
      belowTabletLandscape: () => shared.noteDensityContext.belowTabletLandscape,
      myInstrument: () => shared.myInstrument,
    },
    windowShape: deps.windowShape,
    idleLayout: deps.idleLayout,
    loadPlanner: deps.loadPlanner,
    fail: deps.fail,
  })
}
