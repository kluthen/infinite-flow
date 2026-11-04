/**
 * The workspace shell with Jam mode's kept doodle, over Jam's real settings, kept doodle and
 * phrase 1 climb (Jam's loader mocked), real generation and a staff that reports its layout and
 * engraves at once: a Jam's end with a review keeps its doodle, and Jam mode shows phrase 1 written
 * from it as in Ready, in Jam's view's place, Jam's controls showing the kept doodle's readings;
 * `Regenerate phrase` writes a new one, the doodle kept; a change of a Jam setting writes it again;
 * session mode's Idle phrase is never touched; leaving Jam mode lets the doodle go.
 */
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, onMounted, watch } from 'vue'

import WorkspaceShell from '@/components/workspace/WorkspaceShell.vue'
import type { KeptDoodleGeneration } from '@/components/workspace/use-kept-doodle-phrase'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { makeSeed } from '@/domain/random/seed'
import JamControls from '@/jam/JamControls.vue'
import { freshJamSettings } from '@/jam/fresh-jam-settings'
import {
  createJamSettings,
  decodeJamSettings,
  jamFigureLevels,
  jamGenerationControls,
} from '@/jam/jam-settings'
import { climbKeptDoodleLadder } from '@/jam/kept-doodle-phrase-one'
import { useKeptDoodle } from '@/jam/use-kept-doodle'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'
import { createTestWorkspace } from './test-workspace'
import { createControllerRig } from '../../midi/midi-controller-rig'
import { provideSaveSettings, recordingSaveSettings } from './recording-save-settings'
import { noRememberedController, quietSavedData, quietPresetStore } from './quiet-saved-data'
import { createFakeSessionController } from './fake-session-controller'
import { reviewedJamPart } from './reviewed-jam-part-fixture'
import { realOutcomeFor } from '../../session/session-harness'
import { resetFakeEngraver } from '../../notation/fake-vexflow-engraver-loader'

vi.mock(
  '@/notation/vexflow-engraver-loader',
  () => import('../../notation/fake-vexflow-engraver-loader'),
)

/** The one load of Jam's code, settled at once with the module below. */
vi.mock('@/components/workspace/load-jam-mode', () => ({
  loadJamMode: () => Promise.resolve(FAKE_JAM_MODULE),
}))

/** Jam's view's stand-in: its root is its own staff viewport. */
const JamWorkspaceStub = {
  name: 'JamWorkspaceStub',
  emits: ['staff-state', 'left'],
  /** Intent: the view's own staff viewport, empty. */
  render: () => h('div', { class: 'staff-viewport jam-stub' }),
}

/** Jam's code entry: a stand-in view, and Jam's real settings, controls, kept doodle and climb. */
const FAKE_JAM_MODULE = vi.hoisted(() => ({}) as Record<string, unknown>)
Object.assign(FAKE_JAM_MODULE, {
  JamWorkspace: JamWorkspaceStub,
  JamControls,
  createJamSettings,
  decodeJamSettings,
  jamFigureLevels,
  jamGenerationControls,
  freshJamSettings,
  climbKeptDoodleLadder,
  useKeptDoodle,
})

/** The staff's layout, as a mounted PhraseScore reports it. */
const LAYOUT: StaffLayoutInputs = {
  containerWidthPx: 1200,
  viewport: { layout: 'one-system', heightBudgetPx: null },
}

/** A `PhraseScore` that reports its layout as it mounts and engraves each phrase it is given. */
const ENGRAVING_PHRASE_SCORE = defineComponent({
  name: 'PhraseScore',
  props: {
    phrase: { type: Object, default: null },
    session: { type: Object, default: null },
    overlays: { type: Object, default: null },
    phraseNumber: { type: Number, required: true },
    systemPositionUnits: { type: Number, default: null },
  },
  emits: ['engraved', 'notation-error', 'layout-inputs', 'session-staff-failed'],
  setup(props, { emit, slots }) {
    onMounted(() => emit('layout-inputs', LAYOUT))
    watch(
      () => props.phrase,
      (phrase) => {
        if (phrase !== null) emit('engraved', {})
      },
    )
    return () => h('div', { class: 'phrase-score-stub' }, slots.default?.())
  },
})

beforeEach(() => {
  resetFakeEngraver()
})

afterEach(() => {
  document.body.innerHTML = ''
})

