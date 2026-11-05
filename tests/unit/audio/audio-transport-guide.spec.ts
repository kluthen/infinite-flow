/**
 * The guide playback on the audio transport, on the fake audio clock and output: with both guides
 * off a session makes exactly the calls it made before the guides existed; each guide switched on
 * sounds exactly its own line, every note at its position through the session's tempo map, a note
 * on a beat at that beat's click; the guides play from phrase 1's first beat, also when it is
 * handed over; a switch takes effect at once (off) or from the next planned window (on); stop
 * fades the guides with the rest of the session; and a guide volume is checked and set at once.
 */

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import type { GuideRole } from '@/audio/sound-roles'
import { beatAt, createClickPlan, withTempoFrom, type ClickPlan } from '@/audio/click-track'
import { LOOK_AHEAD_SECONDS } from '@/audio/look-ahead-scheduler'
import { renderGuide, type GuideNote } from '@/domain/backing/guide-renderer'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeMeasure } from '@/domain/events/measure'
import { makeNoteEvent } from '@/domain/events/measure-event'
import { makeConcertEventTimeline, type ConcertEventTimeline } from '@/domain/events/timeline'
import type { HarmonyEvent } from '@/domain/harmony/harmony-types'
import { addRational, makeRational, type Rational } from '@/domain/time/rational'
import { phraseFromBars } from '../domain/acknowledgement/acknowledgement-fixtures'
import { twoPhraseHarmonies } from './backing-harmony'
import type { FakeAudioEvent, FakeGuideEvent } from './fake-audio'
import { recordGuideOffScenarios, type RecordedScenario } from './guide-off-scenarios'
import { RIG_START, transportRig, type TransportRig } from './transport-rig'

/** Phrase 1's timeline: on-beat and off-beat starts, a dotted note and two sixteenths. */
const PHRASE_A = phraseFromBars(['q e e q. s s', 'h q q', 'e. s q h', 'w'])

/** Phrase 2's timeline: eighths, a rest, a tie across a barline. */
const PHRASE_B = phraseFromBars(['e e e e q q', 'q. e h', 'r:q q q q', '~:h h'])

/** Intent: the timeline phrase `n` plays: A for odd phrases, B for even ones. */
function timelineFor(n: number): ConcertEventTimeline {
  return n % 2 === 1 ? PHRASE_A : PHRASE_B
}

/** Intent: four measures of sixteenth-note triplets, 24 notes of 1/24 whole note each. */
function sixteenthTripletTimeline(): ConcertEventTimeline {
  const pitches = [60, 64, 67, 72]
  return makeConcertEventTimeline(
    [0, 1, 2, 3].map((index) =>
      makeMeasure(
        index,
        Array.from({ length: 24 }, (_, k) =>
          makeNoteEvent({
            duration: makeRational(1, 24),
            pitch: makeConcertPitch(pitches[k % pitches.length]!),
            tieContinuation: false,
          }),
        ),
      ),
    ),
  )
}

/** One guide note as compared: its guide, pitch and audio times. */
interface PlacedNote {
  readonly role: GuideRole
  readonly pitch: number
  readonly at: number
  readonly until: number
}

/** One expected guide note, with the session beat it starts on. */
interface ExpectedNote extends PlacedNote {
  readonly startBeat: number
}

/** Intent: a whole-note position as quarter-note beats. */
function beatsOf(time: Rational): number {
  return (time.numerator * 4) / time.denominator
}

/**
 * Intent: the notes of `role` the renderer gives `timeline` over `harmony`, placed independently:
 * each start and end is `beatAt` of the phrase's first beat plus its position, on `plan`.
 */
function expectedLine(
  plan: ClickPlan,
  firstBeat: number,
  role: GuideRole,
  timeline: ConcertEventTimeline,
  harmony: readonly HarmonyEvent[],
): ExpectedNote[] {
  const rendered = renderGuide(timeline, harmony)
  const notes: readonly GuideNote[] = role === 'melody-guide' ? rendered.melody : rendered.rhythm
  return notes.map((note) => {
    const startBeat = firstBeat + beatsOf(note.start)
    return {
      role,
      pitch: Number(note.pitch),
      at: beatAt(plan, startBeat),
      until: beatAt(plan, firstBeat + beatsOf(addRational(note.start, note.duration))),
      startBeat,
    }
  })
}

/** Intent: a note as compared, dropping everything else the recorder or the expectation holds. */
function placed({ role, pitch, at, until }: PlacedNote): PlacedNote {
  return { role, pitch, at, until }
}

