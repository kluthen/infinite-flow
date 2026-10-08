---
id: rule_jam_phrase_one_failure_ladder
status: DRAFT
type: RULE
layer: BUSINESS
human_name: A Jam's Phrase 1 Has Its Own Failure Ladder
parents:
  - [[rule_jam_phrase_one_deadline]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
version: 0.1
priority: 1
tags: [v3, release-v3.2, session, jam, error-handling]
dependents:
  - [[rule_jam_ends_when_phrase_one_never_comes]]
---

# A Jam's Phrase 1 Has Its Own Failure Ladder

## INTENT
Make phrase 1 almost always arrive, keeping the doodle's influence while time allows.

## THE RULE / LOGIC
Phrase 1 of a Jam is tried in three rungs: first with the doodle's join and its preferences, with the usual join retries, each with a fresh seed and skipped after a search that covered every candidate; then once with the doodle's preferences and no join; then as a plain standalone phrase with no doodle at all. The time the standalone attempt needs is kept before the deadline for the last rung, which is the attempt that time was measured on: once less is left, no attempt of the first two rungs starts, the one running is cancelled, and the last rung is requested at once. A phrase repeat is impossible, since there is no phrase before phrase 1.

## TECHNICAL INTERFACE
Phrase 1's attempts run in three rungs, keeping the standalone reserve for the last.

## EXPECTATION
- Phrase 1's attempts run in the order: with the join and preferences, with the preferences only, without the doodle.
- Once the time left falls below the standalone reserve, the doodle-free attempt is requested at once.
