---
id: service_workspace_session_runner_factory
status: DRAFT
priority: 1
tags: workspace,session,generation-worker
dependents: []
type: SERVICE
version: 0.1
human_name: Workspace Session Runner Factory
parents:
  - [[req_adaptive_tempo]]
  - [[req_multi_phrase_tension_arc]]
  - [[req_settings_mutation_flag]]
  - [[service_workspace_session_flow]]
notes: Split out on 2026-10-05 from service_workspace_session_flow (version 1.6) during documentation debt paydown; the text is moved unchanged in meaning and keeps its DRAFT status.
layer: ARCHITECTURE
---

# Workspace Session Runner Factory

## INTENT
Start a practice session's runner from the workspace's session start, bound to the same generation worker and seams the Idle flow uses.

## THE RULE / LOGIC
The workspace session starts each practice session's runner bound to the same generation seam, seed and request-identity providers, and window-width seam the Idle flow uses, so a running session and the Idle flow share the app's one generation worker. A session started with the vary-settings flag on runs the engine's settings mutations from a mutation seed drawn at its start from the workspace's seed provider and kept in the session's start, so the session replays from its inputs; with the vary-settings flag off the engine gets the flag off and no seed is drawn. The mutation seed is drawn before any attempt seed. The engine's display reading, whether any of a phrase is on the staff now, is the rolling display's own answer for the held layout.

## TECHNICAL INTERFACE
The workspace session also exposes loadSessionRunner(), which loads the runner's module, as part of the session controller's chunk, and the replay-key announcer, then resolves to a synchronous starter; the session controller receives that starter as its createSessionRunner dependency. The starter takes { start, checkFit, now, display, onOutput, onError } and starts a session runner from the given session start, fit check (given the candidate's successful outcome with the intent of its attempt, and its phrase number), audio clock, display reading, and output and error sinks, the output sink wrapped so that each accepted session phrase's replay key is logged before the output is forwarded unchanged, bound to the same generation seam, seed and request-identity providers, and window-width seam the Idle flow uses, so a running session and the Idle flow share the app's one generation worker. Its session start says whether adaptive tempo runs and carries the player's tension-across-phrases choice as its multi-phrase tension arc flag (multiPhraseTensionArc) and the player's vary-settings choice (varySettings) in place of the settings-mutation flag: the workspace's runner (startWorkspaceSessionRunner in src/components/workspace/workspace-session-runner.ts, with mutationFlagFor) turns it into the flag, off, or on with a seed drawn from the workspace's seed provider before any attempt seed, and passes on the display reading and output sink its caller gives; the runner's dispatch also accepts a settings change from an automatic source other than the engine's own mutations, which no part of the app sends yet.

## EXPECTATION
A running session and the Idle flow use the app's one generation worker. A session started with the vary-settings flag on gets the engine's settings mutations from a mutation seed drawn from the workspace's seed provider before any attempt seed and kept in its start, so it replays from its inputs; with the flag off no seed is drawn.
