/**
 * The score panel's Review host on its own: nothing shows and nothing is given while no Review
 * shows, an export asked for then is refused as the defect it is, and the page-session export
 * choices start at MusicXML with the backing track off.
 */
import { describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

import { useReviewHost } from '@/components/workspace/use-review-host'
import { recordedRecords } from '../review/review-fixtures'
import { createFakeSessionController, fakeReviewHistory } from './fake-session-controller'
import { fakeGenerationSession } from './fake-generation-session'

/** Intent: a host over `fake`'s controller and an Idle double, inside its own effect scope. */
function host(fake = createFakeSessionController()) {
  const { session } = fakeGenerationSession()
  const ports = { load: vi.fn(), download: vi.fn() }
  const scope = effectScope()
  const built = scope.run(() =>
    useReviewHost({
      controller: () => fake.controller,
      idle: () => session.state,
      exportPorts: () => ports,
    }),
  )
  if (built === undefined) throw new Error('the effect scope did not run')
  return { built, ports, fake, stop: () => scope.stop() }
}

// @test-link [[req_last_session_review]]
describe('useReviewHost', () => {
  // @test-link [[req_last_session_review]]
  // @test-link [[req_session_export]]
  it('gives nothing while no Review shows, and refuses an export then', async () => {
    const { built, ports, stop } = host()

    expect(built.showing.value).toBe(false)
    expect(built.records.value).toEqual([])
    expect(built.instrumentName.value).toBe('')
    expect(built.format.value).toBe('musicxml')
    expect(built.backingTrack.value).toBe(false)
    await expect(built.exportFile({ format: 'musicxml', backingTrack: false })).rejects.toThrow(
      'review host: an export was asked for with no Review showing',
    )
    expect(ports.load).not.toHaveBeenCalled()
    stop()
  })

  // @test-link [[req_last_session_review]]
  it('gives the phrases and instrument of the Review only while it shows, not while kept', () => {
    const fake = createFakeSessionController({
      review: { history: fakeReviewHistory(recordedRecords(), 'c-keyboard'), showing: true },
    })
    const { built, stop } = host(fake)

    expect(built.records.value).toBe(recordedRecords())
    expect(built.instrumentName.value).toBe('C MIDI keyboard')

    fake.controller.closeReview()

    expect(built.showing.value).toBe(false)
    expect(built.records.value).toEqual([])
    stop()
  })
})
