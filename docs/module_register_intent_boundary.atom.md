---
id: module_register_intent_boundary
status: DRAFT
layer: ARCHITECTURE
human_name: Register Intent Boundary
version: 0.2
tags: register,generation-intent,type-boundary
parents:
  - [[rule_instrument_profile_range]]
  - [[service_generation_orchestration]]
dependents: []
type: MODULE
priority: 1
---

# Register Intent Boundary

## INTENT

Narrow player-facing register intent to a resolved, unambiguous register before it reaches core phrase-generation planning, so planning can never receive unresolved outer intent.

## THE RULE / LOGIC
The outer GenerationIntent's register selection uses a closed four-value vocabulary: Low, Middle, High, and Varying. The core GenerationRequest that orchestration hands to planning uses a strictly narrower closed three-value vocabulary: Low, Middle, and High only. Varying is excluded from the core request at the type level -- there is no representable value in the core request's register field that means Varying, so an unresolved outer choice cannot be constructed as a core request rather than merely being rejected by a runtime check. Every core request carries exactly three register-relevant fields, always resolved and always present together: one active concert range, one resolved register identity drawn from the narrower three-value vocabulary, and one resolved inclusive register window contained within the active range. A carry-in, when present, also holds a register window, but it is not a fourth register field: it must equal the resolved window, and a core request whose carried window differs cannot be constructed. Phrase and register planners consume only the resolved range and window as register inputs; they never read profile identity and never branch on which instrument profile produced the resolved values. Notation theme and other presentation or session state are excluded from both the outer intent and the core request, with one exception: the carry-in a session phrase hands forward to the phrase generated after it (its last sounding pitch with its leap state, its resolved register window, its final chord with its role and endpoint class, and its ordinal in the session), which both may hold. So a presentation-only change can never alter the active range, the resolved window, or the source events planning produces.

## TECHNICAL INTERFACE

Orchestration accepts an outer GenerationIntent whose register field is one of Low, Middle, High, or Varying, and resolves it into a core GenerationRequest whose register field is typed to admit only Low, Middle, or High, alongside the resolved active range and resolved inclusive window. Planners accept only the resolved GenerationRequest fields as input and expose no parameter for profile identity or notation theme.

## EXPECTATION

A core GenerationRequest can never be constructed with an unresolved (Varying) register value -- the type system rejects it, not a runtime validator. Every core request that reaches a planner carries one active range, one resolved register identity in {Low, Middle, High}, and one resolved window contained in that range. No planner branches on instrument-profile identity, and no presentation-only change can alter a planner's active range, resolved window, or produced source events.
