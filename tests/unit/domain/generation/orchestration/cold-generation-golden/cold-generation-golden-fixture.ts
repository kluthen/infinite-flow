/**
 * Shared builders for the cold-generation golden specs: the 324-setting rhythm catalog in the
 * latency harness's order, the harness's fixed non-rhythm controls, the intents built from them,
 * the sampled settings and control variations, the strong outcome hash and the checked-in golden
 * readers. The golden files were recorded once, on the generator as it stood before the rhythm
 * enumeration/ranking speed-up, and must never be regenerated: they are the gate that proves the
 * faster generator's output is byte-identical.
 */

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import {
  makeGenerationControls,
  NOTE_DENSITIES,
  RHYTHMIC_VARIETIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  TENSION_ARCS,
  type GenerationControls,
  type MusicalProfile,
  type NoteDensity,
  type RhythmicVariety,
  type SilenceDensity,
  type Syncopation,
  type TensionArc,
} from '@/domain/controls/generation-controls'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { rankMaterializedRhythmCandidates } from '@/domain/generation/orchestration/candidate-ranking'
import {
  createCanonicalRhythmDomainMemo,
  type CanonicalRhythmDomain,
} from '@/domain/generation/orchestration/canonical-rhythm-domain'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { makeSeed } from '@/domain/random/seed'
import { isNoLegalRhythmPlan } from '@/domain/rhythm/rhythm-planner'
import { buildIntent, carryInAfter, generateSuccess } from '../../carry-in/carry-in-fixture'

/** The five rhythm-relevant controls: one point of the 3 x 3 x 3 x 3 x 4 rhythm catalog. */
export interface RhythmSetting {
  readonly noteDensity: NoteDensity
  readonly rhythmicVariety: RhythmicVariety
  readonly silenceDensity: SilenceDensity
  readonly syncopation: Syncopation
  readonly tensionArc: TensionArc
}

/** A variation of the non-rhythm controls and musical profile laid over the harness defaults. */
export interface ControlVariation {
  readonly name: string
  readonly controls: Partial<GenerationControls>
  readonly musicalProfile?: MusicalProfile
}

/** Intent: the stable `density|variety|silence|syncopation|tension` key of one rhythm setting. */
export function settingKey(setting: RhythmSetting): string {
  return `${setting.noteDensity}|${setting.rhythmicVariety}|${setting.silenceDensity}|${setting.syncopation}|${setting.tensionArc}`
}

/** Intent: parse a `settingKey` string back into its rhythm setting. */
export function parseSettingKey(key: string): RhythmSetting {
  const [noteDensity, rhythmicVariety, silenceDensity, syncopation, tensionArc] = key.split('|')
  return {
    noteDensity: noteDensity as NoteDensity,
    rhythmicVariety: rhythmicVariety as RhythmicVariety,
    silenceDensity: silenceDensity as SilenceDensity,
    syncopation: syncopation as Syncopation,
    tensionArc: tensionArc as TensionArc,
  }
}

/** Intent: every one of the 324 rhythm settings, in the latency harness's fixed nesting order. */
export function allRhythmSettings(): readonly RhythmSetting[] {
  return NOTE_DENSITIES.flatMap((noteDensity) =>
    RHYTHMIC_VARIETIES.flatMap((rhythmicVariety) =>
      SILENCE_DENSITIES.flatMap((silenceDensity) =>
        SYNCOPATIONS.flatMap((syncopation) =>
          TENSION_ARCS.map((tensionArc): RhythmSetting => ({
            noteDensity,
            rhythmicVariety,
            silenceDensity,
            syncopation,
            tensionArc,
          })),
        ),
      ),
    ),
  )
}

/** The catalog seeds: seed 1 is each setting's cold call, seeds 2..10 reuse its warm memo. */
export const CATALOG_SEEDS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

/** The three slowest settings of the latency measurements (largest rhythm domains). */
export const WORST_SETTING_KEYS: readonly string[] = [
  'Sixteenth|Heavily varied|Sparse|Active displacement|Build',
  'Sixteenth|Heavily varied|Sparse|Active displacement|Edge',
  'Sixteenth|Heavily varied|Sparse|Straight|Build',
]

/** Intent: the latency harness's control policy for one rhythm setting, with optional overrides. */
export function buildControls(
  setting: RhythmSetting,
  overrides: Partial<GenerationControls> = {},
): GenerationControls {
  return makeGenerationControls({
    tempo: 90,
    tonalCenter: 'C',
    collection: 'Major',
    harmonicMotion: 'Gentle diatonic',
    tension: setting.tensionArc,
    noteDensity: setting.noteDensity,
    rhythmicVariety: setting.rhythmicVariety,
    syncopation: setting.syncopation,
    silenceDensity: setting.silenceDensity,
    contour: 'Arch',
    register: 'Middle',
    leapiness: 'Shaped',
    arpeggioChaos: 'Predictable',
    instrumentProfileId: 'bb-tenor',
    ...overrides,
  })
}

