/**
 * Jam mode's phrase 1 at Idle, written from the kept doodle (master spec C5.11; module_kept_doodle;
 * the jam flow's "The kept doodle at Idle"): a phrase 1 of its own, apart from session mode's Idle
 * phrase, its generation state and its prepared phrases, which nothing here touches. It is written
 * by climbing the three rungs of a fresh Jam's phrase 1 with no deadline (Jam's code builds the
 * attempts, ../../jam/kept-doodle-phrase-one.ts, reached through its loaded module) under every Idle
 * rule (../../composables/ladder-idle-phrase.ts), and drawn on a staff of its own through a
 * notation coordinator of its own, in the shared instrument's clef. It writes phrase 1, through
 * Loading with a fresh seed: afresh when a doodle is newly kept or replaces the one kept, and when
 * asked to again (`writeAgain`, a Jam on it ended); again at once, the phrase shown meanwhile, when
 * any Jam setting but the tempo changes (`Jam in {answer}` included) or the shared instrument does,
 * my instrument's range or clef included. Nothing else writes it: the tempo, the theme, the audio
 * mix, a controller, a window crossing, the suggestion declined, a session opened or played on it.
 * The doodle let go stops any writing and drops it. Jam mode never asks whether phrase 1 is out of
 * date: it is never written from settings other than the ones in force.
 */
import { computed, watch, type ComputedRef, type Ref } from 'vue'

import { PITCH_CLASSES } from '@/domain/controls/generation-controls'
import type {
  GenerationIntent,
  GenerationIntentProviders,
} from '@/domain/generation/generation-intent'
import { selectedInstrumentProfile } from '@/domain/generation/generation-intent'
import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import type { SteeringBlock } from '@/domain/generation/steering-block'
import type { PitchClassNumber } from '@/domain/harmony/harmony-types'
import { spellWrittenKey } from '@/domain/notation/pitch-spelling'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import { instrumentClefOf } from '@/domain/profile/instrument-clef'
import { MY_INSTRUMENT_ID } from '@/domain/profile/instrument-profiles'
import type { MyInstrument } from '@/domain/profile/my-instrument'
import type { Seed } from '@/domain/random/seed'
import type { NotationError } from '@/notation/notation-error'
import type { StaffKeySignature, StaffLayoutInputs } from '@/notation/staff-fit-types'
import type { SessionSettings, PhraseOneAttemptResult } from '@/session/session-types'
import type { FitRunClimb } from '@/composables/generation-session-fit-round'
import type { IdlePhraseStateView } from '@/composables/generation-session-types'
import { createLadderIdlePhrase, type LadderIdlePhrase } from '@/composables/ladder-idle-phrase'
import { createNotationCoordinator } from '@/composables/use-notation-coordinator'
import {
  GenerationFailedError,
  type WorkspaceGeneratedPhrase,
} from '@/composables/workspace-session-result'
import type { ViewportWidthProvider } from '@/composables/viewport-width'
import type { FreshJamSettingsSource } from '@/jam/fresh-jam-settings'
import type { JamPhraseOneSettings } from '@/jam/jam-phrase-one-attempts'
import type { KeptDoodleAttempt } from '@/jam/kept-doodle-phrase-one'
import type { JamKeptDoodle } from '@/jam/use-kept-doodle'
import type { JamModeModule } from './load-jam-mode'

/**
 * What the workspace generates Jam's phrase 1 at Idle with: the Idle flow's generation seam (the
 * one worker, every request yielding first to the player, as session mode's Idle requests do), its
 * request-id and seed providers, its session seeds and the window's width.
 */
// @spec-link [[rule_held_doodle_phrase_one_at_idle]]
export interface KeptDoodleGeneration {
  readonly generate: (intent: GenerationIntent) => Promise<GenerationOutcome>
  readonly providers: GenerationIntentProviders
  readonly nextSessionSeed: () => Seed
  readonly viewport: Pick<ViewportWidthProvider, 'isBelowTabletLandscape'>
}

/**
 * One phrase 1 generated from the kept doodle: the outcome and its intent, the settings it is
 * generated under (Jam's, with the controls read from the doodle), its step (carry-in on rung 1)
 * and the steering block every phrase of a Jam on the doodle carries.
 */
