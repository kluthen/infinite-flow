// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { createSavePolicy } from '@/storage/save-policy'
import { StorageError } from '@/storage/storage-port'

import { outdatedPort, readyPort, settled } from './save-policy-doubles'
import { freshFactory, sampleRecord } from './storage-test-doubles'

// @test-link [[req_kept_session_review]]
// @test-link [[module_save_policy]]
describe("reading a kept session's records by its key", () => {
  // @test-link [[req_kept_session_review]]
  it('gives its session-wide record, its body and its played notes, raw, undefined where none is stored', async () => {
    const port = await readyPort(freshFactory())
    await port.write('sessionSummaries', 'k', sampleRecord('summary'))
    await port.write('sessionBodies', 'k', sampleRecord('body'))
    await port.write('playedNotes', 'other', sampleRecord('notes'))
    const policy = createSavePolicy(port)

    expect(await policy.readKeptSession('k')).toEqual({
      summary: sampleRecord('summary'),
      body: sampleRecord('body'),
      playedNotes: undefined,
    })
  })

  // @test-link [[req_kept_session_review]]
  // @test-link [[rule_outdated_tab_reads_what_it_can]]
  it('still reads with saving off in an outdated tab', async () => {
    const factory = freshFactory()
    const writer = await readyPort(factory)
    await writer.write('sessionBodies', 'k', sampleRecord('body'))
    const policy = createSavePolicy(await outdatedPort(factory))

    expect(policy.state()).toBe('off-outdated')
    expect((await policy.readKeptSession('k')).body).toEqual(sampleRecord('body'))
  })

  // @test-link [[req_kept_session_review]]
  it("hands the port's refusal to the caller", async () => {
    const port = await readyPort(freshFactory())
    const policy = createSavePolicy({
      ...port,
      read: () => Promise.reject(new StorageError('other', 'read refused')),
    })

    const { error } = await settled(policy.readKeptSession('k'))

    expect(error).toBeInstanceOf(StorageError)
  })
})
