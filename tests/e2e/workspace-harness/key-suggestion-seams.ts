/**
 * The harness's in-browser key and mode suggestion: each case of the suggestion's golden list
 * computed in the page by the app's own functions (describeKeySuggestion, shared with the Node
 * spec), so the in-browser spec compares Chrome's seeds, kept candidates and answers with the ones
 * recorded in Node. Jam's written key and Collection arrive as plain strings and are checked here.
 * The workspace session never sees these calls.
 */
import {
  COLLECTIONS,
  PITCH_CLASSES,
  type Collection,
  type PitchClass,
} from '../../../src/domain/controls/generation-controls'
import { describeKeySuggestion } from '../../unit/jam/key-suggestion/key-suggestion-golden-case'

/** Intent: one of the given values, or a refusal naming the case. */
function oneOf<T extends string>(values: readonly T[], value: string, label: string): T {
  const found = values.find((each) => each === value)
  if (found === undefined) throw new Error(`Key suggestion case ${label}: no such value ${value}.`)
  return found
}

/** Intent: the in-browser key and mode suggestion seams. */
export function createHarnessKeySuggestion(): WorkspaceHarnessKeySuggestionApi {
  return {
    describe: (cases) =>
      cases.map((each) =>
        describeKeySuggestion({
          ...each,
          jam: {
            tonalCenter: oneOf<PitchClass>(PITCH_CLASSES, each.jam.tonalCenter, each.label),
            collection: oneOf<Collection>(COLLECTIONS, each.jam.collection, each.label),
          },
        }),
      ),
  }
}