/** Intent: notes in a fixed order: by start, then guide, then pitch. */
function sorted(notes: readonly PlacedNote[]): PlacedNote[] {
  return notes
    .map(placed)
    .sort((a, b) => a.at - b.at || a.role.localeCompare(b.role) || a.pitch - b.pitch)
}

/** The switches of one session: each guide's and the backing's. */
interface Switches {
  readonly melody: boolean
  readonly rhythm: boolean
  readonly backing: boolean
}

/** A session of two phrases run to its end, with what it was expected to play. */
interface GuideRun extends TransportRig {
  readonly startAt: number
  readonly plan: ClickPlan
  readonly expected: Readonly<Record<GuideRole, readonly ExpectedNote[]>>
}

/**
 * Intent: a session with the guides and the backing as `switches` say, set before it starts,
 * phrases 1 and 2 queued at once with their own timelines at `tempos`, run past phrase 2's end;
 * and each guide's line placed independently on the tempo map those tempos give.
 */
function guideRun(switches: Switches, tempos: readonly [number, number] = [120, 120]): GuideRun {
  const setup = transportRig()
  const { rig, transport } = setup
  const harmonies = twoPhraseHarmonies()
  transport.unlock()
  transport.setGuideOn('melody-guide', switches.melody)
  transport.setGuideOn('rhythm-guide', switches.rhythm)
  transport.setBackingOn(switches.backing)
  const { startAt } = transport.start({ tempo: tempos[0] })
  transport.queueBacking(1, harmonies[0], timelineFor(1), tempos[0])
  transport.queueBacking(2, harmonies[1], timelineFor(2), tempos[1])
  rig.advanceTo(transport.phraseStartsAt(3) + 1)
  const first = createClickPlan(startAt, tempos[0])
  const plan = tempos[1] === tempos[0] ? first : withTempoFrom(first, 20, tempos[1])
  const line = (role: GuideRole): ExpectedNote[] =>
    [0, 1].flatMap((index) =>
      expectedLine(plan, 4 + 16 * index, role, timelineFor(index + 1), harmonies[index]!),
    )
  return {
    ...setup,
    startAt,
    plan,
    expected: { 'melody-guide': line('melody-guide'), 'rhythm-guide': line('rhythm-guide') },
  }
}

/** Intent: the recorded guide notes of `role`. */
function guideEventsOf(events: readonly FakeAudioEvent[], role?: GuideRole): FakeGuideEvent[] {
  return events.filter(
    (event): event is FakeGuideEvent =>
      event.kind === 'guide' && (role === undefined || event.role === role),
  )
}

/** The fake-output calls the scripted sessions made before chunk 40, recorded then. */
const PRE_GUIDE_SCENARIOS: readonly RecordedScenario[] = JSON.parse(
  readFileSync('tests/fixtures/audio/v3.2-c40-guide-off-session-calls.json', 'utf8'),
) as readonly RecordedScenario[]

/**
 * Intent: events as the fixture file holds them: through JSON, which writes an infinite time (a
 * click forced on with no end yet) as null.
 */
function asRecorded(events: readonly FakeAudioEvent[]): unknown {
  return JSON.parse(JSON.stringify(events))
}

/** Intent: whether an event is a gain change of one of the guides' channels. */
function isGuideGain(event: FakeAudioEvent): boolean {
  return (
    event.kind === 'gain' &&
    (event.gain.startsWith('melody-guide-') || event.gain.startsWith('rhythm-guide-'))
  )
}

// @test-link [[req_guide_playback]]
// @test-link [[rule_guide_changes_only_sound]]
describe('the guides off: the session as before the guides', () => {
  // @test-link [[req_guide_playback]]
  // @test-link [[rule_guide_changes_only_sound]]
  it('makes exactly the calls it made before the guides, apart from the guide gains set at unlock', () => {
    const scenarios = recordGuideOffScenarios((transport, n, harmony, tempo) =>
      transport.queueBacking(n, harmony, timelineFor(n), tempo),
    )

    expect(scenarios.map((scenario) => scenario.name)).toEqual(
      PRE_GUIDE_SCENARIOS.map((scenario) => scenario.name),
    )
    scenarios.forEach((scenario, index) => {
      const guideGains = scenario.events.filter(isGuideGain)
      const at = { at: RIG_START, scheduledAt: RIG_START }
      expect(guideGains).toEqual([
        { kind: 'gain', gain: 'melody-guide-enable', value: 0, ...at },
        { kind: 'gain', gain: 'melody-guide-volume', value: 0.8, ...at },
        { kind: 'gain', gain: 'rhythm-guide-enable', value: 0, ...at },
        { kind: 'gain', gain: 'rhythm-guide-volume', value: 0.6, ...at },
      ])
      expect(guideEventsOf(scenario.events)).toEqual([])
      expect(asRecorded(scenario.events.filter((event) => !isGuideGain(event)))).toEqual(
        PRE_GUIDE_SCENARIOS[index]!.events,
      )
    })
  })
})

