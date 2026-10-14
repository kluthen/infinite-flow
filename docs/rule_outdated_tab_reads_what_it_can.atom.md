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
