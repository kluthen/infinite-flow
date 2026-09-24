import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'

import ScorePanel from '@/components/workspace/ScorePanel.vue'
import { NotationError } from '@/notation/notation-error'
import { transformToWrittenPhrase } from '@/domain/notation/written-phrase'
import { notationInputFromOutcome } from '@/domain/notation/notation-input'
import { buildWorkspaceSessionResult } from '../../workspace-test-fixtures'
import {
  createTestWorkspace,
  PHRASE_SCORE_STUB,
  type TestWorkspace,
  useCheapControls,
} from './test-workspace'

const MOUNT_OPTIONS = { global: { stubs: { PhraseScore: PHRASE_SCORE_STUB } } }

/** Intent: a thin reactive harness that re-reads `workspace.pendingPhrase.value` on every render. */
const ScorePanelHarness = defineComponent({
  props: { workspace: { type: Object, required: true } },
  setup(props) {
    return () =>
      h(ScorePanel, {
        session: (props.workspace as TestWorkspace).session,
        pendingPhrase: (props.workspace as TestWorkspace).pendingPhrase.value,
        handleEngraved: (props.workspace as TestWorkspace).handleEngraved,
        handleNotationError: (props.workspace as TestWorkspace).handleNotationError,
      })
  },
})

function mountHarness(workspace: TestWorkspace) {
  return mount(ScorePanelHarness, { props: { workspace }, ...MOUNT_OPTIONS })
}

// @test-link [[module_notation_layout_preflight]]
describe('ScorePanel', () => {
  it('renders the empty state with no PhraseScore mounted before any phrase exists', () => {
    const workspace = createTestWorkspace()
    const wrapper = mountHarness(workspace)

    expect(wrapper.get('.staff-frame').classes()).toContain('staff-empty')
    expect(wrapper.find('.phrase-score-stub').exists()).toBe(false)
    expect(wrapper.get('.staff-empty-copy').text()).toBe('Generate a phrase to begin.')
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

  it('shows a generation-error banner in the toolbar and announces "Generation failed. Try again."', async () => {
    const workspace = createTestWorkspace(async () => {
      throw new Error('generation blew up')
    })
    useCheapControls(workspace.session)
    const wrapper = mountHarness(workspace)

    await workspace.session.actions.generate()
    await flushPromises()

    expect(wrapper.get('.alert-error').text()).toContain('Generation failed')
    expect(wrapper.get('.generation-status').text()).toBe('Generation failed. Try again.')
  })

  it('keeps a still-mounted PhraseScore visible and layers a notation-error banner over it', () => {
    const workspace = createTestWorkspace()
    const result = buildWorkspaceSessionResult()
    const phrase = transformToWrittenPhrase(
      notationInputFromOutcome(result.outcome, result.intent),
      'Concert',
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
})
