/**
 * A Review host and the review area over it, as the score panel and its lazily loaded review area
 * build them, over a fake session controller, inside their own effect scope: the host's saves are
 * recorded and the export's ports are mocks.
 */
import { vi, type Mock } from 'vitest'
import { effectScope } from 'vue'

import { useReviewArea, type ReviewArea } from '@/components/workspace/use-review-area'
import { useReviewHost, type ReviewHost } from '@/components/workspace/use-review-host'
import {
  DEFAULT_REVIEW_PREFERENCES,
  type ReviewPreferences,
} from '@/storage/records/setting-defaults'
import type { SettingChanges } from '@/storage/settings-saver'
import { createFakeSessionController, type FakeSessionController } from './fake-session-controller'
import { recordingSaveSettings } from './recording-save-settings'

/** A Review host, the area over it, and what a spec reads or drives of them. */
export interface ReviewAreaRig {
  readonly host: ReviewHost
  readonly area: ReviewArea
  /** The export's ports: the load of the export code, and the download. */
  readonly ports: { readonly load: Mock; readonly download: Mock }
  readonly fake: FakeSessionController
  /** Every batch of settings saved, in order. */
  readonly saves: SettingChanges[]
  /** End the effect scope the host and the area were built in. */
  readonly stop: () => void
}

/**
 * Intent: a host over `fake`'s controller starting from `preferences`, and the area over that
 * host, built in one effect scope that `stop` ends; both save through the one recording saver.
 */
export function reviewAreaRig(
  fake: FakeSessionController = createFakeSessionController(),
  preferences: ReviewPreferences = DEFAULT_REVIEW_PREFERENCES,
): ReviewAreaRig {
  const ports = { load: vi.fn(), download: vi.fn() }
  const { saveSettings, saves } = recordingSaveSettings()
  const scope = effectScope()
  const built = scope.run(() => {
    const host = useReviewHost({
      controller: () => fake.controller,
      initialPreferences: preferences,
      saveSettings,
    })
    const area = useReviewArea({
      host,
      controller: () => fake.controller,
      exportPorts: () => ports,
      saveSettings,
    })
    return { host, area }
  })
  if (built === undefined) throw new Error('the effect scope did not run')
  return { ...built, ports, fake, saves, stop: () => scope.stop() }
}
