/**
 * The lock census's tally (measurement tooling, never product code): many sessions' censuses
 * (lock-census.ts) and draws turned into JSON-serialisable figures and readable `LOCK-CENSUS`
 * lines: the shares of kept, changed and bent phrases, the share of eligible phrases that drew
 * (normal and tenser), the no-change split, the bend rate per tension and per tension step, and
 * the mismatches between the provenance and the bars.
 */

import { TENSION_ARCS, type TensionArc } from '@/domain/controls/generation-controls'
import { RHYTHM_CHANGE_KINDS, type RhythmChangeKind } from '@/domain/generation/request-rhythm-lock'
import {
  BEND_REASONS,
  addCounts,
  emptyCounts,
  perKind,
  perReason,
  requireKnownKinds,
  type BendReason,
  type CensusClass,
  type CensusEntry,
  type ChangeAvailability,
  type LockCounts,
  type SessionLockCensus,
} from './lock-census'

/** A count and its share of a denominator (null when the denominator is zero). */
export interface CountShare {
  readonly count: number
  readonly share: number | null
}

/** Eligible phrases, those that drew, and the share that drew. */
export interface DrawnShare {
  readonly eligible: number
  readonly drew: number
  readonly share: number | null
}

/** Classified phrases, the bends among them, and the bend rate. */
export interface BendRate {
  readonly phrases: number
  readonly bends: number
  readonly bendRate: number | null
}

/** The tally's figures, JSON-serialisable; a share is null when its denominator is zero. */
export interface LockCensusFigures {
  readonly sessions: number
  /** Kept, changed and bent phrases: the denominator of the phrase shares. */
  readonly classifiedPhrases: number
  readonly relocks: number
  readonly repeats: number
  readonly counts: Pick<LockCounts, 'kept' | 'changesByKind' | 'bends' | 'bendsByReason'>
  readonly shares: {
    readonly kept: number | null
    readonly changed: number | null
    readonly changedByKind: Readonly<Record<RhythmChangeKind, number | null>>
    readonly bent: number | null
    readonly bentByReason: Readonly<Record<BendReason, number | null>>
  }
  /** Of the bends, the share one allowed change away from the locked rhythm. */
  readonly bentOneAllowedChangeAway: number | null
  /** The eligible phrases that drew: all, normal (not tenser) and tenser. */
  readonly drawn: DrawnShare & { readonly normal: DrawnShare; readonly tenser: DrawnShare }
  /** Changes over eligible phrases. */
  readonly changedOfEligible: number | null
  /**
   * Of the phrases that drew, those with no change available, split (by the draws fed with what
   * they drew) into no candidate of an allowed kind and candidates that made no phrase (D435).
   */
  readonly noChange: {
    readonly drew: number
    readonly noChangeAvailable: CountShare
    readonly noCandidate: CountShare
    readonly candidatesFailed: CountShare
  }
  readonly draws: number
  readonly noCandidate: {
    readonly byKind: Readonly<Record<RhythmChangeKind, number | null>>
    readonly anyAllowedKind: number | null
  }
  /** Per tension in effect, the classified phrases and their bends. */
  readonly byTension: Readonly<Partial<Record<TensionArc, BendRate>>>
  /** Per tension step (`from→to arc` or `from→to vary`), the classified phrases and their bends. */
  readonly tensionSteps: Readonly<Record<string, BendRate>>
  readonly mismatches: { readonly count: number; readonly first: readonly string[] }
}

/** What a draw drew, as its phrase's record says. */
export interface DrawnRecord {
  readonly drew: boolean
  readonly noChangeAvailable: boolean
}

/** The most mismatch lines a tally keeps; the count covers them all. */
const MAX_MISMATCH_LINES = 10

/** The classes a tension tally counts. */
const CLASSIFIED: ReadonlySet<CensusClass['kind']> = new Set(['kept', 'change', 'bend'])

/** Intent: a ratio, or null when its denominator is zero. */
function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator
}

/** Intent: a share as a percentage to one decimal, or a dash when it is null. */
function percent(share: number | null): string {
  return `${share === null ? '-' : (share * 100).toFixed(1)} %`
}

/** Intent: one share per change kind, as `kind 12.5 %`, comma-separated. */
function kindShares(record: Readonly<Record<RhythmChangeKind, number | null>>): string {
  return RHYTHM_CHANGE_KINDS.map((kind) => `${kind} ${percent(record[kind])}`).join(', ')
}

