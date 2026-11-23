---
id: module_lexicon_page_history_entry
status: DRAFT
parents:
  - [[req_lexicon_page]]
layer: ARCHITECTURE
version: 0.2
dependents: []
type: MODULE
priority: 1
human_name: The Lexicon Page's History Entry
tags: [v3, release-v3.4, lexicon, workspace, navigation]
---

# The Lexicon Page's History Entry

## INTENT
Let the browser's Back button close the lexicon page without ever leaving the app, leave no stale lexicon visit in the browser's history once the page closes, and never let any route to the page open it over a session or a sheet.

## THE RULE / LOGIC
The lexicon page has one browser-history entry of its own, address #lexicon, and the app has no other. Every opening of the page pushes one history entry, marked as the page's own, with the address #lexicon, on top of the workspace's bare address (no # part), so Back from the page always lands on the workspace. Back closes the page as Close does. Close and Escape step back over the page's entry, so after the page closes the history holds no lexicon visit and Back next goes where it would have gone before the page opened. Forward onto the page's entry after it closed opens the page on that entry, as the Lexicon button would but adding no entry. A load or a reload at #lexicon replaces the address with the bare one, opens the workspace and, once the saved settings are read and the workspace is drawn, opens the page as a press of Lexicon does, adding its entry. #lexicon reached any other way while the app is open, such as typed into the address bar, is handled as a load at #lexicon; while the page already shows, it leaves the page as it is and marks the entry it lands on as the page's own.

Wherever Lexicon cannot be pressed the page opens by no route: during a session, count-in included, and while any sheet is open over the workspace (the connection sheet, My instrument, Your data, the preset sheet, or the stale-phrase prompt, which counts as a sheet here), #lexicon reached by Forward, by a load or any other way opens nothing; only the address is replaced with the bare one, and the sheet stays as it was, with what was typed in it. The first opening in a visit waits for the page's code to load: a session started during that load cancels the opening, and a sheet opened during it stops the opening, the page staying closed when the load ends even if the sheet has closed by then; a later opening shows the loaded page at once.

Jumps inside the page (a letter, a related word) cancel their link's own navigation, so they add no history entry and leave the address at #lexicon, while their links keep their targets for assistive technology. Any other address part (the path, the query) is left alone.

Every read and write of the browser's history and of the address goes through one injected history seam; no component touches window.history or the address itself.

## TECHNICAL INTERFACE
src/components/workspace/lexicon-history.ts: browserLexiconHistory(), the history seam (LexiconHistory) the page's host is given; it says whether the address is #lexicon and whether the entry now is the page's marked one, pushes the page's marked #lexicon entry, marks the entry now as the page's, steps back over it, replaces the address with the bare one, and tells its listener of every move of the history or the address. The host, useLexiconPage in src/components/workspace/use-lexicon-page.ts, reads whether a session runs and whether a sheet is open; src/components/workspace/WorkspaceShell.vue hands it every sheet the workspace counts open and the stale-phrase prompt. The page's code loads through src/components/workspace/load-lexicon-page.ts.

## EXPECTATION
- Each opening adds exactly one #lexicon entry; Back closes the page and stays in the app.
- After Close or Escape, the history holds no lexicon visit.
- Forward onto the entry reopens the page, except during a session or under an open sheet, where the address is replaced with the bare one and nothing opens.
- A load, a reload or a typed #lexicon replaces the address with the bare one first, then opens the page, which adds its own entry; during a session only the address is replaced.
- Under an open sheet, the stale-phrase prompt included, #lexicon reached any way opens nothing: only the address is replaced, and the sheet stays open with what was typed in it.
- A session started during the page's first load cancels the opening; a sheet opened during it stops the opening, even if closed before the load ends.
- Letter and related-word jumps add no history entry.
- The address is #lexicon only while the page is open.
