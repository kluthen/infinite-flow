/**
 * The Markdown files of the rhythm-render folder, in plain words for a music-theory beginner: the
 * top-level README (what the folder is, how it was made, how to remake it; it never tells which
 * letter is which band), H1's ANSWERS.md (kept apart, so the owner ranks before looking) and H2's
 * README (each change kind and the measures it touches). Generated text holds no Markdown link, so
 * a folder left in the repository never trips the link check. Test tooling.
 */

import type { RhythmChangeKind } from '../../../src/domain/generation/request-rhythm-lock'
import { rhythmStarts, type MeasureStarts } from '../../../src/domain/rhythm/rhythm-bars'
import type { RhythmBand } from '../../../src/domain/rhythm/rhythm-distance'
import { TICKS_PER_BAR } from '../../../src/domain/time/ticks'
import { startsKey } from './rhythm-renders-h1'
import type { ChangePick, H2Plan } from './rhythm-renders-h2'
import { RENDER_BPM } from './rhythm-renders-midi'
import { kindFileStem, lockedFileName, type H1Set } from './rhythm-renders-plan'

/** Each change kind's plain name and what it does, after master spec C7.3. */
export const KIND_WORDS: Readonly<Record<RhythmChangeKind, { name: string; does: string }>> = {
  move_note_start: {
    name: 'Move a note start',
    does: 'a note starts a sixteenth or an eighth earlier or later; the note before it gets longer or shorter by as much',
  },
  move_rest: {
    name: 'Move a rest',
    does: 'a rest between two notes moves a sixteenth or an eighth, with the note after it; the rest keeps its length',
  },
  split_note: { name: 'Split a note', does: 'one note becomes two: a new note starts inside it' },
  merge_notes: {
    name: 'Merge two notes',
    does: "two notes become one: the second note's start is removed and the first note goes on through it",
  },
  note_rest: {
    name: 'Add or remove a rest',
    does: 'a note becomes a rest of the same length, or a rest becomes a note, at the same place',
  },
}

/** Why some doodles make no H1 set, said in the answers and in the folder's README. */
export const DETACHED_NOTE =
  'A measure played detached (each note let go early, so a short rest follows it) is often far ' +
  'from every rhythm the app writes, which leaves it few real candidates near it; that is why ' +
  'some doodles were not used.'

/** What each band means, after master spec C8. */
const BAND_WORDS: Readonly<Record<RhythmBand, string>> = {
  Same: 'the same rhythm (no edit)',
  Close: 'one small edit, away from beats 1 and 3',
  Near: 'one edit on beat 1 or 3, or two small edits',
  beyond: 'more than that',
}

/** The grid's legend, printed under every grid. */
const GRID_LEGEND =
  'Grid: one character per sixteenth note, a space between beats: `x` a note starts, `-` the ' +
  'note goes on, `.` silence.'

/** Intent: one measure as a grid of sixteenths: `x` note start, `-` held, `.` silence. */
export function measureGrid(starts: MeasureStarts): string {
  const cells: string[] = []
  let current = '.'
  for (let tick = 0; tick < TICKS_PER_BAR; tick++) {
    const entry = starts.find((start) => start.tick === tick)
    if (entry !== undefined) current = entry.kind === 'note' ? '-' : '.'
    cells.push(entry?.kind === 'note' ? 'x' : current)
    if (tick % 4 === 3 && tick < TICKS_PER_BAR - 1) cells.push(' ')
  }
  return cells.join('')
}

/** Intent: a tick of a measure in counting words: `beat 3`, `the "and" of beat 2`... */
export function tickPlace(tick: number): string {
  const beat = Math.floor(tick / 4) + 1
  const syllable = ['', 'e', 'and', 'a'][tick % 4]!
  return syllable === '' ? `beat ${beat}` : `the "${syllable}" of beat ${beat}`
}

/** Intent: the measures of a change as words: `measure 3`, or `measures 2 and 4 (repeated)`. */
function measuresWords(pick: ChangePick): string {
  const numbers = pick.change.measures.map((measure) => measure + 1)
  return numbers.length === 1
    ? `measure ${numbers[0]} only`
    : `measure ${numbers[0]} and again, the identical change, in measure ${numbers[1]}`
}

/** Intent: what exactly a change does, in counting words. */
function changeDetail(lockedStarts: readonly MeasureStarts[], pick: ChangePick): string {
  const { kind, tick, delta, measures } = pick.change
  const place = tickPlace(tick)
  const size = Math.abs(delta) === 1 ? 'a sixteenth' : 'an eighth'
  const way = delta > 0 ? 'later' : 'earlier'
  if (kind === 'move_note_start') return `the note on ${place} starts ${size} ${way}`
  if (kind === 'move_rest') return `the rest on ${place} moves ${size} ${way}`
  if (kind === 'split_note') return `a new note starts on ${place}, inside a held note`
  if (kind === 'merge_notes')
    return `the note on ${place} no longer starts; the note before goes on`
  const was = lockedStarts[measures[0]!]!.find((start) => start.tick === tick)?.kind
  return was === 'note'
    ? `the note on ${place} becomes a rest`
    : `the rest on ${place} becomes a note`
}