// @spec-link [[rule_held_doodle_phrase_one_at_idle]]
// @spec-link [[rule_every_jam_phrase_carries_doodle]]
export interface KeptDoodleGeneratedPhrase extends WorkspaceGeneratedPhrase {
  readonly settings: SessionSettings
  readonly step: KeptDoodleAttempt['step']
  readonly steering: SteeringBlock
}

/** Jam's phrase 1 at Idle as published: the phrase with the session seed drawn for it. */
// @spec-link [[rule_held_doodle_phrase_one_at_idle]]
// @spec-link [[module_session_seed_plan]]
export interface KeptDoodlePhraseResult extends KeptDoodleGeneratedPhrase {
  readonly sessionSeed: Seed
}

/** What phrase 1 is written from: the kept doodle, and Jam's settings and drift now. */
// @spec-link [[rule_held_doodle_phrase_one_at_idle]]
export interface KeptDoodlePhraseInputs {
  readonly kept: JamKeptDoodle
  readonly jam: JamPhraseOneSettings
}

/** What Jam's staff for the kept doodle's phrase 1 reports, wired to its `PhraseScore`. */
// @spec-link [[rule_held_doodle_phrase_one_at_idle]]
export interface KeptDoodleStaffReports {
  readonly handleEngraved: () => void
  readonly handleNotationError: (error: NotationError) => void
  readonly handleLayoutInputs: (inputs: StaffLayoutInputs) => void
}

/**
 * What the screen shows of Jam's phrase 1 while Jam mode shows: whether a doodle is kept (its
 * phrase 1 then shows in `staff-jam`'s place), the phrase's Idle state and written phrase, what its
 * staff reports, and the phrase actions the header offers on it.
 */
// @spec-link [[rule_held_doodle_phrase_one_at_idle]]
export interface KeptDoodlePhraseView {
  readonly kept: boolean
  readonly state: IdlePhraseStateView<KeptDoodlePhraseResult>
  readonly phrase: WrittenPhrase | null
  readonly staff: KeptDoodleStaffReports
  readonly actions: Pick<
    LadderIdlePhrase<KeptDoodlePhraseResult>,
    'regenerate' | 'retryGeneration' | 'retryNotation'
  >
}

/** What Jam's phrase 1 at Idle reads, every reading current when called (reactive in the shell). */
// @spec-link [[rule_held_doodle_phrase_one_at_idle]]
export interface KeptDoodlePhraseSeams {
  /** What it is generated with; null where none was given, when writing it is a defect. */
  readonly generation: KeptDoodleGeneration | null
  /** Jam's code, once loaded in this visit; null before. */
  readonly jamModule: () => JamModeModule | null
  /** Jam mode shows (its code loaded, not while it opens). */
  readonly jamShowing: () => boolean
  /** The doodle Jam mode keeps; null when none is. */
  readonly kept: () => JamKeptDoodle | null
  /** Jam's settings, controls and figure levels; null before Jam's settings exist. */
  readonly settings: () => FreshJamSettingsSource | null
  /** The shared instrument: the selected profile, and my instrument when one is saved. */
  readonly instrument: () => {
    readonly instrumentProfileId: FreshJamSettingsSource['controls']['instrumentProfileId']
    readonly myInstrument: MyInstrument | null
  }
}

/**
 * Jam's phrase 1 at Idle: what the screen shows of it, and, for Jam's pre-generation queue and a
 * Jam started on the kept doodle, its state (its result carrying phrase 1's intent, settings and
 * session seed), its written phrase, what it is written from, and its writing again.
 */
// @spec-link [[rule_held_doodle_phrase_one_at_idle]]
export interface WorkspaceKeptDoodlePhrase {
  /** What the screen shows of it while Jam mode shows; null otherwise. */
  readonly view: ComputedRef<KeptDoodlePhraseView | null>
  readonly state: IdlePhraseStateView<KeptDoodlePhraseResult>
  /** The written phrase its staff shows (or is drawing); null with none. */
  readonly written: Readonly<Ref<WrittenPhrase | null>>
  /** The kept doodle and Jam's settings phrase 1 is written from now; null with no doodle kept. */
  readonly inputs: ComputedRef<KeptDoodlePhraseInputs | null>
  /** Write phrase 1 from the kept doodle again, with a fresh seed (a Jam on it ended). */
  readonly writeAgain: () => void
  readonly dispose: () => void
}

