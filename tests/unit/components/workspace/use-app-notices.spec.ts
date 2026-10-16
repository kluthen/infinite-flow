// @vitest-environment node
/**
 * The notice row's notice: which one shows, one at a time, from the load outcome, the saving
 * state, the save policy's failure reports and the reports of the deletions of damaged kept
 * sessions (the apology, or the save-problem notice in its Damaged session not deleted or Storage
 * full wording); held still during a session.
 */
import { describe, expect, it } from 'vitest'
import { effectScope, nextTick, shallowRef } from 'vue'

import { useAppNotices, type AppNoticeKind } from '@/components/workspace/use-app-notices'
import {
  createDamagedSessionReports,
  type DamagedSessionReports,
} from '@/components/workspace/workspace-kept-sessions-seam'
import type { LoadOutcome } from '@/storage-bootstrap'
import { createSavePolicy, type SavePolicy } from '@/storage/save-policy'

import {
  filledPort,
  openNewerTab,
  outdatedPort,
  refusingPort,
} from '../../storage/save-policy-doubles'
import { freshFactory, sampleRecord } from '../../storage/storage-test-doubles'

/** Intent: the notices over `policy` and `outcome`, in their own effect scope, with a session flag. */
function notices(
  outcome: LoadOutcome,
  policy: Promise<SavePolicy>,
  damagedSessions?: DamagedSessionReports,
) {
  const sessionActive = shallowRef(false)
  const scope = effectScope()
  const built = scope.run(() =>
    useAppNotices({
      source: { outcome, savePolicy: policy },
      sessionActive: () => sessionActive.value,
      ...(damagedSessions === undefined ? {} : { damagedSessions }),
    }),
  )
  if (built === undefined) throw new Error('the effect scope did not run')
  return {
    ...built,
    sessionActive,
    scope,
    kind: (): AppNoticeKind | null => built.notice.value?.kind ?? null,
  }
}

/** Intent: a ready policy whose saves can be refused on demand, and the factory behind it. */
async function refusable() {
  const factory = freshFactory()
  const { port, refuse } = refusingPort(await filledPort(factory))
  return { factory, refuse, policy: createSavePolicy(port) }
}

/** Intent: let the policy's promise and its listeners settle. */
async function settle(): Promise<void> {
  for (let turn = 0; turn < 5; turn++) await nextTick()
}

// @test-link [[rule_outdated_tab_stops_saving]]
describe('the outdated tab and the unusable data', () => {
  // @test-link [[rule_outdated_tab_stops_saving]]
  it('shows no notice while saving is on', async () => {
    const { policy } = await refusable()
    const row = notices('saved-data-read', Promise.resolve(policy))
    await settle()

    expect(row.notice.value).toBeNull()
  })

  // @test-link [[rule_outdated_tab_stops_saving]]
  it('shows the saved-data wording, with Reload only, when the visit read the saved data', async () => {
    const policy = createSavePolicy(await outdatedPort(freshFactory()))
    const row = notices('saved-data-read', Promise.resolve(policy))
    await settle()

    expect(row.notice.value).toEqual({
      kind: 'outdated-saved-data',
      text: 'A newer version of Infinite Flow has saved data on this device. Reload this page to use it; until then, nothing here is saved.',
      action: 'reload',
      dismissable: false,
    })
  })

  // @test-link [[rule_outdated_tab_stops_saving]]
  it('shows the defaults wording when the visit started from the defaults', async () => {
    const policy = createSavePolicy(await outdatedPort(freshFactory()))
    const row = notices('started-from-defaults', Promise.resolve(policy))
    await settle()

    expect(row.kind()).toBe('outdated-defaults')
    expect(row.notice.value?.text).toBe(
      "Your saved data couldn't be read, and a newer version of Infinite Flow has saved data on this device. This visit started from the defaults and saves nothing. Reload this page to use the newer version.",
    )
  })

  // @test-link [[rule_failed_read_told_to_player]]
  it('shows the unusable-data notice, with Reload only, before a late port opens', () => {
    const row = notices('started-from-defaults', new Promise<SavePolicy>(() => undefined))

    expect(row.notice.value).toEqual({
      kind: 'unusable-data',
      text: "Your saved data couldn't be read, so this visit started from the defaults and saves nothing. Reloading may fix it.",
      action: 'reload',
      dismissable: false,
    })
  })

  // @test-link [[rule_failed_read_told_to_player]]
  // @test-link [[rule_outdated_tab_stops_saving]]
  it('switches the unusable-data notice to the defaults wording when the tab becomes outdated', async () => {
    const { factory, policy } = await refusable()
    policy.stopSavingUnreadable()
    const row = notices('started-from-defaults', Promise.resolve(policy))
    await settle()
    expect(row.kind()).toBe('unusable-data')

    await openNewerTab(factory)
    await settle()

    expect(row.kind()).toBe('outdated-defaults')
  })
})

