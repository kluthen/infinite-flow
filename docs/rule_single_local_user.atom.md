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
notes: v3.0 change pending (2026-10-07, v3.0 spec ingestion): the approved v3.0 scope, not yet built, changes this atom. From v3.0 kept data makes whoever has the page open into whoever uses this browser profile on this device, at this address (rule_saved_data_belongs_to_browser_profile); there are still no accounts, roles or sharing. Text and status unchanged on purpose: it still describes the running v2.0 code. Revise it in the change that builds the v3.0 behaviour, per docs/release/v3.0-intent-change-set.md.
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
