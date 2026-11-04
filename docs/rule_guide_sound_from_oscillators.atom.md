---
id: rule_guide_sound_from_oscillators
status: DRAFT
dependents: []
human_name: The Guides Sound From the Browser's Oscillators Only
type: RULE
version: 0.1
priority: 1
tags: [v3, release-v3.2, session, audio]
parents:
  - [[req_guide_playback]]
layer: BUSINESS
---

# The Guides Sound From the Browser's Oscillators Only

## INTENT
Keep the guide playback within the app's own synthesized sound.

## THE RULE / LOGIC
The guides are made only from the browser's own oscillators and gains: no sample, no audio file, no new library.

## TECHNICAL INTERFACE
The guides' sound is built from the browser's audio oscillators and gains alone.

## EXPECTATION
- The guide playback loads no sample and no audio file.
- The guide playback adds no library.
