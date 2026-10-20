import { makeConcertPitch } from '../events/concert-pitch'
import { deepFreeze } from '../events/deep-freeze'
import {
  allowsChromaticNotes,
  allowsFreeFigure,
  FIGURE_IDS,
  type FigureId,
  type FigureLevels,
} from '../figures/figure-levels'
import {
  phraseEndingDebtAllowance,
  tenseNoteCanSettle,
} from '../generation/carry-in/phrase-ending-debt'
import type {
  BoundPitchPlannerInput,
  FreeToneResolution,
  PitchAttack,
  PitchCandidate,
  PitchFigureKind,
  PitchReservation,
  PitchRole,
} from './pitch-types'

/** One candidate before octave identity and enumeration index are assigned. */
interface RawCandidate {
  readonly role: PitchRole
  readonly midi: number
  readonly obligation: string
  readonly reservation?: PitchReservation
  readonly freeResolution?: FreeToneResolution
  readonly figures?: readonly FigureId[]
}

/** A concrete figure: member attacks, target attack, member roles, and every MIDI value. */
interface FigurePath {
  readonly kind: PitchFigureKind
  readonly bindingIdentity?: string
  readonly attackIndices: readonly number[]
  readonly targetAttackIndex: number
  readonly roles: readonly PitchRole[]
  /** Member MIDI values followed by the target MIDI value. */
  readonly midis: readonly number[]
}

/**
 * Canonical domains of free attacks (outside the bound figure), shared by every harmony/rhythm
 * pair searched under one request, collection and free-figure allowance. Beyond those, such a
 * domain reads only a few facts of its attack and its neighbours, which `freeDomainKey` spells
 * out.
 */
export interface FreeDomainStore {
  readonly request: BoundPitchPlannerInput['request']
  readonly collection: readonly number[]
  /** Which figures the levels allow as free figures, as `freeFigureAllowanceKey` spells it. */
  readonly allowance: string
  readonly playable: readonly number[]
  /** Domains by `freeDomainKey`. */
  readonly domains: Map<string, readonly PitchCandidate[]>
}

/**
 * The free-attack domains of one phrase's attacks, kept for reuse across its tension bindings: a
 * fast index over the shared store, valid only for the same `attacks` object.
 */
export interface CandidateDomainMemo {
  readonly attacks: readonly PitchAttack[]
  readonly store: FreeDomainStore
  /** Domains by `domainMemoKey`. */
  readonly domains: Map<number, readonly PitchCandidate[]>
}

/** Shared read-only facts for enumerating one phrase. */
interface DomainFacts {
  readonly input: BoundPitchPlannerInput
  readonly attacks: readonly PitchAttack[]
  readonly collection: readonly number[]
  readonly playable: readonly number[]
  readonly boundAttacks: ReadonlySet<number>
}

/**
 * Which figures the levels let the search write as free figures: one `1` (allowed) or `0` (off)
 * digit per figure, in FIGURE_IDS order. Two levels values with the same key give the same free
 * domains.
 */
export function freeFigureAllowanceKey(levels: FigureLevels): string {
  return FIGURE_IDS.map((figure) => (allowsFreeFigure(levels, figure) ? '1' : '0')).join('')
}

/** Pitch class of a MIDI value. */
function pc(midi: number): number {
  return ((midi % 12) + 12) % 12
}

/** Every MIDI value inside both the active concert range and the register window, ascending. */
function playableMidis(input: BoundPitchPlannerInput): readonly number[] {
  const { activeConcertRange: range, registerWindow: window } = input.request
  const low = Math.max(range.minMidi, window.minMidi)
  const high = Math.min(range.maxMidi, window.maxMidi)
  return Array.from({ length: Math.max(high - low + 1, 0) }, (_, index) => low + index)
}

/** Chord-tone MIDI values sounding legally at an attack. */
function chordMidis(facts: DomainFacts, attack: PitchAttack): readonly number[] {
  return facts.playable.filter((midi) => attack.chordPitchClasses.includes(pc(midi)))
}

