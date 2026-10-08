---
id: rule_key_and_mode_restriction
status: DRAFT
layer: BUSINESS
priority: 1
human_name: A Preset's Key and Mode Restriction
type: RULE
version: 0.1
tags: [v3, release-v3.1, player-controls, presets]
parents:
  - [[req_presets]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.1 master spec the product owner approved on 2026-10-08. Describes intended v3.1 behaviour: nothing of it is built yet. It falls within the vision since version 0.8 (2026-10-08, spec D246).
dependents:
  - [[rule_choosing_preset_keeps_allowed_key_and_mode]]
  - [[rule_restriction_in_force]]
  - [[rule_saving_preset_asks_its_restriction]]
---

# A Preset's Key and Mode Restriction

## INTENT
Let a preset say which keys and modes it is meant for, in a form the key and mode controls can show.

## THE RULE / LOGIC
A restriction has two halves, each either any or an ordered list: the keys, written keys (the home note as read on the page), and the modes, Collection values (Major, Minor, and the seven modes Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian and Locrian). The allowed key-and-mode pairs are every allowed key with every allowed mode. Major and Ionian are different entries, and so are Minor and Aeolian: each pair has the same notes but not the same chord plan (Major and Minor follow the tonal plan, the modes the modal plan), so a restriction to Major does not allow Ionian. A list is ordered, and its first entry is the preset's main sound. The keys half is in written pitch, so switching instrument keeps the written key and never leaves a restriction. In v3.1 no built-in preset restricts keys, and the player cannot build lists of their own beyond the choices offered when saving.

## TECHNICAL INTERFACE
A restriction is two halves, keys and modes, each any or an ordered list.

## EXPECTATION
- A restriction allows exactly the pairs formed by its allowed keys and its allowed modes.
- A restriction to Major never allows Ionian, nor one to Minor Aeolian, and the reverse.
- Switching instrument never takes the key outside a restriction.
