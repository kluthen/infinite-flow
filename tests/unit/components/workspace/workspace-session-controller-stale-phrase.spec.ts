/**
 * The session controller with a stale phrase 1 (master spec §16), on the fake audio clock at
 * 240 BPM from 5 s: Start, once every start condition holds, opens the stale-phrase prompt instead
 * of starting (no sound, no lock, no count-in); Use it starts from phrase 1 as on screen with its
 * own settings beside the session's, the conditions checked again; dismissing it, or a start
 * condition no longer holding, closes it with nothing started; the starting note opens the same
 * prompt and no note starts anything while it shows; the controls show phrase 1's settings until
 * phrase 2 sounds. A tempo change alone makes nothing stale.
 */
import { describe, expect, it, vi } from 'vitest'

import {
  controllerRig,
  outputsOf,
  playTo,
  RIG_TEMPO,
  type ControllerRig,
} from './session-controller-rig'
import { connectKeys, lift, press, rigStartingNote } from './session-controller-midi'
import { phraseStart } from './session-controller-timeline'

/** Intent: a rig whose Written key changed to F♯ at Idle after phrase 1 was generated in C. */
function staleRig(): ControllerRig {
  const rig = controllerRig()
  rig.idle.controls = { ...rig.idle.controls, tonalCenter: 'F#' }
  return rig
}

/** Intent: nothing of a start happened: no audio unlock, no lock, no transport, no runner. */
function expectNothingStarted(rig: ControllerRig, unlock: ReturnType<typeof vi.spyOn>): void {
  expect(rig.controller.state.phase).toBe('idle')
  expect(unlock).not.toHaveBeenCalled()
  expect(rig.browser.wakeLock.requests()).toBe(0)
  expect(rig.browser.orientationLock.requests()).toBe(0)
  expect(rig.runnerInputs).toHaveLength(0)
  expect(rig.saveHolds).toEqual([])
}