/** True when collection members `a` and `b` are 1-2 semitones apart. */
function isCollectionStep(facts: DomainFacts, a: number, b: number): boolean {
  const distance = Math.abs(a - b)
  return (
    distance >= 1 &&
    distance <= 2 &&
    facts.collection.includes(pc(a)) &&
    facts.collection.includes(pc(b))
  )
}

/** True when attacks sound back to back under one harmony event. */
function tight(group: readonly PitchAttack[]): boolean {
  return group.every(
    (attack, index) =>
      index === 0 ||
      (group[index - 1]!.end === attack.start && attack.harmonyIndex === group[0]!.harmonyIndex),
  )
}

/** Diatonic non-chord MIDI values at an attack. */
// @spec-link [[rule_neutral_profile_diatonic_pitches]]
function diatonicNonChord(facts: DomainFacts, attack: PitchAttack): readonly number[] {
  return facts.playable.filter(
    (midi) => facts.collection.includes(pc(midi)) && !attack.chordPitchClasses.includes(pc(midi)),
  )
}

/**
 * Playable first members of a two-note approach through `tone` to `goal`, ascending: a collection
 * step into `tone` in the same direction as the step from `tone` to `goal`.
 */
function twoNoteApproachStarts(facts: DomainFacts, tone: number, goal: number): readonly number[] {
  return facts.playable.filter(
    (first) =>
      isCollectionStep(facts, first, tone) && Math.sign(tone - first) === Math.sign(goal - tone),
  )
}

/**
 * Concrete paths for the selected binding. Single-member figures step 1-2 semitones from a
 * diatonic non-chord member to a chord-tone target; a two-note approach is two same-direction
 * collection steps whose second member is a non-chord tone.
 */
function boundPaths(facts: DomainFacts): readonly FigurePath[] {
  const binding = facts.input.tensionBinding
  if (!binding.figureKind || binding.targetAttackIndex === undefined) return []
  const target = facts.attacks[binding.targetAttackIndex]
  const members = binding.attackIndices.map((index) => facts.attacks[index])
  if (!target || members.some((member) => !member)) return []
  const last = members.at(-1)!
  const base = {
    kind: binding.figureKind,
    bindingIdentity: binding.identity,
    attackIndices: binding.attackIndices,
    targetAttackIndex: target.attackIndex,
  }
  const paths: FigurePath[] = []
  for (const goal of chordMidis(facts, target))
    for (const tone of diatonicNonChord(facts, last)) {
      if (!isCollectionStep(facts, tone, goal)) continue
      if (binding.figureKind === 'appoggiatura')
        paths.push({ ...base, roles: ['appoggiatura'], midis: [tone, goal] })
      else if (binding.figureKind === 'diatonic_passing_or_neighbor')
        paths.push({ ...base, roles: ['passing_or_neighbor'], midis: [tone, goal] })
      else
        for (const first of twoNoteApproachStarts(facts, tone, goal))
          paths.push({
            ...base,
            roles: ['diatonic_approach_two', 'diatonic_approach_one'],
            midis: [first, tone, goal],
          })
    }
  return paths
}

/** Chromatic approach paths: one out-of-collection semitone neighbor of the next chord tone. */
function approachPaths(facts: DomainFacts, member: PitchAttack, target: PitchAttack) {
  const paths: FigurePath[] = []
  for (const goal of chordMidis(facts, target))
    for (const tone of [goal - 1, goal + 1])
      if (facts.playable.includes(tone) && !facts.collection.includes(pc(tone)))
        paths.push({
          kind: 'chromatic_approach',
          attackIndices: [member.attackIndex],
          targetAttackIndex: target.attackIndex,
          roles: ['chromatic_approach'],
          midis: [tone, goal],
        })
  return paths
}

/** Chromatic enclosure paths: the semitones above and below the target, in either order. */
function enclosurePaths(facts: DomainFacts, group: readonly PitchAttack[]) {
  const paths: FigurePath[] = []
  const target = group[2]!
  for (const goal of chordMidis(facts, target))
    for (const first of [goal + 1, goal - 1]) {
      const second = 2 * goal - first
      if (!facts.playable.includes(first) || !facts.playable.includes(second)) continue
      if (facts.collection.includes(pc(first)) && facts.collection.includes(pc(second))) continue
      paths.push({
        kind: 'chromatic_enclosure',
        attackIndices: [group[0]!.attackIndex, group[1]!.attackIndex],
        targetAttackIndex: target.attackIndex,
        roles: [
          first > goal ? 'chromatic_enclosure_upper' : 'chromatic_enclosure_lower',
          first > goal ? 'chromatic_enclosure_lower' : 'chromatic_enclosure_upper',
        ],
        midis: [first, second, goal],
      })
    }
  return paths
}

