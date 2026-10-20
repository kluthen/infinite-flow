/**
 * The Idle pre-generation queue's key and window re-check: a change of a control, a figure level,
 * a chosen preset whose values differ, the instrument, phrase 1, Vary settings or Tension across
 * phrases empties the queue and starts again from the new phrase 1; tempo keeps it, its phrases
 * then carrying the new tempo, and so does a change of the preset selection alone; a
 * width crossing re-derives the queue and truncates it from the first phrase whose density
 * changed; a staff layout report, or an explicit re-check, truncates it from the first phrase that
 * no longer fits, and pre-generation resumes from there. None of these re-checks runs during a
 * session: they run on the return to Idle. A stale phrase 1 stops nothing: the queue plans its
 * phrases under phrase 1's own settings, as a session started with Use it would.
 */
import { makeMyInstrument } from '@/domain/profile/my-instrument'
import { describe, expect, it } from 'vitest'

import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { builtInPreset } from '@/domain/presets/built-in-presets'
import { choosePreset } from '@/domain/presets/preset-selection'
import {
  answer,
  answerAll,
  flush,
  idlePhraseFor,
  inFlight,
  pregenerationRig,
  takenNumbers,
  type PregenerationRig,
} from './pregeneration-rig'
import { planSeams, planStart, plannedReadyPhrases } from '../../session/pregeneration-harness'
import { sessionSettings, withoutRequestIds } from '../../session/session-harness'

/** One change of the queue's key, made at Idle. */
interface KeyChange {
  readonly name: string
  readonly apply: (rig: PregenerationRig) => void
}

const KEY_CHANGES: readonly KeyChange[] = [
  {
    name: 'a generation control',
    apply: (rig) => {
      rig.idle.controls = { ...rig.idle.controls, contour: 'Arch' }
    },
  },
  {
    name: 'a chosen preset whose values differ (Gentle)',
    apply: (rig) => {
      const chosen = choosePreset(
        { controls: rig.idle.controls, levels: rig.idle.figureLevels },
        rig.idle.selection,
        builtInPreset('gentle'),
      )
      rig.idle.controls = chosen.settings.controls
      rig.idle.figureLevels = chosen.settings.levels
      rig.idle.selection = chosen.selection
    },
  },
  {
    name: 'a figure level',
    apply: (rig) => {
      rig.idle.figureLevels = { ...rig.idle.figureLevels, appoggiatura: 'favored' }
      rig.idle.selection = { kind: 'custom', baseId: 'neutral' }
    },
  },
  {
    name: 'the instrument (whose switch regenerates phrase 1)',
    apply: (rig) => {
      rig.idle.controls = { ...rig.idle.controls, instrumentProfileId: 'bb-tenor' }
      rig.idle.result = idlePhraseFor(rig.idle.controls)
    },
  },
  {
    name: 'a new phrase 1 (a regeneration)',
    apply: (rig) => {
      rig.idle.result = idlePhraseFor(rig.idle.controls, 12)
    },
  },
  {
    name: 'Vary settings',
    apply: (rig) => {
      rig.varySettings.value = true
    },
  },
  {
    name: 'Tension across phrases',
    apply: (rig) => {
      rig.tensionAcrossPhrases.value = true
    },
  },
]

/** Intent: a rig whose queue holds phrases 2 to 5, nothing in flight. */
async function fullRig(options: Parameters<typeof pregenerationRig>[0] = {}) {
  const rig = pregenerationRig(options)
  await answerAll(rig)
  expect(rig.calls).toHaveLength(4)
  return rig
}

/** Intent: the request intents of the calls from `from` on. */
function intentsFrom(rig: PregenerationRig, from: number): GenerationIntent[] {
  return rig.calls.slice(from).map((call) => call.intent)
}

