/**
 * The workspace's mode over a hand-settled loader of Jam's code: session mode at creation; the
 * first press of `Jam` loads Jam's code once, `Jam` checked and session mode held meanwhile, a
 * later press waiting for nothing; `Session` cancels an opening, the load finishing unseen; a
 * failed load leaves session mode with the notice, and `Try again` loads again; the switch refuses
 * every change while read-only; session mode's hold is reported synchronously as it changes.
 */
import { effectScope, shallowRef } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'

import type { JamModeModule } from '@/components/workspace/load-jam-mode'
import {
  useWorkspaceMode,
  type WorkspaceModeState,
} from '@/components/workspace/use-workspace-mode'

/** A stand-in for Jam's code entry: only the view the workspace takes from it. */
const FAKE_JAM_MODULE = { JamWorkspace: { name: 'JamWorkspaceStub' } } as unknown as JamModeModule

/** One load of Jam's code, settled by the test. */
interface PendingLoad {
  readonly resolve: (loaded: JamModeModule) => void
  readonly reject: (cause: unknown) => void
}

/** The mode under test and every seam around it. */
interface ModeRig {
  readonly mode: WorkspaceModeState
  readonly loads: PendingLoad[]
  readonly heldChanges: boolean[]
  readonly failures: { count: number }
  readonly operationRunning: { value: boolean }
  readonly sessionActive: { value: boolean }
  readonly reviewShowing: { value: boolean }
}

const scopes: (() => void)[] = []

afterEach(() => {
  for (const stop of scopes.splice(0)) stop()
})

/** Intent: let every settled load's handlers run. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/** Intent: the mode at Idle, its loader answering only when the test settles each load. */
function modeRig(): ModeRig {
  const loads: PendingLoad[] = []
  const heldChanges: boolean[] = []
  const failures = { count: 0 }
  const operationRunning = shallowRef(false)
  const sessionActive = shallowRef(false)
  const reviewShowing = shallowRef(false)
  const scope = effectScope()
  const mode = scope.run(() =>
    useWorkspaceMode({
      operationRunning: () => operationRunning.value,
      sessionActive: () => sessionActive.value,
      reviewShowing: () => reviewShowing.value,
      load: () =>
        new Promise<JamModeModule>((resolve, reject) => {
          loads.push({ resolve, reject })
        }),
      onHeldChange: (held) => heldChanges.push(held),
      onLoadFailed: () => {
        failures.count += 1
      },
    }),
  )
  if (mode === undefined) throw new Error('the mode was not built')
  scopes.push(() => scope.stop())
  return { mode, loads, heldChanges, failures, operationRunning, sessionActive, reviewShowing }
}

/** Intent: the latest load asked for. */
function lastLoad(rig: ModeRig): PendingLoad {
  const load = rig.loads.at(-1)
  if (load === undefined) throw new Error('no load was asked for')
  return load
}

