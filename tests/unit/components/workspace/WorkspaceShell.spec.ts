import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import WorkspaceShell from '@/components/workspace/WorkspaceShell.vue'
import type { GenerationSession } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import type { GenerationControls } from '@/domain/controls/generation-controls'
import {
  DEFAULT_GENERATION_CONTROLS,
  DEFAULT_PROFILE_SELECTION,
} from '@/domain/controls/profile-selection'
import { createTestWorkspace, PHRASE_SCORE_STUB } from './test-workspace'

const MOUNT_OPTIONS = { global: { stubs: { PhraseScore: PHRASE_SCORE_STUB } } }

/** Intent: build a fake session double whose state/actions a test can override piecemeal. */
function fakeSession(overrides: Partial<GenerationSession<WorkspaceSessionResult>['state']> = {}): {
  session: GenerationSession<WorkspaceSessionResult>
  actions: GenerationSession<WorkspaceSessionResult>['actions']
} {
  const actions: GenerationSession<WorkspaceSessionResult>['actions'] = {
    setControl: vi.fn(() => true),
    selectMusicalProfile: vi.fn(() => true),
    selectInstrumentProfile: vi.fn(async () => 'applied' as const),
    setTheme: vi.fn(() => true),
    generate: vi.fn(async () => true),
    regenerate: vi.fn(async () => true),
    retryGeneration: vi.fn(async () => true),
    retryNotation: vi.fn(async () => true),
    reportNotationFailure: vi.fn(() => true),
    reportNotationRecovered: vi.fn(() => true),
  }
  const session: GenerationSession<WorkspaceSessionResult> = {
    state: {
      controls: DEFAULT_GENERATION_CONTROLS,
      profileSelection: DEFAULT_PROFILE_SELECTION,
      presentation: { theme: 'System' },
      latestIntent: null,
      result: null,
      operation: 'idle',
      generationError: null,
      notationError: null,
      resultEngraved: false,
      ...overrides,
    },
    actions,
  }
  return { session, actions }
}

function mountShell(session: GenerationSession<WorkspaceSessionResult>) {
  return mount(WorkspaceShell, {
    props: {
      session,
      pendingPhrase: null,
      handleEngraved: () => {},
      handleNotationError: () => {},
    },
    ...MOUNT_OPTIONS,
  })
}

