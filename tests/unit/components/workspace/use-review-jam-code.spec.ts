// @vitest-environment node
/**
 * Jam's code as a Jam session's Review asks for it, over a fake loader the test settles: a Review
 * of a session that is no Jam loads nothing; Jam's code already loaded in the visit is there at
 * once; otherwise the Review shows it loading until the load settles, loaded or failed; a load
 * settling once another session's Review shows changes nothing; and the next Jam session's Review
 * asks again after a failure. A Jam's export waits for it to settle: at once when it already has,
 * otherwise once it turns loaded or failed.
 */
import { describe, expect, it } from 'vitest'
import { shallowRef } from 'vue'

import type { ReviewJamCode } from '@/components/review/review-types'
import type { JamModeModule } from '@/components/workspace/load-jam-mode'
import { settledJamCode, useReviewJamCode } from '@/components/workspace/use-review-jam-code'
import * as jamMode from '@/jam/jam-mode'

/** Jam's code entry, as Jam's loader gives it once loaded. */
const JAM_MODULE: JamModeModule = jamMode

/** One load the fake loader started, settled by the test. */
interface PendingLoad {
  readonly resolve: (module: JamModeModule) => void
  readonly reject: (cause: unknown) => void
}

/** Intent: let every settled promise's handlers run. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Intent: the Review's Jam code over a shown session the test changes (null: none, or no Jam),
 * Jam's code loaded in the visit or not, and a loader recording each load it starts.
 */
function jamCodeRig(options: { readonly loaded?: boolean; readonly session?: object | null } = {}) {
  const session = shallowRef<object | null>(options.session ?? null)
  const loads: PendingLoad[] = []
  const code = useReviewJamCode({
    jamSession: () => session.value,
    loaded: () => (options.loaded === true ? JAM_MODULE : null),
    load: () =>
      new Promise<JamModeModule>((resolve, reject) => {
        loads.push({ resolve, reject })
      }),
  })
  return { session, loads, code }
}

// @test-link [[rule_jam_code_loaded_on_demand]]
describe('useReviewJamCode', () => {
  // @test-link [[rule_jam_code_loaded_on_demand]]
  it('loads nothing for a Review of a session that is no Jam', async () => {
    const { session, loads } = jamCodeRig()

    session.value = null
    await settle()

    expect(loads).toHaveLength(0)
  })

  // @test-link [[rule_jam_code_loaded_on_demand]]
  // @test-link [[rule_review_opens_with_doodle]]
  it("has Jam's code at once, without loading, when it has already loaded in the visit", () => {
    const { code, loads } = jamCodeRig({ loaded: true, session: {} })

    expect(code.value).toEqual({ state: 'loaded', module: JAM_MODULE })
    expect(loads).toHaveLength(0)
  })

  // @test-link [[rule_jam_code_loaded_on_demand]]
  it('shows it loading as a Jam session opens, then loaded once the load succeeds', async () => {
    const { session, loads, code } = jamCodeRig()

    session.value = {}
    expect(code.value).toEqual({ state: 'loading' })
    expect(loads).toHaveLength(1)

    loads[0]!.resolve(JAM_MODULE)
    await settle()
    expect(code.value).toEqual({ state: 'loaded', module: JAM_MODULE })
  })

  // @test-link [[rule_jam_code_loaded_on_demand]]
  it('shows it failed when the load fails', async () => {
    const { loads, code } = jamCodeRig({ session: {} })
    expect(code.value).toEqual({ state: 'loading' })

    loads[0]!.reject(new TypeError('Failed to fetch dynamically imported module'))
    await settle()
    expect(code.value).toEqual({ state: 'failed' })
    expect(loads).toHaveLength(1)
  })

  // @test-link [[rule_jam_code_loaded_on_demand]]
  it('changes nothing when a load settles after another Review has opened', async () => {
    const { session, loads, code } = jamCodeRig({ session: {} })

    session.value = {}
    expect(loads).toHaveLength(2)
    loads[0]!.reject(new Error('offline'))
    await settle()
    expect(code.value).toEqual({ state: 'loading' })

    session.value = null
    loads[1]!.resolve(JAM_MODULE)
    await settle()
    expect(code.value).toEqual({ state: 'loading' })
  })

  // @test-link [[rule_jam_code_loaded_on_demand]]
  it('asks again when a Jam session opens after a failed load', async () => {
    const { session, loads, code } = jamCodeRig({ session: {} })
    loads[0]!.reject(new Error('offline'))
    await settle()
    expect(code.value).toEqual({ state: 'failed' })

    session.value = null
    session.value = {}
    expect(loads).toHaveLength(2)
    expect(code.value).toEqual({ state: 'loading' })

    loads[1]!.resolve(JAM_MODULE)
    await settle()
    expect(code.value).toEqual({ state: 'loaded', module: JAM_MODULE })
  })
})

/** Intent: whether `promise` has settled yet, after letting pending handlers run. */
async function hasSettled(promise: Promise<unknown>): Promise<boolean> {
  let settled = false
  void promise.then(() => (settled = true))
  await settle()
  return settled
}

// @test-link [[rule_jam_code_loaded_on_demand]]
describe('settledJamCode', () => {
  // @test-link [[rule_jam_code_loaded_on_demand]]
  it('gives loaded or failed code at once', async () => {
    const loaded: ReviewJamCode = { state: 'loaded', module: JAM_MODULE }

    await expect(settledJamCode(shallowRef(loaded))).resolves.toBe(loaded)
    await expect(settledJamCode(shallowRef<ReviewJamCode>({ state: 'failed' }))).resolves.toEqual({
      state: 'failed',
    })
  })

  // @test-link [[rule_jam_code_loaded_on_demand]]
  it('waits while the code loads, then gives it once loaded', async () => {
    const code = shallowRef<ReviewJamCode>({ state: 'loading' })
    const loaded: ReviewJamCode = { state: 'loaded', module: JAM_MODULE }

    const settling = settledJamCode(code)
    expect(await hasSettled(settling)).toBe(false)
    code.value = { state: 'loading' }
    expect(await hasSettled(settling)).toBe(false)
    code.value = loaded

    await expect(settling).resolves.toBe(loaded)
  })

  // @test-link [[rule_jam_code_loaded_on_demand]]
  it('gives failed code once the load fails, whatever the code turns to after', async () => {
    const code = shallowRef<ReviewJamCode>({ state: 'loading' })

    const settling = settledJamCode(code)
    code.value = { state: 'failed' }
    code.value = { state: 'loaded', module: JAM_MODULE }

    await expect(settling).resolves.toEqual({ state: 'failed' })
  })
})
