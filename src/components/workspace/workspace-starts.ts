/**
 * The phrase workspace's starts from the screen, which the shell (./WorkspaceShell.vue) wires: the
 * Start click, Jam mode's starting note, what precedes a start inside its click, and the start's
 * one instant jump (./session-start-jump.ts) for the layout the session holds; and `Stop`, which
 * ends the running session.
 */
import { jumpForSessionStart, startStaffViewport, type SessionJumpView } from './session-start-jump'
import type { SessionController } from './workspace-session-controller-types'

/** What the starts reach of the workspace. */
export interface WorkspaceStartsOptions {
  /** The loaded session controller; a start before it loads is a defect. */
  readonly controller: () => SessionController
  /** The mounted workspace (the app's layout root). */
  readonly root: () => HTMLElement | null
  /** How the start's jump scrolls and measures the window. */
  readonly jumpView: () => SessionJumpView
  /** Close the volume popover, as a start does. */
  readonly closeVolumePopover: () => void
  /** Settle the last end's landing: no late notice takes focus. */
  readonly clearLateRoomNotice: () => void
  /** True while Jam mode shows. */
  readonly jamShowing: () => boolean
  /** True while Jam mode keeps a doodle, whose phrase 1 its staff shows. */
  readonly doodleKept: () => boolean
  /** Start the Jam `Start Jam` starts: on the kept doodle, else a fresh one. */
  readonly startJam: () => void
}

/** The workspace's starts, and its `Stop`. */
export interface WorkspaceStarts {
  readonly prepareStart: () => void
  readonly startSession: () => void
  readonly jumpAfterStart: () => void
  readonly startByJamNote: () => void
  readonly stopSession: () => void
}

/** The workspace's starts, and its `Stop`, over what they reach. */
export function createWorkspaceStarts(options: WorkspaceStartsOptions): WorkspaceStarts {
  /** What precedes a start inside its click: the volume popover closed, a late landing cleared. */
  function prepareStart(): void {
    options.closeVolumePopover()
    options.clearLateRoomNotice()
  }

  /**
   * The start's one instant jump, for the layout the session just started holds, to the
   * staff in sight at the start: session mode's, or in Jam mode Jam's own (its empty staff, or
   * with a doodle kept the staff showing its phrase 1).
   */
  function jumpAfterStart(): void {
    const layout = options.controller().state.heldLayout
    if (layout === null) throw new Error('workspace shell: a started session holds no staff layout')
    const root = options.root()
    if (root === null) throw new Error('workspace shell: the workspace is not mounted')
    const jamStaff = options.doodleKept() ? 'jam-kept-doodle' : 'jam-empty'
    const staffViewport = startStaffViewport(root, options.jamShowing() ? jamStaff : 'session')
    const cueRow = root.querySelector('.session-cue-row')
    if (cueRow === null) throw new Error('workspace shell: .session-cue-row is not mounted')
    jumpForSessionStart(options.jumpView(), { workspace: root, cueRow, staffViewport }, layout)
  }

  /**
   * The Start click, synchronously: close the volume popover, start the session (which
   * unlocks the audio and asks for the screen locks inside this click), then make the start's
   * one instant jump for the layout the session holds. Focus stays on the session action. With a
   * stale phrase 1 nothing starts: the controller opens the stale-phrase prompt instead.
   */
  // @spec-link [[rule_session_start_conditions]]
  // @spec-link [[req_landscape_phrase_workspace]]
  function startSession(): void {
    prepareStart()
    if (options.jamShowing()) {
      options.startJam()
      jumpAfterStart()
    } else if (options.controller().start() === 'started') jumpAfterStart()
  }

  /**
   * Jam mode's starting note, played while a Jam could start (the home note, or the kept
   * doodle's phrase 1's first note): the start `Start Jam` takes, its one instant jump included
   * (ux D452); focus stays where it is.
   */
  // @spec-link [[module_workspace_mode]]
  function startByJamNote(): void {
    prepareStart()
    options.startJam()
    jumpAfterStart()
  }

  /** `Stop`, from the header or the phone's compact one. */
  // @spec-link [[rule_stop_ends_session]]
  function stopSession(): void {
    options.controller().stop()
  }

  return { prepareStart, startSession, jumpAfterStart, startByJamNote, stopSession }
}