/** Intent: the five doodle measures of H1 as a list, each with its doodle and its grid. */
function doodleList(sets: readonly H1Set[]): string {
  return sets
    .map(
      (set) =>
        `${set.number}. \`${set.folder}\`: measure ${set.measure} of \`${set.doodle.name}\`. ` +
        `${set.doodle.description}\n   \`${measureGrid(set.starts)}\``,
    )
    .join('\n')
}

/** Intent: the sentence naming the doodle measure a set plays. */
function measureSentence(set: H1Set): string {
  return `This set is measure ${set.measure} of the doodle \`${set.doodle.name}\`.`
}

/** Intent: the top-level README of the folder; it never says which letter is which band. */
export function topReadme(sets: readonly H1Set[], plan: H2Plan, poolSize: number): string {
  const s = plan.setting
  return `# Rhythm renders for the v3.2 hand checks H1 and H2

Short MIDI files to listen to in any MIDI player with a General MIDI sound set (for example VLC
with a soundfont, or MuseScore, which opens MIDI files). The checks themselves are in
\`HARDWARE-CHECKLIST.md\` at the root of the repository ("v3.2 hand checks").

Every file plays at ${RENDER_BPM} BPM in 4/4: first one count-in measure of four soft clicks, then
the music, with a soft click on every beat throughout (a slightly louder one on beat 1). Markers
name each part (count-in, doodle measure, silent measure, candidate...).

## \`h1-drift/\`: drift's scale by ear (H1)

Five sets, each one measure of a different doodle. In each set, \`doodle.mid\` plays that doodle
measure alone; each lettered file (\`A.mid\`, \`B.mid\`...) plays the doodle measure, one silent measure, then
one candidate measure. Rank the candidates from most to least like the doodle **before** opening
\`h1-drift/ANSWERS.md\`, which says which letter is which. A set can hold fewer than four
candidates when no real rhythm falls at some distance; the answers say which.

${doodleList(sets)}

${GRID_LEGEND}

${DETACHED_NOTE}

## \`h2-changes/\`: allowed rhythm changes (H2)

A locked rhythm (four measures), then one change of each kind; \`h2-changes/README.md\` names
each kind in plain words and the measures it touches.

## How it was made

- **Distance.** The rhythm distance of master spec C8 (the app's own code): compare two measures
  as lists of note starts and rest starts; an edit adds or removes one start, moves one by at most
  an eighth note, or turns a note start into a rest start or back. No edit is Same; one edit away
  from beats 1 and 3 is Close; one edit on beat 1 or 3, or two Close edits, is Near; more is
  beyond. As C8 says, a candidate is read as heard against the doodle: a rest right after another
  rest starts nothing.
- **H1 candidates** come from the real rhythm domains: every measure written by every supported
  rhythm setting at every tension, ${poolSize} distinct measures as heard (a measure that opens
  with a note tied over from the measure before is left out, since alone it would open with a
  silence its start list does not hold). For each band, the candidate is the measure whose number
  of notes is nearest the doodle's (so "beyond" is not trivially far), then the one with the
  fewest edits, then the first in a fixed seeded order. When no real measure is Same, the doodle's
  own rhythm stands in for Same. The letters are shuffled per set by a fixed seed.
- **H1 doodle measures**: every measure of every doodle of the doodle set
  (\`tests/fixtures/doodles/\`) holding at least two notes, the five that find a real measure in
  the most bands; then a measure of a doodle marked as a listening rhythm first, at most one
  measure per doodle, ties by doodle name and measure number.
- **H1 pitches**: rhythm is what is compared, so a candidate's notes take the doodle's pitches in
  order (the last one repeated when the candidate has more notes).
- **H2**: the ${s.presetName} preset's rhythm settings (${s.noteDensity}, ${s.rhythmicVariety}, ${s.syncopation},
  ${s.silenceDensity} silence, tension ${s.tensionArc}) and the rhythm domain the generator builds
  for them (${plan.domainSize} rhythms). The locked rhythm is the one offering the most of the five
  kinds among the domain's other rhythms, then the most of them in one measure, then the first in
  the domain's order; another locked rhythm is added only for kinds the first does not offer. Each
  change is the domain rhythm one change away (one measure preferred to a repeated change, then
  the domain's order). Each measure's notes take one fixed line (C D E F G F E D around middle C),
  note by note, so only the rhythm differs; a change that adds or removes a note shifts the
  pitches after it within that measure only.

## Remake it

\`\`\`sh
npm run render:rhythms
npm run render:rhythms -- --out <dir>
\`\`\`

The output is the same every time. The command deletes and rewrites only its own folder
(\`rhythm-renders/\` by default), which git ignores.
`
}

