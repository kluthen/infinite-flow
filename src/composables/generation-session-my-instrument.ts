/**
 * The Idle session's actions on my instrument: saving it (made or changed) and deleting it, with
 * what each does to the selection and the phrase. Split out of use-generation-session.ts; it owns
 * no state of its own and reads and writes the shared session state. Loaded on demand, through
 * ./load-my-instrument-actions.ts only.
 *
 * A save that erases nothing writes my instrument's record at once, through the visit's saves
 * (the save policy holds, refuses or skips it), and applies at once. Deleting my instrument, and
 * a change of its range or transposition while it has kept sessions, are one batch with the
 * deletes of the sessions the caller counted (spec D326): nothing changes in memory until it is
 * saved, and a refusal, or saving off with sessions to erase, changes nothing. Each effect on the
 * selection and the phrase waits for a generation under way to end, as an instrument switch made
 * at that moment would be applied.
 */

import { watch } from 'vue'

import { MY_INSTRUMENT_ID } from '@/domain/profile/instrument-profiles'
import type { MyInstrument } from '@/domain/profile/my-instrument'
import type { KeptChangeOutcome, KeptChanges } from '@/storage/save-policy'
import type { MyInstrumentSaves } from '@/storage/settings-saver'
import type { ProfileSelectionOutcome } from './generation-session-profile-switch'
import type { MutableGenerationSessionState } from './generation-session-types'

/**
 * What saving or deleting my instrument did: nothing (`unchanged`), saved it without touching the
 * phrase (`saved`), redrew the phrase in its new clef (`redrawn`), or a switch's outcome; or, for
 * its batch with its kept sessions, nothing because the device refused it (`refused`) or because
 * saving is off (`saving-off`).
 */
// @spec-link [[req_my_instrument]]
// @spec-link [[entity_my_instrument_record]]
export type MyInstrumentChangeOutcome =
  'unchanged' | 'saved' | 'redrawn' | 'refused' | 'saving-off' | ProfileSelectionOutcome

/**
 * The kept sessions of my instrument as the caller counted them for its warning or confirmation:
 * how many, the deletes of those stored on the device by their keys, and their leaving memory once
 * the batch that erases them is saved.
 */
// @spec-link [[entity_my_instrument_record]]
// @spec-link [[req_kept_sessions]]
export interface MyInstrumentSessions {
  /** How many sessions the warning or confirmation names. */
  readonly count: number
  /** The deletes of the counted sessions stored on the device, for the batch. */
  readonly deletes: KeptChanges
  /** The batch is saved: the counted sessions leave memory. */
  readonly leave: () => void
}

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

