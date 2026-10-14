---
id: rule_outdated_tab_reads_what_it_can
status: DRAFT
dependents:
  - [[module_kept_session_codec]]
  - [[module_on_device_database]]
type: RULE
version: 0.1
human_name: An Outdated Tab Reads What It Can
parents:
  - [[rule_outdated_tab_stops_saving]]
layer: BUSINESS
priority: 1
tags: [v3, release-v3.0, storage]
notes: Synced 2026-10-13 at the v3.0 wave-2 post-task sync, same version 0.1: chunk 4's code (merge 6c138bf) implements its storage half: a record written by a newer version is read as newer and left unread (readEnvelope in src/storage/record-envelope.ts, SETTINGS_DATA_VERSION and decodeSettings in src/storage/records/settings-record.ts), and an outdated tab still reads, through a connection opened without a version (openForReading in src/storage/database.ts); links and linked tests (record-envelope.spec.ts, storage-port-outdated.spec.ts, settings-record.spec.ts) checked and right. The kept-session half (listed as saved by a newer version, does not open) waits for the kept-session list's chunk. No change of meaning; status stays DRAFT. Earlier: Created 2026-10-07 at DRAFT by the re-sync to the v3.0 master spec v1.3, approved by the product owner. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls within the vision since version 0.8 (2026-10-08, spec D246).
---

# An Outdated Tab Reads What It Can

## INTENT
Let an old open tab show what it can of the kept data without misreading what a newer version wrote.

## THE RULE / LOGIC
From v3.0, a tab running an older version of the app than the one that wrote the saved data reads what it can of that data. Records written by the newer version are left unread. A kept session saved by the newer version is listed as such in the list of kept sessions and does not open.

## TECHNICAL INTERFACE
An outdated tab reads only the records its own version understands; a kept session written by a newer version is listed, marked as such, and cannot be opened.

## EXPECTATION
- In a tab opened by an older version, records written by a newer version are not read.
- A kept session saved by a newer version appears in the list of kept sessions, marked as such, and does not open.
