/**
 * A stand-in for `@/notation/vexflow-engraver-loader` for unit specs that `vi.mock` it with
 * `() => import('<this file>')`: its `loadVexflowEngraver` resolves to a module holding only the
 * font wait, the two planning functions the workspace's fit checks call and the fixed-parts
 * measurement a running session judges the window with, each a spy a test can program, so a check
 * runs with no VexFlow, no canvas and no fonts. By default every phrase fits, the staff always has
 * room, and the fixed parts measure 60 units of leading width and 60 of padding.
 */
import { vi } from 'vitest'

import type { VexflowEngraverModule } from '@/notation/vexflow-engraver-loader'
import type { StaffFitVerdict, StaffFixedParts, StaffRoomVerdict } from '@/notation/staff-fit-types'

/** The part of the engraver module the fit checks use. */
export type FakeEngraverModule = Pick<
  VexflowEngraverModule,
  'ensureNotationFonts' | 'planWrittenPhraseFit' | 'planStaffRoomForKey' | 'measureStaffFixedParts'
>

const FITS: StaffFitVerdict = { kind: 'fits' }
const ROOM: StaffRoomVerdict = { kind: 'room' }
const FIXED_PARTS: StaffFixedParts = { leadingWidth: 60, systemPadding: 60 }

export const fakeEngraver = {
  ensureNotationFonts: vi.fn<VexflowEngraverModule['ensureNotationFonts']>(),
  planWrittenPhraseFit: vi.fn<VexflowEngraverModule['planWrittenPhraseFit']>(),
  planStaffRoomForKey: vi.fn<VexflowEngraverModule['planStaffRoomForKey']>(),
  measureStaffFixedParts: vi.fn<VexflowEngraverModule['measureStaffFixedParts']>(),
} satisfies FakeEngraverModule

export const loadVexflowEngraver = vi.fn<() => Promise<FakeEngraverModule>>()

/** Intent: put every spy back to its default answer (fonts ready, fits, room, 60/60) with no calls. */
export function resetFakeEngraver(): void {
  fakeEngraver.ensureNotationFonts.mockReset().mockResolvedValue(undefined)
  fakeEngraver.planWrittenPhraseFit.mockReset().mockReturnValue(FITS)
  fakeEngraver.planStaffRoomForKey.mockReset().mockReturnValue(ROOM)
  fakeEngraver.measureStaffFixedParts.mockReset().mockReturnValue(FIXED_PARTS)
  loadVexflowEngraver.mockReset().mockResolvedValue(fakeEngraver)
}

resetFakeEngraver()
