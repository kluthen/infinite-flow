---
id: rule_jam_and_lock_off_reproduce_earlier_phrases
status: DRAFT
tags: [v3, release-v3.2, generation, determinism]
dependents: []
version: 0.1
parents:
  - [[rule_seeded_phrase_reproduction]]
type: RULE
layer: BUSINESS
priority: 1
human_name: With Jam and the Lock Off, Phrases Are as Before
---

# With Jam and the Lock Off, Phrases Are as Before

## INTENT
Keep every existing phrase and replay valid when v3.2 arrives.

## THE RULE / LOGIC
With no doodle and no locked rhythm in a request, the same request and seed give the phrase v3.1 gives, note for note. With Jam off, the rhythm lock off and all six of Vary settings' allowed groups on, which are the defaults, v3.2 generates exactly what v3.1 generates. The same request and seed give the same phrase in every supported browser, on any machine; which attempt of the failure handling produced a phrase can depend on the machine's speed, what each attempt generates never does.

## TECHNICAL INTERFACE
Generation requests without the v3.2 inputs behave as in v3.1.

## EXPECTATION
- Without a doodle or a locked rhythm, a request and seed give v3.1's phrase byte for byte.
- At the defaults, v3.2 generates exactly what v3.1 does over a fixed sweep of seeds and settings.
