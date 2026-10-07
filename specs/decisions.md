# Decisions

Status: draft v2.37

Append-only record of settled decisions. Earlier logs are archived verbatim:

- D1–D46 (first release): [archive/v1/decisions-D1-D46.md](archive/v1/decisions-D1-D46.md)
- D47–D71 (2026-09-25 persona and vision session):
  [archive/2026-09-25-personas-and-vision/decisions-D47-D71.md](archive/2026-09-25-personas-and-vision/decisions-D47-D71.md)
- D72–D108 (v2 spec consolidated: v2.0–v2.3, from the v1.0 gate close through the rolling-phrase
  spec): [archive/v2/decisions-D72-D108.md](archive/v2/decisions-D72-D108.md)
- D109–D207 (v2 design and build, through the v2.0 release gate):
  [archive/v2/decisions-D109-D207.md](archive/v2/decisions-D109-D207.md)

Archived IDs keep their meaning and may be cited anywhere. Their content is now stated as settled
fact in the live documents (see the [archive index](archive/README.md) and
[archive/v2/README.md](archive/v2/README.md)). Numbering continues from **D209**.

## Decision Log

- **D208 (2026-10-07): the v2.0 release gate is closed; v2's working record is archived.** Build
  plan chunk 21 passed on 2026-10-07. Its evidence is the table in the v2.0 release notes
  (`docs/release/v2.0-release-notes.md`): 57 rows, 48 Verified, 5 hand checks done, 4 hand checks
  that follow the tag as v2.0.x checks (the USB keyboard's two, MuseScore and a MIDI tool, a DAW;
  D193, D199) and 0 not met. ISS-009 and ISS-010 are Resolved. v2.0 is released as version 2.0.0
  in `package.json`; the tag `v2.0.0` waits for the owner's approval. The milestone's working
  record moves to [archive/v2/](archive/v2/README.md), verbatim: decisions D109–D207, the
  register's notes on closed questions, and the status snapshots of the spec index and of the v2
  README. The build plan, the master spec and the v2 README stay in place: the master spec is the
  contract for the running code, and `docs/` and `ui_ux/` link into the build plan. D117, which
  the log alone carried, is now stated in [personas.md](personas.md#who-is-not-a-target). No open
  question was decided; O47–O49, O86, O100–O103 and O107–O111 stay live.
