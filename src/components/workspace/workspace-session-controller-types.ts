/**
 * The session controller's contract with the screen that binds to it and with the workspace that
 * builds it: the reactive state it exposes, its actions, and the error it throws at a caller that
 * breaks the contract. The seams it is built from live in `workspace-session-controller-seams.ts`
 * and are re-exported here; the controller itself is `workspace-session-controller.ts`.
 */
import type { ExpectedNoteIdentity } from '@/domain/acknowledgement/expected-note'
import type { CountInDisplay } from '@/session/count-in-display'
import type { ExportableHistory } from '@/export/export-file'
import type { SessionHistory } from '@/session/session-history'
import type { SessionTransportEvent } from '@/session/session-runner'
import type { SessionStartBlocker } from '@/session/session-start-conditions'
import type { StartingNote } from '@/session/starting-note'
import type { SessionEndCause, SessionSettings } from '@/session/session-types'
import type { StaffLayout } from '@/notation/notation-layout-policy'
import type { SessionStaff } from '@/components/notation/session-staff'
import type { KeptSessionRow } from './use-kept-sessions'
import type { ControllerLostCountdown } from './workspace-session-midi'

export type { KeptSessionsSeam } from './workspace-kept-sessions-seam'
export type {
  FramePort,
  SessionControllerClock,
  SessionControllerDependencies,
  StaffFitPlanner,
} from './workspace-session-controller-seams'

/** Where the session stands: no session, its count-in, or its phrases sounding. */
// @spec-link [[service_session_controller]]
export type SessionControllerPhase = 'idle' | 'count-in' | 'running'

/** A transport event without its time, which the controller raises to the engine's time floor. */
// @spec-link [[service_session_controller]]
export type UntimedEvent<E = SessionTransportEvent> = E extends unknown ? Omit<E, 'at'> : never

/** The count-in row while the count-in runs: one state per beat. */
// @spec-link [[rule_count_in_shown_on_screen]]
export type RunningCountIn = Extract<CountInDisplay, { over: false }>

/** How the last session ended: why, in which phase, and how many phrases had started sounding. */
// @spec-link [[rule_stop_ends_session]]
export interface SessionEndSummary {
  readonly cause: SessionEndCause
  readonly phase: 'count-in' | 'running'
  readonly soundedPhraseCount: number
}

/**
 * What a Review draws a session from, read from the session's own data: its phrases in the order
 * they started sounding, how many, and its start (epoch milliseconds). The session that just ended
 * gives its closed history; a kept session read back from the device gives its decoded phrases.
 */
// @spec-link [[req_last_session_review]]
// @spec-link [[req_kept_session_review]]
export interface ReviewedHistory extends ExportableHistory {
  readonly phraseCount: number
}

/**
 * How a reviewed session is kept on the device: pinned; not pinned, so deleted when the next
 * session is saved; or not saved (its save failed, or saving is off), held in memory only.
 */
// @spec-link [[module_kept_session_save]]
export type SessionKeeping = 'pinned' | 'not-pinned' | 'not-saved'

/**
 * A session as a Review draws it: its history, its instrument's name as the session holds it (never
 * looked up by id), the tempo it reached (its last sounded phrase's), how it is kept, the key it is
 * kept under and whether its played notes are kept. Frozen; each change replaces it.
 */
// @spec-link [[req_last_session_review]]
// @spec-link [[req_kept_session_review]]
// @spec-link [[module_kept_session_save]]
export interface ReviewedSession {
  readonly history: ReviewedHistory
  readonly instrumentName: string
  /** The last sounded phrase's tempo, in BPM: the highest the session reached. */
  readonly tempoReached: number
  readonly keeping: SessionKeeping
  /**
   * The key the session is kept under: the one its own save minted, or the one it was read by;
   * every change after its save names it by this key, never by one rebuilt from its facts.
   */
  readonly key: string
  /** Its played notes are kept with it on the device (and are in its history). */
  readonly playedNotesKept: boolean
  /**
   * It is pinned: kept until the player unpins or deletes it. Held apart from `keeping`, which says
   * "not saved" for a session held in memory only, whose pin still shows and is saved by a retry.
   */
  readonly pinned: boolean
  /** The numbers of its favorite phrases, in increasing order. */
  readonly favorites: readonly number[]
  /** Its comment, trimmed, at most 500 characters; empty when it has none. */
  readonly comment: string
}

