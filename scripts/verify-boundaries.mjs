import { extname, join, relative } from 'node:path'
import { readFile, readdir } from 'node:fs/promises'

const applicationRoot = new URL('../src/', import.meta.url)
const sourceExtensions = new Set(['.css', '.js', '.jsx', '.ts', '.tsx', '.vue'])
// @spec-link [[rule_ephemeral_session_state]]
// @spec-link [[specification_ephemeral_state_verification]]
const forbiddenPersistence = /\b(localStorage|sessionStorage|indexedDB|caches)\b/u

/**
 * Optional-scope APIs the first release must never touch: MIDI, audio capture/synthesis, the
 * microphone, and any server/network coupling (the app is browser-only and offline). Identifiers
 * that are unambiguous on their own are matched word-bounded; `fetch`, `new Audio` and
 * `document.cookie` are matched as their exact invocation/property-access form, since the bare
 * words are common outside this meaning (e.g. "prefetch" a lazy chunk, "audio" in a font comment).
 */
// @spec-link [[rule_optional_midi_privacy]]
// @spec-link [[specification_browser_only_operation_verification]]
const forbiddenOptionalScope =
  /\b(requestMIDIAccess|AudioContext|webkitAudioContext|OfflineAudioContext|getUserMedia|mediaDevices|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b|\bnew\s+Audio\s*\(|\bfetch\s*\(|document\.cookie/u

/**
 * @param {string} directory
 * @returns {Promise<string[]>}
 */
async function authoredSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(directory, entry.name)
      if (entry.isDirectory()) {
        return authoredSourceFiles(entryPath)
      }

      return sourceExtensions.has(entry.name.slice(entry.name.lastIndexOf('.'))) ? [entryPath] : []
    }),
  )

  return nested.flat()
}

const sourcePath = applicationRoot.pathname
const files = await authoredSourceFiles(sourcePath)
const violations = []

for (const file of files) {
  const contents = await readFile(file, 'utf8')
  const relativePath = relative(process.cwd(), file)
  if (forbiddenPersistence.test(contents)) {
    violations.push(`${relativePath} (ephemeral-state boundary: browser persistence API found)`)
  }
  if (forbiddenOptionalScope.test(contents)) {
    violations.push(
      `${relativePath} (browser-only boundary: no optional scope -- MIDI/audio/microphone/network API found)`,
    )
  }
}

const viteConfigPath = new URL('../vite.config.ts', import.meta.url)
const viteConfig = await readFile(viteConfigPath, 'utf8')
if (!/runtimeCaching\s*:\s*\[\s*\]/u.test(viteConfig)) {
  violations.push('vite.config.ts (runtimeCaching must be an explicit empty array)')
}

// The precache checks below need a production build (`npm run build`) to exist; a missing
// dist/sw.js fails loudly here (ENOENT) rather than silently skipping the check.
const serviceWorkerPath = new URL('../dist/sw.js', import.meta.url)
const distAssetsPath = new URL('../dist/assets/', import.meta.url)
const serviceWorker = await readFile(serviceWorkerPath, 'utf8')

const precachedUrls = new Set(
  [...serviceWorker.matchAll(/url:"([^"]+)"/gu)].map((match) => match[1]),
)

if (!precachedUrls.has('index.html')) {
  violations.push('dist/sw.js (index.html is missing from precacheAndRoute)')
}

// Every emitted JS/CSS/woff2 asset (the main chunk, the lazy notation chunk, the worker chunk, the
// self-hosted fonts) must be offline-available, so each one must appear in the precache manifest.
const precacheableExtensions = new Set(['.js', '.css', '.woff2'])
const assetEntries = await readdir(distAssetsPath.pathname, { withFileTypes: true })
let precacheableAssetCount = 0
for (const entry of assetEntries) {
  if (!entry.isFile() || !precacheableExtensions.has(extname(entry.name))) continue
  precacheableAssetCount += 1
  const precacheUrl = `assets/${entry.name}`
  if (!precachedUrls.has(precacheUrl)) {
    violations.push(`dist/sw.js (${precacheUrl} is missing from precacheAndRoute)`)
  }
}

if (violations.length > 0) {
  throw new Error(`Boundary violation(s) found: ${violations.join('; ')}`)
}

console.log(
  `Boundary verification passed for ${files.length} authored source files and ${precacheableAssetCount} precacheable dist/assets entries.`,
)
