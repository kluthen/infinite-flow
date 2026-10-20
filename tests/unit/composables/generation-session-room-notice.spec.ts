/**
 * The "staff needs more room" notice at Idle: what starts a round under its too-many-notes cause,
 * what clears its no-room cause into a new phrase, how layout failures of the phrase on screen are
 * routed, and how a blocked rhythm combination gives way to no phrase instead.
 */
import { describe, expect, it } from 'vitest'

import { NotationError } from '@/notation/notation-error'
import type { StaffRoomVerdict } from '@/notation/staff-fit-types'
import { FIT_NO_ROOM, FITS, NO_ROOM, ROOM, TOO_WIDE } from './fake-staff-fit'
import {
  createDeferred,
  createFitSession,
  type Deferred,
  type FitSessionOptions,
  flushAsync,
} from './fit-session-harness'

/** A Sixteenth combination blocked from `bp-tablet-landscape` up and allowed below it. */
const SIXTEENTH_ONLY_BLOCKED = {
  noteDensity: 'Sixteenth',
  rhythmicVariety: 'Strict',
  silenceDensity: 'Sparse',
  syncopation: 'Active displacement',
} as const

/** Intent: a staff-layout failure as the engraver raises it on a redraw. */
function layoutFailure(code: 'notation_no_room' | 'notation_notes_too_wide'): NotationError {
  return new NotationError(code, `layout failure ${code}`, {})
}

type FitSession = ReturnType<typeof createFitSession>['session']

/** What a notice set-up takes: the window's side of the width, and controls applied beforehand. */
interface NoticeSetup {
  readonly belowTabletLandscape?: boolean
  readonly checkRoom?: NonNullable<FitSessionOptions['checkRoom']>
  readonly configure?: (session: FitSession) => void
}

/** Intent: a session whose first run failed every attempt, so the too-many-notes notice shows. */
async function afterFailedRound(setup: NoticeSetup = {}) {
  const built = createFitSession(setup)
  setup.configure?.(built.session)
  built.staff.report(500)
  built.staff.setFallbackFit(TOO_WIDE)
  await built.session.actions.generate()
  expect(built.session.state.roomNotice).toBe('notes_too_wide')
  built.staff.setFallbackFit(FITS)
  return built
}

/** Intent: a session showing the no-room notice after a phrase on screen lost its room. */
async function underNoRoomNotice(setup: NoticeSetup = {}) {
  const built = createFitSession(setup)
  setup.configure?.(built.session)
  built.staff.report(500)
  await built.session.actions.generate()
  built.staff.setRoom(NO_ROOM)
  expect(built.session.actions.reportNotationFailure(layoutFailure('notation_no_room'))).toBe(true)
  expect(built.session.state.roomNotice).toBe('no_room')
  return built
}

/** Intent: apply the combination that blocks generation from `bp-tablet-landscape` up. */
function useSixteenthOnlyBlocked(session: FitSession): void {
  for (const [key, value] of Object.entries(SIXTEENTH_ONLY_BLOCKED)) {
    session.actions.setControl(key as keyof typeof SIXTEENTH_ONLY_BLOCKED, value)
  }
}

