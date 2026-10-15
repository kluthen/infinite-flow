/**
 * The Idle pre-generation queue's key and window re-check: a change of a control, the musical
 * profile, the instrument, phrase 1, Vary settings or Tension across phrases empties the queue and
 * starts again from the new phrase 1; tempo keeps it, its phrases then carrying the new tempo; a
 * width crossing re-derives the queue and truncates it from the first phrase whose density
 * changed; a staff layout report, or an explicit re-check, truncates it from the first phrase that
 * no longer fits, and pre-generation resumes from there.
 */
import { makeMyInstrument } from '@/domain/profile/my-instrument'
import { describe, expect, it } from 'vitest'

import type { GenerationIntent } from '@/domain/generation/generation-intent'
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
    name: 'the musical profile',
    apply: (rig) => {
      rig.idle.profileSelection = { musicalProfile: 'Jazz', isCustom: false }
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
  it('keeps the queue on a layout report where every ready phrase still fits', async () => {
    const rig = await fullRig()

    rig.gate.layoutInputs({ ...rig.gate.latestInputs()!, containerWidthPx: 1000 })
    await flush()

    expect(rig.calls).toHaveLength(4)
    expect(takenNumbers(rig)).toEqual([2, 3, 4, 5])
  })
})

// @test-link [[module_idle_pregeneration_queue]]
describe('Idle pre-generation queue: a carry-in that no longer holds', () => {
  // @test-link [[module_idle_pregeneration_queue]]
  it('stops unreported after a tonal-center change with phrase 1 kept, and runs again on a new phrase 1', async () => {
    const rig = await fullRig()

    rig.idle.controls = { ...rig.idle.controls, tonalCenter: 'F#' }
    await flush()

    expect(rig.failures).toEqual([])
    expect(rig.calls).toHaveLength(4)
    expect(rig.calls.every((call) => call.settled)).toBe(true)
    expect(rig.queue.take('one-system')).toEqual([])

    rig.queue.recheck()
    rig.gate.layoutInputs({ ...rig.gate.latestInputs()!, containerWidthPx: 1000 })
    await flush()
    expect(rig.calls).toHaveLength(4)

    rig.idle.result = idlePhraseFor(rig.idle.controls, 12)
    await flush()

    expect(rig.failures).toEqual([])
    expect(rig.calls).toHaveLength(5)
    expect(inFlight(rig).intent.carryIn?.phraseNumber).toBe(1)
    expect(inFlight(rig).intent.controls.tonalCenter).toBe('F#')
  })
})
