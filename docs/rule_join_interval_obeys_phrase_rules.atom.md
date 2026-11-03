---
id: rule_join_interval_obeys_phrase_rules
status: REVIEW
priority: 1
human_name: Joins Obey In-Phrase Interval and Register Rules
tags: [v2, release-v2.0, session, phrase-join]
parents:
  - [[rule_join_carry_in_limited]]
dependents: []
type: RULE
layer: BUSINESS
version: 0.3
---

# Joins Obey In-Phrase Interval and Register Rules

## INTENT
Make a smoothed join sound like the inside of a phrase.

## THE RULE / LOGIC
At a join made with carry-in, the interval from the ending phrase's last sounding note to the next phrase's first note obeys the same interval and register rules as two consecutive notes inside a single phrase: leapiness, leap recovery, the instrument profile's active range and the resolved register window. Such a join may be impossible: a phrase ending, on no tense note, at the floor of its register window where the next phrase's own contour and leapiness leave no legal first note inside that window (a Falling, Smooth phrase ending on the window's lowest tonic-triad tone) gives the next phrase no carry-in attempt that can succeed, so the standalone phrase the failure handling falls back to follows, unjoined, as designed; the player still hears a phrase. A join made without carry-in is not smoothed: across a join into the standalone phrase generated without carry-in (the fallback used when generation with carry-in keeps failing), or into a repeated phrase (the previous phrase shown again as it was, when the deadline passes with no valid phrase), these interval and register rules do not apply.

## TECHNICAL INTERFACE
Carry-in supplies the last sounding concert pitch so the next phrase's first interval is planned against it.

## EXPECTATION
- For every join made with carry-in, across every seed and supported settings combination, the interval and register rules hold across the join exactly as they hold within a phrase.
- A phrase ending, on no tense note, where the next phrase's contour and leapiness leave no legal first note inside the carried window (a Falling, Smooth phrase on the window's lowest tonic-triad tone) is followed by the standalone fallback phrase, never by a join that breaks these rules.
- A join into the standalone fallback phrase or into a repeated phrase is not held to those rules.
