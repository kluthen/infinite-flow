---
id: service_session_runner
status: REVIEW
type: SERVICE
layer: ARCHITECTURE
priority: 1
human_name: Session Runner
version: 0.7
tags: session,generation-worker
parents:
  - [[rule_dropped_attempt_cancelled]]
  - [[rule_look_ahead_deadline]]
  - [[rule_session_generation_failure_ladder]]
  - [[service_session_engine]]
dependents: []
notes: Synced 2026-10-07 after the code landed (post-task sync): the code matches the revised text; status DRAFT to REVIEW, its status before the revision, now that the code and its linked tests have landed. Earlier: Revised 2026-10-07 before code (previous version 0.6, pre-code architecture capture) for rule_dropped_attempt_cancelled: one abort signal per attempt passed to the generate seam, aborted on the engine's cancel-generation output; an aborted attempt's settlement is never fed back nor treated as an error; the shared worker is replaced on a cancellation and re-warmed. Status REVIEW to DRAFT until the code lands. Earlier: Revised 2026-10-05 during documentation debt paydown (previous version 0.5), to match the code since v2 chunk 25: the workspace starter turns the vary-settings choice into the mutation flag with a seed from the workspace seed provider, passes the rolling display's reading and the output sink on unchanged, and dispatch accepts an automatic settings change; this text had still described the pre-chunk-25 starter. Status stays DRAFT. Earlier: Revised 2026-10-03 before code in v2 chunk 27 (previous version 0.4, pre-code architecture capture) for adaptive tempo: dispatch also accepts the engine controller event, which session MIDI sends on a loss and a reconnection. Earlier: revised in the v2 chunk 24 post-task sync. Status stays DRAFT.
---

# Session Runner

## INTENT
Carry out the session engine's requests through the app's one generation worker and fit-check seam, and turn their results and failures back into timed engine events.

## THE RULE / LOGIC
The runner wraps one session engine. It forwards every engine output, those produced by fed-back results included, to the output callback in the order the engine gave it, executes each request-generation output through the injected generate seam and each check-fit output through the injected fit-check seam, given the candidate's outcome together with the intent of the attempt being checked, and its phrase number, and feeds every result back to the engine as an event stamped with the injected clock's current time. It is the only place in the session layer that reads a time.

- A rejected generate request, whether a worker crash on that one request or a transport error from a dead worker, becomes a generation-crashed event for that attempt: a failed attempt, handled by the failure ladder. The session never ends because of it, since a generation failure never stops the session.
- Any other rejection of the generate seam, a rejection of the fit-check seam, and an error the engine throws while handling a fed-back result are programming errors: each goes to the required error callback, nothing is fed back to the engine, and the runner never swallows them or counts them as a failed attempt.
- The runner gives every attempt it sends to the generate seam its own abort signal, passed with the request. On a cancel-generation output it aborts that attempt's signal, which cancels the attempt where it runs. Whatever an aborted attempt's request then settles with, an outcome or a rejection of any kind, is never fed back to the engine and never reaches the error callback: a cancelled attempt is neither a failed attempt nor a programming error. A result for an attempt the engine dropped without cancelling it, such as one in its fit check, is fed back as before, and the engine ignores it.
- The fit-check seam is required and has no default.
- Ticks, count-in over, phrase started sounding, the controller event and every end cause come from the transport that drives the runner through its dispatch, not from the runner itself. Dispatch also accepts a settings change from an automatic source other than the engine's own mutations, which no part of the app sends yet. An event the engine refuses throws synchronously from dispatch, to the caller that sent it.
- The runner hands the engine the display reading it is given, which tells whether any of a phrase is on screen.

