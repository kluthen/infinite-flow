import { afterEach, describe, expect, it } from 'vitest'

import { applyThemePreference } from '@/components/workspace/apply-theme-preference'

afterEach(() => {
  document.documentElement.removeAttribute('data-theme')
})

// @test-link [[rule_presentation_preference_preserves_phrase]]
describe('applyThemePreference', () => {
  it('sets data-theme="light" for Light', () => {
    applyThemePreference('Light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('sets data-theme="dark" for Dark', () => {
    applyThemePreference('Dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('removes the data-theme override for System', () => {
    applyThemePreference('Dark')
    applyThemePreference('System')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })
})
