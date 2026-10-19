---
id: module_stored_profile_to_levels
status: DRAFT
human_name: A Stored Musical Profile Read as Figure Levels
tags: [v3, release-v3.1, storage, review, figures]
parents:
  - [[module_figure_levels]]
  - [[rule_earlier_kept_sessions_carried_over]]
dependents:
  - [[module_kept_session_upgrade_step]]
layer: ARCHITECTURE
version: 0.2
priority: 1
type: MODULE
---

# A Stored Musical Profile Read as Figure Levels

## INTENT
Read the musical profile a v3.0 kept phrase recorded as the figure levels it stands for, in one place, so a phrase holds the same levels whether it is read before the storage upgrade or after it.

## THE RULE / LOGIC
A phrase kept by v3.0 holds in its reproduction inputs a musical profile selection (Neutral or Jazz, and whether it was customized) and no figure levels. One mapping function turns such a stored selection into levels: that profile's levels through the figures module's levelsForProfile, Neutral's or Jazz's, whatever its customized mark, since being customized never changed the figures. So storage, the replay key and the request builder map a profile the same way. It is storage's only mapping from a stored profile to levels: the kept-session codec reads a v3.0 phrase's profile through it, and the upgrade step that carries v3.0's kept sessions over to the levels reuses it, so carrying a session over at the upgrade or reading it before then gives the same levels. A stored selection that is not exactly a known profile and a customized flag is an invalid stored value, refused, never defaulted. The function is pure: it reads no database.

## TECHNICAL INTERFACE
src/storage/records/profile-to-levels.ts exports parseStoredProfileSelection(value, context), which reads a stored musical profile selection, exactly a known profile and a boolean customized flag, and refuses anything else as a KeptRecordError naming the context, and storedProfileLevels(selection), the figure levels (FigureLevels, src/domain/figures/figure-levels.ts) that selection stands for, through levelsForProfile. The kept-session codec's phrase parsers (src/storage/records/kept-phrase-parsers.ts) call both: parseKeptIntent reads a data version 1 phrase's levels from whichever shape it holds (the levels only; a profile only, mapped here; or both, where the stored levels must equal the profile's mapped levels, else the record is unreadable), and parseKeptProfileSelection, which reads the session-wide record's profile, is parseStoredProfileSelection. No other storage file calls levelsForProfile. The kept-session upgrade step of the on-device database, which reuses them, is not built yet.

## EXPECTATION
- A stored Neutral selection, customized or not, gives Neutral's levels; a stored Jazz selection, customized or not, gives Jazz's.
- A v3.0-shaped kept phrase read before the upgrade and the same phrase carried over by it hold the same levels.
- A stored selection naming an unknown profile, or with a missing or extra field, is refused as an invalid stored value.
