import { describe, expect, it } from 'vitest'

import { generationFailureAlertText } from '@/composables/generation-failure-alert'
import { GenerationFailedError } from '@/composables/workspace-session-result'
import type { GenerationFailureCode } from '@/domain/generation/orchestration/orchestration-types'

/**
 * D29's exact per-code strings, copied verbatim from the handoff for byte-for-byte assertion.
 * `search_limit_exceeded` is the D30-amended string (fresh-seed retry semantics).
 */
const EXPECTED_TEXT: Record<GenerationFailureCode, string> = {
  no_legal_harmony_plan:
    "This combination of tonal center, collection, harmonic motion, tension, and musical profile can't produce a phrase. Try a different tonal center, collection, harmonic motion, tension, or profile.",
  no_legal_rhythm_plan:
    "This combination of note density, syncopation, and silence can't form a four-bar phrase. Try a different note density, syncopation, or silence setting.",
  no_legal_pitch_plan:
    "This combination of settings can't produce a phrase. Try a different register, contour, or rhythm setting.",
  no_eligible_register_window:
    "None of this instrument's register windows fit the current settings while register is set to Varying. Try a different contour.",
  search_limit_exceeded:
    "This phrase search hit its work limit before finding a result. That doesn't prove this combination is impossible. Trying again may find a result, or try different settings.",
  result_validation_failed:
    "Something went wrong while building this phrase. This wasn't caused by your settings.",
}

const GENERIC_TEXT = "Generation couldn't complete. Try again."

// @test-link [[rule_generation_failure_alert_copy]]
describe('generationFailureAlertText', () => {
  for (const code of Object.keys(EXPECTED_TEXT) as GenerationFailureCode[]) {
    // @test-link [[rule_generation_failure_alert_copy]]
    it(`maps ${code} to its exact D29 alert string`, () => {
      expect(generationFailureAlertText(new GenerationFailedError(code))).toBe(EXPECTED_TEXT[code])
    })
  }

  // @test-link [[rule_generation_failure_alert_copy]]
  it('never doubles the "Generation failed" prefix or exposes the raw failure code', () => {
    const text = generationFailureAlertText(new GenerationFailedError('no_legal_pitch_plan'))
    expect(text).not.toContain('Generation failed')
    expect(text).not.toContain('no_legal_pitch_plan')
  })

  // @test-link [[rule_generation_failure_alert_copy]]
  it('maps a generation-Worker crash to the generic fallback string', () => {
    expect(
      generationFailureAlertText(new Error('Generation worker crashed: TypeError: boom')),
    ).toBe(GENERIC_TEXT)
  })

  // @test-link [[rule_generation_failure_alert_copy]]
  it('maps a generation-Worker transport failure to the generic fallback string', () => {
    expect(
      generationFailureAlertText(new Error('Generation worker raised an "error" event.')),
    ).toBe(GENERIC_TEXT)
  })

  // @test-link [[rule_generation_failure_alert_copy]]
  it('maps any other unrecognized error to the generic fallback string', () => {
    expect(generationFailureAlertText(new Error('something unexpected'))).toBe(GENERIC_TEXT)
  })
})
