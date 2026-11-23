---
id: module_session_code_boundary
status: DRAFT
type: MODULE
layer: ARCHITECTURE
version: 0.1
priority: 1
tags: [v3, release-v3.4, session, boundaries]
dependents: []
human_name: The Session Core's Code Boundary
parents:
  - [[req_rolling_practice_session]]
---

# The Session Core's Code Boundary

## INTENT
Keep the session core, the code under src/session/ that runs a practice session, depending only on itself and the library, so the app's other parts (audio, notation, the composables, the workspace) are built on the session core and never the other way round.

## THE RULE / LOGIC
A file under src/session/ imports only files under src/session/ and files in the library set (src/domain/, src/generation-worker/, src/export/midi/, src/export/musicxml/; see module_library_code_boundary). Every target it names, by a static import, a re-export (export … from), a dynamic import() or a new URL(), resolves inside src/session/ or one of the library's folders, whether the path is written relative to the file or through the @/ alias. Type-only imports count like any other. No file under src/session/ imports a package. The line is checked by resolving each path, not by matching its text, as the library's line is.

src/session/ is not part of the library set: a library file still imports no session file.

The rule constrains what session's files import. It sets no rule on the files outside src/session/ that import session.

## TECHNICAL INTERFACE
scripts/verify-boundaries.mjs, run by `npm run verify:boundaries`: a source check over every .ts file under src/session/, which resolves each import … from, export … from, import('…'), import('…') type and new URL('…', import.meta.url) specifier the way the library-boundary check does (@/ to src/, a relative one against the file) and fails on a target outside src/session/ and the library set or a bare package specifier, naming the file, the line and the specifier; it sits beside the script's other checks, the library-boundary check among them, which it leaves as they are. README.md's Directory Boundaries states the line.

## EXPECTATION
- The code as it is passes the session check.
- A session file importing an app folder outside src/session/ and the library set (audio, notation or a composable, say) fails the check, which names the file, the line and the specifier; a type-only import fails it the same way.
- A session file importing a package fails the check.
- A session file importing a file of the library set passes the check.
