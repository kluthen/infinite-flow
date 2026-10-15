/**
 * A session cut short by reloading or closing the page is never saved (master spec §5.1, spec
 * D309), on the fake session browser ports. On a visible page the browser fires `pagehide`, then
 * the change to hidden, which ends the session: its save never asks the visit's saves for anything.
 * On a page already hidden (a tab switch ended the session, then the tab closed), the save still
 * running stops at its next step: after the codec loads, or between the read and the batch. Either
 * way the session is held in memory as not saved and the kept sessions stay. A tab switch alone
 * saves as before. On the fake audio clock at 240 BPM from 5 s: phrase 1 starts sounding at 6.1 s.
 */
import { describe, expect, it, vi } from 'vitest'

import { createSavePolicy, type SaveFailureKind } from '@/storage/save-policy'

import { readyPort } from '../../storage/save-policy-doubles'
import { freshFactory, sampleRecord } from '../../storage/storage-test-doubles'
import { controllerRig, flush, playTo, type ControllerRig } from './session-controller-rig'

/** Intent: a rig whose session has sounded phrase 1 and is still running. */
async function soundedRig(
  options: Parameters<typeof controllerRig>[2] = {},
): Promise<ControllerRig> {
  const rig = controllerRig(undefined, undefined, options)
  rig.controller.start()
  await playTo(rig, 6.6)
  return rig
}

/** Intent: long enough for the kept-session codec to load and a save asked for to settle. */
async function codecLoaded(): Promise<void> {
  await import('@/storage/records/kept-session-record')
  await flush()
}

/** Intent: the session that ended is held in memory as not saved, its Review showing. */
function expectNotSaved(rig: ControllerRig): void {
  expect(rig.controller.state.review?.showing).toBe(true)
  expect(rig.controller.state.review?.keeping).toBe('not-saved')
  const recent = rig.controller.state.mostRecent
  expect(recent?.kind === 'held' && recent.session.keeping).toBe('not-saved')
}

// @test-link [[module_kept_session_save]]
// @test-link [[rule_most_recent_session_kept]]
// @test-link [[rule_hidden_tab_ends_session]]
describe('session controller: a session cut short by the page going away', () => {
  it('pagehide, then hidden: the session ends and its save asks for nothing', async () => {
    const rig = await soundedRig()

    rig.browser.pageLeaving.leave()
    rig.browser.pageVisibility.setHidden(true)
    expect(rig.controller.state.lastEnd?.cause).toBe('hidden-tab')
    await codecLoaded()

    expect(rig.sessionSaves).toEqual([])
    expectNotSaved(rig)
  })

  it('hidden, then pagehide while the codec loads: the save stops before asking', async () => {
    const rig = await soundedRig()

    rig.browser.pageVisibility.setHidden(true)
    rig.browser.pageLeaving.leave()
    await codecLoaded()

    expect(rig.sessionSaves).toEqual([])
    expectNotSaved(rig)
  })

  it('hidden, then pagehide between the read and the batch: nothing is written, no notice', async () => {
    const port = await readyPort(freshFactory())
    await port.write('sessionSummaries', 'session-1-5', sampleRecord('kept'))
    const policy = createSavePolicy(port)
    const failures: SaveFailureKind[] = []
    policy.onFailure((kind) => failures.push(kind))
    const rig = await soundedRig({
      sessionSaveOutcome: (changes, pageGoingAway) => policy.saveSession(changes, pageGoingAway),
    })
    const read = port.readKeyed.bind(port)
    const apply = vi.spyOn(port, 'apply')
    vi.spyOn(port, 'readKeyed').mockImplementationOnce(async (store) => {
      const entries = await read(store)
      rig.browser.pageLeaving.leave()
      return entries
    })

    rig.browser.pageVisibility.setHidden(true)
    await vi.waitFor(() => expect(rig.controller.state.review?.keeping).toBe('not-saved'))

    expect(rig.sessionSaves).toHaveLength(1)
    expect(apply).not.toHaveBeenCalled()
    expect(failures).toEqual([])
    expectNotSaved(rig)
    expect((await port.readKeyed('sessionSummaries')).map(({ key }) => key)).toEqual([
      'session-1-5',
    ])
  })

  it('hidden alone, a tab switch: the session ends and is saved as before', async () => {
    const rig = await soundedRig()

    rig.browser.pageVisibility.setHidden(true)
    await vi.waitFor(() => expect(rig.sessionSaves).toHaveLength(1))
    await flush()

    expect(rig.controller.state.review?.showing).toBe(true)
    expect(rig.controller.state.review?.keeping).toBe('not-pinned')
  })
})