// @test-link [[rule_failed_save_never_disturbs_session]]
describe('the save-problem notice', () => {
  // @test-link [[rule_failed_save_never_disturbs_session]]
  it('shows storage full for a quota refusal, then Save failed in place for another kind', async () => {
    const { refuse, policy } = await refusable()
    const row = notices('saved-data-read', Promise.resolve(policy))
    await settle()

    refuse('quota')
    await policy.write('settings', 'theme', sampleRecord('Light'))
    expect(row.notice.value).toEqual({
      kind: 'storage-full',
      text: "This device has no room left for the app's data, so something couldn't be saved. Deleting sessions you no longer need frees space.",
      action: 'your-data',
      dismissable: true,
    })

    refuse('other')
    await policy.write('settings', 'theme', sampleRecord('Sepia'))
    expect(row.notice.value).toEqual({
      kind: 'save-failed',
      text: "Something couldn't be saved on this device. The app keeps working, but this change may be lost when the page closes.",
      action: null,
      dismissable: true,
    })
  })

  // @test-link [[rule_failed_save_never_disturbs_session]]
  it('stays dismissed for the rest of the run, whatever its kinds, and shows after a success', async () => {
    const { refuse, policy } = await refusable()
    const row = notices('saved-data-read', Promise.resolve(policy))
    await settle()
    refuse('quota')
    await policy.write('settings', 'theme', sampleRecord('Light'))

    row.dismiss()
    expect(row.notice.value).toBeNull()
    refuse('other')
    await policy.write('settings', 'theme', sampleRecord('Sepia'))
    refuse('quota')
    await policy.write('settings', 'theme', sampleRecord('Dark'))
    expect(row.notice.value).toBeNull()

    refuse(null)
    await policy.write('settings', 'theme', sampleRecord('Light'))
    refuse('quota')
    await policy.write('settings', 'theme', sampleRecord('Sepia'))
    expect(row.kind()).toBe('storage-full')
  })

  // @test-link [[rule_outdated_tab_stops_saving]]
  it('gives way to the outdated notice, which is never replaced', async () => {
    const { factory, refuse, policy } = await refusable()
    const row = notices('saved-data-read', Promise.resolve(policy))
    await settle()
    refuse('other')
    await policy.write('settings', 'theme', sampleRecord('Light'))
    expect(row.kind()).toBe('save-failed')

    await openNewerTab(factory)
    await settle()

    expect(row.kind()).toBe('outdated-saved-data')
  })

  // @test-link [[rule_failed_save_never_disturbs_session]]
  it('throws for a dismissal of a notice that cannot be dismissed', async () => {
    const policy = createSavePolicy(await outdatedPort(freshFactory()))
    const row = notices('saved-data-read', Promise.resolve(policy))
    await settle()

    expect(() => row.dismiss()).toThrow(Error)
  })
})

// @test-link [[rule_failed_save_never_disturbs_session]]
describe('during a session', () => {
  // @test-link [[rule_failed_save_never_disturbs_session]]
  // @test-link [[rule_outdated_tab_stops_saving]]
  it('holds a notice arising during a session until it ends', async () => {
    const { factory, policy } = await refusable()
    const row = notices('saved-data-read', Promise.resolve(policy))
    await settle()
    row.sessionActive.value = true

    await openNewerTab(factory)
    await settle()
    expect(row.notice.value).toBeNull()

    row.sessionActive.value = false
    expect(row.kind()).toBe('outdated-saved-data')
  })

  // @test-link [[rule_failed_read_told_to_player]]
  it('keeps a notice showing at Start unchanged, its actions disabled, until the session ends', async () => {
    const { factory, policy } = await refusable()
    policy.stopSavingUnreadable()
    const row = notices('started-from-defaults', Promise.resolve(policy))
    await settle()
    expect(row.actionsDisabled.value).toBe(false)

    row.sessionActive.value = true
    await openNewerTab(factory)
    await settle()
    expect(row.kind()).toBe('unusable-data')
    expect(row.actionsDisabled.value).toBe(true)
    expect(() => row.dismiss()).toThrow(Error)

    row.sessionActive.value = false
    expect(row.kind()).toBe('outdated-defaults')
    expect(row.actionsDisabled.value).toBe(false)
  })
})

const APOLOGY_ONE = "Sorry: a kept session was damaged and couldn't be read, so it was deleted."

/** Intent: the apology's text for `n` sessions, several. */
function apologyFor(n: number): string {
  return `Sorry: ${String(n)} kept sessions were damaged and couldn't be read, so they were deleted.`
}