/** Intent: add one classified phrase, bent or not, to a bucket of a phrases-and-bends tally. */
function addBend(
  tally: Map<string, { phrases: number; bends: number }>,
  key: string,
  bent: boolean,
): void {
  const bucket = tally.get(key) ?? { phrases: 0, bends: 0 }
  bucket.phrases += 1
  if (bent) bucket.bends += 1
  tally.set(key, bucket)
}

/** Intent: a phrases-and-bends bucket with its bend rate. */
function bendRate({ phrases, bends }: { phrases: number; bends: number }): BendRate {
  return { phrases, bends, bendRate: ratio(bends, phrases) }
}

/** Intent: eligible phrases and those that drew, with the share. */
function drawnShare(eligible: number, drew: number): DrawnShare {
  return { eligible, drew, share: ratio(drew, eligible) }
}

/** The running lock census of many sessions and draws, fed one at a time. */
export class LockCensusTally {
  private sessions = 0
  private readonly counts = emptyCounts()
  private draws = 0
  private readonly missingByKind = perKind(() => 0)
  private missingAnyAllowed = 0
  private noCandidate = 0
  private candidatesFailed = 0
  private readonly byTension = new Map<string, { phrases: number; bends: number }>()
  private readonly tensionSteps = new Map<string, { phrases: number; bends: number }>()
  private mismatchCount = 0
  private readonly firstMismatches: string[] = []

  /** Intent: add one session's census: its counts, its tensions and tension steps, its mismatches. */
  addSession(census: SessionLockCensus): void {
    const { counts } = census
    this.sessions += 1
    addCounts(this.counts, counts)
    for (const entry of census.phrases) this.addTensions(entry)
    this.mismatchCount += counts.mismatches.length
    for (const line of counts.mismatches)
      if (this.firstMismatches.length < MAX_MISMATCH_LINES)
        this.firstMismatches.push(`session ${this.sessions}, ${line}`)
  }

  /** Intent: add a classified phrase to its tension, and to its tension step when it has one. */
  private addTensions(entry: CensusEntry): void {
    if (!CLASSIFIED.has(entry.lockClass.kind)) return
    const bent = entry.lockClass.kind === 'bend'
    addBend(this.byTension, entry.tension, bent)
    const from = entry.previousTension
    if (from === undefined || from === entry.tension) return
    const cause = entry.varyTensionStep === undefined ? 'arc' : 'vary'
    addBend(this.tensionSteps, `${from}→${entry.tension} ${cause}`, bent)
  }

  /**
   * Intent: add one draw's availability, read against the allowed list it was drawn with, and,
   * when given what the phrase drew, a draw with no change available as no candidate (no allowed
   * kind available) or candidates failed (some existed, none made a phrase). Throws on an empty
   * list: with nothing allowed the lock is strict and no draw happens.
   */
  addDraw(
    availability: ChangeAvailability,
    allowed: readonly RhythmChangeKind[],
    drawn?: DrawnRecord,
  ): void {
    if (allowed.length === 0)
      throw new Error('A draw needs a non-empty allowed list; with none, nothing is drawn.')
    requireKnownKinds(allowed)
    this.draws += 1
    for (const kind of RHYTHM_CHANGE_KINDS) if (!availability[kind]) this.missingByKind[kind] += 1
    const anyAvailable = allowed.some((kind) => availability[kind])
    if (!anyAvailable) this.missingAnyAllowed += 1
    if (drawn?.drew !== true || !drawn.noChangeAvailable) return
    if (anyAvailable) this.candidatesFailed += 1
    else this.noCandidate += 1
  }

