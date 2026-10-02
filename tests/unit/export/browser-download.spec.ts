/**
 * The browser download of an export file, in a jsdom document: one click on a temporary
 * `<a download>` carrying the file name and a blob URL of the file's bytes, the URL revoked, and
 * nothing left in the DOM. jsdom has no object URLs, so the test gives its window a small
 * stand-in that hands out `blob:` URLs and records each Blob and each revoke.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { BrowserDownloadError, downloadFile } from '@/export/browser-download'
import type { ExportFile } from '@/export/generated-notes-file'

/** What the download did: the clicks it made, the Blobs it wrapped, the URLs it revoked. */
interface DownloadTrace {
  readonly clicks: { href: string; download: string; inDocument: boolean }[]
  readonly blobs: Map<string, Blob>
  readonly revoked: string[]
}

const FILE: ExportFile = {
  fileName: 'infinite-flow-2026-10-02-184731-generated.mid',
  mimeType: 'audio/midi',
  bytes: new Uint8Array([0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6]),
}

let trace: DownloadTrace
let restoreUrl: () => void
let stopListening: () => void

beforeEach(() => {
  trace = { clicks: [], blobs: new Map(), revoked: [] }
  const urlApi = window.URL as unknown as Record<string, unknown>
  const original = {
    createObjectURL: urlApi['createObjectURL'],
    revokeObjectURL: urlApi['revokeObjectURL'],
  }
  let counter = 0
  urlApi['createObjectURL'] = (blob: Blob): string => {
    const url = `blob:http://localhost/export-${++counter}`
    trace.blobs.set(url, blob)
    return url
  }
  urlApi['revokeObjectURL'] = (url: string): void => {
    trace.revoked.push(url)
  }
  restoreUrl = () => Object.assign(urlApi, original)
  const onClick = (event: Event): void => {
    const anchor = event.target
    if (!(anchor instanceof HTMLAnchorElement)) return
    trace.clicks.push({
      href: anchor.href,
      download: anchor.download,
      inDocument: document.body.contains(anchor),
    })
    event.preventDefault()
  }
  document.addEventListener('click', onClick)
  stopListening = () => document.removeEventListener('click', onClick)
})

afterEach(() => {
  stopListening()
  restoreUrl()
  document.body.replaceChildren()
})

// @test-link [[req_session_export]]
// @test-link [[rule_session_data_never_sent_or_stored]]
describe('downloadFile', () => {
  // @test-link [[req_session_export]]
  it("clicks one anchor named after the file, on a blob URL of the file's bytes and type", async () => {
    const before = document.body.innerHTML

    downloadFile(FILE, document)

    expect(trace.clicks).toEqual([
      { href: 'blob:http://localhost/export-1', download: FILE.fileName, inDocument: true },
    ])
    const blob = trace.blobs.get('blob:http://localhost/export-1')!
    expect(blob.type).toBe('audio/midi')
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(FILE.bytes)
    expect(document.body.innerHTML).toBe(before)
  })

  // @test-link [[rule_session_data_never_sent_or_stored]]
  it('revokes the blob URL and leaves nothing in the DOM', () => {
    downloadFile(FILE, document)

    expect(trace.revoked).toEqual(['blob:http://localhost/export-1'])
    expect(document.querySelectorAll('a')).toHaveLength(0)
  })

  // @test-link [[rule_session_data_never_sent_or_stored]]
  it('still revokes the URL and removes the anchor when the click throws', () => {
    const original = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function click(): void {
      original.call(this)
      throw new Error('click failed')
    }
    try {
      expect(() => downloadFile(FILE, document)).toThrow('click failed')
    } finally {
      HTMLAnchorElement.prototype.click = original
    }

    expect(trace.revoked).toEqual(['blob:http://localhost/export-1'])
    expect(document.querySelectorAll('a')).toHaveLength(0)
  })

  // @test-link [[req_session_export]]
  it('refuses a document with no window', () => {
    const detached = document.implementation.createHTMLDocument('detached')

    expect(() => downloadFile(FILE, detached)).toThrow(BrowserDownloadError)
    expect(trace.blobs.size).toBe(0)
  })
})
