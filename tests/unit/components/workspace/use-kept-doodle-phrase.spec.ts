/**
 * Jam mode's phrase 1 at Idle, written from the kept doodle (use-kept-doodle-phrase.ts), over the
 * real kept doodle, Jam's real settings and the real ladder of Jam's code, real generation and a
 * staff that engraves at once (the engraver's planning faked): written as a doodle is kept, through
 * Loading, with its own session seed drawn at publish; climbing the three rungs with no deadline
 * into the idle generation-failure state, `Retry generation` writing from the doodle again; written
 * again by each Jam setting but the tempo and by the shared instrument, my instrument's range or
 * clef included, never by the tempo, a window crossing or the suggestion declined; `Regenerate
 * phrase` and `Jam in {answer}` keeping the doodle; never out of date; and dropped, a writing in
 * flight cancelled, when the doodle is let go.
 */
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, shallowRef, watch, type EffectScope } from 'vue'

import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import { makeMyInstrument, type MyInstrument } from '@/domain/profile/my-instrument'
import type { InstrumentProfileId } from '@/domain/profile/instrument-profiles'
import { makeSeed } from '@/domain/random/seed'
import { freshJamSettings } from '@/jam/fresh-jam-settings'
import { doodleAttempts } from '@/jam/jam-phrase-one-attempts'
import {
  createJamSettings,
  decodeJamSettings,
  jamFigureLevels,
  jamGenerationControls,
  type JamSettingsChange,
} from '@/jam/jam-settings'
import { climbKeptDoodleLadder } from '@/jam/kept-doodle-phrase-one'
import { useKeptDoodle } from '@/jam/use-kept-doodle'
import { staleSettingsOf } from '@/session/stale-phrase-one'
import type { JamModeModule } from '@/components/workspace/load-jam-mode'
import { workspaceReviewJamPorts } from '@/components/workspace/review-jam-ports'
import { useJamSettings } from '@/components/workspace/use-jam-settings'
import {
  useKeptDoodlePhrase,
  type WorkspaceKeptDoodlePhrase,
} from '@/components/workspace/use-kept-doodle-phrase'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'

import { createDeferred } from '../../composables/fit-session-harness'
import { failureOutcome, realOutcomeFor } from '../../session/session-harness'
import { lowHorn } from '../../session/my-instrument-session'
import { reviewedJamPart } from './reviewed-jam-part-fixture'
import { resetFakeEngraver } from '../../notation/fake-vexflow-engraver-loader'

vi.mock(
  '@/notation/vexflow-engraver-loader',
  () => import('../../notation/fake-vexflow-engraver-loader'),
)

/** Jam's code, as far as Jam's settings, the kept doodle and phrase 1's climb go. */
const JAM_MODULE = {
  createJamSettings,
  decodeJamSettings,
  jamFigureLevels,
  jamGenerationControls,
  freshJamSettings,
  climbKeptDoodleLadder,
  useKeptDoodle,
} as unknown as JamModeModule

/** The staff's layout, as its PhraseScore reports it once mounted. */
const LAYOUT: StaffLayoutInputs = {
  containerWidthPx: 1200,
  viewport: { layout: 'one-system', heightBudgetPx: null },
}

/** How the rig's generation answers one attempt: the real outcome, a failure, or held. */
type Answer = 'real' | 'no_legal_pitch_plan' | 'search_limit_exceeded' | 'hold'

let scope: EffectScope | null = null

beforeEach(() => {
  resetFakeEngraver()
})

afterEach(() => {
  scope?.stop()
  scope = null
})

