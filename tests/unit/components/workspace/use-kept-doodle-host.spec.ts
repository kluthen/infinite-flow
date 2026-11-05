/**
 * Where the workspace holds Jam's kept doodle (module_kept_doodle): made once Jam's code has
 * loaded in the visit, from Jam's code, for the selected instrument and Jam's key and mode; kept
 * through anything but what lets it go: leaving Jam mode, and the player's deletion of the session
 * it comes from or of every session, and my instrument's erased sessions when they take the one it
 * comes from. A deletion of another session, entering Jam mode or a change of the instrument keep
 * it. Its suggestion declined keeps it too.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { effectScope, shallowRef, type EffectScope } from 'vue'

import { BB_TENOR_PROFILE, C_KEYBOARD_PROFILE } from '@/domain/profile/instrument-profiles'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import * as jamMode from '@/jam/jam-mode'
import type { JamModeModule } from '@/components/workspace/load-jam-mode'
import {
  useKeptDoodleHost,
  type WorkspaceKeptDoodle,
} from '@/components/workspace/use-kept-doodle-host'
import type { PlayerSessionDeletion } from '@/components/workspace/workspace-session-controller-types'

import { reviewedJamPart } from './reviewed-jam-part-fixture'

/** The host over its seams, each changeable. */
interface Host {
  readonly host: WorkspaceKeptDoodle
  readonly jamModule: { value: JamModeModule | null }
  readonly jamShowing: { value: boolean }
  readonly lastDeletion: { value: PlayerSessionDeletion | null }
  readonly instrument: { value: InstrumentProfile }
}

let scope: EffectScope | null = null

afterEach(() => {
  scope?.stop()
  scope = null
})

/** Intent: the host, Jam's code loaded and Jam mode showing unless told. */
function host(loaded = true): Host {
  const jamModule = shallowRef<JamModeModule | null>(loaded ? jamMode : null)
  const jamShowing = shallowRef(loaded)
  const lastDeletion = shallowRef<PlayerSessionDeletion | null>(null)
  const instrument = shallowRef<InstrumentProfile>(C_KEYBOARD_PROFILE)
  scope = effectScope()
  const made = scope.run(() =>
    useKeptDoodleHost({
      jamModule: () => jamModule.value,
      jamShowing: () => jamShowing.value,
      lastDeletion: () => lastDeletion.value,
      instrument: () => instrument.value,
      keyAndMode: () => ({ tonalCenter: 'C', collection: 'Major' }),
    }),
  )
  if (made === undefined) throw new Error('the effect scope ran nothing')
  return { host: made, jamModule, jamShowing, lastDeletion, instrument }
}

/** Intent: the host with the fixture's doodle kept from the session `session-1`. */
function keeping(): Host {
  const made = host()
  made.host.keep(reviewedJamPart(), 'session-1')
  return made
}

// @test-link [[module_kept_doodle]]
describe("the workspace's kept doodle", () => {
  it("is made once Jam's code has loaded, and kept for the visit", () => {
    const made = host(false)
    expect(made.host.holder.value).toBeNull()
    expect(made.host.kept.value).toBeNull()
    expect(() => made.host.keep(reviewedJamPart(), 'session-1')).toThrow(/Jam's code/)

    made.jamModule.value = jamMode
    const holder = made.host.holder.value
    expect(holder).not.toBeNull()
    made.host.keep(reviewedJamPart(), 'session-1')

    expect(made.host.kept.value?.sessionKey).toBe('session-1')
    expect(made.host.holder.value).toBe(holder)
  })

  // @test-link [[rule_held_doodle_dropped_on_change]]
  it('lets it go on leaving Jam mode; entering Jam mode keeps it', () => {
    const made = keeping()

    made.jamShowing.value = false
    expect(made.host.kept.value).toBeNull()

    made.host.keep(reviewedJamPart(), 'session-2')
    made.jamShowing.value = true
    expect(made.host.kept.value?.sessionKey).toBe('session-2')
  })

  // @test-link [[rule_held_doodle_dropped_on_change]]
  it("lets it go on the player's deletion of the session it comes from; another session's keeps it", () => {
    const made = keeping()

    made.lastDeletion.value = { kind: 'session', key: 'session-0' }
    expect(made.host.kept.value?.sessionKey).toBe('session-1')

    made.lastDeletion.value = { kind: 'session', key: 'session-1' }
    expect(made.host.kept.value).toBeNull()
  })

  // @test-link [[rule_held_doodle_dropped_on_change]]
  it("lets it go on the player's deletion of every session", () => {
    const made = keeping()

    made.lastDeletion.value = { kind: 'every-session' }

    expect(made.host.kept.value).toBeNull()
  })

  // @test-link [[rule_held_doodle_dropped_on_change]]
  it("lets it go when my instrument's erased sessions take the one it comes from; others keep it", () => {
    const made = keeping()

    made.lastDeletion.value = { kind: 'my-instrument-sessions', keys: ['session-0', 'session-2'] }
    expect(made.host.kept.value?.sessionKey).toBe('session-1')

    made.lastDeletion.value = { kind: 'my-instrument-sessions', keys: ['session-0', 'session-1'] }
    expect(made.host.kept.value).toBeNull()
  })

  // @test-link [[rule_held_doodle_dropped_on_change]]
  it('keeps it through a change of the instrument, and lets it go on New doodle', () => {
    const made = keeping()
    const kept = made.host.kept.value

    made.instrument.value = BB_TENOR_PROFILE
    expect(made.host.kept.value).toBe(kept)

    made.host.letGo()
    expect(made.host.kept.value).toBeNull()
  })

  // @test-link [[rule_suggestion_keep_mine]]
  it("declines the kept doodle's suggestion, the doodle kept; with none kept, nothing changes", () => {
    const made = keeping()

    made.host.decline()

    expect(made.host.kept.value).toEqual(
      expect.objectContaining({ sessionKey: 'session-1', suggestionDeclined: true }),
    )
    made.host.letGo()
    expect(() => made.host.decline()).not.toThrow()
    expect(made.host.kept.value).toBeNull()
  })

  it("works a read-back part's readings out for the selected instrument", () => {
    const made = host()
    made.instrument.value = BB_TENOR_PROFILE
    const part = { ...reviewedJamPart(), doodleControls: null, suggestion: null }

    made.host.keep(part, 'session-1')

    const direct = jamMode.useKeptDoodle({
      instrument: () => BB_TENOR_PROFILE,
      keyAndMode: () => ({ tonalCenter: 'C', collection: 'Major' }),
    })
    direct.keep(part, 'session-1')
    expect(made.host.kept.value).toEqual(direct.kept.value)
  })
})
