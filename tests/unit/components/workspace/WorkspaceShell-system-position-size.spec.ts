/**
 * The workspace's one shared system-position size: the shell sets it from the saved my
 * instrument's written range (none saved: the built-in 16 staff spaces) and the score panel hands
 * that one value to the staff. A range inside the built-ins' reach changes nothing; written C3 to
 * C6 needs 17 staff spaces; and the size follows my instrument being saved or deleted.
 */
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ScorePanel from '@/components/workspace/ScorePanel.vue'
import WorkspaceShell from '@/components/workspace/WorkspaceShell.vue'
import type { InstrumentMidiRange } from '@/domain/notation/written-phrase-types'
import { transportRig } from '../../audio/transport-rig'
import { createControllerRig } from '../../midi/midi-controller-rig'
import { fakeGenerationSession, readyState } from './fake-generation-session'
import { PHRASE_SCORE_STUB } from './test-workspace'

vi.mock('@/components/review/ReviewPanel.vue', () => import('./review-panel-stub'))

afterEach(() => {
  document.body.innerHTML = ''
})

/** Intent: mount the shell with a saved my instrument's written range, or none. */
function mountShell(savedMyInstrumentWrittenRange?: InstrumentMidiRange | null) {
  return mount(WorkspaceShell, {
    props: {
      session: fakeGenerationSession(readyState()).session,
      pendingPhrase: null,
      handleEngraved: () => {},
      handleNotationError: () => {},
      handleSessionStaffFailed: () => {},
      handleLayoutInputs: () => {},
      audio: transportRig().transport,
      midi: createControllerRig().controller,
      controller: null,
      jumpView: { scrollBy: vi.fn(), viewportBlockSize: () => 800 },
      scrollToPageTop: vi.fn(),
      ...(savedMyInstrumentWrittenRange === undefined ? {} : { savedMyInstrumentWrittenRange }),
    },
    global: { stubs: { PhraseScore: PHRASE_SCORE_STUB } },
    attachTo: document.body,
  })
}

/** Intent: the size the shell gives the score panel, and the one the panel gives the staff. */
function sizes(wrapper: ReturnType<typeof mountShell>) {
  return {
    scorePanel: wrapper.getComponent(ScorePanel).props('systemPositionUnits'),
    staff: wrapper.getComponent(PHRASE_SCORE_STUB).attributes('system-position-units'),
  }
}

// @test-link [[module_notation_layout_preflight]]
describe('WorkspaceShell: the one shared system-position size', () => {
  it('is the built-in 16 staff spaces with no saved my instrument', () => {
    expect(sizes(mountShell())).toEqual({ scorePanel: 160, staff: '160' })
    expect(sizes(mountShell(null))).toEqual({ scorePanel: 160, staff: '160' })
  })

  it("follows the saved my instrument's written range, growing only beyond the built-ins' reach", async () => {
    const wrapper = mountShell({ minMidi: 48, maxMidi: 72 })
    expect(sizes(wrapper)).toEqual({ scorePanel: 160, staff: '160' })

    await wrapper.setProps({ savedMyInstrumentWrittenRange: { minMidi: 48, maxMidi: 84 } })
    expect(sizes(wrapper)).toEqual({ scorePanel: 180, staff: '180' })

    await wrapper.setProps({ savedMyInstrumentWrittenRange: null })
    expect(sizes(wrapper)).toEqual({ scorePanel: 160, staff: '160' })
  })
})
