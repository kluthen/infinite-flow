/**
 * Session mode's Idle pre-generation queue (./workspace-pregeneration-queue.ts, one instance of
 * the queue, Jam's being another, ./jam-pregeneration.ts): while every session start condition
 * holds at Idle and session mode is not held, it prepares the phrases a session would play after
 * phrase 1. It plans them from phrase 1 under the settings phrase 1 was generated under, so a
 * stale phrase 1 stops nothing. Its key is phrase 1 and the settings session mode's phrases are
 * generated from; Jam's settings are never in it. It re-checks the queue on every staff layout
 * report, window-width crossing and saved change to my instrument outside a session (one seen
 * during a session waits for the return to Idle). While session mode is held (Jam mode opening or
 * showing) it runs as while a start condition fails: the attempt in flight is aborted, the ready
 * phrases are kept, nothing new is prepared and nothing is discarded on its own; a re-check asked
 * for meanwhile waits, and once the hold ends it resumes after the last ready phrase, exactly as
 * when the start conditions hold again. Loaded with the session controller, outside the entry
 * chunk.
 */
import type { GenerationSessionState } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import { FIGURE_IDS } from '@/domain/figures/figure-levels'
import { ANY_KEY_AND_MODE } from '@/domain/presets/key-and-mode-restriction'
import { restrictionInForce } from '@/domain/presets/preset-selection'
import { instrumentClefOf } from '@/domain/profile/instrument-clef'
import type { WindowShapeReading } from '@/session/session-browser-ports'
import type { PregenerationStart } from '@/session/session-pregeneration'
import { mutationContextAtStart } from '@/session/session-mutation-step'
import type { SessionStartBlocker } from '@/session/session-start-conditions'
import { phraseOneSettings } from '@/session/stale-phrase-one'
import type { IdleLayoutPort } from './idle-layout-gate'
import type { StaffFitPlanner } from './workspace-session-controller-seams'
import { chosenSessionSettings, type LockAndGroupsChoices } from './workspace-session-lock-choices'
import { mutationFlagFor } from './workspace-session-runner'
import {
  createPregenerationQueue,
  type PregenerationWorkspaceSeams,
  type WorkspacePregeneration,
} from './workspace-pregeneration-queue'

export type {
  PregenerationWorkspaceSeams,
  WorkspacePregeneration,
} from './workspace-pregeneration-queue'

/**
 * What the session controller binds: the Idle state (phrase 1, the controls, the figure levels,
 * the preset selection, the presets it knows and the note-density context), its start blocker (the run conditions), its two session flags, the rhythm lock, its allowed changes and the allowed groups,
 * whether session mode is held, the window's shape, the staff's latest layout inputs and their
 * observer, the staff planner's loader, and where a programming error is reported.
 */
// @spec-link [[module_idle_pregeneration_queue]]
export interface PregenerationControllerSeams {
  readonly idle: Readonly<GenerationSessionState<WorkspaceSessionResult>>
  readonly startBlocker: () => SessionStartBlocker | null
  /** Session mode is held (Jam mode opening or showing), reactive: the queue prepares nothing. */
  readonly sessionModeHeld: () => boolean
  readonly varySettings: () => boolean
  readonly tensionAcrossPhrases: () => boolean
  /** The player's rhythm lock, its allowed changes and Vary settings' allowed groups, reactive. */
  readonly lockAndGroups: () => LockAndGroupsChoices
  readonly windowShape: () => WindowShapeReading
  readonly idleLayout: Pick<IdleLayoutPort, 'latestInputs' | 'observeInputs'>
  readonly loadPlanner: () => Promise<StaffFitPlanner>
  readonly fail: (error: unknown) => void
}

/** Everything one orchestrator is built from. */
export type WorkspacePregenerationDependencies = PregenerationWorkspaceSeams &
  PregenerationControllerSeams

/** The session controller's builder of its orchestrator, which the composition binds. */
export type WorkspacePregenerationFactory = (
  seams: PregenerationControllerSeams,
) => WorkspacePregeneration

/**
 * Intent: the queue's key besides phrase 1: the generation controls except tempo (the instrument
 * is a control), the seven figure levels in FIGURE_IDS order, Vary settings, Tension across
 * phrases, the restriction in force, whose change discards whether Vary settings is on or not
 * (opting out, or coming back inside), and the rhythm lock, its allowed changes and Vary settings'
 * allowed groups, whose change discards whether or not it acts on phrases then (the allowed
 * changes while the lock is off, the groups while Vary settings is off). No restriction in force and an "any" restriction count as
 * one, as Start takes them. Never the preset selection itself: no phrase is generated from it, so
 * a change of the selection alone (the same controls, levels and restriction in force) keeps the
 * ready phrases.
 */
