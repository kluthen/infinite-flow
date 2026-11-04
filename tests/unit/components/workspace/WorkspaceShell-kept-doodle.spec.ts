/**
 * The workspace shell with Jam mode's kept doodle, over Jam's real settings, kept doodle and
 * phrase 1 climb (Jam's loader mocked), real generation and a staff that reports its layout and
 * engraves at once: a Jam's end with a review keeps its doodle, and Jam mode shows phrase 1 written
 * from it as in Ready, in Jam's view's place, Jam's controls showing the kept doodle's readings;
 * `Regenerate phrase` writes a new one, the doodle kept; a change of a Jam setting writes it again;
 * session mode's Idle phrase is never touched; leaving Jam mode lets the doodle go. With a
 * controller connected, `Start Jam` starts a Jam on the kept doodle, never a fresh one; its end
 * with a review writes phrase 1 again from the doodle once, with a fresh seed, and an end before
 * phrase 1 writes nothing. The kept doodle's bar (`jam-bar`) shows while a doodle is kept: `New
 * doodle` lets it go (focus to `Start Jam`, or `controller-status` when it is disabled), disabled
 * in Loading; held still during a Jam on it; `Jam in {answer}` sets Jam's key and mode, the doodle
 * kept and phrase 1 written again in them; `Keep {key} {mode}` declines on the doodle and its
 * session.
 */
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, onMounted, watch } from 'vue'

import WorkspaceShell from '@/components/workspace/WorkspaceShell.vue'
import type { KeptDoodleGeneration } from '@/components/workspace/use-kept-doodle-phrase'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { makeSeed } from '@/domain/random/seed'
import JamBar from '@/jam/JamBar.vue'
import JamControls from '@/jam/JamControls.vue'
import { freshJamSettings } from '@/jam/fresh-jam-settings'
import {
  createJamSettings,
  decodeJamSettings,
  jamFigureLevels,
  jamGenerationControls,
} from '@/jam/jam-settings'
import { climbKeptDoodleLadder } from '@/jam/kept-doodle-phrase-one'
import { createJamIdleNotes } from '@/jam/jam-idle-notes'
import { useKeptDoodle } from '@/jam/use-kept-doodle'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'
import { createTestWorkspace } from './test-workspace'
import { createControllerRig, KEYS_A } from '../../midi/midi-controller-rig'
import { provideSaveSettings, recordingSaveSettings } from './recording-save-settings'
import { noRememberedController, quietSavedData, quietPresetStore } from './quiet-saved-data'
import { createFakeSessionController } from './fake-session-controller'
import { keptDoodleJamPart, reviewedJamPart } from './reviewed-jam-part-fixture'
import { realOutcomeFor } from '../../session/session-harness'
import { beatsDoodle, WORKED_EXAMPLE } from '../../jam/key-suggestion/key-suggestion-doodles'
import { resetFakeEngraver } from '../../notation/fake-vexflow-engraver-loader'

vi.mock(
  '@/notation/vexflow-engraver-loader',
  () => import('../../notation/fake-vexflow-engraver-loader'),
)

/** The one load of Jam's code, settled at once with the module below. */
vi.mock('@/components/workspace/load-jam-mode', () => ({
  loadJamMode: () => Promise.resolve(FAKE_JAM_MODULE),
}))

/** Jam's view's stand-in: its root is its own staff viewport, its empty system shown. */
const JamWorkspaceStub = {
  name: 'JamWorkspaceStub',
  emits: ['staff-state', 'left'],
  /** Intent: say the empty system shows, as Jam's staff does once engraved. */
  mounted(this: { $emit: (event: 'staff-state', state: 'shown') => void }) {
    this.$emit('staff-state', 'shown')
  },
  /** Intent: the view's own staff viewport, empty. */
  render: () => h('div', { class: 'staff-viewport jam-stub' }),
}

