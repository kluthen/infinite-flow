import { describe, expect, it } from 'vitest'

import { NOTE_DENSITIES, type NoteDensity } from '@/domain/controls/generation-controls'
import {
  resolveGeneratedControls,
  resolveGeneratedNoteDensity,
  type NoteDensityContext,
} from '@/domain/controls/generated-note-density'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'

const WIDE_IDLE: NoteDensityContext = { belowTabletLandscape: false, sessionSteppedDown: false }
const NARROW_IDLE: NoteDensityContext = { belowTabletLandscape: true, sessionSteppedDown: false }

// @test-link [[rule_generated_density_follows_window_width]]
// @test-link [[module_generation_control_catalog]]
describe('resolveGeneratedNoteDensity: the density follows the window width', () => {
  it('generates a chosen Sixteenth as Eighth below bp-tablet-landscape', () => {
    expect(resolveGeneratedNoteDensity('Sixteenth', NARROW_IDLE)).toBe('Eighth')
  })

  it('applies a chosen Sixteenth again at or above bp-tablet-landscape', () => {
    expect(resolveGeneratedNoteDensity('Sixteenth', WIDE_IDLE)).toBe('Sixteenth')
  })

  it.each(['Quarter', 'Eighth'] as const)(
    'leaves a chosen %s unchanged at either width',
    (chosen) => {
      expect(resolveGeneratedNoteDensity(chosen, NARROW_IDLE)).toBe(chosen)
      expect(resolveGeneratedNoteDensity(chosen, WIDE_IDLE)).toBe(chosen)
    },
  )

  it('follows each crossing at Idle: every phrase takes the width it is generated at', () => {
    const widths = [false, true, false, true, true, false]
    const generated = widths.map((belowTabletLandscape) =>
      resolveGeneratedNoteDensity('Sixteenth', { belowTabletLandscape, sessionSteppedDown: false }),
    )
    expect(generated).toEqual(['Sixteenth', 'Eighth', 'Sixteenth', 'Eighth', 'Eighth', 'Sixteenth'])
  })

  it('never raises the density above the chosen value, in any context', () => {
    const rank = (density: NoteDensity) => NOTE_DENSITIES.indexOf(density)
    for (const chosen of NOTE_DENSITIES)
      for (const belowTabletLandscape of [false, true])
        for (const sessionSteppedDown of [false, true]) {
          const generated = resolveGeneratedNoteDensity(chosen, {
            belowTabletLandscape,
            sessionSteppedDown,
          })
          expect(rank(generated)).toBeLessThanOrEqual(rank(chosen))
          expect(generated === chosen || (chosen === 'Sixteenth' && generated === 'Eighth')).toBe(
            true,
          )
        }
  })
})

// @test-link [[rule_session_density_only_steps_down]]
describe('resolveGeneratedNoteDensity: during a session the density only steps down', () => {
  it('uses the chosen Sixteenth in a wide window while the session has not stepped down', () => {
    expect(
      resolveGeneratedNoteDensity('Sixteenth', {
        belowTabletLandscape: false,
        sessionSteppedDown: false,
      }),
    ).toBe('Sixteenth')
  })

  it('generates Eighth below bp-tablet-landscape whether or not the session has stepped down', () => {
    for (const sessionSteppedDown of [false, true])
      expect(
        resolveGeneratedNoteDensity('Sixteenth', {
          belowTabletLandscape: true,
          sessionSteppedDown,
        }),
      ).toBe('Eighth')
  })

  it('keeps a session that stepped down at Eighth when the window widens again', () => {
    expect(
      resolveGeneratedNoteDensity('Sixteenth', {
        belowTabletLandscape: false,
        sessionSteppedDown: true,
      }),
    ).toBe('Eighth')
  })

  it('never changes a chosen Quarter or Eighth, stepped down or not', () => {
    for (const chosen of ['Quarter', 'Eighth'] as const)
      for (const belowTabletLandscape of [false, true])
        expect(
          resolveGeneratedNoteDensity(chosen, { belowTabletLandscape, sessionSteppedDown: true }),
        ).toBe(chosen)
  })

  it('applies the chosen value again from Idle, where no session has stepped down', () => {
    // Narrow during the session, stepped down, widened again, then the session ends: Idle
    // generation has no stepped-down session behind it.
    expect(resolveGeneratedNoteDensity('Sixteenth', WIDE_IDLE)).toBe('Sixteenth')
  })
})

// @test-link [[rule_generated_density_follows_window_width]]
describe('resolveGeneratedControls', () => {
  it('replaces only the note density, leaving every other control and the chosen controls untouched', () => {
    const chosen = { ...DEFAULT_GENERATION_CONTROLS, noteDensity: 'Sixteenth' as const }
    const generated = resolveGeneratedControls(chosen, NARROW_IDLE)
    expect(generated).toEqual({ ...chosen, noteDensity: 'Eighth' })
    expect(chosen.noteDensity).toBe('Sixteenth')
    expect(Object.isFrozen(generated)).toBe(true)
  })

  it('returns the chosen controls themselves when nothing changes', () => {
    const chosen = { ...DEFAULT_GENERATION_CONTROLS, noteDensity: 'Sixteenth' as const }
    expect(resolveGeneratedControls(chosen, WIDE_IDLE)).toBe(chosen)
  })
})