/** Every combination of the two guide switches. */
const GUIDE_COMBINATIONS = [
  { melody: false, rhythm: false },
  { melody: true, rhythm: false },
  { melody: false, rhythm: true },
  { melody: true, rhythm: true },
] as const

// @test-link [[req_guide_playback]]
// @test-link [[rule_guide_notes_placed_exactly]]
// @test-link [[rule_guide_changes_only_sound]]
describe('each guide sounds exactly its own line', () => {
  // @test-link [[req_guide_playback]]
  // @test-link [[rule_guide_notes_placed_exactly]]
  // @test-link [[rule_guide_changes_only_sound]]
  it.each(
    GUIDE_COMBINATIONS.flatMap((guides) => [
      { ...guides, backing: true },
      { ...guides, backing: false },
    ]),
  )('melody $melody, rhythm $rhythm, backing $backing: its lines and nothing else', (switches) => {
    const run = guideRun(switches)
    const expected = [
      ...(switches.melody ? run.expected['melody-guide'] : []),
      ...(switches.rhythm ? run.expected['rhythm-guide'] : []),
    ]
    expect(sorted(run.rig.audibleGuide())).toEqual(sorted(expected))
    expect(sorted(run.rig.guideNotes())).toEqual(sorted(expected))
    expect(run.rig.audibleBacking().length > 0).toBe(switches.backing)

    const plain = guideRun({ melody: false, rhythm: false, backing: switches.backing })
    expect(run.rig.clicks()).toEqual(plain.rig.clicks())
    expect(run.rig.backingNotes()).toEqual(plain.rig.backingNotes())
  })

  // @test-link [[req_guide_playback]]
  it('gives both lines the same starts and lengths when both are on', () => {
    const run = guideRun({ melody: true, rhythm: true, backing: true })
    const timesOf = (role: GuideRole) =>
      run.rig
        .audibleGuide()
        .filter((note) => note.role === role)
        .map(({ at, until }) => ({ at, until }))
    expect(timesOf('melody-guide').length).toBeGreaterThan(20)
    expect(timesOf('melody-guide')).toEqual(timesOf('rhythm-guide'))
  })
})

// @test-link [[rule_guide_notes_placed_exactly]]
// @test-link [[rule_guide_plays_from_phrase_one]]
describe('guide notes on the tempo map', () => {
  // @test-link [[rule_guide_notes_placed_exactly]]
  // @test-link [[rule_guide_plays_from_phrase_one]]
  it("places every note of two phrases at 120 then 90 BPM at its position's beatAt", () => {
    const run = guideRun({ melody: true, rhythm: true, backing: true }, [120, 90])
    const expected = [...run.expected['melody-guide'], ...run.expected['rhythm-guide']]
    expect(sorted(run.rig.audibleGuide())).toEqual(sorted(expected))
    const phraseTwo = expected.filter((note) => note.startBeat >= 20)
    expect(phraseTwo.length).toBeGreaterThan(0)
    expect(phraseTwo[0]!.at).toBe(run.transport.phraseStartsAt(2))
  })

  // @test-link [[rule_guide_notes_placed_exactly]]
  it("puts a note on a beat exactly on that beat's click, at both tempos", () => {
    const run = guideRun({ melody: true, rhythm: true, backing: true }, [120, 90])
    const clicks = run.rig.clicks()
    const expected = [...run.expected['melody-guide'], ...run.expected['rhythm-guide']]
    const onBeat = expected.filter((note) => Number.isInteger(note.startBeat))
    expect(onBeat.some((note) => note.startBeat < 20)).toBe(true)
    expect(onBeat.some((note) => note.startBeat >= 20)).toBe(true)
    expect(expected.some((note) => !Number.isInteger(note.startBeat))).toBe(true)
    for (const note of onBeat) {
      const played = run.rig
        .audibleGuide()
        .find((event) => event.role === note.role && event.at === note.at)
      expect(played?.at).toBe(clicks[note.startBeat]!.at)
    }
  })

  // @test-link [[rule_guide_notes_placed_exactly]]
  it('queues, schedules and sounds sixteenth-note triplets at 240 BPM, each about 42 ms', () => {
    const { rig, transport } = transportRig()
    const [harmony] = twoPhraseHarmonies()
    const timeline = sixteenthTripletTimeline()
    transport.unlock()
    transport.setGuideOn('melody-guide', true)
    transport.setGuideOn('rhythm-guide', true)
    const { startAt } = transport.start({ tempo: 240 })
    expect(() => transport.queueBacking(1, harmony, timeline, 240)).not.toThrow()
    expect(() => rig.advanceTo(transport.phraseStartsAt(2) + 1)).not.toThrow()

    const plan = createClickPlan(startAt, 240)
    const expected = [
      ...expectedLine(plan, 4, 'melody-guide', timeline, harmony),
      ...expectedLine(plan, 4, 'rhythm-guide', timeline, harmony),
    ]
    expect(expected).toHaveLength(192)
    const audible = rig.audibleGuide()
    expect(sorted(audible)).toEqual(sorted(expected))
    for (const note of audible) expect(note.until - note.at).toBeCloseTo(60 / 240 / 6, 9)
  })
})

