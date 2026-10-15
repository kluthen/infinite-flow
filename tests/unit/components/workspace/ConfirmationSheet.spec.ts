/**
 * The shared confirmation sheet, in the confirmation pattern: a modal dialog over a backdrop,
 * named by its title, its paragraphs, then its confirming action and the way back, in that order;
 * focus on the way back at open and trapped in the sheet; Escape, a press on the backdrop and
 * Close are the way back; a deleting action in `btn-error`; a failure's error under the
 * paragraphs.
 */
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import ConfirmationSheet from '@/components/workspace/ConfirmationSheet.vue'

const PROPS = {
  title: "Delete this session's played notes?",
  paragraphs: [
    'This deletes the notes you played in this session. The session stays, with its favorite phrases and comment.',
    "This can't be undone.",
  ],
  confirmLabel: 'Delete played notes',
  cancelLabel: 'Cancel',
  destructive: true,
  error: null as string | null,
  busy: false,
}

let wrapper: VueWrapper | null = null

/** Intent: the sheet mounted in the document with `props` over the defaults. */
function sheet(props: Partial<typeof PROPS> = {}): VueWrapper {
  wrapper = mount(ConfirmationSheet, { props: { ...PROPS, ...props }, attachTo: document.body })
  return wrapper
}

/** Intent: the sheet's buttons' text, in markup order. */
function buttons(mounted: VueWrapper): string[] {
  return mounted.findAll('button').map((button) => button.text())
}

/** Intent: press a key on the document, as the player would anywhere in the page. */
function press(key: string, shiftKey = false): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true }))
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

// @test-link [[rule_kept_played_notes_deletable]]
describe('the confirmation sheet', () => {
  it('is a modal dialog named by its title, its paragraphs then its actions, confirming first', () => {
    const mounted = sheet()
    const dialog = mounted.get('[role="dialog"]')

    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(document.getElementById(dialog.attributes('aria-labelledby')!)?.textContent).toBe(
      PROPS.title,
    )
    expect(mounted.findAll('.sheet-body p').map((p) => p.text())).toEqual(PROPS.paragraphs)
    expect(buttons(mounted)).toEqual(['Close', 'Delete played notes', 'Cancel'])
    expect(mounted.get('.sheet-actions .btn-error').text()).toBe('Delete played notes')
    expect(mounted.find('.inline-alert').exists()).toBe(false)
  })

  it('a confirming action that deletes nothing takes the primary emphasis', () => {
    const mounted = sheet({ destructive: false, confirmLabel: 'Unpin' })

    expect(mounted.get('.sheet-actions .btn-primary').text()).toBe('Unpin')
    expect(mounted.find('.btn-error').exists()).toBe(false)
  })

  it('puts focus on the way back at open, and keeps Tab inside the sheet', () => {
    const mounted = sheet()
    const [close, confirm, cancel] = mounted.findAll('button').map((b) => b.element)

    expect(document.activeElement).toBe(cancel)
    press('Tab')
    expect(document.activeElement).toBe(close)
    press('Tab')
    expect(document.activeElement).toBe(confirm)
    press('Tab', true)
    expect(document.activeElement).toBe(close)
  })

  it('confirms only through its confirming action', async () => {
    const mounted = sheet()

    await mounted.get('.sheet-actions .btn-error').trigger('click')

    expect(mounted.emitted('confirm')).toHaveLength(1)
    expect(mounted.emitted('cancel')).toBeUndefined()
  })

  it('goes back on the way back, Close, Escape and a press on the backdrop, never on the sheet', async () => {
    const mounted = sheet()

    await mounted.findAll('.sheet-actions button')[1]!.trigger('click')
    await mounted.get('.sheet-close').trigger('click')
    press('Escape')
    await mounted.get('.sheet-backdrop').trigger('click')
    await mounted.get('.sheet').trigger('click')

    expect(mounted.emitted('cancel')).toHaveLength(4)
    expect(mounted.emitted('confirm')).toBeUndefined()
  })

  it("shows a failure's error under its paragraphs, and its confirming action stays to try again", () => {
    const mounted = sheet({ error: "That couldn't be deleted. Try again." })

    const alert = mounted.get('.sheet-body .inline-alert.alert-error')
    expect(alert.text()).toBe("That couldn't be deleted. Try again.")
    expect(mounted.get('.sheet-actions .btn-error').attributes('disabled')).toBeUndefined()
  })

  it('while its deletion runs, the confirming action is busy and disabled', () => {
    const mounted = sheet({ busy: true })

    const confirm = mounted.get('.sheet-actions .btn-error')
    expect(confirm.attributes('disabled')).toBeDefined()
    expect(confirm.classes()).toContain('is-loading')
  })
})
