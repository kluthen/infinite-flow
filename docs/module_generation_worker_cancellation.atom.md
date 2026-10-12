---
id: module_generation_worker_cancellation
status: STABLE
priority: 1
version: 0.2
human_name: Generation Worker Cancellation
tags: generation-worker,session,look-ahead
dependents: []
type: MODULE
layer: ARCHITECTURE
parents:
  - [[rule_dropped_attempt_cancelled]]
  - [[rule_pregeneration_yields_to_player]]
  - [[rule_session_generation_failure_ladder]]
  - [[service_workspace_session_runner_factory]]
notes: Revised 2026-10-12 to version 0.2 (previous version 0.1) with the product owner's agreement, given on 2026-10-12 (spec D290), together with the CONTRACT 3.1 MINOR bump he ruled; stays STABLE. The Idle flow's player requests still pass no signal and are never cancelled; a background pre-generation attempt passes one, aborted by any player request at Idle, so rule_pregeneration_yields_to_player joins its parents. The mechanism is unchanged. The wording holds for the running code: the Idle flow passes no signal, and the background clause holds trivially until v3.0 build plan chunk 24 builds pre-generation; that chunk's architecture capture names the caller that passes and aborts the signal. rule_dropped_attempt_cancelled is unchanged. Earlier: Status DRAFT to STABLE on 2026-10-07 with the product owner's approval, which also put this module on the CONTRACT surface (1.8 MINOR bump), together with rule_dropped_attempt_cancelled. Backed by the code of 5a587bb (src/generation-worker/generation-worker-client.ts, built by src/components/workspace/create-workspace-session.ts with createBrowserGenerationWorker as the factory) and its linked tests (tests/unit/generation-worker/generation-worker-client-cancel.spec.ts), and the session runner aborts a cancelled attempt's signal (src/session/session-runner.ts). Earlier: Synced 2026-10-07 after the code landed (post-task sync, same version 0.1): two behaviours the code has were added to the logic, a signal already aborted at the call and a failed creation of the fresh worker; the mechanism is unchanged. Status stays DRAFT: owner-pending, with rule_dropped_attempt_cancelled. Earlier: Created 2026-10-07 before code (pre-code architecture capture) for rule_dropped_attempt_cancelled: the main-thread generation worker client cancels one pending request by replacing its worker. Revised the same day, before code, to serve the owner-approved failure ladder version 0.4 too (spec D203): the same cancellation stops a carry-in attempt the ladder cuts over to the standalone attempt, so rule_session_generation_failure_ladder joins its parents; the mechanism is unchanged. Status DRAFT until the code lands.
---

# Generation Worker Cancellation

## INTENT
Cancel one pending generation request on the main-thread worker client by replacing the worker running it, without losing any other pending request.

## THE RULE / LOGIC
A worker cannot stop a generation it is running, so the client cancels a request by replacing the worker. The client is built from a worker factory, not a worker, and holds one current worker at a time. A generate call may carry an abort signal. Aborting the signal of a request still pending rejects that request with a cancellation error, terminates the current worker, spawns a fresh one at once, posts to it every other still-pending request again, with its original id and in its original order, and then, only while the workspace's prewarm policy is enabled, posts a prewarm of the cancelled request's intent, so the fresh worker's rhythm-domain memo is rebuilt for the setting the session is using. Every event from a terminated worker is ignored, so a response or an error it sends after its replacement never reaches a request. A generate call whose signal is already aborted rejects at once with the cancellation error and posts nothing. If the fresh worker cannot be created, the client breaks as on a worker error, every still-pending request rejected with a transport error. Aborting a request already settled does nothing. A client broken by a worker error stays broken: no abort revives it. Disposing the client terminates its current worker. A generate call with no signal is never cancelled. The Idle flow's player requests pass no signal and are never cancelled; a background pre-generation attempt passes one, aborted by any player request at Idle.

## TECHNICAL INTERFACE
createGenerationWorkerClient in src/generation-worker/generation-worker-client.ts takes a factory returning a GenerationWorkerPort, in place of a port, together with whether the workspace's prewarm policy is enabled; the client's generate(intent, signal?: AbortSignal): Promise<GenerationOutcome> rejects an aborted pending request with the new GenerationCancelledError. The workspace composition (src/components/workspace/create-workspace-session.ts) passes createBrowserGenerationWorker as the factory, with the workspace's prewarm-policy flag.

## EXPECTATION
- Aborting a pending request rejects it with GenerationCancelledError, replaces the worker, and every other pending request still settles from the fresh worker under its original id, in its original order.
- With the prewarm policy enabled, the fresh worker receives a prewarm of the cancelled intent after the re-posted requests; with it disabled, no prewarm is posted.
- Events from a terminated worker never settle a request.
- Aborting a settled request does nothing; a broken client stays broken; dispose terminates the current worker.
- A generate call without a signal is never cancelled; the Idle flow's player requests pass none.
- A background pre-generation attempt passes a signal, and any player request at Idle aborts it.
