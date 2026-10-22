/**
 * A scheduled mutation skipped at a dead end, through the session controller over real runners:
 * a session started with `Vary settings` on gets settings with no legal move from an automatic
 * change (only the Rhythm group allowed, the rhythm lock on); its first mutation is then skipped,
 * nothing throws, nothing new shows for it and the session runs on. At 240 BPM phrase n starts at
 * 6.1 + 4(n - 1) s.
 */
import { describe, expect, it } from 'vitest'

import { settingsMutationSeed } from '@/session/session-seed-plan'
import type { SessionSettings } from '@/session/session-types'
import { mutationPhrase } from '@/session/settings-mutation'
import { groupsOn } from '../../session/vary-settings-groups-cases'
import { controllerRig, outputsOf, playTo } from './session-controller-rig'

/** Intent: when phrase `n` of a 240 BPM rig session starts sounding. */
function phraseStart(n: number): number {
  return 6.1 + 4 * (n - 1)
}

// @test-link [[rule_vary_settings_skips_dead_end]]
describe('session controller: a mutation skipped at a dead end', () => {
  // @test-link [[rule_vary_settings_skips_dead_end]]
  // @test-link [[rule_automatic_change_updates_controls_quietly]]
  it('passes the skip on and shows nothing new for it, the session running on', async () => {
    const rig = controllerRig()
    rig.controller.setVarySettings(true)
    rig.controller.start()
    const landsOn = mutationPhrase(settingsMutationSeed(rig.phraseOne.sessionSeed), 1)
    await playTo(rig, phraseStart(1) + 0.5)
    const stuck: SessionSettings = {
      ...rig.settings,
      allowedGroups: groupsOn(['rhythm']),
      rhythmLockOn: true,
    }

    rig.changeSettings(stuck)
    await playTo(rig, phraseStart(landsOn) + 0.05)

    expect(outputsOf(rig, 'mutation-skipped')).toStrictEqual([
      { kind: 'mutation-skipped', phraseNumber: landsOn, mutationNumber: 1 },
    ])
    expect(outputsOf(rig, 'settings-changed')).toMatchObject([
      { phraseNumber: 3, cause: 'automatic' },
    ])
    expect(rig.controller.state.phase).toBe('running')
    expect(rig.controller.state.shownSettings).toEqual(stuck)
    rig.controller.dispose()
  })
})
