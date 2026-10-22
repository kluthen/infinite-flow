---
id: rule_jam_phrase_one_failure_ladder
status: DRAFT
type: RULE
layer: BUSINESS
human_name: A Jam's Phrase 1 Has Its Own Failure Ladder
parents:
  - [[rule_jam_phrase_one_deadline]]
version: 0.2
priority: 1
tags: [v3, release-v3.2, session, jam, error-handling]
dependents:
  - [[module_session_seed_plan]]
  - [[rule_jam_ends_when_phrase_one_never_comes]]
---

# A Jam's Phrase 1 Has Its Own Failure Ladder

## INTENT
Make phrase 1 almost always arrive, keeping the doodle's influence while time allows.

## THE RULE / LOGIC
Phrase 1 of a Jam is tried in three rungs, all under the controls read from the doodle: first with the doodle's join and the steering block, with the usual join retries, each with a fresh seed and skipped after a search that covered every candidate; then once with the steering block and no join; then as a plain standalone phrase with no steering block. The time the standalone attempt needs is kept before the deadline for the last rung, which is the attempt that time was measured on: once less is left, no attempt of the first two rungs starts, the one running is cancelled, and the last rung is requested at once. A phrase repeat is impossible, since there is no phrase before phrase 1.

## TECHNICAL INTERFACE
Phrase 1's attempts run in three rungs, keeping the standalone reserve for the last.

## EXPECTATION
- Phrase 1's attempts run in the order: with the join and the steering block, with the steering block only, with neither, always under the controls read from the doodle.
- Once the time left falls below the standalone reserve, the attempt without the steering block is requested at once.
