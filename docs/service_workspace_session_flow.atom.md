---
id: service_workspace_session_flow
status: DRAFT
layer: ARCHITECTURE
version: 0.1
parents:
  - [[rule_ephemeral_session_state]]
  - [[rule_presentation_preference_preserves_phrase]]
  - [[user_story_controlled_phrase_generation]]
human_name: Workspace Session Flow
priority: 1
tags: workspace,session-state,operation-flow
dependents: []
type: SERVICE
---

# Workspace Session Flow

## INTENT
Coordinate the active phrase workspace as root-created in-memory session state.

## THE RULE / LOGIC
A root-created workspace session owns the selected controls, current phrase data, presentation preference, operation state, and retryable errors in memory for the active browser session. It permits at most one active generation or notation operation. An explicit generation action begins a generation operation; during it, phrase actions are disabled and configuration values remain visible but read-only. A prior valid phrase remains visible through regeneration, and a failed initial generation retains the empty workspace while a failed later generation retains the prior phrase. Presentation changes remain outside generation and notation operations. The session does not persist or restore user or session state through browser storage or user-state caches.

## TECHNICAL INTERFACE
The root workspace consumes explicit generation and notation outcomes and exposes readonly session state with explicit generate, regenerate, retry-generation, retry-notation, and presentation actions.

## EXPECTATION
The workspace never overlaps generation and notation operations, never changes configuration values while generation is active, and retains the appropriate prior phrase or empty state on failure. Reloading or a later browser session does not restore its user or session state.