/** True when the attack at `index` is not a member of the bound figure. */
function isFree(facts: DomainFacts, index: number): boolean {
  return !facts.boundAttacks.has(index)
}

/**
 * True when a chromatic approach from the attack at `index` onto the next attack is offered: the
 * member is free of the bound figure, sounds back to back with its target under one harmony
 * event, and lasts no longer than the target.
 */
function approachOffered(facts: DomainFacts, index: number): boolean {
  const member = facts.attacks[index]
  const next = facts.attacks[index + 1]
  return (
    member !== undefined &&
    next !== undefined &&
    isFree(facts, index) &&
    tight([member, next]) &&
    member.durationTicks <= next.durationTicks
  )
}

/**
 * True when a chromatic enclosure with members at `index` and `index + 1` around the attack after
 * them is offered: both members are free of the bound figure, all three sound back to back under
 * one harmony event, and neither member lasts longer than the target.
 */
function enclosureOffered(facts: DomainFacts, index: number): boolean {
  const member = facts.attacks[index]
  const next = facts.attacks[index + 1]
  const target = facts.attacks[index + 2]
  return (
    member !== undefined &&
    next !== undefined &&
    target !== undefined &&
    isFree(facts, index) &&
    isFree(facts, index + 1) &&
    tight([member, next, target]) &&
    member.durationTicks <= target.durationTicks &&
    next.durationTicks <= target.durationTicks
  )
}

/**
 * True when a free appoggiatura on the attack at `index`, resolving onto the next attack, is
 * offered: the member is free of the bound figure, neither the phrase's first nor its final
 * attack, falls on beat 1 or 3, and its target sounds under the same harmony event (a rest may
 * come between them). Its leap entry is checked when the search reaches it.
 */
// @spec-link [[rule_embellishment_figures_defined]]
function appoggiaturaOffered(facts: DomainFacts, index: number): boolean {
  const member = facts.attacks[index]
  const next = facts.attacks[index + 1]
  return (
    member !== undefined &&
    next !== undefined &&
    index > 0 &&
    !member.isFinal &&
    isFree(facts, index) &&
    (member.startTick === 0 || member.startTick === 8) &&
    next.harmonyIndex === member.harmonyIndex
  )
}

/**
 * True when a diatonic enclosure with members at `index` and `index + 1` around the attack after
 * them is offered: both members are free of the bound figure and all three sound back to back
 * under one harmony event. Unlike the chromatic enclosure, no member length is limited.
 */
// @spec-link [[rule_embellishment_figures_defined]]
function diatonicEnclosureOffered(facts: DomainFacts, index: number): boolean {
  const member = facts.attacks[index]
  const next = facts.attacks[index + 1]
  const target = facts.attacks[index + 2]
  return (
    member !== undefined &&
    next !== undefined &&
    target !== undefined &&
    isFree(facts, index) &&
    isFree(facts, index + 1) &&
    tight([member, next, target])
  )
}

/**
 * Free appoggiatura paths: a diatonic non-chord member one collection step from a chord tone of
 * the next attack, which it resolves onto.
 */
function appoggiaturaPaths(
  facts: DomainFacts,
  member: PitchAttack,
  target: PitchAttack,
): readonly FigurePath[] {
  const paths: FigurePath[] = []
  for (const goal of chordMidis(facts, target))
    for (const tone of diatonicNonChord(facts, member))
      if (isCollectionStep(facts, tone, goal))
        paths.push({
          kind: 'appoggiatura',
          attackIndices: [member.attackIndex],
          targetAttackIndex: target.attackIndex,
          roles: ['appoggiatura'],
          midis: [tone, goal],
        })
  return paths
}

