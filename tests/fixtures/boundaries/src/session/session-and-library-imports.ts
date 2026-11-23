// import { ref } from 'vue' -- a comment never counts as an import.
import { encodeMidi } from '../export/midi/midi-encoder'
import type { MusicXmlScore } from '../export/musicxml/score'
import type { WorkerRequest } from '../generation-worker/protocol'
import { phraseLength } from '@/domain/phrase/phrase'
import { sessionClock } from '@/session/session-clock'
import { openDatabase } from './indexed-db'

/** A specifier written as a string never counts as an import either. */
export const notAnImport = "import { createClickPlan } from '../audio/click-track'"

/** Every import here resolves inside session or the library set. */
export function sessionParts(request: WorkerRequest, score: MusicXmlScore): unknown[] {
  return [encodeMidi, phraseLength, sessionClock, openDatabase, request, score]
}
