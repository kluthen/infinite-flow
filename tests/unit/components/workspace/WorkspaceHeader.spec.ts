import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import WorkspaceHeader from '@/components/workspace/WorkspaceHeader.vue'
import type { GenerationSession } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import {
  DEFAULT_GENERATION_CONTROLS,
  DEFAULT_PROFILE_SELECTION,
} from '@/domain/controls/profile-selection'
import type { GenerationControls } from '@/domain/controls/generation-controls'
import { buildWorkspaceSessionResult } from '../../workspace-test-fixtures'

const UNSUPPORTED_CONTROLS: GenerationControls = {
  ...DEFAULT_GENERATION_CONTROLS,
  noteDensity: 'Quarter',
  silenceDensity: 'Sparse',
  syncopation: 'Active displacement',
}

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
      noteDensityContext: { belowTabletLandscape: false, sessionSteppedDown: false },
      roomNotice: null,
      retriesRunning: false,
      roomNoticeAnnouncements: 0,
      ...overrides,
    },
    actions,
    dispose: vi.fn(),
  }
  return { session, actions }
}

function primaryButton(wrapper: ReturnType<typeof mount>) {
  return wrapper.get('button.btn-primary')
}

// @test-link [[user_story_controlled_phrase_generation]]
// @test-link [[rule_unsupported_rhythm_settings_block_generation]]
describe('WorkspaceHeader', () => {
  it('renders the brand mark', () => {
    const { session } = fakeSession()
    const wrapper = mount(WorkspaceHeader, { props: { session } })

    expect(wrapper.get('h1.brand-mark').text()).toBe('Infinite Flow')
  })

  it('labels the primary action "Generate phrase" with no prior result or errors', () => {
    const { session } = fakeSession()
    const wrapper = mount(WorkspaceHeader, { props: { session } })

    expect(primaryButton(wrapper).text()).toBe('Generate phrase')
  })

  it('labels the primary action "Regenerate phrase" once a result exists', () => {
    const { session } = fakeSession({ result: buildWorkspaceSessionResult() })
    const wrapper = mount(WorkspaceHeader, { props: { session } })

    expect(primaryButton(wrapper).text()).toBe('Regenerate phrase')
  })

  it('labels the primary action "Retry generation" after a generation error', () => {
    const { session } = fakeSession({ generationError: new Error('boom') })
    const wrapper = mount(WorkspaceHeader, { props: { session } })

    expect(primaryButton(wrapper).text()).toBe('Retry generation')
  })

  it('labels the primary action "Retry notation" after a notation error, even with a generation error present', () => {
    const { session } = fakeSession({
      generationError: new Error('boom'),
      notationError: new Error('notation boom'),
    })
    const wrapper = mount(WorkspaceHeader, { props: { session } })

    expect(primaryButton(wrapper).text()).toBe('Retry notation')
  })

  it('disables the primary action while an operation is running', () => {
    const { session } = fakeSession({ operation: 'generating' })
    const wrapper = mount(WorkspaceHeader, { props: { session } })

    expect(primaryButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('disables Generate under an unsupported rhythm combination', () => {
    const { session } = fakeSession({ controls: UNSUPPORTED_CONTROLS })
    const wrapper = mount(WorkspaceHeader, { props: { session } })

    expect(primaryButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('judges a Sixteenth-only combination on the density generated with: blocked from the width up, allowed below', () => {
    const sixteenthOnly: GenerationControls = {
      ...DEFAULT_GENERATION_CONTROLS,
      noteDensity: 'Sixteenth',
      rhythmicVariety: 'Strict',
      silenceDensity: 'Sparse',
      syncopation: 'Active displacement',
    }
    const wide = fakeSession({ controls: sixteenthOnly }).session
    const narrow = fakeSession({
      controls: sixteenthOnly,
      noteDensityContext: { belowTabletLandscape: true, sessionSteppedDown: false },
    }).session

    expect(
      primaryButton(mount(WorkspaceHeader, { props: { session: wide } })).attributes('disabled'),
    ).toBeDefined()
    expect(
      primaryButton(mount(WorkspaceHeader, { props: { session: narrow } })).attributes('disabled'),
    ).toBeUndefined()
  })

  it('does not disable Retry notation for an unsupported rhythm combination', () => {
    const { session } = fakeSession({
      controls: UNSUPPORTED_CONTROLS,
      notationError: new Error('notation boom'),
    })
    const wrapper = mount(WorkspaceHeader, { props: { session } })

    expect(primaryButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('invokes generate() when the primary action is clicked in the generate state', async () => {
    const { session, actions } = fakeSession()
    const wrapper = mount(WorkspaceHeader, { props: { session } })

    await primaryButton(wrapper).trigger('click')

    expect(actions.generate).toHaveBeenCalledOnce()
  })

  it('invokes retryNotation() when the primary action is clicked in the retry-notation state', async () => {
    const { session, actions } = fakeSession({ notationError: new Error('notation boom') })
    const wrapper = mount(WorkspaceHeader, { props: { session } })

    await primaryButton(wrapper).trigger('click')

    expect(actions.retryNotation).toHaveBeenCalledOnce()
  })

  it('never invokes any action when the primary action is clicked while disabled', async () => {
    const { session, actions } = fakeSession({ operation: 'generating' })
    const wrapper = mount(WorkspaceHeader, { props: { session } })

    await primaryButton(wrapper).trigger('click')

    expect(actions.generate).not.toHaveBeenCalled()
    expect(actions.regenerate).not.toHaveBeenCalled()
    expect(actions.retryGeneration).not.toHaveBeenCalled()
    expect(actions.retryNotation).not.toHaveBeenCalled()
  })

  it('calls setTheme on a theme selection, and never generate or notation-reporting actions', async () => {
    const { session, actions } = fakeSession()
    const wrapper = mount(WorkspaceHeader, { props: { session } })

    const themeGroup = wrapper.get('[aria-label="Presentation theme"]')
    await themeGroup.findAll('button')[1]!.trigger('click')

    expect(actions.setTheme).toHaveBeenCalledExactlyOnceWith('Light')
    expect(actions.generate).not.toHaveBeenCalled()
    expect(actions.regenerate).not.toHaveBeenCalled()
    expect(actions.retryNotation).not.toHaveBeenCalled()
  })

  it('has no independently selectable display-notation control', () => {
    const { session } = fakeSession()
    const wrapper = mount(WorkspaceHeader, { props: { session } })

    expect(wrapper.find('[aria-label="Display notation"]').exists()).toBe(false)
  })
})

// @test-link [[rule_staff_needs_room_notice]]
describe('WorkspaceHeader under the room notice', () => {
  // @test-link [[rule_staff_needs_room_notice]]
  it.each(['no_room', 'notes_too_wide'] as const)(
    'offers an enabled "Regenerate phrase" under the %s notice, which has no phrase behind it',
    async (roomNotice) => {
      const { session, actions } = fakeSession({ roomNotice, result: null })
      const wrapper = mount(WorkspaceHeader, { props: { session } })

      const action = primaryButton(wrapper)
      expect(action.text()).toBe('Regenerate phrase')
      expect(action.attributes('disabled')).toBeUndefined()
      await action.trigger('click')

      expect(actions.regenerate).toHaveBeenCalledOnce()
      expect(actions.generate).not.toHaveBeenCalled()
    },
  )

  // @test-link [[rule_staff_needs_room_notice]]
  it('keeps "Retry generation" under the notice while a generation-failure banner shows', async () => {
    const { session, actions } = fakeSession({
      roomNotice: 'no_room',
      result: null,
      generationError: new Error('boom'),
    })
    const wrapper = mount(WorkspaceHeader, { props: { session } })

    const action = primaryButton(wrapper)
    expect(action.text()).toBe('Retry generation')
    expect(action.attributes('disabled')).toBeUndefined()
    await action.trigger('click')

    expect(actions.retryGeneration).toHaveBeenCalledOnce()
  })

  // @test-link [[rule_too_dense_notice_retry_rounds]]
  it('disables the phrase action with is-loading while a round runs under the notice', () => {
    const { session } = fakeSession({
      roomNotice: 'notes_too_wide',
      result: null,
      operation: 'generating',
      retriesRunning: true,
    })
    const wrapper = mount(WorkspaceHeader, { props: { session } })

    const action = primaryButton(wrapper)
    expect(action.text()).toBe('Regenerate phrase')
    expect(action.attributes('disabled')).toBeDefined()
    expect(action.classes()).toContain('is-loading')
  })
})