/** Intent: one H1 set's section of the answers. */
function setAnswers(set: H1Set): string {
  const rows = set.candidates.map(
    ({ letter, pick }) =>
      `| ${letter} | ${pick.band} | ${pick.edits} | \`${measureGrid(pick.starts)}\` | \`${startsKey(pick.starts)}\` |`,
  )
  const notes: string[] = []
  const same = set.candidates.find(({ pick }) => pick.band === 'Same')
  if (same?.pick.source === 'doodle')
    notes.push(`No real measure is Same; ${same.letter} is the doodle's own rhythm.`)
  const absent = set.missing.filter((band) => band !== 'Same')
  if (absent.length > 0)
    notes.push(`No real measure is ${absent.join(' or ')}, so the set has no candidate there.`)
  return `## Set ${set.number}: ${set.doodle.name}, measure ${set.measure}

${measureSentence(set)}

Doodle measure: \`${measureGrid(set.starts)}\` (\`${startsKey(set.starts)}\`)

| File | Band | Edits | Grid | Start list |
| --- | --- | --- | --- | --- |
${rows.join('\n')}
${notes.length > 0 ? `\n${notes.join(' ')}\n` : ''}`
}

/** Intent: H1's answers: per set, each letter's band, edit count and start list. */
export function h1Answers(sets: readonly H1Set[]): string {
  const bands = (Object.keys(BAND_WORDS) as RhythmBand[])
    .map((band) => `- **${band}**: ${BAND_WORDS[band]}.`)
    .join('\n')
  return `# H1 answers: which candidate is which band

Open this only after ranking every set by ear. The bands, from master spec C8:

${bands}

"Edits" counts the fewest edits between the doodle measure and the candidate. "Start list" names
each start by its kind (\`n\` a note, \`r\` a rest) and its sixteenth (0 to 15).

${GRID_LEGEND}

${DETACHED_NOTE}

${sets.map(setAnswers).join('\n')}`
}

/** Intent: one H2 change's section: its kind, what it does and the measures it touches. */
function changeSection(
  lockIndex: number,
  lockedStarts: readonly MeasureStarts[],
  kind: RhythmChangeKind,
  pick: ChangePick,
): string {
  const changedStarts = rhythmStarts(pick.candidate.bars)
  const rows = pick.change.measures.map(
    (measure) =>
      `| ${measure + 1} | \`${measureGrid(lockedStarts[measure]!)}\` | \`${measureGrid(changedStarts[measure]!)}\` |`,
  )
  return `## \`${kindFileStem(kind)}.mid\`: ${KIND_WORDS[kind].name}

${KIND_WORDS[kind].name}: ${KIND_WORDS[kind].does}. Here ${changeDetail(lockedStarts, pick)}, in
${measuresWords(pick)}. Locked rhythm: \`${lockedFileName(lockIndex)}\`.

| Measure | Locked | Changed |
| --- | --- | --- |
${rows.join('\n')}
`
}

/** Intent: H2's README: the locked rhythms, each change and the kinds no rhythm offers. */
export function h2Readme(plan: H2Plan): string {
  const locks = plan.locks.map((lock, index) => {
    const starts = rhythmStarts(lock.locked.bars)
    const grid = starts.map(measureGrid).join(' | ')
    const changes = [...lock.changes].map(([kind, pick]) =>
      changeSection(index, starts, kind, pick),
    )
    return `## \`${lockedFileName(index)}\`\n\nLocked rhythm ${index + 1}, four measures:\n\`${grid}\`\n\n${changes.join('\n')}`
  })
  const missing =
    plan.missing.length === 0
      ? 'Every kind has a change.'
      : `No rhythm of the domain offers: ${plan.missing.map((kind) => KIND_WORDS[kind].name).join(', ')}.`
  const second =
    plan.locks.length > 1
      ? 'No locked rhythm of this domain offers all five kinds, so each file plays its own locked ' +
        'rhythm first: the kinds the first locked rhythm lacks use another one.'
      : 'One locked rhythm offers every kind found.'
  return `# H2: allowed rhythm changes

Each numbered file plays a locked rhythm (four measures), one silent measure, then the same rhythm
with one change. One change is one edit made in one measure, or the identical edit made in measure
1 or 2 and again in measure 3 or 4 (the rhythm builds measures 3 and 4 as a varied copy of
measures 1 and 2). Places are counted in sixteenths: "1 e and a" for the four sixteenths of beat
1. ${second} ${missing}

${GRID_LEGEND}

${locks.join('\n')}`
}
