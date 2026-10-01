---
id: service_headless_phrase_replay
status: DRAFT
layer: ARCHITECTURE
version: 0.1
priority: 1
parents:
  - [[module_generation_worker_protocol]]
  - [[module_notation_display_convention]]
  - [[module_phrase_replay_key]]
  - [[rule_seeded_phrase_reproduction]]
  - [[service_generation_orchestration]]
notes: Captured 2026-10-01 before code (branch replay-key, pre-code architecture capture). Owner decisions, recorded as rationale - the key excludes the app version and commit, so a later generator change may replay a key differently, which is accepted; the key is a debugging basis for the generator.
type: SERVICE
tags: generation,replay,seed,debugging,cli
dependents: []
human_name: Headless Phrase Replay
---

# Headless Phrase Replay

## INTENT
Replay one phrase from its replay key on the command line, through the same generation worker path the browser runs, and print a complete, readable account of its inputs and outcome, as a debugging basis for the generator.

## THE RULE / LOGIC
`npm run replay:phrase -- <key>` takes the key as its argument or on stdin; a whole copied console line is accepted, the key being its `ifk<N>.` token. The script loads the TypeScript replay module through Vite's runnerImport, Vite already being a dependency, so replay adds no dependency. Replay decodes the key, builds the worker request envelope `{type:'generate', id:1, intent}`, round-trips it through JSON as the structured clone of a worker message would, and sends it through the generation worker runtime's message handler: the same runtime, protocol parser, request handler and phrase generation the browser worker runs, starting from a cold rhythm-domain memo, which yields the same result as a prewarmed one.

It prints one JSON document `{ key, keyVersion, phraseNumber, input, output }`, the phrase number being the key's own. The input holds every intent field verbatim, plus readable additions: the seed in seed1- form, note names, the written and the concert tonal center, and the carry-in with named pitches. For a successful outcome the output holds the outcome kind; the resolved request with its register and register window; the bars numbered from 1, with their chords (1-based beat timing, roles, symbols) and every note and rest in order (onset, duration, concert and written pitch as MIDI number and name, ties); the ending and its endpoint class; the carry-out derived with the key's phrase number; the provenance; the diagnostics; and the raw outcome verbatim. For a generation failure it holds the failure code and diagnostics. Written pitches and written names come only from the existing notation path, read after generation; replay adds no transposition logic of its own.

The exit code is 0 when the replay ran, whether the outcome is a phrase or a generation failure; 1 for a malformed or unsupported key or a usage error, with a clear message on stderr; 2 when the worker path crashed, the JSON still being printed with output kind `crash`.

## TECHNICAL INTERFACE
`scripts/replay-phrase.mjs`, run as `npm run replay:phrase -- <key>` or given the key or a copied console line on stdin, writes the JSON report to stdout and errors to stderr, and exits 0, 1 or 2 as above. `src/generation-worker/phrase-replay.ts` picks the one key token out of the given text, decodes it, replays the decoded key through the generation worker runtime and returns the report; a report-formatting sibling module, with its bar and pitch-naming helpers, turns the key, the decoded key and the worker's response into the printed JSON.

## EXPECTATION
Replaying a key the app emitted reproduces that phrase's generation outcome exactly, as long as the generator is unchanged. Replaying the same key twice prints the same JSON. Written pitches and names in the report always match what notation shows for that phrase. A malformed or unsupported key exits 1 without running generation; a generation failure exits 0 with its code and diagnostics; a crash exits 2 with the JSON still printed.
