/**
 * The shared mount of the ScorePanel component specs: a thin reactive harness around the panel on a
 * real test workspace, with PhraseScore stubbed, plus the stub's emitter and the steps several
 * specs take to reach a state.
 */
import { flushPromises, mount } from '@vue/test-utils'
import { expect } from 'vitest'
import { defineComponent, h, type PropType } from 'vue'

import ScorePanel from '@/components/workspace/ScorePanel.vue'
import { createMixVolumePopover } from '@/components/workspace/mix-volume-popover'
import { TOO_WIDE } from '../../composables/fake-staff-fit'
import { PHRASE_SCORE_STUB, type TestWorkspace } from './test-workspace'

const MOUNT_OPTIONS = { global: { stubs: { PhraseScore: PHRASE_SCORE_STUB } } }

/** Intent: a thin reactive harness that re-reads `workspace.pendingPhrase.value` on every render. */
const ScorePanelHarness = defineComponent({
  props: {
    workspace: { type: Object, required: true },
    matchesPhoneLayout: { type: Function as PropType<() => boolean>, required: true },
  },
  setup(props) {
    const mixPopover = createMixVolumePopover('mix-volume-popover')
    return () =>
      h(ScorePanel, {
        session: (props.workspace as TestWorkspace).session,
        pendingPhrase: (props.workspace as TestWorkspace).pendingPhrase.value,
        handleEngraved: (props.workspace as TestWorkspace).handleEngraved,
        handleNotationError: (props.workspace as TestWorkspace).handleNotationError,
        handleSessionStaffFailed: (props.workspace as TestWorkspace).handleSessionStaffFailed,
        handleLayoutInputs: (props.workspace as TestWorkspace).handleLayoutInputs,
        audio: (props.workspace as TestWorkspace).audio,
        mixPopover,
        controller: null,
        matchesPhoneLayout: props.matchesPhoneLayout,
      })
  },
})

/** Intent: mount the panel, answering the notation layout's width query with `phoneLayout`. */
// @test-link [[module_notation_layout_preflight]]
export function mountHarness(workspace: TestWorkspace, phoneLayout = false) {
  return mount(ScorePanelHarness, {
    props: { workspace, matchesPhoneLayout: () => phoneLayout },
    ...MOUNT_OPTIONS,
  })
}

/** Intent: the standard PhraseScore `engraved` payload, only its shape matters here. */
export const ENGRAVED_PAYLOAD = {
  staffSpacePx: 1,
  widthPx: 1,
  heightPx: 1,
  requiredUnits: 1,
  systemCount: 1,
}

/** Intent: a PhraseScore stub's emitter, for the events a mounted staff would fire. */
export function phraseScore(wrapper: ReturnType<typeof mountHarness>) {
  return wrapper.getComponent({ name: 'PhraseScore' }).vm
}

/** Intent: generate once with every attempt too wide, leaving the too-many-notes notice. */
export async function reachTooManyNotesNotice(workspace: TestWorkspace): Promise<void> {
  workspace.staff.setFallbackFit(TOO_WIDE)
  await workspace.session.actions.generate()
  await flushPromises()
  expect(workspace.session.state.roomNotice).toBe('notes_too_wide')
}
