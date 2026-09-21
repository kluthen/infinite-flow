---
id: rule_presentation_preference_preserves_phrase
status: DRAFT
priority: 2
dependents: []
human_name: Presentation Preference Preserves Phrase
layer: BUSINESS
version: 0.1
tags: theme,presentation,phrase-integrity
parents:
  - [[req_four_measure_phrase]]
type: RULE
---

# Presentation Preference Preserves Phrase

## INTENT
Allow theme preference changes without changing the generated musical phrase.

## THE RULE / LOGIC
The application follows the operating-system light or dark preference on first load. The player can manually choose light or dark presentation. Applying a presentation preference is not a generation request and does not alter the active phrase request or result.

## TECHNICAL INTERFACE
The presentation exposes light and dark modes and a manual override.

## EXPECTATION
The initial theme follows the operating-system preference, and a manual override changes presentation without changing the phrase request or result.
