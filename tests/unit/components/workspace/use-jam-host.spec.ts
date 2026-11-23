/**
 * The workspace shell's Jam host over hand-made seams, in a component's setup: session mode at
 * creation, its hold reported once; the controls read-only as the session holds them; a failed
 * first load of Jam's code sends focus to `Try again` unless a sheet is open, and its `Dismiss`
 * clears the notice and sends focus to the fallback; the header's `Retry notation` in Jam mode
 * reaches the score panel; an instrument changed from Jam's controls goes to session mode's
 * selection; the Jam ports reach a Jam session's Review below the shell.
 */
import { defineComponent, h, nextTick, reactive } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AudioTransport } from '@/audio/audio-transport'
import type { InstrumentProfileId } from '@/domain/profile/instrument-profiles'
import { injectReviewJamPorts } from '@/components/workspace/review-jam-ports'
import { SAVE_SETTINGS } from '@/components/workspace/save-settings-injection'
import {
  useJamHost,
  type JamHost,
  type JamHostDependencies,
} from '@/components/workspace/use-jam-host'

/** Every load of Jam's code asked for, settled by the test. */
const loader = vi.hoisted(() => ({
  pending: [] as { resolve: (loaded: unknown) => void; reject: (cause: unknown) => void }[],
}))

vi.mock('@/components/workspace/load-jam-mode', () => ({
  loadJamMode: () =>
    new Promise((resolve, reject) => {
      loader.pending.push({ resolve, reject })
    }),
}))

/** Session mode's Idle state, only what the host reads of it. */
const IDLE = {
  operation: 'idle',
  controls: { instrumentProfileId: 'c-keyboard' satisfies InstrumentProfileId },
  myInstrument: null,
  figureLevels: {},
  noteDensityContext: { belowTabletLandscape: false },
} as unknown as ReturnType<JamHostDependencies['idle']>

/** The host under test, the component it runs in, and the seams the test watches. */
interface HostRig {
  readonly host: JamHost
  readonly wrapper: VueWrapper
  readonly heldChanges: boolean[]
  readonly focusJamTryAgain: ReturnType<typeof vi.fn>
  readonly focusFallback: ReturnType<typeof vi.fn>
  readonly retryJamNotation: ReturnType<typeof vi.fn>
  readonly selectInstrumentProfile: ReturnType<typeof vi.fn>
  readonly sheet: { open: boolean }
  readonly controls: { readonly: boolean }
  readonly scorePanel: { mounted: boolean }
}

const wrappers: VueWrapper[] = []

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  loader.pending.splice(0)
})

/** Let every settled load's handlers and the focus move after them run. */
async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}

/** The host at Idle, in a component's setup, over seams the test reads and sets. */
function hostRig(): HostRig {
  const heldChanges: boolean[] = []
  const focusJamTryAgain = vi.fn()
  const focusFallback = vi.fn()
  const retryJamNotation = vi.fn()
  const selectInstrumentProfile = vi.fn()
  const sheet = reactive({ open: false })
  const controls = reactive({ readonly: false })
  const scorePanel = { mounted: true }
  const deps: JamHostDependencies = {
    idle: () => IDLE,
    controller: () => null,
    requireController: () => {
      throw new Error('no controller in this test')
    },
    audio: { isUnlocked: () => false } as unknown as AudioTransport,
    prewarm: () => null,
    jamSettingsRecords: () => [],
    keptDoodleGeneration: null,
    jamPregeneration: null,
    sessionActive: () => false,
    reviewShowing: () => false,
    controlsReadonly: () => controls.readonly,
    instrumentChoice: () => ({ instrumentProfileId: 'c-keyboard', myInstrument: null }),
    systemPositionUnits: () => 0,
    anySheetOpen: () => sheet.open,
    controllerConnected: () => false,
    onHeldChange: (held) => heldChanges.push(held),
    focusJamTryAgain,
    focusFallback,
    closeReview: () => Promise.resolve(),
    header: () => ({
      sessionActionEnabled: false,
      focusSessionAction: () => {},
      focusControllerStatus: () => {},
    }),
    scorePanel: () => (scorePanel.mounted ? { retryJamNotation } : null),
    selectInstrumentProfile,
  }
  let host: JamHost | null = null
  let reviewPorts: unknown = null
  const review = {
    /** A Jam session's Review below the shell: it reads the Jam ports the shell provides. */
    setup() {
      reviewPorts = injectReviewJamPorts()()
      return () => h('div')
    },
  }
  const Shell = defineComponent({
    setup() {
      host = useJamHost(deps)
      return () => h(review)
    },
  })
  const wrapper = mount(Shell, { global: { provide: { [SAVE_SETTINGS]: vi.fn() } } })
  wrappers.push(wrapper)
  if (host === null) throw new Error('the host was not made')
  if (reviewPorts === null) throw new Error('the Review below the shell reached no Jam ports')
  return {
    host,
    wrapper,
    heldChanges,
    focusJamTryAgain,
    focusFallback,
    retryJamNotation,
    selectInstrumentProfile,
    sheet,
    controls,
    scorePanel,
  }
}

