/**
 * The shell's side of a fresh Jam (Jam mode at Idle, no doodle kept): its start, from `Start Jam`
 * or the home note, through Jam's loaded code (src/jam/fresh-jam.ts) and the session controller's
 * start without phrase 1, under Jam's own settings and the shared instrument; what the running
 * Jam gives the screen (the cue row's parts and phase before phrase 1, the readings taken from the
 * doodle once phrase 1 enters); and what its end leaves at Jam mode's Idle. Every end goes through
 * the controller's one end path: here the running Jam is let go once the session is over; an end
 * with a review hands Jam's kept doodle the Jam part that review shows, with its session's key,
 * and an end before phrase 1 hands none, so a fresh Jam's doodle is not kept and a doodle kept
 * already stays; an end because no phrase 1 came by the deadline leaves `jam-notice` showing until
 * the next start, a change of a Jam setting or leaving Jam mode. The mode never changes here. Jam's
 * code is reached through its loaded module only.
 */
import { computed, shallowRef, watch, type ComputedRef, type Ref } from 'vue'

import { selectedInstrumentProfile } from '@/domain/generation/generation-intent'
import { instrumentClefOf } from '@/domain/profile/instrument-clef'
import { MY_INSTRUMENT_ID } from '@/domain/profile/instrument-profiles'
import type { MyInstrument } from '@/domain/profile/my-instrument'
import type { DoodleReadings } from '@/jam/doodle-controls'
import type { FreshJam } from '@/jam/fresh-jam'
import type { FreshJamSettingsSource } from '@/jam/fresh-jam-settings'
import type { JamPhase } from '@/jam/jam-phase'
import type { JamStaffState } from '@/jam/jam-view-types'
import type { JamSessionCue } from './jam-session-cue'
import type { JamModeModule } from './load-jam-mode'
import type { ReviewedJamPart } from './session-jam-part'
import type { SessionController, SessionEndSummary } from './workspace-session-controller-types'

/** The Jam's phases before phrase 1 enters the session staff, while Jam's staff shows it. */
const BEFORE_PHRASE_ONE_ENTERS: ReadonlySet<JamPhase['state']> = new Set([
  'count-in',
  'capture',
  'tentative-generation-measure',
  'generation-measure',
  'extended-wait',
])

/** What the shell's fresh Jam reads, every reading current when called (reactive in the shell). */
// @spec-link [[req_jam]]
export interface FreshJamSeams {
  /** Jam's code, once loaded in this visit; null before. */
  readonly jamModule: () => JamModeModule | null
  /** Jam mode shows (its code loaded, not while it opens). */
  readonly jamShowing: () => boolean
  /** The loaded session controller; a start before it loads is a defect, so this throws. */
  readonly controller: () => SessionController
  /** Jam's settings, controls and figure levels; null before Jam's settings exist. */
  readonly settings: () => FreshJamSettingsSource | null
  /** The shared instrument: the selected profile, and my instrument when one is saved. */
  readonly instrument: () => {
    readonly instrumentProfileId: FreshJamSettingsSource['controls']['instrumentProfileId']
    readonly myInstrument: MyInstrument | null
  }
  /** The summary of the last session's end; null before any (and before the controller loads). */
  readonly lastEnd: () => SessionEndSummary | null
  /** What Jam's staff shows while Jam mode shows; null otherwise. */
  readonly jamStaffState: () => JamStaffState | null
  /** Keep the doodle of an ended Jam's part, from its session under `sessionKey` (Jam's code). */
  readonly keepDoodle: (jam: ReviewedJamPart, sessionKey: string) => void
}

/** The shell's fresh Jam: what it shows, and its start and notice clearing. */
// @spec-link [[req_jam]]
export interface WorkspaceFreshJam {
  /** The cue row's Jam parts and the Jam's phase while a fresh Jam runs; null otherwise. */
  readonly cue: ComputedRef<JamSessionCue | null>
  /** The controls taken from the doodle once phrase 1 enters, while the Jam runs; else null. */
  readonly readings: ComputedRef<DoodleReadings | null>
  /** `jam-notice` shows: the last Jam ended with no phrase 1 by its deadline. */
  readonly noticeShown: Readonly<Ref<boolean>>
  /** Start a fresh Jam now, synchronously inside the Start click or the home note's callback. */
  readonly start: () => void
  /** A change of a Jam setting at Idle: `jam-notice` goes. */
  readonly settingChanged: () => void
}

