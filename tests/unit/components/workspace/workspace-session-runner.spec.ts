/**
 * The workspace's session runner before chunk 25: the settings-mutation flag stays off, the
 * display reading is not connected and throws when read, and the two outputs a settings change
 * produces are refused rather than silently ignored.
 */

import { describe, expect, it } from 'vitest'

import {
  DISPLAY_NOT_CONNECTED,
  refusingSettingsChangeOutputs,
  startWorkspaceSessionRunner,
} from '@/components/workspace/workspace-session-runner'
import type { SessionOutput } from '@/session/session-types'
import {
  fakeViewport,
  phraseOneFor,
  queuedProviders,
  realOutcomeFor,
  sessionSettings,
} from '../../session/session-harness'

/** Intent: let every settled seam promise run its continuation. */
function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

// @test-link [[service_workspace_session_flow]]
// @test-link [[req_settings_mutation_flag]]
describe('the workspace session runner before its settings-change connections', () => {
  // @test-link [[service_workspace_session_flow]]
  it('throws when the display reading is read', () => {
    expect(() => DISPLAY_NOT_CONNECTED.isPhraseOnScreen(3)).toThrow(/not connected until chunk 25/u)
  })

  // @test-link [[service_workspace_session_flow]]
  it('forwards every output but the two a settings change produces, which throw', () => {
    const forwarded: SessionOutput[] = []
    const onOutput = refusingSettingsChangeOutputs((output) => forwarded.push(output))
    onOutput({ kind: 'wake-at', at: 1 })
    expect(() => onOutput({ kind: 'phrase-discarded', phraseNumber: 3 })).toThrow(/chunk 25/u)
    expect(() =>
      onOutput({
        kind: 'settings-changed',
        phraseNumber: 3,
        settings: sessionSettings(),
        cause: 'automatic',
      }),
    ).toThrow(/chunk 25/u)
    expect(forwarded).toEqual([{ kind: 'wake-at', at: 1 }])
  })

  // @test-link [[req_settings_mutation_flag]]
  it('runs a long session with the flag off: no setting changes and no error', async () => {
    const settings = sessionSettings({ tempo: 240 })
    const clock = { at: 0 }
    const outputs: SessionOutput[] = []
    const errors: unknown[] = []
    const runner = startWorkspaceSessionRunner(
      {
        generate: (intent) => Promise.resolve(realOutcomeFor(intent)),
        checkFit: () => Promise.resolve(true),
        now: () => clock.at,
        providers: queuedProviders(),
        viewport: fakeViewport(false),
        onOutput: (output) => outputs.push(output),
        onError: (error) => errors.push(error),
      },
      { at: 0, settings, phraseOne: phraseOneFor(settings), adaptiveTempo: false },
    )
    await settle()
    clock.at = 1
    runner.dispatch({ kind: 'count-in-over', at: clock.at })
    for (let phraseNumber = 2; phraseNumber <= 12; phraseNumber += 1) {
      clock.at = 1 + 4 * (phraseNumber - 1)
      runner.dispatch({ kind: 'phrase-started-sounding', at: clock.at, phraseNumber })
      await settle()
    }
    expect(errors).toEqual([])
    const requests = outputs.filter((output) => output.kind === 'request-generation')
    expect(requests.map((request) => request.phraseNumber).at(-1)).toBe(13)
    for (const request of requests) expect(request.intent.controls).toEqual(settings.controls)
  })
})
