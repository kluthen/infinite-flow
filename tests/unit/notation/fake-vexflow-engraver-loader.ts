/**
 * A stand-in for `@/notation/vexflow-engraver-loader` for unit specs that `vi.mock` it with
 * `() => import('<this file>')`: its `loadVexflowEngraver` resolves to a module holding only the
 * font wait and the two planning functions the workspace's fit checks call, each a spy a test can
 * program, so a fit check runs with no VexFlow, no canvas and no fonts. By default every phrase
 * fits and the staff always has room.
 */
import { vi } from 'vitest'

import type { VexflowEngraverModule } from '@/notation/vexflow-engraver-loader'
import type { StaffFitVerdict, StaffRoomVerdict } from '@/notation/staff-fit-types'

/** The part of the engraver module the fit checks use. */
export type FakeEngraverModule = Pick<
  VexflowEngraverModule,
  'ensureNotationFonts' | 'planWrittenPhraseFit' | 'planStaffRoomForKey'
>

const FITS: StaffFitVerdict = { kind: 'fits' }
const ROOM: StaffRoomVerdict = { kind: 'room' }

export const fakeEngraver = {
  ensureNotationFonts: vi.fn<VexflowEngraverModule['ensureNotationFonts']>(),
  planWrittenPhraseFit: vi.fn<VexflowEngraverModule['planWrittenPhraseFit']>(),
  planStaffRoomForKey: vi.fn<VexflowEngraverModule['planStaffRoomForKey']>(),
} satisfies FakeEngraverModule

export const loadVexflowEngraver = vi.fn<() => Promise<FakeEngraverModule>>()

/** Intent: put every spy back to its default answer (fonts ready, fits, room) with no calls. */
export function resetFakeEngraver(): void {
  fakeEngraver.ensureNotationFonts.mockReset().mockResolvedValue(undefined)
  fakeEngraver.planWrittenPhraseFit.mockReset().mockReturnValue(FITS)
  fakeEngraver.planStaffRoomForKey.mockReset().mockReturnValue(ROOM)
  loadVexflowEngraver.mockReset().mockResolvedValue(fakeEngraver)
}

resetFakeEngraver()
