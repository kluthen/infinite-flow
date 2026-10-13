/**
 * The ways a running session ends on its own, besides Stop, and the Idle layout hand-off around it.
 * From its start to its end, a session listens for the page becoming hidden, judges every window
 * change and every staff layout report with the session window rule against the layout it holds,
 * checks at every layout report that each phrase shown or waiting still fits that layout, and
 * takes the staff's reports from the Idle machinery, so nothing at Idle reacts to phrase 1 while it
 * runs: a failed engraving of phrase 1, or the staff failing to show the session, ends the session
 * instead of showing a notation error. At the end it gives the reports back and re-applies the
 * latest of them, so the Idle rules then decide in the layout the window gives afresh. The audio
 * interruption is the controller's.
 */
import type { NotationError } from '@/notation/notation-error'
import type { StaffLayout } from '@/notation/notation-layout-policy'
import type { StaffFixedParts, StaffLayoutInputs } from '@/notation/staff-fit-types'
import type { SessionBrowserPorts, WindowShapeReading } from '@/session/session-browser-ports'
import type { SessionEndCause } from '@/session/session-types'
import {
  isPortraitBelowDesktop,
  sessionLayoutAtStart,
  windowEndsSession,
} from '@/session/session-window'
import type { IdleLayoutPort, SessionStaffReports } from './idle-layout-gate'

/** What the watchers need: the ports, the session's held layout and how to end or fail it. */
// @spec-link [[service_session_end]]
export interface SessionEndWatchDependencies {
  readonly browser: SessionBrowserPorts
  readonly idleLayout: IdleLayoutPort
  readonly heldLayout: StaffLayout
  /** Phrase 1's staff fixed parts, measured once from the session's start. */
  readonly fixedParts: Promise<StaffFixedParts>
  /** Whether every phrase shown or waiting fits the held layout at these layout inputs. */
  readonly materialFits: (inputs: StaffLayoutInputs) => Promise<boolean>
  /** End the session for `cause`; a no-op once it has ended, so a second cause changes nothing. */
  readonly end: (cause: SessionEndCause) => void
  /** Surface a programming error: end the session if it still runs, then throw. */
  readonly fail: (error: unknown) => never
}

/** The watchers of one session. */
export interface SessionEndWatch {
  /**
   * Stop listening, give the staff's reports back to the Idle machinery and re-apply the latest
   * layout inputs, then the last engraving outcome held during the session, if any. Call once.
   */
  readonly stop: () => void
}

/** The last engraving outcome the staff reported while the session held its reports. */
type HeldOutcome =
  { readonly kind: 'engraved' } | { readonly kind: 'error'; readonly error: NotationError }

/**
 * Intent: whether the staff's inputs were measured for the layout the window's width selects now.
 * Right after a breakpoint crossing they were not: the staff re-measures on its next frame and
 * reports, and that report is judged instead.
 */
function inputsMatchWindow(inputs: StaffLayoutInputs, shape: WindowShapeReading): boolean {
  return inputs.viewport.layout === sessionLayoutAtStart(shape.widthPx, shape.remPx)
}

/**
 * Intent: whether the window, as it stands, ends the session. A portrait-shaped view below
 * bp-desktop ends it at once; the held layout's room is judged once phrase 1's fixed parts are
 * measured and the staff's inputs match the window, with the small viewport height, so a browser
 * toolbar showing or hiding changes nothing, and the shared system-position size the staff
 * reported with them.
 */
// @spec-link [[rule_session_ends_on_portrait_view]]
// @spec-link [[rule_session_ends_when_staff_too_small]]
// @spec-link [[rule_session_layout_fixed_at_start]]
function windowEndsNow(
  heldLayout: StaffLayout,
  shape: WindowShapeReading,
  inputs: StaffLayoutInputs | null,
  parts: StaffFixedParts | null,
): boolean {
  if (isPortraitBelowDesktop(shape)) return true
  if (parts === null) return false
  if (inputs === null) throw new Error('session end watch: the staff never reported its layout')
  if (!inputsMatchWindow(inputs, shape)) return false
  const ends = windowEndsSession({
    heldLayout,
    ...shape,
    containerWidthPx: inputs.containerWidthPx,
    leadingWidth: parts.leadingWidth,
    systemPadding: parts.systemPadding,
    heightBudgetPx: inputs.viewport.heightBudgetPx,
    ...(inputs.systemPositionUnits === undefined
      ? {}
      : { systemPositionUnits: inputs.systemPositionUnits }),
  })
  return ends !== null
}

