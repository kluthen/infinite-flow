---
id: rule_vary_settings_allowed_groups
status: DRAFT
dependents:
  - [[rule_vary_settings_needs_legal_move]]
  - [[rule_vary_settings_skips_dead_end]]
type: RULE
priority: 1
parents:
  - [[req_settings_mutation_flag]]
layer: BUSINESS
version: 0.1
human_name: Vary Settings' Allowed Groups
tags: [v3, release-v3.2, session, player-controls]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls within the vision since version 0.8 (2026-10-08, spec D246).
---

# Vary Settings' Allowed Groups

## INTENT
Let the player choose what Vary settings may change during a session.

## THE RULE / LOGIC
Vary settings' moves are grouped into six groups, each switched on or off as a whole: Key and mode (written key, collection); Harmony (harmonic motion); Tension (tension); Rhythm (note density, rhythmic variety, syncopation, silence density); Melody shape (contour, register, leapiness, arpeggio chaos); Figures (the figure step). All six are on by default, which is Vary settings as before. The groups are saved with the option, set at Idle or in the review, and presets neither hold nor change them. Under a preset with a key and mode restriction, the Key and mode group's moves stay inside the restriction in force at the session's start. The Rhythm group is ineligible while the rhythm lock is on.

## TECHNICAL INTERFACE
Six group switches restrict which settings Vary settings may draw.

## EXPECTATION
- Vary settings moves only settings of groups that are on and eligible.
- With all six groups on and the lock off, Vary settings moves exactly as before, for the same seed.