// @test-link [[rule_too_dense_notice_retry_rounds]]
// @test-link [[rule_retry_round_window_changes]]
describe('too-many-notes notice: what starts a round', () => {
  it('starts a round, notice kept, when the staff gets wider, and clears the notice on a fit', async () => {
    const built = await afterFailedRound()

    built.staff.report(600)
    await Promise.resolve()
    await Promise.resolve()

    expect(built.session.state.operation).toBe('generating')
    expect(built.session.state.roomNotice).toBe('notes_too_wide')
    expect(built.session.state.retriesRunning).toBe(true)
    await flushAsync()
    expect(built.counts.seed).toBe(5)
    expect(built.session.state.result?.seed).toBe(5)
    expect(built.session.state.roomNotice).toBeNull()
  })

  it('starts nothing when the staff gets narrower and there is still room', async () => {
    const built = await afterFailedRound()

    built.staff.report(450)
    await flushAsync()

    expect(built.counts.seed).toBe(4)
    expect(built.session.state.roomNotice).toBe('notes_too_wide')
  })

  it('takes the no-room cause when the staff narrows to no room, announcing nothing new', async () => {
    const built = await afterFailedRound()
    built.staff.setRoom(NO_ROOM)

    built.staff.report(300)
    await flushAsync()

    expect(built.counts.seed).toBe(4)
    expect(built.session.state.roomNotice).toBe('no_room')
    expect(built.session.state.roomNoticeAnnouncements).toBe(1)
  })

  it('measures wider against the last report, including reports made during a run', async () => {
    const built = await afterFailedRound()
    built.staff.setFallbackFit(TOO_WIDE)
    const round = built.session.actions.regenerate()
    built.staff.report(400)
    await round
    expect(built.counts.seed).toBe(8)

    built.staff.report(450)
    await flushAsync()

    expect(built.counts.seed).toBe(12)
  })

  it('announces the notice again when a round fails', async () => {
    const built = await afterFailedRound()
    built.staff.setFallbackFit(TOO_WIDE)

    await built.session.actions.regenerate()

    expect(built.session.state.roomNotice).toBe('notes_too_wide')
    expect(built.session.state.roomNoticeAnnouncements).toBe(2)
  })

  it('starts a round on a change to a setting the phrase is generated from', async () => {
    const built = await afterFailedRound()

    expect(built.session.actions.setControl('noteDensity', 'Eighth')).toBe(true)
    await flushAsync()

    expect(built.counts.seed).toBe(5)
    expect(built.generated[4]!.controls.noteDensity).toBe('Eighth')
    expect(built.session.state.roomNotice).toBeNull()
  })

  // @test-link [[module_generative_profile_selection]]
  it('starts a round on a preset choice that changes a setting', async () => {
    const built = await afterFailedRound()

    built.session.actions.selectPreset('jazz')
    await flushAsync()

    expect(built.counts.seed).toBe(5)
  })

  // @test-link [[module_generative_profile_selection]]
  it('starts nothing on choosing the preset already selected', async () => {
    const built = await afterFailedRound()

    expect(built.session.actions.selectPreset('neutral')).toBe(true)
    await flushAsync()

    expect(built.counts.seed).toBe(4)
    expect(built.session.state.roomNotice).toBe('notes_too_wide')
  })

  // @test-link [[module_profile_control_customization]]
  it('starts a round on a figure-level change', async () => {
    const built = await afterFailedRound()

    expect(built.session.actions.setFigureLevel('neighborTone', 'off')).toBe(true)
    await flushAsync()

    expect(built.counts.seed).toBe(5)
    expect(built.generated[4]!.figureLevels.neighborTone).toBe('off')
  })

  it('starts nothing on a tempo change or a theme change', async () => {
    const built = await afterFailedRound()

    built.session.actions.setControl('tempo', 120)
    built.session.actions.setTheme('Dark')
    await flushAsync()

    expect(built.counts.seed).toBe(4)
    expect(built.session.state.roomNotice).toBe('notes_too_wide')
  })

  it('starts a round on an instrument-profile switch', async () => {
    const built = await afterFailedRound()

    await expect(built.session.actions.selectInstrumentProfile('eb-alto')).resolves.toBe(
      'regenerated',
    )

    expect(built.generated[4]!.controls.instrumentProfileId).toBe('eb-alto')
    expect(built.session.state.result?.seed).toBe(5)
    expect(built.session.state.roomNotice).toBeNull()
  })

  it('starts a round on Regenerate phrase and on Retry generation under a banner', async () => {
    let calls = 0
    const built = createFitSession({
      generate: () => {
        calls += 1
        return calls === 5 ? Promise.reject(new Error('no phrase')) : undefined
      },
    })
    built.staff.setFallbackFit(TOO_WIDE)
    await built.session.actions.generate()
    await built.session.actions.regenerate()
    expect(built.session.state.generationError).not.toBeNull()
    built.staff.setFallbackFit(FITS)

    await expect(built.session.actions.retryGeneration()).resolves.toBe(true)

    expect(built.counts.seed).toBe(6)
    expect(built.session.state.generationError).toBeNull()
    expect(built.session.state.roomNotice).toBeNull()
  })
})

