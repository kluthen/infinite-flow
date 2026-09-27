# Decisions

Status: draft v2.1

Append-only record of settled decisions. Earlier logs are archived verbatim:

- D1–D46 (first release): [archive/v1/decisions-D1-D46.md](archive/v1/decisions-D1-D46.md)
- D47–D71 (2026-09-25 persona and vision session):
  [archive/2026-09-25-personas-and-vision/decisions-D47-D71.md](archive/2026-09-25-personas-and-vision/decisions-D47-D71.md)
- D72–D108 (v2 spec consolidated: v2.0–v2.3, from the v1.0 gate close through the rolling-phrase
  spec): [archive/v2/decisions-D72-D108.md](archive/v2/decisions-D72-D108.md)

Archived IDs keep their meaning and may be cited anywhere. Their content is now stated as settled
fact in the live documents (see the [archive index](archive/README.md) and
[archive/v2/README.md](archive/v2/README.md)). Numbering continues from **D109**.

## Decision Log

- **D109 (2026-09-27): a failure-ladder repeat phrase (master-spec §4) is never visibly marked in
  the review.** Raised by `ux-writer` while starting v2 design (their Q18): does the review flag a
  phrase that the failure ladder repeated, or stay silent? Decided: stays silent in the review UI.
  It is still recorded internally (session history and export data already carry the repeat, per
  §7), but the review shows it identically to any other phrase. This matches the product's
  encouraging tone — a repeat is a generator implementation detail, not a flaw worth surfacing to
  the player.
- **D110 (2026-09-27): the v2.2 multi-phrase tension arc (master-spec §3) is a player-facing
  opt-in, not an invisible generation behavior.** Raised by `ux-writer` (their Q21): unlike the
  existing single-phrase tension arc (which has no toggle and never has), the longer multi-phrase
  arc gets its own visible on/off control, on the same footing as the settings-mutation flag and
  adaptive tempo. `ux-writer` owns the control's placement, copy and any further presentation
  detail; this decision only settles that a control must exist at all.
