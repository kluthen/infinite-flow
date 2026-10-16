/**
 * The Idle session's actions on my instrument: saving it (made or changed) and deleting it, with
 * what each does to the selection and the phrase. Split out of use-generation-session.ts; it owns
 * no state of its own and reads and writes the shared session state. Loaded on demand, through
 * ./load-my-instrument-actions.ts only.
 *
 * Every save writes my instrument's record at once, through the visit's saves (the save policy
 * holds, refuses or skips it); its effect on the selection and the phrase waits for a generation
 * under way to end, as an instrument switch made at that moment would be applied.
 */

import { watch } from 'vue'

import { MY_INSTRUMENT_ID } from '@/domain/profile/instrument-profiles'
import type { MyInstrument } from '@/domain/profile/my-instrument'
import type { MyInstrumentSaves } from '@/storage/settings-saver'
import type { ProfileSelectionOutcome } from './generation-session-profile-switch'
import type { MutableGenerationSessionState } from './generation-session-types'

/**
 * What saving or deleting my instrument did: nothing (`unchanged`), saved it without touching the
 * phrase (`saved`), redrew the phrase in its new clef (`redrawn`), or a switch's outcome.
 */
// @spec-link [[req_my_instrument]]
export type MyInstrumentChangeOutcome = 'unchanged' | 'saved' | 'redrawn' | ProfileSelectionOutcome

/** What the actions need from the root session composable. */
export interface MyInstrumentActionDependencies<TResult> {
  readonly state: MutableGenerationSessionState<TResult>
  /** Write and delete my instrument's record. */
  readonly saves: MyInstrumentSaves
  /** The instrument switch, as the instrument control makes it. */
  readonly selectInstrumentProfile: (
    id: MutableGenerationSessionState<TResult>['controls']['instrumentProfileId'],
  ) => Promise<ProfileSelectionOutcome>
  /** Replace the phrase as an instrument switch does, the selection unchanged. */
  readonly replacePhrase: () => Promise<ProfileSelectionOutcome>
  /** Draw the phrase on screen again, as it is, in the clef its instrument has now. */
  readonly redrawPhrase: () => Promise<boolean>
}

/** The actions on my instrument. */
export interface MyInstrumentActions {
  readonly saveMyInstrument: (instrument: MyInstrument) => Promise<MyInstrumentChangeOutcome>
  readonly saveAndSelectMyInstrument: (
    instrument: MyInstrument,
  ) => Promise<MyInstrumentChangeOutcome>
  readonly deleteMyInstrument: () => Promise<MyInstrumentChangeOutcome>
}

/** Intent: whether two my instruments sound the same: the same written range and transposition. */
function soundsTheSame(before: MyInstrument, after: MyInstrument): boolean {
  return (
    before.writtenRange.minMidi === after.writtenRange.minMidi &&
    before.writtenRange.maxMidi === after.writtenRange.maxMidi &&
    before.transposition.octaves === after.transposition.octaves &&
    before.transposition.semitones === after.transposition.semitones &&
    before.transposition.direction === after.transposition.direction
  )
}

/** Intent: whether saving `after` over `before` changes nothing the player sees or hears. */
function sameMyInstrument(before: MyInstrument, after: MyInstrument): boolean {
  return (
    soundsTheSame(before, after) &&
    before.name === after.name &&
    before.clef === after.clef &&
    before.template === after.template
  )
}

/**
 * Intent: build the actions on my instrument. Saving a new one saves it and selects it, an
 * instrument switch; saving one and selecting it (the transposition check's way) also selects one
 * that exists but is not selected. Saving a change saves it; while it is selected, a change of range or
 * transposition replaces the phrase as a switch does, and a change of clef alone redraws the
 * phrase in it, keeping it; a change of name relabels only. Deleting deletes its record; while it
 * is selected, its template is selected first, a switch, so no selection ever names a my
 * instrument that is gone.
 */
// @spec-link [[req_my_instrument]]
// @spec-link [[rule_profile_switch_validates_phrase]]
// @spec-link [[entity_my_instrument_record]]
export function createMyInstrumentActions<TResult>(
  deps: MyInstrumentActionDependencies<TResult>,
): MyInstrumentActions {
  const { state } = deps

  /** Intent: resolve once no generation is under way at Idle. */
  function whenIdle(): Promise<void> {
    if (state.operation === 'idle') return Promise.resolve()
    return new Promise((resolve) => {
      const stop = watch(
        () => state.operation,
        (operation) => {
          if (operation !== 'idle') return
          stop()
          resolve()
        },
      )
    })
  }

  /** Intent: what a saved change does to the phrase of the selected my instrument. */
  async function afterChange(
    before: MyInstrument,
    after: MyInstrument,
  ): Promise<MyInstrumentChangeOutcome> {
    if (!soundsTheSame(before, after)) {
      await whenIdle()
      return deps.replacePhrase()
    }
    if (before.clef === after.clef) return 'saved'
    await whenIdle()
    await deps.redrawPhrase()
    return 'redrawn'
  }

  /** Intent: save my instrument, made or changed (see the factory's intent). */
  async function saveMyInstrument(instrument: MyInstrument): Promise<MyInstrumentChangeOutcome> {
    const before = state.myInstrument
    if (before !== null && sameMyInstrument(before, instrument)) return 'unchanged'
    deps.saves.saveMyInstrument(instrument)
    state.myInstrument = instrument
    if (before === null) {
      await whenIdle()
      return deps.selectInstrumentProfile(MY_INSTRUMENT_ID)
    }
    if (state.controls.instrumentProfileId !== MY_INSTRUMENT_ID) return 'saved'
    return afterChange(before, instrument)
  }

  /**
   * Intent: save my instrument and make it the selection. A new one, or the selected one, is saved
   * as `saveMyInstrument` saves it; one that exists but is not selected has its record written
   * at once (unless nothing in it changed), then is selected, a switch that replaces the phrase,
   * once a generation under way has ended.
   */
  // @spec-link [[rule_transposition_check_sets_my_instrument]]
  async function saveAndSelectMyInstrument(
    instrument: MyInstrument,
  ): Promise<MyInstrumentChangeOutcome> {
    const before = state.myInstrument
    if (before === null || state.controls.instrumentProfileId === MY_INSTRUMENT_ID) {
      return saveMyInstrument(instrument)
    }
    if (!sameMyInstrument(before, instrument)) {
      deps.saves.saveMyInstrument(instrument)
      state.myInstrument = instrument
    }
    await whenIdle()
    return deps.selectInstrumentProfile(MY_INSTRUMENT_ID)
  }

  return {
    saveMyInstrument,
    saveAndSelectMyInstrument,
    deleteMyInstrument: async () => {
      const before = state.myInstrument
      if (before === null) throw new Error('my instrument: there is none to delete')
      if (state.controls.instrumentProfileId !== MY_INSTRUMENT_ID) {
        state.myInstrument = null
        deps.saves.deleteMyInstrument()
        return 'saved'
      }
      await whenIdle()
      const switched = deps.selectInstrumentProfile(before.template)
      state.myInstrument = null
      deps.saves.deleteMyInstrument()
      return switched
    },
  }
}