/**
 * The playable collection note one collection step from `goal` in `direction` (+1 above, -1
 * below) that is not a chord tone of `attack`, if any. The collections are diatonic modes, so
 * there is exactly one collection step on each side.
 */
function enclosingStep(
  facts: DomainFacts,
  attack: PitchAttack,
  goal: number,
  direction: 1 | -1,
): number | undefined {
  return [goal + direction, goal + 2 * direction].find(
    (midi) =>
      isCollectionStep(facts, midi, goal) &&
      facts.playable.includes(midi) &&
      !attack.chordPitchClasses.includes(pc(midi)),
  )
}

/**
 * Diatonic enclosure paths: the non-chord collection notes one step above and one step below a
 * chord tone of the target, in either order, then the target.
 */
function diatonicEnclosurePaths(
  facts: DomainFacts,
  group: readonly PitchAttack[],
): readonly FigurePath[] {
  const paths: FigurePath[] = []
  const [first, second, target] = [group[0]!, group[1]!, group[2]!]
  for (const goal of chordMidis(facts, target)) {
    const upper = enclosingStep(facts, first, goal, 1)
    const lower = enclosingStep(facts, first, goal, -1)
    if (upper === undefined || lower === undefined) continue
    for (const [start, end] of [
      [upper, lower],
      [lower, upper],
    ] as const)
      paths.push({
        kind: 'diatonic_enclosure',
        attackIndices: [first.attackIndex, second.attackIndex],
        targetAttackIndex: target.attackIndex,
        roles: [
          start > goal ? 'diatonic_enclosure_upper' : 'diatonic_enclosure_lower',
          end > goal ? 'diatonic_enclosure_upper' : 'diatonic_enclosure_lower',
        ],
        midis: [start, end, goal],
      })
  }
  return paths
}

/**
 * Chromatic approach and enclosure ornament paths whose first member's attack index lies in
 * `first..last`, in attack order: at every such attack whose members are free of the bound
 * figure, sound back to back with their target under one harmony event, and last no longer than
 * the target. None when the figure levels allow no chromatic note; otherwise each of the two
 * figures is offered only when its own level is not off.
 */
// @spec-link [[rule_jazz_chromatic_resolution]]
// @spec-link [[rule_chromatic_notes_need_a_chromatic_figure]]
// @spec-link [[rule_figure_level_orders_search]]
// @spec-link [[module_musical_profile_capabilities]]
function chromaticApproachPaths(
  facts: DomainFacts,
  first: number,
  last: number,
): readonly FigurePath[] {
  const levels = facts.input.policy.figureLevels
  if (!allowsChromaticNotes(levels)) return []
  const approachAllowed = allowsFreeFigure(levels, 'chromaticApproach')
  const enclosureAllowed = allowsFreeFigure(levels, 'chromaticEnclosure')
  const paths: FigurePath[] = []
  const { attacks } = facts
  for (let index = Math.max(first, 0); index <= last; index += 1) {
    if (approachAllowed && approachOffered(facts, index))
      paths.push(...approachPaths(facts, attacks[index]!, attacks[index + 1]!))
    if (enclosureAllowed && enclosureOffered(facts, index))
      paths.push(
        ...enclosurePaths(facts, [attacks[index]!, attacks[index + 1]!, attacks[index + 2]!]),
      )
  }
  return paths
}

/**
 * Free appoggiatura and diatonic enclosure paths whose first member's attack index lies in
 * `first..last`, in attack order, each figure offered only when its own level is not off and
 * where `appoggiaturaOffered` or `diatonicEnclosureOffered` allows it. They need no chromatic note.
 */
// @spec-link [[rule_embellishment_figures_defined]]
// @spec-link [[rule_figure_level_orders_search]]
// @spec-link [[rule_levels_govern_free_figures_only]]
function diatonicFreeFigurePaths(
  facts: DomainFacts,
  first: number,
  last: number,
): readonly FigurePath[] {
  const levels = facts.input.policy.figureLevels
  const appoggiaturaAllowed = allowsFreeFigure(levels, 'appoggiatura')
  const enclosureAllowed = allowsFreeFigure(levels, 'diatonicEnclosure')
  if (!appoggiaturaAllowed && !enclosureAllowed) return []
  const paths: FigurePath[] = []
  const { attacks } = facts
  for (let index = Math.max(first, 0); index <= last; index += 1) {
    if (appoggiaturaAllowed && appoggiaturaOffered(facts, index))
      paths.push(...appoggiaturaPaths(facts, attacks[index]!, attacks[index + 1]!))
    if (enclosureAllowed && diatonicEnclosureOffered(facts, index))
      paths.push(
        ...diatonicEnclosurePaths(facts, [
          attacks[index]!,
          attacks[index + 1]!,
          attacks[index + 2]!,
        ]),
      )
  }
  return paths
}