/** Intent: the first expected note of `role` starting after `after`. */
function firstNoteAfter(run: GuideRun, role: GuideRole, after: number): ExpectedNote {
  const note = run.expected[role].find((candidate) => candidate.at > after)
  if (note === undefined) throw new Error(`no ${role} note after ${after}`)
  return note
}

// @test-link [[rule_guide_switch_takes_effect]]
describe('switching a guide mid-session', () => {
  // @test-link [[rule_guide_switch_takes_effect]]
  it('silences a guide turned off at once and sends none of its notes after', () => {
    const { rig, transport } = transportRig()
    const harmonies = twoPhraseHarmonies()
    transport.unlock()
    transport.setGuideOn('melody-guide', true)
    const { countInEndsAt } = transport.start({ tempo: 120 })
    transport.queueBacking(1, harmonies[0], timelineFor(1), 120)
    transport.queueBacking(2, harmonies[1], timelineFor(2), 120)
    rig.advanceTo(countInEndsAt + 1.6)
    const switchAt = rig.now()
    const before = rig.events().length

    transport.setGuideOn('melody-guide', false)

    expect(rig.events().at(-1)).toEqual({
      kind: 'gain',
      gain: 'melody-guide-enable',
      value: 0,
      at: switchAt,
      scheduledAt: switchAt,
    })
    expect(rig.gainAt('melody-guide-enable', switchAt)).toBe(0)
    expect(rig.guideNotes().some((note) => note.at > switchAt)).toBe(true)
    rig.advanceTo(transport.phraseStartsAt(3))
    expect(guideEventsOf(rig.events().slice(before))).toEqual([])
    const audible = rig.audibleGuide()
    expect(audible.length).toBeGreaterThan(0)
    expect(audible.every((note) => note.at < switchAt)).toBe(true)
    expect(transport.mix().melodyGuideOn).toBe(false)
  })

  // @test-link [[rule_guide_switch_takes_effect]]
  it('sounds a guide turned on from the next planned window, never a note started before', () => {
    const reference = guideRun({ melody: false, rhythm: true, backing: true })
    const { rig, transport } = transportRig()
    const harmonies = twoPhraseHarmonies()
    transport.unlock()
    const { countInEndsAt } = transport.start({ tempo: 120 })
    transport.queueBacking(1, harmonies[0], timelineFor(1), 120)
    transport.queueBacking(2, harmonies[1], timelineFor(2), 120)
    const caught = firstNoteAfter(reference, 'rhythm-guide', countInEndsAt + 2)
    const switchAt = caught.at - LOOK_AHEAD_SECONDS / 2
    rig.advanceTo(switchAt)
    const plannedUntil = switchAt + LOOK_AHEAD_SECONDS

    transport.setGuideOn('rhythm-guide', true)
    expect(rig.gainAt('rhythm-guide-enable', switchAt)).toBe(1)
    rig.advanceTo(transport.phraseStartsAt(3) + 1)

    const sent = rig.guideNotes()
    expect(sent.length).toBeGreaterThan(0)
    expect(sent.every((note) => note.role === 'rhythm-guide')).toBe(true)
    expect(sent.every((note) => note.at >= plannedUntil)).toBe(true)
    expect(sent.some((note) => note.at === caught.at)).toBe(false)
    expect(sorted(rig.audibleGuide())).toEqual(
      sorted(reference.expected['rhythm-guide'].filter((note) => note.at >= plannedUntil)),
    )
  })

  // @test-link [[rule_guide_switch_takes_effect]]
  // @test-link [[req_session_audio_mix]]
  it.each(['melody-guide', 'rhythm-guide'] as const)(
    'sets the %s volume at once and refuses a level outside its range',
    (guide) => {
      const { rig, transport } = transportRig()
      const before = transport.mix()
      for (const bad of [1.5, -0.1, Number.NaN, Number.POSITIVE_INFINITY]) {
        expect(() => transport.setGuideVolume(guide, bad)).toThrow(RangeError)
      }
      expect(transport.mix()).toEqual(before)
      transport.unlock()
      rig.advance(1.3)
      const at = rig.now()

      transport.setGuideVolume(guide, 0.4)

      expect(rig.events().at(-1)).toEqual({
        kind: 'gain',
        gain: `${guide}-volume`,
        value: 0.4,
        at,
        scheduledAt: at,
      })
      expect(rig.gainAt(`${guide}-volume`, at)).toBe(0.4)
      expect(() => transport.setGuideVolume(guide, 1.01)).toThrow(RangeError)
      expect(rig.gainAt(`${guide}-volume`, at)).toBe(0.4)
    },
  )
})

