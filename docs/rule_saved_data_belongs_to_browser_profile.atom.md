---
id: rule_saved_data_belongs_to_browser_profile
status: REVIEW
parents:
  - [[req_on_device_storage]]
  - [[rule_single_local_user]]
dependents:
  - [[module_on_device_database]]
type: RULE
layer: BUSINESS
human_name: Kept Data Belongs to One Browser Profile and Address
tags: [v3, release-v3.0, storage, privacy]
version: 0.1
priority: 1
---

# Kept Data Belongs to One Browser Profile and Address

## INTENT
State plainly whose data the app keeps, and where it is visible.

## THE RULE / LOGIC
There are still no accounts, roles or sharing. From v3.0, what the app keeps belongs to one browser profile on one device, at one site address (scheme, host and port): anyone who opens the app in that browser profile sees the kept sessions, favorites, comments and, when the player opted in, played notes. Data kept at one address never appears at another, so data kept while using a development server never appears on the deployed site, and the reverse. Delete everything is the player's control over what stays.

## TECHNICAL INTERFACE
Kept data is scoped to the browser profile and the site's origin; no sign-in separates players.

## EXPECTATION
- Data kept at one address is not visible at another.
- Whoever opens the app in the same browser profile on the same device sees the same kept data.