/** Intent: Jam mode at Idle with Jam's settings made, a kept doodle holder and phrase 1 over them. */
function keptPhraseRig(answer: (intent: GenerationIntent, index: number) => Answer = () => 'real') {
  const instrument = shallowRef<{
    instrumentProfileId: InstrumentProfileId
    myInstrument: MyInstrument | null
  }>({ instrumentProfileId: 'c-keyboard', myInstrument: null })
  const below = { now: false }
  const asked: GenerationIntent[] = []
  const held: ReturnType<typeof createDeferred<GenerationOutcome>>[] = []
  const counts = { id: 0, seed: 0, sessionSeed: 0 }
  const operations: string[] = []
  const settled = (scope = effectScope())
  const built = settled.run(() => {
    const jamSettings = useJamSettings({
      jamModule: () => JAM_MODULE,
      jamShowing: () => true,
      records: () => [],
      sessionControls: () => DEFAULT_GENERATION_CONTROLS,
      instrumentProfileId: () => instrument.value.instrumentProfileId,
      saveSettings: () => undefined,
    })
    const keptDoodle = useKeptDoodle({
      instrument: () => instrument.value.myInstrument?.profile ?? lowHorn('treble').profile,
      keyAndMode: () => jamSettings.reviewKeyAndMode(JAM_MODULE),
    })
    const phrase = useKeptDoodlePhrase({
      generation: {
        generate: (intent) => {
          asked.push(intent)
          const answered = answer(intent, asked.length - 1)
          if (answered === 'hold') {
            const deferred = createDeferred<GenerationOutcome>()
            held.push(deferred)
            return deferred.promise
          }
          return Promise.resolve(
            answered === 'real' ? realOutcomeFor(intent) : failureOutcome(answered),
          )
        },
        providers: {
          nextRequestId: () => makeRequestId(`kept-${++counts.id}`),
          nextSeed: () => makeSeed(++counts.seed),
        },
        nextSessionSeed: () => makeSeed(500 + ++counts.sessionSeed),
        viewport: { isBelowTabletLandscape: () => below.now },
      },
      jamModule: () => JAM_MODULE,
      jamShowing: () => true,
      kept: () => keptDoodle.kept.value,
      settings: () => jamSettings.view.value,
      instrument: () => instrument.value,
    })
    // The staff engraves each phrase at once, as a mounted PhraseScore reports it.
    watch(
      phrase.written,
      (written) => {
        if (written !== null) phrase.view.value?.staff.handleEngraved()
      },
      { flush: 'sync' },
    )
    watch(
      () => phrase.state.operation,
      (operation) => operations.push(operation),
      {
        flush: 'sync',
      },
    )
    return { jamSettings, keptDoodle, phrase }
  })!
  built.phrase.view.value!.staff.handleLayoutInputs(LAYOUT)
  return { ...built, instrument, below, asked, held, counts, operations }
}

/** Intent: let every writing asked for run through to its end. */
async function settle(): Promise<void> {
  for (let round = 0; round < 6; round += 1) await flushPromises()
}

/** Intent: keep the fixture's doodle, from session `key`, and let phrase 1 be written. */
async function keepDoodle(rig: ReturnType<typeof keptPhraseRig>, key = 'session-1') {
  rig.keptDoodle.keep(reviewedJamPart(), key)
  await settle()
}

/** Intent: the phrase 1 shown now; it must be there. */
function shown(phrase: WorkspaceKeptDoodlePhrase) {
  const result = phrase.state.result
  if (result === null) throw new Error('no phrase 1 is shown')
  return result
}

