---
id: rule_rhythm_change_kinds
status: DRAFT
type: RULE
version: 0.2
human_name: The Five Kinds of Rhythm Change
tags: [v3, release-v3.2, session, rhythm, rhythm-lock]
dependents:
  - [[entity_rhythm_candidate_domain]]
layer: BUSINESS
priority: 1
parents:
  - [[rule_allowed_rhythm_changes]]
---

# The Five Kinds of Rhythm Change

## INTENT
Offer only small edits the ear hears and the generator can write.

## THE RULE / LOGIC
One change is one edit of an allowed kind, made in one measure, or made in measure 1 or 2 and repeated identically (the same kind, at the same place in the measure, by the same shift) in measure 3 or 4, since the app builds measures 3 and 4 as a varied copy of measures 1 and 2. Rhythms are compared by their written bars; a tie added or removed outside the edited notes makes it more than one change. The five kinds are: move the start of a note that follows another note by a sixteenth or an eighth (the note before it absorbs the difference; this also covers dotting or undotting a note; the number of notes stays); move a rest that lies between two notes by a sixteenth or an eighth, with the note after it (it keeps its length and the phrase its silence); split a note into two; merge two notes into one; and turn a note into a rest of the same length, or a rest into a note. Ties added or removed, a note and the rest beside it trading places, a moved start that changes a rest's length, and larger edits are not offered. Which changes exist depends on the rhythm settings: under Strict rhythmic variety with Straight syncopation almost none exists (only adding or removing a rest, with Eighth notes under Conversational silence and with Sixteenth notes under Sparse silence; with Quarter notes, none), and neither Strict variety nor Active displacement ever offers a split or a merge. A list that finds nothing simply leaves the lock strict.

## TECHNICAL INTERFACE
Each kind of change is a one-edit difference in bars from the locked rhythm.

## EXPECTATION
- Every rhythm change is exactly one edit of an allowed kind from the locked rhythm, in one measure or repeated in its answer measure.
- Where no change of an allowed kind exists, the phrase keeps the locked rhythm.
- A repeated change is the identical edit in measures k and k + 2; the same kind at another place or by another shift is not one change.
