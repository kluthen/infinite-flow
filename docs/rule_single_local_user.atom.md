---
id: rule_single_local_user
status: DRAFT
parents:
  - [[req_browser_only_first_release]]
priority: 1
human_name: One Local User, No Access Model
dependents:
  - [[rule_saved_data_belongs_to_browser_profile]]
type: RULE
layer: BUSINESS
version: 0.2
tags: [v2, release-v2.0, privacy, browser]
---

# One Local User, No Access Model

## INTENT
Keep the product free of accounts, roles and sharing.

## THE RULE / LOGIC
There is exactly one local user, with no accounts, roles, permissions, sharing or any other multi-user access model, and there is no server-side state. Whoever has the page open can do everything the app offers. From v3.0, saved data makes that whoever uses this browser profile on this device: what the app keeps (the kept sessions, favorites, comments and, when the player opted in, played notes) is there for anyone who opens the app in that browser profile, and Delete everything is the player's control over what stays. Data leaves the device only through an export the player triggers.

## TECHNICAL INTERFACE
The app offers no sign-in, account, role or sharing interface; what it keeps is reached by whoever opens it in the browser profile that kept it.

## EXPECTATION
- Every feature is available to whoever has the page open, with no sign-in and no server-side state.
- From v3.0, whoever opens the app in the same browser profile on the same device sees the same kept data.
