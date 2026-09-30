/**
 * Fakes for the staff-fit seams the workspace session takes: the fit check of a generated phrase,
 * the phrase-independent room check, and the staff's layout-input reports. Each verdict is whatever
 * the test queues or sets, and a layout report reaches the session only when the test makes it, so
 * the Idle fit run is tested without an engraver, a DOM or a window.
 */
import type {
  StaffFitVerdict,
  StaffKeySignature,
  StaffLayoutInputs,
  StaffRoomVerdict,
} from '@/notation/staff-fit-types'

export const FITS: StaffFitVerdict = { kind: 'fits' }
export const TOO_WIDE: StaffFitVerdict = { kind: 'notes_too_wide' }
export const FIT_NO_ROOM: StaffFitVerdict = { kind: 'no_room', cause: 'too_narrow' }
export const ROOM: StaffRoomVerdict = { kind: 'room' }
export const NO_ROOM: StaffRoomVerdict = { kind: 'no_room', cause: 'too_narrow' }

export interface FakeStaffFit<TResult> {
  readonly checkFit: (result: TResult) => Promise<StaffFitVerdict>
  readonly checkRoom: (signature: StaffKeySignature) => Promise<StaffRoomVerdict>
  readonly staffLayout: {
    readonly subscribe: (listener: (inputs: StaffLayoutInputs) => void) => () => void
  }
  /** Queue the verdicts the next fit checks return, in order; past the queue, `fallbackFit` answers. */
  readonly queueFit: (...verdicts: StaffFitVerdict[]) => void
  readonly setFallbackFit: (verdict: StaffFitVerdict) => void
  readonly setRoom: (verdict: StaffRoomVerdict) => void
  /** Report the staff's layout inputs at this container width, as PhraseScore does on a resize. */
  readonly report: (containerWidthPx: number) => void
  /** Every result the fit check was asked about, in order. */
  readonly fitChecks: TResult[]
  /** Every key signature the room check was asked about, in order. */
  readonly roomChecks: StaffKeySignature[]
}

/** Intent: build fake staff-fit seams where every phrase fits and the staff has room by default. */
export function createFakeStaffFit<TResult>(): FakeStaffFit<TResult> {
  const queue: StaffFitVerdict[] = []
  let fallbackFit: StaffFitVerdict = FITS
  let room: StaffRoomVerdict = ROOM
  const listeners = new Set<(inputs: StaffLayoutInputs) => void>()
  const fitChecks: TResult[] = []
  const roomChecks: StaffKeySignature[] = []
  return {
    checkFit: async (result) => {
      fitChecks.push(result)
      return queue.shift() ?? fallbackFit
    },
    checkRoom: async (signature) => {
      roomChecks.push(signature)
      return room
    },
    staffLayout: {
      subscribe: (listener) => {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
    },
    queueFit: (...verdicts) => {
      queue.push(...verdicts)
    },
    setFallbackFit: (verdict) => {
      fallbackFit = verdict
    },
    setRoom: (verdict) => {
      room = verdict
    },
    report: (containerWidthPx) => {
      const inputs: StaffLayoutInputs = { containerWidthPx, viewport: { layout: 'one-system' } }
      for (const listener of [...listeners]) listener(inputs)
    },
    fitChecks,
    roomChecks,
  }
}

/**
 * Intent: the staff-fit options for a session test that is not about fitting: every phrase fits,
 * the staff always has room, no layout report ever arrives, and dropping the presented phrase does
 * nothing. Spread first so a test's own `clearPresentedPhrase` still wins.
 */
export function alwaysFitsStaff<TResult>() {
  const fake = createFakeStaffFit<TResult>()
  return {
    checkFit: fake.checkFit,
    checkRoom: fake.checkRoom,
    staffLayout: fake.staffLayout,
    clearPresentedPhrase: () => undefined,
  }
}
