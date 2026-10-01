/**
 * The lazy phrase replay announcer: synchronous announcements once its module has loaded, Idle
 * announcements made before that held and replayed in order, and no session runner wrapped
 * before it loaded.
 */
import { describe, expect, it } from 'vitest'

import * as announcement from '@/components/workspace/phrase-replay-announcement'
import {
  createPhraseReplayAnnouncer,
  type PhraseReplayAnnouncementModule,
} from '@/components/workspace/phrase-replay-announcer'
import type { SessionOutput } from '@/session/session-types'
import { buildIntent } from '../../domain/generation/carry-in/carry-in-fixture'

const FIRST = buildIntent({ seed: 31, label: 'announcer' })
const SECOND = buildIntent({ seed: 32, label: 'announcer' })

/** Intent: an announcer whose module load the test settles by hand. */
function heldAnnouncer() {
  const lines: string[] = []
  let settle!: (module: PhraseReplayAnnouncementModule) => void
  let fail!: (error: Error) => void
  const load = () =>
    new Promise<PhraseReplayAnnouncementModule>((resolve, reject) => {
      settle = resolve
      fail = reject
    })
  const announcer = createPhraseReplayAnnouncer((line) => lines.push(line), load)
  return {
    announcer,
    lines,
    release: () => settle(announcement),
    fail: (error: Error) => fail(error),
  }
}

/** Intent: the line the announcement module itself writes for a workspace phrase. */
function workspaceLine(intent: typeof FIRST): string {
  const lines: string[] = []
  announcement.announceWorkspacePhrase(intent, (line) => lines.push(line))
  return lines[0]!
}

// @test-link [[module_phrase_replay_key]]
describe('createPhraseReplayAnnouncer', () => {
  it('announces an Idle phrase at once once its module has loaded', async () => {
    const { announcer, lines, release } = heldAnnouncer()
    release()
    await announcer.loaded

    announcer.announceWorkspacePhrase(FIRST)

    expect(lines).toEqual([workspaceLine(FIRST)])
  })

  it('holds Idle phrases accepted before it loaded, then announces them once each, in order', async () => {
    const { announcer, lines, release } = heldAnnouncer()
    announcer.announceWorkspacePhrase(FIRST)
    announcer.announceWorkspacePhrase(SECOND)
    expect(lines).toEqual([])

    release()
    await announcer.loaded
    await Promise.resolve()
    await Promise.resolve()

    expect(lines).toEqual([workspaceLine(FIRST), workspaceLine(SECOND)])
  })

  it('throws when a session runner is wrapped before it loaded, and wraps once it has', async () => {
    const { announcer, release } = heldAnnouncer()
    const forwarded: SessionOutput[] = []
    expect(() => announcer.announcingSessionOutputs((output) => forwarded.push(output))).toThrow(
      /before it loaded/u,
    )

    release()
    await announcer.loaded
    const sink = announcer.announcingSessionOutputs((output) => forwarded.push(output))
    const ended: SessionOutput = {
      kind: 'ended',
      at: 1,
      cause: 'stop',
      phase: 'count-in',
      soundedPhraseCount: 0,
    }
    sink(ended)
    expect(forwarded).toEqual([ended])
  })

  it('rejects loaded when its module fails to load', async () => {
    const { announcer, fail } = heldAnnouncer()
    const failure = new Error('chunk fetch failed')
    fail(failure)
    await expect(announcer.loaded).rejects.toBe(failure)
  })
})