/**
 * What became of turning `Keep my played notes`: nothing more to do, or, turned off while played
 * notes are kept with `sessionCount` sessions as read at the switch, the deletion to confirm.
 */
// @spec-link [[module_kept_session_save]]
export type KeepPlayedNotesSwitch =
  { readonly kind: 'done' } | { readonly kind: 'confirm-deletion'; readonly sessionCount: number }

/**
 * What became of a deletion of played notes: deleted (also when there was nothing left to
 * delete), refused by the device (nothing changed), or not made because saving turned off.
 */
// @spec-link [[module_kept_session_save]]
export type PlayedNotesDeletion = 'deleted' | 'refused' | 'saving-off'

/**
 * What became of `Delete session`: deleted, from the device and from memory (also when it was
 * held in memory only, or was gone already); refused by the device, nothing changed; or not made
 * because saving turned off.
 */
// @spec-link [[module_kept_session_save]]
export type SessionDeletion = 'deleted' | 'refused' | 'saving-off'

/**
 * What became of opening a session's Review, from `Review last session` or a list row: shown;
 * failed, its read not giving the session (its row says so); or superseded by a later opening,
 * the mode left or a session started meanwhile, so nothing shows.
 */
// @spec-link [[req_kept_session_review]]
export type SessionOpening = 'shown' | 'failed' | 'superseded'

/**
 * The Review: the session it draws and whether the player is in it. It exists from a session end
 * once phrase 1 has sounded, or from `Review last session`, until the next session starts; each
 * change replaces the frozen object, never mutates it.
 */
// @spec-link [[req_last_session_review]]
// @spec-link [[rule_new_session_discards_review]]
export interface SessionReview extends ReviewedSession {
  /** The Review shows, in place of the staff; false once closed, while it is kept. */
  readonly showing: boolean
}

/**
 * The most recent session: held in memory (the last session of the visit that ended with a review,
 * saved or not, or a kept one once read back), or kept on the device and not read yet (after a
 * reload: the readable kept session with the latest start, under its key).
 */
// @spec-link [[module_kept_session_save]]
// @spec-link [[rule_most_recent_session_kept]]
export type MostRecentSession =
  | { readonly kind: 'held'; readonly session: ReviewedSession }
  | { readonly kind: 'kept'; readonly key: string }

