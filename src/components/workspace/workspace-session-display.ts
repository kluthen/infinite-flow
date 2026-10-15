/**
 * One running session's rolling display, for the session controller: it keeps the written phrases
 * readied so far (phrase 1 being the very phrase Idle shows), the highest phrase number readied and
 * the playhead, and publishes the staff the screen draws whenever one of them changes. The playhead
 * is read on heard time (the audio clock minus the output latency) once a frame, through an
 * injected frame loop, from the session's start until `stop`, and mapped to a measure through the
 * transport's tempo map: each phrase at the tempo the engine fixed for it. It also answers the runner's fit
 * check of each look-ahead phrase and the material check a staff layout report needs, both in the
 * viewport the session holds, and whether a phrase is on screen: the engine's display reading. A
 * look-ahead phrase the engine discards, none of it on screen, is taken back so its number can be
 * readied again. Reads no time but the audio clock.
 */
import type { SessionStaff, SessionSystem } from '@/components/notation/session-staff'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import type { AudioTransport } from '@/audio/audio-transport'
import type { StaffLayout } from '@/notation/notation-layout-policy'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'
import {
  isPhraseOnScreen,
  phrasesShownOrWaiting,
  playheadAt,
  systemsAt,
  type PlayheadPosition,
  type PlayheadTempoSegment,
  type SystemSlot,
} from '@/session/rolling-display'
import type { FitCandidate } from '@/session/session-runner'
import { measureSeconds } from '@/session/session-timing'
import type { SessionPhrase } from '@/session/session-types'
import { fitsHeldLayout, writtenPhraseOf } from './held-layout-fit'
import type { FramePort, StaffFitPlanner } from './workspace-session-controller-types'

/** What one session's display is built from. */
// @spec-link [[module_session_rolling_display]]
export interface SessionDisplayDependencies {
  /**
   * The audio clock, its output latency, and the phrases' starts: phrase 1's, queued before the
   * display is built, and each later one's once its tempo is queued.
   */
  readonly audio: Pick<AudioTransport, 'now' | 'outputLatency' | 'phraseStartsAt'>
  readonly frames: FramePort
  /** The session's starting tempo, phrase 1's, in BPM. */
  readonly startingTempo: number
  readonly heldLayout: StaffLayout
  /**
   * The written phrase Idle shows, phrase 1, kept as the very same object; its clef is the
   * session's, every later phrase's.
   */
  readonly phraseOne: WrittenPhrase
  /** The staff's latest layout inputs; null before it reported any. */
  readonly latestInputs: () => StaffLayoutInputs | null
  readonly loadPlanner: () => Promise<StaffFitPlanner>
  /** Hand the screen the staff as it stands now and the highest phrase number readied. */
  readonly publish: (staff: SessionStaff, latestReady: number) => void
  /** Surface a programming error met in a frame. */
  readonly fail: (error: unknown) => void
}

/** One session's display. */
// @spec-link [[module_session_rolling_display]]
export interface SessionDisplay {
  /** The runner's fit check: whether a look-ahead attempt fits the held viewport now. */
  readonly checkFit: (candidate: FitCandidate, phraseNumber: number) => Promise<boolean>
  /** Take the next readied phrase (repeats included); throws when out of order. */
  readonly phraseReady: (phrase: SessionPhrase) => void
  /**
   * Take the next phrase's tempo (2, 3… in order), once the transport has it queued; the playhead
   * reads that phrase at it. Throws when out of order.
   */
  readonly phraseTempo: (phraseNumber: number, tempo: number) => void
  /**
   * Take back the latest readied phrase, discarded before its tempo is fixed and with none of it
   * on screen, so the same number is readied next. Throws for any other phrase.
   */
  readonly phraseDiscarded: (phraseNumber: number) => void
  /** Whether every phrase shown or waiting fits the held viewport at these layout inputs. */
  readonly materialFits: (inputs: StaffLayoutInputs) => Promise<boolean>
  readonly isPhraseOnScreen: (phraseNumber: number) => boolean
  /** Stop the frame loop; call once, at the session's end. */
  readonly stop: () => void
}