/**
 * Every free figure path whose first member's attack index lies in `first..last`: the free
 * appoggiaturas and diatonic enclosures, then the chromatic approaches and enclosures, each
 * figure offered only when its own level is not off.
 */
// @spec-link [[rule_embellishment_figures_defined]]
// @spec-link [[rule_figure_level_orders_search]]
function freeFigurePaths(facts: DomainFacts, first: number, last: number): readonly FigurePath[] {
  return [
    ...diatonicFreeFigurePaths(facts, first, last),
    ...chromaticApproachPaths(facts, first, last),
  ]
}

/** Stable path identity: kind, binding, attacks, and the complete MIDI path. */
function pathIdentity(path: FigurePath): string {
  const prefix = path.bindingIdentity === undefined ? '' : `${path.bindingIdentity}/`
  return `${prefix}${path.kind}/${path.attackIndices.join('-')}/${path.targetAttackIndex}/${path.midis.join('.')}`
}

/** The figure a free path's first member names: an appoggiatura, an enclosure, an approach. */
const APPOGGIATURA_FIGURES: readonly FigureId[] = deepFreeze(['appoggiatura'])
const DIATONIC_ENCLOSURE_FIGURES: readonly FigureId[] = deepFreeze(['diatonicEnclosure'])
const CHROMATIC_APPROACH_FIGURES: readonly FigureId[] = deepFreeze(['chromaticApproach'])
const CHROMATIC_ENCLOSURE_FIGURES: readonly FigureId[] = deepFreeze(['chromaticEnclosure'])

/**
 * The free figure a path's first member may start: its own, for a free appoggiatura, diatonic
 * enclosure, chromatic approach or chromatic enclosure path; none for a path of Tension's
 * scheduled figure, whose notes no draw may move.
 */
// @spec-link [[module_favored_figure_draw]]
function pathFigures(path: FigurePath): readonly FigureId[] | undefined {
  if (path.bindingIdentity !== undefined) return undefined
  if (path.kind === 'appoggiatura') return APPOGGIATURA_FIGURES
  if (path.kind === 'diatonic_enclosure') return DIATONIC_ENCLOSURE_FIGURES
  if (path.kind === 'chromatic_approach') return CHROMATIC_APPROACH_FIGURES
  if (path.kind === 'chromatic_enclosure') return CHROMATIC_ENCLOSURE_FIGURES
  return undefined
}

/**
 * Spread every path into one reserved raw candidate per member attack; the first member of a free
 * path names its figure, later members name none.
 */
// @spec-link [[module_favored_figure_draw]]
function pathCandidates(paths: readonly FigurePath[]): Map<number, RawCandidate[]> {
  const byAttack = new Map<number, RawCandidate[]>()
  for (const path of paths) {
    const identity = pathIdentity(path)
    const figures = pathFigures(path)
    path.attackIndices.forEach((attackIndex, memberPosition) => {
      const reservation: PitchReservation = {
        identity,
        ...(path.bindingIdentity === undefined ? {} : { bindingIdentity: path.bindingIdentity }),
        figureKind: path.kind,
        attackIndices: path.attackIndices,
        targetAttackIndex: path.targetAttackIndex,
        targetPitchClass: pc(path.midis.at(-1)!),
        memberPosition,
        path: path.midis,
      }
      const list = byAttack.get(attackIndex) ?? []
      list.push({
        role: path.roles[memberPosition]!,
        midi: path.midis[memberPosition]!,
        obligation: identity,
        reservation,
        ...(memberPosition === 0 && figures !== undefined ? { figures } : {}),
      })
      byAttack.set(attackIndex, list)
    })
  }
  return byAttack
}