/**
 * Intent: the shell's fresh Jam over its seams. A start (whose conditions the caller has judged)
 * removes `jam-notice` and starts the Jam through Jam's code, under Jam's settings with my
 * instrument's profile when it is the instrument, drawn in the instrument's clef. An end that
 * carries a Jam part (a Jam's end with a review) hands it to Jam's kept doodle. Once the session
 * is over, by whatever cause, the Jam is let go, and the end's cause says whether `jam-notice`
 * shows: only when no phrase 1 came by the deadline. Leaving Jam mode removes it too. Before
 * phrase 1 enters, Jam's staff no longer showing its empty system ends the Jam.
 */
// @spec-link [[req_jam]]
// @spec-link [[rule_jam_ending_before_phrase_one]]
// @spec-link [[rule_jam_ends_when_phrase_one_never_comes]]
// @spec-link [[module_jam_session_end]]
// @spec-link [[module_kept_doodle]]
export function useFreshJam(seams: FreshJamSeams): WorkspaceFreshJam {
  const running = shallowRef<FreshJam | null>(null)
  const noticeShown = shallowRef(false)

  /** Intent: start a fresh Jam: Jam's code and settings must be there, as `Start Jam` shows. */
  function start(): void {
    const loaded = seams.jamModule()
    const source = seams.settings()
    if (loaded === null || source === null) {
      throw new Error("workspace shell: a fresh Jam starts before Jam's code or settings exist")
    }
    const { instrumentProfileId, myInstrument } = seams.instrument()
    const mine = instrumentProfileId === MY_INSTRUMENT_ID && myInstrument !== null
    noticeShown.value = false
    running.value = loaded.startFreshJam({
      startWithoutPhraseOne: seams.controller().startWithoutPhraseOne,
      jam: loaded.freshJamSettings(
        source,
        mine ? selectedInstrumentProfile(instrumentProfileId, myInstrument) : null,
      ),
      clef: instrumentClefOf(instrumentProfileId, myInstrument),
    })
  }

  // The session over, its end summed up: a Jam part it carries is kept, the Jam goes, and an end
  // with no phrase 1 by the deadline leaves the notice.
  watch(
    seams.lastEnd,
    (end) => {
      if (end?.jam !== undefined) seams.keepDoodle(end.jam.part, end.jam.sessionKey)
      if (end === null || running.value === null) return
      running.value = null
      noticeShown.value = end.cause === 'no-phrase-one'
    },
    { flush: 'sync' },
  )
  watch(seams.jamShowing, (showing) => {
    if (!showing) noticeShown.value = false
  })

  /**
   * Intent: until phrase 1 enters, Jam's staff is the staff the Jam is shown on, so a window
   * change that leaves it no room (or an engraving it cannot show) ends the Jam as the staff no
   * longer shown; from the read-in on, the session's own watchers judge phrase 1 in the held layout.
   */
  watch(
    () => seams.jamStaffState() !== 'shown' && seams.jamStaffState() !== null,
    (notShown) => {
      const jam = running.value
      if (!notShown || jam === null || !BEFORE_PHRASE_ONE_ENTERS.has(jam.view.value.phase.state))
        return
      jam.session.end('staff-not-shown')
    },
    { flush: 'sync' },
  )

  const cue = computed((): JamSessionCue | null => {
    const jam = running.value
    const loaded = seams.jamModule()
    if (jam === null || loaded === null) return null
    return {
      parts: { JamCapture: loaded.JamCapture, JamWriting: loaded.JamWriting },
      phase: jam.view.value.phase,
    }
  })

  return {
    cue,
    readings: computed(() => running.value?.view.value.readings ?? null),
    noticeShown,
    start,
    settingChanged: () => {
      noticeShown.value = false
    },
  }
}
