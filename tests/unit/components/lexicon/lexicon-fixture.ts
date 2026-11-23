/**
 * A made-up list of shown entries for the lexicon page's tests, in the lexicon's order and read
 * through the read interface, as the page reads the real ones. Its words are shaped to exercise
 * the page's rules: an accented word, a doubled word in two groups, other names, a hyphen, an
 * apostrophe, inline marks, and plain lines that mention other words.
 */
import { createLexiconReader, type LexiconEntry, type LexiconReader } from '@/lexicon'

/** One made-up shown entry; every field but the id, the word and the group has a default. */
export function fixtureEntry(
  fields: Pick<LexiconEntry, 'id' | 'word' | 'group' | 'groupOrder'> & Partial<LexiconEntry>,
): LexiconEntry {
  return {
    otherNames: [],
    popup: `${fields.word}, a made-up word.`,
    definition: `${fields.word} is made up for the tests.`,
    appMeaning: null,
    related: [],
    ...fields,
  }
}

/** The fixture's entries, in the lexicon's order (its groups in order, then its entries). */
export const FIXTURE_ENTRIES: readonly LexiconEntry[] = [
  fixtureEntry({
    id: 'tempo',
    word: 'Tempo',
    group: 'Rhythm and meter',
    groupOrder: 1,
    popup: 'How fast the beat goes.',
    related: ['tempo-control', 'whole-step'],
  }),
  fixtureEntry({
    id: 'compas',
    word: 'Compás',
    group: 'Rhythm and meter',
    groupOrder: 1,
    otherNames: ['compas cycle'],
    popup: 'A twelve-beat cycle with a **strong** tempo feel.',
  }),
  fixtureEntry({
    id: 'half-step',
    word: 'Half step',
    group: 'Pitch',
    groupOrder: 2,
    otherNames: ['semitone', 'minor second'],
    popup: 'The smallest step between two notes.',
    definition: 'A half step is the distance from one key to the **next** on a _piano_.',
    appMeaning: 'Used by the `chromatic approach` figure.',
    related: ['whole-step', 'tempo'],
  }),
  fixtureEntry({
    id: 'whole-step',
    word: 'Whole step',
    group: 'Pitch',
    groupOrder: 2,
    otherNames: ['tone', 'major second'],
    popup: 'Two half steps.',
    related: ['half-step'],
  }),
  fixtureEntry({
    id: 'b-flat-instrument',
    word: 'B-flat instrument',
    group: 'Pitch',
    groupOrder: 2,
    popup: 'An instrument that sounds a step below what it reads.',
  }),
  fixtureEntry({
    id: 'player-s-range',
    word: "Player's range",
    group: 'Pitch',
    groupOrder: 2,
    popup: 'The notes a player can reach.',
  }),
  fixtureEntry({
    id: 'tempo-control',
    word: 'Tempo',
    group: 'App controls',
    groupOrder: 3,
    popup: 'The control that sets the beats per minute.',
    related: ['tempo'],
  }),
  fixtureEntry({
    id: 'abc-notation',
    word: 'ABC notation',
    group: 'App controls',
    groupOrder: 3,
    popup: 'A way of writing tunes as text.',
  }),
]

/** The fixture read through the read interface. */
export function fixtureReader(entries: readonly LexiconEntry[] = FIXTURE_ENTRIES): LexiconReader {
  return createLexiconReader(entries)
}