// @spec-link [[rule_pregeneration_discarded_on_change]]
// @spec-link [[rule_restriction_in_force]]
// @spec-link [[module_session_lock_and_groups_choices]]
function settingsKeyOf(deps: PregenerationControllerSeams): string {
  const { tempo, ...controls } = deps.idle.controls
  void tempo
  const { figureLevels, selection, presets } = deps.idle
  return JSON.stringify([
    controls,
    FIGURE_IDS.map((figure) => figureLevels[figure]),
    deps.varySettings(),
    deps.tensionAcrossPhrases(),
    restrictionInForce(selection, controls.tonalCenter, controls.collection, presets) ??
      ANY_KEY_AND_MODE,
    deps.lockAndGroups(),
  ])
}

/**
 * Intent: build session mode's queue and start it: it runs at once if every start condition holds
 * and session mode is not held. A disabled policy builds one that never runs. A programming error
 * met while it runs (an unexpected rejection, or a plan that cannot be built or stepped, a
 * carry-in error included) goes to `fail`, the attempt in flight aborted and the queue emptied; it
 * then stays stopped, Start taking nothing, until the queue's key next changes. A layout re-check
 * asked for while a session runs or session mode is held re-checks nothing then: it runs once the
 * queue may run again.
 */
// @spec-link [[module_idle_pregeneration_queue]]
// @spec-link [[rule_pregeneration_discarded_on_change]]
export function createWorkspacePregeneration(
  deps: WorkspacePregenerationDependencies,
): WorkspacePregeneration {
  const { idle } = deps

  /**
   * Intent: the plan's start from phrase 1 and the Idle choices as a session would take them, the
   * player's rhythm lock, its allowed changes and the allowed groups with them, my instrument's
   * profile taken from phrase 1's intent and the restriction in force frozen in, built as Start
   * builds them, with the settings phrase 1 was generated under, as the stale-phrase prompt's
   * Use it passes them, and the mutation flag Start gives: off when those settings have no legal
   * move under the context the start state gives, the window read as the plan reads it.
   */
  // @spec-link [[entity_my_instrument]]
  // @spec-link [[rule_pregenerated_phrase_matches_session]]
  // @spec-link [[rule_vary_settings_stays_inside_restriction]]
  // @spec-link [[module_session_lock_and_groups_choices]]
  function startOf(phraseOne: WorkspaceSessionResult): PregenerationStart {
    const settings = chosenSessionSettings(idle, deps.lockAndGroups(), phraseOne.intent)
    const context = mutationContextAtStart(phraseOne, deps.viewport.isBelowTabletLandscape())
    return {
      settings,
      phraseOne: { intent: phraseOne.intent, outcome: phraseOne.outcome },
      phraseOneSettings: phraseOneSettings(
        phraseOne.settings,
        phraseOne.intent,
        idle.controls.tempo,
      ),
      sessionSeed: phraseOne.sessionSeed,
      mutation: mutationFlagFor(deps.varySettings(), phraseOne.sessionSeed, settings, context),
      multiPhraseTensionArc: deps.tensionAcrossPhrases(),
    }
  }

  return createPregenerationQueue<WorkspaceSessionResult>({
    generate: deps.generate,
    providers: deps.providers,
    viewport: deps.viewport,
    slot: deps.slot,
    policy: deps.policy,
    source: {
      phraseOne: () => idle.result,
      key: [() => idle.result, () => settingsKeyOf(deps)],
      // Every start condition holds and session mode is not held.
      runnable: () => deps.startBlocker() === null && !deps.sessionModeHeld(),
      recheckWaits: () => deps.startBlocker() === 'session_active' || deps.sessionModeHeld(),
      startOf,
      tempo: () => idle.controls.tempo,
      // The clef a session would draw its phrases in: the selected instrument's.
      clef: () => instrumentClefOf(idle.controls.instrumentProfileId, idle.myInstrument),
      belowTabletLandscape: () => idle.noteDensityContext.belowTabletLandscape,
      myInstrument: () => idle.myInstrument,
    },
    windowShape: deps.windowShape,
    idleLayout: deps.idleLayout,
    loadPlanner: deps.loadPlanner,
    fail: deps.fail,
  })
}
