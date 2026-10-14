/**
 * The workspace session a screen binds to: the Idle generation session, the staff's report
 * handlers, the session runner loader, the audio transport, the MIDI controller, the connection
 * sheet flag, the session browser ports, the session controller builder and the saved data the
 * workspace started from.
 * `composeWorkspaceSession` (`create-workspace-session.ts`) builds one and re-exports this type.
 */
import type { Ref, ShallowRef } from 'vue'

import type { GenerationSession } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import type { NotationError } from '@/notation/notation-error'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'
import type { SessionBrowserPorts } from '@/session/session-browser-ports'
import type { AudioTransport } from '@/audio/audio-transport'
import type { MidiController } from '@/midi/midi-controller'
import type { SavedDataLoad } from '@/storage-bootstrap'
import type { WorkspaceSessionRunnerStarter } from './workspace-session-dependencies'
import type { SessionController } from './workspace-session-controller-types'

export interface WorkspaceSession {
  readonly session: GenerationSession<WorkspaceSessionResult>
  readonly pendingPhrase: Ref<WrittenPhrase | null>
  readonly handleEngraved: () => void
  readonly handleNotationError: (error: NotationError) => void
  /**
   * Wire to `PhraseScore`'s `@session-staff-failed`: the staff failing to show a running session,
   * which ends it; it goes to the session alone, never to the Idle machinery.
   */
  // @spec-link [[module_session_staff_engraving_outcomes]]
  readonly handleSessionStaffFailed: (error: NotationError) => void
  /**
   * Wire to `PhraseScore`'s `@layout-inputs`: the staff's measured inputs, which the session's
   * pre-draw fit and room checks plan against. Until the staff reports once, every check fails as
   * a retryable notation error. While a practice session runs, this and the two engraving handlers
   * report to the session instead of the Idle machinery, which gets the latest back at its end.
   */
  // @spec-link [[module_idle_fit_round]]
  readonly handleLayoutInputs: (inputs: StaffLayoutInputs) => void
  /**
   * Load what starts a session runner bound to the same raw `generate` seam the Idle flow uses,
   * and so the app's one generation worker. Phrase 2 is generated during the one-measure count-in
   * (1 s at 240 BPM) and is on time only because phrase 1 already warmed the generator's
   * rhythm-domain memo, which lives once per worker; a cold phrase 2 takes about 0.95 s. The
   * runner's module is loaded on this call, as part of the session controller's chunk, so the
   * entry chunk stays within its size budget; it settles only once the replay-key announcer has
   * loaded too, and the returned starter is synchronous.
   */
  readonly loadSessionRunner: () => Promise<WorkspaceSessionRunnerStarter>
  /**
   * The app's one audio transport, locked until a player click. Chunk 15's Start and "Connect
   * controller" click handlers call `audio.unlock()` synchronously, and a session runner's `now`
   * reads `audio.now`, the audio clock.
   */
  // @spec-link [[req_session_audio_mix]]
  // @spec-link [[rule_audio_unlocked_by_player_click]]
  readonly audio: AudioTransport
  /**
   * The app's one MIDI controller reading, its notes placed on `audio`'s clock. MIDI access is
   * requested only by `midi.connect()`, which the header's `controller-status` click calls right
   * after `audio.unlock()` (see use-connection-sheet.ts).
   */
  // @spec-link [[req_midi_controller_input]]
  // @spec-link [[rule_controller_connects_between_sessions]]
  readonly midi: MidiController
  /**
   * Whether the connection sheet is open: false at first, kept equal to the shell's own flag by the
   * shell. Session controllers read it, so no MIDI note starts a session while the sheet is open.
   */
  // @spec-link [[rule_controller_connects_between_sessions]]
  readonly connectionSheetOpen: ShallowRef<boolean>
  /**
   * The browser capabilities a session uses around its run: the screen wake lock and the
   * landscape orientation lock (requested in the Start click, released at every end), the page
   * becoming hidden and the window's shape (both judged during a session). No screen uses them
   * yet; building the session asks for no lock and listens to nothing.
   */
  // @spec-link [[service_workspace_session_flow]]
  // @spec-link [[rule_screen_wake_lock_during_session]]
  readonly browser: SessionBrowserPorts
  /**
   * Build the controller of this workspace's practice sessions, over its Idle state, audio
   * transport, browser ports and runners, woken by the session clock's timer. The screen builds
   * one when it mounts and disposes of it when it unmounts; building it reads the window's shape.
   * The controller's module is loaded on this call, as its own chunk, so the entry chunk stays
   * within its size budget; the controller's `start` itself is synchronous, for the Start click.
   */
  // @spec-link [[service_workspace_session_flow]]
  // @spec-link [[rule_session_layout_fixed_at_start]]
  readonly createSessionController: () => Promise<SessionController>
  /**
   * The saved data the app loaded before its first draw, as it was given: the settings the
   * workspace started from, the load's outcome and the visit's save policy.
   */
  // @spec-link [[rule_first_phrase_waits_for_saved_settings]]
  readonly savedData: SavedDataLoad
  readonly dispose: () => void
}
