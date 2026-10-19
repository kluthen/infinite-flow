/**
 * The harness's in-browser phrase replay: a key decoded in the page by the app's own decoder, its
 * intent sent through the real browser generation worker (a client of its own, created at the
 * first replay, that never prewarms, apart from the workspace's), and the answer turned into plain
 * JSON for the spec: the concert timeline's JSON text, or a plain description of a failure. Also
 * gives a key's `ifk3.` re-encoding, from the decoded intent and phrase number. The workspace
 * session never sees these calls.
 */
import { createBrowserGenerationWorker } from '../../../src/generation-worker/browser-generation-worker'
import {
  createGenerationWorkerClient,
  type GenerationWorkerClient,
} from '../../../src/generation-worker/generation-worker-client'
import { encodePhraseReplayKey } from '../../../src/generation-worker/phrase-replay-key'
import { decodePhraseReplayKey } from '../../../src/generation-worker/phrase-replay-key-decode'

/** Intent: the in-browser replay seams, their worker client created at the first replay. */
export function createHarnessReplay(): WorkspaceHarnessReplayApi {
  let client: GenerationWorkerClient | null = null

  /** Intent: the replay's own worker client, created once and never prewarming. */
  function replayClient(): GenerationWorkerClient {
    client ??= createGenerationWorkerClient(createBrowserGenerationWorker, {
      prewarmEnabled: false,
    })
    return client
  }

  return {
    replayKey: async (key) => {
      const decoded = decodePhraseReplayKey(key.trim())
      const outcome = await replayClient().generate(decoded.intent)
      if (outcome.kind === 'generation_success') {
        return { kind: 'timeline', timeline: JSON.stringify(outcome.result.timeline) }
      }
      return { kind: 'failure', description: `generation_failure: ${outcome.code}` }
    },
    reEncodeKey: (key) => {
      const decoded = decodePhraseReplayKey(key.trim())
      return encodePhraseReplayKey(decoded.intent, decoded.phraseNumber)
    },
  }
}
