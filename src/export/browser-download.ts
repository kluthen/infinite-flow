/**
 * The browser download of an export file: the only way a session's data leaves the app. The bytes
 * become a Blob behind an object URL, a temporary `<a download>` is clicked, and the URL is revoked
 * and the anchor removed at once. Revoking right after the click cannot cancel the download: the
 * HTML standard resolves a blob URL to its Blob when the hyperlink is followed, which `click()` does
 * synchronously, and Chromium takes its blob-URL token at that moment. Nothing is sent over the
 * network and nothing is stored.
 */

import type { ExportFile } from './generated-notes-file'

/** Typed failure for a document that has no window to make the download in. */
// @spec-link [[req_session_export]]
export class BrowserDownloadError extends Error {
  readonly kind = 'BrowserDownloadError' as const

  constructor(message: string) {
    super(message)
    this.name = 'BrowserDownloadError'
  }
}

/**
 * Intent: hand one export file to the browser as a download under its file name, through the
 * given document: a Blob of its bytes and MIME type behind an object URL, one click on a temporary
 * `<a download>` anchor, then the URL revoked and the anchor removed, so nothing is left behind.
 * Throws a BrowserDownloadError on a document with no window.
 */
// @spec-link [[req_session_export]]
// @spec-link [[rule_optional_midi_privacy]]
// @spec-link [[rule_session_data_never_sent_or_stored]]
// @spec-link [[module_review_export_pipeline]]
export function downloadFile(file: ExportFile, doc: Document): void {
  const view = doc.defaultView
  if (view === null) throw new BrowserDownloadError('The document has no window to download in.')
  const blob = new view.Blob([file.bytes], { type: file.mimeType })
  const url = view.URL.createObjectURL(blob)
  const anchor = doc.createElement('a')
  anchor.href = url
  anchor.download = file.fileName
  anchor.hidden = true
  doc.body.append(anchor)
  try {
    anchor.click()
  } finally {
    anchor.remove()
    view.URL.revokeObjectURL(url)
  }
}
