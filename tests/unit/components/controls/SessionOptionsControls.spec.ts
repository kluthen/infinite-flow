/**
 * The "During a session" group on its own (v3.2): its four fields in order, the rhythm lock with
 * its dependent Allowed rhythm changes, and Vary settings with its v3.2 note, its unavailable state
 * for lack of a move and its dependent What may vary, the Rhythm group held by the lock. Each
 * change is reported as the full new value; the group shows only what its props say.
 */
import { describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import SessionOptionsControls from '@/components/controls/SessionOptionsControls.vue'
import type { RhythmChangeKind } from '@/domain/generation/request-rhythm-lock'
import { ALL_GROUPS_ALLOWED, type AllowedGroups } from '@/session/settings-mutation-scales'

/** The props the group takes, each overridable. */
interface GroupProps {
  risingTempo: boolean
  risingTempoAvailable: boolean
  tensionAcrossPhrases: boolean
  varySettings: boolean
  varySettingsAvailable: boolean
  rhythmLockOn: boolean
  allowedRhythmChanges: readonly RhythmChangeKind[]
  allowedGroups: AllowedGroups
  readonly: boolean
}

/** A first visit's choices at Idle, a controller attached and Vary settings available. */
const FIRST_VISIT: GroupProps = {
  risingTempo: false,
  risingTempoAvailable: true,
  tensionAcrossPhrases: false,
  varySettings: false,
  varySettingsAvailable: true,
  rhythmLockOn: false,
  allowedRhythmChanges: [],
  allowedGroups: ALL_GROUPS_ALLOWED,
  readonly: false,
}

const VARY_NOTE =
  'Every 2 to 4 phrases, one setting from the groups below moves one step. Never the instrument or the tempo. Keys and modes stay within what your preset is meant for. Your settings come back when the session ends.'

const UNAVAILABLE_NOTE =
  'Nothing is allowed to vary with these choices. Turn on another group below.'

const RHYTHM_CHANGE_LABELS = [
  'Move a note',
  'Move a rest',
  'Split a note',
  'Merge two notes',
  'Add or remove a rest',
]

const GROUP_LABELS = [
  'Key and mode',
  'Harmony',
  'Tension',
  'Rhythm',
  'Melody shape',
  'Embellishments',
]

type Group = VueWrapper<InstanceType<typeof SessionOptionsControls>>

/** Intent: mount the group with a first visit's choices and `overrides`. */
function mountGroup(overrides: Partial<GroupProps> = {}): Group {
  return mount(SessionOptionsControls, { props: { ...FIRST_VISIT, ...overrides } })
}

/** Intent: the radiogroup of the field labelled `label`. */
function radiogroup(wrapper: Group, label: string) {
  return wrapper.get(`[role="radiogroup"][aria-label="${label}"]`)
}

/** Intent: the segment `text` of the field labelled `label`. */
function segment(wrapper: Group, label: string, text: 'Off' | 'On') {
  const found = radiogroup(wrapper, label)
    .findAll('[role="radio"]')
    .find((radio) => radio.text() === text)
  if (found === undefined) throw new Error(`no ${text} segment in ${label}`)
  return found
}

/** Intent: the checked segment's text of the field labelled `label`. */
function checked(wrapper: Group, label: string): string {
  return radiogroup(wrapper, label).get('[aria-checked="true"]').text()
}

/** Intent: the toggle list labelled by the field label `label`, or undefined when absent. */
function toggleList(wrapper: Group, label: string) {
  return wrapper.findAll('[role="group"]').find((group) => {
    const labelId = group.attributes('aria-labelledby')
    return labelId !== undefined && wrapper.find(`#${labelId}`).text() === label
  })
}

/** Intent: the toggle list labelled `label`, which must be shown. */
function shownList(wrapper: Group, label: string) {
  const list = toggleList(wrapper, label)
  if (list === undefined) throw new Error(`${label} is not shown`)
  return list
}

/** Intent: the toggle named `name` in the list labelled `label`. */
function toggle(wrapper: Group, label: string, name: string) {
  const found = shownList(wrapper, label)
    .findAll('button')
    .find((button) => button.text().startsWith(name))
  if (found === undefined) throw new Error(`no ${name} toggle in ${label}`)
  return found
}

/** Intent: each toggle's name and pressed state in the list labelled `label`. */
function pressedStates(wrapper: Group, label: string): Record<string, string | undefined> {
  return Object.fromEntries(
    shownList(wrapper, label)
      .findAll('button')
      .map((button) => [
        button.text().replace(/\s*(on|off)$/, ''),
        button.attributes('aria-pressed'),
      ]),
  )
}

/** Intent: the text of the element `id` names, one id. */
function textOf(wrapper: Group, id: string | undefined): string {
  if (id === undefined) throw new Error('nothing is named')
  return wrapper.get(`#${id}`).text()
}

// @test-link [[req_rhythm_lock]]
// @test-link [[req_settings_mutation_flag]]
describe('SessionOptionsControls: the four fields', () => {
  // @test-link [[req_rhythm_lock]]
  it('holds Rhythm lock, Rising tempo, Tension across phrases then Vary settings, each Off at first', () => {
    const wrapper = mountGroup()
    const labels = wrapper
      .findAll('.control-group-session > .field-group > .field-label')
      .map((label) => label.text())
    expect(labels).toEqual([
      'Rhythm lock',
      'Rising tempo',
      'Tension across phrases',
      'Vary settings',
    ])
    for (const label of labels) expect(checked(wrapper, label)).toBe('Off')
  })

  // @test-link [[req_rhythm_lock]]
  it('names the rhythm lock note and reports On as the full value', async () => {
    const wrapper = mountGroup()
    expect(textOf(wrapper, radiogroup(wrapper, 'Rhythm lock').attributes('aria-describedby'))).toBe(
      'Every phrase keeps the rhythm of the first one, so your eyes can stay on the notes.',
    )

    await segment(wrapper, 'Rhythm lock', 'On').trigger('click')

    expect(wrapper.emitted('set-rhythm-lock')).toEqual([[true]])
  })

  // @test-link [[req_settings_mutation_flag]]
  it("names Vary settings' v3.2 note", () => {
    const wrapper = mountGroup()
    const describedBy = radiogroup(wrapper, 'Vary settings').attributes('aria-describedby')
    expect(textOf(wrapper, describedBy)).toBe(VARY_NOTE)
  })
})

// @test-link [[rule_allowed_rhythm_changes]]
// @test-link [[ui_field_dependent]]
// @test-link [[ui_toggle_list]]
describe('SessionOptionsControls: Allowed rhythm changes', () => {
  // @test-link [[ui_field_dependent]]
  // @test-link [[rule_allowed_rhythm_changes]]
  it('shows only while the lock shows On, and keeps its values while hidden', async () => {
    const wrapper = mountGroup({ allowedRhythmChanges: ['move_rest', 'merge_notes'] })
    expect(toggleList(wrapper, 'Allowed rhythm changes')).toBeUndefined()

    await wrapper.setProps({ rhythmLockOn: true })
    const list = shownList(wrapper, 'Allowed rhythm changes')
    expect(list.element.closest('.field-dependent')).not.toBeNull()
    expect(pressedStates(wrapper, 'Allowed rhythm changes')).toEqual({
      'Move a note': 'false',
      'Move a rest': 'true',
      'Split a note': 'false',
      'Merge two notes': 'true',
      'Add or remove a rest': 'false',
    })

    await wrapper.setProps({ rhythmLockOn: false })
    expect(toggleList(wrapper, 'Allowed rhythm changes')).toBeUndefined()
    await wrapper.setProps({ rhythmLockOn: true })
    expect(pressedStates(wrapper, 'Allowed rhythm changes')['Merge two notes']).toBe('true')
  })

  // @test-link [[ui_toggle_list]]
  it('lists the five changes, all off by default, described by its note', () => {
    const wrapper = mountGroup({ rhythmLockOn: true })
    const list = shownList(wrapper, 'Allowed rhythm changes')
    expect(Object.keys(pressedStates(wrapper, 'Allowed rhythm changes'))).toEqual(
      RHYTHM_CHANGE_LABELS,
    )
    expect(Object.values(pressedStates(wrapper, 'Allowed rhythm changes'))).toEqual(
      RHYTHM_CHANGE_LABELS.map(() => 'false'),
    )
    expect(textOf(wrapper, list.attributes('aria-describedby'))).toBe(
      "Now and then one phrase changes the rhythm in one of these ways, and the next goes back to it. What's possible depends on your rhythm settings: with Strict variety and Straight syncopation, almost nothing.",
    )
  })

  // @test-link [[rule_allowed_rhythm_changes]]
  it('reports the new list in canonical order on each toggle', async () => {
    const wrapper = mountGroup({ rhythmLockOn: true, allowedRhythmChanges: ['merge_notes'] })

    await toggle(wrapper, 'Allowed rhythm changes', 'Move a note').trigger('click')
    await toggle(wrapper, 'Allowed rhythm changes', 'Add or remove a rest').trigger('click')
    await toggle(wrapper, 'Allowed rhythm changes', 'Merge two notes').trigger('click')

    expect(wrapper.emitted('set-allowed-rhythm-changes')).toEqual([
      [['move_note_start', 'merge_notes']],
      [['merge_notes', 'note_rest']],
      [[]],
    ])
  })

  // @test-link [[ui_field_dependent]]
  // @test-link [[rule_readonly_controls_keep_contrast]]
  it('is read-only with the group, showing its values and reporting nothing', async () => {
    const wrapper = mountGroup({
      rhythmLockOn: true,
      allowedRhythmChanges: ['split_note'],
      readonly: true,
    })
    const list = shownList(wrapper, 'Allowed rhythm changes')
    expect(list.classes()).toContain('is-readonly')
    expect(wrapper.get('.field-dependent > .field-group').classes()).toContain('is-readonly')
    expect(pressedStates(wrapper, 'Allowed rhythm changes')['Split a note']).toBe('true')

    await toggle(wrapper, 'Allowed rhythm changes', 'Move a note').trigger('click')

    expect(wrapper.emitted('set-allowed-rhythm-changes')).toBeUndefined()
  })
})

// @test-link [[rule_vary_settings_allowed_groups]]
// @test-link [[ui_field_dependent]]
// @test-link [[ui_toggle_list]]
describe('SessionOptionsControls: What may vary', () => {
  // @test-link [[ui_field_dependent]]
  it('shows only while Vary settings shows On, its six groups all on by default', async () => {
    const wrapper = mountGroup()
    expect(toggleList(wrapper, 'What may vary')).toBeUndefined()

    await wrapper.setProps({ varySettings: true })

    expect(pressedStates(wrapper, 'What may vary')).toEqual(
      Object.fromEntries(GROUP_LABELS.map((label) => [label, 'true'])),
    )
  })

  // @test-link [[rule_vary_settings_allowed_groups]]
  it('reports the whole six-group value on each toggle', async () => {
    const wrapper = mountGroup({ varySettings: true })

    await toggle(wrapper, 'What may vary', 'Tension').trigger('click')
    await toggle(wrapper, 'What may vary', 'Embellishments').trigger('click')

    expect(wrapper.emitted('set-allowed-groups')).toEqual([
      [{ ...ALL_GROUPS_ALLOWED, tension: false }],
      [{ ...ALL_GROUPS_ALLOWED, figures: false }],
    ])
  })

  // @test-link [[rule_vary_settings_allowed_groups]]
  // @test-link [[req_rhythm_lock]]
  it('holds Rhythm off and disabled under the lock, saying why, and shows the stored choice again after', async () => {
    const wrapper = mountGroup({ varySettings: true, rhythmLockOn: true })
    const rhythm = toggle(wrapper, 'What may vary', 'Rhythm')
    expect(rhythm.attributes('disabled')).toBeDefined()
    expect(rhythm.attributes('aria-pressed')).toBe('false')
    expect(rhythm.text()).toMatch(/off$/)
    const note = wrapper.get(`#${rhythm.attributes('aria-describedby')}`)
    expect(note.text()).toBe('The rhythm lock holds the rhythm.')
    expect(note.classes()).toContain('field-note')
    expect(shownList(wrapper, 'What may vary').element.nextElementSibling).toBe(note.element)

    await toggle(wrapper, 'What may vary', 'Harmony').trigger('click')
    expect(wrapper.emitted('set-allowed-groups')).toEqual([
      [{ ...ALL_GROUPS_ALLOWED, harmony: false }],
    ])

    await wrapper.setProps({ rhythmLockOn: false })
    const freed = toggle(wrapper, 'What may vary', 'Rhythm')
    expect(freed.attributes('disabled')).toBeUndefined()
    expect(freed.attributes('aria-pressed')).toBe('true')
    expect(wrapper.text()).not.toContain('The rhythm lock holds the rhythm.')
  })
})

// @test-link [[rule_vary_settings_needs_legal_move]]
describe('SessionOptionsControls: Vary settings unavailable for lack of a move', () => {
  // @test-link [[rule_vary_settings_needs_legal_move]]
  it('disables On, shows Off, names the reason, and keeps a stored On through a click on Off', async () => {
    const wrapper = mountGroup({ varySettings: true, varySettingsAvailable: false })
    const on = segment(wrapper, 'Vary settings', 'On')
    expect(on.attributes('disabled')).toBeDefined()
    expect(checked(wrapper, 'Vary settings')).toBe('Off')
    const reason = wrapper.get(`#${on.attributes('aria-describedby')}`)
    expect(reason.classes()).toContain('field-note')
    expect(reason.text()).toBe(UNAVAILABLE_NOTE)

    await segment(wrapper, 'Vary settings', 'Off').trigger('click')
    expect(wrapper.emitted('set-vary-settings')).toBeUndefined()

    await wrapper.setProps({ varySettingsAvailable: true })
    expect(checked(wrapper, 'Vary settings')).toBe('On')
    expect(wrapper.text()).not.toContain(UNAVAILABLE_NOTE)
  })

  // @test-link [[rule_vary_settings_needs_legal_move]]
  // @test-link [[ui_field_dependent]]
  it('keeps What may vary shown meanwhile, whatever the stored choice', async () => {
    const wrapper = mountGroup({ varySettings: false, varySettingsAvailable: false })
    expect(toggleList(wrapper, 'What may vary')).toBeDefined()

    await wrapper.setProps({ varySettings: true })
    expect(toggleList(wrapper, 'What may vary')).toBeDefined()

    await wrapper.setProps({ varySettings: false, varySettingsAvailable: true })
    expect(toggleList(wrapper, 'What may vary')).toBeUndefined()
  })
})
