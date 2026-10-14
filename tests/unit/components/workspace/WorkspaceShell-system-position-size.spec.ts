/**
 * The workspace's one shared system-position size: the shell sets it from the saved my
 * instrument's written range in its clef (none saved: the built-in 16 staff spaces) and the score
 * panel hands that one value to the staff. A range inside the built-ins' reach changes nothing;
 * written C3 to C6 in treble clef needs 18 staff spaces; written C2 to C4 needs 19 in treble clef
 * and 16 in bass clef; and the size follows my instrument being saved or deleted.
 */
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ScorePanel from '@/components/workspace/ScorePanel.vue'
import WorkspaceShell from '@/components/workspace/WorkspaceShell.vue'
import type { InstrumentMidiRange } from '@/domain/notation/written-phrase-types'
import type { InstrumentClef } from '@/domain/profile/instrument-clef'
import type { WrittenRangeInClef } from '@/notation/notation-layout-policy'
import { transportRig } from '../../audio/transport-rig'
import { createControllerRig } from '../../midi/midi-controller-rig'
import { fakeGenerationSession, readyState } from './fake-generation-session'
import { PHRASE_SCORE_STUB } from './test-workspace'
import { provideSaveSettings } from './recording-save-settings'
import { quietSavedData } from './quiet-saved-data'

vi.mock('@/components/review/ReviewPanel.vue', () => import('./review-panel-stub'))

afterEach(() => {
  document.body.innerHTML = ''
})

/** Intent: a saved my instrument's written range in its clef, treble unless named. */
function rangeInClef(
  writtenRange: InstrumentMidiRange,
  clef: InstrumentClef = 'treble',
): WrittenRangeInClef {
  return { writtenRange, clef }
}

/** Intent: mount the shell with a saved my instrument's written range in its clef, or none. */
function mountShell(savedMyInstrumentRangeInClef?: WrittenRangeInClef | null) {
  return mount(WorkspaceShell, {
    props: {
      savedData: quietSavedData(),
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
      ...(savedMyInstrumentRangeInClef === undefined ? {} : { savedMyInstrumentRangeInClef }),
    },
    global: { stubs: { PhraseScore: PHRASE_SCORE_STUB }, provide: provideSaveSettings() },
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
    const wrapper = mountShell(rangeInClef({ minMidi: 48, maxMidi: 72 }))
    expect(sizes(wrapper)).toEqual({ scorePanel: 160, staff: '160' })

    await wrapper.setProps({
      savedMyInstrumentRangeInClef: rangeInClef({ minMidi: 48, maxMidi: 84 }),
    })
    expect(sizes(wrapper)).toEqual({ scorePanel: 180, staff: '180' })

    await wrapper.setProps({ savedMyInstrumentRangeInClef: null })
    expect(sizes(wrapper)).toEqual({ scorePanel: 160, staff: '160' })
  })

  it("reads the saved my instrument's written range in its own clef", async () => {
    const wrapper = mountShell(rangeInClef({ minMidi: 36, maxMidi: 60 }, 'treble'))
    expect(sizes(wrapper)).toEqual({ scorePanel: 190, staff: '190' })

    await wrapper.setProps({
      savedMyInstrumentRangeInClef: rangeInClef({ minMidi: 36, maxMidi: 60 }, 'bass'),
    })
    expect(sizes(wrapper)).toEqual({ scorePanel: 160, staff: '160' })
  })
})
