---
id: module_lexicon_single_source
status: REVIEW
version: 0.2
priority: 1
tags: [v3, release-v3.4, lexicon, build, performance]
parents:
  - [[req_lexicon_page]]
dependents: []
type: MODULE
layer: ARCHITECTURE
human_name: The Lexicon's Single Source and Build Step
---

# The Lexicon's Single Source and Build Step

## INTENT
Keep the lexicon file the one source of every word the app shows, read when the app is built, and keep those words out of the app's first load.

## THE RULE / LOGIC
The project's lexicon file, kept in the docs/music/ directory, is the only source of the lexicon's words in the app. When the app is built, a build step reads it, runs the lexicon module's own parser over it (the one parser, the API's: api_lexicon_read_contract) and hands the app the shown entries, in the entry contract's shape and the lexicon's order, as a module that exists only in the build. Nothing is written into src/, public/ or tests/ and nothing generated is committed; no file committed there holds a real entry's plain line. The raw file is never imported or parsed in the browser, so the Internal entries and the sources never ship. Shaping drops the Internal entries, any related id naming one, and the sources; it splits the aliases into other names, none giving no name; an entry with no app meaning gets null; every field keeps the lexicon's text as written.

The build stops, naming the entry's word and its line in the file, when an entry lacks its id, popup or definition; when an entry's lines are not the template's fields in the template's order (a field the template does not name, a field given twice, fields out of order, or a line under the entry that is not a field); when an id is used twice; or when a related id names no entry of the file. It stops naming the file when the lexicon has no shown entry. A broken entry is therefore found at the build and never silently dropped, and the page is never empty. The 200-character limit on the plain line is a writing rule of the lexicon's owners, not checked by the build. The build step runs in every build configuration whose build or tests reach the words, and in the development server it rebuilds on a lexicon edit.

The words go into a built file of their own, reached only through a dynamic import, with a size budget of its own, 448 KiB; every other new file keeps the general per-file limit. No module of the lexicon module or of the page, and none of the words, is in the app's first load (the entry file and every file it imports statically), checked on the build's module graph as Jam's boundary is. The words' file is precached by the service worker with every other built file, so the page works offline.

## TECHNICAL INTERFACE
The build step is a Vite plugin that runs the parser in src/lexicon/ over the lexicon file in docs/music/ and serves the shown entries as a build-only module, with its type declaration in src/lexicon/; it is registered in vite.config.ts, vite.workspace-harness.config.ts and vitest.config.ts. The build-only module is imported only dynamically. scripts/verify-boundaries.mjs, run by npm run verify:boundaries after npm run build, holds the words' file within its own budget and fails when a src/lexicon/ or src/components/lexicon/ module, or the build-only module, is in the first load; it also fails unless the build emits exactly one lexicon-words-* file. In eslint.config.js, lexiconPageImportPattern refuses a static import of src/components/lexicon/ from outside it and its loader, type-only imports allowed.

## EXPECTATION
- The app shows the lexicon's entries only from the lexicon file, read at build time; no generated copy and no real entry's plain line is committed under src/, public/ or tests/.
- Adding an entry to the lexicon, or moving one out of the Internal group, changes what the app gets with nothing else changed.
- Each malformed-lexicon case fails the build naming the entry's word and its line; a lexicon with no shown entry fails it naming the file; the real lexicon passes.
- The words are in a built file of their own within 448 KiB, fetched on demand and never in the first load, and available offline once precached.
