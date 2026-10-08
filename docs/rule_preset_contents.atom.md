---
id: rule_preset_contents
status: DRAFT
layer: BUSINESS
version: 0.1
tags: [v3, release-v3.1, player-controls, presets]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.1 master spec the product owner approved on 2026-10-08. Describes intended v3.1 behaviour: nothing of it is built yet. It falls within the vision since version 0.8 (2026-10-08, spec D246).
dependents: []
type: RULE
priority: 1
human_name: What a Preset Holds
parents:
  - [[req_presets]]
---

# What a Preset Holds

## INTENT
Make a preset always give the same sound, whatever was selected before it.

## THE RULE / LOGIC
Every preset, built-in or player-made, holds all ten preset-held controls (harmonic motion, tension, note density, rhythmic variety, syncopation, silence density, contour, register, leapiness and arpeggio chaos), all seven figure levels, a key and mode restriction (any, for most presets) and a name. A preset never holds the tempo, the instrument, the player's own instrument, a key or mode value, the audio mix, the theme, the review's preferences, or the options for during a session (Vary settings, Tension across phrases, Rising tempo), which stay the player's own opt-in. A preset's note density is the chosen value: below the tablet-landscape width a preset's Sixteenth generates as Eighth, as any chosen Sixteenth does.

## TECHNICAL INTERFACE
A preset record holds ten control values, seven figure levels, a restriction and a name.

## EXPECTATION
- Every preset holds ten controls, seven levels, a restriction and a name, and no other setting.
- Choosing a preset gives the same preset-held settings whatever was selected before.
