/**
 * The header's mode switch and its two actions by the workspace's mode: the switch, the radiogroup
 * "Mode" with `Session` then `Jam`, sits after the brand and before the header actions, reports a
 * press, is read-only or `is-loading` with `aria-busy` as the mode says; while Jam mode opens both
 * actions are disabled in place with session mode's labels and emphasis; in Jam mode without a
 * kept doodle the phrase action reads `Generate phrase`, disabled, secondary, and the session
 * action `Start Jam`, primary and (for now) disabled; while Jam's staff shows a notation error the
 * phrase action reads `Retry notation`, enabled and primary, and asks for Jam's staff to be redrawn;
 * while the cue row holds `jam-needs-controller`, `Start Jam` names it with `aria-describedby`.
 */
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import WorkspaceHeader from '@/components/workspace/WorkspaceHeader.vue'
import type { WorkspaceModeView } from '@/components/workspace/use-workspace-mode'
import type { JamStaffState } from '@/jam/jam-view-types'
import { createFakeSessionController } from './fake-session-controller'
import { fakeGenerationSession, readyState } from './fake-generation-session'

const SESSION_MODE: WorkspaceModeView = {
  mode: 'session',
  checked: 'session',
  opening: false,
  readonly: false,
}
const OPENING: WorkspaceModeView = { ...SESSION_MODE, checked: 'jam', opening: true }
const JAM_MODE: WorkspaceModeView = { ...SESSION_MODE, mode: 'jam', checked: 'jam' }

/** Intent: mount the header at Ready, Start enabled, over the mode `view` and Jam's staff state. */
function mountHeader(
  view: WorkspaceModeView,
  jamStaffState: JamStaffState | null = null,
  jamNeedsController = false,
) {
  return mount(WorkspaceHeader, {
    props: {
      session: fakeGenerationSession(readyState()).session,
      controller: createFakeSessionController({ canStart: true }).controller,
      controllerStatus: { kind: 'connect' },
      workspaceMode: view,
      jamStaffState,
      jamNeedsController,
    },
    attachTo: document.body,
  })
}

/** Intent: the phrase action, the header's first action slot. */
function phraseAction(wrapper: ReturnType<typeof mountHeader>) {
  return wrapper.get('.header-actions > button:not(.session-action)')
}

/** Intent: the session action, the header's second action slot. */
function sessionAction(wrapper: ReturnType<typeof mountHeader>) {
  return wrapper.get('.header-actions > button.session-action')
}

afterEach(() => {
  document.body.innerHTML = ''
})

// @test-link [[module_workspace_mode]]
describe('WorkspaceHeader and the workspace mode', () => {
  // @test-link [[rule_app_opens_in_session_mode]]
  it('shows the mode switch after the brand, Session checked, and reports a press of Jam', async () => {
    const wrapper = mountHeader(SESSION_MODE)
    const children = wrapper.get('.layout-header').element.children
    expect([...children].map((child) => child.classList[0])).toEqual([
      'brand',
      'segmented-control',
      'header-actions',
    ])
    const modeSwitch = wrapper.get('.mode-switch')
    expect(modeSwitch.attributes('role')).toBe('radiogroup')
    expect(modeSwitch.attributes('aria-label')).toBe('Mode')
    const segments = modeSwitch.findAll('.segment')
    expect(segments.map((segment) => segment.text())).toEqual(['Session', 'Jam'])
    expect(segments[0]!.attributes('aria-checked')).toBe('true')
    expect(modeSwitch.attributes('aria-busy')).toBeUndefined()

    await segments[1]!.trigger('click')
    expect(wrapper.emitted('select-mode')).toEqual([['jam']])
    expect(sessionAction(wrapper).text()).toBe('Start session')
  })

  // @test-link [[rule_mode_button_at_idle_only]]
  it('refuses a press while read-only', async () => {
    const wrapper = mountHeader({ ...SESSION_MODE, readonly: true })
    const modeSwitch = wrapper.get('.mode-switch')
    expect(modeSwitch.classes()).toContain('is-readonly')

    await modeSwitch.findAll('.segment')[1]!.trigger('click')
    expect(wrapper.emitted('select-mode')).toBeUndefined()
  })

  // @test-link [[rule_jam_code_loaded_on_demand]]
  it('while Jam mode opens: Jam checked and busy, both actions disabled in place', () => {
    const wrapper = mountHeader(OPENING)
    const modeSwitch = wrapper.get('.mode-switch')
    expect(modeSwitch.classes()).toContain('is-loading')
    expect(modeSwitch.attributes('aria-busy')).toBe('true')
    expect(modeSwitch.findAll('.segment')[1]!.attributes('aria-checked')).toBe('true')

    expect(phraseAction(wrapper).text()).toBe('Regenerate phrase')
    expect(phraseAction(wrapper).attributes('disabled')).toBeDefined()
    expect(sessionAction(wrapper).text()).toBe('Start session')
    expect(sessionAction(wrapper).attributes('disabled')).toBeDefined()
    expect(sessionAction(wrapper).classes()).toContain('btn-primary')
  })

  // @test-link [[module_workspace_mode]]
  it('in Jam mode: Generate phrase disabled and secondary, Start Jam primary and disabled', () => {
    const wrapper = mountHeader(JAM_MODE)

    expect(phraseAction(wrapper).text()).toBe('Generate phrase')
    expect(phraseAction(wrapper).attributes('disabled')).toBeDefined()
    expect(phraseAction(wrapper).classes()).not.toContain('btn-primary')
    expect(sessionAction(wrapper).text()).toBe('Start Jam')
    expect(sessionAction(wrapper).classes()).toContain('btn-primary')
    expect(sessionAction(wrapper).attributes('disabled')).toBeDefined()
  })

  // @test-link [[module_workspace_mode]]
  it.each(['shown', 'no-room'] as const)(
    'keeps Generate phrase disabled in Jam mode while its staff is %s',
    (jamStaffState) => {
      const wrapper = mountHeader(JAM_MODE, jamStaffState)
      expect(phraseAction(wrapper).text()).toBe('Generate phrase')
      expect(phraseAction(wrapper).attributes('disabled')).toBeDefined()
      expect(sessionAction(wrapper).classes()).toContain('btn-primary')
    },
  )

  // @test-link [[module_workspace_mode]]
  it("offers Retry notation, enabled and primary, while Jam's staff shows a notation error", async () => {
    const wrapper = mountHeader(JAM_MODE, 'notation-error')

    expect(phraseAction(wrapper).text()).toBe('Retry notation')
    expect(phraseAction(wrapper).attributes('disabled')).toBeUndefined()
    expect(phraseAction(wrapper).classes()).toContain('btn-primary')
    expect(sessionAction(wrapper).classes()).not.toContain('btn-primary')
    expect(sessionAction(wrapper).text()).toBe('Start Jam')

    await phraseAction(wrapper).trigger('click')
    expect(wrapper.emitted('retry-jam-notation')).toEqual([[]])
  })

  // @test-link [[rule_jam_needs_controller]]
  it('has Start Jam name jam-needs-controller while the cue row holds it, and only then', () => {
    const needing = mountHeader(JAM_MODE, 'shown', true)
    expect(sessionAction(needing).attributes('aria-describedby')).toBe('jam-needs-controller')
    expect(sessionAction(needing).attributes('disabled')).toBeDefined()

    const connected = mountHeader(JAM_MODE, 'shown', false)
    expect(sessionAction(connected).attributes('aria-describedby')).toBeUndefined()
  })
})
