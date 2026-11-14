/**
 * The workspace's hold on Jam's own pre-generation queue (use-jam-pregeneration.ts), over Jam's
 * real settings, the real kept doodle and Jam's real phrase 1 at Idle written from it (real
 * generation, a staff that engraves at once), with Jam's real queue on a generate seam the test
 * answers: loaded once Jam's code has loaded, it prepares phrases only for a kept doodle, each
 * carrying phrase 1's steering block; every Jam setting but the tempo, the shared instrument, a
 * new doodle, the doodle let go and Regenerate discard them; the tempo does not; and the end of
 * its scope stops it.
 */
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, shallowRef, watch, type EffectScope } from 'vue'

import { createIdleLayoutGate } from '@/components/workspace/idle-layout-gate'
import {
  createJamPregeneration,
  type JamPregenerationLoader,
} from '@/components/workspace/jam-pregeneration'
import type { JamModeModule } from '@/components/workspace/load-jam-mode'
import { useJamPregeneration } from '@/components/workspace/use-jam-pregeneration'
import { useJamSettings } from '@/components/workspace/use-jam-settings'
import { useKeptDoodlePhrase } from '@/components/workspace/use-kept-doodle-phrase'
import { createPregenerationSlot } from '@/composables/generation-session-pregeneration'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { makeRequestId } from '@/domain/generation/generation-request'
import type { InstrumentProfileId } from '@/domain/profile/instrument-profiles'
import type { MyInstrument } from '@/domain/profile/my-instrument'
import { makeSeed } from '@/domain/random/seed'
import { freshJamSettings } from '@/jam/fresh-jam-settings'
import {
  createJamSettings,
  decodeJamSettings,
  jamFigureLevels,
  jamGenerationControls,
  type JamSettingsChange,
} from '@/jam/jam-settings'
import { climbKeptDoodleLadder } from '@/jam/kept-doodle-phrase-one'
import { useKeptDoodle } from '@/jam/use-kept-doodle'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'

import { resetFakeEngraver } from '../../notation/fake-vexflow-engraver-loader'
import { FAKE_DESKTOP_WINDOW } from '../../session/fake-session-browser'
import { lowHorn } from '../../session/my-instrument-session'
import { queuedProviders, realOutcomeFor } from '../../session/session-harness'
import { createFakePlanner } from './fake-frames'
import { JAM_SHOWING } from './jam-pregeneration-rig'
import { createGatedGenerate, inFlight, WIDE_INPUTS } from './pregeneration-rig'
import { reviewedJamPart } from './reviewed-jam-part-fixture'

vi.mock(
  '@/notation/vexflow-engraver-loader',
  () => import('../../notation/fake-vexflow-engraver-loader'),
)

/** Jam's code, as far as Jam's settings, the kept doodle and phrase 1's climb go. */
const JAM_MODULE = {
  createJamSettings,
  decodeJamSettings,
  jamFigureLevels,
  jamGenerationControls,
  freshJamSettings,
  climbKeptDoodleLadder,
  useKeptDoodle,
} as unknown as JamModeModule

/** Jam's staff's layout, as its PhraseScore reports it once mounted. */
const LAYOUT: StaffLayoutInputs = {
  containerWidthPx: 1200,
  viewport: { layout: 'one-system', heightBudgetPx: null },
}

let scope: EffectScope | null = null

beforeEach(() => {
  resetFakeEngraver()
})

afterEach(() => {
  scope?.stop()
  scope = null
})

/**
 * Intent: Jam mode at Idle, its code loaded only when the test says, with Jam's settings, a kept
 * doodle holder, phrase 1 over them, and the hold on Jam's queue, whose background attempts the
 * test answers.
 */
