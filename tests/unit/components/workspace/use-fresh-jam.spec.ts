/**
 * The shell's side of a fresh Jam over the session controller rig (fake audio clock, fake MIDI,
 * scripted generations) and Jam's real code: a start runs the Jam under Jam's settings, the cue row
 * follows its phase, the readings show once phrase 1 enters; at its end the Jam goes, and only an
 * end with no phrase 1 by the deadline leaves `jam-notice`, until the next start, a change of a Jam
 * setting or leaving Jam mode; an end with a review hands Jam's kept doodle the Jam part that review
 * shows, and an end before phrase 1 hands none. At 180 BPM: a 4/3 s measure.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { effectScope, shallowRef, type EffectScope } from 'vue'

import { OFF_CHORD_FAMILIES } from '@/domain/chords/chord-families'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { C_KEYBOARD_PROFILE } from '@/domain/profile/instrument-profiles'
import * as jamMode from '@/jam/jam-mode'
import { jamFirstValues, type JamSettingsChange } from '@/jam/jam-settings'
import type { JamStaffState } from '@/jam/jam-view-types'
import type { KeptDoodleState } from '@/jam/use-kept-doodle'
import type { AudioTime } from '@/session/session-types'
import type { ReviewedJamPart } from '@/components/workspace/session-jam-part'
import { useFreshJam, type WorkspaceFreshJam } from '@/components/workspace/use-fresh-jam'
import { reviewedJamPart } from './reviewed-jam-part-fixture'
import {
  alwaysFail,
  alwaysSucceed,
  controllerRig,
  playTo,
  type ControllerRig,
  type GenerateScript,
} from './session-controller-rig'
import { connectKeys, lift, press } from './session-controller-midi'

const TEMPO = 180
const MEASURE = (4 * 60) / TEMPO

/** The shell's fresh Jam on a connected rig, Jam mode showing. */
interface ShellJam {
  readonly rig: ControllerRig
  readonly fresh: WorkspaceFreshJam
  readonly jamShowing: { value: boolean }
  readonly changeTempo: (tempo: number) => void
  /** Change Jam's settings as Jam's controls would. */
  readonly changeJam: (change: JamSettingsChange) => void
  readonly staffState: { value: JamStaffState | null }
  /** Jam's kept doodle, which the shell's fresh Jam hands each ended Jam's part to. */
  readonly keptDoodle: KeptDoodleState
  /** Every Jam part handed to the kept doodle, with its session's key, in order. */
  readonly handed: { readonly jam: ReviewedJamPart; readonly sessionKey: string }[]
}

let scope: EffectScope | null = null

afterEach(() => {
  scope?.stop()
  scope = null
})

/** Intent: a connected rig at 180 BPM and the shell's fresh Jam over it, Jam mode showing. */
async function shellJam(script: GenerateScript = alwaysSucceed): Promise<ShellJam> {
  const rig = controllerRig(script, undefined, { tempo: TEMPO })
  await connectKeys(rig)
  const { tempo, tonalCenter, collection, instrumentProfileId } = rig.settings.controls
  const settings = shallowRef(jamFirstValues({ tempo, tonalCenter, collection }))
  const jamShowing = shallowRef(true)
  const staffState = shallowRef<JamStaffState | null>('shown')
  const keptDoodle = jamMode.useKeptDoodle({
    instrument: () => C_KEYBOARD_PROFILE,
    keyAndMode: () => ({ tonalCenter, collection }),
  })
  const handed: ShellJam['handed'] = []
  scope = effectScope()
  const fresh = scope.run(() =>
    useFreshJam({
      jamModule: () => jamMode,
      jamShowing: () => jamShowing.value,
      controller: () => rig.controller,
      settings: () => ({
        settings: settings.value,
        controls: jamMode.jamGenerationControls(settings.value, instrumentProfileId),
        figureLevels: jamMode.jamFigureLevels(settings.value.embellishments),
      }),
      instrument: () => ({ instrumentProfileId, myInstrument: null }),
      lastEnd: () => rig.controller.state.lastEnd,
      jamStaffState: () => staffState.value,
      keepDoodle: (jam, sessionKey) => {
        handed.push({ jam, sessionKey })
        keptDoodle.keep(jam, sessionKey)
      },
    }),
  )
  if (fresh === undefined) throw new Error('the effect scope ran nothing')
  return {
    rig,
    fresh,
    jamShowing,
    staffState,
    keptDoodle,
    handed,
    changeTempo: (next) => {
      settings.value = { ...settings.value, tempo: next }
    },
    changeJam: (change) => {
      settings.value = { ...settings.value, ...change }
    },
  }
}