The workspace starts its runner through a starter that turns the player's vary-settings choice into the engine's settings-mutation flag: on, with a mutation seed drawn at the start from the workspace's seed provider, before the engine asks for any attempt seed, and kept in the session's start, so the session replays from its inputs; off, with no seed drawn. The multi-phrase tension arc and adaptive tempo pass through as the start gives them. The starter passes on the display reading its caller gives, and the caller's output sink with only the replay-key announcement of each accepted session phrase put before it: the display reading is the rolling display's own answer, for the layout held for the session, to whether any of a phrase is on screen, and the session controller handles every output, settings changed and phrase discarded included.

The workspace composition binds the session runner to the same generate seam, and so the same single worker, that the Idle flow uses for phrase 1. Phrase 2 therefore reuses the warm rhythm-domain memo phrase 1 built, instead of paying a cold start inside the one-measure count-in, which is only one second at 240 BPM. The workspace's prewarm of the current rhythm setting lands in that same worker's memo, so the Idle flow and a running session both benefit from it; phrase 2's reuse of the warm memo phrase 1 built is unchanged. A cancellation replaces that worker with a fresh one, whose memo the workspace rebuilds with a prewarm while its prewarm policy is enabled; the Idle flow never cancels.

## TECHNICAL INTERFACE
`createSessionRunner({ generate, checkFit, now, providers, viewport, display, onOutput, onError }, start)` in `src/session/session-runner.ts`, with `generate(intent, signal?: AbortSignal): Promise<GenerationOutcome>`, given one `AbortController`'s signal per attempt and aborted on that attempt's `cancel-generation` output, an aborted attempt's settlement being dropped (never fed back, never sent to `onError`), and with `checkFit(candidate: { outcome: SuccessfulOutcome; intent: GenerationIntent }, phraseNumber): Promise<boolean>`, `display: SessionDisplayReading` and `onError` required, returns `{ dispatch(event) }` for the transport events `count-in-over`, `phrase-started-sounding`, `controller`, `tick` and `end` (`SessionTransportEvent`) and for `settings-change` (together, `SessionRunnerEvent`). A `generate` rejection that is a `GenerationWorkerCrashError` or a `GenerationWorkerTransportError` becomes `generation-crashed { attemptId }`; any other `generate` rejection, a `checkFit` rejection, or an engine throw while handling a fed-back result goes to `onError`, with nothing fed back. An event the engine refuses throws its `SessionEngineError` synchronously from `dispatch`. `composeWorkspaceSession` exposes `loadSessionRunner(): Promise<WorkspaceSessionRunnerStarter>`, which loads `src/components/workspace/workspace-session-runner.ts`, as part of the session controller's chunk, and the replay-key announcer, then resolves to a synchronous starter; the session controller receives that starter as its `createSessionRunner` dependency. The starter takes `WorkspaceSessionRunnerInput { start, checkFit, now, display, onOutput, onError }`, whose `start` is a `WorkspaceSessionStart`: a `SessionStart` with `varySettings: boolean` in place of `mutation`. It binds the runner to the same `deps.generate`, providers and window-width reading as the Idle flow, wraps `onOutput` in `announcingSessionOutputs`, which logs each accepted session phrase's replay key before forwarding the output unchanged, and calls `startWorkspaceSessionRunner(deps, start)`, which sets `mutation` to `mutationFlagFor(varySettings, deps.providers.nextSeed)` (`SETTINGS_MUTATION_OFF`, or `{ kind: 'on', seed }` with the seed drawn then) and passes the `display` and `onOutput` it is given on unchanged.

## EXPECTATION
- Each request-generation output reaches the generate seam once, and its result returns to the engine stamped with the clock's time.
- Every engine output reaches the output callback in the order the engine gave it, fed-back ones included.
- A worker crash on one request, or a transport error from a dead worker, is handled as a failed attempt and the session keeps running.
- Any other generate rejection, or a fit-check rejection, reaches the error callback and feeds nothing back to the engine.
- A cancel-generation output aborts that attempt's signal, and the aborted attempt's settlement, whether an outcome, a cancellation rejection or any other rejection, neither reaches the engine nor the error callback.
- The Idle phrase 1 and the session's phrase 2 go through the one generate seam.
