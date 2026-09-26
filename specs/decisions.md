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
- **D74 - ISS-004 feasibility review adopted: `Strict` is by nominal value, dominance is nominal attack share of q, and the blocked set is per-variety.** Settled 2026-09-26; adopts the recommended readings for R1 and R2 in `specs/versions/v1/iss004-feasibility-review.md`, resolving the review's two open stops. **R1 (`Strict`):** `Strict` applies to each attack's nominal value (its value before syncopation displacement); rendered values that syncopation displacement produces, plus the rests and ties from silence density and syncopation, are exempt. No new blocked setting follows from this reading. **R2 (dominance):** dominance is measured as the selected density value's nominal share of attacks per phrase, with a floor of 1.0 under `Strict`, 0.75 under `Slightly varied`, and 0.5 under `Heavily varied`; at the `Heavily varied` floor, a 50% tie is allowed only when the tied value is shorter than the selected density. **Rare values:** the review's value sets (§1) are kept as written, including Eighth `Slightly varied`'s rare `[3n,1n]` cell — no simplification. The review's value sets per density × level (§1), the per-variety blocked set (Strict = today's six, Slightly varied = four, Heavily varied = none; §4), rhythmic variety as a hard filter in the tie-break priority's budgets tier (§5), and the latency finding (§6: the whole-catalog budget holds; Sixteenth × `Heavily varied` has a cold p90 of about 950 ms, a reduced worst-case headroom against the 2 s stop condition, noted for implementation) are all adopted. Goldens change for every density, including Quarter `Slightly varied`, because although the candidate set there equals v1, the rhythm identity now includes variety and a bumped grammar version. Master spec updated at lines 44-45, 60, 114, and 149 (`specs/first-release-master-spec.md`, draft v2.1); gate report §4.2 acceptance line corrected to match (`specs/versions/v1/gate-execution-report.md`).