/**
 * Jam's code entry: a stand-in view, and Jam's real settings, controls, kept doodle, climb and
 * Idle note routing.
 */
const FAKE_JAM_MODULE = vi.hoisted(() => ({}) as Record<string, unknown>)
Object.assign(FAKE_JAM_MODULE, {
  JamWorkspace: JamWorkspaceStub,
  JamControls,
  JamBar,
  createJamSettings,
  decodeJamSettings,
  jamFigureLevels,
  jamGenerationControls,
  freshJamSettings,
  climbKeptDoodleLadder,
  useKeptDoodle,
  createJamIdleNotes,
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

/**
 * Intent: mount the shell at Idle over a test workspace, a fake controller and real generation, a
 * MIDI controller connected when `midi` is given.
 */
function mountShell(midi = createControllerRig().controller) {
  const workspace = createTestWorkspace()
  const fake = createFakeSessionController()
  const asked: GenerationIntent[] = []
  const counts = { id: 0, seed: 0 }
  /** While set, each writing waits until the test releases it. */
  const gate = { holding: false, release: [] as (() => void)[] }
  const generation: KeptDoodleGeneration = {
    generate: (intent) => {
      asked.push(intent)
      if (!gate.holding) return Promise.resolve(realOutcomeFor(intent))
      return new Promise((resolve) => gate.release.push(() => resolve(realOutcomeFor(intent))))
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
      midi,
      controller: fake.controller,
      keptDoodleGeneration: generation,
      jumpView: { scrollBy: vi.fn(), viewportBlockSize: () => 800 },
    },
    global: {
      stubs: { PhraseScore: ENGRAVING_PHRASE_SCORE },
      provide: provideSaveSettings(recordingSaveSettings().saveSettings),
    },
    attachTo: document.body,
  })
  return { wrapper, workspace, fake, asked, gate }
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
async function endJamWithReview(shell: Shell, part = reviewedJamPart()): Promise<void> {
  shell.fake.state.lastEnd = {
    cause: 'stop',
    phase: 'running',
    soundedPhraseCount: 2,
    jam: { part, sessionKey: 'session-1' },
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

/** Intent: the shell mounted with a MIDI controller connected, in Jam mode, `part`'s doodle kept. */
async function connectedWithDoodle(part = reviewedJamPart()): Promise<Shell> {
  const rig = createControllerRig({ devices: [KEYS_A] })
  await rig.controller.connect()
  const shell = mountShell(rig.controller)
  await select(shell, 'Jam')
  await endJamWithReview(shell, part)
  return shell
}

/** Intent: the header's session action, `Start Jam` in Jam mode. */
function sessionAction(shell: Shell) {
  return shell.wrapper.get('.header-actions > button.session-action')
}

// @test-link [[rule_jam_on_held_doodle_skips_capture]]
describe('WorkspaceShell and a Jam on the kept doodle', () => {
  // @test-link [[rule_jam_on_held_doodle_skips_capture]]
  it('starts a Jam on the kept doodle from Start Jam, on phrase 1 shown, never a fresh Jam', async () => {
    const shell = await connectedWithDoodle()
    const button = sessionAction(shell)
    expect(button.text()).toBe('Start Jam')
    expect(button.attributes('disabled')).toBeUndefined()

    await button.trigger('click')

    expect(shell.fake.startOnKeptDoodle).toHaveBeenCalledTimes(1)
    expect(shell.fake.controller.startWithoutPhraseOne).not.toHaveBeenCalled()
    const request = shell.fake.startOnKeptDoodle.mock.calls[0]![0]
    expect(request.phraseOne.intent).toBe(shell.asked[0])
    expect(request.keptDoodle.doodle).toBe(reviewedJamPart().doodle.doodle)
    expect(request.keptDoodle.readings).toBe(reviewedJamPart().doodleControls)
    expect(request.written).not.toBeNull()
  })

  // @test-link [[rule_jam_on_held_doodle_skips_capture]]
  // @test-link [[rule_session_end_generates_next_phrase_one]]
  it('writes phrase 1 again once at its end with a review, with a fresh seed, session mode untouched', async () => {
    const shell = await connectedWithDoodle()
    await sessionAction(shell).trigger('click')
    const sessionBefore = { ...shell.workspace.session.state }

    shell.fake.state.phase = 'idle'
    shell.fake.state.lastEnd = {
      cause: 'stop',
      phase: 'running',
      soundedPhraseCount: 2,
      jam: {
        part: keptDoodleJamPart(10),
        sessionKey: 'session-2',
      },
    }
    await settle()

    expect(shell.asked).toHaveLength(2)
    expect(shell.asked[1]!.seed).not.toBe(shell.asked[0]!.seed)
    expect({ ...shell.workspace.session.state }).toEqual(sessionBefore)
  })

  // @test-link [[rule_jam_on_held_doodle_skips_capture]]
  it('writes nothing at an end before phrase 1: the same phrase 1 shows again', async () => {
    const shell = await connectedWithDoodle()
    await sessionAction(shell).trigger('click')

    shell.fake.state.phase = 'idle'
    shell.fake.state.lastEnd = { cause: 'stop', phase: 'count-in', soundedPhraseCount: 0 }
    await settle()

    expect(shell.asked).toHaveLength(1)
    expect(keptStaff(shell).classes()).not.toContain('is-out-of-sight')
  })
})

/** The kept doodle's bar's sentence. */
const BAR_SENTENCE =
  'Jamming again on your doodle: phrase 1 continues it. Leaving Jam mode lets it go.'

/**
 * Intent: a fresh Jam's part whose doodle is the worked example, which against the test
 * workspace's C Ionian sounds like E Aeolian (written for its instrument).
 */
function dMinorPart() {
  const part = reviewedJamPart()
  return { ...part, doodle: { ...part.doodle, doodle: beatsDoodle(WORKED_EXAMPLE) } }
}

/** Intent: the kept doodle's bar, rendered or not. */
function jamBar(shell: Shell) {
  return shell.wrapper.find('.jam-bar')
}

/** Intent: the bar's button with these words. */
function barButton(shell: Shell, words: string) {
  const button = jamBar(shell)
    .findAll('button')
    .find((each) => each.text() === words)
  if (button === undefined) throw new Error(`jam-bar holds no button "${words}"`)
  return button
}

// @test-link [[module_kept_doodle]]
describe("WorkspaceShell and the kept doodle's bar", () => {
  // @test-link [[module_kept_doodle]]
  it('shows it after score-toolbar while a doodle is kept, none without', async () => {
    const shell = mountShell()
    await select(shell, 'Jam')
    expect(jamBar(shell).exists()).toBe(false)

    await endJamWithReview(shell)

    expect(jamBar(shell).get(':scope > p').text()).toBe(BAR_SENTENCE)
    expect(shell.wrapper.get('.score-toolbar').element.nextElementSibling).toBe(
      jamBar(shell).element,
    )
  })

  // @test-link [[rule_held_doodle_dropped_on_change]]
  it("lets the doodle go on New doodle: Jam's empty staff back, no readings, focus on Start Jam", async () => {
    const shell = await connectedWithDoodle()

    await barButton(shell, 'New doodle').trigger('click')
    await settle()

    expect(jamBar(shell).exists()).toBe(false)
    expect(keptStaff(shell).classes()).toContain('is-out-of-sight')
    expect(shell.wrapper.get('.jam-stub').classes()).not.toContain('is-out-of-sight')
    expect(shell.wrapper.getComponent(JamControls).props('readings')).toBeNull()
    expect(sessionAction(shell).attributes('disabled')).toBeUndefined()
    expect(document.activeElement).toBe(sessionAction(shell).element)
    expect(shell.asked).toHaveLength(1)
  })

  // @test-link [[rule_held_doodle_dropped_on_change]]
  it('moves focus to controller-status on New doodle while Start Jam is disabled', async () => {
    const shell = mountShell()
    await select(shell, 'Jam')
    await endJamWithReview(shell)

    await barButton(shell, 'New doodle').trigger('click')
    await settle()

    expect(sessionAction(shell).attributes('disabled')).toBeDefined()
    expect(document.activeElement).toBe(shell.wrapper.get('.controller-status').element)
  })

  // @test-link [[rule_held_doodle_dropped_on_change]]
  it('disables New doodle in Loading, enabled again once phrase 1 is written', async () => {
    const shell = mountShell()
    await select(shell, 'Jam')
    await endJamWithReview(shell)
    shell.gate.holding = true

    await phraseAction(shell).trigger('click')
    await settle()
    expect(barButton(shell, 'New doodle').attributes('disabled')).toBeDefined()

    shell.gate.release.splice(0).forEach((release) => release())
    await settle()
    expect(barButton(shell, 'New doodle').attributes('disabled')).toBeUndefined()
  })

  // @test-link [[module_kept_doodle]]
  it('is held still during a Jam on the doodle, every button disabled', async () => {
    const shell = await connectedWithDoodle(dMinorPart())
    const before = jamBar(shell).text()

    await sessionAction(shell).trigger('click')
    await nextTick()

    expect(jamBar(shell).text()).toBe(before)
    const buttons = jamBar(shell).findAll('button')
    expect(buttons.map((button) => button.text())).toEqual([
      'New doodle',
      'Jam in E Aeolian',
      'Keep C Ionian',
    ])
    expect(buttons.every((button) => button.attributes('disabled') !== undefined)).toBe(true)
  })
})

// @test-link [[req_key_and_mode_suggestion]]
describe("WorkspaceShell and the kept doodle's suggestion at Idle", () => {
  // @test-link [[rule_suggestion_use_it]]
  it("Jam in {answer} sets Jam's key and mode, keeps the doodle, and writes phrase 1 in them", async () => {
    const shell = mountShell()
    await select(shell, 'Jam')
    await endJamWithReview(shell, dMinorPart())
    const sessionControls = shell.workspace.session.state.controls

    await barButton(shell, 'Jam in E Aeolian').trigger('click')
    await settle()

    expect(shell.wrapper.getComponent(JamControls).props('settings')).toMatchObject({
      tonalCenter: 'E',
      collection: 'Aeolian',
    })
    expect(shell.workspace.session.state.controls).toBe(sessionControls)
    expect(shell.asked).toHaveLength(2)
    // Phrase 1 is asked for in concert pitch: written E is concert D for the test's instrument.
    expect(shell.asked[1]!.controls).toMatchObject({ tonalCenter: 'D', collection: 'Aeolian' })
    expect(keptStaff(shell).classes()).not.toContain('is-out-of-sight')
    const set = jamBar(shell).get('.suggestion-row > p')
    expect(set.text()).toBe('Jams now play in E Aeolian.')
    expect(document.activeElement).toBe(set.element)
  })

  // @test-link [[rule_suggestion_keep_mine]]
  it("Keep {key} {mode} declines on the doodle and its session; focus on the bar's sentence", async () => {
    const shell = mountShell()
    await select(shell, 'Jam')
    await endJamWithReview(shell, dMinorPart())

    await barButton(shell, 'Keep C Ionian').trigger('click')
    await settle()

    expect(shell.fake.controller.declineSuggestion).toHaveBeenCalledWith('session-1')
    expect(jamBar(shell).find('.suggestion-row').exists()).toBe(false)
    expect(document.activeElement).toBe(jamBar(shell).get(':scope > p').element)
    expect(shell.asked).toHaveLength(1)

    shell.wrapper.getComponent(JamControls).vm.$emit('change', { tonalCenter: 'A' })
    await settle()
    expect(jamBar(shell).find('.suggestion-row').exists()).toBe(false)
  })
})
