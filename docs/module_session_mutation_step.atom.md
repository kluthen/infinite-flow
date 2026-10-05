---
id: module_session_mutation_step
status: REVIEW
type: MODULE
version: 0.1
human_name: Session Settings Mutation Step
layer: ARCHITECTURE
priority: 1
tags: session,settings-mutation
parents:
  - [[module_settings_mutation]]
  - [[req_settings_mutation_flag]]
  - [[rule_mutation_lands_on_scheduled_phrase]]
  - [[service_session_engine]]
notes: Split out on 2026-10-05 from service_session_engine (version 0.5) during documentation debt paydown; the text is moved unchanged in meaning and keeps its DRAFT status.
dependents: []
---

# Session Settings Mutation Step

## INTENT
Schedule and decide each settings mutation of a session inside the session engine, so it lands on its scheduled phrase without ever discarding a look-ahead phrase.

## THE RULE / LOGIC
With mutation on, the engine schedules and decides every mutation itself, through the pure settings-mutation module: mutation k lands on phrase p(k), the first at 1 plus the first gap and each later one a further gap on, each gap drawn from 2 to 4 from the mutation seed and k. Mutation k is decided when phrase p(k) - 1 starts sounding, just before phrase p(k) is requested, from the settings in effect, the density the session generates with, the resolved register, and whether Sixteenth is unavailable (window below the tablet-landscape layout's width, or the step-down memory set). It becomes the settings in effect at once and is output as settings changed for phrase p(k), so no look-ahead phrase is ever discarded for a mutation. If phrase p(k) ends up a repeat, the mutation still counts as applied at p(k), and the next generated phrase uses it. With mutation off, the settings in effect change only through a settings change event.

## TECHNICAL INTERFACE
The `SessionStart` field `mutation` is `{ kind: 'off' } | { kind: 'on', seed }`; a mutation is output as `settings-changed { phraseNumber, settings, cause: 'mutation', setting, from, to }`. The mutation landing on a phrase about to be requested is in `src/session/session-mutation-step.ts`.

## EXPECTATION
With mutation on, the same start (mutation seed included) and event list give the same mutations on the same phrase numbers, each output as settings changed for its landing phrase, and no phrase is discarded for a mutation; with mutation off, the settings in effect change only through a settings change event.
