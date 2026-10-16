/**
 * The batch that erases my instrument's kept sessions against the retry of a session's refused
 * own save (spec D326, D338), over a real save policy and port on an in-memory IndexedDB, the
 * refusals coming from the port: a retry asked before the batch lands first and the batch erases
 * what it wrote; a retry asked after it never writes once the batch is saved; a refused batch
 * leaves everything as it was, the retry it held back running again. On the fake audio clock at
 * 240 BPM from 5 s: phrase 1 sounds from 6.1 s.
 */
import { describe, expect, it, vi } from 'vitest'

import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { createGenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { makeSeed } from '@/domain/random/seed'
import { createSavePolicy } from '@/storage/save-policy'
import { createVisitSaves, type VisitSaves } from '@/storage/settings-saver'
import { StorageError, type StorageChange, type StoragePort } from '@/storage/storage-port'
import { APP_VERSION } from '@/storage/app-version'

import { BASE_CONTROLS, generateSuccess } from '../../domain/generation/carry-in/carry-in-fixture'
import { lowHorn } from '../../session/my-instrument-session'
import { readyPort } from '../../storage/save-policy-doubles'
import { freshFactory } from '../../storage/storage-test-doubles'
import {
  controllerRig,
  flush,
  playTo,
  RIG_SESSION_SEED,
  RIG_TEMPO,
  type ControllerRig,
} from './session-controller-rig'

const HORN = lowHorn('treble')

/** A port whose batches the test refuses, or holds back, on demand. */
interface SteeredPort {
  readonly port: StoragePort
  /** Refuse, with a lack of space, every batch `refused` picks; none once it picks none. */
  readonly refuse: (refused: (changes: readonly StorageChange[]) => boolean) => void
  /** Hold the next batch back until `release`; `reached` resolves once it reaches the port. */
  readonly holdNext: () => { readonly reached: Promise<void>; readonly release: () => void }
}

/** Intent: wrap a real port so its batches can be refused or held back. */
function steeredPort(real: StoragePort): SteeredPort {
  let refused: (changes: readonly StorageChange[]) => boolean = () => false
  let held: { readonly reach: () => void; readonly gate: Promise<void> } | null = null
  const port: StoragePort = {
    ...real,
    apply: async (changes) => {
      const holding = held
      held = null
      if (holding !== null) {
        holding.reach()
        await holding.gate
      }
      if (refused(changes)) throw new StorageError('quota', 'refused by the test double')
      return real.apply(changes)
    },
  }
  return {
    port,
    refuse: (pick) => {
      refused = pick
    },
    holdNext: () => {
      let reach = (): void => {}
      let release = (): void => {}
      const reached = new Promise<void>((resolve) => {
        reach = resolve
      })
      const gate = new Promise<void>((resolve) => {
        release = resolve
      })
      held = { reach, gate }
      return { reached, release }
    },
  }
}

/** Intent: whether a batch is my instrument's: it changes the instrument store. */
function isInstrumentBatch(changes: readonly StorageChange[]): boolean {
  return changes.some((change) => change.store === 'instrument')
}

/** A controller over the visit's real saves, on a steered port. */
interface Visit {
  readonly rig: ControllerRig
  readonly saves: VisitSaves
  readonly steered: SteeredPort
  readonly real: StoragePort
}

/** Intent: a controller whose session saves and kept changes go through real visit saves. */
async function visit(): Promise<Visit> {
  const real = await readyPort(freshFactory())
  const steered = steeredPort(real)
  const saves = createVisitSaves(Promise.resolve(createSavePolicy(steered.port)), APP_VERSION)
  const rig = controllerRig(undefined, undefined, {
    sessionSaveOutcome: (changes, pageGoingAway) => saves.saveSession(changes, pageGoingAway),
    keptSessions: { changes: saves },
  })
  return { rig, saves, steered, real }
}

/** Intent: play a two-phrase session with my instrument selected at Idle, then Stop. */
async function playedWithMyInstrument(rig: ControllerRig): Promise<void> {
  const controls = makeGenerationControls({
    ...BASE_CONTROLS,
    tempo: RIG_TEMPO,
    instrumentProfileId: 'my-instrument',
  })
  const intent = createGenerationIntent({
    requestId: makeRequestId('mine-idle'),
    seed: makeSeed(11),
    controls,
    musicalProfile: rig.idle.profileSelection,
    instrumentProfile: HORN.profile,
  })
  rig.idle.controls = controls
  rig.idle.latestIntent = intent
  rig.idle.result = { intent, outcome: generateSuccess(intent), sessionSeed: RIG_SESSION_SEED }
  rig.controller.start()
  await playTo(rig, 10.2)
  rig.controller.stop()
  await flush()
}

/** Intent: a session of my instrument played whose own save the port refused; its key. */
async function refusedSession({ rig, steered }: Visit): Promise<string> {
  steered.refuse(() => true)
  await playedWithMyInstrument(rig)
  const recent = rig.controller.state.mostRecent
  if (recent?.kind !== 'held') throw new Error('no session held')
  await vi.waitFor(() => {
    expect(rig.controller.state.review?.keeping).toBe('not-saved')
  })
  steered.refuse(() => false)
  return recent.session.key
}

/** Intent: the session stores holding a record under `key`. */
async function storesHolding(port: StoragePort, key: string): Promise<string[]> {
  const stores = ['sessionSummaries', 'sessionBodies', 'playedNotes'] as const
  const keys = await Promise.all(stores.map((store) => port.readKeys(store)))
  return stores.filter((_, index) => keys[index]?.includes(key))
}

// @test-link [[entity_my_instrument_record]]
// @test-link [[rule_failed_save_never_disturbs_session]]
describe("my instrument's batch against a refused session save's retry", () => {
  // @test-link [[entity_my_instrument_record]]
  it('a retry asked before the batch lands first, and the batch erases what it wrote', async () => {
    const opened = await visit()
    const { rig, saves, steered, real } = opened
    const key = await refusedSession(opened)

    const retryHeld = steered.holdNext()
    const favorite = rig.controller.setFavorite(key, 1, true)
    await retryHeld.reached
    const counted = rig.controller.myInstrumentSessions()
    expect(counted.count).toBe(1)
    const batch = saves.deleteMyInstrument(counted.deletes)
    retryHeld.release()
    await favorite

    expect(await batch).toEqual({ status: 'saved' })
    counted.leave()
    await flush()

    expect(await storesHolding(real, key)).toEqual([])
    expect(rig.controller.state.mostRecent).toBeNull()
  })

  // @test-link [[entity_my_instrument_record]]
  // @test-link [[rule_failed_save_never_disturbs_session]]
  it('a retry asked after the batch never writes once the batch is saved', async () => {
    const opened = await visit()
    const { rig, saves, steered, real } = opened
    const key = await refusedSession(opened)

    const counted = rig.controller.myInstrumentSessions()
    const batchHeld = steered.holdNext()
    const batch = saves.deleteMyInstrument(counted.deletes)
    await batchHeld.reached
    const favorite = rig.controller.setFavorite(key, 1, true)
    await flush()
    batchHeld.release()

    expect(await batch).toEqual({ status: 'saved' })
    counted.leave()
    await favorite
    await flush()

    expect(await storesHolding(real, key)).toEqual([])
    expect(rig.controller.state.mostRecent).toBeNull()
  })

  // @test-link [[rule_failed_save_never_disturbs_session]]
  it('refused, the batch leaves the session as it was, and the retry it held back runs again', async () => {
    const opened = await visit()
    const { rig, saves, steered, real } = opened
    const key = await refusedSession(opened)
    steered.refuse(isInstrumentBatch)

    const counted = rig.controller.myInstrumentSessions()
    const batchHeld = steered.holdNext()
    const batch = saves.deleteMyInstrument(counted.deletes)
    await batchHeld.reached
    const favorite = rig.controller.setFavorite(key, 1, true)
    await flush()
    batchHeld.release()

    expect(await batch).toEqual({ status: 'refused', kind: 'quota' })
    await favorite
    expect(await storesHolding(real, key)).toEqual([])
    counted.stay()

    await vi.waitFor(async () => {
      expect(await storesHolding(real, key)).toEqual(['sessionSummaries', 'sessionBodies'])
    })
    await vi.waitFor(() => {
      expect(rig.controller.state.review).toMatchObject({ key, keeping: 'pinned', favorites: [1] })
    })
  })
})
