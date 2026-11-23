// import { ref } from 'vue' -- a comment never counts as an import.
import { encodeMidi } from '../export/midi/midi-encoder'
import type { WorkerRequest } from '../generation-worker/protocol'
import { phraseLength } from '@/domain/phrase/phrase'
import { layout } from './relative-import'

/** A specifier written as a string never counts as an import either. */
export const notAnImport = "import { ref } from 'vue'"

/** Every import here resolves inside the library set. */
export function libraryParts(request: WorkerRequest): unknown[] {
  return [encodeMidi, phraseLength, layout, request]
}

/** An `import()` type that resolves inside the library set. */
export type Score = import('../export/musicxml/score').Score
