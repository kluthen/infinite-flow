---
id: req_browser_only_first_release
status: REVIEW
tags: [browser, delivery, first-release, v2, release-v2.0, revised-for-v2]
dependents:
  - [[req_on_device_storage]]
  - [[rule_chromium_only_support]]
  - [[rule_session_data_never_sent_or_stored]]
  - [[rule_single_local_user]]
  - [[specification_browser_only_operation_verification]]
human_name: Browser-Only First Release
type: REQUIREMENT
layer: BUSINESS
parents:
  - [[req_four_measure_phrase]]
version: 0.2
priority: 1
---

# Browser-Only First Release

## INTENT
Deliver all of the product's behavior entirely in the browser without server dependency.

## THE RULE / LOGIC
Phrase generation, notation, controls and regeneration operate client-side, and so do, from v2, practice sessions, the backing audio, MIDI controller input, the review and export. No server dependency is required for any of it: nothing is uploaded, and exports are local browser file downloads.

## TECHNICAL INTERFACE
The application runs as a client-side web application; when the player connects a MIDI controller, its input is read directly in the browser.

## EXPECTATION
The whole workflow, including sessions, MIDI input, the review and export, remains available without a server.
