/**
 * A closed session history played with my instrument, for the Review's specs: the recorded
 * session's phrases with my instrument's profile carried as data in each phrase's intent, as a
 * generation intent carries it; no built-in profile has its id, so a lookup by id throws.
 */
import { makeMyInstrument, myInstrumentDraftFromTemplate } from '@/domain/profile/my-instrument'
import type { SessionHistory } from '@/session/session-history'
import { recordedRecords } from '../review/review-fixtures'
import { fakeReviewHistory } from './fake-session-controller'

/** Intent: the recorded session as if played with my instrument named `name`. */
export function myInstrumentHistory(name = 'My tenor'): SessionHistory {
  const draft = myInstrumentDraftFromTemplate('bb-tenor')
  const profile = makeMyInstrument({ ...draft, name, clef: 'treble' }).profile
  const records = recordedRecords().map((record) => ({
    ...record,
    intent: { ...record.intent, instrumentProfile: profile },
  }))
  return fakeReviewHistory(records, 'my-instrument')
}
