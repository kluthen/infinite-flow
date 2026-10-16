# Open Questions

> **Archived 2026-10-16.** Q80, raised during v3.0's build, is closed, and v3.0 is released as
> version 3.0.0. Kept verbatim with its section heading. Q78 and Q79 were never used. Live
> summary: [README.md](README.md). Text was written from `ui_ux/`.

## v3.0 wave 2, for `spec-writer` (raised 2026-10-12)

- **Q80 — Does §4.3's outdated tab cover another tab's `Delete everything`?** **Closed
  2026-10-16 by ux D318** (spec D331: yes, every other open tab is outdated; v3.0 shows the
  newer-version wording; a visit whose database never opened is not told). Master spec §4.3
  makes a tab outdated when data written by a newer version is known. The storage design built in
  chunk 4 (`docs/storage.md`, Outdated tabs and the port's states, and Delete everything) also
  outdates every other open tab when one tab runs `Delete everything`: their connections close
  on the deletion, writes and deletions are refused, and reads find nothing. The design treats it
  as an outdated tab in every respect, with its own notice wording ("Everything this app kept on
  this device was deleted in another tab. Reload this page to start afresh; until then, nothing
  here is saved.", ux D293, `flows/saved-data/handoff.md`, Notices). Recommended: §4.3 names this
  second trigger, so the save policy (chunk 5) and done item 14 cover it; no other change.
  For the build, not the spec: the storage port reports no cause with its outdated event, so the
  save policy needs it to tell the two notices apart (ux D294); until then the newer-version
  wording shows.