// @test-link [[rule_pregeneration_discarded_on_change]]
describe('Idle pre-generation queue: discards', () => {
  for (const change of KEY_CHANGES) {
    // @test-link [[rule_pregeneration_discarded_on_change]]
    // @test-link [[module_idle_pregeneration_queue]]
    it(`empties the queue and starts again from phrase 2 on a change of ${change.name}`, async () => {
      const rig = await fullRig()

      change.apply(rig)
      await flush()

      expect(rig.calls).toHaveLength(5)
      expect(inFlight(rig).intent.carryIn?.phraseNumber).toBe(1)
      expect(rig.queue.take('one-system')).toEqual([])
    })
  }

  // @test-link [[rule_pregeneration_discarded_on_change]]
  it('keeps the queue on a change of the selection alone, the same controls and levels', async () => {
    const rig = await fullRig()
    const before = rig.queue.take('one-system')
    expect(rig.idle.selection).toEqual({ kind: 'custom', baseId: 'neutral' })

    rig.idle.selection = { kind: 'preset', presetId: 'neutral' }
    await flush()

    expect(rig.calls).toHaveLength(4)
    expect(rig.queue.take('one-system')).toEqual(before)
  })

  // @test-link [[rule_pregeneration_discarded_on_change]]
  it('drops the queue as phrase 1 leaves, so a report right after re-checks nothing', async () => {
    const rig = await fullRig()
    const plansBefore = rig.planner.plans.length

    rig.blocker.value = 'no_phrase'
    rig.idle.result = null
    rig.gate.layoutInputs({ ...rig.gate.latestInputs()!, containerWidthPx: 900 })
    await flush()

    expect(rig.failures).toEqual([])
    expect(rig.planner.plans).toHaveLength(plansBefore)
    expect(rig.calls).toHaveLength(4)
    expect(rig.queue.take('one-system')).toEqual([])
  })

  // @test-link [[rule_pregeneration_discarded_on_change]]
  it('aborts the attempt in flight on a change', async () => {
    const rig = pregenerationRig()
    await answer(rig)
    const phraseThree = inFlight(rig)

    rig.idle.controls = { ...rig.idle.controls, contour: 'Falling' }
    await flush()

    expect(phraseThree.signal.aborted).toBe(true)
    expect(inFlight(rig).intent.carryIn?.phraseNumber).toBe(1)
    expect(inFlight(rig).intent.controls.contour).toBe('Falling')
  })

  // @test-link [[rule_pregeneration_discarded_on_change]]
  it('keeps the queue on a tempo change, Start taking its phrases at the new tempo', async () => {
    const rig = await fullRig()
    const before = rig.queue.take('one-system')

    rig.idle.controls = { ...rig.idle.controls, tempo: 130 }
    await flush()

    expect(rig.calls).toHaveLength(4)
    const taken = rig.queue.take('one-system')
    expect(taken.map((ready) => ready.phraseNumber)).toEqual([2, 3, 4, 5])
    taken.forEach((ready, index) => {
      expect(ready.intent.controls.tempo).toBe(130)
      expect({ ...ready.intent, controls: { ...ready.intent.controls, tempo: 60 } }).toEqual(
        before[index]!.intent,
      )
      expect(ready.outcome).toBe(before[index]!.outcome)
    })
  })
})

