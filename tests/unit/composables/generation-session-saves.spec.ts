/**
 * The Idle generation session saves the player's changes as they make them: each control action
 * that applies saves exactly the settings it changed (the controls, and the preset selection as
 * v3.0's stored selection while the record is v3.0's), the theme when it changed, and the
 * instrument at once, before any fit run it starts. An action that applies nothing saves nothing.
 */
import { describe, expect, it } from 'vitest'

import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { createDeferred, createFitSession, flushAsync } from './fit-session-harness'

// @test-link [[rule_settings_saved_on_change]]
// @test-link [[rule_saved_setting_is_players_choice]]
describe('createGenerationSession: saving the player changes', () => {
  it('saves a preset-held control edit with the Custom selection it makes', () => {
    const { session, saves } = createFitSession()

    expect(session.actions.setControl('syncopation', 'Occasional offbeats')).toBe(true)

    expect(saves).toEqual([
      {
        'controls.syncopation': 'Occasional offbeats',
        profileSelection: { musicalProfile: 'Neutral', isCustom: true },
      },
    ])
  })

  it('saves a preset choice as the controls it changed and the new selection', () => {
    const { session, saves } = createFitSession()

    expect(session.actions.selectPreset('jazz')).toBe(true)

    expect(saves).toEqual([
      {
        'controls.noteDensity': 'Eighth',
        'controls.syncopation': 'Occasional offbeats',
        'controls.silenceDensity': 'Conversational',
        'controls.contour': 'Wandering',
        'controls.register': 'Varying',
        profileSelection: { musicalProfile: 'Jazz', isCustom: false },
      },
    ])
  })

  it('saves a control no preset holds alone', () => {
    const { session, saves } = createFitSession()

    expect(session.actions.setControl('tempo', 120)).toBe(true)

    expect(saves).toEqual([{ 'controls.tempo': 120 }])
  })

  // @test-link [[module_profile_control_customization]]
  it('saves a level edit as the Custom selection it makes, the levels not saved yet', () => {
    const { session, saves } = createFitSession()

    expect(session.actions.setFigureLevel('neighborTone', 'favored')).toBe(true)
    expect(session.actions.setFigureLevel('passingTone', 'off')).toBe(true)

    expect(saves).toEqual([{ profileSelection: { musicalProfile: 'Neutral', isCustom: true } }, {}])
  })

  // @test-link [[module_generative_profile_selection]]
  it('saves nothing for choosing the preset already selected', () => {
    const { session, saves } = createFitSession()

    expect(session.actions.selectPreset('neutral')).toBe(true)

    expect(saves).toEqual([])
  })

  it('saves nothing for an edit refused while a phrase is generating', async () => {
    const pending = createDeferred<GenerationIntent>()
    const { session, saves } = createFitSession({ generate: () => pending.promise })
    const run = session.actions.generate()

    expect(session.actions.setControl('tempo', 120)).toBe(false)
    expect(session.actions.selectPreset('jazz')).toBe(false)
    expect(session.actions.setFigureLevel('neighborTone', 'off')).toBe(false)
    await expect(session.actions.selectInstrumentProfile('eb-alto')).resolves.toBe('rejected')
    expect(saves).toEqual([])

    pending.resolve(session.state.latestIntent as GenerationIntent)
    await run
  })

  it('saves the theme when it changes, and nothing when it stays the same', () => {
    const { session, saves } = createFitSession()

    session.actions.setTheme('System')
    expect(saves).toEqual([])

    session.actions.setTheme('Dark')
    expect(saves).toEqual([{ theme: 'Dark' }])
  })

  it('saves an instrument switch at once, before the fit run it starts', async () => {
    const generatedAtSave: number[] = []
    const { session, saves, generated } = createFitSession({
      onSave: () => generatedAtSave.push(generated.length),
    })
    await session.actions.generate()
    await flushAsync()
    const generatedBefore = generated.length

    await expect(session.actions.selectInstrumentProfile('eb-alto')).resolves.toBe('regenerated')

    expect(saves).toEqual([{ 'controls.instrumentProfileId': 'eb-alto' }])
    expect(generatedAtSave).toEqual([generatedBefore])
    expect(generated.length).toBeGreaterThan(generatedBefore)

    await expect(session.actions.selectInstrumentProfile('eb-alto')).resolves.toBe('unchanged')
    expect(saves).toHaveLength(1)
  })
})