// @test-link [[module_workspace_mode]]
describe('useWorkspaceMode', () => {
  // @test-link [[rule_app_opens_in_session_mode]]
  it('starts in session mode, nothing loaded, session mode not held', () => {
    const rig = modeRig()

    expect(rig.mode.mode.value).toBe('session')
    expect(rig.mode.checked.value).toBe('session')
    expect(rig.mode.opening.value).toBe(false)
    expect(rig.mode.held.value).toBe(false)
    expect(rig.mode.jamModule.value).toBeNull()
    expect(rig.mode.jamView.value).toBeNull()
    expect(rig.loads).toHaveLength(0)
    expect(rig.heldChanges).toEqual([false])
  })

  // @test-link [[rule_jam_code_loaded_on_demand]]
  it('loads Jam code once on the first press of Jam, Jam checked and session mode held meanwhile', async () => {
    const rig = modeRig()

    rig.mode.select('jam')
    expect(rig.loads).toHaveLength(1)
    expect(rig.mode.opening.value).toBe(true)
    expect(rig.mode.checked.value).toBe('jam')
    expect(rig.mode.mode.value).toBe('session')
    expect(rig.mode.held.value).toBe(true)
    expect(rig.mode.readonly.value).toBe(false)
    expect(rig.heldChanges).toEqual([false, true])

    rig.mode.select('jam')
    expect(rig.loads).toHaveLength(1)

    lastLoad(rig).resolve(FAKE_JAM_MODULE)
    await flush()
    expect(rig.mode.mode.value).toBe('jam')
    expect(rig.mode.opening.value).toBe(false)
    expect(rig.mode.jamView.value).toBe(FAKE_JAM_MODULE.JamWorkspace)
    expect(rig.heldChanges).toEqual([false, true])
  })

  // @test-link [[rule_jam_code_loaded_on_demand]]
  // @test-link [[rule_leaving_jam_mode_keeps_session_mode]]
  it('leaves Jam mode on Session, and a later press of Jam waits for nothing', async () => {
    const rig = modeRig()
    rig.mode.select('jam')
    lastLoad(rig).resolve(FAKE_JAM_MODULE)
    await flush()

    rig.mode.select('session')
    expect(rig.mode.mode.value).toBe('session')
    expect(rig.mode.jamView.value).toBeNull()
    expect(rig.mode.held.value).toBe(false)

    rig.mode.select('jam')
    expect(rig.loads).toHaveLength(1)
    expect(rig.mode.mode.value).toBe('jam')
    expect(rig.mode.opening.value).toBe(false)
    expect(rig.heldChanges).toEqual([false, true, false, true])
  })

  // @test-link [[rule_jam_code_loaded_on_demand]]
  it('cancels an opening on Session, keeping the code that loads afterwards unseen', async () => {
    const rig = modeRig()
    rig.mode.select('jam')

    rig.mode.select('session')
    expect(rig.mode.opening.value).toBe(false)
    expect(rig.mode.checked.value).toBe('session')
    expect(rig.mode.held.value).toBe(false)

    lastLoad(rig).resolve(FAKE_JAM_MODULE)
    await flush()
    expect(rig.mode.mode.value).toBe('session')
    expect(rig.mode.jamModule.value).toBe(FAKE_JAM_MODULE)

    rig.mode.select('jam')
    expect(rig.loads).toHaveLength(1)
    expect(rig.mode.mode.value).toBe('jam')
  })

  // @test-link [[rule_jam_code_loaded_on_demand]]
  it('ignores a load failing after a cancel', async () => {
    const rig = modeRig()
    rig.mode.select('jam')
    rig.mode.select('session')

    lastLoad(rig).reject(new Error('offline'))
    await flush()

    expect(rig.mode.loadFailed.value).toBe(false)
    expect(rig.failures.count).toBe(0)
    expect(rig.mode.mode.value).toBe('session')
  })

  // @test-link [[rule_jam_code_loaded_on_demand]]
  it('leaves session mode as it was on a failed load, and Try again loads again', async () => {
    const rig = modeRig()
    rig.mode.select('jam')

    lastLoad(rig).reject(new Error('offline'))
    await flush()
    expect(rig.mode.mode.value).toBe('session')
    expect(rig.mode.checked.value).toBe('session')
    expect(rig.mode.opening.value).toBe(false)
    expect(rig.mode.loadFailed.value).toBe(true)
    expect(rig.failures.count).toBe(1)
    expect(rig.heldChanges).toEqual([false, true, false])

    rig.mode.retry()
    expect(rig.loads).toHaveLength(2)
    expect(rig.mode.opening.value).toBe(true)
    expect(rig.mode.loadFailed.value).toBe(true)

    lastLoad(rig).resolve(FAKE_JAM_MODULE)
    await flush()
    expect(rig.mode.mode.value).toBe('jam')
    expect(rig.mode.loadFailed.value).toBe(false)
  })

  // @test-link [[rule_jam_code_loaded_on_demand]]
  it('drops the notice on Dismiss, session mode unchanged', async () => {
    const rig = modeRig()
    rig.mode.select('jam')
    lastLoad(rig).reject(new Error('offline'))
    await flush()

    rig.mode.dismissFailure()

    expect(rig.mode.loadFailed.value).toBe(false)
    expect(rig.mode.mode.value).toBe('session')
  })

  // @test-link [[rule_mode_button_at_idle_only]]
  it('refuses every change while Loading, during a session and while the review mode shows', async () => {
    const rig = modeRig()
    for (const flag of [rig.operationRunning, rig.sessionActive, rig.reviewShowing]) {
      flag.value = true
      expect(rig.mode.readonly.value).toBe(true)
      rig.mode.select('jam')
      expect(rig.loads).toHaveLength(0)
      expect(rig.mode.checked.value).toBe('session')
      flag.value = false
    }

    rig.mode.select('jam')
    lastLoad(rig).resolve(FAKE_JAM_MODULE)
    await flush()
    rig.reviewShowing.value = true
    rig.mode.select('session')
    expect(rig.mode.mode.value).toBe('jam')
  })
})
