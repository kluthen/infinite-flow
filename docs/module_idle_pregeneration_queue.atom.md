---
id: module_idle_pregeneration_queue
status: DRAFT
notes: Revised 2026-10-13 to version 0.2 (previous version 0.1) before code, by the pre-code architecture capture for v3.0 build plan v9 chunk 24b (ISS-011), on the product owner rulings recorded as spec D297 (master spec Part A v1.12, sections 8 and 16); stays DRAFT. The queue keeps running on a stale phrase 1 and while the stale-phrase prompt shows, building the phrases Use it plays; Use it takes them as Start does; the quiet stop on CarryInError goes, a carry-in error being a programming error again; what discards the queue is unchanged. Pending implementation: chunk 24b-1; the merged chunk 24 code (src/components/workspace/workspace-pregeneration.ts, guarded and standDown) still stops quietly on a CarryInError. Earlier: Created 2026-10-12 at DRAFT by the pre-code architecture capture for v3.0 build plan chunk 24, from master spec section 8, spec D290 and the design the coding leader settled. Its pure plan is module_session_pregeneration_plan and the session engine take is module_session_ready_phrases. Describes intended v3.0 behaviour: no code implements it yet.
layer: ARCHITECTURE
priority: 1
parents:
  - [[module_generation_worker_cancellation]]
  - [[module_session_pregeneration_plan]]
  - [[req_idle_pregeneration]]
  - [[rule_pregeneration_discarded_on_change]]
  - [[rule_pregeneration_yields_to_player]]
  - [[rule_stale_phrase_prompt_at_start]]
  - [[rule_start_never_waits_for_pregeneration]]
version: 0.2
type: MODULE
tags: [v3, release-v3.0, idle, generation, generation-worker, workspace]
dependents: []
human_name: Idle Pre-Generation Queue
---

# Idle Pre-Generation Queue

## INTENT
Run pre-generation at Idle as a background queue on the one generation worker that always gives way to the player, keeps its ready phrases in memory only, and hands them to Start.

## THE RULE / LOGIC
Parts. Around the pure plan ([[module_session_pregeneration_plan]]), the queue has two parts: a workspace orchestrator, loaded lazily in the session controller's chunk, which runs the plan's attempts on the generation worker client, checks each successful attempt's fit, holds the ready phrases (at most four, phrases 2 to 5) in memory and hands them to Start; and an Idle background slot, a tiny part of the entry chunk, through which the Idle flow yields to the player. An injectable pre-generation policy, enabled in production and switched off from the page URL for measurements, turns the whole queue off.

Abort signals. Only background attempts carry an abort signal: one abort controller per attempt, owned by the orchestrator. The Idle flow's player requests (Generate, Regenerate, retry, the regeneration of a profile or instrument switch, the room notice's and the replacement runs, the fresh phrase 1 after a session) still pass none and are never cancelled. The Idle flow's generate seam calls the background slot's yield to the player synchronously before posting every player request at Idle, which aborts the background attempt in flight, if any, so the worker client's existing cancellation replaces the worker and the player's request never waits behind it ([[module_generation_worker_cancellation]], its mechanism unchanged). The orchestrator also aborts the attempt in flight at Start's take, at a discard, when the run conditions stop holding, and at teardown. A cancelled background attempt is prewarmed exactly as the client prewarms any cancellation: with the prewarm policy enabled, the fresh worker receives a prewarm of the cancelled intent after the re-posted requests. The worker builds a prewarm in budgeted slices between messages and answers a generate request as soon as it arrives, so that prewarm delays the player by at most about one slice; and without a Vary settings landing the cancelled intent's rhythm setting is phrase 1's own, the one both the player's next request and the restarted pre-generation use.

Not an operation, not a prewarm. A background attempt is not an operation of the Idle generation session: it sets no operation state, locks no edit, and is never "a new phrase being generated" for Start, so the start facts' generation-running fact never counts it. Nor is it a prewarm: it uses the plan's seeds and real request ids, never the prewarm's fixed seed and request id. Pre-generation starts only after the workspace has posted its prewarm, which it does when the generation session is created, on the same worker.

