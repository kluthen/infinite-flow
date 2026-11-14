/**
 * The settings a fresh Jam starts its session with, from Jam's own settings and the shared
 * instrument: Jam's controls and figure levels (./jam-settings.ts), never session mode's, the
 * doodle's readings replacing its rhythm and shape controls later, at the doodle's end. Part of
 * Jam's code (src/jam/), loaded on demand; pure.
 */
import type { GenerationControls } from '@/domain/controls/generation-controls'
import type { FigureLevels } from '@/domain/figures/figure-levels'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import { ALL_GROUPS_ALLOWED } from '@/session/settings-mutation-scales'

import type { JamPhraseOneSettings } from './jam-phrase-one-attempts'
import type { JamSettings } from './jam-settings'

/** What a fresh Jam's settings are made from: Jam's settings, controls and figure levels. */
// @spec-link [[req_jam_settings]]
export interface FreshJamSettingsSource {
  readonly settings: JamSettings
  readonly controls: GenerationControls
  readonly figureLevels: FigureLevels
}

/**
 * Intent: the session settings and drift a fresh Jam starts under: Jam's controls (its written
 * key and collection, its tempo, the shared instrument) and its one Embellishments level for every
 * figure; Jam's own Seventh chords level, never session mode's, which every phrase of the Jam then
 * carries through the session; no preset (Jam mode has none: a custom selection from no preset,
 * so a Jam's review names none), no restriction, Vary settings' groups as they are by default
 * (Vary settings never runs in a Jam), Jam's own rhythm lock and allowed changes, and Jam's drift;
 * my instrument's profile when it is the instrument, as a session generates with the very profile
 * it started with.
 */
// @spec-link [[req_jam_settings]]
// @spec-link [[rule_jam_runs_as_session_from_phrase_one]]
// @spec-link [[rule_jam_has_own_seventh_chords_level]]
export function freshJamSettings(
  source: FreshJamSettingsSource,
  myInstrumentProfile: InstrumentProfile | null,
): JamPhraseOneSettings {
  const { settings, controls, figureLevels } = source
  return Object.freeze({
    settings: Object.freeze({
      controls,
      figureLevels,
      chordFamilies: Object.freeze({ 'seventh-chords': settings['seventh-chords'] }),
      selection: Object.freeze({ kind: 'custom', baseId: null }),
      ...(myInstrumentProfile === null ? {} : { instrumentProfile: myInstrumentProfile }),
      allowedGroups: ALL_GROUPS_ALLOWED,
      rhythmLockOn: settings.rhythmLockOn,
      allowedRhythmChanges: settings.allowedRhythmChanges,
    }),
    drift: settings.drift,
  })
}
