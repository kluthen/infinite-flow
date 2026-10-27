/**
 * Small builders of quantized doodles for the tests of what Jam reads from a doodle (the controls
 * and the steering block), and a check that a source file uses whole numbers only. Test plumbing:
 * nothing in the app reads it.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'

import {
  makeQuantizedDoodle,
  type DoodleMeasureCount,
  type QuantizedDoodle,
} from '@/domain/doodle/quantized-doodle'

/** One note as a tuple: its start and length in ticks from the doodle's start, and its pitch. */
export type NoteTuple = readonly [
  startTick: number,
  lengthTicks: number,
  pitch?: number | undefined,
]

/** The pitch a note takes when its tuple names none. */
const DEFAULT_PITCH = 60

/** Intent: a quantized doodle of `measureCount` measures from note tuples, through the app's constructor. */
export function doodleOf(
  measureCount: DoodleMeasureCount,
  notes: readonly NoteTuple[],
): QuantizedDoodle {
  return makeQuantizedDoodle({
    measureCount,
    notes: notes.map(([startTick, lengthTicks, pitch]) => ({
      startTick,
      lengthTicks,
      pitch: pitch ?? DEFAULT_PITCH,
    })),
  })
}

/** Intent: a doodle of one note per given start, each lasting until the next start or `end`. */
export function legatoDoodle(
  measureCount: DoodleMeasureCount,
  starts: readonly number[],
  pitches: readonly number[] = [],
): QuantizedDoodle {
  const end = measureCount * 16
  return doodleOf(
    measureCount,
    starts.map(
      (start, index) => [start, (starts[index + 1] ?? end) - start, pitches[index]] as const,
    ),
  )
}

/**
 * Intent: a doodle of notes every `step` ticks, left silent over each given silence [from, to),
 * with a note starting at each silence's end; each note lasts until the next note or silence.
 */
export function doodleWithSilences(
  measureCount: DoodleMeasureCount,
  step: number,
  silences: readonly (readonly [from: number, to: number])[],
): QuantizedDoodle {
  const end = measureCount * 16
  /** Intent: whether a tick lies inside one of the given silences. */
  const silent = (tick: number): boolean => silences.some(([from, to]) => tick >= from && tick < to)
  const grid = Array.from({ length: end / step }, (_, index) => index * step)
  const starts = [...new Set([...grid, ...silences.map(([, to]) => to)])]
    .filter((tick) => tick < end && !silent(tick))
    .sort((a, b) => a - b)
  return doodleOf(
    measureCount,
    starts.map((start, index) => {
      const nextSilence = silences.map(([from]) => from).filter((from) => from > start)
      const until = Math.min(starts[index + 1] ?? end, ...nextSilence, end)
      return [start, until - start] as const
    }),
  )
}

/** What the whole-number check finds in a source file: anything that is not integer arithmetic. */
export interface NonIntegerOperations {
  readonly divisions: string[]
  readonly decimalLiterals: string[]
  readonly mathCalls: string[]
}

/** The Math functions that keep whole numbers whole. */
const INTEGER_MATH = new Set(['abs', 'max', 'min'])

/**
 * Intent: every division, decimal or exponent literal and Math access other than abs, max and min
 * in the source file at `url` (resolved from the repository's test directory).
 */
export function nonIntegerOperations(url: URL): NonIntegerOperations {
  const path = fileURLToPath(url)
  const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest)
  const found: NonIntegerOperations = { divisions: [], decimalLiterals: [], mathCalls: [] }
  /** Intent: record what `node` holds, then walk its children. */
  const visit = (node: ts.Node): void => {
    if (
      ts.isBinaryExpression(node) &&
      (node.operatorToken.kind === ts.SyntaxKind.SlashToken ||
        node.operatorToken.kind === ts.SyntaxKind.SlashEqualsToken)
    ) {
      found.divisions.push(node.getText(source))
    }
    if (ts.isNumericLiteral(node) && /[.eE]/.test(node.getText(source))) {
      found.decimalLiterals.push(node.getText(source))
    }
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'Math' &&
      !INTEGER_MATH.has(node.name.text)
    ) {
      found.mathCalls.push(node.getText(source))
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return found
}
