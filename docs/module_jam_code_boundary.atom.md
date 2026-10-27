---
id: module_jam_code_boundary
status: DRAFT
layer: ARCHITECTURE
version: 0.1
priority: 1
type: MODULE
human_name: Jam's Code Boundary
tags: [v3, release-v3.2, jam, performance, workspace]
parents:
  - [[rule_jam_code_loaded_on_demand]]
dependents: []
---

# Jam's Code Boundary

## INTENT
Keep Jam's code out of the app's first load and reachable from the rest of the app through one door, so session mode never pays for Jam.

## THE RULE / LOGIC
Jam's code lives under src/jam/: Jam's view and its Idle, the capture, what Jam derives from the doodle (its controls and its steering block, phrase 1's join), the path to phrase 1, Jam's settings, tap-in, the key and mode suggestion, and the doodle sections of the review and the exports. Outside it stay what Jam shares with the rest of the app: the data shapes (the quantized doodle under src/domain/doodle/, the generation request with its steering block and its carry-in, the kept-session codec), the generator's steering module inside the generation worker, and the session engine's generic way in under src/session/.

Jam's code loads through one memoized loader, the pattern the review panel's and the preset sheet's loaders follow: every caller shares one import, and a failed import clears the memo so the next attempt tries again. Nothing outside the loader imports a src/jam/ module statically; a lint rule refuses it. The build's boundary check fails when any src/jam/ module is in the entry chunk, read from the build's module graph, so the first load holds the mode switch and nothing else of Jam's.

Code outside src/jam/ reaches Jam's code only through the loader, or through ports Jam's code registers on the workspace when it loads (the notes the capture reads, the review's doodle section, the exports' doodle section); a caller that needs Jam's code before it has loaded waits for the load. Jam's chunks are precached by the service worker like every other file of the build, so once kept they open offline. Not built yet.

## TECHNICAL INTERFACE
src/components/workspace/load-jam-mode.ts, the one memoized loader of Jam's code. eslint.config.js: a `no-restricted-imports` rule refusing a static import of any src/jam/ module from every file outside src/jam/ but the loader (taking in today's rule that keeps the doodle quantizer, src/jam/doodle-quantizer.ts, inside src/jam/). scripts/verify-boundaries.mjs, run by `npm run verify:boundaries` after `npm run build`, fails when a src/jam/ module is in the entry chunk, beside its existing checks (the entry chunk's byte budget and every built file precached in dist/sw.js among them). Not built yet.

## EXPECTATION
- The real build passes the boundary check; a build in which the entry chunk imports a src/jam/ module fails it.
- A static import of a src/jam/ module from outside src/jam/ and the loader fails the lint.
- Jam's code is fetched on the first opening of Jam mode in a visit and never before; a failed fetch is retried on the next attempt.
- Once the service worker has kept Jam's chunks, Jam mode opens offline.
