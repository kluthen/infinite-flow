import { makeConcertPitch } from '../events/concert-pitch'
import { deepFreeze } from '../events/deep-freeze'
import type {
  BoundPitchPlannerInput,
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

/** Shared read-only facts for enumerating one phrase. */
interface DomainFacts {
  readonly input: BoundPitchPlannerInput
  readonly attacks: readonly PitchAttack[]
  readonly collection: readonly number[]
  readonly playable: readonly number[]
  readonly boundAttacks: ReadonlySet<number>
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
        for (const first of facts.playable)
          if (
            isCollectionStep(facts, first, tone) &&
            Math.sign(tone - first) === Math.sign(goal - tone)
          )
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

/**
 * Chromatic approach and enclosure ornament paths at every attack whose members are free of the
 * bound figure, sound back to back with their target under one harmony event, and last no longer
 * than the target. Offered only when the active profile declares the capability.
 */
// @spec-link [[rule_jazz_chromatic_resolution]]
// @spec-link [[module_musical_profile_capabilities]]
function chromaticApproachPaths(facts: DomainFacts): readonly FigurePath[] {
  if (!facts.input.policy.capabilities.allowsChromaticApproach) return []
  const paths: FigurePath[] = []
  const { attacks, boundAttacks } = facts
  const free = (attack: PitchAttack) => !boundAttacks.has(attack.attackIndex)
  const short = (member: PitchAttack, target: PitchAttack) =>
    member.durationTicks <= target.durationTicks
  for (const [index, member] of attacks.entries()) {
    const next = attacks[index + 1]
    const target = attacks[index + 2]
    if (next && free(member) && tight([member, next]) && short(member, next))
      paths.push(...approachPaths(facts, member, next))
    if (
      next &&
      target &&
      free(member) &&
      free(next) &&
      tight([member, next, target]) &&
      short(member, target) &&
      short(next, target)
    )
      paths.push(...enclosurePaths(facts, [member, next, target]))
  }
  return paths
}

/** Stable path identity: kind, binding, attacks, and the complete MIDI path. */
function pathIdentity(path: FigurePath): string {
  const prefix = path.bindingIdentity === undefined ? '' : `${path.bindingIdentity}/`
  return `${prefix}${path.kind}/${path.attackIndices.join('-')}/${path.targetAttackIndex}/${path.midis.join('.')}`
}

/** Spread every path into one reserved raw candidate per member attack. */
function pathCandidates(paths: readonly FigurePath[]): Map<number, RawCandidate[]> {
  const byAttack = new Map<number, RawCandidate[]>()
  for (const path of paths) {
    const identity = pathIdentity(path)
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
      })
      byAttack.set(attackIndex, list)
    })
  }
  return byAttack
}

/** Ordinary candidates: chord tones everywhere, free diatonic tones away from the phrase ends. */
function ordinaryCandidates(facts: DomainFacts, attack: PitchAttack): readonly RawCandidate[] {
  const chord = chordMidis(facts, attack).map((midi): RawCandidate => ({
    role: 'chord_tone',
    midi,
    obligation: `chord:${attack.identity}`,
  }))
  if (attack.attackIndex === 0 || attack.isFinal) return chord
  const free = diatonicNonChord(facts, attack).map((midi): RawCandidate => ({
    role: 'passing_or_neighbor',
    midi,
    obligation: `free:${attack.identity}`,
  }))
  return [...chord, ...free]
}

/** Freeze candidates in canonical order: role, obligation, pitch class, octave. */
function canonical(raw: readonly RawCandidate[]): readonly PitchCandidate[] {
  const sorted = [...raw].sort(
    (a, b) =>
      a.role.localeCompare(b.role) ||
      a.obligation.localeCompare(b.obligation) ||
      pc(a.midi) - pc(b.midi) ||
      a.midi - b.midi,
  )
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
      }
    }),
  )
}

/**
 * Enumerate every attack's canonical candidate domain. Bound member attacks hold only concrete
 * bound-path members; other attacks hold chord tones, free diatonic tones, and Jazz ornament
 * members. Every MIDI value lies inside both the active range and the register window.
 */
// @spec-link [[entity_pitch_candidate_domain]]
// @spec-link [[rule_neutral_profile_diatonic_pitches]]
export function buildCandidateDomains(
  input: BoundPitchPlannerInput,
  attacks: readonly PitchAttack[],
  collection: readonly number[],
): readonly (readonly PitchCandidate[])[] {
  const facts: DomainFacts = {
    input,
    attacks,
    collection,
    playable: playableMidis(input),
    boundAttacks: new Set(input.tensionBinding.attackIndices),
  }
  const bound = pathCandidates(boundPaths(facts))
  const jazz = pathCandidates(chromaticApproachPaths(facts))
  return deepFreeze(
    attacks.map((attack) =>
      canonical(
        facts.boundAttacks.has(attack.attackIndex)
          ? (bound.get(attack.attackIndex) ?? [])
          : [...ordinaryCandidates(facts, attack), ...(jazz.get(attack.attackIndex) ?? [])],
      ),
    ),
  )
}
