---
id: rule_mutation_marks_profile_customized
status: STABLE
priority: 1
tags: [v2, release-v2.0, part-v2.1, session, player-controls]
parents:
  - [[req_settings_mutation_flag]]
  - [[rule_profile_control_customization]]
layer: BUSINESS
human_name: Mutating a Value the Selection Holds Marks It Customized
dependents:
  - [[module_settings_mutation]]
type: RULE
version: 0.3
---

# Mutating a Value the Selection Holds Marks It Customized

## INTENT
Keep the selection's customized mark truthful when a mutation changes a value the selected musical profile or preset holds.

## THE RULE / LOGIC
A mutation of a value the current selection holds (the selected musical profile, or from v3.1 the selected preset) marks the selection customized, exactly as a manual edit of that value does: shown as the profile's customized mark, or from v3.1 as Custom based on that preset. Which profile or preset is selected stays the same. The key and the mode are never values a selection holds, so their mutations never mark it. Like the mutation itself, the mark lasts only for the session: when the session ends, the customized marking returns to what it was before the session started.

## TECHNICAL INTERFACE
A mutation of a value the selection holds leaves the selected profile or preset as it is and marks the selection customized.

## EXPECTATION
- After a mutation of a value the selection holds, the selected profile or preset is unchanged and the selection is marked customized.
- A mutation of a setting the selection does not hold, the key and the mode included, leaves the customized mark as it was.
- After the session ends, the customized marking is what it was before the session started.