  /** Intent: the figures so far: counts, shares of the phrases and draws, tensions, mismatches. */
  figures(): LockCensusFigures {
    const { counts } = this
    const changed = RHYTHM_CHANGE_KINDS.reduce((sum, kind) => sum + counts.changesByKind[kind], 0)
    const classified = counts.kept + changed + counts.bends
    /** Intent: a count's share of the classified phrases. */
    const share = (count: number): number | null => ratio(count, classified)
    /** Intent: a count and its share of the phrases that drew. */
    const ofDrew = (count: number): CountShare => ({ count, share: ratio(count, counts.drew) })
    return {
      sessions: this.sessions,
      classifiedPhrases: classified,
      relocks: counts.relocks,
      repeats: counts.repeats,
      counts: {
        kept: counts.kept,
        changesByKind: { ...counts.changesByKind },
        bends: counts.bends,
        bendsByReason: { ...counts.bendsByReason },
      },
      shares: {
        kept: share(counts.kept),
        changed: share(changed),
        changedByKind: perKind((kind) => share(counts.changesByKind[kind])),
        bent: share(counts.bends),
        bentByReason: perReason((reason) => share(counts.bendsByReason[reason])),
      },
      bentOneAllowedChangeAway: ratio(counts.bendsByReason['one-allowed-change'], counts.bends),
      drawn: {
        ...drawnShare(counts.eligible, counts.drew),
        normal: drawnShare(
          counts.eligible - counts.eligibleTenser,
          counts.drew - counts.drewTenser,
        ),
        tenser: drawnShare(counts.eligibleTenser, counts.drewTenser),
      },
      changedOfEligible: ratio(changed, counts.eligible),
      noChange: {
        drew: counts.drew,
        noChangeAvailable: ofDrew(counts.noChangeAvailable),
        noCandidate: ofDrew(this.noCandidate),
        candidatesFailed: ofDrew(this.candidatesFailed),
      },
      draws: this.draws,
      noCandidate: {
        byKind: perKind((kind) => ratio(this.missingByKind[kind], this.draws)),
        anyAllowedKind: ratio(this.missingAnyAllowed, this.draws),
      },
      byTension: Object.fromEntries(
        TENSION_ARCS.filter((tension) => this.byTension.has(tension)).map((tension) => [
          tension,
          bendRate(this.byTension.get(tension)!),
        ]),
      ),
      tensionSteps: Object.fromEntries(
        [...this.tensionSteps.keys()]
          .sort()
          .map((key) => [key, bendRate(this.tensionSteps.get(key)!)]),
      ),
      mismatches: { count: this.mismatchCount, first: [...this.firstMismatches] },
    }
  }

  /** Intent: the readable summary of the figures, every line prefixed `LOCK-CENSUS [label]`. */
  lines(label: string): string[] {
    const figures = this.figures()
    const { counts, shares, noCandidate, drawn, noChange } = figures
    const reasons = BEND_REASONS.map(
      (reason) => `${reason} ${percent(shares.bentByReason[reason])}`,
    ).join(', ')
    const tensions =
      Object.entries(figures.byTension)
        .map(([tension, rate]) => `${tension} ${percent(rate.bendRate)} of ${rate.phrases}`)
        .join(', ') || 'none'
    const steps = Object.entries(figures.tensionSteps).map(
      ([key, rate]) =>
        `tension step ${key}: ${rate.phrases} phrases, bends ${percent(rate.bendRate)}`,
    )
    return [
      `${figures.sessions} sessions, ${figures.classifiedPhrases} phrases after phrase 1 classified, ${figures.relocks} re-locks, ${figures.repeats} repeats`,
      `kept ${percent(shares.kept)}, changed ${percent(shares.changed)}, bent ${percent(shares.bent)} (${reasons})`,
      `changed by kind: ${kindShares(shares.changedByKind)}`,
      `${figures.draws} draws, no candidate: ${kindShares(noCandidate.byKind)}, any allowed kind ${percent(noCandidate.anyAllowedKind)}`,
      `drew a change: ${percent(drawn.share)} of ${drawn.eligible} eligible (normal ${percent(drawn.normal.share)} of ${drawn.normal.eligible}, tenser ${percent(drawn.tenser.share)} of ${drawn.tenser.eligible}), changed of eligible ${percent(figures.changedOfEligible)}`,
      `no change available: ${noChange.noChangeAvailable.count} of ${noChange.drew} that drew (${percent(noChange.noChangeAvailable.share)}): no candidate ${percent(noChange.noCandidate.share)}, candidates failed ${percent(noChange.candidatesFailed.share)}`,
      `bends one allowed change away: ${counts.bendsByReason['one-allowed-change']} of ${counts.bends} (${percent(figures.bentOneAllowedChangeAway)})`,
      `bend rate by tension: ${tensions}`,
      ...steps,
      `mismatches: ${figures.mismatches.count}`,
    ].map((line) => `LOCK-CENSUS [${label}] ${line}`)
  }
}
