---
id: rule_jam_and_lock_off_reproduce_earlier_phrases
status: REVIEW
tags: [v3, release-v3.2, generation, determinism, changes-in-v3.3]
dependents:
  - [[entity_request_rhythm_lock]]
  - [[entity_steering_block]]
version: 0.3
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
A request with no steering block, no rhythm lock, no allowed rhythm change and the Seventh chords level at Off gives, for the same seed, the phrase v3.1 gives, note for note. In session mode, with the rhythm lock off, all six of Vary settings' allowed groups on and the Seventh chords level at Off, which are the defaults, v3.2 generates exactly what v3.1 generates. The same request and seed give the same phrase in Chrome, on any machine; which attempt of the failure handling produced a phrase can depend on the machine's speed, what each attempt generates never does.

## TECHNICAL INTERFACE
Generation requests without the v3.2 inputs, at the Seventh chords level Off, behave as in v3.1.

## EXPECTATION
- Without a steering block or a locked rhythm, and with the Seventh chords level at Off, a request and seed give v3.1's phrase byte for byte.
- In session mode at the defaults, v3.2 generates exactly what v3.1 does over a fixed sweep of seeds and settings.