// @test-link [[rule_guide_plays_from_phrase_one]]
describe("the guides from phrase 1's first beat", () => {
  // @test-link [[rule_guide_plays_from_phrase_one]]
  it('plays no guide note in the count-in: phrase 1 starts at its end', () => {
    const run = guideRun({ melody: true, rhythm: true, backing: false })
    const countInEndsAt = beatAt(run.plan, 4)
    const audible = run.rig.audibleGuide()
    expect(Math.min(...audible.map((note) => note.at))).toBe(countInEndsAt)
  })

  // @test-link [[rule_guide_plays_from_phrase_one]]
  it('starts a handed-over phrase 1 at its barline, with no guide note in the count-in or the wait', () => {
    const { rig, transport } = transportRig()
    const [harmony] = twoPhraseHarmonies()
    transport.unlock()
    transport.setGuideOn('melody-guide', true)
    transport.setGuideOn('rhythm-guide', true)
    const timeline = transport.start({
      tempo: 100,
      clickForced: true,
      phraseOneStart: 'handed-over',
    })
    rig.advanceTo(RIG_START + 3)
    expect(rig.guideNotes()).toEqual([])
    const plan = createClickPlan(timeline.startAt, 100)
    const barline = beatAt(plan, 12)
    transport.startPhraseOneAt(barline)
    transport.forceClickUntil(barline)
    transport.queueBacking(1, harmony, timelineFor(1), 100)
    rig.advanceTo(barline + 12)

    const audible = rig.audibleGuide()
    expect(audible.every((note) => note.at >= barline)).toBe(true)
    expect(Math.min(...audible.map((note) => note.at))).toBe(barline)
    expect(sorted(audible)).toEqual(
      sorted([
        ...expectedLine(plan, 12, 'melody-guide', timelineFor(1), harmony),
        ...expectedLine(plan, 12, 'rhythm-guide', timelineFor(1), harmony),
      ]),
    )
  })
})

// @test-link [[rule_stop_ends_session]]
// @test-link [[req_guide_playback]]
describe('stopping with the guides on', () => {
  // @test-link [[rule_stop_ends_session]]
  it('fades the guide notes already planned past the stop, and plans none after it', () => {
    const { rig, transport } = transportRig()
    const harmonies = twoPhraseHarmonies()
    transport.unlock()
    transport.setGuideOn('melody-guide', true)
    transport.setGuideOn('rhythm-guide', true)
    const { countInEndsAt } = transport.start({ tempo: 120 })
    transport.queueBacking(1, harmonies[0], timelineFor(1), 120)
    transport.queueBacking(2, harmonies[1], timelineFor(2), 120)
    rig.advanceTo(countInEndsAt + 1.6)
    const stopAt = rig.now()

    transport.stop()

    expect(rig.events().at(-1)).toMatchObject({ kind: 'fade', bus: 1, at: stopAt })
    const planned = rig.guideNotes().length
    expect(rig.guideNotes().some((note) => note.at >= stopAt)).toBe(true)
    rig.advance(20)
    expect(rig.guideNotes()).toHaveLength(planned)
    const audible = rig.audibleGuide()
    expect(audible.length).toBeGreaterThan(0)
    expect(audible.every((note) => note.at < stopAt)).toBe(true)
  })
})
