/**
 * How a Jam session's Review reaches what the workspace holds of Jam (master spec C6.4, C6.5; the
 * review's handoff, `review-doodle`): Jam's key and mode, which its suggestion is judged against
 * and `Jam in {answer}` sets (the workspace's Jam settings, ./use-jam-settings.ts), the selected
 * instrument the answer is named for, and `Jam again on this doodle`, which leaves the review mode
 * onto Jam mode. The workspace shell provides them under `REVIEW_JAM_PORTS`; the review area
 * injects them at setup. Only a Jam session's Review uses them: one shown without them is a wiring
 * defect, and throws then.
 */
import { inject, type InjectionKey } from 'vue'

import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import type { JamKeyAndMode } from '@/jam/key-suggestion/key-suggestion'

import type { JamModeModule } from './load-jam-mode'
import type { WorkspaceJamSettings } from './use-jam-settings'
import type { WorkspaceMode } from './use-workspace-mode'

/** The part of Jam's code that reads and makes Jam's settings. */
// @spec-link [[module_jam_settings]]
export type JamSettingsCode = Pick<JamModeModule, 'createJamSettings' | 'decodeJamSettings'>

/** What a Jam session's Review reaches of the workspace's Jam. */
// @spec-link [[req_key_and_mode_suggestion]]
export interface ReviewJamPorts {
  /** Jam's written key and Collection now (session mode's before Jam's settings exist). */
  readonly keyAndMode: (jam: JamSettingsCode) => JamKeyAndMode
  /** The selected instrument, shared by both modes. */
  readonly instrument: () => Pick<InstrumentProfile, 'transposition'>
  /** `Jam in {answer}`: Jam's key and mode set and saved as Jam's; session mode's untouched. */
  readonly useAnswer: (jam: JamSettingsCode, answer: JamKeyAndMode) => void
  /** `Jam again on this doodle`: the review mode left onto Jam mode. */
  readonly jamAgain: () => Promise<void>
}

/** The injection key of the workspace's Jam ports. */
// @spec-link [[req_key_and_mode_suggestion]]
export const REVIEW_JAM_PORTS: InjectionKey<ReviewJamPorts> = Symbol('review-jam-ports')

/**
 * Intent: the workspace's Jam ports, injected at setup and read when a Jam session's Review needs
 * them; that read throws when nothing provided them.
 */
// @spec-link [[req_key_and_mode_suggestion]]
export function injectReviewJamPorts(): () => ReviewJamPorts {
  const ports = inject(REVIEW_JAM_PORTS, null)
  return () => {
    if (ports === null) {
      throw new Error('review jam ports: nothing provided REVIEW_JAM_PORTS to this component')
    }
    return ports
  }
}

/** What the workspace's Jam ports are made from: the shell's Jam settings, mode and moves. */
// @spec-link [[req_key_and_mode_suggestion]]
export interface WorkspaceReviewJamDependencies {
  readonly jamSettings: Pick<WorkspaceJamSettings, 'reviewKeyAndMode' | 'changeFromReview'>
  readonly instrument: () => Pick<InstrumentProfile, 'transposition'>
  /** A change of a Jam setting made at Jam's Idle would also say so (`jam-notice` goes). */
  readonly settingChanged: () => void
  /** The mode the Review shows over. */
  readonly mode: () => WorkspaceMode
  /** A press of `Jam` in the mode switch, once the Review has closed. */
  readonly selectJam: () => void
  /** Settles once Jam mode shows, after `selectJam` (Jam's code being loaded already). */
  readonly jamShown: () => Promise<void>
  /** `Close review`, with a step between the close and the focus move. */
  readonly closeReview: (between?: () => Promise<void>) => Promise<void>
}

/**
 * Intent: the workspace's Jam ports. `Jam in {answer}` changes Jam's key and mode as a change at
 * Jam's Idle does, or makes Jam's settings first, saving no first values; session mode's key and
 * mode are never touched. `Jam again on this doodle` does what `Close review` does over Jam mode;
 * over session mode, Jam mode opens between, as a press of `Jam`, session mode kept as it was.
 * Keeping the doodle, and phrase 1 written from it, are chunk 24's.
 */
// @spec-link [[rule_suggestion_use_it]]
// @spec-link [[rule_jam_again_on_this_doodle]]
export function workspaceReviewJamPorts(deps: WorkspaceReviewJamDependencies): ReviewJamPorts {
  return {
    keyAndMode: (jam) => deps.jamSettings.reviewKeyAndMode(jam),
    instrument: deps.instrument,
    useAnswer: (jam, answer) => {
      deps.settingChanged()
      deps.jamSettings.changeFromReview(jam, answer)
    },
    jamAgain: () => {
      if (deps.mode() === 'jam') return deps.closeReview()
      return deps.closeReview(async () => {
        deps.selectJam()
        await deps.jamShown()
      })
    },
  }
}
