/**
 * Lazy-loading boundary for the phrase replay key announcements (./phrase-replay-announcement.ts
 * and the key encoder it uses), kept out of the entry chunk: nothing else may import them
 * statically. The module starts loading as the workspace is composed, long before a phrase can be
 * accepted (a generation is a worker round trip); once loaded, every announcement is made
 * synchronously, exactly where it was before. An Idle phrase accepted before it has loaded is
 * announced as soon as it loads, in acceptance order. A session controller awaits `loaded` before
 * its first runner, so a session phrase is always announced before its output is forwarded.
 */
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import type { SessionOutput } from '@/session/session-types'

/** The loaded announcement module. */
export type PhraseReplayAnnouncementModule = typeof import('./phrase-replay-announcement')

/** The workspace's announcements of accepted phrases' replay keys. */
// @spec-link [[module_phrase_replay_key]]
export interface PhraseReplayAnnouncer {
  /** Announce an accepted Idle phrase (a workspace phrase). */
  readonly announceWorkspacePhrase: (intent: GenerationIntent) => void
  /** Wrap a runner's output sink; throws before `loaded` has settled. */
  readonly announcingSessionOutputs: (
    onOutput: (output: SessionOutput) => void,
  ) => (output: SessionOutput) => void
  /** Settles once the module has loaded; rejects when it fails to load. */
  readonly loaded: Promise<void>
}

/**
 * Intent: start loading the announcement module now (through `load`, the dynamic import by
 * default), and announce through it to `log`. A load failure is not caught: it rejects `loaded`
 * and every Idle announcement waiting on it.
 */
// @spec-link [[module_phrase_replay_key]]
export function createPhraseReplayAnnouncer(
  log: (line: string) => void,
  load: () => Promise<PhraseReplayAnnouncementModule> = () =>
    import('./phrase-replay-announcement'),
): PhraseReplayAnnouncer {
  let module: PhraseReplayAnnouncementModule | null = null
  let queue: Promise<PhraseReplayAnnouncementModule> = load().then((loadedModule) => {
    module = loadedModule
    return loadedModule
  })
  const loaded = queue.then(() => undefined)

  /** Intent: announce at once once loaded; before, after every announcement already waiting. */
  function announceWorkspacePhrase(intent: GenerationIntent): void {
    if (module !== null) {
      module.announceWorkspacePhrase(intent, log)
      return
    }
    queue = queue.then((loadedModule) => {
      loadedModule.announceWorkspacePhrase(intent, log)
      return loadedModule
    })
  }

  /** Intent: the announcing sink; a runner starting before the module loaded is a wiring defect. */
  function announcingSessionOutputs(
    onOutput: (output: SessionOutput) => void,
  ): (output: SessionOutput) => void {
    if (module === null) {
      throw new Error('phrase replay announcer: a session runner started before it loaded')
    }
    return module.announcingSessionOutputs(onOutput, log)
  }

  return { announceWorkspacePhrase, announcingSessionOutputs, loaded }
}