/**
 * Intent: start watching one session's other ends: the page hidden ends it with `hidden-tab`; a
 * window change or a layout report the session window rule rejects, a layout report at which a
 * phrase shown or waiting no longer fits, any notation error of phrase 1's engraving and a session
 * staff failure end it with `staff-not-shown`. The staff's reports are held from the Idle
 * machinery until `stop`.
 */
// @spec-link [[rule_hidden_tab_ends_session]]
// @spec-link [[rule_session_ends_on_portrait_view]]
// @spec-link [[rule_session_ends_when_staff_too_small]]
// @spec-link [[rule_count_in_ending_returns_to_idle]]
// @spec-link [[service_session_end]]
export function watchSessionEnds(deps: SessionEndWatchDependencies): SessionEndWatch {
  const { browser, idleLayout } = deps
  let parts: StaffFixedParts | null = null
  let held: HeldOutcome | null = null
  let stopped = false

  /** Intent: judge the window as it stands now; a rejected one ends the session. */
  function judgeWindow(): boolean {
    if (stopped) return false
    const shape = browser.windowShape.read()
    try {
      if (!windowEndsNow(deps.heldLayout, shape, idleLayout.latestInputs(), parts)) return false
    } catch (error: unknown) {
      deps.fail(error)
    }
    deps.end('staff-not-shown')
    return true
  }

  /**
   * Intent: judge a staff layout report: the window first, then, when it ends nothing and the
   * inputs were measured for the window as it stands, whether every phrase shown or waiting still
   * fits the held layout at them; any misfit ends the session like Stop. A check failure is loud.
   */
  // @spec-link [[rule_session_ends_when_staff_too_small]]
  // @spec-link [[module_session_display_fit]]
  function judgeReport(inputs: StaffLayoutInputs): void {
    if (judgeWindow() || stopped) return
    if (!inputsMatchWindow(inputs, browser.windowShape.read())) return
    void deps.materialFits(inputs).then(
      (fits) => {
        if (!fits && !stopped) deps.end('staff-not-shown')
      },
      (error: unknown) => deps.fail(error),
    )
  }

  /** Intent: hold an engraving outcome of phrase 1; a failed one means the staff is not shown. */
  function holdOutcome(outcome: HeldOutcome): void {
    held = outcome
    if (outcome.kind === 'error') deps.end('staff-not-shown')
  }

  const diverted: SessionStaffReports = {
    layoutInputs: judgeReport,
    engraved: () => holdOutcome({ kind: 'engraved' }),
    notationError: (error) => holdOutcome({ kind: 'error', error }),
    sessionStaffFailed: () => deps.end('staff-not-shown'),
  }
  const stopHidden = browser.pageVisibility.onHidden(() => deps.end('hidden-tab'))
  const stopWindow = browser.windowShape.subscribe(() => {
    judgeWindow()
  })
  const release = idleLayout.divert(diverted)
  void deps.fixedParts.then(
    (measured) => {
      parts = measured
      judgeWindow()
    },
    (error: unknown) => deps.fail(error),
  )

  return {
    stop: () => {
      if (stopped) throw new Error('session end watch: stopped twice')
      stopped = true
      stopHidden()
      stopWindow()
      release()
      const inputs = idleLayout.latestInputs()
      if (inputs !== null) idleLayout.idle.layoutInputs(inputs)
      if (held?.kind === 'engraved') idleLayout.idle.engraved()
      else if (held?.kind === 'error') idleLayout.idle.notationError(held.error)
    },
  }
}
