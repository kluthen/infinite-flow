/**
 * The words naming the kept sessions of my instrument that a change erases or a deletion takes
 * with it, singular and plural, verbatim from screens/my-instrument/handoff.md and
 * screens/controller-connection/handoff.md (States).
 */
import { describe, expect, it } from 'vitest'

import {
  checkEraseText,
  checkKeepSessionHint,
  deleteConfirmationText,
  eraseWarningText,
  keepSessionHint,
} from '@/components/workspace/my-instrument-sessions-copy'

// @test-link [[entity_my_instrument_record]]
describe("the words for my instrument's sessions", () => {
  it('the erase warning, for one session reviewed on screen and for several', () => {
    expect(eraseWarningText(1, true)).toBe(
      'Changing the range or the transposition erases the session played with this instrument, with its favorite phrases, comment and played notes. It is the session reviewed on screen, so its review closes.',
    )
    expect(eraseWarningText(2, false)).toBe(
      'Changing the range or the transposition erases the 2 sessions played with this instrument, with their favorite phrases, comments and played notes.',
    )
    expect(keepSessionHint(1)).toBe('To keep it, cancel, then export it from its review first.')
  })

  it('the delete confirmation, with no session, one, and my instrument not selected', () => {
    expect(deleteConfirmationText('Mine', 0, false, null)).toBe(
      'Mine will be deleted, with its clef, range and transposition.',
    )
    expect(deleteConfirmationText('Mine', 1, true, 'C MIDI keyboard')).toBe(
      'Mine will be deleted, with its clef, range and transposition. The session played with it goes too, with its favorite phrases, comment and played notes. It is the session reviewed on screen, so its review closes. The instrument goes back to C MIDI keyboard, the profile it was made from.',
    )
  })

  it("the check's Use and erase, for one session and for several", () => {
    expect(checkEraseText(1, false)).toBe(
      'Changing the transposition erases the session played with my instrument, with its favorite phrases, comment and played notes.',
    )
    expect(checkEraseText(4, true)).toBe(
      'Changing the transposition erases the 4 sessions played with my instrument, with their favorite phrases, comments and played notes. The session reviewed on screen is one of them, so its review closes.',
    )
    expect(checkKeepSessionHint(1)).toBe(
      'To keep it, choose Back, close this sheet, then export it from its review.',
    )
  })
})
