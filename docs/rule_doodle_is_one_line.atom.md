---
id: rule_doodle_is_one_line
status: DRAFT
type: RULE
layer: BUSINESS
priority: 1
human_name: The Doodle Is One Melodic Line
dependents: []
version: 0.1
tags: [v3, release-v3.2, session, jam]
parents:
  - [[rule_doodle_quantized_to_sixteenths]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
---

# The Doodle Is One Melodic Line

## INTENT
Make a doodle played with chords or overlaps a single line the app can follow.

## THE RULE / LOGIC
A controller can send chords and overlapping notes; the doodle is one melodic line. When notes overlap, the later start ends the earlier note. When two notes snap onto the same sixteenth, the longer one stays, so a quick grace note before a held note is dropped, and on equal length the higher one stays.

## TECHNICAL INTERFACE
Quantizing reduces overlapping notes to one line.

## EXPECTATION
- The quantized doodle never holds two notes sounding at once.
- Of two notes snapping onto the same sixteenth, the longer, then the higher, is kept.