// @test-link [[rule_unsupported_rhythm_gives_way_to_no_phrase]]
describe('room notice under a blocked rhythm combination', () => {
  it('gives way to no phrase, generating nothing, when a setting change blocks the round', async () => {
    const built = await afterFailedRound()

    // Quarter + Strict + Sparse + Active displacement is a pinned unsupported combination.
    built.session.actions.setControl('syncopation', 'Active displacement')
    await flushAsync()

    expect(built.counts.seed).toBe(4)
    expect(built.session.state.roomNotice).toBeNull()
    expect(built.session.state.result).toBeNull()
    expect(built.session.state.generationError).toBeNull()
  })

  it('gives way to no phrase when an instrument-profile switch lands on a blocked combination', async () => {
    const built = await afterFailedRound({
      belowTabletLandscape: true,
      configure: useSixteenthOnlyBlocked,
    })
    built.viewport.setWithoutNotifying(false)

    await expect(built.session.actions.selectInstrumentProfile('eb-alto')).resolves.toBe(
      'cleared_unsupported_rhythm',
    )

    expect(built.counts.seed).toBe(4)
    expect(built.session.state.roomNotice).toBeNull()
  })

  it('clears the no-room notice to no phrase, and generates nothing once unblocked', async () => {
    const built = await underNoRoomNotice({
      belowTabletLandscape: true,
      configure: useSixteenthOnlyBlocked,
    })
    built.viewport.cross(false)
    built.staff.setRoom(ROOM)

    built.staff.report(900)
    await flushAsync()

    expect(built.session.state.roomNotice).toBeNull()
    expect(built.session.state.result).toBeNull()
    expect(built.counts.seed).toBe(1)
    built.viewport.cross(true)
    built.staff.report(950)
    await flushAsync()
    expect(built.counts.seed).toBe(1)
  })

  it('shows no phrase and no notice when the phrase on screen stops fitting while blocked', async () => {
    const built = createFitSession({ belowTabletLandscape: true })
    useSixteenthOnlyBlocked(built.session)
    await built.session.actions.generate()
    built.viewport.setWithoutNotifying(false)

    expect(
      built.session.actions.reportNotationFailure(layoutFailure('notation_notes_too_wide')),
    ).toBe(true)
    await flushAsync()

    expect(built.counts.seed).toBe(1)
    expect(built.session.state.result).toBeNull()
    expect(built.session.state.roomNotice).toBeNull()
    expect(built.session.state.notationError).toBeNull()
    expect(built.log.at(-1)).toBe('clear')
  })
})