/** The actions on my instrument, each given the kept sessions of my instrument counted. */
export interface MyInstrumentActions {
  readonly saveMyInstrument: (
    instrument: MyInstrument,
    sessions: MyInstrumentSessions,
  ) => Promise<MyInstrumentChangeOutcome>
  readonly saveAndSelectMyInstrument: (
    instrument: MyInstrument,
    sessions: MyInstrumentSessions,
  ) => Promise<MyInstrumentChangeOutcome>
  readonly deleteMyInstrument: (
    sessions: MyInstrumentSessions,
  ) => Promise<MyInstrumentChangeOutcome>
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

/** Intent: a batch's outcome as an action resolves it: saved (or nothing to change), or why not. */
function batchOutcome(outcome: KeptChangeOutcome): 'saved' | 'refused' | 'saving-off' {
  if (outcome.status === 'refused' || outcome.status === 'saving-off') return outcome.status
  return 'saved'
}

/**
 * Intent: build the actions on my instrument. Saving a new one saves it and selects it, an
 * instrument switch; saving one and selecting it (the transposition check's way) also selects one
 * that exists but is not selected. Saving a change saves it; while it is selected, a change of range or
 * transposition replaces the phrase as a switch does, and a change of clef alone redraws the
 * phrase in it, keeping it; a change of name relabels only. A change of range or transposition
 * while my instrument has kept sessions saves in one batch that erases them, and applies once it
 * is saved. Deleting deletes its record and its kept sessions in one batch; once it is saved, and
 * while it was selected, its template is selected, a switch whose selection is saved after the
 * batch: a reload, or a refused selection save, in between loads the default instrument, which is
 * accepted (spec D337).
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

  /**
   * Intent: write `instrument`'s record over `before`: in one batch erasing `sessions` when it
   * changes the range or transposition of a my instrument that has kept sessions, the counted
   * sessions leaving memory once it is saved; else the plain write. Resolves `saved` once memory
   * may change, else why it may not.
   */
  // @spec-link [[entity_my_instrument_record]]
  async function written(
    before: MyInstrument | null,
    instrument: MyInstrument,
    sessions: MyInstrumentSessions,
  ): Promise<'saved' | 'refused' | 'saving-off'> {
    if (before === null || sessions.count === 0 || soundsTheSame(before, instrument)) {
      deps.saves.saveMyInstrument(instrument)
      return 'saved'
    }
    const outcome = batchOutcome(
      await deps.saves.saveMyInstrumentErasing(instrument, sessions.deletes),
    )
    if (outcome === 'saved') sessions.leave()
    return outcome
  }

  /** Intent: save my instrument, made or changed (see the factory's intent). */
  async function saveMyInstrument(
    instrument: MyInstrument,
    sessions: MyInstrumentSessions,
  ): Promise<MyInstrumentChangeOutcome> {
    const before = state.myInstrument
    if (before !== null && sameMyInstrument(before, instrument)) return 'unchanged'
    const saved = await written(before, instrument, sessions)
    if (saved !== 'saved') return saved
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
   * (unless nothing in it changed; in the batch erasing `sessions` when its range or
   * transposition changed while it has kept sessions), then, once written, is selected, a switch
   * that replaces the phrase, once a generation under way has ended.
   */
  // @spec-link [[rule_transposition_check_sets_my_instrument]]
  async function saveAndSelectMyInstrument(
    instrument: MyInstrument,
    sessions: MyInstrumentSessions,
  ): Promise<MyInstrumentChangeOutcome> {
    const before = state.myInstrument
    if (before === null || state.controls.instrumentProfileId === MY_INSTRUMENT_ID) {
      return saveMyInstrument(instrument, sessions)
    }
    if (!sameMyInstrument(before, instrument)) {
      const saved = await written(before, instrument, sessions)
      if (saved !== 'saved') return saved
      state.myInstrument = instrument
    }
    await whenIdle()
    return deps.selectInstrumentProfile(MY_INSTRUMENT_ID)
  }

  /**
   * Intent: delete my instrument and `sessions` in one batch (see the factory's intent). Once it
   * is saved, the sessions leave memory and my instrument goes, its template selected first while
   * it was selected. Saving off deletes it for the visit only when it has no session to erase.
   */
  // @spec-link [[entity_my_instrument_record]]
  // @spec-link [[req_my_instrument]]
  async function deleteMyInstrument(
    sessions: MyInstrumentSessions,
  ): Promise<MyInstrumentChangeOutcome> {
    const before = state.myInstrument
    if (before === null) throw new Error('my instrument: there is none to delete')
    const outcome = batchOutcome(await deps.saves.deleteMyInstrument(sessions.deletes))
    if (outcome === 'refused' || (outcome === 'saving-off' && sessions.count > 0)) return outcome
    sessions.leave()
    if (state.controls.instrumentProfileId !== MY_INSTRUMENT_ID) {
      state.myInstrument = null
      return 'saved'
    }
    await whenIdle()
    const switched = deps.selectInstrumentProfile(before.template)
    state.myInstrument = null
    return switched
  }

  return { saveMyInstrument, saveAndSelectMyInstrument, deleteMyInstrument }
}
