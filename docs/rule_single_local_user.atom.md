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
version: 0.1
tags: [v2, release-v2.0, privacy, browser, changes-in-v3.0]
---

# One Local User, No Access Model

## INTENT
Keep the product free of accounts, roles and sharing.

## THE RULE / LOGIC
There is exactly one local user, with no accounts, roles, permissions, sharing or any other multi-user access model: whoever has the page open can do everything the app offers. There is no server-side state.

## TECHNICAL INTERFACE
The app offers no sign-in, account, role or sharing interface.

## EXPECTATION
Every feature is available to whoever has the page open, with no sign-in and no server-side state.
