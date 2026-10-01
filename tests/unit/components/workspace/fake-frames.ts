/**
 * Fakes for the session display's seams: a frame port the test steps by hand instead of the
 * browser's animation frames, and a staff planner whose verdicts the test chooses, logging every
 * phrase it was asked to plan.
 */
import type {
  FramePort,
  StaffFitPlanner,
} from '@/components/workspace/workspace-session-controller-types'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import type { StaffViewport } from '@/notation/notation-layout-policy'
import type { StaffFitVerdict } from '@/notation/staff-fit-types'

/** A frame port stepped by hand. */
export interface FakeFrames {
  readonly port: FramePort
  /** How many frame callbacks wait for the next frame. */
  readonly pending: () => number
  /** Run the next frame: every callback requested before it, once. */
  readonly run: () => void
  /** How many requested frames were cancelled. */
  readonly cancelled: () => number
}

/** Intent: a frame port whose frames run only when the test calls `run`. */
export function createFakeFrames(): FakeFrames {
  const waiting = new Map<number, () => void>()
  let nextHandle = 1
  let cancelled = 0
  return {
    port: {
      request: (callback) => {
        const handle = nextHandle++
        waiting.set(handle, callback)
        return handle
      },
      cancel: (handle) => {
        if (waiting.delete(handle)) cancelled += 1
      },
    },
    pending: () => waiting.size,
    run: () => {
      const due = [...waiting]
      waiting.clear()
      for (const [, callback] of due) callback()
    },
    cancelled: () => cancelled,
  }
}

/** One fit the planner was asked about. */
export interface PlannedFit {
  readonly phrase: WrittenPhrase
  readonly containerWidthPx: number
  readonly viewport: StaffViewport
}

/** A staff planner answering what the test decides, by phrase. */
export interface FakePlanner {
  /** The loader the display takes: resolves with the planner. */
  readonly load: () => Promise<StaffFitPlanner>
  /** Every fit planned, in order. */
  readonly plans: PlannedFit[]
  /** Answer every later plan with `verdict(phrase)`; every phrase fits by default. */
  readonly answer: (verdict: (phrase: WrittenPhrase) => StaffFitVerdict) => void
  /** Answer the next plans with these verdicts, in order, then as `answer` says. */
  readonly queue: (...verdicts: StaffFitVerdict[]) => void
}

/** Intent: a planner where every phrase fits until the test says otherwise. */
export function createFakePlanner(): FakePlanner {
  const plans: PlannedFit[] = []
  const queued: StaffFitVerdict[] = []
  let verdictOf: (phrase: WrittenPhrase) => StaffFitVerdict = () => ({ kind: 'fits' })
  const planner: StaffFitPlanner = (phrase, containerWidthPx, viewport) => {
    plans.push({ phrase, containerWidthPx, viewport })
    return queued.shift() ?? verdictOf(phrase)
  }
  return {
    load: () => Promise.resolve(planner),
    plans,
    answer: (verdict) => {
      verdictOf = verdict
    },
    queue: (...verdicts) => {
      queued.push(...verdicts)
    },
  }
}
