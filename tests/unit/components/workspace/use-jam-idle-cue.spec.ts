// @vitest-environment node
/**
 * Jam mode's Idle cue, as the shell builds it over Jam's loaded code: nothing outside Jam mode,
 * in the review mode or before Jam's code has loaded; `jam-needs-controller` without a connected
 * controller, in every idle state of Jam mode; the home note exactly while a fresh Jam could
 * start, asking for the page's first click while it waits for one; and it follows the settings.
 */
import { describe, expect, it } from 'vitest'
import { reactive } from 'vue'

import type { JamModeModule } from '@/components/workspace/load-jam-mode'
import type { FreshJamStartFacts } from '@/components/workspace/session-action-policy'
import { useJamIdleCue, type JamCueSettings } from '@/components/workspace/use-jam-idle-cue'
import * as jamMode from '@/jam/jam-mode'

/** Jam's code entry, as Jam's loader gives it once loaded. */
const JAM_MODULE: JamModeModule = jamMode

/** Intent: the cue over reactive readings a test changes: Jam mode at Idle, ready to start. */
function cueRig() {
  const world = reactive({
    loaded: true,
    jamShowing: true,
    pageAwaitsClick: false,
    settings: {
      tonalCenter: 'G',
      collection: 'Major',
      instrumentProfileId: 'bb-tenor',
      myInstrument: null,
    } as JamCueSettings,
    facts: {
      controllerLoaded: true,
      controllerConnected: true,
      sessionActive: false,
      reviewShowing: false,
      sheetOpen: false,
      orientationNoticeShown: false,
      jamStaffShown: true,
    } as FreshJamStartFacts,
  })
  const { cue, needsController } = useJamIdleCue({
    jamModule: () => (world.loaded ? JAM_MODULE : null),
    jamShowing: () => world.jamShowing,
    settings: () => world.settings,
    startFacts: () => world.facts,
    pageAwaitsClick: () => world.pageAwaitsClick,
  })
  return { world, cue, needsController }
}

// @test-link [[rule_jam_starting_note_is_home_note]]
// @test-link [[rule_jam_needs_controller]]
// @test-link [[rule_jam_start_conditions]]
describe('useJamIdleCue', () => {
  // @test-link [[rule_jam_starting_note_is_home_note]]
  it("names the home note while a fresh Jam could start, and follows Jam's key", () => {
    const { world, cue, needsController } = cueRig()
    // G major on the tenor saxophone: written G4, the G nearest the middle (C5) of C4 to C6.
    expect(cue.value).toEqual({ kind: 'starting-note', label: 'G4', awaitsClick: false })
    expect(needsController.value).toBe(false)

    world.settings = { ...world.settings, tonalCenter: 'A#', collection: 'Major' }
    expect(cue.value).toEqual({ kind: 'starting-note', label: 'B♭4', awaitsClick: false })

    world.pageAwaitsClick = true
    expect(cue.value).toEqual({ kind: 'starting-note', label: 'B♭4', awaitsClick: true })
  })

  // @test-link [[rule_jam_needs_controller]]
  it('shows jam-needs-controller without a connected controller, whatever else holds', () => {
    const { world, cue, needsController } = cueRig()
    world.facts = { ...world.facts, controllerConnected: false, jamStaffShown: false }

    expect(cue.value).toEqual({ kind: 'needs-controller' })
    expect(needsController.value).toBe(true)

    world.facts = { ...world.facts, controllerConnected: true, jamStaffShown: true }
    expect(cue.value?.kind).toBe('starting-note')
  })

  // @test-link [[rule_jam_start_conditions]]
  it.each<[string, Partial<FreshJamStartFacts>]>([
    ['a sheet open', { sheetOpen: true }],
    ['the staff not shown', { jamStaffShown: false }],
    ['the rotate-device notice', { orientationNoticeShown: true }],
    ['the session controller still loading', { controllerLoaded: false }],
  ])('names no note with %s', (_name, change) => {
    const { world, cue } = cueRig()
    world.facts = { ...world.facts, ...change }

    expect(cue.value).toBeNull()
  })

  // @test-link [[rule_jam_start_conditions]]
  it("holds nothing outside Jam mode, in the review mode or before Jam's code loads", () => {
    const { world, cue } = cueRig()
    world.facts = { ...world.facts, controllerConnected: false, reviewShowing: true }
    expect(cue.value).toBeNull()

    world.facts = { ...world.facts, reviewShowing: false }
    world.jamShowing = false
    expect(cue.value).toBeNull()

    world.jamShowing = true
    world.facts = { ...world.facts, controllerConnected: true }
    world.loaded = false
    expect(cue.value).toBeNull()
  })
})
