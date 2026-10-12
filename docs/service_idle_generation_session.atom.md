---
id: service_idle_generation_session
status: REVIEW
type: SERVICE
layer: ARCHITECTURE
human_name: Idle Generation Session
tags: workspace,idle,generation,operation-flow
parents:
  - [[module_generation_request_construction]]
  - [[rule_ephemeral_session_state]]
  - [[rule_presentation_preference_preserves_phrase]]
  - [[service_workspace_session_flow]]
  - [[user_story_controlled_phrase_generation]]
version: 0.2
priority: 1
notes: v3.0 change pending (2026-10-12, pre-code architecture capture for build plan chunk 24): the Idle flow's generate seam calls the Idle background slot's yieldToPlayer before posting each player request at Idle, aborting a background pre-generation attempt in flight (module_idle_pregeneration_queue). A background attempt is not an operation: at most one operation runs at a time does not take it in, it locks no edit, and Start never waits for it. Text and status unchanged on purpose: it still describes the running code. Revise it at chunk 24's post-task sync (the drift check change set part D lists). Earlier: Revised 2026-10-12 at the v3.0 wave-1 post-task sync (previous version 0.1) for build plan chunk 23's session seed plan (module_session_seed_plan, merge aee776c): each phrase a fit run publishes now comes with one session seed, drawn from its own injected provider apart from the phrase seeds' provider, once per publishing run, and carried in the Idle result. Status unchanged; no status advanced. Earlier: Split out on 2026-10-05 from service_workspace_session_flow (version 1.6) during documentation debt paydown; the text is moved unchanged in meaning and keeps its DRAFT status.
dependents: []
---

# Idle Generation Session

## INTENT
Coordinate the active phrase workspace at Idle as root-created, readonly in-memory session state: its controls, its generation and notation outcomes, and the actions that change them.

## THE RULE / LOGIC
A root-created Vue composable owns pending controls, current generation intent and result, presentation state kept separate from generation state, operation state, the "staff needs more room" notice state, and retryable error state for the active browser session. It exposes explicit control, profile, theme, notation, Generate, Regenerate, retry-generation, and retry-notation actions. Outside the room notice, ordinary control, musical-profile, theme, and notation edits never generate; an instrument-profile switch while a phrase is shown regenerates it. Under the room notice, an edit to a setting the phrase is generated from (tempo, the audio mix, the theme and notation edits excluded) reacts to it as the Idle fit round defines: under the too-many-notes cause it starts a retry round, an instrument-profile switch included; under the no-room cause it runs the phrase-independent room check, which can clear the notice into a new phrase, while an instrument-profile switch only changes the selection. Generate and Regenerate coordinate injected seed, request-identity, generation-outcome, fit-check, room-check, and notation-outcome seams; Regenerate retains pending controls and requests a new seed.

Every Idle generation -- Generate, Regenerate, Retry-generation, the regeneration an instrument-profile switch runs, and the runs the room notice and a phrase left too wide start by themselves -- is one fit run: one operation that may span several generation attempts, the first plus up to three fresh-seed retries, each with its own fresh seed and request identity, checked against the staff's room before anything is drawn. Each phrase a fit run publishes comes with one session seed, drawn from its own injected session-seed provider, apart from the phrase seeds' provider, once per publishing run however many attempts it made; the Idle result carries it, and a session started from that phrase 1 derives every later seed from it. A staff layout failure (no room for the staff, or notes too wide for it) is never a retryable notation error: it goes to the room notice, to a replacement run, or, under a blocked rhythm-settings combination, to no phrase; only other notation failures are retryable notation errors.

At most one operation runs at a time, a fit run counting as one operation however many attempts it makes. During an operation consumers can read but cannot mutate the exposed state. The composable coordinates outcomes without implementing Step 5 through Step 9 planners, engraving, or components, and never persists or restores user or session state.

The composable also listens to the staff's layout reports: at Idle, a change of the staff's layout inputs can clear the room notice into a new phrase, start a retry round under it, give the notice its no-room cause, have a phrase on screen that no longer fits replaced by a new one, or give way to no phrase under a blocked combination. The composable stops listening for crossings and for layout reports when the workspace is torn down.

## TECHNICAL INTERFACE
The root creates the composable with injected seed, session-seed (`nextSessionSeed`, with `withSessionSeed` joining a published phrase to its session seed), request-identity, window-width, generation, and notation outcome seams, plus a fit check (does a generated phrase fit the staff's current layout inputs, drawing nothing), a room check (does the staff have room at all with a given key signature), the staff's layout-input reports, and a required seam that drops whatever the notation seam presents. Consumers receive readonly pending-control, note-density context (where the window stands against the tablet-landscape layout's width, and whether the density has stepped down, always false at Idle), intent/result (the workspace result carrying its session seed, `WorkspaceSessionResult.sessionSeed`), presentation, operation, and error state, the room notice's cause (no room, notes too wide, or none), whether retries are running, and a room-notice announcement count, plus explicit actions (among them startFreshPhrase, the fresh run a session end asks for) and a teardown that stops listening for window-width crossings and layout reports; no storage API is part of the interface.

## EXPECTATION
Consumers cannot mutate workspace state directly. Outside the room notice, ordinary edits produce no generation request; under it, only an edit to a setting the phrase is generated from can start a run, as the Idle fit round defines. Generate and Regenerate each start one fit run through injected seams, one operation of up to four attempts issued one intent at a time. A regenerate operation preserves controls and uses a renewed seed. A staff layout failure never shows the retryable notation error. Reloading or a later browser session restores no controls, intent, result, presentation preference, operation state, room notice, or error. The room notice's cause, whether retries are running and the announcement count are readonly.
