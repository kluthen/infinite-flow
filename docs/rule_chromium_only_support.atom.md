---
id: rule_chromium_only_support
status: REVIEW
tags: [v2, release-v2.0, browser, midi]
parents:
  - [[req_browser_only_first_release]]
version: 0.2
priority: 1
dependents: []
type: RULE
layer: BUSINESS
human_name: Chrome-Only Browser Support
---

# Chrome-Only Browser Support

## INTENT
Support the browser in which MIDI input works and the app is tested.

## THE RULE / LOGIC
The app supports Chrome only. Web MIDI is in practice available only in Chromium-based browsers: Safari and WebKit have none, and Firefox needs an added permission extension. Among Chromium-based browsers, Chrome is the one the app is tested in; the others, Edge included, are not tested and may or may not work.

## TECHNICAL INTERFACE
The app targets Chrome.

## EXPECTATION
Every required behaviour, MIDI input included, works in a current Chrome.
