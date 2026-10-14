---
id: rule_jam_runs_as_session_from_phrase_one
status: DRAFT
layer: BUSINESS
version: 0.1
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
From phrase 1, a Jam runs as any session: rolling phrases, acknowledgement of the expected notes, look-ahead, the failure handling, Vary settings, Tension across phrases, Rising tempo, the silence and controller rules, and Stop. Vary settings, Tension across phrases and Rising tempo count from phrase 1, and Rising tempo starts from the tempo the doodle was played at. The doodle's notes are never expected notes, so nothing in it is acknowledged. A Jam ends as any session ends.

## TECHNICAL INTERFACE
From phrase 1 the Jam uses the session engine's ordinary behaviour.

## EXPECTATION
- From phrase 1 every session rule applies to a Jam.
- No doodle note is ever acknowledged.
