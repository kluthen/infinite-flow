import { flushPromises } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { GenerationFailedError } from '@/composables/workspace-session-result'
import { NotationError } from '@/notation/notation-error'
import { transformToWrittenPhrase } from '@/domain/notation/written-phrase'
import { notationInputFromOutcome } from '@/domain/notation/notation-input'
import { BUILT_IN_INSTRUMENT_CLEF } from '@/domain/profile/instrument-clef'
import { buildWorkspaceSessionResult } from '../../workspace-test-fixtures'
import { ENGRAVED_PAYLOAD, mountHarness } from './score-panel-harness'
import { createTestWorkspace, type TestWorkspace, useCheapControls } from './test-workspace'

// @test-link [[module_notation_layout_preflight]]
describe('ScorePanel', () => {
  it('renders the empty state with PhraseScore (the reserved system positions) mounted and no phrase', () => {
    const workspace = createTestWorkspace()
    const wrapper = mountHarness(workspace)

    expect(wrapper.get('.staff-frame').classes()).toContain('staff-empty')
    // The staff area reserves its two system positions in every state, the empty one included.
    const phraseScore = wrapper.getComponent({ name: 'PhraseScore' })
    expect(phraseScore.props('phrase')).toBeNull()
    expect(wrapper.get('.phrase-score-stub .staff-empty-copy').text()).toBe(
      'Generate a phrase to begin.',
    )
  })

  it('shows the loading state and announces "Generating phrase" while generation runs', async () => {
    let resolveGenerate: (result: ReturnType<typeof buildWorkspaceSessionResult>) => void
    const pendingGenerate = new Promise<ReturnType<typeof buildWorkspaceSessionResult>>(
      (resolve) => {
        resolveGenerate = resolve
      },
    )
    const workspace = createTestWorkspace(() => pendingGenerate)
    useCheapControls(workspace.session)
    const wrapper = mountHarness(workspace)

    void workspace.session.actions.generate()
    await flushPromises()

    expect(wrapper.get('.staff-frame').classes()).toContain('staff-loading')
    expect(wrapper.get('.generation-status').text()).toBe('Generating phrase')

    resolveGenerate!(buildWorkspaceSessionResult())
    await flushPromises()
    wrapper.getComponent({ name: 'PhraseScore' }).vm.$emit('engraved', {
      staffSpacePx: 1,
      widthPx: 1,
      heightPx: 1,
      requiredUnits: 1,
      systemCount: 1,
    })
    await flushPromises()
  })

  it('reaches the ready state, mounts PhraseScore with the pending phrase, and announces "Phrase ready"', async () => {
    const workspace = createTestWorkspace()
    useCheapControls(workspace.session)
    const wrapper = mountHarness(workspace)

    const generated = workspace.session.actions.generate()
    await flushPromises()

    expect(wrapper.find('.phrase-score-stub').exists()).toBe(true)
    wrapper.getComponent({ name: 'PhraseScore' }).vm.$emit('engraved', {
      staffSpacePx: 1,
      widthPx: 1,
      heightPx: 1,
      requiredUnits: 1,
      systemCount: 1,
    })
    await flushPromises()
    await generated

    expect(wrapper.get('.staff-frame').classes()).toContain('staff-ready')
    expect(wrapper.get('.generation-status').text()).toBe('Phrase ready')
  })

  // @test-link [[rule_generation_failure_alert_copy]]
  it('shows the D29 generic alert banner for an unrecognized error and announces "Generation failed. Try again."', async () => {
    const workspace = createTestWorkspace(async () => {
      throw new Error('generation blew up')
    })
    useCheapControls(workspace.session)
    const wrapper = mountHarness(workspace)

    await workspace.session.actions.generate()
    await flushPromises()

    expect(wrapper.get('.alert-error').text()).toBe("Generation couldn't complete. Try again.")
    expect(wrapper.get('.generation-status').text()).toBe('Generation failed. Try again.')
  })

  // @test-link [[rule_generation_failure_alert_copy]]
  it('shows the D29 typed-code alert banner for a GenerationFailedError, never the raw code or a doubled prefix', async () => {
    const workspace = createTestWorkspace(async () => {
      throw new GenerationFailedError('no_legal_harmony_plan')
    })
    useCheapControls(workspace.session)
    const wrapper = mountHarness(workspace)

    await workspace.session.actions.generate()
    await flushPromises()

    const alertText = wrapper.get('.alert-error').text()
    expect(alertText).toBe(
      "This combination of written key, collection, harmonic motion, and tension can't produce a phrase. Try a different written key, collection, harmonic motion, or tension.",
    )
    expect(alertText).not.toContain('Generation failed')
    expect(alertText).not.toContain('no_legal_harmony_plan')
  })

  it('keeps a still-mounted PhraseScore visible and layers a notation-error banner over it', () => {
    const workspace = createTestWorkspace()
    const result = buildWorkspaceSessionResult()
    const phrase = transformToWrittenPhrase(
      notationInputFromOutcome(result.outcome, result.intent, BUILT_IN_INSTRUMENT_CLEF),
    )
    workspace.pendingPhrase.value = phrase
    const notationError = new NotationError('notation_engraving_failed', 'boom', {})
    const brokenWorkspace: TestWorkspace = {
      ...workspace,
      session: {
        ...workspace.session,
        state: { ...workspace.session.state, notationError },
      },
    }
    const wrapper = mountHarness(brokenWorkspace)

    expect(wrapper.get('.staff-frame').classes()).toContain('staff-error')
    expect(wrapper.find('.phrase-score-stub').exists()).toBe(true)
    expect(wrapper.get('.staff-frame .alert-error').text()).toContain('Notation error')
  })

  // @test-link [[service_idle_generation_session]]
  it('D33: the notation-status live region exists and is empty initially', () => {
    const workspace = createTestWorkspace()
    const wrapper = mountHarness(workspace)

    const notationStatus = wrapper.get('.notation-status')
    expect(notationStatus.attributes('role')).toBe('status')
    expect(notationStatus.attributes('aria-live')).toBe('polite')
    expect(notationStatus.attributes('aria-atomic')).toBe('true')
    expect(notationStatus.text()).toBe('')
  })

  // @test-link [[service_idle_generation_session]]
  it('D33: a fresh generation whose own engraving fails announces "Notation error. Try again." in notation-status, leaving generation-status silent', async () => {
    const workspace = createTestWorkspace()
    useCheapControls(workspace.session)
    const wrapper = mountHarness(workspace)

    const generated = workspace.session.actions.generate()
    await flushPromises()
    wrapper
      .getComponent({ name: 'PhraseScore' })
      .vm.$emit('notation-error', new NotationError('notation_engraving_failed', 'boom', {}))
    await flushPromises()
    await generated

    expect(wrapper.get('.notation-status').text()).toBe('Notation error. Try again.')
    expect(wrapper.get('.generation-status').text()).toBe('')
  })

  // @test-link [[service_idle_generation_session]]
  it('D33: a successful Retry notation silently empties notation-status', async () => {
    const workspace = createTestWorkspace()
    useCheapControls(workspace.session)
    const wrapper = mountHarness(workspace)

    const generated = workspace.session.actions.generate()
    await flushPromises()
    wrapper
      .getComponent({ name: 'PhraseScore' })
      .vm.$emit('notation-error', new NotationError('notation_engraving_failed', 'boom', {}))
    await flushPromises()
    await generated
    expect(wrapper.get('.notation-status').text()).toBe('Notation error. Try again.')

    const retried = workspace.session.actions.retryNotation()
    await flushPromises()
    wrapper.getComponent({ name: 'PhraseScore' }).vm.$emit('engraved', ENGRAVED_PAYLOAD)
    await flushPromises()
    await retried

    expect(wrapper.get('.notation-status').text()).toBe('')
  })

  // @test-link [[service_idle_generation_session]]
  it('D33: an out-of-band notation-error with no pending request announces the same text', async () => {
    const workspace = createTestWorkspace()
    useCheapControls(workspace.session)
    const wrapper = mountHarness(workspace)

    const generated = workspace.session.actions.generate()
    await flushPromises()
    wrapper.getComponent({ name: 'PhraseScore' }).vm.$emit('engraved', ENGRAVED_PAYLOAD)
    await flushPromises()
    await generated
    expect(wrapper.get('.notation-status').text()).toBe('')

    wrapper
      .getComponent({ name: 'PhraseScore' })
      .vm.$emit(
        'notation-error',
        new NotationError('notation_bounds_exceeded', 'resize failed', {}),
      )
    await flushPromises()

    expect(wrapper.get('.notation-status').text()).toBe('Notation error. Try again.')
  })

  // @test-link [[service_idle_generation_session]]
  it('D33: a regenerate whose own engraving fails announces the same text', async () => {
    const workspace = createTestWorkspace()
    useCheapControls(workspace.session)
    const wrapper = mountHarness(workspace)

    const generated = workspace.session.actions.generate()
    await flushPromises()
    wrapper.getComponent({ name: 'PhraseScore' }).vm.$emit('engraved', ENGRAVED_PAYLOAD)
    await flushPromises()
    await generated

    const regenerating = workspace.session.actions.regenerate()
    await flushPromises()
    wrapper
      .getComponent({ name: 'PhraseScore' })
      .vm.$emit('notation-error', new NotationError('notation_engraving_failed', 'boom', {}))
    await flushPromises()
    await regenerating

    expect(wrapper.get('.notation-status').text()).toBe('Notation error. Try again.')
  })

  // @test-link [[service_idle_generation_session]]
  it('D34: a retained unengraved result after a failed regenerate falls back to staff-error with no notation-error text, showing the generation-failure banner instead', async () => {
    let call = 0
    const workspace = createTestWorkspace(async (intent) => {
      call += 1
      if (call <= 2) return buildWorkspaceSessionResult(intent.requestId, intent.seed)
      throw new Error('regeneration blew up')
    })
    useCheapControls(workspace.session)
    const wrapper = mountHarness(workspace)

    const generated = workspace.session.actions.generate()
    await flushPromises()
    wrapper.getComponent({ name: 'PhraseScore' }).vm.$emit('engraved', ENGRAVED_PAYLOAD)
    await flushPromises()
    await generated

    const regeneratingOnce = workspace.session.actions.regenerate()
    await flushPromises()
    wrapper
      .getComponent({ name: 'PhraseScore' })
      .vm.$emit('notation-error', new NotationError('notation_engraving_failed', 'boom', {}))
    await flushPromises()
    await regeneratingOnce
    expect(wrapper.get('.staff-frame').classes()).toContain('staff-error')
    expect(wrapper.get('.staff-frame .alert-error').text()).toContain('Notation error')

    await workspace.session.actions.regenerate()
    await flushPromises()

    expect(wrapper.get('.staff-frame').classes()).toContain('staff-error')
    expect(wrapper.find('.staff-frame .alert-error').exists()).toBe(false)
    expect(wrapper.get('.inline-alert.alert-error').text().length).toBeGreaterThan(0)
  })

  // @test-link [[service_idle_generation_session]]
  it("D34: no staff-error flash during an ordinary regenerate's own engraving step", async () => {
    const workspace = createTestWorkspace()
    useCheapControls(workspace.session)
    const wrapper = mountHarness(workspace)

    const generated = workspace.session.actions.generate()
    await flushPromises()
    wrapper.getComponent({ name: 'PhraseScore' }).vm.$emit('engraved', ENGRAVED_PAYLOAD)
    await flushPromises()
    await generated
    expect(wrapper.get('.staff-frame').classes()).toContain('staff-ready')

    const regenerated = workspace.session.actions.regenerate()
    await flushPromises()

    expect(workspace.session.state.operation).toBe('notating')
    expect(wrapper.get('.staff-frame').classes()).toContain('staff-ready')
    expect(wrapper.get('.staff-frame').classes()).not.toContain('staff-error')

    wrapper.getComponent({ name: 'PhraseScore' }).vm.$emit('engraved', ENGRAVED_PAYLOAD)
    await flushPromises()
    await regenerated

    expect(wrapper.get('.staff-frame').classes()).toContain('staff-ready')
  })
})
