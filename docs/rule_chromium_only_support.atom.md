---
id: rule_chromium_only_support
status: REVIEW
tags: [v2, release-v2.0, browser, midi]
parents:
  - [[req_browser_only_first_release]]
version: 0.1
priority: 1
dependents: []
type: RULE
layer: BUSINESS
human_name: Chromium-Only Browser Support
---

# Chromium-Only Browser Support

## INTENT
Support the browsers in which MIDI input actually works.

## THE RULE / LOGIC
The app supports Chromium-based browsers only. Web MIDI is in practice available only there: Safari and WebKit have none, and Firefox needs an added permission extension. This matches the first release's existing browser scope.

## TECHNICAL INTERFACE
The app targets Chromium-based browsers.

## EXPECTATION
Every required behaviour, MIDI input included, works in a current Chromium-based browser.
