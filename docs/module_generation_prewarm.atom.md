---
id: module_generation_prewarm
status: REVIEW
layer: ARCHITECTURE
version: 0.2
human_name: Generation Prewarm
dependents: []
type: MODULE
priority: 1
tags: workspace,generation-worker,prewarm
parents:
  - [[rule_dropped_attempt_cancelled]]
  - [[service_workspace_session_flow]]
  - [[user_story_controlled_phrase_generation]]
notes: Synced 2026-10-07 after the code landed (post-task sync): the code matches the revised text; status DRAFT to REVIEW, its status before the revision, now that the code and its linked tests have landed. Earlier: Revised 2026-10-07 before code (previous version 0.1, pre-code architecture capture) for rule_dropped_attempt_cancelled: with the prewarm policy enabled, a worker replaced by a cancellation is re-warmed with a prewarm of the cancelled intent. Status REVIEW to DRAFT until the code lands. Earlier: Split out on 2026-10-05 from service_workspace_session_flow (version 1.6) during documentation debt paydown; the text is moved unchanged in meaning and keeps its DRAFT status.
---

# Generation Prewarm

## INTENT
Keep the one generation worker prewarmed for the current width-resolved rhythm setting, without a prewarm ever counting as a generation attempt.

## THE RULE / LOGIC
The workspace composition root takes an injectable prewarm policy, enabled in production and disableable for tests and measurements. While it is enabled, the workspace posts a prewarm to the generation worker for the current controls, with the note density the window's width gives at that moment, when the generation worker starts, again after any rhythm control changes, including a profile switch that changes a rhythm control, and again after a crossing of the window's width that changes the note density that width gives. Prewarms are deduplicated by the resolved rhythm setting: one is posted only when that setting differs from the last one posted, so a non-rhythm edit, or a crossing that leaves the resolved density unchanged, posts none. Every prewarm the workspace posts carries one fixed seed and one fixed request identity and never draws from the injected seed or request-identity providers, so the seeds and request identities generation attempts receive are the same as with prewarm disabled. A prewarm is not a generation attempt: it gets no response and changes no phrase, intent, result, operation, or error state. Idle and a running session share the one generation worker, so both benefit from it. When a session's cancellation replaces the generation worker, the fresh worker starts with an empty memo; while the prewarm policy is enabled, the generation worker client posts it a prewarm of the cancelled attempt's intent, after the requests it posts again, so the memo is rebuilt for the setting the session is using. That prewarm reuses the cancelled intent as it is and draws nothing from the providers either; with the policy disabled none is posted.

## TECHNICAL INTERFACE
The workspace composition root also takes an injectable prewarm policy, enabled by default in production, which tests and measurements can disable.

## EXPECTATION
With the prewarm policy enabled, the generation worker's start and each change of the width-resolved rhythm setting, whether by a rhythm control change, a profile switch that changes one, or a width crossing that changes the resolved note density, post exactly one prewarm for the current width-resolved controls, and no other edit or crossing posts one; with it disabled no prewarm is posted. A prewarm never issues a generation request, changes the phrase on screen, or consumes a seed or request identity from the injected providers. With the prewarm policy enabled, a cancellation that replaces the generation worker posts exactly one prewarm, of the cancelled intent, to the fresh worker; with it disabled none.
