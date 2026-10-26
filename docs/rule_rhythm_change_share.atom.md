---
id: rule_rhythm_change_share
status: DRAFT
dependents:
  - [[entity_request_rhythm_lock]]
  - [[module_rhythm_change_draw]]
  - [[module_session_rhythm_lock]]
type: RULE
layer: BUSINESS
version: 0.3
priority: 1
human_name: How Often a Phrase Changes Its Rhythm
tags: [v3, release-v3.2, session, rhythm, rhythm-lock, determinism]
parents:
  - [[rule_allowed_rhythm_changes]]
---

# How Often a Phrase Changes Its Rhythm

## INTENT
Make rhythm changes occasional, a little more frequent on tenser phrases, and reproducible.

## THE RULE / LOGIC
Each phrase from phrase 2 on draws whether it changes: 1 in 4 normally, and 1 in 2 on a tenser phrase, the one Tension across phrases generates a step above the tension in effect, which happens in session mode only, since Tension across phrases never runs in a Jam. A tension step made by Vary settings is a setting change, not a tenser phrase. These shares are starting values, tuned at the listening check. The draw is seeded by the phrase's own seed, inside generation, so a phrase generated ahead at Idle draws exactly as the session would. The change is chosen among the phrase's rhythm candidates that differ from the locked rhythm by exactly one change of an allowed kind, in seeded order, every allowed kind pooled, so a kind with more candidates comes up more often. When no candidate exists, or none of them makes a phrase, the phrase keeps the lock's order (the locked bars, or failing them a forced bend), nothing is shown, and the session history records that no change was available.

## TECHNICAL INTERFACE
The change draw and choice are computed inside generation from the phrase's seed.

## EXPECTATION
- Over a sweep, the share of changed phrases is near 1 in 4, and near 1 in 2 on tenser phrases.
- A pre-generated phrase makes the same change as the session's phrase would.