// @test-link [[rule_stale_phrase_prompt_at_start]]
// @test-link [[service_session_start]]
describe('session controller: a stale phrase 1 at Start', () => {
  // @test-link [[rule_stale_phrase_prompt_at_start]]
  it('opens the prompt, naming the changed setting, and starts nothing', () => {
    const rig = staleRig()
    const unlock = vi.spyOn(rig.transport, 'unlock')

    expect(rig.controller.start()).toBe('asked')

    expect(rig.controller.state.stalePhrasePrompt).toEqual({
      opener: 'start',
      changed: ['tonalCenter'],
    })
    expectNothingStarted(rig, unlock)
    expect(rig.controller.state.canStart).toBe(true)
  })

  // @test-link [[rule_stale_phrase_prompt_at_start]]
  // @test-link [[rule_tempo_never_affects_generation]]
  it('starts at once, asking nothing, after only a tempo change or a change made and undone', () => {
    const tempo = controllerRig()
    tempo.idle.controls = { ...tempo.idle.controls, tempo: 120 }
    const undone = controllerRig()
    undone.idle.controls = { ...undone.idle.controls, tonalCenter: 'F#' }
    undone.idle.controls = {
      ...undone.idle.controls,
      tonalCenter: undone.settings.controls.tonalCenter,
    }

    expect(tempo.controller.start()).toBe('started')
    expect(undone.controller.start()).toBe('started')
    expect(tempo.controller.state.stalePhrasePrompt).toBeNull()
    expect(undone.controller.state.phase).toBe('count-in')
  })

  // @test-link [[rule_session_start_conditions]]
  it('refuses a blocked start as before, opening no prompt', () => {
    const rig = staleRig()
    rig.idle.generationError = new Error('generation failed')

    expect(() => rig.controller.start()).toThrow(/cannot start/)
    expect(rig.controller.state.stalePhrasePrompt).toBeNull()
  })

  // @test-link [[rule_stale_phrase_prompt_at_start]]
  // @test-link [[service_session_engine]]
  // @test-link [[rule_phrase_one_is_idle_phrase]]
  it("Use it starts from phrase 1 as on screen, phrase 1's settings beside the session's", async () => {
    const rig = staleRig()
    rig.controller.start()

    expect(rig.controller.useStalePhrase()).toBe(true)

    expect(rig.controller.state.stalePhrasePrompt).toBeNull()
    expect(rig.controller.state.phase).toBe('count-in')
    const { start } = rig.runnerInputs[0]!
    expect(start.phraseOne.intent).toBe(rig.phraseOne.intent)
    expect(start.settings.controls.tonalCenter).toBe('F#')
    expect(start.phraseOneSettings?.controls).toEqual({
      ...rig.settings.controls,
      tempo: RIG_TEMPO,
    })
    await playTo(rig, 7)
    const [phraseTwo] = outputsOf(rig, 'request-generation')
    expect(phraseTwo?.intent.controls.tonalCenter).toBe('F#')
    expect(phraseTwo?.intent.carryIn?.finalHarmony ?? null).toBeNull()
    rig.controller.stop()
  })

  // @test-link [[module_session_shown_settings]]
  it("shows phrase 1's settings through the count-in and phrase 1, then the session's from phrase 2", async () => {
    const rig = staleRig()
    rig.controller.start()
    rig.controller.useStalePhrase()

    expect(rig.controller.state.shownSettings?.controls.tonalCenter).toBe(
      rig.settings.controls.tonalCenter,
    )
    expect(rig.controller.state.shownSettings?.musicalProfile).toEqual(rig.idle.profileSelection)
    await playTo(rig, phraseStart(2) - 0.1)
    expect(rig.controller.state.shownSettings?.controls.tonalCenter).toBe(
      rig.settings.controls.tonalCenter,
    )
    await playTo(rig, phraseStart(2) + 0.1)
    expect(rig.controller.state.shownSettings?.controls.tonalCenter).toBe('F#')
    rig.controller.stop()
  })

  // @test-link [[rule_session_start_conditions]]
  it('Use it starts nothing once a start condition no longer holds, and closes the prompt', () => {
    const rig = staleRig()
    const unlock = vi.spyOn(rig.transport, 'unlock')
    rig.controller.start()
    rig.idle.notationError = new Error('engraving failed')

    expect(rig.controller.useStalePhrase()).toBe(false)

    expect(rig.controller.state.stalePhrasePrompt).toBeNull()
    expectNothingStarted(rig, unlock)
  })

  // @test-link [[rule_stale_phrase_prompt_at_start]]
  it('dismissing changes nothing and starts nothing; the next start asks again', () => {
    const rig = staleRig()
    const unlock = vi.spyOn(rig.transport, 'unlock')
    rig.controller.start()

    rig.controller.dismissStalePhrase()

    expect(rig.controller.state.stalePhrasePrompt).toBeNull()
    expectNothingStarted(rig, unlock)
    expect(rig.idle.controls.tonalCenter).toBe('F#')
    expect(rig.controller.start()).toBe('asked')
    const shown = rig.controller.state.stalePhrasePrompt
    expect(rig.controller.start()).toBe('asked')
    expect(rig.controller.state.stalePhrasePrompt).toBe(shown)
    expect(rig.controller.state.phase).toBe('idle')
  })

  // @test-link [[rule_stale_phrase_prompt_at_start]]
  it('closes by itself when the workspace leaves Ready while it shows', async () => {
    const rig = staleRig()
    rig.controller.start()

    rig.idle.operation = 'generating'
    await Promise.resolve()

    expect(rig.controller.state.stalePhrasePrompt).toBeNull()
    expect(() => rig.controller.dismissStalePhrase()).toThrow(/no prompt shows/)
  })
})

// @test-link [[rule_stale_phrase_prompt_at_start]]
// @test-link [[module_session_starting_note]]
// @test-link [[rule_midi_starting_note]]
describe('session controller: a stale phrase 1 at the starting note', () => {
  // @test-link [[rule_midi_starting_note]]
  // @test-link [[module_session_starting_note]]
  it('opens the prompt and starts nothing; no note starts anything while it shows', async () => {
    const rig = staleRig()
    await connectKeys(rig)
    const note = rigStartingNote(rig)
    expect(rig.controller.state.startingNote).toEqual(note)

    press(rig, note.concertPitch)
    lift(rig, note.concertPitch)

    expect(rig.controller.state.stalePhrasePrompt).toEqual({
      opener: 'note',
      changed: ['tonalCenter'],
    })
    expect(rig.controller.state.phase).toBe('idle')
    expect(rig.controller.state.startingNote).toBeNull()
    press(rig, note.concertPitch)
    lift(rig, note.concertPitch)
    await playTo(rig, 6)
    expect(rig.controller.state.phase).toBe('idle')
    expect(rig.runnerInputs).toHaveLength(0)

    rig.controller.dismissStalePhrase()
    expect(rig.controller.state.startingNote).toEqual(note)
  })

  // @test-link [[rule_midi_starting_note]]
  it('starts the session at once when phrase 1 is not stale', async () => {
    const rig = controllerRig()
    await connectKeys(rig)
    const note = rigStartingNote(rig)

    press(rig, note.concertPitch)

    expect(rig.controller.state.stalePhrasePrompt).toBeNull()
    expect(rig.controller.state.phase).toBe('count-in')
    lift(rig, note.concertPitch)
    rig.controller.stop()
  })
})
