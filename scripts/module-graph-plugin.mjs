import { isAbsolute, relative, sep } from 'node:path'

/**
 * The build's module graph, written beside the build output as `dist/.vite/module-graph.json` so
 * `npm run verify:boundaries` can tell which source modules each JS chunk holds and how the chunks
 * import one another (Jam's code boundary: no src/jam/ module in the first load). Read from the
 * bundle Vite's bundler (rolldown) hands to `generateBundle`: each output chunk's `moduleIds`, its
 * static `imports` and its `dynamicImports`. The file is not precached: the service worker's
 * globPatterns match no `.json` file.
 */

/** Where the graph lands, relative to the build output root. */
export const MODULE_GRAPH_FILE = '.vite/module-graph.json'

/**
 * Intent: a module id as the graph lists it: without the `\0` prefix that marks a virtual module,
 * without its query string (a Vue file's script, template and style parts are one source file),
 * and relative to the project root with forward slashes when it is a path inside it.
 *
 * @param {string} id the bundler's module id
 * @param {string} root the project root, absolute
 * @returns {string}
 */
export function graphModuleId(id, root) {
  const withoutQuery = id.replace(/^\0/u, '').replace(/\?.*$/su, '')
  if (!isAbsolute(withoutQuery)) return withoutQuery
  const fromRoot = relative(root, withoutQuery)
  if (fromRoot.startsWith('..') || isAbsolute(fromRoot)) return withoutQuery.split(sep).join('/')
  return fromRoot.split(sep).join('/')
}

/**
 * Intent: the module graph of one bundle: every JS chunk with its file name, whether it is an
 * entry, the chunks it imports statically and dynamically (file names), and the source modules it
 * holds (see graphModuleId), sorted and without repeats.
 *
 * @param {Record<string, { type: string, fileName: string, isEntry?: boolean, imports?: string[], dynamicImports?: string[], moduleIds?: string[] }>} bundle
 * @param {string} root the project root, absolute
 * @returns {{ chunks: { fileName: string, isEntry: boolean, imports: string[], dynamicImports: string[], modules: string[] }[] }}
 */
export function bundleModuleGraph(bundle, root) {
  const chunks = Object.values(bundle)
    .filter((output) => output.type === 'chunk')
    .map((chunk) => ({
      fileName: chunk.fileName,
      isEntry: chunk.isEntry === true,
      imports: [...(chunk.imports ?? [])],
      dynamicImports: [...(chunk.dynamicImports ?? [])],
      modules: [...new Set((chunk.moduleIds ?? []).map((id) => graphModuleId(id, root)))].sort(),
    }))
    .sort((left, right) => left.fileName.localeCompare(right.fileName))
  return { chunks }
}

/**
 * Intent: the Vite build plugin that emits the bundle's module graph (see bundleModuleGraph) as the
 * asset `.vite/module-graph.json`, for the build's boundary check.
 *
 * @returns {import('vite').Plugin}
 */
// @spec-link [[module_jam_code_boundary]]
export function moduleGraphPlugin() {
  let root = process.cwd()
  return {
    name: 'infinite-flow:module-graph',
    apply: 'build',
    configResolved(config) {
      root = config.root
    },
    generateBundle(_options, bundle) {
      const graph = bundleModuleGraph(bundle, root)
      this.emitFile({
        type: 'asset',
        fileName: MODULE_GRAPH_FILE,
        source: `${JSON.stringify(graph, null, 2)}\n`,
      })
    },
  }
}