/** Intent: mount the shell at Idle over a test workspace, a fake controller and real generation. */
function mountShell() {
  const workspace = createTestWorkspace()
  const fake = createFakeSessionController()
  const asked: GenerationIntent[] = []
  const counts = { id: 0, seed: 0 }
  const generation: KeptDoodleGeneration = {
    generate: (intent) => {
      asked.push(intent)
      return Promise.resolve(realOutcomeFor(intent))
    },
    providers: {
      nextRequestId: () => makeRequestId(`shell-kept-${++counts.id}`),
      nextSeed: () => makeSeed(++counts.seed),
    },
    nextSessionSeed: () => makeSeed(800),
    viewport: { isBelowTabletLandscape: () => false },
  }
  const wrapper = mount(WorkspaceShell, {
    props: {
      savedData: quietSavedData(),
      rememberedController: noRememberedController(),
      presetStore: quietPresetStore(),
      session: workspace.session,
      pendingPhrase: null,
      handleEngraved: () => {},
      handleNotationError: () => {},
      handleSessionStaffFailed: () => {},
      handleLayoutInputs: () => {},
      audio: workspace.audio,
      midi: createControllerRig().controller,
      controller: fake.controller,
      keptDoodleGeneration: generation,
    },
    global: {
      stubs: { PhraseScore: ENGRAVING_PHRASE_SCORE },
      provide: provideSaveSettings(recordingSaveSettings().saveSettings),
    },
    attachTo: document.body,
  })
  return { wrapper, workspace, fake, asked }
}

type Shell = ReturnType<typeof mountShell>

/** Intent: settle every writing asked for. */
async function settle(): Promise<void> {
  for (let round = 0; round < 6; round += 1) await flushPromises()
}

/** Intent: press a mode switch segment and let the mode show. */
async function select(shell: Shell, label: 'Session' | 'Jam'): Promise<void> {
  const segment = shell.wrapper
    .findAll('.mode-switch .segment')
    .find((each) => each.text() === label)
  await segment!.trigger('click')
  await settle()
}

/** Intent: end a Jam with a review in Jam mode: its doodle kept, and phrase 1 written from it. */
async function endJamWithReview(shell: Shell): Promise<void> {
  shell.fake.state.lastEnd = {
    cause: 'stop',
    phase: 'running',
    soundedPhraseCount: 2,
    jam: { part: reviewedJamPart(), sessionKey: 'session-1' },
  }
  await settle()
}

/** Intent: Jam's staff for the kept doodle: the score panel's second viewport. */
function keptStaff(shell: Shell) {
  return shell.wrapper.findAll('.score-panel .staff-viewport')[1]!
}

/** Intent: the header's phrase action. */
function phraseAction(shell: Shell) {
  return shell.wrapper.get('.header-actions > button:not(.session-action)')
}

// @test-link [[rule_held_doodle_phrase_one_at_idle]]
describe('WorkspaceShell and the kept doodle at Idle', () => {
  // @test-link [[rule_held_doodle_phrase_one_at_idle]]
  // @test-link [[rule_doodle_sets_jam_controls]]
  it("shows phrase 1 written from the kept doodle, as in Ready, with the doodle's readings", async () => {
    const shell = mountShell()
    await select(shell, 'Jam')
    expect(keptStaff(shell).classes()).toContain('is-out-of-sight')
    const sessionBefore = { ...shell.workspace.session.state }

    await endJamWithReview(shell)

    expect(shell.asked).toHaveLength(1)
    expect(keptStaff(shell).classes()).not.toContain('is-out-of-sight')
    expect(keptStaff(shell).get('.staff-frame').classes()).toEqual(['staff-frame', 'staff-ready'])
    expect(shell.wrapper.get('.jam-stub').classes()).toContain('is-out-of-sight')
    expect(shell.wrapper.getComponent(JamControls).props('readings')).toBe(
      reviewedJamPart().doodleControls,
    )
    expect(phraseAction(shell).text()).toBe('Regenerate phrase')
    expect({ ...shell.workspace.session.state }).toEqual(sessionBefore)
  })

  // @test-link [[rule_held_doodle_phrase_one_at_idle]]
  // @test-link [[rule_jam_setting_change_rewrites_kept_phrase_one]]
  it('writes a new phrase 1 on Regenerate phrase and on a Jam setting, the doodle kept', async () => {
    const shell = mountShell()
    await select(shell, 'Jam')
    await endJamWithReview(shell)

    await phraseAction(shell).trigger('click')
    await settle()
    expect(shell.asked).toHaveLength(2)

    shell.wrapper.getComponent(JamControls).vm.$emit('change', { tension: 'Edge' })
    await settle()
    expect(shell.asked).toHaveLength(3)
    expect(shell.asked[2]!.controls.tension).toBe('Edge')
    expect(keptStaff(shell).classes()).not.toContain('is-out-of-sight')
  })

  // @test-link [[rule_held_doodle_dropped_on_change]]
  it('lets the doodle go on leaving Jam mode, session mode as it was', async () => {
    const shell = mountShell()
    await select(shell, 'Jam')
    await endJamWithReview(shell)

    await select(shell, 'Session')
    await select(shell, 'Jam')

    expect(keptStaff(shell).classes()).toContain('is-out-of-sight')
    expect(shell.wrapper.get('.jam-stub').classes()).not.toContain('is-out-of-sight')
    expect(shell.wrapper.getComponent(JamControls).props('readings')).toBeNull()
    expect(phraseAction(shell).text()).toBe('Generate phrase')
  })
})
