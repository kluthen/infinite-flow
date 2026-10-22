import { beforeAll, describe, expect, it } from 'vitest'

import {
  NOTE_DENSITIES,
  RHYTHMIC_VARIETIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  TENSION_ARCS,
  type TensionArc,
} from '@/domain/controls/generation-controls'
import { RHYTHM_CHANGE_KINDS, type RhythmChangeKind } from '@/domain/generation/request-rhythm-lock'
import {
  barsKeyedDomainOf,
  keyRhythmCandidates,
  type BarsKeyedRhythmDomain,
  type MeasureStarts,
} from '@/domain/rhythm/rhythm-bars'
import { rhythmChangeBetween, type RhythmChange } from '@/domain/rhythm/rhythm-change-kinds'
import { isNoLegalRhythmPlan, makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'
import type { BarIndex, RhythmBar, RhythmCandidate } from '@/domain/rhythm/rhythm-types'

/** The 81 rhythm settings (tension apart): 3 densities x 3 varieties x 3 silences x 3 syncopations. */
const SETTINGS = NOTE_DENSITIES.flatMap((noteDensity) =>
  RHYTHMIC_VARIETIES.flatMap((rhythmicVariety) =>
    SILENCE_DENSITIES.flatMap((silenceDensity) =>
      SYNCOPATIONS.map((syncopation) => ({
        noteDensity,
        rhythmicVariety,
        silenceDensity,
        syncopation,
        name: `${noteDensity}/${rhythmicVariety}/${silenceDensity}/${syncopation}`,
      })),
    ),
  ),
)

/** What the spec keeps of one domain (setting x tension); the candidates themselves are dropped. */
interface DomainFacts {
  readonly size: number
  readonly keys: ReadonlySet<string>
  /** Distinct written bars, compared without the bar key. */
  readonly writtenRhythms: number
  /** Bar-key groups whose members are not all written alike. */
  readonly mixedGroups: readonly string[]
}

/** Intent: a rhythm's written bars as a string built without the bar key, to check it against. */
function written(bars: readonly RhythmBar[]): string {
  return JSON.stringify(
    bars.map((bar) =>
      bar.events.map((event) => [
        event.kind,
        event.startTick,
        event.durationTicks,
        event.tieContinuation === true,
      ]),
    ),
  )
}

/** Intent: drain one domain, or undefined when the setting has no rhythm at that tension. */
function drain(
  setting: (typeof SETTINGS)[number],
  tensionArc: TensionArc,
): readonly RhythmCandidate[] | undefined {
  const result = makeRhythmCandidateDomain({ ...setting, tensionArc })
  return isNoLegalRhythmPlan(result) ? undefined : Object.freeze([...result.candidates()])
}

/** Intent: keep the facts the spec checks of one keyed domain. */
function factsOf(
  candidates: readonly RhythmCandidate[],
  keyed: BarsKeyedRhythmDomain,
): DomainFacts {
  const mixedGroups = [...keyed.byKey]
    .filter(([, group]) => new Set(group.map((candidate) => written(candidate.bars))).size !== 1)
    .map(([key]) => key)
  return {
    size: candidates.length,
    keys: new Set(keyed.keys),
    writtenRhythms: new Set(candidates.map((candidate) => written(candidate.bars))).size,
    mixedGroups,
  }
}

/** A change's form, or `any` for a kind counted once whichever form it takes. */
type CensusForm = RhythmChange['form'] | 'any'

/** What a change of a kind adds to its form: a move's size, or the way a note_rest turns. */
type CensusDetail = 'by a sixteenth' | 'by an eighth' | 'note-to-rest' | 'rest-to-note'

/** The census of one domain that has candidates: its setting, its size and its label counts. */
interface DomainCensus {
  readonly setting: (typeof SETTINGS)[number]
  readonly tension: TensionArc
  readonly size: number
  /** By census label: how many candidates have at least one change carrying that label. */
  readonly counts: ReadonlyMap<string, number>
}

/** The measures one change can touch: one measure, or a gesture measure and its answer. */
const GROUPINGS: readonly (readonly BarIndex[])[] = [[0], [1], [2], [3], [0, 2], [1, 3]]

/** Intent: the census label of a kind in a form, with an optional detail. */
function censusLabel(kind: RhythmChangeKind, form: CensusForm, detail?: CensusDetail): string {
  return detail === undefined ? `${kind}/${form}` : `${kind}/${form}/${detail}`
}

/** Intent: the detail a change adds, read from the locked candidate's start lists. */
function censusDetail(
  change: RhythmChange,
  locked: readonly MeasureStarts[],
): CensusDetail | undefined {
  if (change.kind === 'move_note_start' || change.kind === 'move_rest')
    return Math.abs(change.delta) === 1 ? 'by a sixteenth' : 'by an eighth'
  if (change.kind !== 'note_rest') return undefined
  const start = locked[change.measures[0]!]!.find((entry) => entry.tick === change.tick)
  return start?.kind === 'note' ? 'note-to-rest' : 'rest-to-note'
}

/** Intent: every census label one change gives the locked candidate. */
function labelsOf(change: RhythmChange, locked: readonly MeasureStarts[]): readonly string[] {
  const detail = censusDetail(change, locked)
  const labels = [censusLabel(change.kind, 'any'), censusLabel(change.kind, change.form)]
  if (detail !== undefined) labels.push(censusLabel(change.kind, change.form, detail))
  return labels
}

/**
 * Intent: the candidate positions grouped by how their measures outside `grouping` are written.
 * Two candidates differing by a change confined to `grouping` always fall in one group.
 */
function bucketsOutside(
  measureKeys: readonly (readonly string[])[],
  grouping: readonly BarIndex[],
): readonly (readonly number[])[] {
  const buckets = new Map<string, number[]>()
  measureKeys.forEach((keys, position) => {
    const outside = keys.filter((_, measure) => !grouping.includes(measure as BarIndex)).join('|')
    const bucket = buckets.get(outside)
    if (bucket) bucket.push(position)
    else buckets.set(outside, [position])
  })
  return [...buckets.values()]
}

/** Intent: whether a change touches exactly the measures of a grouping. */
function touchesExactly(change: RhythmChange, grouping: readonly BarIndex[]): boolean {
  return (
    change.measures.length === grouping.length &&
    change.measures.every((measure, index) => measure === grouping[index])
  )
}

/**
 * Intent: count, per census label, the candidates of one domain that some other candidate of the
 * domain differs from by one change carrying that label (each candidate once per label; twins
 * written alike each count). Only pairs written alike outside a grouping are compared, and a
 * change counts only for the grouping it touches, so each pair's change is counted once.
 */
function censusCounts(
  candidates: readonly RhythmCandidate[],
  keyed: BarsKeyedRhythmDomain,
): ReadonlyMap<string, number> {
  const measureKeys = keyed.keys.map((key) => key.split('|'))
  const labels = candidates.map(() => new Set<string>())
  for (const grouping of GROUPINGS)
    for (const bucket of bucketsOutside(measureKeys, grouping))
      for (const locked of bucket)
        for (const other of bucket) {
          if (locked === other) continue
          const change = rhythmChangeBetween(candidates[locked]!.bars, candidates[other]!.bars)
          if (!change || !touchesExactly(change, grouping)) continue
          for (const label of labelsOf(change, keyed.starts[locked]!)) labels[locked]!.add(label)
        }
  const counts = new Map<string, number>()
  for (const set of labels) for (const label of set) counts.set(label, (counts.get(label) ?? 0) + 1)
  return counts
}

const facts = new Map<string, DomainFacts | undefined>()
const censuses: DomainCensus[] = []
let largest: readonly RhythmCandidate[] = []

/** Intent: the census of the supported domains a filter keeps. */
function domainsWhere(keep: (census: DomainCensus) => boolean): readonly DomainCensus[] {
  return censuses.filter(keep)
}

/** Intent: how many candidates of one domain carry a census label. */
function countIn(
  census: DomainCensus,
  kind: RhythmChangeKind,
  form: CensusForm,
  detail?: CensusDetail,
): number {
  return census.counts.get(censusLabel(kind, form, detail)) ?? 0
}

/** Intent: a census label's candidate count summed over domains. */
function pooled(
  domains: readonly DomainCensus[],
  kind: RhythmChangeKind,
  form: CensusForm,
  detail?: CensusDetail,
): number {
  return domains.reduce((sum, census) => sum + countIn(census, kind, form, detail), 0)
}

/** Intent: every kind's pooled candidate count in one form, by kind. */
function pooledByKind(
  domains: readonly DomainCensus[],
  form: CensusForm,
): Record<RhythmChangeKind, number> {
  return Object.fromEntries(
    RHYTHM_CHANGE_KINDS.map((kind) => [kind, pooled(domains, kind, form)]),
  ) as Record<RhythmChangeKind, number>
}

/** Intent: how many domains a pool holds and how many candidates they have together. */
function totals(domains: readonly DomainCensus[]): { domains: number; candidates: number } {
  return {
    domains: domains.length,
    candidates: domains.reduce((sum, census) => sum + census.size, 0),
  }
}

/** Intent: a domain's name, setting and tension. */
function domainName(census: DomainCensus): string {
  return `${census.setting.name}/${census.tension}`
}

/** Intent: the facts of one setting at one tension. */
function at(name: string, tension: TensionArc): DomainFacts | undefined {
  if (!facts.has(`${name}/${tension}`)) throw new Error(`${name}/${tension} was not built`)
  return facts.get(`${name}/${tension}`)
}

beforeAll(() => {
  for (const setting of SETTINGS) {
    for (const tension of TENSION_ARCS) {
      const candidates = drain(setting, tension)
      if (!candidates) {
        facts.set(`${setting.name}/${tension}`, undefined)
        continue
      }
      const keyed = keyRhythmCandidates(candidates)
      facts.set(`${setting.name}/${tension}`, factsOf(candidates, keyed))
      if (candidates.length > 0)
        censuses.push({
          setting,
          tension,
          size: candidates.length,
          counts: censusCounts(candidates, keyed),
        })
      if (candidates.length > largest.length) largest = candidates
    }
  }
}, 600_000)

// @test-link [[entity_rhythm_candidate_domain]]
describe('rhythm domains keyed by bars, over every rhythm setting', () => {
  it('ten settings have no rhythm at any tension; every other one has a domain at all four', () => {
    const none = SETTINGS.filter((setting) =>
      TENSION_ARCS.every((tension) => at(setting.name, tension) === undefined),
    )
    const partial = SETTINGS.filter((setting) => {
      const present = TENSION_ARCS.filter((tension) => at(setting.name, tension) !== undefined)
      return present.length > 0 && present.length < TENSION_ARCS.length
    })
    expect(none).toHaveLength(10)
    expect(partial).toEqual([])
  })

  it('Sixteenth, Heavily varied, Sparse, Active displacement has 1,797 candidates and 1,435 distinct bar keys at Build and Edge', () => {
    const sizes = [...facts].filter(([, domain]) => domain?.size === 1_797).map(([name]) => name)
    expect(sizes).toEqual([
      'Sixteenth/Heavily varied/Sparse/Active displacement/Build',
      'Sixteenth/Heavily varied/Sparse/Active displacement/Edge',
    ])
    for (const tension of ['Build', 'Edge'] as const)
      expect(at('Sixteenth/Heavily varied/Sparse/Active displacement', tension)?.keys.size).toBe(
        1_435,
      )
  })

  it('the largest domains have 2,932 candidates: Sixteenth, Heavily varied, Sparse, Straight at Build and Edge', () => {
    const top = Math.max(...[...facts.values()].map((domain) => domain?.size ?? 0))
    expect(top).toBe(2_932)
    expect([...facts].filter(([, domain]) => domain?.size === top).map(([name]) => name)).toEqual([
      'Sixteenth/Heavily varied/Sparse/Straight/Build',
      'Sixteenth/Heavily varied/Sparse/Straight/Edge',
    ])
  })

  it.each(SETTINGS)(
    '$name: Settled and Lift share their bar keys, Build and Edge too, and Lift keys are among Build keys',
    ({ name }) => {
      const [settled, lift, build, edge] = TENSION_ARCS.map((tension) => at(name, tension)?.keys)
      if (!settled || !lift || !build || !edge) return
      expect([...lift].sort()).toEqual([...settled].sort())
      expect([...edge].sort()).toEqual([...build].sort())
      expect([...lift].filter((key) => !build.has(key))).toEqual([])
    },
  )

  it('pooled over the settings, 41.7 % of Build bar keys are found at Lift', () => {
    let found = 0
    let total = 0
    for (const { name } of SETTINGS) {
      const build = at(name, 'Build')?.keys
      const lift = at(name, 'Lift')?.keys
      if (!build || !lift) continue
      total += build.size
      found += [...build].filter((key) => lift.has(key)).length
    }
    expect({ found, total }).toEqual({ found: 6_936, total: 16_632 })
    expect(Math.round((found / total) * 1_000) / 10).toBe(41.7)
  })

  it('equal bar keys mean identical written bars and distinct keys different bars, in every domain', () => {
    for (const [name, domain] of facts) {
      if (!domain) continue
      expect(domain.mixedGroups, name).toEqual([])
      expect(domain.keys.size, name).toBe(domain.writtenRhythms)
    }
  })
})

// @test-link [[entity_rhythm_candidate_domain]]
describe('keying the largest domain', () => {
  it('leaves the candidates, their identities and their order unchanged', () => {
    const order = [...largest]
    const identities = largest.map(
      (candidate) => `${candidate.candidateIndex}:${candidate.identity}`,
    )
    const keyed = keyRhythmCandidates(largest)
    expect(largest.every((candidate, index) => candidate === order[index])).toBe(true)
    expect(largest.map((candidate) => `${candidate.candidateIndex}:${candidate.identity}`)).toEqual(
      identities,
    )
    expect(
      [...keyed.byKey.values()].flat().sort((a, b) => a.candidateIndex - b.candidateIndex),
    ).toEqual(order)
  })

  it('is built once per candidate list', () => {
    expect(barsKeyedDomainOf(largest)).toBe(barsKeyedDomainOf(largest))
  })
})

// @test-link [[rule_rhythm_change_kinds]]
describe('rhythm change kinds available, per kind and form, over every domain', () => {
  const settledOrLift = (tension: TensionArc) => tension === 'Settled' || tension === 'Lift'

  it('every supported domain: 284 domains, 51,312 candidates; each kind in any form', () => {
    expect({ ...totals(censuses), ...pooledByKind(censuses, 'any') }).toEqual({
      domains: 284,
      candidates: 51_312,
      move_note_start: 35_654,
      move_rest: 14_722,
      split_note: 13_142,
      merge_notes: 3_272,
      note_rest: 7_036,
    })
  })

  it('no domain has a split, a merge or a note_rest alone in one measure', () => {
    const aloneKinds = ['split_note', 'merge_notes', 'note_rest'] as const
    const offenders = censuses
      .filter((census) => aloneKinds.some((kind) => countIn(census, kind, 'one_measure') > 0))
      .map(domainName)
    expect(offenders).toEqual([])
  })

  it('Straight at Settled and Lift: nothing alone; repeated splits, merges, moves and note_rest', () => {
    const domains = domainsWhere(
      (census) => census.setting.syncopation === 'Straight' && settledOrLift(census.tension),
    )
    expect({
      ...totals(domains),
      alone: pooledByKind(domains, 'one_measure'),
      repeated: {
        ...pooledByKind(domains, 'repeated'),
        moveNoteStartByAnEighth: pooled(domains, 'move_note_start', 'repeated', 'by an eighth'),
        noteToRest: pooled(domains, 'note_rest', 'repeated', 'note-to-rest'),
        restToNote: pooled(domains, 'note_rest', 'repeated', 'rest-to-note'),
      },
    }).toEqual({
      domains: 54,
      candidates: 3_866,
      alone: { move_note_start: 0, move_rest: 0, split_note: 0, merge_notes: 0, note_rest: 0 },
      repeated: {
        move_note_start: 1_022,
        move_rest: 0,
        split_note: 2_688,
        merge_notes: 616,
        note_rest: 724,
        moveNoteStartByAnEighth: 1_010,
        noteToRest: 408,
        restToNote: 400,
      },
    })
  })

  it('Straight at Build and Edge: note starts moved by a sixteenth and rests moved, alone', () => {
    const domains = domainsWhere(
      (census) => census.setting.syncopation === 'Straight' && !settledOrLift(census.tension),
    )
    expect({
      ...totals(domains),
      moveNoteStartBySixteenthAlone: pooled(
        domains,
        'move_note_start',
        'one_measure',
        'by a sixteenth',
      ),
      moveRestAlone: pooled(domains, 'move_rest', 'one_measure'),
    }).toEqual({
      domains: 54,
      candidates: 11_380,
      moveNoteStartBySixteenthAlone: 8_080,
      moveRestAlone: 2_196,
    })
  })

  it('Occasional offbeats at every tension: moves alone, rest moves split by tension', () => {
    const domains = domainsWhere((census) => census.setting.syncopation === 'Occasional offbeats')
    const calm = domains.filter((census) => settledOrLift(census.tension))
    const tense = domains.filter((census) => !settledOrLift(census.tension))
    expect({
      ...totals(domains),
      moveNoteStartAlone: pooled(domains, 'move_note_start', 'one_measure'),
      moveNoteStartByAnEighthAlone: pooled(
        domains,
        'move_note_start',
        'one_measure',
        'by an eighth',
      ),
      moveRestAlone: pooled(domains, 'move_rest', 'one_measure'),
      moveRestAloneSettledLift: {
        count: pooled(calm, 'move_rest', 'one_measure'),
        of: totals(calm).candidates,
      },
      moveRestAloneBuildEdge: {
        count: pooled(tense, 'move_rest', 'one_measure'),
        of: totals(tense).candidates,
      },
    }).toEqual({
      domains: 100,
      candidates: 16_668,
      moveNoteStartAlone: 11_128,
      moveNoteStartByAnEighthAlone: 5_012,
      moveRestAlone: 4_774,
      moveRestAloneSettledLift: { count: 1_166, of: 5_016 },
      moveRestAloneBuildEdge: { count: 3_608, of: 11_652 },
    })
  })

  it('Active displacement at every tension: moves alone and repeated, no split, no merge', () => {
    const domains = domainsWhere((census) => census.setting.syncopation === 'Active displacement')
    expect({
      ...totals(domains),
      moveNoteStartAlone: pooled(domains, 'move_note_start', 'one_measure'),
      moveNoteStartRepeated: pooled(domains, 'move_note_start', 'repeated'),
      moveRestAlone: pooled(domains, 'move_rest', 'one_measure'),
      moveRestRepeated: pooled(domains, 'move_rest', 'repeated'),
      splitNote: pooled(domains, 'split_note', 'any'),
      mergeNotes: pooled(domains, 'merge_notes', 'any'),
    }).toEqual({
      domains: 76,
      candidates: 19_398,
      moveNoteStartAlone: 10_528,
      moveNoteStartRepeated: 6_516,
      moveRestAlone: 4_834,
      moveRestRepeated: 3_974,
      splitNote: 0,
      mergeNotes: 0,
    })
  })

  it('Strict at every syncopation: no split, no merge', () => {
    const domains = domainsWhere((census) => census.setting.rhythmicVariety === 'Strict')
    expect({
      ...totals(domains),
      splitNote: pooled(domains, 'split_note', 'any'),
      mergeNotes: pooled(domains, 'merge_notes', 'any'),
    }).toEqual({ domains: 84, candidates: 2_928, splitNote: 0, mergeNotes: 0 })
  })

  it('Strict and Straight: only note_rest, only repeated, in two density and silence pairs', () => {
    const domains = domainsWhere(
      (census) =>
        census.setting.rhythmicVariety === 'Strict' && census.setting.syncopation === 'Straight',
    )
    const offenders = domains
      .filter(
        (census) =>
          RHYTHM_CHANGE_KINDS.some(
            (kind) => kind !== 'note_rest' && countIn(census, kind, 'any') > 0,
          ) || countIn(census, 'note_rest', 'one_measure') > 0,
      )
      .map(domainName)
    expect(offenders).toEqual([])
    const pairs = NOTE_DENSITIES.flatMap((noteDensity) =>
      SILENCE_DENSITIES.map((silenceDensity) => {
        const pair = domains.filter(
          (census) =>
            census.setting.noteDensity === noteDensity &&
            census.setting.silenceDensity === silenceDensity,
        )
        return {
          pair: `${noteDensity} + ${silenceDensity}`,
          noteRest: pooled(pair, 'note_rest', 'repeated'),
          of: totals(pair).candidates,
          noteToRest: pooled(pair, 'note_rest', 'repeated', 'note-to-rest'),
          restToNote: pooled(pair, 'note_rest', 'repeated', 'rest-to-note'),
        }
      }),
    )
    expect(pairs.filter((pair) => pair.noteRest > 0)).toEqual([
      { pair: 'Eighth + Conversational', noteRest: 36, of: 120, noteToRest: 20, restToNote: 16 },
      { pair: 'Sixteenth + Sparse', noteRest: 16, of: 80, noteToRest: 12, restToNote: 12 },
    ])
  })
})