/**
 * Intent: Jam's settings and drift phrase 1 is written under, from Jam's settings and the shared
 * instrument, as a fresh Jam's (my instrument's profile when it is the instrument).
 */
// @spec-link [[req_jam_settings]]
function jamPhraseOneSettings(
  loaded: JamModeModule,
  source: FreshJamSettingsSource,
  instrument: ReturnType<KeptDoodlePhraseSeams['instrument']>,
): JamPhraseOneSettings {
  const { instrumentProfileId, myInstrument } = instrument
  const mine = instrumentProfileId === MY_INSTRUMENT_ID && myInstrument !== null
  return loaded.freshJamSettings(
    source,
    mine ? selectedInstrumentProfile(instrumentProfileId, myInstrument) : null,
  )
}

/**
 * Intent: everything phrase 1 is written from but the doodle, as one comparable value: every Jam
 * setting but the tempo, and the shared instrument (my instrument's profile and clef while it is
 * the one). Null before Jam's settings exist. Jam's pre-generation queue is keyed on it too.
 */
// @spec-link [[rule_jam_setting_change_rewrites_kept_phrase_one]]
// @spec-link [[rule_shared_setting_changed_in_jam_mode]]
export function writtenFrom(
  seams: Pick<KeptDoodlePhraseSeams, 'settings' | 'instrument'>,
): string | null {
  const source = seams.settings()
  if (source === null) return null
  const { instrumentProfileId, myInstrument } = seams.instrument()
  const mine =
    instrumentProfileId === MY_INSTRUMENT_ID && myInstrument !== null
      ? { profile: myInstrument.profile, clef: myInstrument.clef }
      : null
  return JSON.stringify({ ...source.settings, tempo: null, instrumentProfileId, mine })
}

/** Intent: a failed attempt as the ladder reads it: its generation failure's code, or a crash. */
function attemptResultOf(error: Error): PhraseOneAttemptResult {
  return error instanceof GenerationFailedError
    ? { kind: 'generation-failure', code: error.code }
    : { kind: 'crash' }
}

/**
 * Intent: Jam's phrase 1 at Idle over its seams; see the module comment. Its staff is the one
 * shown while Jam mode shows; leaving Jam mode lets the doodle go, so nothing is written outside
 * it, and the staff gone, the next writing waits for its layout.
 */
