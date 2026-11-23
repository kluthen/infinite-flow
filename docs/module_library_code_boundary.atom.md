---
id: module_library_code_boundary
status: DRAFT
priority: 1
tags: [v3, release-v3.4, library, boundaries]
parents:
  - [[req_played_notes_export]]
  - [[req_rolling_practice_session]]
  - [[req_session_export]]
  - [[user_story_controlled_phrase_generation]]
dependents: []
type: MODULE
version: 0.1
human_name: The Library's Code Boundary
layer: ARCHITECTURE
---

# The Library's Code Boundary

## INTENT
Keep the app's music core, the phrase generator with its musical logic and data shapes and the export files' encoders, a self-contained library that depends on nothing else in the app and on no package, so the rest of the app is built on the library and never the other way round.

## THE RULE / LOGIC
The library set is four folders: src/domain/ (the musical logic and the data shapes the rest of the app shares), src/generation-worker/ (the generation worker and its message protocol), src/export/midi/ and src/export/musicxml/ (the MIDI and MusicXML encoders). The other files under src/export/, which turn a session into a download, lie outside it.

A file in the library set imports only files in the set. Every target it names, by a static import, a re-export (export … from), a dynamic import() or a new URL(), resolves inside one of the four folders, whether the path is written relative to the file or through the @/ alias. Type-only imports count like any other: the build erases them, but the library has to stand on its own without the code they name. No file in the set imports a package. The line is checked by resolving each path, not by matching its text, because the same relative text can land inside the set or outside it (domain/notation from one file, src/notation from another).

src/domain/ knows no browser: it type-checks against the language's own library alone, with no DOM library and no ambient types, so no domain file can name document, window or any other browser API. The other three folders are not held to that check.

The rule constrains what the library's files import. It sets no rule on the files outside the set that import the library.

## TECHNICAL INTERFACE
scripts/verify-boundaries.mjs, run by `npm run verify:boundaries`: a source check over every .ts file of the library set, which resolves each import … from, export … from, import('…') and new URL('…') specifier (@/ to src/, a relative one against the file) and fails on a target outside the set or a bare package specifier, naming the file, the line and the specifier; it sits beside the script's other checks, which it leaves as they are. A TypeScript project over src/domain/** with lib ES2023, no ambient types (types: []) and the app's strict flags, referenced from tsconfig.json so that `vue-tsc --build` (`npm run typecheck`) checks it. README.md's Directory Boundaries states the line.

## EXPECTATION
- The code as it is passes the boundary check.
- A library file whose import leaves the set fails the check, which names the file, the line and the specifier: a relative import, an @/ import, a type-only import, an export … from, an import() and a new URL() each.
- A library file importing a package fails the check.
- A src/domain/ file using a DOM API such as document fails the type-check.
