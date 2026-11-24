---
id: rule_parts_off_by_default
status: DRAFT
dependents: []
version: 0.1
priority: 1
human_name: The Parts Are Off Until the Player Turns One On
tags: [v4, release-v4.0, session, audio, accompaniment]
type: RULE
layer: BUSINESS
parents:
  - [[req_accompaniment_parts]]
---

# The Parts Are Off Until the Player Turns One On

## INTENT
Leave a session sounding as it always did unless the player asks for more.

## THE RULE / LOGIC
Each of the four parts is off by default; the backing stays on by default. A part sounds only once the player has switched it on.

## TECHNICAL INTERFACE
Each part's switch starts off.

## EXPECTATION
- With no saved choice, all four parts are off and the backing is on.
- A session in which the player switched no part on sounds no part.