/** Intent: whether two playhead readings are the same position. */
function samePosition(a: PlayheadPosition | null, b: PlayheadPosition | null): boolean {
  if (a === null || b === null) return a === b
  return a.phraseNumber === b.phraseNumber && a.measureIndex === b.measureIndex
}

/**
 * Intent: build one session's display and publish its first staff at once: phrase 1, the very
 * phrase Idle shows, in the held layout, with no playhead (the count-in); then start the frame loop.
 */
// @spec-link [[module_session_rolling_display]]
// @spec-link [[rule_phrase_one_is_idle_phrase]]
// @spec-link [[rule_session_layout_fixed_at_start]]
export function createSessionDisplay(deps: SessionDisplayDependencies): SessionDisplay {
  const { audio, frames, heldLayout } = deps
  const tempoMap: PlayheadTempoSegment[] = [
    {
      phraseNumber: 1,
      startsAt: audio.phraseStartsAt(1),
      measureSeconds: measureSeconds(deps.startingTempo),
    },
  ]
  let lastTempo = deps.startingTempo
  let nextTempo = 2
  const readied = new Map<number, WrittenPhrase>([[1, deps.phraseOne]])
  let latestReady = 1
  let playhead: PlayheadPosition | null = null
  let frame: number | null = null
  let stopped = false

  /** Intent: the written phrase of a phrase the plan places; one never readied is a defect. */
  function phraseOf(phraseNumber: number): WrittenPhrase {
    const phrase = readied.get(phraseNumber)
    if (phrase === undefined) {
      throw new Error(`session display: phrase ${phraseNumber} is placed but not readied`)
    }
    return phrase
  }

  /** Intent: a position's content with the written phrase to engrave it from. */
  function systemOf(slot: SystemSlot | null): SessionSystem | null {
    return slot === null ? null : { ...slot, phrase: phraseOf(slot.phraseNumber) }
  }

  /** Intent: hand the screen the staff the plan gives now. */
  function publish(): void {
    const systems = systemsAt(heldLayout, playhead, latestReady)
    const staff: SessionStaff = Object.freeze({
      layout: heldLayout,
      top: systemOf(systems.top),
      bottom: systemOf(systems.bottom),
      playhead,
    })
    deps.publish(staff, latestReady)
  }

  /** Intent: forget the phrases the playhead has left behind; never one at or ahead of it. */
  function prune(): void {
    if (playhead === null) return
    for (const phraseNumber of readied.keys()) {
      if (phraseNumber < playhead.phraseNumber) readied.delete(phraseNumber)
    }
  }

  /**
   * Intent: one frame: read the playhead on heard time and, only when its position changed,
   * prune and publish; then ask for the next frame. An error ends the loop and goes to `fail`.
   */
  // @spec-link [[rule_playhead_follows_audio_clock]]
  function onFrame(): void {
    frame = null
    try {
      const heard = audio.now() - audio.outputLatency()
      const next = playheadAt(heard, tempoMap)
      if (!samePosition(next, playhead)) {
        playhead = next
        prune()
        publish()
      }
    } catch (error: unknown) {
      deps.fail(error)
      return
    }
    if (!stopped) frame = frames.request(onFrame)
  }

  /** Intent: the staff's latest layout inputs; a check before the staff ever reported is a defect. */
  function requireInputs(): StaffLayoutInputs {
    const inputs = deps.latestInputs()
    if (inputs === null) throw new Error('session display: the staff never reported its layout')
    return inputs
  }

  /** Intent: whether `phrase` fits the held layout in the window's budget at `inputs`. */
  // @spec-link [[rule_session_layout_fixed_at_start]]
  function fits(plan: StaffFitPlanner, phrase: WrittenPhrase, inputs: StaffLayoutInputs): boolean {
    return fitsHeldLayout(plan, phrase, heldLayout, inputs)
  }

  /**
   * Intent: the runner's fit check: the attempt's written phrase against the held viewport at the
   * layout inputs current once the planner is ready; notes too wide or no room is a failed attempt.
   */
  // @spec-link [[module_session_display_fit]]
  // @spec-link [[rule_look_ahead_phrase_must_fit_staff]]
  async function checkFit(candidate: FitCandidate): Promise<boolean> {
    requireInputs()
    const phrase = writtenPhraseOf(candidate, deps.phraseOne.clef)
    const plan = await deps.loadPlanner()
    return fits(plan, phrase, requireInputs())
  }

  /**
   * Intent: whether every phrase shown or waiting, as the display stands once the planner is
   * ready, fits the held viewport at `inputs`.
   */
  // @spec-link [[module_session_display_fit]]
  // @spec-link [[rule_session_ends_when_staff_too_small]]
  async function materialFits(inputs: StaffLayoutInputs): Promise<boolean> {
    const plan = await deps.loadPlanner()
    const material = phrasesShownOrWaiting(heldLayout, playhead, latestReady)
    return material.every((phraseNumber) => fits(plan, phraseOf(phraseNumber), inputs))
  }

  /** Intent: take the next readied phrase and publish the staff it may change. */
  // @spec-link [[module_session_rolling_display]]
  function phraseReady(phrase: SessionPhrase): void {
    if (phrase.phraseNumber !== latestReady + 1) {
      throw new Error(
        `session display: phrase ${latestReady + 1} must be readied next, got ${phrase.phraseNumber}`,
      )
    }
    readied.set(phrase.phraseNumber, writtenPhraseOf(phrase, deps.phraseOne.clef))
    latestReady = phrase.phraseNumber
    publish()
  }

  /**
   * Intent: take the next phrase's tempo: a phrase at a tempo other than the one before starts a
   * new segment of the playhead's tempo map at the transport's start of that phrase, as the click
   * plan's own tempo segment does; at the same tempo the segment before runs on.
   */
  // @spec-link [[rule_playhead_follows_audio_clock]]
  // @spec-link [[module_session_rolling_display]]
  function phraseTempo(phraseNumber: number, tempo: number): void {
    if (phraseNumber !== nextTempo) {
      throw new Error(
        `session display: phrase ${nextTempo}'s tempo must come next, got phrase ${phraseNumber}'s`,
      )
    }
    if (tempo !== lastTempo) {
      tempoMap.push({
        phraseNumber,
        startsAt: audio.phraseStartsAt(phraseNumber),
        measureSeconds: measureSeconds(tempo),
      })
    }
    lastTempo = tempo
    nextTempo += 1
  }

  /**
   * Intent: take back the latest readied phrase the engine discarded for a settings change. The
   * engine discards only a phrase none of which is on screen and whose tempo is not fixed yet, so
   * anything else is a defect and throws before anything changes. Nothing on screen changes; the
   * staff is published again for the waiting material it drops.
   */
  // @spec-link [[module_session_rolling_display]]
  // @spec-link [[rule_session_change_applies_at_phrase_boundary]]
  function phraseDiscarded(phraseNumber: number): void {
    if (phraseNumber !== latestReady || phraseNumber === 1 || phraseNumber < nextTempo) {
      throw new Error(
        `session display: phrase ${phraseNumber} cannot be discarded (latest readied ${latestReady}, next tempo ${nextTempo})`,
      )
    }
    if (isPhraseOnScreen(heldLayout, playhead, latestReady, phraseNumber)) {
      throw new Error(
        `session display: phrase ${phraseNumber} is on screen and cannot be discarded`,
      )
    }
    readied.delete(phraseNumber)
    latestReady = phraseNumber - 1
    publish()
  }

  publish()
  frame = frames.request(onFrame)

  return {
    checkFit,
    phraseReady,
    phraseTempo,
    phraseDiscarded,
    materialFits,
    isPhraseOnScreen: (phraseNumber) =>
      isPhraseOnScreen(heldLayout, playhead, latestReady, phraseNumber),
    stop: () => {
      if (stopped) throw new Error('session display: stopped twice')
      stopped = true
      if (frame !== null) frames.cancel(frame)
      frame = null
    },
  }
}
