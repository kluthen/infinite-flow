---
id: module_generation_prewarm
status: REVIEW
layer: ARCHITECTURE
version: 0.4
human_name: Generation Prewarm
dependents: []
type: MODULE
priority: 1
tags: workspace,generation-worker,prewarm
parents:
  - [[rule_dropped_attempt_cancelled]]
  - [[service_workspace_session_flow]]
  - [[user_story_controlled_phrase_generation]]
---

# Generation Prewarm

## INTENT
Keep the one generation worker prewarmed for the current width-resolved rhythm setting, without a prewarm ever counting as a generation attempt.

## THE RULE / LOGIC
The workspace composition root takes an injectable prewarm policy, enabled in production and disableable for tests and measurements. While it is enabled, the workspace posts a prewarm to the generation worker for the current controls, with the note density the window's width gives at that moment, when the generation worker starts, again after any rhythm control changes, including a profile switch that changes a rhythm control, and again after a crossing of the window's width that changes the note density that width gives. Prewarms are deduplicated by the resolved rhythm setting: one is posted only when that setting differs from the last one posted, so a non-rhythm edit, or a crossing that leaves the resolved density unchanged, posts none. Every prewarm the workspace posts carries one fixed seed and one fixed request identity and never draws from the injected seed or request-identity providers, so the seeds and request identities generation attempts receive are the same as with prewarm disabled. A prewarm is not a generation attempt: it gets no response and changes no phrase, intent, result, operation, or error state. Idle and a running session share the one generation worker, so both benefit from it. When a cancellation replaces the generation worker, of a session's dropped attempt or of a background pre-generation attempt at Idle, the fresh worker starts with an empty memo; while the prewarm policy is enabled, the generation worker client posts it a prewarm of the cancelled attempt's intent, after the requests it posts again, so the memo is rebuilt for the setting the cancelled attempt was using, at Idle as in a session. That prewarm reuses the cancelled intent as it is and draws nothing from the providers either; with the policy disabled none is posted.


At Jam mode's Idle, Jam's view posts a prewarm of its own over the same port and under the same policy, fixed seed and fixed request identity, deduplicated by a trigger of its own: the current controls with Jam's rhythm values and Jam's tension in place of theirs, posted when Jam mode shows and again whenever what it reads changes that rhythm setting. Its rhythm values are those Jam last took from a doodle and, before any doodle in the visit, the first-visit values (Quarter, Slightly varied, Straight, Sparse), which a doodle showing no rhythm takes; until Jam's path to phrase 1 reads a doodle it always takes the first-visit values, and until Jam's own settings exist Jam's tension is Lift. The worker's memo keeps every domain it builds, so session mode's prewarm loses nothing by it; it prepares no phrase.

## TECHNICAL INTERFACE
The workspace composition root also takes an injectable prewarm policy, enabled by default in production, which tests and measurements can disable. Jam's Idle prewarm is createJamIdlePrewarm(post) in src/jam/jam-idle-prewarm.ts, run by Jam's view (src/jam/JamWorkspace.vue) with the prewarm port, or none while the policy is off; it builds its controls with doodlePrewarmControls(controls, rhythm, tension) and FIRST_VISIT_RHYTHM_VALUES, and dedupes through createRhythmPrewarmTrigger, all in src/composables/generation-session-prewarm.ts; JAM_TRANSITIONAL_TENSION is Jam's tension until Jam's settings exist.

## EXPECTATION
With the prewarm policy enabled, the generation worker's start and each change of the width-resolved rhythm setting, whether by a rhythm control change, a profile switch that changes one, or a width crossing that changes the resolved note density, post exactly one prewarm for the current width-resolved controls, and no other edit or crossing posts one; with it disabled no prewarm is posted. A prewarm never issues a generation request, changes the phrase on screen, or consumes a seed or request identity from the injected providers. With the prewarm policy enabled, a cancellation that replaces the generation worker posts exactly one prewarm, of the cancelled intent, to the fresh worker; with it disabled none. Before any doodle in the visit, Jam mode's Idle posts a prewarm of the first-visit rhythm values with Jam's tension; with the policy disabled, none.