When it runs. Only while the policy is enabled and every session start condition holds, that is while the controller's start blocker is none: no session running, no review showing, phrase 1 drawn, no Idle operation running, no notation error, no generation failure reported, rhythm settings that allow generation, the staff shown and no room notice. When they stop holding, the attempt in flight is aborted and the ready phrases are kept; when they hold again, pre-generation resumes after the last ready phrase. So nothing runs while a review shows, and it stops and resumes around one. A stale phrase 1 is no reason to stop: the stale-phrase prompt is not a start condition, so the queue keeps running while phrase 1 is stale and while the prompt shows, building, through the plan, exactly the phrases the session plays if the player uses that phrase 1. The queue has no quiet stop: an error met while the plan is built or stepped, a carry-in error included, is a programming error, handled as any other. Nothing is ever saved: the queue lives in memory only and is gone on reload.

Discards. The queue belongs to one key: phrase 1 (its Idle result, and so its session seed), the generation controls except tempo, the musical-profile selection, the instrument included, Vary settings and Tension across phrases. The orchestrator watches that key reactively rather than being called from each Idle action. Any change of it (a control, the profile, the instrument, a regeneration or any other new phrase 1, either session option) aborts the attempt in flight, empties the queue and starts again from the new phrase 1. Tempo and Rising tempo are not in the key and discard nothing. What discards is the same with a stale phrase 1: the key still holds phrase 1 and the current settings, so any change of a setting phrases are generated from discards the queue, and the prompt's Regenerate discards it by replacing phrase 1; showing, answering or dismissing the prompt discards nothing by itself.

Window changes. On every staff layout report at Idle, received through a passive observer on the idle layout gate's port, the gate being otherwise unchanged, and on every crossing of the tablet-landscape layout's width, the orchestrator re-checks the ready phrases in order: it re-derives each one's intent with the window read now (the density step-down) and re-checks its fit against the layout a session would hold now, the held layout from the window's shape at that moment and the staff's latest layout inputs, through the same staff fit planner and the same held-layout fit function the session's display fit uses, shared rather than duplicated. The first ready phrase whose intent no longer matches, or that no longer fits, is discarded with every phrase after it, and pre-generation resumes from there.

Start. Start takes the queue from the orchestrator: the take aborts the attempt in flight, re-checks the ready phrases' fit synchronously against the start's held layout, drops from the first that does not fit, and passes the rest to the session runner in the session start, where the session engine spends each one whose intent it re-derives identically, in place of requesting it. The stale-phrase prompt's Use it takes the queue exactly as Start does. Start never waits for a background attempt. The take does not empty the queue, so a count-in that ends back at Idle on the same phrase 1 reuses it; topping it up resumes only at Idle, and nothing is topped up during a session.

## TECHNICAL INTERFACE
`src/components/workspace/workspace-pregeneration.ts` (new), the orchestrator, in the session controller's chunk; `src/composables/generation-session-pregeneration.ts` (new), the Idle background slot in the entry chunk, whose `yieldToPlayer()` the Idle flow's generate seam calls before each player request it posts at Idle. The pre-generation policy, `enabled` in production, is injectable at the workspace composition, with its page-URL switch `?pregeneration=off` beside the prewarm switch in `src/components/workspace/prewarm-policy.ts`; the e2e workspace harness defaults it to off and its pre-generation spec turns it on. Background attempts pass their signal to `generate(intent, signal)` of the client in `src/generation-worker/generation-worker-client.ts`. The run conditions are the controller's start blocker (`sessionStartBlocker`, `src/session/session-start-conditions.ts`); the held layout comes from `sessionLayoutAtStart` (`src/session/session-window.ts`). Start (`src/components/workspace/workspace-session-start.ts`, then `workspace-session-begin.ts`) takes the queue and passes it as `SessionStart.readyPhrases`.

## EXPECTATION
- With the policy enabled and every start condition holding at Idle, up to four phrases following phrase 1 are generated one after another in the background, after the prewarm, on the same worker; with the policy off, none is.
- A player request at Idle while a background attempt runs aborts that attempt first and is answered as fast as with pre-generation off; a player request is never cancelled.
- A background attempt sets no operation state, locks no edit and never blocks Start; Start pressed while one runs starts at once.
- A change of a control, the profile, the instrument, either session option or phrase 1 empties the queue; a change of tempo or Rising tempo keeps it.
- A window change that changes the density or the held layout discards from the first ready phrase that no longer matches or fits, and pre-generation resumes from there.
- Nothing runs while a review shows or any start condition fails; the ready phrases are kept and pre-generation resumes after the last one.
- Nothing is written to storage; the queue is gone on reload.
- With a stale phrase 1, pre-generation keeps running, the prompt showing or not, and Use it takes the ready phrases as Start does; no carry-in error stops it quietly.
- A stale phrase 1 changes nothing in what discards the queue: a settings change or Regenerate empties it; the prompt alone does not.