// @test-link [[rule_pregeneration_discarded_on_change]]
describe('Idle pre-generation queue: window changes', () => {
  // @test-link [[rule_pregeneration_discarded_on_change]]
  // @test-link [[rule_generated_density_follows_window_width]]
  it('re-derives on a crossing that steps the density down, from the first phrase that changed', async () => {
    const rig = await fullRig({ controls: { noteDensity: 'Sixteenth' } })

    rig.viewport.below = true
    rig.idle.noteDensityContext = { ...rig.idle.noteDensityContext, belowTabletLandscape: true }
    await flush()

    expect(rig.calls).toHaveLength(5)
    expect(inFlight(rig).intent.carryIn?.phraseNumber).toBe(1)
    expect(inFlight(rig).intent.controls.noteDensity).toBe('Eighth')
    expect(rig.queue.take('one-system')).toEqual([])
  })

  // @test-link [[rule_pregeneration_discarded_on_change]]
  it('aborts the attempt in flight on a crossing and requests it again with the window read now', async () => {
    const rig = pregenerationRig({ controls: { noteDensity: 'Sixteenth' } })
    await flush()
    const phraseTwo = inFlight(rig)

    rig.viewport.below = true
    rig.idle.noteDensityContext = { ...rig.idle.noteDensityContext, belowTabletLandscape: true }
    await flush()

    expect(phraseTwo.signal.aborted).toBe(true)
    expect(inFlight(rig).intent.controls.noteDensity).toBe('Eighth')
  })

  // @test-link [[rule_pregeneration_discarded_on_change]]
  it('truncates at the first ready phrase that no longer re-derives at a re-check, and resumes', async () => {
    const rig = pregenerationRig({ controls: { noteDensity: 'Sixteenth' } })
    await answer(rig)
    await answer(rig)
    // The window narrows with no crossing reported yet: phrase 5 is built narrow.
    rig.viewport.below = true
    await answerAll(rig)
    rig.viewport.below = false
    expect(rig.calls.map((call) => call.intent.controls.noteDensity)).toEqual([
      'Sixteenth',
      'Sixteenth',
      'Sixteenth',
      'Eighth',
    ])

    rig.queue.recheck()
    await flush()

    expect(inFlight(rig).intent.carryIn?.phraseNumber).toBe(4)
    expect(inFlight(rig).intent.controls.noteDensity).toBe('Sixteenth')
    await answerAll(rig)
    expect(takenNumbers(rig)).toEqual([2, 3, 4, 5])
  })

  // @test-link [[rule_pregeneration_discarded_on_change]]
  // @test-link [[module_idle_pregeneration_queue]]
  it('truncates at the first ready phrase that no longer fits on a layout report, and resumes', async () => {
    const rig = await fullRig()
    rig.planner.queue({ kind: 'fits' }, { kind: 'notes_too_wide' })
    const narrower = { ...rig.gate.latestInputs()!, containerWidthPx: 700 }

    rig.gate.layoutInputs(narrower)
    await flush()

    expect(rig.planner.plans.at(-1)?.containerWidthPx).toBe(700)
    expect(inFlight(rig).intent.carryIn?.phraseNumber).toBe(2)
    expect(intentsFrom(rig, 4)[0]!.seed).toBe(rig.calls[1]!.intent.seed)
    await answerAll(rig)
    expect(takenNumbers(rig)).toEqual([2, 3, 4, 5])
  })

  // @test-link [[rule_pregeneration_discarded_on_change]]
  // @test-link [[module_idle_pregeneration_queue]]
  it('checks the ready phrases again when my instrument is saved, keeping those that still fit', async () => {
    const rig = await fullRig()
    rig.planner.queue({ kind: 'fits' }, { kind: 'notes_too_wide' })
    const plansBefore = rig.planner.plans.length

    rig.idle.myInstrument = makeMyInstrument({
      template: 'bb-tenor',
      name: 'Low tenor',
      clef: 'bass',
      writtenRange: { minMidi: 28, maxMidi: 52 },
      transposition: { octaves: 1, semitones: 2, direction: 'lower' },
    })
    await flush()

    expect(rig.planner.plans.length).toBeGreaterThan(plansBefore)
    expect(inFlight(rig).intent.carryIn?.phraseNumber).toBe(2)
    await answerAll(rig)
    expect(takenNumbers(rig)).toEqual([2, 3, 4, 5])
  })

  // @test-link [[rule_pregeneration_discarded_on_change]]
  it('checks fits against the layout a session would hold in the window now', async () => {
    const rig = await fullRig()
    rig.window.shape = { widthPx: 900, smallHeightPx: 700, remPx: 16 }
    const plansBefore = rig.planner.plans.length

    rig.gate.layoutInputs({
      containerWidthPx: 880,
      viewport: { layout: 'split', heightBudgetPx: 600 },
    })
    await flush()

    expect(rig.planner.plans.slice(plansBefore).map((plan) => plan.viewport.layout)).toEqual(
      Array(4).fill('split'),
    )
    expect(rig.calls).toHaveLength(4)
  })

  // @test-link [[module_idle_pregeneration_queue]]
  it('re-checks nothing on a layout report or a crossing during a session, and re-checks on the return to Idle', async () => {
    const rig = await fullRig()
    rig.queue.take('one-system')
    rig.blocker.value = 'session_active'
    await flush()
    const plansBefore = rig.planner.plans.length
    rig.planner.queue({ kind: 'fits' }, { kind: 'notes_too_wide' })

    rig.gate.layoutInputs({ ...rig.gate.latestInputs()!, containerWidthPx: 700 })
    rig.idle.noteDensityContext = { ...rig.idle.noteDensityContext, belowTabletLandscape: true }
    rig.idle.noteDensityContext = { ...rig.idle.noteDensityContext, belowTabletLandscape: false }
    await flush()

    expect(rig.planner.plans).toHaveLength(plansBefore)
    expect(rig.calls).toHaveLength(4)
    expect(rig.failures).toEqual([])

    rig.blocker.value = null
    await flush()

    expect(rig.planner.plans.at(-1)?.containerWidthPx).toBe(700)
    expect(inFlight(rig).intent.carryIn?.phraseNumber).toBe(2)
    await answerAll(rig)
    expect(takenNumbers(rig)).toEqual([2, 3, 4, 5])
  })

  // @test-link [[module_idle_pregeneration_queue]]
  it('keeps the queue on a layout report where every ready phrase still fits', async () => {
    const rig = await fullRig()

    rig.gate.layoutInputs({ ...rig.gate.latestInputs()!, containerWidthPx: 1000 })
    await flush()

    expect(rig.calls).toHaveLength(4)
    expect(takenNumbers(rig)).toEqual([2, 3, 4, 5])
  })
})

