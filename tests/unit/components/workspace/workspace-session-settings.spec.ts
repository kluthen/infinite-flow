/**
 * The session's shown settings and the page's `Vary settings` and `Tension across phrases` flags,
 * on their own. A reported
 * change shows when a generated phrase it applies to starts sounding; a repeat shows nothing new,
 * so a change landing on a repeat first shows with the next generated phrase; when several are
 * due, the latest reported wins. Each flag starts off and changes only at Idle.
 */
import { describe, expect, it } from 'vitest'

import {
  createSessionShownSettings,
  createTensionAcrossPhrasesFlag,
  createVarySettingsFlag,
} from '@/components/workspace/workspace-session-settings'
import { SessionControllerError } from '@/components/workspace/workspace-session-controller-types'
import type { SessionControllerPhase } from '@/components/workspace/workspace-session-controller-types'
import type {
  SessionPhrase,
  SessionPhraseOrigin,
  SessionSettings,
  SettingsChangedOutput,
} from '@/session/session-types'
import { phraseOneFor, sessionSettings } from '../../session/session-harness'

const START = sessionSettings({ tempo: 90 })
const ANGULAR = sessionSettings({ tempo: 90, leapiness: 'Angular' })
const SMOOTH = sessionSettings({ tempo: 90, leapiness: 'Smooth' })
const PHRASE = phraseOneFor(START)

/** Intent: session phrase `n` from `origin`; its notes do not matter here. */
function phrase(n: number, origin: SessionPhraseOrigin = 'carry-in'): SessionPhrase {
  return { phraseNumber: n, origin, intent: PHRASE.intent, outcome: PHRASE.outcome }
}

/** Intent: an automatic change of the settings to `settings` from phrase `n` on. */
function changed(n: number, settings: SessionSettings): SettingsChangedOutput {
  return { kind: 'settings-changed', phraseNumber: n, settings, cause: 'automatic' }
}

// @test-link [[rule_automatic_change_updates_controls_quietly]]
// @test-link [[module_session_shown_settings]]
describe('session shown settings', () => {
  // @test-link [[rule_automatic_change_updates_controls_quietly]]
  it('shows the start settings until the phrase a change applies to starts sounding', () => {
    const shown = createSessionShownSettings(START)
    expect(shown.current()).toBe(START)
    shown.settingsChanged(changed(4, ANGULAR))
    expect(shown.phraseSounding(phrase(2))).toBe(START)
    expect(shown.phraseSounding(phrase(3))).toBe(START)
    expect(shown.phraseSounding(phrase(4))).toBe(ANGULAR)
    expect(shown.current()).toBe(ANGULAR)
    expect(shown.phraseSounding(phrase(5))).toBe(ANGULAR)
  })

  // @test-link [[rule_automatic_change_updates_controls_quietly]]
  // @test-link [[rule_mutation_lands_on_scheduled_phrase]]
  it('shows nothing new at a repeat: a change landing on it shows with the next generated phrase', () => {
    const shown = createSessionShownSettings(START)
    shown.settingsChanged(changed(3, ANGULAR))
    expect(shown.phraseSounding(phrase(3, 'repeat'))).toBe(START)
    expect(shown.phraseSounding(phrase(4, 'repeat'))).toBe(START)
    expect(shown.phraseSounding(phrase(5, 'standalone'))).toBe(ANGULAR)
  })

  // @test-link [[rule_session_change_applies_at_phrase_boundary]]
  it('shows the latest change reported when several are due, and keeps later ones pending', () => {
    const shown = createSessionShownSettings(START)
    shown.settingsChanged(changed(3, ANGULAR))
    shown.settingsChanged(changed(3, SMOOTH))
    shown.settingsChanged(changed(5, ANGULAR))
    expect(shown.phraseSounding(phrase(3))).toBe(SMOOTH)
    expect(shown.phraseSounding(phrase(4))).toBe(SMOOTH)
    expect(shown.phraseSounding(phrase(5))).toBe(ANGULAR)
  })
})

// @test-link [[req_settings_mutation_flag]]
// @test-link [[module_session_vary_settings_flag]]
describe('the Vary settings flag', () => {
  // @test-link [[req_settings_mutation_flag]]
  // @test-link [[rule_session_settings_locked]]
  it('starts off and changes at Idle only', () => {
    let phase: SessionControllerPhase = 'idle'
    const flag = createVarySettingsFlag(() => phase)
    expect(flag.on()).toBe(false)
    flag.set(true)
    expect(flag.on()).toBe(true)
    for (const running of ['count-in', 'running'] as const) {
      phase = running
      expect(() => flag.set(false)).toThrow(SessionControllerError)
    }
    expect(flag.on()).toBe(true)
    phase = 'idle'
    flag.set(false)
    expect(flag.on()).toBe(false)
  })
})

// @test-link [[req_multi_phrase_tension_arc]]
// @test-link [[module_session_tension_across_phrases_flag]]
describe('the Tension across phrases flag', () => {
  // @test-link [[req_multi_phrase_tension_arc]]
  // @test-link [[rule_session_settings_locked]]
  it('starts off and changes at Idle only', () => {
    let phase: SessionControllerPhase = 'idle'
    const flag = createTensionAcrossPhrasesFlag(() => phase)
    expect(flag.on()).toBe(false)
    flag.set(true)
    expect(flag.on()).toBe(true)
    for (const running of ['count-in', 'running'] as const) {
      phase = running
      expect(() => flag.set(false)).toThrow(SessionControllerError)
    }
    expect(flag.on()).toBe(true)
    phase = 'idle'
    flag.set(false)
    expect(flag.on()).toBe(false)
  })
})