function hostRig() {
  const jamModule = shallowRef<JamModeModule | null>(null)
  const instrument = shallowRef<{
    instrumentProfileId: InstrumentProfileId
    myInstrument: MyInstrument | null
  }>({ instrumentProfileId: 'c-keyboard', myInstrument: null })
  const counts = { id: 0, seed: 0, sessionSeed: 0, loads: 0 }
  const gated = createGatedGenerate()
  const gate = createIdleLayoutGate({
    layoutInputs: () => undefined,
    engraved: () => undefined,
    notationError: () => undefined,
  })
  gate.layoutInputs(WIDE_INPUTS)
  const failures: unknown[] = []
  const shared = {
    get controls() {
      return {
        ...DEFAULT_GENERATION_CONTROLS,
        instrumentProfileId: instrument.value.instrumentProfileId,
      }
    },
    get myInstrument() {
      return instrument.value.myInstrument
    },
    noteDensityContext: { belowTabletLandscape: false, sessionSteppedDown: false },
  }
  const load: JamPregenerationLoader = (seams) => {
    counts.loads += 1
    return Promise.resolve(
      createJamPregeneration({
        ...seams,
        generate: gated.generate,
        providers: queuedProviders(9000, 0),
        viewport: { isBelowTabletLandscape: () => false },
        slot: createPregenerationSlot(),
        policy: 'enabled',
        shared,
        windowShape: () => FAKE_DESKTOP_WINDOW,
        idleLayout: gate,
        loadPlanner: createFakePlanner().load,
        fail: (error) => failures.push(error),
      }),
    )
  }
  const settled = (scope = effectScope())
  const built = settled.run(() => {
    const jamSettings = useJamSettings({
      jamModule: () => JAM_MODULE,
      jamShowing: () => true,
      records: () => [],
      sessionControls: () => DEFAULT_GENERATION_CONTROLS,
      instrumentProfileId: () => instrument.value.instrumentProfileId,
      saveSettings: () => undefined,
    })
    const keptDoodle = useKeptDoodle({
      instrument: () => instrument.value.myInstrument?.profile ?? lowHorn('treble').profile,
      keyAndMode: () => jamSettings.reviewKeyAndMode(JAM_MODULE),
    })
    const phrase = useKeptDoodlePhrase({
      generation: {
        generate: (intent) => Promise.resolve(realOutcomeFor(intent)),
        providers: {
          nextRequestId: () => makeRequestId(`kept-${++counts.id}`),
          nextSeed: () => makeSeed(++counts.seed),
        },
        nextSessionSeed: () => makeSeed(500 + ++counts.sessionSeed),
        viewport: { isBelowTabletLandscape: () => false },
      },
      jamModule: () => JAM_MODULE,
      jamShowing: () => true,
      kept: () => keptDoodle.kept.value,
      settings: () => jamSettings.view.value,
      instrument: () => instrument.value,
    })
    // The staff engraves each phrase at once, as a mounted PhraseScore reports it.
    watch(
      phrase.written,
      (written) => {
        if (written !== null) phrase.view.value?.staff.handleEngraved()
      },
      { flush: 'sync' },
    )
    const host = useJamPregeneration({
      load,
      jamModule: () => jamModule.value,
      phrase,
      kept: () => keptDoodle.kept.value,
      settings: () => jamSettings.view.value,
      instrument: () => instrument.value,
      facts: () => JAM_SHOWING,
    })
    return { jamSettings, keptDoodle, phrase, host }
  })!
  built.phrase.view.value!.staff.handleLayoutInputs(LAYOUT)
  return { ...built, jamModule, instrument, counts, calls: gated.calls, failures }
}

type HostRig = ReturnType<typeof hostRig>

/** Intent: let every writing and load asked for run through to its end. */
async function settle(): Promise<void> {
  for (let round = 0; round < 6; round += 1) await flushPromises()
}

/** Intent: Jam's code loaded and the fixture's doodle kept, phrase 1 written from it. */
async function keptAndLoaded(rig: HostRig): Promise<void> {
  rig.jamModule.value = JAM_MODULE
  rig.keptDoodle.keep(reviewedJamPart(), 'session-1')
  await settle()
}

/** Intent: a Jam part whose doodle is another doodle than the fixture's, though alike in notes. */
function anotherDoodlesPart(): ReturnType<typeof reviewedJamPart> {
  const part = reviewedJamPart()
  return { ...part, doodle: { ...part.doodle, doodle: { ...part.doodle.doodle } } }
}

/** Intent: answer the background attempt in flight with its real outcome. */
async function answerOne(rig: HostRig): Promise<void> {
  inFlight(rig).resolve(realOutcomeFor(inFlight(rig).intent))
  await settle()
}

/** Intent: the phrase numbers a Jam started now would take, in the wide one-system layout. */
function taken(rig: HostRig): number[] {
  return rig.host.take('one-system').map((ready) => ready.phraseNumber)
}

/**
 * Intent: the phrase numbers a Jam started now would take, then the queue left to resume: a take
 * aborts the attempt in flight and the queue picks up again only once the take's task is over.
 */
async function takenThenResumed(rig: HostRig): Promise<number[]> {
  const numbers = taken(rig)
  await settle()
  return numbers
}