describe('WorkspaceShell', () => {
  it('forwards a control-panel set-control event to session.actions.setControl', async () => {
    const { session, actions } = fakeSession()
    const wrapper = mountShell(session)

    const tempoGroup = wrapper.get('[aria-label="Tempo"]')
    await tempoGroup.get('button[aria-label="Increase tempo"]').trigger('click')

    expect(actions.setControl).toHaveBeenCalledWith('tempo', expect.any(Number))
  })

  it('forwards a select-instrument-profile event to session.actions.selectInstrumentProfile', async () => {
    const { session, actions } = fakeSession()
    const wrapper = mountShell(session)

    const profileGroup = wrapper.get('[aria-label="Instrument profile"]')
    await profileGroup.findAll('button')[1]!.trigger('click')

    expect(actions.selectInstrumentProfile).toHaveBeenCalledExactlyOnceWith('bb-tenor')
  })

  it('forwards a select-musical-profile event to session.actions.selectMusicalProfile', async () => {
    const { session, actions } = fakeSession()
    const wrapper = mountShell(session)

    const presetGroup = wrapper.get('[aria-label="Musical profile preset"]')
    await presetGroup.findAll('button')[1]!.trigger('click')

    expect(actions.selectMusicalProfile).toHaveBeenCalledExactlyOnceWith('Jazz')
  })

  it('marks the control panel read-only while an operation is running', () => {
    const { session } = fakeSession({ operation: 'generating' })
    const wrapper = mountShell(session)

    // The presentation-theme control in the header is never read-only, so this targets a
    // ControlPanel radiogroup specifically rather than the first radiogroup in the whole shell.
    const radiogroup = wrapper.get('[aria-label="Written key"]')
    expect(radiogroup.attributes('aria-readonly')).toBe('true')
  })

  it('leaves the control panel selectable when idle', () => {
    const { session } = fakeSession()
    const wrapper = mountShell(session)

    const radiogroup = wrapper.get('[aria-label="Written key"]')
    expect(radiogroup.attributes('aria-readonly')).toBeUndefined()
  })

  // @test-link [[rule_unsupported_rhythm_settings_block_generation]]
  // @test-link [[module_rhythm_variety_grammar]]
  it.each([
    {
      noteDensity: 'Sixteenth' as const,
      silenceDensity: 'Sparse' as const,
      syncopation: 'Active displacement' as const,
      blockedVariety: 'Strict' as const,
      unblockedVariety: 'Slightly varied' as const,
    },
    {
      noteDensity: 'Quarter' as const,
      silenceDensity: 'Sparse' as const,
      syncopation: 'Active displacement' as const,
      blockedVariety: 'Slightly varied' as const,
      unblockedVariety: 'Heavily varied' as const,
    },
  ])(
    'toggles the blocked state, live-region text, and phrase-action disabled state on a rhythmic-variety-only change ($noteDensity/$silenceDensity/$syncopation)',
    ({ noteDensity, silenceDensity, syncopation, blockedVariety, unblockedVariety }) => {
      const baseControls: GenerationControls = {
        ...DEFAULT_GENERATION_CONTROLS,
        noteDensity,
        silenceDensity,
        syncopation,
      }

      const blockedSession = fakeSession({
        controls: { ...baseControls, rhythmicVariety: blockedVariety },
      }).session
      const blockedWrapper = mountShell(blockedSession)
      const blockedRhythmGroup = blockedWrapper
        .findAll('.control-group')
        .find((group) => group.get('h3').text() === 'Rhythm')!
      const blockedStatus = blockedRhythmGroup.get('[role="status"]')
      expect(blockedStatus.classes()).toContain('inline-alert')
      expect(blockedStatus.text()).not.toBe('')
      expect(blockedWrapper.get('button.btn-primary').attributes('disabled')).toBeDefined()

      const unblockedSession = fakeSession({
        controls: { ...baseControls, rhythmicVariety: unblockedVariety },
      }).session
      const unblockedWrapper = mountShell(unblockedSession)
      const unblockedRhythmGroup = unblockedWrapper
        .findAll('.control-group')
        .find((group) => group.get('h3').text() === 'Rhythm')!
      const unblockedStatus = unblockedRhythmGroup.get('[role="status"]')
      expect(unblockedStatus.classes()).not.toContain('inline-alert')
      expect(unblockedStatus.text()).toBe('')
      expect(unblockedWrapper.get('button.btn-primary').attributes('disabled')).toBeUndefined()
    },
  )

  it('always renders the portrait orientation notice alongside the layout root', () => {
    const { session } = fakeSession()
    const wrapper = mountShell(session)

    expect(wrapper.find('.orientation-notice').exists()).toBe(true)
    expect(wrapper.find('.layout-app').exists()).toBe(true)
  })

  it('drives a full generate-to-ready cycle end to end through the real session and coordinator', async () => {
    const workspace = createTestWorkspace()
    const wrapper = mount(WorkspaceShell, {
      props: {
        session: workspace.session,
        pendingPhrase: workspace.pendingPhrase.value,
        handleEngraved: workspace.handleEngraved,
        handleNotationError: workspace.handleNotationError,
      },
      ...MOUNT_OPTIONS,
    })

    await wrapper.get('button.btn-primary').trigger('click')
    await wrapper.setProps({ pendingPhrase: workspace.pendingPhrase.value })
    wrapper.getComponent({ name: 'PhraseScore' }).vm.$emit('engraved', {
      staffSpacePx: 1,
      widthPx: 1,
      heightPx: 1,
      requiredUnits: 1,
      systemCount: 1,
    })
    await Promise.resolve()
    await Promise.resolve()

    expect(workspace.session.state.result).not.toBeNull()
    expect(workspace.session.state.operation).toBe('idle')
  })
})