/** Intent: the real intent for one catalog setting and seed, harness controls and Neutral profile. */
export function buildCatalogIntent(setting: RhythmSetting, seed: number): GenerationIntent {
  return buildVariationIntent(setting, { name: 'catalog', controls: {} }, seed)
}

/** Intent: the real intent for one rhythm setting under one non-rhythm control variation. */
export function buildVariationIntent(
  setting: RhythmSetting,
  variation: ControlVariation,
  seed: number,
): GenerationIntent {
  return createGenerationIntent({
    requestId: makeRequestId(`cold-golden-${variation.name}-${settingKey(setting)}-${seed}`),
    seed: makeSeed(seed),
    controls: buildControls(setting, variation.controls),
    musicalProfile: { musicalProfile: variation.musicalProfile ?? 'Neutral', isCustom: true },
  })
}

/** Settings of the carry-in chain sample: the three worst plus a spread of cheaper ones. */
export const CARRY_IN_SETTING_KEYS: readonly string[] = [
  ...WORST_SETTING_KEYS,
  'Quarter|Slightly varied|Sparse|Straight|Settled',
  'Eighth|Heavily varied|Conversational|Occasional offbeats|Lift',
  'Sixteenth|Strict|Breath-heavy|Straight|Settled',
  'Eighth|Slightly varied|Breath-heavy|Active displacement|Edge',
  'Quarter|Heavily varied|Conversational|Active displacement|Build',
]

/** First-phrase seeds of the carry-in chains; phrase n of a chain uses seed + 100 * (n - 1). */
export const CARRY_IN_SEEDS: readonly number[] = [1, 2, 3]

/** Settings the non-rhythm variations are laid over: the three worst plus one mid-size setting. */
export const VARIATION_SETTING_KEYS: readonly string[] = [
  ...WORST_SETTING_KEYS,
  'Eighth|Slightly varied|Conversational|Occasional offbeats|Lift',
]

/** Seeds of the non-rhythm variation sample. */
export const VARIATION_SEEDS: readonly number[] = [1, 2, 3]

/** Non-rhythm control variations: every other control, register mode and both profiles moved. */
export const CONTROL_VARIATIONS: readonly ControlVariation[] = [
  { name: 'f-sharp-dorian', controls: { tonalCenter: 'F#', collection: 'Dorian' } },
  {
    name: 'minor-active-high',
    controls: { collection: 'Minor', harmonicMotion: 'Active diatonic', register: 'High' },
  },
  {
    name: 'static-falling-angular-low',
    controls: {
      harmonicMotion: 'Static',
      contour: 'Falling',
      leapiness: 'Angular',
      register: 'Low',
    },
  },
  {
    name: 'varying-chaotic-rising',
    controls: { register: 'Varying', arpeggioChaos: 'Chaotic', contour: 'Rising' },
  },
  {
    name: 'jazz-mixolydian-alto',
    controls: { collection: 'Mixolydian', tempo: 140, instrumentProfileId: 'eb-alto' },
    musicalProfile: 'Jazz',
  },
  {
    name: 'keyboard-locrian-smooth',
    controls: {
      instrumentProfileId: 'c-keyboard',
      tonalCenter: 'A#',
      collection: 'Locrian',
      leapiness: 'Smooth',
      arpeggioChaos: 'Varied',
      contour: 'Wandering',
    },
  },
]

/**
 * Settings of the memo and ranking sample: the three worst, one documented no-plan setting and a
 * spread of small and mid-size settings.
 */
export const MEMO_SETTING_KEYS: readonly string[] = [
  ...WORST_SETTING_KEYS,
  'Quarter|Strict|Sparse|Active displacement|Settled',
  'Quarter|Strict|Sparse|Straight|Settled',
  'Quarter|Heavily varied|Breath-heavy|Straight|Edge',
  'Eighth|Slightly varied|Conversational|Occasional offbeats|Lift',
  'Eighth|Heavily varied|Sparse|Active displacement|Build',
  'Sixteenth|Strict|Conversational|Straight|Settled',
  'Sixteenth|Slightly varied|Conversational|Occasional offbeats|Lift',
]

/** Seeds of the ranking sample. */
export const RANKING_SEEDS: readonly number[] = Array.from({ length: 20 }, (_, index) => index + 1)

/** Intent: the strong hash of a text: sha256 hex truncated to 16 characters. */
export function strongHash(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 16)
}

/** Intent: the strong hash of one value's `JSON.stringify` serialization. */
export function jsonHash(value: unknown): string {
  return strongHash(JSON.stringify(value))
}

/** Intent: the absolute path of one golden file next to this fixture module. */
export function goldenPath(fileName: string): string {
  return fileURLToPath(new URL(`./${fileName}`, import.meta.url))
}

/** Intent: read and parse one checked-in golden file next to this fixture module. */
export function readGolden<T>(fileName: string): T {
  return JSON.parse(readFileSync(goldenPath(fileName), 'utf8')) as T
}

/** The catalog golden: per setting key, the outcome hashes of seeds 1..10 on one fresh memo. */
export interface CatalogGolden {
  readonly seeds: readonly number[]
  readonly settings: Readonly<Record<string, readonly string[]>>
}