// @test-link [[rule_jam_pregeneration_only_for_kept_doodle]]
describe("the workspace's hold on Jam's own pre-generation queue", () => {
  // @test-link [[rule_jam_pregeneration_only_for_kept_doodle]]
  // @test-link [[module_kept_doodle]]
  it("loads once Jam's code has, and prepares only for a kept doodle, with its steering block", async () => {
    const rig = hostRig()
    await settle()
    expect(rig.counts.loads).toBe(0)
    expect(taken(rig)).toEqual([])

    rig.jamModule.value = JAM_MODULE
    await settle()
    expect(rig.counts.loads).toBe(1)
    expect(rig.calls).toEqual([])

    rig.keptDoodle.keep(reviewedJamPart(), 'session-1')
    await settle()
    const shown = rig.phrase.state.result!
    expect(inFlight(rig).intent.steering).toEqual(shown.steering)
    await answerOne(rig)
    expect(rig.calls.every((call) => call.intent.steering !== undefined)).toBe(true)
    expect(rig.failures).toEqual([])
  })

  // @test-link [[rule_pregeneration_discarded_on_change]]
  // @test-link [[rule_jam_pregeneration_only_for_kept_doodle]]
  it('discards them for each Jam setting but the tempo', async () => {
    const rig = hostRig()
    await keptAndLoaded(rig)
    const changes: JamSettingsChange[] = [
      { tonalCenter: 'G' },
      { collection: 'Dorian' },
      { harmonicMotion: 'Static' },
      { tension: 'Build' },
      { embellishments: 'favored' },
      { drift: 'Free' },
      { rhythmLockOn: true },
      { allowedRhythmChanges: ['split_note'] },
    ]

    for (const change of changes) {
      await answerOne(rig)
      const discarded = inFlight(rig)
      rig.jamSettings.change(change)
      expect(discarded.signal.aborted).toBe(true)
      await settle()
      expect(await takenThenResumed(rig)).toEqual([])
    }
    expect(rig.failures).toEqual([])
  })

  // @test-link [[rule_jam_setting_change_rewrites_kept_phrase_one]]
  // @test-link [[rule_jam_has_own_seventh_chords_level]]
  it("discards them for Jam's Seventh chords level, the doodle kept, and prepares again at the new level", async () => {
    const rig = hostRig()
    await keptAndLoaded(rig)
    const kept = rig.keptDoodle.kept.value
    await answerOne(rig)
    const discarded = inFlight(rig)

    rig.jamSettings.change({ 'seventh-chords': 'stronglyFavored' })

    expect(discarded.signal.aborted).toBe(true)
    await settle()
    expect(rig.keptDoodle.kept.value).toBe(kept)
    expect(inFlight(rig).intent.chordFamilies).toStrictEqual({
      'seventh-chords': 'stronglyFavored',
    })
    expect(await takenThenResumed(rig)).toEqual([])
    expect(rig.failures).toEqual([])
  })

  // @test-link [[rule_pregeneration_discarded_on_change]]
  // @test-link [[rule_shared_setting_changed_in_jam_mode]]
  it("discards them for the shared instrument, my instrument's clef included", async () => {
    const rig = hostRig()
    await keptAndLoaded(rig)

    await answerOne(rig)
    rig.instrument.value = { instrumentProfileId: 'eb-alto', myInstrument: null }
    await settle()
    expect(taken(rig)).toEqual([])

    rig.instrument.value = { instrumentProfileId: 'my-instrument', myInstrument: lowHorn('bass') }
    await settle()
    await answerOne(rig)
    rig.instrument.value = { ...rig.instrument.value, myInstrument: lowHorn('treble') }
    await settle()
    expect(taken(rig)).toEqual([])
    expect(rig.failures).toEqual([])
  })

  // @test-link [[rule_pregeneration_discarded_on_change]]
  it('keeps them for a tempo change', async () => {
    const rig = hostRig()
    await keptAndLoaded(rig)
    await answerOne(rig)
    const kept = inFlight(rig)

    rig.jamSettings.change({ tempo: 150 })
    await settle()

    expect(kept.signal.aborted).toBe(false)
    const ready = rig.host.take('one-system')
    expect(ready.map((phrase) => phrase.phraseNumber)).toEqual([2])
    expect(ready[0]!.intent.controls.tempo).toBe(150)
  })

  // @test-link [[rule_pregeneration_discarded_on_change]]
  // @test-link [[module_kept_doodle]]
  it('discards them for Regenerate, a new doodle kept and the doodle let go', async () => {
    const rig = hostRig()
    await keptAndLoaded(rig)

    await answerOne(rig)
    await expect(rig.phrase.view.value!.actions.regenerate()).resolves.toBe(true)
    await settle()
    expect(await takenThenResumed(rig)).toEqual([])

    await answerOne(rig)
    rig.keptDoodle.keep(anotherDoodlesPart(), 'session-2')
    await settle()
    expect(await takenThenResumed(rig)).toEqual([])

    await answerOne(rig)
    rig.keptDoodle.letGo()
    await settle()
    expect(taken(rig)).toEqual([])
    expect(rig.calls.every((call) => call.settled)).toBe(true)
    expect(rig.failures).toEqual([])
  })

  // @test-link [[rule_jam_pregeneration_only_for_kept_doodle]]
  it('stops the queue with its scope', async () => {
    const rig = hostRig()
    await keptAndLoaded(rig)
    const running = inFlight(rig)

    scope!.stop()
    scope = null

    expect(running.signal.aborted).toBe(true)
  })
})
