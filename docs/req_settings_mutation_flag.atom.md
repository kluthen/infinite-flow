---
id: req_settings_mutation_flag
status: REVIEW
dependents:
  - [[module_session_mutation_step]]
  - [[module_session_settings_change]]
  - [[module_session_shown_settings]]
  - [[module_session_vary_settings_flag]]
  - [[module_settings_mutation]]
  - [[rule_density_mutation_steps_from_generated_density]]
  - [[rule_mutation_draws_setting_then_direction]]
  - [[rule_mutation_lands_on_scheduled_phrase]]
  - [[rule_mutation_marks_profile_customized]]
  - [[rule_mutation_profile_flip_keeps_controls]]
  - [[rule_mutation_rerolls_unsupported_combination]]
  - [[rule_mutation_reverts_at_session_end]]
  - [[rule_mutation_setting_scales]]
  - [[rule_vary_settings_allowed_groups]]
  - [[rule_vary_settings_figure_step]]
  - [[rule_vary_settings_marks_custom]]
  - [[rule_vary_settings_stays_inside_restriction]]
  - [[service_session_engine]]
  - [[service_workspace_session_runner_factory]]
layer: BUSINESS
version: 0.2
human_name: Settings-Mutation Flag
tags: [v2, release-v2.0, part-v2.1, session, player-controls, changes-in-v3.0, changes-in-v3.2]
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
