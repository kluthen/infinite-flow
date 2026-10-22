/**
 * Hand-written rhythm bars for the bar-key, distance and change-kind specs. A measure is written as
 * space-separated tokens laid end to end from tick 0: `n4` is a note of four sixteenths, `r2` a
 * rest of two, and `~n2` a note of two tied from the note before it (a tie continuation).
 */
import type { MeasureStarts } from '@/domain/rhythm/rhythm-bars'
import type {
  BarIndex,
  RhythmBar,
  RhythmEvent,
  RhythmEventKind,
} from '@/domain/rhythm/rhythm-types'

const TOKEN = /^(~?)([nr])(\d+)$/

/** One parsed token: kind, duration and whether it continues a tie from the event before it. */
interface Token {
  readonly kind: RhythmEventKind
  readonly durationTicks: number
  readonly continuation: boolean
}

/** Intent: parse one measure's tokens, rejecting anything that is not a well-formed token. */
function parseTokens(spec: string): readonly Token[] {
  return spec
    .trim()
    .split(/\s+/)
    .map((token) => {
      const match = TOKEN.exec(token)
      if (!match) throw new Error(`bad rhythm token "${token}" in "${spec}"`)
      return {
        kind: match[2] === 'n' ? 'note' : 'rest',
        durationTicks: Number(match[3]),
        continuation: match[1] === '~',
      }
    })
}

/**
 * Intent: build one written measure from its tokens. Tie chains get a name built from `chainPrefix`
 * so two specs can write the same rhythm with different chain names. Throws unless the measure
 * fills exactly 16 ticks and every tie continues a note.
 */
export function bar(spec: string, barIndex: BarIndex = 0, chainPrefix = 'chain'): RhythmBar {
  const tokens = parseTokens(spec)
  const events: RhythmEvent[] = []
  let tick = 0
  let chainId: string | undefined
  tokens.forEach((token, index) => {
    const next = tokens[index + 1]
    if (token.continuation && (token.kind !== 'note' || chainId === undefined))
      throw new Error(`a tie must continue a note in "${spec}"`)
    if (!token.continuation)
      chainId = next?.continuation ? `${chainPrefix}-${barIndex}-${tick}` : undefined
    events.push({
      kind: token.kind,
      startTick: tick,
      durationTicks: token.durationTicks,
      nominalDurationTicks: token.durationTicks,
      sourceCells: [],
      ...(chainId === undefined ? {} : { tieChainId: chainId }),
      ...(token.continuation ? { tieContinuation: true } : {}),
    })
    tick += token.durationTicks
  })
  if (tick !== 16) throw new Error(`measure "${spec}" fills ${tick} ticks, not 16`)
  return { barIndex, events }
}

/** Intent: build a four-measure phrase from four measure specs. */
export function phrase(specs: readonly [string, string, string, string]): readonly RhythmBar[] {
  return specs.map((spec, index) => bar(spec, index as BarIndex))
}

/**
 * Intent: write a start list directly, e.g. `n0 r4 n6`: one note or rest start per token, at the
 * given tick.
 */
export function starts(spec: string): MeasureStarts {
  if (spec.trim() === '') return []
  return spec
    .trim()
    .split(/\s+/)
    .map((token) => {
      const match = /^([nr])(\d+)$/.exec(token)
      if (!match) throw new Error(`bad start token "${token}"`)
      return { kind: match[1] === 'n' ? 'note' : 'rest', tick: Number(match[2]) }
    })
}