/** What the screen reads from the controller; every field is reactive. */
// @spec-link [[service_session_controller]]
// @spec-link [[rule_session_start_conditions]]
// @spec-link [[rule_midi_starting_note]]
export interface SessionControllerState {
  readonly phase: SessionControllerPhase
  /** The count-in row while the count-in runs, on the audio clock; null outside it. */
  readonly countIn: RunningCountIn | null
  readonly strugglingNotice: boolean
  /**
   * The exact tempo in effect in the running session, in BPM: the starting tempo until a phrase
   * at another tempo starts sounding, then that phrase's; null with no session.
   */
  readonly sessionTempo: number | null
  /** The staff layout the running session holds, chosen at its start; null with no session. */
  readonly heldLayout: StaffLayout | null
  readonly canStart: boolean
  /** The first start condition that does not hold, or null when Start may be clicked. */
  readonly startBlocker: SessionStartBlocker | null
  readonly lastEnd: SessionEndSummary | null
  /** The closed history of the last session that ended. */
  readonly lastHistory: SessionHistory | null
  /** The Review, showing or kept until the next start; null when none exists. */
  readonly review: SessionReview | null
  /**
   * The most recent session, which `Review last session` opens; a start leaves it in place, and
   * only the next session that ends with a review replaces it. Null when there is none.
   */
  // @spec-link [[module_kept_session_save]]
  // @spec-link [[rule_most_recent_session_kept]]
  readonly mostRecent: MostRecentSession | null
  /** The most recent session is being read from the device for `Review last session`. */
  // @spec-link [[req_kept_session_review]]
  readonly readingMostRecent: boolean
  /**
   * The kept sessions' rows, newest first, from the summaries the load read and kept current by
   * every save, change and deletion of the visit (use-kept-sessions.ts).
   */
  // @spec-link [[req_kept_session_review]]
  readonly keptRows: readonly KeptSessionRow[]
  /** The session list shows, in the review mode's place of a Review. */
  readonly listShowing: boolean
  /** The kept sessions could not be read in this visit (it started from the defaults). */
  readonly keptSessionsUnreadable: boolean
  /** The key of the kept session a row's opening is reading; null with none pending. */
  // @spec-link [[req_kept_session_review]]
  readonly openingKey: string | null
  /** `Keep my played notes`: from the player's saved choice, changed by `setKeepPlayedNotes`. */
  readonly keepPlayedNotes: boolean
  /**
   * Saving is off for the visit now (an outdated tab, or a visit started from the defaults): no
   * deletion is offered, and a change holds for the visit only.
   */
  readonly savingOff: boolean
  /**
   * What the staff shows while a session runs, from its start (phrase 1, the very phrase Idle
   * shows, in the held layout) to its end; null with no session, so the staff shows Idle.
   */
  readonly sessionStaff: SessionStaff | null
  /** The highest phrase number the running session has readied (1 until phrase 2); null with none. */
  readonly latestReady: number | null
  /**
   * The note that would start a session if played now: non-null exactly at Idle when Start may be
   * clicked, the MIDI controller is connected, the connection sheet is closed and the staff shows
   * Idle's phrase. The start line and the start marker are drawn from it.
   */
  readonly startingNote: StartingNote | null
  /**
   * Whether the named starting note waits for the page's first click, tap or key press (after a
   * load, the audio still locked): it starts nothing until then, and the start line says so.
   */
  // @spec-link [[rule_midi_starting_note]]
  readonly startingNoteAwaitsClick: boolean
  /** A lost controller's countdown while it runs, count-in included; null otherwise. */
  readonly controllerLost: ControllerLostCountdown | null
  /** The running session's acknowledged notes, in acknowledgement order; empty at Idle. */
  readonly acknowledged: readonly ExpectedNoteIdentity[]
  /** Whether the running session reads a controller (fixed at its start); null at Idle. */
  readonly sessionHasController: boolean | null
  /**
   * The page's adaptive-tempo flag: off at page load, kept from one session to the next, held in
   * memory only. A session runs adaptive tempo when it is on and the session has a controller at
   * its start.
   */
  readonly adaptiveTempo: boolean
  /** Whether adaptive tempo may be turned on: exactly while a controller is attached. */
  readonly adaptiveTempoAvailable: boolean
  /**
   * The tempo the last session that ran adaptive tempo reached (its last sounded phrase's), in
   * BPM, held in memory only: set by an end once phrase 1 has sounded of a session that ran it,
   * null after such an end of one that did not and before any; a start and an end during the
   * count-in leave it as it is.
   */
  readonly lastSessionReachedTempo: number | null
  /**
   * The page's `Vary settings` flag: off at page load, kept from one session to the next, held in
   * memory only. A session started with it on runs the engine's settings mutations.
   */
  readonly varySettings: boolean
  /**
   * The page's `Tension across phrases` flag: off at page load, kept from one session to the
   * next, held in memory only. A session started with it on runs the engine's multi-phrase tension
   * arc; the steps it gives the phrases never reach `shownSettings`.
   */
  readonly tensionAcrossPhrases: boolean
  /**
   * What the read-only controls show while a session runs: its start settings during the
   * count-in, then the settings the phrase now sounding was generated with; null with no session,
   * when the controls show the player's own choices, which a session never writes.
   */
  readonly shownSettings: SessionSettings | null
}

