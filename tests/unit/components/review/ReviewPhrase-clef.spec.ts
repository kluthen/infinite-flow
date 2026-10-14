/**
 * A Review phrase draws its stored phrase in the clef the phrase carries, never a constant: a
 * decoded kept phrase of a session played with my instrument in bass clef, and a record of such a
 * session that just ended, both reach the engraver (and the staff's description) in bass clef; a
 * built-in session's record in treble clef.
 */
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import ReviewPhrase from '@/components/review/ReviewPhrase.vue'
import type { ReviewStaffReservation } from '@/components/review/review-types'
import type { StaffViewport } from '@/notation/notation-layout-policy'
import type { ReviewedPhrase, SessionHistory } from '@/session/session-history'
import { decodeKeptSession, encodeKeptSession } from '@/storage/records/kept-session-record'
import { fakePhraseEngraver, resetFakePhraseEngraver } from '../notation/fake-phrase-engraver'
import { lowHorn, recordedMyInstrumentSession } from '../../session/my-instrument-session'
import { APP_VERSION, storedRecords } from '../../storage/kept-session-fixtures'
import { recordedRecords } from './review-fixtures'

const ONE_SYSTEM: StaffViewport = { layout: 'one-system', heightBudgetPx: null }
const ONE_POSITION: ReviewStaffReservation = { positionCount: 1, positionBlockPx: 192 }

const mounted: VueWrapper[] = []

/** Intent: mount one phrase, engrave it on the fake engraver and give the clef it was drawn in. */
async function drawnClef(record: ReviewedPhrase): Promise<string> {
  const wrapper = mount(ReviewPhrase, {
    props: {
      record,
      viewport: ONE_SYSTEM,
      reservation: ONE_POSITION,
      playedNotesShown: false,
      pitchScale: null,
    },
    attachTo: document.body,
  })
  mounted.push(wrapper)
  const api = wrapper.vm as unknown as InstanceType<typeof ReviewPhrase>
  expect(await api.engrave(fakePhraseEngraver)).toBe('engraved')
  const call = fakePhraseEngraver.engraveWrittenPhrase.mock.calls.at(-1)
  if (call === undefined) throw new Error('The phrase reached no engraver.')
  return call[1].clef
}

let history: SessionHistory

beforeAll(async () => {
  history = await recordedMyInstrumentSession(lowHorn('bass'), 2)
})

beforeEach(() => {
  resetFakePhraseEngraver()
})

afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount())
})

// @test-link [[req_last_session_review]]
// @test-link [[req_my_instrument]]
describe('the clef a review phrase is drawn in', () => {
  // @test-link [[req_last_session_review]]
  // @test-link [[module_kept_session_codec]]
  it('is the bass clef of a decoded kept phrase played with my instrument in bass clef', async () => {
    const facts = { pinned: false, favorites: [], comment: '', playedNotesKept: false }
    const reading = decodeKeptSession(storedRecords(encodeKeptSession(history, facts, APP_VERSION)))
    if (reading.reading !== 'current') throw new Error(`Read as ${reading.reading}.`)

    for (const phrase of reading.value.phrases) expect(await drawnClef(phrase)).toBe('bass')
  })

  // @test-link [[req_last_session_review]]
  it('is the bass clef of each record of a my-instrument session that just ended', async () => {
    for (const record of history.phrases()) expect(await drawnClef(record)).toBe('bass')
  })

  // @test-link [[req_last_session_review]]
  it("is the treble clef of a built-in session's record", async () => {
    expect(await drawnClef(recordedRecords()[0]!)).toBe('treble')
  })
})
