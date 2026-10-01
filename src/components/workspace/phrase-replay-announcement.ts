/**
 * Which session runner outputs announce a phrase replay key. A session phrase is accepted when the
 * engine readies it with a carry-in or standalone origin, a look-ahead phrase readied but never
 * sounded included. A repeat generates nothing new, and the Idle phrase that becomes phrase 1 was
 * already announced by the workspace fit run when it was accepted; the engine never readies that
 * `idle` record, since it is the session's start, but it is skipped here all the same. Loaded
 * lazily, through phrase-replay-announcer.ts only.
 */
import {
  announcePhraseReplayKey,
  type PhraseReplayContext,
} from '@/generation-worker/phrase-replay-key'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import type { SessionOutput } from '@/session/session-types'

/** An accepted session phrase: the intent it was generated from and the context naming it. */
// @spec-link [[module_phrase_replay_key]]
export interface AcceptedSessionPhrase {
  readonly intent: GenerationIntent
  readonly context: PhraseReplayContext
}

/**
 * Intent: name the accepted session phrase a runner output readies, or null for any output that
 * readies no newly generated phrase (a repeat, the Idle phrase, or any non-phrase-ready output).
 */
// @spec-link [[module_phrase_replay_key]]
export function acceptedSessionPhrase(output: SessionOutput): AcceptedSessionPhrase | null {
  if (output.kind !== 'phrase-ready') return null
  const { phraseNumber, origin, intent } = output.phrase
  if (origin !== 'carry-in' && origin !== 'standalone') return null
  return { intent, context: { source: 'session', phraseNumber, origin } }
}

/**
 * Intent: wrap a runner's output sink so every accepted session phrase has its replay key line
 * handed to `log` once, before the output itself is forwarded unchanged.
 */
// @spec-link [[module_phrase_replay_key]]
export function announcingSessionOutputs(
  onOutput: (output: SessionOutput) => void,
  log: (line: string) => void,
): (output: SessionOutput) => void {
  return (output) => {
    const accepted = acceptedSessionPhrase(output)
    if (accepted !== null) announcePhraseReplayKey(accepted.intent, accepted.context, log)
    onOutput(output)
  }
}

/** Intent: hand an accepted Idle phrase's replay key line (a workspace phrase) to `log` once. */
// @spec-link [[module_phrase_replay_key]]
export function announceWorkspacePhrase(
  intent: GenerationIntent,
  log: (line: string) => void,
): void {
  announcePhraseReplayKey(intent, { source: 'workspace' }, log)
}
