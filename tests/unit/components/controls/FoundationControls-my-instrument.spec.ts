/**
 * The instrument control with my instrument: a fourth segment after the three built-in profiles,
 * labelled with its name, present only while my instrument exists; selecting it reports the
 * `my-instrument` id, and the range summary states its range and windows as for a built-in.
 */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ControlPanel from '@/components/controls/ControlPanel.vue'
import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { BUILT_IN_PRESETS, DEFAULT_PRESET_SELECTION } from '@/domain/presets/built-in-presets'
import type { InstrumentProfileId } from '@/domain/profile/instrument-profiles'
import { makeMyInstrument, type MyInstrument } from '@/domain/profile/my-instrument'
import { ALL_GROUPS_ALLOWED } from '@/session/settings-mutation-scales'

const LOW_TENOR: MyInstrument = makeMyInstrument({
  template: 'bb-tenor',
  name: 'Low tenor',
  clef: 'bass',
  writtenRange: { minMidi: 40, maxMidi: 64 },
  transposition: { octaves: 1, semitones: 2, direction: 'lower' },
})

/** Intent: the control panel with `myInstrument`, the controls naming `instrumentProfileId`. */
function mountPanel(
  myInstrument: MyInstrument | null,
  instrumentProfileId: InstrumentProfileId = 'c-keyboard',
) {
  return mount(ControlPanel, {
    props: {
      controls: makeGenerationControls({ ...DEFAULT_GENERATION_CONTROLS, instrumentProfileId }),
      figureLevels: NEUTRAL_FIGURE_LEVELS,
      selection: DEFAULT_PRESET_SELECTION,
      presets: BUILT_IN_PRESETS,
      readonly: false,
      noteDensityContext: { belowTabletLandscape: false, sessionSteppedDown: false },
      risingTempo: false,
      risingTempoAvailable: false,
      lastSessionReachedTempo: null,
      varySettings: false,
      varySettingsAvailable: true,
      allowedGroups: ALL_GROUPS_ALLOWED,
      rhythmLockOn: false,
      allowedRhythmChanges: [],
      tensionAcrossPhrases: false,
      sessionOptionsReadonly: false,
      startSettings: null,
      myInstrument,
      instrumentActionsDisabled: false,
      presetActions: { saveChanges: false, rename: false, delete: false, limitReached: false },
      presetActionsDisabled: false,
    },
  })
}

/** Intent: the instrument control's segments. */
function radios(wrapper: ReturnType<typeof mountPanel>) {
  return wrapper
    .get('[role="radiogroup"][aria-label="Instrument profile"]')
    .findAll('[role="radio"]')
}

/** Intent: the instrument control's segments' labels. */
function segments(wrapper: ReturnType<typeof mountPanel>): string[] {
  return radios(wrapper).map((radio) => radio.text())
}

// @test-link [[req_my_instrument]]
describe('the instrument control with my instrument', () => {
  // @test-link [[req_my_instrument]]
  it('offers the three built-in profiles only while no my instrument exists', () => {
    expect(segments(mountPanel(null))).toHaveLength(3)
  })

  // @test-link [[req_my_instrument]]
  it('adds a fourth segment, labelled with its name, after the three built-in profiles', () => {
    const labels = segments(mountPanel(LOW_TENOR))
    expect(labels).toHaveLength(4)
    expect(labels[3]).toBe('Low tenor')
  })

  // @test-link [[req_my_instrument]]
  it('reports the my-instrument id when its segment is chosen', async () => {
    const wrapper = mountPanel(LOW_TENOR)
    await radios(wrapper)[3]!.trigger('click')
    expect(wrapper.emitted('select-instrument-profile')).toEqual([['my-instrument']])
  })

  // @test-link [[req_my_instrument]]
  // @test-link [[rule_my_instrument_range_limits]]
  it('states its range and windows, selected, as for a built-in profile', () => {
    const wrapper = mountPanel(LOW_TENOR, 'my-instrument')
    const { minMidi, maxMidi } = LOW_TENOR.profile.concertRange
    expect(wrapper.get('.profile-range-summary').text()).toContain(
      `Active range ${minMidi}-${maxMidi}.`,
    )
    const checked = radios(wrapper).filter((radio) => radio.attributes('aria-checked') === 'true')
    expect(checked.map((radio) => radio.text())).toEqual(['Low tenor'])
  })

  // @test-link [[req_my_instrument]]
  it('offers Create my instrument, then Edit my instrument once it exists, and asks for the sheet', async () => {
    expect(mountPanel(null).get('.instrument-actions button').text()).toBe('Create my instrument')
    const wrapper = mountPanel(LOW_TENOR)
    const button = wrapper.get('.instrument-actions button')
    expect(button.text()).toBe('Edit my instrument')
    await button.trigger('click')
    expect(wrapper.emitted('open-my-instrument')).toHaveLength(1)
  })
})
