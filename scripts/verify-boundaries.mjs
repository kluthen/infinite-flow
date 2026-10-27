import { realpathSync } from 'node:fs'
import { extname, join, relative, sep } from 'node:path'
import { readFile, readdir, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const sourceExtensions = new Set(['.css', '.js', '.jsx', '.ts', '.tsx', '.vue'])
/**
 * Browser storage no authored source file may touch, in any directory, `src/storage/` included:
 * the app's one store is IndexedDB under `src/storage/` (see `directoryScopedApis` below).
 */
// @spec-link [[rule_ephemeral_session_state]]
// @spec-link [[specification_ephemeral_state_verification]]
// @spec-link [[rule_session_data_never_sent_or_stored]]
const forbiddenPersistence = /\b(localStorage|sessionStorage|caches)\b/u

/**
 * APIs no authored source file may touch, in any directory: the network (the app is browser-only,
 * and session data is never sent anywhere), cookies (`document.cookie` and the Cookie Store API's
 * `cookieStore`), the microphone/camera, and media-element playback. Identifiers that are
 * unambiguous on their own are matched word-bounded; `fetch`, `new Audio` and `document.cookie`
 * are matched as their exact invocation/property-access form, since the bare words are common
 * outside this meaning (e.g. "prefetch" a lazy chunk, "audio" in a font comment).
 */
// @spec-link [[specification_browser_only_operation_verification]]
// @spec-link [[rule_session_data_never_sent_or_stored]]
// @spec-link [[rule_optional_midi_privacy]]
const alwaysForbidden =
  /\b(getUserMedia|mediaDevices|XMLHttpRequest|WebSocket|EventSource|sendBeacon|cookieStore)\b|\bnew\s+Audio\s*\(|\bfetch\s*\(|document\.cookie/u

/**
 * Web Audio calls no authored source file may make, in any directory, `src/audio/` included: the
 * session's voices (click and backing) are synthesized from oscillators and gains only, so nothing
 * decodes, buffers or streams recorded sound. `new AudioBuffer` is matched as its exact
 * construction form; the other three are unambiguous method names.
 */
// @spec-link [[req_session_backing_track]]
const sampledAudioApis =
  /\b(decodeAudioData|createBufferSource|createMediaElementSource)\b|\bnew\s+AudioBuffer\s*\(/u

/**
 * File extensions of recorded audio, MIDI files and sample libraries, none of which the build
 * output may ship: the backing is synthesized in the app, with no sample library and no extra
 * download. Matched case-insensitively.
 */
// @spec-link [[req_session_backing_track]]
const audioAssetExtensions = new Set([
  '.wav',
  '.mp3',
  '.ogg',
  '.oga',
  '.opus',
  '.flac',
  '.aac',
  '.m4a',
  '.weba',
  '.mid',
  '.midi',
  '.sf2',
  '.sfz',
])

/**
 * APIs allowed in exactly one directory of `src/` and rejected everywhere else: Web Audio contexts
 * (the live `AudioContext`, its legacy `webkitAudioContext` name, and `OfflineAudioContext`, which
 * renders audio off-line) only under `src/audio/`, Web MIDI access only under `src/midi/`, and
 * on-device storage (IndexedDB, and the storage manager `navigator.storage`, which asks for
 * persistent storage and reports usage) only under `src/storage/`. Keeping each capability in one
 * named place means every use of it sits behind that directory's code, where the rules on when
 * audio may start, when MIDI may be requested and what may be saved on the device are applied.
 */
// @spec-link [[specification_browser_only_operation_verification]]
// @spec-link [[req_on_device_storage]]
const directoryScopedApis = [
  {
    pattern: /\b(AudioContext|webkitAudioContext|OfflineAudioContext)\b/u,
    allowedDirectory: 'audio/',
    boundary: 'browser-only boundary: AudioContext is allowed only under src/audio/',
  },
  {
    pattern: /\brequestMIDIAccess\b/u,
    allowedDirectory: 'midi/',
    boundary: 'browser-only boundary: requestMIDIAccess is allowed only under src/midi/',
  },
  {
    pattern: /\bindexedDB\b|\bnavigator\s*\??\.\s*storage\b/u,
    allowedDirectory: 'storage/',
    boundary:
      'on-device storage boundary: indexedDB and navigator.storage are allowed only under src/storage/',
  },
]

/**
 * Intent: every authored source file under `directory`, recursively, as absolute paths.
 *
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

      return sourceExtensions.has(extname(entry.name)) ? [entryPath] : []
    }),
  )

  return nested.flat()
}

/**
 * Intent: the boundary labels one authored source file breaks, given its path relative to the
 * application source root (forward slashes, e.g. `audio/transport.ts`) and its contents.
 *
 * @param {string} relativePath
 * @param {string} contents
 * @returns {string[]}
 */
export function sourceBoundaryViolations(relativePath, contents) {
  const boundaries = []
  if (forbiddenPersistence.test(contents)) {
    boundaries.push('ephemeral-state boundary: browser persistence API found')
  }
  if (alwaysForbidden.test(contents)) {
    boundaries.push('browser-only boundary: network, cookie, microphone or media-element API found')
  }
  if (sampledAudioApis.test(contents)) {
    boundaries.push(
      'synthesized-backing boundary: sampled or decoded audio API found (voices are oscillators and gains only)',
    )
  }
  for (const { pattern, allowedDirectory, boundary } of directoryScopedApis) {
    if (pattern.test(contents) && !relativePath.startsWith(allowedDirectory)) {
      boundaries.push(boundary)
    }
  }
  return boundaries
}

/**
 * Intent: every file under `directory`, recursively, whatever its extension, as absolute paths.
 *
 * @param {string} directory
 * @returns {Promise<string[]>}
 */
async function everyFile(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const entryPath = join(directory, entry.name)
      return entry.isDirectory() ? everyFile(entryPath) : [entryPath]
    }),
  )
  return nested.flat()
}

/**
 * Intent: the boundary labels one build-output file breaks, given its path relative to the build
 * output root (forward slashes, e.g. `assets/index-abc.js`).
 *
 * @param {string} relativePath
 * @returns {string[]}
 */
// @spec-link [[req_session_backing_track]]
export function buildOutputBoundaryViolations(relativePath) {
  if (audioAssetExtensions.has(extname(relativePath).toLowerCase())) {
    return ['synthesized-backing boundary: audio or sample asset found in the build output']
  }
  return []
}

/**
 * Intent: scan every file under `outputRoot` (the directory that stands for the build output
 * `dist/`) and report each boundary it breaks, with paths relative to `outputRoot` in forward
 * slashes, so the same scan runs over the real `dist/` or over a test tree laid out like it.
 *
 * @param {string} outputRoot
 * @returns {Promise<{ files: string[], violations: { file: string, boundary: string }[] }>}
 */
// @spec-link [[req_session_backing_track]]
export async function scanBuildOutputBoundaries(outputRoot) {
  const files = (await everyFile(outputRoot))
    .map((absolutePath) => relative(outputRoot, absolutePath).split(sep).join('/'))
    .sort()
  const violations = files.flatMap((file) =>
    buildOutputBoundaryViolations(file).map((boundary) => ({ file, boundary })),
  )
  return { files, violations }
}

/**
 * Intent: scan every authored source file under `sourceRoot` (the directory that stands for the
 * application's `src/`) and report each boundary it breaks. Paths are reported relative to
 * `sourceRoot` with forward slashes, which is also how directory allowlists are matched, so the
 * same scan runs over the real `src/` or over a fixture tree laid out like it.
 *
 * @param {string} sourceRoot
 * @returns {Promise<{ files: string[], violations: { file: string, boundary: string }[] }>}
 */
export async function scanSourceBoundaries(sourceRoot) {
  const absolutePaths = (await authoredSourceFiles(sourceRoot)).sort()
  const files = []
  const violations = []
  for (const absolutePath of absolutePaths) {
    const file = relative(sourceRoot, absolutePath).split(sep).join('/')
    files.push(file)
    const contents = await readFile(absolutePath, 'utf8')
    for (const boundary of sourceBoundaryViolations(file, contents)) {
      violations.push({ file, boundary })
    }
  }
  return { files, violations }
}

/**
 * The build's module graph as scripts/module-graph-plugin.mjs writes it: every JS chunk, its file
 * name relative to the build output root, whether it is an entry, the chunks it imports statically
 * and dynamically, and the source modules it holds (paths from the project root, e.g.
 * `src/jam/jam-mode.ts`).
 *
 * @typedef {{ fileName: string, isEntry: boolean, imports: string[], dynamicImports: string[], modules: string[] }} GraphChunk
 * @typedef {{ chunks: GraphChunk[] }} ModuleGraph
 */

/** Where Jam's code lives, as the module graph names source modules. */
const jamSourceDirectory = 'src/jam/'

/**
 * Intent: the build's module graph, read from `<outputRoot>/.vite/module-graph.json`. A missing
 * file fails loudly (ENOENT), like a missing dist/sw.js: the check needs a production build.
 *
 * @param {string} outputRoot the directory that stands for the build output `dist/`
 * @returns {Promise<ModuleGraph>}
 */
// @spec-link [[module_jam_code_boundary]]
export async function readModuleGraph(outputRoot) {
  const graph = JSON.parse(await readFile(join(outputRoot, '.vite', 'module-graph.json'), 'utf8'))
  if (typeof graph !== 'object' || graph === null || !Array.isArray(graph.chunks)) {
    throw new Error(`${join(outputRoot, '.vite', 'module-graph.json')} holds no chunks list`)
  }
  return graph
}

/**
 * Intent: the chunks of the first load: every entry chunk and every chunk they import statically,
 * transitively. Chunks imported only dynamically load on demand and stay out of it.
 *
 * @param {ModuleGraph} graph
 * @returns {GraphChunk[]}
 */
function firstLoadChunks(graph) {
  const byFileName = new Map(graph.chunks.map((chunk) => [chunk.fileName, chunk]))
  const reached = new Set()
  const pending = graph.chunks.filter((chunk) => chunk.isEntry)
  while (pending.length > 0) {
    const chunk = pending.pop()
    if (chunk === undefined || reached.has(chunk)) continue
    reached.add(chunk)
    for (const imported of chunk.imports) {
      const importedChunk = byFileName.get(imported)
      if (importedChunk !== undefined) pending.push(importedChunk)
    }
  }
  return graph.chunks.filter((chunk) => reached.has(chunk))
}

/**
 * Intent: every src/jam/ module the first load holds (see firstLoadChunks), with the chunk that
 * holds it: Jam's code must load only on demand, through its loader, so the list is empty in a
 * sound build.
 *
 * @param {ModuleGraph} graph
 * @returns {{ chunk: string, module: string }[]}
 */
// @spec-link [[module_jam_code_boundary]]
export function firstLoadJamViolations(graph) {
  return firstLoadChunks(graph).flatMap((chunk) =>
    chunk.modules
      .filter((module) => module.startsWith(jamSourceDirectory))
      .map((module) => ({ chunk: chunk.fileName, module })),
  )
}

/**
 * Intent: the chunks that hold Jam's code (any src/jam/ module), by file name, for the check's
 * report of their sizes.
 *
 * @param {ModuleGraph} graph
 * @returns {string[]}
 */
// @spec-link [[module_jam_code_boundary]]
export function jamChunkFileNames(graph) {
  return graph.chunks
    .filter((chunk) => chunk.modules.some((module) => module.startsWith(jamSourceDirectory)))
    .map((chunk) => chunk.fileName)
}

/**
 * Intent: the byte sizes of the given chunks of the build output, as `<file name> <size> B`
 * separated by commas, for the check's report.
 *
 * @param {string} outputRoot the directory that stands for the build output `dist/`
 * @param {string[]} fileNames chunk file names relative to `outputRoot`
 * @returns {Promise<string>}
 */
async function chunkSizes(outputRoot, fileNames) {
  const sized = await Promise.all(
    fileNames.map(
      async (fileName) => `${fileName} ${(await stat(join(outputRoot, fileName))).size} B`,
    ),
  )
  return sized.join(', ')
}

/**
 * Intent: the full boundary verification run by `npm run verify:boundaries`: the authored-source
 * scan of `src/`, the Workbox runtime-caching setting, the precache manifest, the build output's
 * audio-asset scan, the chunk-size budgets and Jam's code boundary (no src/jam/ module in the first
 * load, read from the build's module graph). Throws with every violation found.
 */
async function verifyBoundaries() {
  const { files, violations: sourceViolations } = await scanSourceBoundaries(
    fileURLToPath(new URL('../src/', import.meta.url)),
  )
  const violations = sourceViolations.map(({ file, boundary }) => `src/${file} (${boundary})`)

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

  const { files: outputFiles, violations: outputViolations } = await scanBuildOutputBoundaries(
    fileURLToPath(new URL('../dist/', import.meta.url)),
  )
  for (const { file, boundary } of outputViolations) {
    violations.push(`dist/${file} (${boundary})`)
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

  /**
   * Per-chunk minified-size budgets (bytes), matched by file-name prefix. The lazy VexFlow engraver
   * chunk (src/notation/vexflow-engraver-loader.ts) embeds the Bravura/Academico fonts and is
   * intentionally large -- see its budget and the matching comment on vite.config.ts's
   * `chunkSizeWarningLimit`, which silences Vite's own generic size warning in favor of this
   * targeted check. Every other JS chunk is expected to stay small; an unmatched chunk falls back to
   * the tightest budget so unexpected new chunks are still guarded.
   */
  const entryChunkByteBudget = 300 * 1024 // v3.1 (spec D359): raised from 224 KiB, v3.0 shipped 229,146 B with 230 B left; v3.1's presets and level controls load at first start
  const generationWorkerChunkByteBudget = 150 * 1024
  const vexflowEngraverChunkByteBudget = 800 * 1024
  const defaultChunkByteBudget = 100 * 1024

  const chunkByteBudgets = [
    { prefix: 'index-', budget: entryChunkByteBudget, label: 'entry chunk (index-*.js)' },
    {
      prefix: 'generation.worker-',
      budget: generationWorkerChunkByteBudget,
      label: 'generation Worker chunk (generation.worker-*.js)',
    },
    {
      prefix: 'vexflow-engraver-',
      budget: vexflowEngraverChunkByteBudget,
      label: 'VexFlow engraver chunk (vexflow-engraver-*.js)',
    },
  ]

  let jsChunkCount = 0
  for (const entry of assetEntries) {
    if (!entry.isFile() || extname(entry.name) !== '.js') continue
    jsChunkCount += 1
    const matchedBudget = chunkByteBudgets.find(({ prefix }) => entry.name.startsWith(prefix))
    const budget = matchedBudget?.budget ?? defaultChunkByteBudget
    const label = matchedBudget?.label ?? 'other JS chunk'
    const { size } = await stat(join(distAssetsPath.pathname, entry.name))
    if (size > budget) {
      violations.push(
        `dist/assets/${entry.name} (${label} exceeds its budget: ${Math.round(size / 1024)} kB > ${Math.round(budget / 1024)} kB)`,
      )
    }
  }

  // Jam's code boundary: no src/jam/ module in the entry chunk or a chunk it imports statically.
  const distRoot = fileURLToPath(new URL('../dist/', import.meta.url))
  const moduleGraph = await readModuleGraph(distRoot)
  for (const { chunk, module } of firstLoadJamViolations(moduleGraph)) {
    violations.push(`dist/${chunk} (Jam's code boundary: ${module} is in the first load)`)
  }

  if (violations.length > 0) {
    throw new Error(`Boundary violation(s) found: ${violations.join('; ')}`)
  }

  console.log(
    `Boundary verification passed for ${files.length} authored source files, ${outputFiles.length} build-output files with no audio or sample asset, ${precacheableAssetCount} precacheable dist/assets entries, and ${jsChunkCount} JS chunk(s) within budget ` +
      `(entry ${entryChunkByteBudget / 1024} kB, generation.worker ${generationWorkerChunkByteBudget / 1024} kB, vexflow-engraver ${vexflowEngraverChunkByteBudget / 1024} kB, other ${defaultChunkByteBudget / 1024} kB).`,
  )
  const entryChunks = moduleGraph.chunks.filter((chunk) => chunk.isEntry).map((c) => c.fileName)
  const jamChunks = jamChunkFileNames(moduleGraph)
  console.log(
    `Jam's code boundary passed: no src/jam/ module in the first load. Entry chunk: ${await chunkSizes(distRoot, entryChunks)}. ` +
      `Jam's chunks: ${jamChunks.length > 0 ? await chunkSizes(distRoot, jamChunks) : 'none in the build'}.`,
  )
}

// Runs the verification only when this file is the Node entry point (`node scripts/verify-boundaries.mjs`),
// so importing it for its exported scan does not also read `dist/`.
if (
  process.argv[1] !== undefined &&
  realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await verifyBoundaries()
}
