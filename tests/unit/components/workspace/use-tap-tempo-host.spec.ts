/**
 * Where the workspace holds Jam's tap tempo (rule_jam_tap_in_listening): made once Jam's code has
 * loaded, on the audio transport's unlock and clock, its taps setting Jam's tempo through the
 * workspace; listening ended as the controls become read-only, ended with the note rested as Jam
 * mode is left; a tempo changed another way rests a note naming another one; its timer cleared
 * with the workspace. On a hand-moved audio clock.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, shallowRef, type EffectScope } from 'vue'

import type { JamModeModule } from '@/components/workspace/load-jam-mode'
import { useTapTempoHost, type WorkspaceTapTempo } from '@/components/workspace/use-tap-tempo-host'
import * as jamMode from '@/jam/jam-mode'

/** The host over its seams, each changeable. */
interface Host {
  readonly host: WorkspaceTapTempo
  readonly jamModule: { value: JamModeModule | null }
  readonly jamShowing: { value: boolean }
  readonly readonly: { value: boolean }
  readonly controllerConnected: { value: boolean }
  readonly clock: { value: number }
  readonly tempo: { value: number | null }
  readonly unlock: ReturnType<typeof vi.fn>
  readonly setTempo: ReturnType<typeof vi.fn>
}

let scope: EffectScope | null = null

afterEach(() => {
  scope?.stop()
  scope = null
  vi.useRealTimers()
})

/** Intent: the host, Jam's code loaded and Jam mode showing at 100 BPM unless told. */
function host(loaded = true): Host {
  const jamModule = shallowRef<JamModeModule | null>(loaded ? jamMode : null)
  const jamShowing = shallowRef(loaded)
  const readonly = shallowRef(false)
  const controllerConnected = shallowRef(true)
  const clock = shallowRef(10)
  const tempo = shallowRef<number | null>(100)
  const unlock = vi.fn()
  const setTempo = vi.fn((value: number) => {
    tempo.value = value
  })
  scope = effectScope()
  const made = scope.run(() =>
    useTapTempoHost({
      jamModule: () => jamModule.value,
      jamShowing: () => jamShowing.value,
      readonly: () => readonly.value,
      controllerConnected: () => controllerConnected.value,
      audio: { unlock, now: () => clock.value },
      tempo: () => tempo.value,
      setTempo,
    }),
  )
  if (made === undefined) throw new Error('the effect scope ran nothing')
  return {
    host: made,
    jamModule,
    jamShowing,
    readonly,
    controllerConnected,
    clock,
    tempo,
    unlock,
    setTempo,
  }
}

/** Intent: four presses of `tap-tempo` half a second apart on the audio clock: 120 BPM. */
function tapTo120(made: Host): void {
  for (let tap = 0; tap < 4; tap += 1) {
    if (tap > 0) made.clock.value += 0.5
    made.host.press()
  }
}

// @test-link [[rule_jam_tap_in_listening]]
describe("the workspace's tap tempo", () => {
  // @test-link [[rule_jam_tap_in_listening]]
  it("is made once Jam's code has loaded; before, it shows nothing and never listens", () => {
    const made = host(false)
    expect(made.host.view.value).toBeNull()
    made.host.press()
    expect(made.host.isListening()).toBe(false)
    expect(made.unlock).not.toHaveBeenCalled()

    made.jamModule.value = jamMode
    expect(made.host.view.value).toEqual({
      listening: false,
      note: { kind: 'rest' },
      controllerConnected: true,
    })
    made.controllerConnected.value = false
    expect(made.host.view.value?.controllerConnected).toBe(false)
  })

  // @test-link [[rule_jam_tempo_from_taps]]
  it("opens the audio on a press, and sets Jam's tempo through the workspace from the fourth tap", () => {
    const made = host()
    made.host.press()
    expect(made.unlock).toHaveBeenCalledTimes(1)
    expect(made.host.isListening()).toBe(true)
    expect(made.host.view.value?.note).toEqual({ kind: 'counting' })

    made.clock.value += 0.5
    made.host.tap(made.clock.value)
    made.clock.value += 0.5
    made.host.tap(made.clock.value)
    expect(made.setTempo).not.toHaveBeenCalled()
    made.clock.value += 0.5
    made.host.tap(made.clock.value)

    expect(made.setTempo.mock.calls).toEqual([[120]])
    expect(made.host.view.value).toMatchObject({
      listening: true,
      note: { kind: 'set', tempo: 120 },
    })
  })

  // @test-link [[rule_jam_tap_in_listening]]
  it('ends listening as the controls become read-only, the tempo set staying', () => {
    const made = host()
    tapTo120(made)

    made.readonly.value = true

    expect(made.host.isListening()).toBe(false)
    expect(made.host.view.value).toMatchObject({
      listening: false,
      note: { kind: 'set', tempo: 120 },
    })
  })

  // @test-link [[rule_jam_tap_in_listening]]
  it('ends listening and rests the note as Jam mode is left', () => {
    const made = host()
    tapTo120(made)

    made.jamShowing.value = false

    expect(made.host.isListening()).toBe(false)
    expect(made.host.view.value).toMatchObject({ listening: false, note: { kind: 'rest' } })
  })

  // @test-link [[rule_jam_tap_in_listening]]
  it('rests a note naming another tempo when the tempo is changed another way', () => {
    const made = host()
    tapTo120(made)
    made.host.end()

    expect(made.host.view.value?.note).toEqual({ kind: 'set', tempo: 120 })
    made.tempo.value = 130
    expect(made.host.view.value?.note).toEqual({ kind: 'rest' })
  })

  it("clears its timer with the workspace's scope", () => {
    vi.useFakeTimers()
    const made = host()
    made.host.press()
    expect(vi.getTimerCount()).toBe(1)

    scope?.stop()
    scope = null

    expect(vi.getTimerCount()).toBe(0)
  })
})
