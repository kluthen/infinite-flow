---
id: req_settings_mutation_flag
status: DRAFT
dependents:
  - [[rule_density_mutation_steps_from_generated_density]]
  - [[rule_mutation_rerolls_unsupported_combination]]
layer: BUSINESS
version: 0.2
human_name: Settings-Mutation Flag
tags: [v2, release-v2.1, session, player-controls]
parents:
  - [[req_rolling_practice_session]]
type: REQUIREMENT
priority: 1
---

# Settings-Mutation Flag

## INTENT
Let the player opt in to the app quietly varying its own generation settings over the course of a session.

## THE RULE / LOGIC
The settings-mutation flag is an opt-in, visible on/off flag, and it starts off. When it is on, it lets an eligible setting drift by at most one grade, in either direction, every few phrases during a session. The number of phrases between two mutations, and before the first one counted from the session's start, is drawn at random from 2 to 4 from a seeded source, so a session's mutations can be replayed from its stored inputs. Eligible settings are every generation setting except instrument selection and tempo; tempo has its own, separate adaptive-tempo flag. Each mutation applies at the next phrase boundary, like any mid-session setting change, and never changes the instrument profile.

## TECHNICAL INTERFACE
A visible on/off flag controls whether the app mutates its own generation settings during a session.

## EXPECTATION
- The flag starts off.
- With the flag off, no setting changes by itself during a session.
- With it on, each mutation moves one eligible setting by at most one grade, never the instrument selection and never the tempo.
- With it on, mutations come 2 to 4 phrases apart, the first one 2 to 4 phrases after the session's start, and the same stored inputs give the same mutations.