/** Press `Jam` and fail the load of Jam's code. */
async function failJamLoad(rig: HostRig): Promise<void> {
  rig.host.workspaceMode.select('jam')
  const load = loader.pending.at(-1)
  if (load === undefined) throw new Error('no load of Jam was asked for')
  load.reject(new Error('offline'))
  await flush()
}

// @test-link [[module_workspace_mode]]
describe('useJamHost', () => {
  it('opens in session mode, its hold reported once as not held', () => {
    const rig = hostRig()
    expect(rig.host.workspaceMode.mode.value).toBe('session')
    expect(rig.heldChanges).toEqual([false])
  })

  it('holds the controls read-only as the session holds them', () => {
    const rig = hostRig()
    expect(rig.host.settingsReadonly.value).toBe(false)
    rig.controls.readonly = true
    expect(rig.host.settingsReadonly.value).toBe(true)
  })

  it('holds the controls read-only while Jam opens', () => {
    const rig = hostRig()
    rig.host.workspaceMode.select('jam')
    expect(rig.host.settingsReadonly.value).toBe(true)
  })

  it("sends focus to `Try again` after a failed first load of Jam's code", async () => {
    const rig = hostRig()
    await failJamLoad(rig)
    expect(rig.host.workspaceMode.loadFailed.value).toBe(true)
    expect(rig.host.workspaceMode.mode.value).toBe('session')
    expect(rig.focusJamTryAgain).toHaveBeenCalledOnce()
  })

  it('leaves focus in an open sheet after a failed load, the notice showing', async () => {
    const rig = hostRig()
    rig.sheet.open = true
    await failJamLoad(rig)
    expect(rig.host.workspaceMode.loadFailed.value).toBe(true)
    expect(rig.focusJamTryAgain).not.toHaveBeenCalled()
  })

  it('clears the load-failure notice on its `Dismiss`, focus to the fallback', async () => {
    const rig = hostRig()
    await failJamLoad(rig)
    rig.host.handleDismissJamFailure()
    expect(rig.host.workspaceMode.loadFailed.value).toBe(false)
    expect(rig.focusFallback).toHaveBeenCalledOnce()
  })

  it("has Jam's staff engraved again on the header's `Retry notation`", () => {
    const rig = hostRig()
    rig.host.handleRetryJamNotation()
    expect(rig.retryJamNotation).toHaveBeenCalledOnce()
    rig.scorePanel.mounted = false
    expect(() => rig.host.handleRetryJamNotation()).toThrow('the score panel is not mounted')
  })

  it("selects an instrument changed from Jam's controls in session mode's controls", () => {
    const rig = hostRig()
    rig.host.handleJamInstrumentChange('bb-tenor')
    expect(rig.selectInstrumentProfile).toHaveBeenCalledWith('bb-tenor')
  })
})