/** Intent: the count-in's end of the Jam started last, one measure after its click plan's start. */
function countInEnd(run: ShellJam): AudioTime {
  const started = run.rig.runnerInputsWithoutPhraseOne.at(-1)
  if (started === undefined) throw new Error('no Jam has started')
  return started.start.at + MEASURE
}

/** Intent: a one-measure doodle of four quarter notes from `from`, played live. */
async function playOneMeasure(run: ShellJam, from: AudioTime): Promise<void> {
  for (const [index, pitch] of [60, 62, 64, 65].entries()) {
    await playTo(run.rig, from + (index * MEASURE) / 4 + 0.01)
    press(run.rig, pitch)
    await playTo(run.rig, from + (index * MEASURE) / 4 + 0.2)
    lift(run.rig, pitch)
  }
}

// @test-link [[req_jam]]
describe("the shell's fresh Jam", () => {
  // @test-link [[rule_jam_live_view_never_shows_doodle]]
  // @test-link [[rule_jam_ending_before_phrase_one]]
  it("follows the Jam's phase on the cue row, and lets it go at an end before phrase 1, saying nothing", async () => {
    const run = await shellJam()
    run.fresh.start()
    const ends = countInEnd(run)
    expect(run.rig.controller.state.phase).toBe('count-in')
    expect(run.rig.controller.state.startSettings?.controls.tempo).toBe(TEMPO)
    expect(run.fresh.cue.value?.phase.state).toBe('count-in')
    expect(run.fresh.cue.value?.parts.JamCapture).toBe(jamMode.JamCapture)
    await playTo(run.rig, ends + 0.1)
    expect(run.fresh.cue.value?.phase.state).toBe('capture')
    run.rig.controller.stop()
    expect(run.fresh.cue.value).toBeNull()
    expect(run.fresh.readings.value).toBeNull()
    expect(run.fresh.noticeShown.value).toBe(false)
  })

  // @test-link [[rule_doodle_sets_jam_controls]]
  it('shows the readings once phrase 1 enters, and none after the session ends', async () => {
    const run = await shellJam()
    run.fresh.start()
    const ends = countInEnd(run)
    await playOneMeasure(run, ends)
    await playTo(run.rig, ends + 4.5 * MEASURE)
    expect(run.rig.controller.state.phase).toBe('running')
    expect(run.fresh.readings.value).not.toBeNull()
    run.rig.controller.stop()
    expect(run.rig.controller.state.review?.jam?.doodleControls).toBeDefined()
    expect(run.fresh.readings.value).toBeNull()
    expect(run.fresh.noticeShown.value).toBe(false)
  })

  // @test-link [[rule_jam_ends_when_phrase_one_never_comes]]
  it('shows jam-notice only after every rung failed by the deadline, until a Jam setting changes', async () => {
    const run = await shellJam(alwaysFail)
    run.fresh.start()
    const ends = countInEnd(run)
    await playOneMeasure(run, ends)
    await playTo(run.rig, ends + 6 * MEASURE)
    expect(run.rig.controller.state.lastEnd?.cause).toBe('no-phrase-one')
    expect(run.rig.controller.state.review).toBeNull()
    expect(run.fresh.noticeShown.value).toBe(true)
    run.changeTempo(120)
    expect(run.fresh.noticeShown.value).toBe(true)
    run.fresh.settingChanged()
    expect(run.fresh.noticeShown.value).toBe(false)
  })

  // @test-link [[rule_jam_ends_when_phrase_one_never_comes]]
  it('removes jam-notice at the next start, and when Jam mode is left', async () => {
    const run = await shellJam(alwaysFail)
    run.fresh.start()
    const ends = countInEnd(run)
    await playOneMeasure(run, ends)
    await playTo(run.rig, ends + 6 * MEASURE)
    expect(run.fresh.noticeShown.value).toBe(true)
    run.fresh.start()
    expect(run.fresh.noticeShown.value).toBe(false)
    const again = countInEnd(run)
    await playOneMeasure(run, again)
    await playTo(run.rig, again + 6 * MEASURE)
    expect(run.fresh.noticeShown.value).toBe(true)
    run.jamShowing.value = false
    await Promise.resolve()
    expect(run.fresh.noticeShown.value).toBe(false)
  })

  // @test-link [[rule_jam_ending_before_phrase_one]]
  it("ends the Jam as the staff no longer shown when Jam's staff loses its room before phrase 1", async () => {
    const run = await shellJam()
    run.fresh.start()
    const ends = countInEnd(run)
    await playTo(run.rig, ends + 0.1)
    run.staffState.value = 'no-room'
    expect(run.rig.controller.state.lastEnd).toEqual({
      cause: 'staff-not-shown',
      phase: 'count-in',
      soundedPhraseCount: 0,
    })
    expect(run.fresh.cue.value).toBeNull()
    expect(run.fresh.noticeShown.value).toBe(false)
  })

  // @test-link [[rule_jam_has_own_seventh_chords_level]]
  // @test-link [[req_jam_settings]]
  it("asks every phrase of the Jam at Jam's own Seventh chords level as it started, never session mode's", async () => {
    const asked: GenerationIntent[] = []
    const run = await shellJam((intent) => {
      asked.push(intent)
      return alwaysSucceed(intent)
    })
    expect(run.rig.settings.chordFamilies).toStrictEqual(OFF_CHORD_FAMILIES)
    run.changeJam({ 'seventh-chords': 'stronglyFavored' })
    const before = asked.length
    run.fresh.start()
    run.changeJam({ 'seventh-chords': 'favored' })
    const ends = countInEnd(run)
    await playOneMeasure(run, ends)
    await playTo(run.rig, ends + 9 * MEASURE)

    expect(run.rig.controller.state.phase).toBe('running')
    const jamAsked = asked.slice(before)
    expect(jamAsked.length).toBeGreaterThan(2)
    for (const intent of jamAsked)
      expect(intent.chordFamilies).toStrictEqual({ 'seventh-chords': 'stronglyFavored' })
  })

  // @test-link [[rule_jam_runs_as_session_from_phrase_one]]
  it("leaves a running Jam to the session's own watchers once phrase 1 has entered", async () => {
    const run = await shellJam()
    run.fresh.start()
    const ends = countInEnd(run)
    await playOneMeasure(run, ends)
    await playTo(run.rig, ends + 4.5 * MEASURE)
    expect(run.rig.controller.state.phase).toBe('running')
    run.staffState.value = 'no-room'
    expect(run.rig.controller.state.phase).toBe('running')
    expect(run.rig.controller.state.lastEnd).toBeNull()
  })

  // @test-link [[module_kept_doodle]]
  // @test-link [[rule_held_doodle_dropped_on_change]]
  it("hands Jam's code, at an end with a review, the very Jam part the review shows, and its doodle is kept", async () => {
    const run = await shellJam()
    run.fresh.start()
    const ends = countInEnd(run)
    await playOneMeasure(run, ends)
    await playTo(run.rig, ends + 4.5 * MEASURE)
    run.rig.controller.stop()

    const review = run.rig.controller.state.review
    expect(review?.jam).toBeDefined()
    expect(run.handed).toHaveLength(1)
    expect(run.handed[0]?.jam).toBe(review?.jam)
    expect(run.handed[0]?.sessionKey).toBe(review?.key)
    expect(run.rig.controller.state.lastEnd?.jam?.part).toBe(review?.jam)
    expect(run.keptDoodle.kept.value?.doodle).toBe(review?.jam?.doodle.doodle)
    expect(run.keptDoodle.kept.value?.readings).toBe(review?.jam?.doodleControls)
    expect(run.keptDoodle.kept.value?.sessionKey).toBe(review?.key)
  })

  // @test-link [[module_kept_doodle]]
  // @test-link [[rule_jam_ending_before_phrase_one]]
  it('hands none at an end before phrase 1: a fresh Jam’s doodle is not kept, a kept one stays', async () => {
    const run = await shellJam()
    run.fresh.start()
    const ends = countInEnd(run)
    await playOneMeasure(run, ends)
    run.rig.controller.stop()
    expect(run.rig.controller.state.lastEnd?.soundedPhraseCount).toBe(0)
    expect(run.rig.controller.state.lastEnd?.jam).toBeUndefined()
    expect(run.handed).toEqual([])
    expect(run.keptDoodle.kept.value).toBeNull()

    run.keptDoodle.keep(reviewedJamPart(), 'session-earlier')
    const kept = run.keptDoodle.kept.value
    run.fresh.start()
    await playTo(run.rig, countInEnd(run) + 0.1)
    run.rig.controller.stop()

    expect(run.handed).toEqual([])
    expect(run.keptDoodle.kept.value).toBe(kept)
  })
})
