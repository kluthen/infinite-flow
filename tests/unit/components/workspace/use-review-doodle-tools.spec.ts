// @vitest-environment node
/**
 * A Jam session's review's `Keep {key} {mode}` (master spec C6.5; rule_suggestion_keep_mine): the
 * decline made on the reviewed session through the session controller, and handed to the
 * workspace's Jam ports with that session's key, so Jam's kept doodle, when it comes from that
 * session, is declined too.
 */
import { describe, expect, it, vi } from 'vitest'
import { shallowRef } from 'vue'

import type { ReviewJamCode } from '@/components/review/review-types'
import type { ReviewJamPorts } from '@/components/workspace/review-jam-ports'
import { useReviewDoodleTools } from '@/components/workspace/use-review-doodle-tools'
import * as jamMode from '@/jam/jam-mode'
import { C_KEYBOARD_PROFILE } from '@/domain/profile/instrument-profiles'

import { createFakeSessionController } from './fake-session-controller'
import { reviewedJamPart } from './reviewed-jam-part-fixture'

// @test-link [[rule_suggestion_keep_mine]]
describe("a Jam session's review: Keep {key} {mode}", () => {
  it("declines the reviewed session's suggestion, and hands the decline to Jam's ports", () => {
    const fake = createFakeSessionController()
    const declined = vi.fn()
    const ports: ReviewJamPorts = {
      keyAndMode: () => ({ tonalCenter: 'C', collection: 'Major' }),
      instrument: () => C_KEYBOARD_PROFILE,
      useAnswer: () => {},
      jamAgain: () => Promise.resolve(),
      declined,
    }
    const tools = useReviewDoodleTools({
      jamCode: shallowRef<ReviewJamCode>({ state: 'loaded', module: jamMode }),
      jam: () => reviewedJamPart(),
      sessionKey: () => 'session-1',
      controller: () => fake.controller,
      ports: () => ports,
      focusJamAgain: () => {},
      focusTitle: () => {},
    })

    tools.keep()

    expect(fake.controller.declineSuggestion).toHaveBeenCalledWith('session-1')
    expect(declined).toHaveBeenCalledWith('session-1')
  })
})
