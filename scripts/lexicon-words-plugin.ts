import { readFileSync } from 'node:fs'
import { isAbsolute, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizePath, type Plugin } from 'vite'

import { LexiconFormatError, parseLexicon, shownEntries } from '../src/lexicon/index.ts'

/** The build-only module that holds the lexicon's shown entries, as the app imports it. */
export const LEXICON_WORDS_MODULE_ID = 'virtual:lexicon-words'

/** The bundler's id of that module: `\0` marks it as virtual, so no other plugin loads it. */
const RESOLVED_LEXICON_WORDS_ID = `\0${LEXICON_WORDS_MODULE_ID}`

/**
 * The name of the words' built file, `assets/lexicon-words-<hash>.js`, by which
 * `scripts/verify-boundaries.mjs` recognises it for its budget and the first load.
 */
export const LEXICON_WORDS_CHUNK_NAME = 'lexicon-words'

/** The project root, the directory above this file's. */
const projectRoot = fileURLToPath(new URL('..', import.meta.url))

/** The lexicon file the build reads by default. */
export const LEXICON_PATH = fileURLToPath(new URL('../docs/music/lexicon.md', import.meta.url))

/** A path as error messages give it: from the project root when inside it, else absolute. */
function shownPath(path: string): string {
  const fromRoot = relative(projectRoot, path)
  if (fromRoot.startsWith('..') || isAbsolute(fromRoot)) return path
  return fromRoot.split(sep).join('/')
}

/**
 * The build-only module's source for a lexicon text: the shown entries (see shownEntries), in the
 * lexicon's order, as its default export. Throws the parser's LexiconFormatError on an empty or
 * malformed lexicon; `fileName` names the file in its message.
 */
export function lexiconWordsModuleSource(text: string, fileName: string): string {
  const entries = shownEntries(parseLexicon(text, fileName))
  return `export default ${JSON.stringify(entries)}\n`
}

/**
 * The Vite plugin that reads the lexicon file through the lexicon module's parser and serves its
 * shown entries as the build-only module `virtual:lexicon-words`. In a build it emits that module
 * as a file of its own, `lexicon-words-<hash>.js`, with its exports kept, whether or not the app
 * imports it yet; the app reaches it only through a dynamic `import()`. An empty or malformed
 * lexicon fails the build (or the development server's load of the module) with the parser's
 * message. The lexicon file is watched: in the development server an edit reloads the module.
 *
 * @param options.lexiconPath the lexicon file to read, absolute; the project's by default
 */
// @spec-link [[module_lexicon_single_source]]
export function lexiconWordsPlugin(options: { lexiconPath?: string } = {}): Plugin {
  const lexiconPath = options.lexiconPath ?? LEXICON_PATH
  let command: 'build' | 'serve' = 'build'
  return {
    name: 'infinite-flow:lexicon-words',
    configResolved(config) {
      command = config.command
    },
    buildStart() {
      if (command !== 'build') return
      this.emitFile({
        type: 'chunk',
        id: LEXICON_WORDS_MODULE_ID,
        name: LEXICON_WORDS_CHUNK_NAME,
        preserveSignature: 'strict',
      })
    },
    resolveId(id) {
      return id === LEXICON_WORDS_MODULE_ID ? RESOLVED_LEXICON_WORDS_ID : null
    },
    load(id) {
      if (id !== RESOLVED_LEXICON_WORDS_ID) return null
      this.addWatchFile(lexiconPath)
      try {
        return lexiconWordsModuleSource(readFileSync(lexiconPath, 'utf8'), shownPath(lexiconPath))
      } catch (error) {
        if (error instanceof LexiconFormatError) this.error(error.message)
        throw error
      }
    },
    hotUpdate({ file, modules }) {
      if (normalizePath(file) !== normalizePath(lexiconPath)) return
      const words = this.environment.moduleGraph.getModuleById(RESOLVED_LEXICON_WORDS_ID)
      if (words === undefined) return
      this.environment.moduleGraph.invalidateModule(words)
      return [...modules, words]
    },
  }
}