/** The session controller a screen binds to. */
// @spec-link [[service_session_controller]]
export interface SessionController {
  readonly state: SessionControllerState
  /**
   * Start a session; call it synchronously inside the player's Start click. Throws when blocked.
   * Playing the starting note takes this same path.
   */
  readonly start: () => void
  /**
   * End the running session (the player's Stop). Throws with no session running. A session also
   * ends on its own, like Stop: the page hidden, the staff no longer shown (the window, the
   * engraving of phrase 1, a phrase shown or waiting that no longer fits, or the session staff
   * failing), or the audio interrupted.
   */
  readonly stop: () => void
  /**
   * Whether any part of phrase `phraseNumber` is on the staff now; false with no session. Throws
   * on a phrase number that is not a positive integer.
   */
  readonly isPhraseOnScreen: (phraseNumber: number) => boolean
  /**
   * Leave the review mode (`Close review`) from either level: the Review kept without showing, the
   * list gone, a pending opening cancelled. Throws unless the Review or the list shows.
   */
  readonly closeReview: () => void
  /**
   * Show the most recent session's Review (`Review last session`): at once when it is held in
   * memory, after reading it from the device when it is kept. Resolves what became of it; a read
   * that does not give it shows the list instead, its row marked as failed to open. Throws unless a most recent session
   * exists, neither the Review nor the list shows, no session runs and no read is under way.
   */
  readonly showReview: () => Promise<SessionOpening>
  /**
   * Open the kept session under `key` from its row: at once when it is held in memory, else read
   * by its key (`openingKey`), the latest opening winning and `closeReview` cancelling it; once
   * read, held in memory and shown in the list's place. Throws during a session or when no row
   * this version can open has that key.
   */
  readonly openSession: (key: string) => Promise<SessionOpening>
  /**
   * Show the session list, from idle or in a Review's place (the Review kept). Throws during a
   * session or when the list already shows.
   */
  readonly showList: () => void
  /**
   * Turn `Keep my played notes` on or off, at Idle only (else throws); the caller saves the
   * setting. Turned on, it also keeps the played notes of the most recent session when they are
   * still in memory and the session is kept. Turned off, it resolves the deletion to confirm when
   * played notes are kept with some session, read at the switch. While saving is off it changes
   * for the visit only: nothing is read, written or asked.
   */
  readonly setKeepPlayedNotes: (on: boolean) => Promise<KeepPlayedNotesSwitch>
  /**
   * Delete the played notes of the session the Review shows, from memory too once the device has.
   * Throws unless at Idle, saving on and the Review's session kept with its played notes.
   */
  readonly deletePlayedNotes: () => Promise<PlayedNotesDeletion>
  /**
   * Delete every kept played note, across sessions, and from memory those of a session that kept
   * them, once the device has. Throws unless at Idle with saving on.
   */
  readonly deleteEveryKeptPlayedNote: () => Promise<PlayedNotesDeletion>
  /**
   * Mark phrase `phraseNumber` of the session held under `key` a favorite, or remove the mark, at
   * once in memory; marking pins the session, removing the last leaves it pinned. Then saved when
   * made (a retry of its own save while that save had failed; nothing while saving is off).
   * Resolves once saved or refused. Throws unless at Idle with that session held and that phrase
   * in it.
   */
  readonly setFavorite: (key: string, phraseNumber: number, favorite: boolean) => Promise<void>
  /**
   * Pin or unpin the session under `key`, as `setFavorite` saves a change: held in memory, or any
   * kept session with a row this version reads, changed through its row without reading its body.
   * Throws during a session, or for a key neither held nor with such a row.
   */
  readonly setPinned: (key: string, pinned: boolean) => Promise<void>
  /**
   * Set the comment of the session held under `key`, trimmed (empty: none), as `setFavorite`
   * saves a change; an unchanged comment saves nothing. Throws on one over 500 characters.
   */
  readonly setComment: (key: string, comment: string) => Promise<void>
  /**
   * Delete the session under `key`: from the device, then from memory (its row, the Review, which
   * the list replaces when it showed, and, when it is the most recent session, that too, leaving
   * none); one held in memory only because
   * its save failed, from memory alone; one not held, through its row, without reading its body.
   * Throws unless at Idle with saving on and that session held or with a row this version reads.
   */
  readonly deleteSession: (key: string) => Promise<SessionDeletion>
  /**
   * Turn the page's adaptive-tempo flag on or off, at Idle only: throws during the count-in or a
   * running session, and when turning it on with no controller attached.
   */
  readonly setAdaptiveTempo: (on: boolean) => void
  /**
   * Turn the page's `Vary settings` flag on or off, at Idle or while the Review shows only:
   * throws during the count-in or a running session.
   */
  readonly setVarySettings: (on: boolean) => void
  /**
   * Turn the page's `Tension across phrases` flag on or off, at Idle or while the Review shows
   * only: throws during the count-in or a running session.
   */
  readonly setTensionAcrossPhrases: (on: boolean) => void
  /**
   * End a running session, stop reading the window and listening to the MIDI controller, and
   * dispose of the wake-up timer (its worker). Throws if called twice.
   */
  readonly dispose: () => void
}

/**
 * A caller broke the controller's contract: a start while blocked, a Stop with no session, a
 * Review closed or shown out of turn, adaptive tempo changed during a session or turned on with
 * no controller attached, `Vary settings` changed during a session.
 */
// @spec-link [[service_session_controller]]
export class SessionControllerError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SessionControllerError'
  }
}