// @test-link [[rule_held_doodle_phrase_one_at_idle]]
describe("Jam mode's phrase 1 at Idle from the kept doodle", () => {
  // @test-link [[rule_held_doodle_phrase_one_at_idle]]
  // @test-link [[module_session_seed_plan]]
  it('writes phrase 1 from a doodle newly kept, through Loading, its session seed drawn at publish', async () => {
    const rig = keptPhraseRig()
    expect(rig.phrase.view.value?.kept).toBe(false)

    rig.keptDoodle.keep(reviewedJamPart(), 'session-1')
    await settle()

    expect(rig.operations).toEqual(['generating', 'notating', 'idle'])
    const result = shown(rig.phrase)
    expect(rig.phrase.state.operation).toBe('idle')
    expect(rig.phrase.state.resultEngraved).toBe(true)
    expect(rig.phrase.view.value?.kept).toBe(true)
    expect(rig.phrase.written.value).not.toBeNull()
    expect(result.step).toBe('carry-in')
    expect(result.intent.steering).toEqual(result.steering)
    expect(result.intent.seed).toEqual(makeSeed(1))
    expect(result.sessionSeed).toEqual(makeSeed(501))
    expect(result.settings.controls.tonalCenter).toBe(
      rig.jamSettings.view.value!.settings.tonalCenter,
    )
  })

  // @test-link [[rule_held_doodle_phrase_one_at_idle]]
  // @test-link [[rule_jam_phrase_one_failure_ladder]]
  it('climbs the rungs with no deadline, then shows the idle generation failure; Retry writes from the doodle', async () => {
    const rig = keptPhraseRig((_, index) =>
      index === 0 ? 'no_legal_pitch_plan' : index < 7 ? 'search_limit_exceeded' : 'real',
    )
    await keepDoodle(rig)

    expect(rig.asked.map((intent) => intent.steering !== undefined)).toEqual([true, true, false])
    expect(rig.asked[0]!.carryIn).toBeDefined()
    expect(rig.asked[1]!.carryIn).toBeUndefined()
    expect(rig.phrase.state.generationError?.message).toMatch(/search_limit_exceeded/)
    expect(rig.phrase.state.result).toBeNull()
    expect(rig.keptDoodle.kept.value).not.toBeNull()

    await expect(rig.phrase.view.value!.actions.retryGeneration()).resolves.toBe(true)
    expect(rig.asked.slice(3).map((intent) => intent.carryIn !== undefined)).toEqual([
      true,
      true,
      true,
      true,
      false,
    ])
    expect(rig.phrase.state.generationError).toBeNull()
    expect(shown(rig.phrase).intent).toBe(rig.asked.at(-1))
  })

  // @test-link [[rule_jam_setting_change_rewrites_kept_phrase_one]]
  it('writes phrase 1 again at once for each Jam setting but the tempo, the doodle kept', async () => {
    const rig = keptPhraseRig()
    await keepDoodle(rig)
    const changes: JamSettingsChange[] = [
      { tonalCenter: 'G' },
      { collection: 'Dorian' },
      { harmonicMotion: 'Static' },
      { tension: 'Build' },
      { embellishments: 'favored' },
      { drift: 'Free' },
      { rhythmLockOn: true },
      { allowedRhythmChanges: ['split_note'] },
    ]

    for (const change of changes) {
      const before = shown(rig.phrase)
      rig.operations.length = 0
      rig.jamSettings.change(change)
      await settle()
      expect(rig.operations).toEqual(['generating', 'notating', 'idle'])
      expect(shown(rig.phrase)).not.toBe(before)
      expect(shown(rig.phrase).intent.seed).not.toEqual(before.intent.seed)
    }
    expect(rig.asked).toHaveLength(changes.length + 1)
    expect(rig.keptDoodle.kept.value?.sessionKey).toBe('session-1')
  })

  // @test-link [[rule_jam_setting_change_rewrites_kept_phrase_one]]
  it('writes nothing for the tempo, a window crossing or the suggestion declined', async () => {
    const rig = keptPhraseRig()
    await keepDoodle(rig)
    const before = shown(rig.phrase)

    rig.jamSettings.change({ tempo: 150 })
    rig.below.now = true
    rig.keptDoodle.decline()
    rig.keptDoodle.playedIn('session-2')
    await settle()

    expect(rig.asked).toHaveLength(1)
    expect(shown(rig.phrase)).toBe(before)
  })

  // @test-link [[rule_shared_setting_changed_in_jam_mode]]
  it("writes phrase 1 again for the shared instrument, my instrument's range or clef included", async () => {
    const rig = keptPhraseRig()
    await keepDoodle(rig)

    rig.instrument.value = { instrumentProfileId: 'eb-alto', myInstrument: null }
    await settle()
    expect(rig.asked).toHaveLength(2)
    expect(shown(rig.phrase).intent.controls.instrumentProfileId).toBe('eb-alto')

    const horn = lowHorn('bass')
    rig.instrument.value = { instrumentProfileId: 'my-instrument', myInstrument: horn }
    await settle()
    expect(rig.asked).toHaveLength(3)
    expect(shown(rig.phrase).intent.instrumentProfile).toEqual(horn.profile)

    rig.instrument.value = { ...rig.instrument.value, myInstrument: lowHorn('treble') }
    await settle()
    expect(rig.asked).toHaveLength(4)

    const ranged = makeMyInstrument({
      template: 'c-keyboard',
      name: 'My low horn',
      clef: 'treble',
      writtenRange: { minMidi: 40, maxMidi: 76 },
      transposition: { octaves: 0, semitones: 3, direction: 'lower' },
    })
    rig.instrument.value = { ...rig.instrument.value, myInstrument: ranged }
    await settle()
    expect(rig.asked).toHaveLength(5)
    expect(rig.keptDoodle.kept.value).not.toBeNull()
  })

  // @test-link [[rule_held_doodle_phrase_one_at_idle]]
  it('writes a new phrase 1 from the doodle on Regenerate phrase, the doodle kept', async () => {
    const rig = keptPhraseRig()
    await keepDoodle(rig)
    const before = shown(rig.phrase)
    const kept = rig.keptDoodle.kept.value

    await expect(rig.phrase.view.value!.actions.regenerate()).resolves.toBe(true)

    expect(shown(rig.phrase)).not.toBe(before)
    expect(shown(rig.phrase).intent.seed).toEqual(makeSeed(2))
    expect(shown(rig.phrase).sessionSeed).toEqual(makeSeed(502))
    expect(rig.keptDoodle.kept.value).toBe(kept)
  })

  // @test-link [[rule_suggestion_use_it]]
  it("sets Jam's key and mode on Jam in {answer}, keeps the doodle and writes phrase 1 in them", async () => {
    const rig = keptPhraseRig()
    await keepDoodle(rig)
    const ports = workspaceReviewJamPorts({
      jamSettings: rig.jamSettings,
      instrument: () => lowHorn('treble').profile,
      settingChanged: () => undefined,
      mode: () => 'jam',
      selectJam: () => undefined,
      jamShown: () => Promise.resolve(),
      closeReview: () => Promise.resolve(),
      keptDoodleSession: () => rig.keptDoodle.kept.value?.sessionKey ?? null,
      keepDoodle: rig.keptDoodle.keep,
      declineKeptDoodle: () => undefined,
    })

    ports.useAnswer(JAM_MODULE, { tonalCenter: 'A', collection: 'Aeolian' })
    await settle()

    expect(rig.jamSettings.view.value?.settings).toMatchObject({
      tonalCenter: 'A',
      collection: 'Aeolian',
    })
    expect(rig.asked).toHaveLength(2)
    expect(shown(rig.phrase).intent.controls).toMatchObject({
      tonalCenter: 'A',
      collection: 'Aeolian',
    })
    expect(rig.keptDoodle.kept.value?.sessionKey).toBe('session-1')
  })

  // @test-link [[rule_jam_setting_change_rewrites_kept_phrase_one]]
  it('never shows a phrase 1 out of date: it is written from the settings in force', async () => {
    const rig = keptPhraseRig()
    await keepDoodle(rig)

    rig.jamSettings.change({ tonalCenter: 'D', tension: 'Edge' })
    await settle()

    const inputs = rig.phrase.inputs.value!
    const current = doodleAttempts(inputs.kept.doodle, inputs.jam).settings
    expect(staleSettingsOf(shown(rig.phrase).settings, current)).toEqual([])
  })

  // @test-link [[rule_held_doodle_dropped_on_change]]
  it('cancels a writing in flight and drops phrase 1 when the doodle is let go', async () => {
    const rig = keptPhraseRig((_, index) => (index === 1 ? 'hold' : 'real'))
    await keepDoodle(rig)
    rig.jamSettings.change({ drift: 'Close' })
    await flushPromises()
    expect(rig.held).toHaveLength(1)

    rig.keptDoodle.letGo()
    await flushPromises()
    rig.held[0]!.resolve(realOutcomeFor(rig.asked[1]!))
    await settle()

    expect(rig.phrase.state.result).toBeNull()
    expect(rig.phrase.state.operation).toBe('idle')
    expect(rig.phrase.written.value).toBeNull()
    expect(rig.phrase.view.value?.kept).toBe(false)
    expect(rig.asked).toHaveLength(2)
  })

  // @test-link [[rule_held_doodle_phrase_one_at_idle]]
  it('writes phrase 1 afresh on writeAgain, and nothing with no doodle kept', async () => {
    const rig = keptPhraseRig()
    rig.phrase.writeAgain()
    await settle()
    expect(rig.asked).toEqual([])

    await keepDoodle(rig)
    rig.phrase.writeAgain()
    await settle()

    expect(rig.asked).toHaveLength(2)
    expect(shown(rig.phrase).intent).toBe(rig.asked[1])
  })
})
