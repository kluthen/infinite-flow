---
id: rule_tempo_never_affects_generation
status: DRAFT
type: RULE
priority: 1
human_name: Tempo Never Affects Generated Material
tags: [v2, release-v2.0, determinism, audio]
parents:
  - [[rule_seeded_phrase_reproduction]]
layer: BUSINESS
version: 0.1
dependents: []
---

# Tempo Never Affects Generated Material

## INTENT
Keep the tempo out of what gets generated.

## THE RULE / LOGIC
Tempo is transport only: it is never part of what is generated, so the same seed and settings always produce the same material at any tempo. The known consequence, a very fast note density becoming hard to play at a very high tempo, is accepted: the player chose both values.

## TECHNICAL INTERFACE
Tempo reaches the audio scheduling and playhead, never the generation request.

## EXPECTATION
- For every complete request and seed, the generated phrase is identical at every tempo.
- Whether adaptive tempo is on or off never changes generated material.