/** The carry-in golden: per `setting key#first seed`, the three chained outcome hashes. */
export interface CarryInGolden {
  readonly chains: Readonly<Record<string, readonly string[]>>
}

/** The variation golden: per `variation name#setting key`, the outcome hashes of seeds 1..3. */
export interface VariationGolden {
  readonly cases: Readonly<Record<string, readonly string[]>>
}

/** One memo sample entry: the domain's kind, candidate count and list hash, and its rankings. */
export interface MemoGoldenEntry {
  readonly kind: string
  readonly count: number
  readonly candidatesHash: string
  readonly rankings: readonly {
    readonly seed: number
    readonly orderHash: string
    readonly first: readonly number[]
  }[]
}

/** The memo and ranking golden, per setting key. */
export interface MemoGolden {
  readonly settings: Readonly<Record<string, MemoGoldenEntry>>
}

/**
 * Intent: the catalog hashes of one setting: seeds 1..10 generated in order on one fresh memo, so
 * seed 1 is the cold call and every later seed a warm one.
 */
export function catalogHashes(setting: RhythmSetting): readonly string[] {
  const memo = createCanonicalRhythmDomainMemo()
  return CATALOG_SEEDS.map((seed) =>
    jsonHash(generatePhrase(buildCatalogIntent(setting, seed), { rhythmDomainMemo: memo })),
  )
}

/** Intent: the carry-in chain key of one setting and first-phrase seed. */
export function chainKey(key: string, seed: number): string {
  return `${key}#${seed}`
}

/**
 * Intent: the outcome hashes of a three-phrase chain on one setting: phrase 1 without carry-in,
 * phrases 2 and 3 each carrying in from the phrase before, seeds `seed`, `seed + 100`, `seed + 200`.
 */
export function carryInChainHashes(setting: RhythmSetting, seed: number): readonly string[] {
  const controls: Partial<GenerationControls> = {
    noteDensity: setting.noteDensity,
    rhythmicVariety: setting.rhythmicVariety,
    silenceDensity: setting.silenceDensity,
    syncopation: setting.syncopation,
    tension: setting.tensionArc,
  }
  const label = `cold-golden-chain-${settingKey(setting)}`
  let intent = buildIntent({ controls, seed, label })
  let outcome = generateSuccess(intent)
  const hashes = [jsonHash(outcome)]
  for (const phraseNumber of [2, 3]) {
    const carryIn = carryInAfter(intent, outcome, phraseNumber - 1)
    intent = buildIntent({ controls, seed: seed + 100 * (phraseNumber - 1), carryIn, label })
    outcome = generateSuccess(intent)
    hashes.push(jsonHash(outcome))
  }
  return hashes
}

/** Intent: the variation case key of one control variation and setting. */
export function variationKey(variation: ControlVariation, key: string): string {
  return `${variation.name}#${key}`
}

/** Intent: the outcome hashes of one setting under one variation, seeds 1..3 on one fresh memo. */
export function variationHashes(
  setting: RhythmSetting,
  variation: ControlVariation,
): readonly string[] {
  const memo = createCanonicalRhythmDomainMemo()
  return VARIATION_SEEDS.map((seed) =>
    jsonHash(
      generatePhrase(buildVariationIntent(setting, variation, seed), { rhythmDomainMemo: memo }),
    ),
  )
}

/** Intent: a fresh memo's canonical rhythm domain for one setting (a cold lookup). */
export function freshCanonicalDomain(setting: RhythmSetting): CanonicalRhythmDomain {
  return createCanonicalRhythmDomainMemo().lookup(setting)
}

/**
 * Intent: the memo-list facts of one canonical domain: its kind, candidate count and the hash of
 * its materialized candidate list in canonical order (or of the typed no-plan result).
 */
export function domainFacts(domain: CanonicalRhythmDomain): Omit<MemoGoldenEntry, 'rankings'> {
  if (isNoLegalRhythmPlan(domain))
    return { kind: domain.kind, count: 0, candidatesHash: jsonHash(domain) }
  return {
    kind: domain.kind,
    count: domain.candidates.length,
    candidatesHash: jsonHash(domain.candidates),
  }
}

/**
 * Intent: the ranking facts of one canonical domain: for seeds 1..20, the seeded order as
 * candidateIndex values (hash of the whole sequence plus its first five); none for a no-plan.
 */
export function rankingFacts(domain: CanonicalRhythmDomain): MemoGoldenEntry['rankings'] {
  if (isNoLegalRhythmPlan(domain)) return []
  return RANKING_SEEDS.map((seed) => {
    const ranked = rankMaterializedRhythmCandidates(
      domain.grammarVersion,
      domain.candidates,
      makeSeed(seed),
    )
    const order = ranked.candidates.map((candidate) => candidate.candidateIndex)
    return { seed, orderHash: strongHash(order.join(',')), first: order.slice(0, 5) }
  })
}

/** Intent: the full memo and ranking golden entry of one setting, from one cold lookup. */
export function memoEntry(setting: RhythmSetting): MemoGoldenEntry {
  const domain = freshCanonicalDomain(setting)
  return { ...domainFacts(domain), rankings: rankingFacts(domain) }
}
