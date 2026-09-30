---
id: service_session_runner
status: DRAFT
type: SERVICE
layer: ARCHITECTURE
priority: 1
human_name: Session Runner
version: 0.1
tags: session,generation-worker
parents:
  - [[rule_look_ahead_deadline]]
  - [[rule_session_generation_failure_ladder]]
  - [[service_session_engine]]
dependents: []
---

# Session Runner

## INTENT
Carry out the session engine's requests through the app's one generation worker and fit-check seam, and turn their results and failures back into timed engine events.

## THE RULE / LOGIC
The runner wraps one session engine. It forwards every engine output, those produced by fed-back results included, to the output callback in the order the engine gave it, executes each request-generation output through the injected generate seam and each check-fit output through the injected fit-check seam, and feeds every result back to the engine as an event stamped with the injected clock's current time. It is the only place in the session layer that reads a time.

- A rejected generate request, whether a worker crash on that one request or a transport error from a dead worker, becomes a generation-crashed event for that attempt: a failed attempt, handled by the failure ladder. The session never ends because of it, since a generation failure never stops the session.
- Any other rejection of the generate seam, a rejection of the fit-check seam, and an error the engine throws while handling a fed-back result are programming errors: each goes to the required error callback, nothing is fed back to the engine, and the runner never swallows them or counts them as a failed attempt.
- The fit-check seam is required and has no default.
- Ticks, count-in over, phrase started sounding and every end cause come from the transport that drives the runner through its dispatch, not from the runner itself. A transport event the engine refuses throws synchronously from dispatch, to the transport that sent it.

The workspace composition binds the session runner to the same generate seam, and so the same single worker, that the Idle flow uses for phrase 1. Phrase 2 therefore reuses the warm rhythm-domain memo phrase 1 built, instead of paying a cold start inside the one-measure count-in, which is only one second at 240 BPM.

## TECHNICAL INTERFACE
`createSessionRunner({ generate, checkFit, now, providers, viewport, onOutput, onError }, start)` in `src/session/session-runner.ts`, with `checkFit` and `onError` required, returns `{ dispatch(event) }` for the transport events `count-in-over`, `phrase-started-sounding`, `tick` and `end`. A `generate` rejection that is a `GenerationWorkerCrashError` or a `GenerationWorkerTransportError` becomes `generation-crashed { attemptId }`; any other `generate` rejection, a `checkFit` rejection, or an engine throw while handling a fed-back result goes to `onError`, with nothing fed back. A transport event the engine refuses throws its `SessionEngineError` synchronously from `dispatch`. `composeWorkspaceSession` exposes a `createSessionRunner({ start, checkFit, now, onOutput, onError })` bound to the same `deps.generate`, providers and window-width reading as the Idle flow.

## EXPECTATION
- Each request-generation output reaches the generate seam once, and its result returns to the engine stamped with the clock's time.
- Every engine output reaches the output callback in the order the engine gave it, fed-back ones included.
- A worker crash on one request, or a transport error from a dead worker, is handled as a failed attempt and the session keeps running.
- Any other generate rejection, or a fit-check rejection, reaches the error callback and feeds nothing back to the engine.
- The Idle phrase 1 and the session's phrase 2 go through the one generate seam.
