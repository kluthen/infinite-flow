---
id: module_lexicon_page_history_entry
status: DRAFT
parents:
  - [[req_lexicon_page]]
layer: ARCHITECTURE
version: 0.1
dependents: []
type: MODULE
priority: 1
human_name: The Lexicon Page's History Entry
tags: [v3, release-v3.4, lexicon, workspace, navigation]
---

# The Lexicon Page's History Entry

## INTENT
Let the browser's Back button close the lexicon page without ever leaving the app, and leave no stale lexicon visit in the browser's history once the page closes.

## THE RULE / LOGIC
The lexicon page has one browser-history entry of its own, address #lexicon, and the app has no other. Every opening of the page pushes one history entry, marked as the page's own, with the address #lexicon, on top of the workspace's bare address (no # part), so Back from the page always lands on the workspace. Back closes the page as Close does. Close and Escape step back over the page's entry, so after the page closes the history holds no lexicon visit and Back next goes where it would have gone before the page opened. Forward onto the page's entry after it closed opens the page on that entry, as the Lexicon button would but adding no entry; wherever the button is disabled, during a session, count-in included, Forward onto it opens nothing and the address is replaced with the bare one. A load or a reload at #lexicon replaces the address with the bare one, opens the workspace and, once the saved settings are read and the workspace is drawn, opens the page as a press of Lexicon does, adding its entry. #lexicon reached any other way while the app is open, such as typed into the address bar, is handled as a load at #lexicon; during a session only the address is replaced. Jumps inside the page (a letter, a related word) cancel their link's own navigation, so they add no history entry and leave the address at #lexicon, while their links keep their targets for assistive technology. Any other address part is left alone.

Every read and write of the browser's history and of the address goes through one injected history seam; no component touches window.history or the address itself.

## TECHNICAL INTERFACE
src/components/workspace/lexicon-history.ts, the history seam the page's host (src/components/workspace/use-lexicon-page.ts) is given: it pushes the page's marked #lexicon entry, steps back over it, replaces the address with the bare one, and reports Back, Forward and an arriving #lexicon to the host.

## EXPECTATION
- Each opening adds exactly one #lexicon entry; Back closes the page and stays in the app.
- After Close or Escape, the history holds no lexicon visit.
- Forward onto the entry reopens the page, except during a session, where the address is replaced with the bare one and nothing opens.
- A load, a reload or a typed #lexicon replaces the address with the bare one first, then opens the page, which adds its own entry; during a session only the address is replaced.
- Letter and related-word jumps add no history entry.
- The address is #lexicon only while the page is open.
