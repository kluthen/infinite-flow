---
id: rule_jam_and_lock_off_reproduce_earlier_phrases
status: DRAFT
tags: [v3, release-v3.2, generation, determinism]
dependents: []
version: 0.2
parents:
  - [[rule_seeded_phrase_reproduction]]
type: RULE
layer: BUSINESS
priority: 1
human_name: Without a Steering Block or a Lock, Phrases Are as Before
---

# Without a Steering Block or a Lock, Phrases Are as Before

## INTENT
Keep every existing phrase and replay valid when v3.2 arrives.

## THE RULE / LOGIC
A request with no steering block, no rhythm lock and no allowed rhythm change gives, for the same seed, the phrase v3.1 gives, note for note. In session mode, with the rhythm lock off and all six of Vary settings' allowed groups on, which are the defaults, v3.2 generates exactly what v3.1 generates. The same request and seed give the same phrase in Chrome, on any machine; which attempt of the failure handling produced a phrase can depend on the machine's speed, what each attempt generates never does.

## TECHNICAL INTERFACE
Generation requests without the v3.2 inputs behave as in v3.1.

## EXPECTATION
- Without a steering block or a locked rhythm, a request and seed give v3.1's phrase byte for byte.
- In session mode at the defaults, v3.2 generates exactly what v3.1 does over a fixed sweep of seeds and settings.