// @spec-link [[rule_held_doodle_phrase_one_at_idle]]
// @spec-link [[rule_jam_setting_change_rewrites_kept_phrase_one]]
// @spec-link [[rule_shared_setting_changed_in_jam_mode]]
// @spec-link [[rule_suggestion_use_it]]
export function useKeptDoodlePhrase(seams: KeptDoodlePhraseSeams): WorkspaceKeptDoodlePhrase {
  /** Intent: what phrase 1 is generated with; writing it with none given is a defect. */
  function generation(): KeptDoodleGeneration {
    if (seams.generation === null) throw new Error('kept doodle phrase: no generation was given')
    return seams.generation
  }
  /** The attempt each intent was built for, so its generated phrase carries the attempt's facts. */
  const attempts = new WeakMap<GenerationIntent, KeptDoodleAttempt>()

  const inputs = computed((): KeptDoodlePhraseInputs | null => {
    const kept = seams.kept()
    const loaded = seams.jamModule()
    const source = seams.settings()
    if (kept === null || loaded === null || source === null) return null
    return { kept, jam: jamPhraseOneSettings(loaded, source, seams.instrument()) }
  })

  /** Intent: one writing's climb from the kept doodle, under Jam's settings now. */
  function climb(): FitRunClimb {
    const loaded = seams.jamModule()
    const now = inputs.value
    if (loaded === null || now === null)
      throw new Error("kept doodle phrase: written with no doodle kept or before Jam's settings")
    const { providers, viewport } = generation()
    const ladder = loaded.climbKeptDoodleLadder(now.kept.doodle, now.jam, {
      nextRequestId: providers.nextRequestId,
      nextSeed: providers.nextSeed,
      isBelowTabletLandscape: () => viewport.isBelowTabletLandscape(),
    })
    return {
      intent: () => {
        const attempt = ladder.attempt()
        attempts.set(attempt.intent, attempt)
        return attempt.intent
      },
      failed: (error) => ladder.failed(attemptResultOf(error)),
    }
  }

  /** Intent: generate one attempt; a failed generation is a typed failure, with its code. */
  async function generate(intent: GenerationIntent): Promise<KeptDoodleGeneratedPhrase> {
    const attempt = attempts.get(intent)
    if (attempt === undefined) throw new Error('kept doodle phrase: an intent no attempt built')
    const outcome = await generation().generate(intent)
    if (outcome.kind === 'generation_failure') throw new GenerationFailedError(outcome.code)
    const { settings, step, steering } = attempt
    return { outcome, intent, settings, step, steering }
  }

  /** Intent: the key signature phrase 1 is written in: Jam's written key and collection. */
  function keySignature(): StaffKeySignature {
    const source = seams.settings()
    if (source === null) throw new Error("kept doodle phrase: no key before Jam's settings exist")
    const { tonalCenter, collection } = source.controls
    const writtenTonic = PITCH_CLASSES.indexOf(tonalCenter) as PitchClassNumber
    return spellWrittenKey(writtenTonic, collection).signature
  }

  const coordinator = createNotationCoordinator(
    {
      reportNotationFailure: (error) => phrase.reportNotationFailure(error),
      reportNotationRecovered: () => phrase.reportNotationRecovered(),
    },
    {
      of: (id) => instrumentClefOf(id, seams.instrument().myInstrument),
      selected: () => {
        const { instrumentProfileId, myInstrument } = seams.instrument()
        return instrumentClefOf(instrumentProfileId, myInstrument)
      },
    },
  )

  const phrase = createLadderIdlePhrase<KeptDoodlePhraseResult, KeptDoodleGeneratedPhrase>({
    ladder: { climb },
    generate,
    checkFit: coordinator.checkFit,
    checkRoom: coordinator.checkRoom,
    staffLayout: coordinator.staffLayout,
    notate: coordinator.notate,
    clearPresentedPhrase: coordinator.clearPresentedPhrase,
    nextSessionSeed: () => generation().nextSessionSeed(),
    withSessionSeed: (generated, sessionSeed) => ({ ...generated, sessionSeed }),
    keySignature,
  })

  // A doodle newly kept, or another in its place, writes phrase 1 afresh; one let go drops it; a
  // change of what else it is written from writes it again, the doodle staying kept.
  const stopWriting = watch(
    () => ({ doodle: seams.kept()?.doodle ?? null, from: writtenFrom(seams) }),
    (now, before) => {
      if (now.doodle === null) {
        if (before.doodle !== null) phrase.clear()
      } else if (now.doodle !== before.doodle) phrase.write()
      else if (now.from !== before.from) phrase.rewrite()
    },
  )
  // Jam's staff goes with Jam mode: the next writing waits for its layout once it is back.
  const stopShowing = watch(seams.jamShowing, (showing) => {
    if (!showing) phrase.staffGone()
  })

  const staff: KeptDoodleStaffReports = {
    handleEngraved: coordinator.handleEngraved,
    handleNotationError: coordinator.handleNotationError,
    handleLayoutInputs: coordinator.handleLayoutInputs,
  }
  const actions = {
    regenerate: phrase.regenerate,
    retryGeneration: phrase.retryGeneration,
    retryNotation: phrase.retryNotation,
  }

  return {
    view: computed(() =>
      seams.jamShowing()
        ? {
            kept: seams.kept() !== null,
            state: phrase.state,
            phrase: coordinator.pendingPhrase.value,
            staff,
            actions,
          }
        : null,
    ),
    state: phrase.state,
    written: coordinator.pendingPhrase,
    inputs,
    writeAgain: () => {
      if (seams.kept() !== null) phrase.write()
    },
    dispose: () => {
      stopWriting()
      stopShowing()
      phrase.dispose()
    },
  }
}