// @test-link [[module_idle_pregeneration_queue]]
// @test-link [[rule_stale_phrase_prompt_at_start]]
describe('Idle pre-generation queue: a stale phrase 1', () => {
  // @test-link [[module_idle_pregeneration_queue]]
  // @test-link [[module_session_pregeneration_plan]]
  // @test-link [[rule_pregenerated_phrase_matches_session]]
  it("keeps running after a tonal-center change with phrase 1 kept, phrase 2 joined under phrase 1's settings", async () => {
    const rig = await fullRig()
    const phraseOne = rig.idle.result!

    rig.idle.controls = { ...rig.idle.controls, tonalCenter: 'F#' }
    await answerAll(rig)

    expect(rig.failures).toEqual([])
    expect(rig.calls).toHaveLength(8)
    const replanned = intentsFrom(rig, 4)
    expect(replanned[0]!.carryIn?.phraseNumber).toBe(1)
    expect(replanned[0]!.carryIn?.finalHarmony).toBeNull()
    expect(replanned.every((intent) => intent.controls.tonalCenter === 'F#')).toBe(true)
    const session = sessionSettings({ tempo: 60, tonalCenter: 'F#' })
    const planned = plannedReadyPhrases(
      planSeams(),
      planStart({
        settings: session,
        phraseOne: { intent: phraseOne.intent, outcome: phraseOne.outcome },
        phraseOneSettings: sessionSettings({ tempo: 60 }),
        sessionSeed: phraseOne.sessionSeed,
      }),
    )
    expect(withoutRequestIds(replanned)).toEqual(
      withoutRequestIds(planned.map((ready) => ready.intent)),
    )
    expect(takenNumbers(rig)).toEqual([2, 3, 4, 5])
  })
})
