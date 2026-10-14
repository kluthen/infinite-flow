/**
 * The workspace session and the note-density rule at Idle: each phrase is generated with the
 * density the window's width gives when it is generated, read through the injected width provider;
 * the chosen value is kept; the unsupported-rhythm block judges the density generated with; and a
 * crossing of `bp-tablet-landscape` never generates anything by itself.
 */
import { describe, expect, it } from 'vitest'

import { createGenerationSession } from '@/composables/use-generation-session'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { makeSeed } from '@/domain/random/seed'
import { alwaysFitsStaff } from './fake-staff-fit'
import { countingSessionSeeds } from './fake-session-seed'
import { createFakeViewportWidth } from './fake-viewport-width'

/** A Sixteenth combination blocked from `bp-tablet-landscape` up and allowed below it. */
const SIXTEENTH_ONLY_BLOCKED = {
  noteDensity: 'Sixteenth',
  rhythmicVariety: 'Strict',
  silenceDensity: 'Sparse',
  syncopation: 'Active displacement',
} as const

/** Intent: a session whose `generate` seam records and returns every intent it receives. */
function densitySession(initiallyBelowTabletLandscape: boolean) {
  const viewport = createFakeViewportWidth(initiallyBelowTabletLandscape)
  const intents: GenerationIntent[] = []
  let counter = 0
  const session = createGenerationSession<GenerationIntent>({
    saveSettings: () => undefined,
    ...alwaysFitsStaff(),
    providers: {
      nextRequestId: () => makeRequestId(`density-${++counter}`),
      nextSeed: () => makeSeed(counter),
    },
    nextSessionSeed: countingSessionSeeds(),
    withSessionSeed: (generated) => generated,
    viewport,
    generate: async (intent) => {
      intents.push(intent)
      return intent
    },
    notate: async () => undefined,
  })
  return { session, viewport, intents }
}

// @test-link [[rule_generated_density_follows_window_width]]
// @test-link [[rule_sixteenth_unavailable_below_tablet_width]]
// @test-link [[module_idle_window_width_density]]
describe('generation session: the density a phrase is generated with', () => {
  it('generates a chosen Sixteenth as Eighth below bp-tablet-landscape and keeps it chosen', async () => {
    const { session, intents } = densitySession(true)
    session.actions.setControl('noteDensity', 'Sixteenth')
    const selectionBefore = session.state.profileSelection

    await expect(session.actions.generate()).resolves.toBe(true)

    expect(intents[0]!.controls.noteDensity).toBe('Eighth')
    expect(session.state.controls.noteDensity).toBe('Sixteenth')
    expect(session.state.profileSelection).toBe(selectionBefore)
  })

  it('applies the chosen Sixteenth again to the next phrase generated at or above the width', async () => {
    const { session, viewport, intents } = densitySession(true)
    session.actions.setControl('noteDensity', 'Sixteenth')
    await session.actions.generate()
    viewport.cross(false)
    await session.actions.regenerate()
    viewport.cross(true)
    await session.actions.regenerate()

    expect(intents.map((intent) => intent.controls.noteDensity)).toEqual([
      'Eighth',
      'Sixteenth',
      'Eighth',
    ])
  })

  it('reads the width when the phrase is generated, not when a crossing was last reported', async () => {
    const { session, viewport, intents } = densitySession(false)
    session.actions.setControl('noteDensity', 'Sixteenth')
    viewport.setWithoutNotifying(true)

    await session.actions.generate()

    expect(intents[0]!.controls.noteDensity).toBe('Eighth')
  })

  it('uses the width for Retry generation too', async () => {
    const viewport = createFakeViewportWidth(false)
    const intents: GenerationIntent[] = []
    let counter = 0
    const session = createGenerationSession<GenerationIntent>({
      saveSettings: () => undefined,
      ...alwaysFitsStaff(),
      providers: {
        nextRequestId: () => makeRequestId(`retry-${++counter}`),
        nextSeed: () => makeSeed(counter),
      },
      nextSessionSeed: countingSessionSeeds(),
      withSessionSeed: (generated) => generated,
      viewport,
      generate: async (intent) => {
        intents.push(intent)
        if (intents.length === 1) throw new Error('first attempt fails')
        return intent
      },
      notate: async () => undefined,
    })
    session.actions.setControl('noteDensity', 'Sixteenth')
    await session.actions.generate()
    viewport.cross(true)

    await expect(session.actions.retryGeneration()).resolves.toBe(true)

    expect(intents.map((intent) => intent.controls.noteDensity)).toEqual(['Sixteenth', 'Eighth'])
  })

  it('mirrors each crossing in its readonly note-density context, without generating', async () => {
    const { session, viewport, intents } = densitySession(false)
    session.actions.setControl('noteDensity', 'Sixteenth')
    await session.actions.generate()
    const shown = session.state.result

    expect(session.state.noteDensityContext).toEqual({
      belowTabletLandscape: false,
      sessionSteppedDown: false,
    })
    viewport.cross(true)
    expect(session.state.noteDensityContext.belowTabletLandscape).toBe(true)
    viewport.cross(false)
    expect(session.state.noteDensityContext.belowTabletLandscape).toBe(false)

    expect(intents).toHaveLength(1)
    expect(session.state.result).toBe(shown)
    expect(session.state.operation).toBe('idle')
  })

  it('stops listening for crossings once disposed', () => {
    const { session, viewport } = densitySession(false)
    expect(viewport.listenerCount()).toBe(1)
    session.dispose()
    expect(viewport.listenerCount()).toBe(0)
  })
})

