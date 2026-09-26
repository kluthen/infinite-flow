# Decisions

Status: draft v2.0

Append-only record of settled decisions. Earlier logs are archived verbatim:

- D1–D46 (first release): [archive/v1/decisions-v1.md](archive/v1/decisions-v1.md)
- D47–D71 (2026-09-25 persona and vision session):
  [archive/2026-09-25-decisions-D47-D71.md](archive/2026-09-25-decisions-D47-D71.md)

Archived IDs keep their meaning and may be cited anywhere. Their content is now stated as settled
fact in the live documents (see the [archive index](archive/README.md)). Numbering continues from
**D72**.

## Decision Log

_No entries yet._

- **D72 - MIDI input is read as concert pitch; no input transposition for now.** Settled 2026-09-26; resolves O33. The user believes the Travel Sax 2 sends concert pitch. From v2, played MIDI note numbers are compared as concert pitch against the concert expected notes. v1.0's instrument template gets **no** input-transposition field. The belief must be verified on the device early in v2. A controller that sends written pitch would get an optional template field then, which D57's open-data template makes easy to add.
- **D73 - Planner behavior is driven by profile capability flags, never by profile name.** Settled 2026-09-26; resolves O32. The user: "it shouldn't have checked for profile name, so a flag why not." Two checks in the pitch planner currently gate chromatic figures on `profile !== 'Jazz'`: `src/domain/pitch/validation/figure-rules.ts:168` and `src/domain/pitch/pitch-candidates.ts:172`. They become a named capability declared by the musical profile (proposed name: chromatic approach and enclosure figures allowed). Generated output must not change. This is v1.0 work, tracked as ISS-005 (filed 2026-09-26) next to ISS-003 and ISS-004, and is the first step toward character presets (endgame).
