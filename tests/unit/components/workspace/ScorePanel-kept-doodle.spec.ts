/**
 * The score panel in Jam mode with Jam's phrase 1 from the kept doodle (`keptPhrase`): its staff
 * is mounted after the session's viewport while Jam mode shows, out of sight and inert with no
 * doodle kept (Jam's view showing as before, no banner, nothing announced); with a doodle kept it
 * takes Jam's view's place in sight (Jam's view out of sight and inert, still mounted), its frame
 * taking the Idle states as session mode's (Loading, Ready, the notation error, Needs more room),
 * the generation-failure banner and both live regions following Jam's phrase 1, never session
 * mode's Idle, which stays as it was; it goes out of sight while a session's staff shows. Its
 * start marker points at the note the panel is given (`keptStartMarker`), none without one.
 */
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, shallowReactive } from 'vue'

import ScorePanel from '@/components/workspace/ScorePanel.vue'
import { createMixVolumePopover } from '@/components/workspace/mix-volume-popover'
import type { IdlePhraseState } from '@/composables/generation-session-types'
import type {
  KeptDoodlePhraseResult,
  KeptDoodlePhraseView,
} from '@/components/workspace/use-kept-doodle-phrase'
import { GenerationFailedError } from '@/composables/workspace-session-result'
import { NotationError } from '@/notation/notation-error'
import type { ExpectedNoteIdentity } from '@/domain/acknowledgement/expected-note'
import { transportRig } from '../../audio/transport-rig'
import { createFakeSessionController, type FakeSessionController } from './fake-session-controller'
import { fakeGenerationSession } from './fake-generation-session'
import { PHRASE_SCORE_STUB } from './test-workspace'
import { provideSaveSettings } from './recording-save-settings'

/** Jam's view's stand-in: its root is a `staff-viewport`. */
const JamViewStub = defineComponent({
  name: 'JamViewStub',
  props: { leaving: { type: Boolean, default: false } },
  emits: ['left', 'staff-state'],
  setup() {
    return () => h('div', { class: 'staff-viewport jam-stub' })
  },
})

/** A phrase 1 shown, as the panel reads it: only its presence matters here. */
const SHOWN = {} as KeptDoodlePhraseResult

/** Intent: Jam's phrase 1 as the shell gives it: an Idle state the test changes, kept or not. */
function keptPhrase(kept: boolean) {
  const state = shallowReactive<IdlePhraseState<KeptDoodlePhraseResult>>({
    latestIntent: null,
    result: null,
    operation: 'idle',
    generationError: null,
    notationError: null,
    resultEngraved: false,
    roomNotice: null,
    retriesRunning: false,
    roomNoticeAnnouncements: 0,
  })
  const view = shallowReactive<KeptDoodlePhraseView>({
    kept,
    state,
    phrase: null,
    staff: {
      handleEngraved: () => {},
      handleNotationError: () => {},
      handleLayoutInputs: () => {},
    },
    actions: {
      regenerate: async () => true,
      retryGeneration: async () => true,
      retryNotation: async () => true,
    },
  })
  return { state, view }
}

/** Intent: mount the panel in Jam mode over a troubled session mode's Idle and Jam's phrase 1. */
function mountPanel(
  phrase: ReturnType<typeof keptPhrase>,
  fake: FakeSessionController = createFakeSessionController(),
  keptStartMarker: ExpectedNoteIdentity | null = null,
) {
  const generation = fakeGenerationSession({ generationError: new Error('session boom') })
  const wrapper = mount(ScorePanel, {
    props: {
      session: generation.session,
      pendingPhrase: null,
      handleEngraved: () => {},
      handleNotationError: () => {},
      handleSessionStaffFailed: () => {},
      handleLayoutInputs: () => {},
      audio: transportRig().transport,
      mixPopover: createMixVolumePopover('mix-volume-popover'),
      controller: fake.controller,
      matchesPhoneLayout: () => false,
      jamView: JamViewStub,
      keptPhrase: phrase.view,
      keptStartMarker,
    },
    global: { stubs: { PhraseScore: PHRASE_SCORE_STUB }, provide: provideSaveSettings() },
    attachTo: document.body,
  })
  return { wrapper, session: generation.state }
}

/** Intent: Jam's staff for the kept doodle: the viewport after the session's. */
function keptStaff(wrapper: ReturnType<typeof mountPanel>['wrapper']) {
  return wrapper.findAll('.staff-viewport')[1]!
}

