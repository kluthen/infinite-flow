---
id: module_session_struggling_notice
status: REVIEW
type: MODULE
layer: ARCHITECTURE
human_name: Session Struggling Notice
dependents: []
version: 0.1
priority: 1
tags: session,look-ahead,notice
parents:
  - [[rule_struggling_generator_notice]]
  - [[service_session_engine]]
---

# Session Struggling Notice

## INTENT
Tell the player, through the session engine's struggling notice, when the generator has fallen back to repeats twice in a row.

## THE RULE / LOGIC
Repeats are counted consecutively in decision order. The notice becomes visible when the second repeat in a row is decided, at its deadline, and stays through further repeats. A generated phrase, carry-in or standalone, resets the count, and the notice clears when that phrase starts sounding. It clears at the end.

## TECHNICAL INTERFACE
The engine outputs `struggling-notice` (visible or not); its count is `StrugglingNotice` in `src/session/struggling-notice.ts`.

## EXPECTATION
The struggling notice shows when the second consecutive repeat is decided, stays through further repeats, clears when a generated phrase starts sounding, and clears at the end.