/**
 * Tense endings of a phrase generated with carry-in: free diatonic tones on the final attack that
 * the next phrase's first note can resolve by step onto its tonic triad inside the window. Offered
 * only when the figure levels allow a free scale note on that attack (the passing figure for its
 * beat, or the neighbor tone). Empty for a phrase that may not end owing a resolution, and on a
 * first attack, which nothing prepares.
 */
// @spec-link [[rule_join_tense_note_resolution]]
// @spec-link [[rule_levels_govern_free_figures_only]]
function tenseEndingCandidates(facts: DomainFacts, attack: PitchAttack): readonly RawCandidate[] {
  const request = facts.input.request
  const allowed = phraseEndingDebtAllowance(request.carryIn !== undefined).tenseNote
  if (!allowed || !attack.isFinal || attack.attackIndex === 0) return []
  if (allowedFreeToneFigures(facts.input.policy.figureLevels, attack).length === 0) return []
  // The levels gate these tones, but they name no figure and carry no resolution: a named figure
  // would let a Favored draw try the tense ending before the chord tones.
  return diatonicNonChord(facts, attack)
    .filter((midi) => tenseNoteCanSettle(midi, facts.collection, request.registerWindow))
    .map((midi): RawCandidate => ({
      role: 'passing_or_neighbor',
      midi,
      obligation: `free:${attack.identity}`,
    }))
}

/** One free figure a free diatonic tone may become, with the resolution that writes it. */
interface FreeToneFigure {
  readonly figure: FigureId
  readonly resolution: FreeToneResolution
}

/**
 * The free figures the levels allow a free diatonic tone at an attack, each with its resolution,
 * in FIGURE_IDS order: the passing figure for its beat (an accented passing tone on beats 1 and 3,
 * a passing tone elsewhere), then the neighbor tone.
 */
// @spec-link [[module_favored_figure_draw]]
function allowedFreeToneFigures(
  levels: FigureLevels,
  attack: PitchAttack,
): readonly FreeToneFigure[] {
  const strong = attack.startTick === 0 || attack.startTick === 8
  const figures: readonly FreeToneFigure[] = [
    { figure: strong ? 'accentedPassingTone' : 'passingTone', resolution: 'passing' },
    { figure: 'neighborTone', resolution: 'neighbor' },
  ]
  return figures.filter(({ figure }) => allowsFreeFigure(levels, figure))
}

/**
 * Ordinary candidates: chord tones everywhere, free diatonic tones away from the phrase ends, and
 * on the final attack of a phrase that may end owing a resolution, its settleable tense tones.
 * Free diatonic tones are offered only when the figure levels allow at least one of their two
 * resolutions; when they allow exactly one, each free tone carries it as `freeResolution`. Each
 * free diatonic tone names the free figures it may start.
 */
// @spec-link [[rule_figure_level_orders_search]]
// @spec-link [[rule_levels_govern_free_figures_only]]
// @spec-link [[module_favored_figure_draw]]
function ordinaryCandidates(facts: DomainFacts, attack: PitchAttack): readonly RawCandidate[] {
  const chord = chordMidis(facts, attack).map((midi): RawCandidate => ({
    role: 'chord_tone',
    midi,
    obligation: `chord:${attack.identity}`,
  }))
  if (attack.attackIndex === 0 || attack.isFinal)
    return [...chord, ...tenseEndingCandidates(facts, attack)]
  const allowed = allowedFreeToneFigures(facts.input.policy.figureLevels, attack)
  if (allowed.length === 0) return chord
  const only = allowed.length === 1 ? allowed[0]!.resolution : undefined
  const figures = allowed.map(({ figure }) => figure)
  const free = diatonicNonChord(facts, attack).map((midi): RawCandidate => ({
    role: 'passing_or_neighbor',
    midi,
    obligation: `free:${attack.identity}`,
    ...(only === undefined ? {} : { freeResolution: only }),
    figures,
  }))
  return [...chord, ...free]
}