/** Intent: notices over a ready refusable policy and a damaged sessions' reports channel. */
async function withReports(outcome: LoadOutcome = 'saved-data-read') {
  const ready = await refusable()
  const reports = createDamagedSessionReports()
  const row = notices(outcome, Promise.resolve(ready.policy), reports)
  await settle()
  return { ...ready, reports, row }
}

// @test-link [[module_kept_session_save]]
describe('the deletions of damaged kept sessions', () => {
  // @test-link [[module_kept_session_save]]
  it('apologise once a deletion committed, saying how many went, with Dismiss only', async () => {
    const { reports, row } = await withReports()

    reports.tell({ status: 'deleted', count: 1 })
    expect(row.notice.value).toEqual({
      kind: 'damaged-sessions-deleted',
      text: APOLOGY_ONE,
      action: null,
      dismissable: true,
    })

    reports.tell({ status: 'deleted', count: 2 })
    expect(row.notice.value?.text).toBe(apologyFor(3))

    row.dismiss()
    expect(row.notice.value).toBeNull()
    reports.tell({ status: 'deleted', count: 2 })
    expect(row.notice.value?.text).toBe(apologyFor(2))
  })

  // @test-link [[module_kept_session_save]]
  it("tell a refusal in the save-problem notice's Damaged session not deleted wording, at every refusal, even after Dismiss", async () => {
    const { reports, row } = await withReports()

    reports.tell({ status: 'refused', kind: 'other', count: 1 })
    expect(row.notice.value).toEqual({
      kind: 'damaged-session-not-deleted',
      text: "A kept session was damaged and couldn't be read, and this device refused to delete it. It stays hidden until the page is reloaded.",
      action: null,
      dismissable: true,
    })

    row.dismiss()
    reports.tell({ status: 'refused', kind: 'other', count: 3 })
    expect(row.notice.value?.text).toBe(
      "3 kept sessions were damaged and couldn't be read, and this device refused to delete them. They stay hidden until the page is reloaded.",
    )
  })

  // @test-link [[module_kept_session_save]]
  it('tell a refusal for lack of space as Storage full, at every refusal, even after Dismiss', async () => {
    const { reports, row } = await withReports()

    reports.tell({ status: 'refused', kind: 'quota', count: 2 })
    expect(row.kind()).toBe('storage-full')
    expect(row.notice.value?.action).toBe('your-data')

    row.dismiss()
    reports.tell({ status: 'refused', kind: 'quota', count: 1 })
    expect(row.kind()).toBe('storage-full')
  })

  // @test-link [[rule_failed_save_never_disturbs_session]]
  it('the apology and the save-problem notice replace each other in place, the latest shown', async () => {
    const { refuse, policy, reports, row } = await withReports()

    reports.tell({ status: 'deleted', count: 1 })
    refuse('other')
    await policy.write('settings', 'theme', sampleRecord('Light'))
    expect(row.kind()).toBe('save-failed')

    reports.tell({ status: 'deleted', count: 1 })
    expect(row.notice.value?.text).toBe(APOLOGY_ONE)

    reports.tell({ status: 'refused', kind: 'other', count: 1 })
    expect(row.kind()).toBe('damaged-session-not-deleted')
    reports.tell({ status: 'deleted', count: 2 })
    expect(row.notice.value?.text).toBe(apologyFor(2))
  })

  // @test-link [[rule_outdated_tab_stops_saving]]
  it('give way to the outdated notice, and an apology after the tab became outdated is never shown', async () => {
    const { factory, reports, row } = await withReports()
    reports.tell({ status: 'deleted', count: 1 })

    await openNewerTab(factory)
    await settle()
    expect(row.kind()).toBe('outdated-saved-data')

    reports.tell({ status: 'deleted', count: 1 })
    expect(row.kind()).toBe('outdated-saved-data')
  })

  // @test-link [[rule_failed_save_never_disturbs_session]]
  it('are held during a session, as every notice is', async () => {
    const { reports, row } = await withReports()
    row.sessionActive.value = true

    reports.tell({ status: 'deleted', count: 1 })
    expect(row.notice.value).toBeNull()

    row.sessionActive.value = false
    expect(row.notice.value?.text).toBe(APOLOGY_ONE)
  })

  it('stop being heard when the scope ends', async () => {
    const { reports, row } = await withReports()

    row.scope.stop()
    reports.tell({ status: 'deleted', count: 1 })

    expect(row.notice.value).toBeNull()
  })
})

// @test-link [[rule_failed_save_never_disturbs_session]]
it('lets go of the policy when its scope ends', async () => {
  const { policy } = await refusable()
  const row = notices('saved-data-read', Promise.resolve(policy))
  await settle()

  row.scope.stop()

  expect(() => policy.onFailure(() => undefined)).not.toThrow()
})
