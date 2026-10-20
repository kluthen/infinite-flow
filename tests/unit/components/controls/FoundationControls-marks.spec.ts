/**
 * The key and mode marks in the foundation group: at Idle and in the review mode they follow the
 * restriction in force for the shown selection, key and mode; during a session they keep those of
 * the session's start settings, whatever is shown. No segment is ever disabled for a restriction.
 */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import FoundationControls from '@/components/controls/FoundationControls.vue'
import type { SessionStartSettings } from '@/components/controls/preset-bar-model'
import {
  COLLECTIONS,
  makeGenerationControls,
  PITCH_CLASSES,
  type Collection,
  type PitchClass,
} from '@/domain/controls/generation-controls'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { BUILT_IN_PRESETS, builtInPreset } from '@/domain/presets/built-in-presets'
import type { PresetSelection } from '@/domain/presets/preset-selection'

const REEL: PresetSelection = { kind: 'preset', presetId: 'reel' }
const REEL_NOTE =
  'Reel is meant for Mixolydian or Dorian, marked. Any mode works; another one makes your settings Custom.'

/** Intent: the foundation group showing `key` and `mode` with `selection`, and the start settings. */
function mountGroup(
  selection: PresetSelection,
  key: PitchClass,
  mode: Collection,
  startSettings: SessionStartSettings | null = null,
) {
  return mount(FoundationControls, {
    props: {
      controls: makeGenerationControls({
        ...DEFAULT_GENERATION_CONTROLS,
        tonalCenter: key,
        collection: mode,
      }),
      selection,
      presets: BUILT_IN_PRESETS,
      readonly: startSettings !== null,
      lastSessionReachedTempo: null,
      myInstrument: null,
      instrumentActionsDisabled: startSettings !== null,
      startSettings,
    },
  })
}

type Group = ReturnType<typeof mountGroup>

/** Intent: one control's radiogroup, by its label. */
function radiogroup(wrapper: Group, label: 'Written key' | 'Collection') {
  return wrapper.get(`[role="radiogroup"][aria-label="${label}"]`)
}

/** Intent: the values (segment labels) of one control's marked segments. */
function marked(wrapper: Group, label: 'Written key' | 'Collection'): string[] {
  return radiogroup(wrapper, label)
    .findAll('[role="radio"]')
    .filter((radio) => radio.classes().includes('is-marked'))
    .map((radio) => radio.text())
}

/** Intent: the note one control's radiogroup names, or null when it names none. */
function note(wrapper: Group, label: 'Written key' | 'Collection'): string | null {
  const id = radiogroup(wrapper, label).attributes('aria-describedby')
  if (id === undefined) return null
  return wrapper.get(`[id="${id}"]`).text()
}

/** Intent: the Written key and Collection marks and notes, for one comparison. */
function marksOf(wrapper: Group) {
  return {
    writtenKey: { marked: marked(wrapper, 'Written key'), note: note(wrapper, 'Written key') },
    collection: { marked: marked(wrapper, 'Collection'), note: note(wrapper, 'Collection') },
  }
}

const NONE = {
  writtenKey: { marked: [], note: null },
  collection: { marked: [], note: null },
}

// @test-link [[module_key_and_mode_marks]]
describe('the key and mode marks at Idle and in the review mode', () => {
  // @test-link [[module_key_and_mode_marks]]
  // @test-link [[rule_restriction_in_force]]
  it("marks Reel's modes on Collection with its note, and nothing on Written key", () => {
    const wrapper = mountGroup(REEL, 'C', 'Mixolydian')
    expect(marksOf(wrapper)).toEqual({
      writtenKey: { marked: [], note: null },
      collection: { marked: ['Dorian', 'Mixolydian'], note: REEL_NOTE },
    })
    const afterCollection = radiogroup(wrapper, 'Collection').element.nextElementSibling
    expect(afterCollection?.classList.contains('field-note')).toBe(true)
    expect(afterCollection?.textContent).toBe(REEL_NOTE)
    expect(radiogroup(wrapper, 'Written key').attributes('aria-describedby')).toBeUndefined()
    expect(wrapper.findAll('.field-note').map((element) => element.text())).toEqual([REEL_NOTE])
  })

  // @test-link [[module_key_and_mode_marks]]
  // @test-link [[rule_restriction_in_force]]
  it('drops the marks in Custom outside its base, and brings them back inside it', () => {
    const custom: PresetSelection = { kind: 'custom', baseId: 'reel' }
    const outside = mountGroup(custom, 'C', 'Ionian')
    expect(marksOf(outside)).toEqual(NONE)
    expect(outside.findAll('.field-note')).toHaveLength(0)
    expect(marksOf(mountGroup(custom, 'C', 'Dorian')).collection).toEqual({
      marked: ['Dorian', 'Mixolydian'],
      note: REEL_NOTE,
    })
  })

  // @test-link [[module_key_and_mode_marks]]
  it('marks nothing under Neutral, nor in Custom with no base', () => {
    expect(marksOf(mountGroup({ kind: 'preset', presetId: 'neutral' }, 'C', 'Ionian'))).toEqual(
      NONE,
    )
    expect(marksOf(mountGroup({ kind: 'custom', baseId: null }, 'C', 'Dorian'))).toEqual(NONE)
  })
})

// @test-link [[rule_restriction_highlight_never_blocks]]
describe('every key and mode segment under every restriction', () => {
  for (const preset of BUILT_IN_PRESETS) {
    const { keys, modes } = preset.restriction
    const key: PitchClass = keys === 'any' ? 'C' : keys[0]
    const mode: Collection = modes === 'any' ? 'Ionian' : modes[0]

    // @test-link [[rule_restriction_highlight_never_blocks]]
    it(`stays enabled and selectable under ${preset.name}, at ${key} ${mode}`, async () => {
      const wrapper = mountGroup({ kind: 'preset', presetId: preset.id }, key, mode)
      for (const label of ['Written key', 'Collection'] as const) {
        const radios = radiogroup(wrapper, label).findAll('[role="radio"]')
        expect(radios.some((radio) => radio.attributes('disabled') !== undefined)).toBe(false)
        for (const radio of radios) await radio.trigger('click')
      }
      expect(wrapper.emitted('set-control')).toEqual([
        ...PITCH_CLASSES.map((value) => [{ key: 'tonalCenter', value }]),
        ...COLLECTIONS.map((value) => [{ key: 'collection', value }]),
      ])
    })
  }
})

// @test-link [[module_key_and_mode_marks]]
describe('the key and mode marks during a session', () => {
  // @test-link [[module_key_and_mode_marks]]
  // @test-link [[rule_vary_settings_marks_custom]]
  it("keep the start settings' marks and note, whatever the shown key, mode and selection", () => {
    const wrapper = mountGroup({ kind: 'custom', baseId: 'reel' }, 'C', 'Ionian', {
      selection: REEL,
      restriction: builtInPreset('reel').restriction,
    })
    expect(marksOf(wrapper)).toEqual({
      writtenKey: { marked: [], note: null },
      collection: { marked: ['Dorian', 'Mixolydian'], note: REEL_NOTE },
    })
  })

  // @test-link [[module_key_and_mode_marks]]
  it('mark nothing when no restriction was frozen at the start, whatever is shown', () => {
    expect(marksOf(mountGroup(REEL, 'C', 'Mixolydian', { selection: REEL }))).toEqual(NONE)
  })
})