/** Plain UTF-16 code-unit order of two strings, independent of the runtime's locale. */
function codeUnitOrder(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** The canonical order: role, then obligation, both by code unit, then pitch class, then MIDI. */
function compareCanonical(a: RawCandidate, b: RawCandidate): number {
  return (
    codeUnitOrder(a.role, b.role) ||
    codeUnitOrder(a.obligation, b.obligation) ||
    pc(a.midi) - pc(b.midi) ||
    a.midi - b.midi
  )
}

/**
 * Freeze candidates in canonical order: role, obligation, pitch class, octave. The resolution and
 * the figures a candidate names are carried only when present, outside its identity.
 */
function canonical(raw: readonly RawCandidate[]): readonly PitchCandidate[] {
  const sorted = [...raw].sort(compareCanonical)
  return deepFreeze(
    sorted.map((value, enumerationIndex) => {
      const octaveIndex = Math.floor(value.midi / 12)
      return {
        identity: `${value.role}/${value.obligation}/${pc(value.midi)}/${octaveIndex}`,
        role: value.role,
        midi: makeConcertPitch(value.midi),
        pitchClass: pc(value.midi),
        octaveIndex,
        obligationIdentity: value.obligation,
        enumerationIndex,
        ...(value.reservation ? { reservation: value.reservation } : {}),
        ...(value.freeResolution === undefined ? {} : { freeResolution: value.freeResolution }),
        ...(value.figures === undefined ? {} : { figures: value.figures }),
      }
    }),
  )
}

/**
 * A copy of a free domain for the shared store, in candidate objects of its own. Kept domains and
 * the short-lived bound domains would otherwise come from one object literal; V8, seeing most of
 * that literal's objects survive, would then allocate the short-lived ones straight into old
 * space, which multiplies garbage-collection work for every later search in the process.
 */
function retainedDomain(domain: readonly PitchCandidate[]): readonly PitchCandidate[] {
  return deepFreeze(domain.map((candidate) => ({ ...candidate })))
}

/** A fresh, empty free-domain store for one input's request, collection and free-figure allowance. */
export function makeFreeDomainStore(
  input: BoundPitchPlannerInput,
  collection: readonly number[],
): FreeDomainStore {
  return {
    request: input.request,
    collection,
    allowance: freeFigureAllowanceKey(input.policy.figureLevels),
    playable: playableMidis(input),
    domains: new Map(),
  }
}

/** A fresh, empty domain memo for one phrase's attacks over a shared free-domain store. */
export function makeCandidateDomainMemo(
  attacks: readonly PitchAttack[],
  store: FreeDomainStore,
): CandidateDomainMemo {
  return { attacks, store, domains: new Map() }
}

/** True when `memo` was made for exactly these attacks, collection, request and allowance. */
function memoFits(
  memo: CandidateDomainMemo,
  input: BoundPitchPlannerInput,
  attacks: readonly PitchAttack[],
  collection: readonly number[],
): boolean {
  const { store } = memo
  return (
    memo.attacks === attacks &&
    store.collection === collection &&
    store.request === input.request &&
    store.allowance === freeFigureAllowanceKey(input.policy.figureLevels)
  )
}

/**
 * Index of a free attack's domain within one phrase: its attack index and, when chromatic
 * ornaments or the diatonic enclosure are offered, whether the attacks before and after it are
 * bound, the only binding facts their two-member paths depend on (a free appoggiatura reads only
 * its own attack, which is free).
 */
function domainMemoKey(facts: DomainFacts, attackIndex: number): number {
  const levels = facts.input.policy.figureLevels
  if (!allowsChromaticNotes(levels) && !allowsFreeFigure(levels, 'diatonicEnclosure'))
    return attackIndex * 4
  const before = facts.boundAttacks.has(attackIndex - 1) ? 1 : 0
  const after = facts.boundAttacks.has(attackIndex + 1) ? 2 : 0
  return attackIndex * 4 + before + after
}

/**
 * Key of a free attack's domain across phrases: every fact its candidates read beyond the store's
 * request, collection and free-figure allowance. That is the attack's index, identity (which holds
 * its onset, so whether it falls on beat 1 or 3, and so which passing figure a free tone names),
 * finality and chord; which allowed free figure paths land on it (a chromatic or diatonic
 * enclosure from the attack before; a free appoggiatura, a chromatic approach, or a chromatic or
 * diatonic enclosure from itself); and the chords of the targets those paths resolve to.
 */
function freeDomainKey(facts: DomainFacts, attack: PitchAttack): string {
  const index = attack.attackIndex
  /** The chord pitch classes of the attack at `at`, as key text. */
  const chord = (at: number) => facts.attacks[at]!.chordPitchClasses.join(',')
  const levels = facts.input.policy.figureLevels
  const approachAllowed = allowsFreeFigure(levels, 'chromaticApproach')
  const enclosureAllowed = allowsFreeFigure(levels, 'chromaticEnclosure')
  const appoggiaturaAllowed = allowsFreeFigure(levels, 'appoggiatura')
  const diatonicAllowed = allowsFreeFigure(levels, 'diatonicEnclosure')
  const enclosedFromBefore = enclosureAllowed && enclosureOffered(facts, index - 1)
  const approach = approachAllowed && approachOffered(facts, index)
  const enclosure = enclosureAllowed && enclosureOffered(facts, index)
  const appoggiatura = appoggiaturaAllowed && appoggiaturaOffered(facts, index)
  const diatonicFromBefore = diatonicAllowed && diatonicEnclosureOffered(facts, index - 1)
  const diatonic = diatonicAllowed && diatonicEnclosureOffered(facts, index)
  const offered = [
    enclosedFromBefore,
    approach,
    enclosure,
    appoggiatura,
    diatonicFromBefore,
    diatonic,
  ]
  const nextTarget = enclosedFromBefore || approach || appoggiatura || diatonicFromBefore
  return [
    index,
    attack.identity,
    Number(attack.isFinal),
    chord(index),
    offered.map(Number).join(''),
    nextTarget ? chord(index + 1) : '',
    enclosure || diatonic ? chord(index + 2) : '',
  ].join('|')
}

/**
 * Enumerate every attack's canonical candidate domain. Bound member attacks hold only concrete
 * bound-path members; other attacks hold chord tones, and the free diatonic tones and the members
 * of the free figure paths (free appoggiaturas, diatonic enclosures, chromatic approaches and
 * enclosures) the figure levels allow. Every MIDI value lies inside both the active range and the
 * register window.
 */
// @spec-link [[entity_pitch_candidate_domain]]
// @spec-link [[rule_neutral_profile_diatonic_pitches]]
export function buildCandidateDomains(
  input: BoundPitchPlannerInput,
  attacks: readonly PitchAttack[],
  collection: readonly number[],
  memo?: CandidateDomainMemo,
): readonly (readonly PitchCandidate[])[] {
  const memoized =
    memo && memoFits(memo, input, attacks, collection)
      ? memo
      : makeCandidateDomainMemo(attacks, makeFreeDomainStore(input, collection))
  const { store } = memoized
  const facts: DomainFacts = {
    input,
    attacks,
    collection,
    playable: store.playable,
    boundAttacks: new Set(input.tensionBinding.attackIndices),
  }
  const bound = pathCandidates(boundPaths(facts))
  /** A free attack's domain: from this phrase's memo, else the shared store, else built and kept. */
  const freeDomain = (attack: PitchAttack): readonly PitchCandidate[] => {
    const index = attack.attackIndex
    const slot = domainMemoKey(facts, index)
    const known = memoized.domains.get(slot)
    if (known) return known
    const key = freeDomainKey(facts, attack)
    let domain = store.domains.get(key)
    if (!domain) {
      const figurePaths = pathCandidates(freeFigurePaths(facts, index - 1, index))
      domain = retainedDomain(
        canonical([...ordinaryCandidates(facts, attack), ...(figurePaths.get(index) ?? [])]),
      )
      store.domains.set(key, domain)
    }
    memoized.domains.set(slot, domain)
    return domain
  }
  // Every domain is already deep-frozen, so freezing the outer array completes a deep freeze.
  return Object.freeze(
    attacks.map((attack) =>
      facts.boundAttacks.has(attack.attackIndex)
        ? canonical(bound.get(attack.attackIndex) ?? [])
        : freeDomain(attack),
    ),
  )
}