// @test-link [[rule_staff_needs_room_notice]]
// @test-link [[rule_staff_notice_gives_way_to_new_phrase]]
describe('no-room notice and layout failures of the phrase on screen', () => {
  it('clears into a new phrase with no score shown once the staff has room again', async () => {
    const built = await underNoRoomNotice()
    built.staff.setRoom(ROOM)

    built.staff.report(700)
    await flushAsync()

    expect(built.log.slice(-4)).toEqual(['clear', 'generate:2', 'check:2', 'notate:2'])
    expect(built.notated.map((result) => result.seed)).toEqual([1, 2])
    expect(built.session.state.roomNotice).toBeNull()
    expect(built.session.state.result?.seed).toBe(2)
  })

  it('stays while there is still no room, whatever the report', async () => {
    const built = await underNoRoomNotice()

    built.staff.report(900)
    await flushAsync()

    expect(built.counts.seed).toBe(1)
    expect(built.session.state.roomNotice).toBe('no_room')
  })

  it('runs the room check with the new written key on a setting change, clearing when it fits', async () => {
    const built = await underNoRoomNotice()
    built.staff.setRoom(ROOM)

    built.session.actions.setControl('tonalCenter', 'D')
    await flushAsync()

    expect(built.staff.roomChecks.at(-1)).toMatchObject({ accidental: 'sharp', count: 2 })
    expect(built.counts.seed).toBe(2)
    expect(built.session.state.roomNotice).toBeNull()
  })

  // @test-link [[module_generative_profile_selection]]
  it('runs a room check on a preset choice that changes a setting, and none on a no-op choice', async () => {
    const built = await underNoRoomNotice()
    const checksBefore = built.staff.roomChecks.length

    expect(built.session.actions.selectPreset('neutral')).toBe(true)
    await flushAsync()
    expect(built.staff.roomChecks).toHaveLength(checksBefore)

    built.staff.setRoom(ROOM)
    expect(built.session.actions.selectPreset('jazz')).toBe(true)
    await flushAsync()

    expect(built.staff.roomChecks.length).toBeGreaterThan(checksBefore)
    expect(built.counts.seed).toBe(2)
    expect(built.session.state.roomNotice).toBeNull()
  })

  it('only changes the instrument on an instrument-profile switch', async () => {
    const built = await underNoRoomNotice()

    await expect(built.session.actions.selectInstrumentProfile('eb-alto')).resolves.toBe('applied')

    expect(built.counts.seed).toBe(1)
    expect(built.session.state.roomNotice).toBe('no_room')
  })

  it('lands back on the notice with no retries when Regenerate finds no room', async () => {
    const built = await underNoRoomNotice()
    built.staff.queueFit(FIT_NO_ROOM)

    await built.session.actions.regenerate()

    expect(built.counts.seed).toBe(2)
    expect(built.session.state.roomNotice).toBe('no_room')
    expect(built.session.state.roomNoticeAnnouncements).toBe(1)
  })

  it('replaces a phrase on screen left too wide, with no score shown meanwhile', async () => {
    const built = createFitSession()
    await built.session.actions.generate()

    expect(
      built.session.actions.reportNotationFailure(layoutFailure('notation_notes_too_wide')),
    ).toBe(true)
    expect(built.session.state.result).toBeNull()
    await flushAsync()

    expect(built.log.slice(-4)).toEqual(['clear', 'generate:2', 'check:2', 'notate:2'])
    expect(built.session.state.result?.seed).toBe(2)
    expect(built.session.state.notationError).toBeNull()
  })

  it('shows the no-room notice for a phrase on screen, keeping a generation-failure banner', async () => {
    let calls = 0
    const built = createFitSession({
      generate: () => {
        calls += 1
        return calls === 2 ? Promise.reject(new Error('no phrase')) : undefined
      },
    })
    await built.session.actions.generate()
    await built.session.actions.regenerate()

    expect(built.session.actions.reportNotationFailure(layoutFailure('notation_no_room'))).toBe(
      true,
    )

    expect(built.session.state.roomNotice).toBe('no_room')
    expect(built.session.state.roomNoticeAnnouncements).toBe(1)
    expect(built.session.state.result).toBeNull()
    expect(built.session.state.generationError?.message).toBe('no phrase')
    expect(built.session.state.notationError).toBeNull()
    expect(built.log.at(-1)).toBe('clear')
  })

  it('keeps the retryable notation error for any other redraw failure', async () => {
    const built = createFitSession()
    await built.session.actions.generate()
    const failure = new NotationError('notation_engraving_failed', 'engraving failed', {})

    expect(built.session.actions.reportNotationFailure(failure)).toBe(true)

    expect(built.session.state.notationError).toBe(failure)
    expect(built.session.state.roomNotice).toBeNull()
    expect(built.session.state.result?.seed).toBe(1)
  })

  it('routes a Retry notation that hits no room to the notice', async () => {
    let draws = 0
    const built = createFitSession({
      notate: () => {
        draws += 1
        if (draws === 1)
          return Promise.reject(new NotationError('notation_font_unavailable', 'x', {}))
        return Promise.reject(layoutFailure('notation_no_room'))
      },
    })
    await built.session.actions.generate()
    expect(built.session.state.notationError).not.toBeNull()

    await built.session.actions.retryNotation()

    expect(built.session.state.roomNotice).toBe('no_room')
    expect(built.session.state.notationError).toBeNull()
    expect(built.session.state.result).toBeNull()
    expect(built.session.state.operation).toBe('idle')
  })
})

/** Intent: a session under the no-room notice whose every room check waits for the test. */
async function underNoRoomNoticeWithHeldChecks() {
  const checks: Deferred<StaffRoomVerdict>[] = []
  const built = await underNoRoomNotice({
    checkRoom: () => {
      const check = createDeferred<StaffRoomVerdict>()
      checks.push(check)
      return check.promise
    },
  })
  return { ...built, checks }
}

// @test-link [[rule_staff_notice_gives_way_to_new_phrase]]
describe('a room check superseded before it resolves', () => {
  it('is ignored when a run started and ended meanwhile, even back on the same notice', async () => {
    const built = await underNoRoomNoticeWithHeldChecks()
    built.staff.report(700)
    built.staff.queueFit(FIT_NO_ROOM)
    await built.session.actions.regenerate()
    expect(built.session.state.roomNotice).toBe('no_room')

    built.checks[0]!.resolve(ROOM)
    await flushAsync()

    expect(built.counts.seed).toBe(2)
    expect(built.session.state.roomNotice).toBe('no_room')
  })

  it('is ignored when a newer report ran its own room check', async () => {
    const built = await underNoRoomNoticeWithHeldChecks()
    built.staff.report(700)
    built.staff.report(800)
    built.checks[1]!.resolve(NO_ROOM)
    await flushAsync()

    built.checks[0]!.resolve(ROOM)
    await flushAsync()

    expect(built.checks).toHaveLength(2)
    expect(built.counts.seed).toBe(1)
    expect(built.session.state.roomNotice).toBe('no_room')
  })
})