// @test-link [[rule_held_doodle_phrase_one_at_idle]]
describe("ScorePanel and Jam's phrase 1 from the kept doodle", () => {
  // @test-link [[rule_jam_idle_shows_no_phrase]]
  it("keeps its staff out of sight with no doodle kept, Jam's view showing, no banner", () => {
    const { wrapper } = mountPanel(keptPhrase(false))

    expect(keptStaff(wrapper).classes()).toContain('is-out-of-sight')
    expect(keptStaff(wrapper).attributes('inert')).toBeDefined()
    expect(wrapper.get('.jam-stub').classes()).not.toContain('is-out-of-sight')
    expect(wrapper.find('.score-panel > .inline-alert').exists()).toBe(false)
    wrapper.unmount()
  })

  // @test-link [[rule_held_doodle_phrase_one_at_idle]]
  it("shows phrase 1 in Jam's view's place with a doodle kept, through Loading to Ready", async () => {
    const phrase = keptPhrase(true)
    const { wrapper, session } = mountPanel(phrase)
    const before = { ...session }

    phrase.state.operation = 'generating'
    await flushPromises()
    const staff = keptStaff(wrapper)
    expect(staff.classes()).not.toContain('is-out-of-sight')
    expect(staff.attributes('inert')).toBeUndefined()
    expect(staff.get('.staff-frame').classes()).toContain('staff-loading')
    expect(wrapper.get('.jam-stub').classes()).toContain('is-out-of-sight')
    expect(wrapper.get('.jam-stub').attributes('inert')).toBeDefined()
    expect(wrapper.get('.generation-status').text()).toBe('Generating phrase')

    phrase.state.result = SHOWN
    phrase.state.resultEngraved = true
    phrase.state.operation = 'idle'
    await flushPromises()
    expect(staff.get('.staff-frame').classes()).toEqual(['staff-frame', 'staff-ready'])
    expect(wrapper.get('.generation-status').text()).toBe('Phrase ready')
    expect(wrapper.find('.score-panel > .inline-alert').exists()).toBe(false)
    expect({ ...session }).toEqual(before)
    wrapper.unmount()
  })

  // @test-link [[rule_held_doodle_phrase_one_at_idle]]
  it("shows Jam's phrase 1's generation failure, notation error and room notice", async () => {
    const phrase = keptPhrase(true)
    const { wrapper } = mountPanel(phrase)

    phrase.state.generationError = new GenerationFailedError('search_limit_exceeded')
    await flushPromises()
    const banner = wrapper.get('.score-panel > .inline-alert')
    expect(banner.attributes('hidden')).toBeUndefined()
    expect(banner.text()).not.toMatch(/session boom/)

    phrase.state.generationError = null
    phrase.state.result = SHOWN
    phrase.state.notationError = new NotationError('notation_engraving_failed', 'failed', {})
    await flushPromises()
    const staff = keptStaff(wrapper)
    expect(staff.get('.staff-frame').classes()).toContain('staff-error')
    expect(staff.get('.inline-alert').text()).toBe('Notation error: failed')
    expect(wrapper.get('.notation-status').text()).toBe('Notation error. Try again.')

    phrase.state.notationError = null
    phrase.state.result = null
    phrase.state.roomNotice = 'notes_too_wide'
    phrase.state.roomNoticeAnnouncements = 1
    await flushPromises()
    expect(staff.get('.staff-frame').classes()).toContain('staff-no-room')
    expect(staff.get('.room-notice').text()).toMatch(/These notes need more room/)
    wrapper.unmount()
  })

  // @test-link [[rule_held_doodle_phrase_one_at_idle]]
  it("puts its staff out of sight while a session's staff shows", async () => {
    const fake = createFakeSessionController({ phase: 'count-in' })
    const { wrapper } = mountPanel(keptPhrase(true), fake)
    expect(keptStaff(wrapper).classes()).not.toContain('is-out-of-sight')

    fake.state.sessionStaff = { layout: 'one-system', top: null, bottom: null, playhead: null }
    await flushPromises()

    expect(keptStaff(wrapper).classes()).toContain('is-out-of-sight')
    wrapper.unmount()
  })
})

// @test-link [[module_jam_idle_notes]]
describe("ScorePanel and the start marker on the kept doodle's phrase 1", () => {
  // @test-link [[module_jam_idle_notes]]
  it("points the start marker of Jam's staff at the note it is given, none without one", async () => {
    const marker: ExpectedNoteIdentity = { phraseNumber: 1, measureIndex: 0, eventIndex: 0 }
    const marked = mountPanel(keptPhrase(true), createFakeSessionController(), marker)
    const unmarked = mountPanel(keptPhrase(true))
    await flushPromises()

    const kept = (mounted: ReturnType<typeof mountPanel>) =>
      mounted.wrapper.findAllComponents({ name: 'PhraseScore' })[1]!
    expect(kept(marked).props('overlays')).toEqual({
      startMarker: marker,
      playheadMeasure: null,
      acknowledged: [],
    })
    expect(kept(unmarked).props('overlays').startMarker).toBeNull()
    marked.wrapper.unmount()
    unmarked.wrapper.unmount()
  })
})