// @test-link [[rule_unsupported_rhythm_settings_block_generation]]
describe('generation session: unsupported rhythm settings judged on the density generated with', () => {
  it('blocks a Sixteenth-only combination from bp-tablet-landscape up', async () => {
    const { session, intents } = densitySession(false)
    for (const [key, value] of Object.entries(SIXTEENTH_ONLY_BLOCKED))
      session.actions.setControl(key as keyof typeof SIXTEENTH_ONLY_BLOCKED, value as never)

    await expect(session.actions.generate()).resolves.toBe(false)
    expect(intents).toHaveLength(0)
  })

  it('allows the same combination below bp-tablet-landscape, generated with Eighth', async () => {
    const { session, intents } = densitySession(true)
    for (const [key, value] of Object.entries(SIXTEENTH_ONLY_BLOCKED))
      session.actions.setControl(key as keyof typeof SIXTEENTH_ONLY_BLOCKED, value as never)

    await expect(session.actions.generate()).resolves.toBe(true)
    expect(intents[0]!.controls).toMatchObject({ ...SIXTEENTH_ONLY_BLOCKED, noteDensity: 'Eighth' })
  })

  it('blocks or unblocks with a crossing at Idle, judged at the width the action is taken', async () => {
    const { session, viewport, intents } = densitySession(true)
    for (const [key, value] of Object.entries(SIXTEENTH_ONLY_BLOCKED))
      session.actions.setControl(key as keyof typeof SIXTEENTH_ONLY_BLOCKED, value as never)
    await session.actions.generate()

    viewport.cross(false)
    await expect(session.actions.regenerate()).resolves.toBe(false)
    viewport.cross(true)
    await expect(session.actions.regenerate()).resolves.toBe(true)

    expect(intents.map((intent) => intent.controls.noteDensity)).toEqual(['Eighth', 'Eighth'])
  })

  it('regenerates on a profile switch below the width instead of clearing the phrase', async () => {
    const { session, intents } = densitySession(true)
    for (const [key, value] of Object.entries(SIXTEENTH_ONLY_BLOCKED))
      session.actions.setControl(key as keyof typeof SIXTEENTH_ONLY_BLOCKED, value as never)
    await session.actions.generate()

    await expect(session.actions.selectInstrumentProfile('c-keyboard')).resolves.toBe('regenerated')
    expect(intents[1]!.controls.noteDensity).toBe('Eighth')
  })

  it('clears the phrase on a profile switch at or above the width, where the combination is blocked', async () => {
    const { session, viewport } = densitySession(true)
    for (const [key, value] of Object.entries(SIXTEENTH_ONLY_BLOCKED))
      session.actions.setControl(key as keyof typeof SIXTEENTH_ONLY_BLOCKED, value as never)
    await session.actions.generate()
    viewport.cross(false)

    await expect(session.actions.selectInstrumentProfile('c-keyboard')).resolves.toBe(
      'cleared_unsupported_rhythm',
    )
    expect(session.state.result).toBeNull()
  })
})
