---
id: rule_jam_runs_as_session_from_phrase_one
status: DRAFT
layer: BUSINESS
version: 0.2
priority: 1
tags: [v3, release-v3.2, session, jam]
parents:
  - [[req_jam]]
dependents: []
type: RULE
human_name: From Phrase 1, a Jam Runs as Any Session
---

# From Phrase 1, a Jam Runs as Any Session

## INTENT
Give the player every session behaviour they know once the Jam's phrases begin.

## THE RULE / LOGIC
From phrase 1, a Jam runs as any session: rolling phrases, acknowledgement of the expected notes, look-ahead, the failure handling, the silence and controller rules, and Stop. Vary settings, Tension across phrases and Rising tempo are session-mode options and never run in a Jam. The doodle's notes are never expected notes, so nothing in it is acknowledged. A Jam ends as any session ends.

## TECHNICAL INTERFACE
From phrase 1 the Jam uses the session engine's ordinary behaviour.

## EXPECTATION
- From phrase 1 every session rule applies to a Jam.
- Vary settings, Tension across phrases and Rising tempo never run in a Jam.
- No doodle note is ever acknowledged.
