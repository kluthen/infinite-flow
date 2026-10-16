---
id: rule_favorites_only_export
status: STABLE
dependents:
  - [[module_review_export_pipeline]]
tags: [v3, release-v3.0, export, favorites, changes-in-v3.2]
parents:
  - [[req_favorite_phrases]]
  - [[req_session_export]]
type: RULE
layer: BUSINESS
version: 0.2
priority: 1
human_name: Favorites-Only Export
---

# Favorites-Only Export

## INTENT
Let the player take out only the phrases they liked.

## THE RULE / LOGIC
From v3.0, next to the whole-session scope, the exports offer a favorites-only scope, for the generated notes (MusicXML or MIDI) and for the played notes (MIDI). A favorites-only file holds exactly the session's favorite phrases, in session order, each keeping its session phrase number. It is laid out as a whole session of those phrases alone: the first favorite phrase at time zero, each next one right after the one before, with no gap or empty measure where a phrase was left out, each at its own tempo. Each phrase keeps its session phrase number in its marker and rehearsal mark, and in MusicXML its session measure numbers (phrase n in measures 4n − 3 to 4n), so the numbers skip where phrases were left out. The generated-notes file and the played-notes file of one scope hold the same phrases laid out the same way, so they still line up phrase by phrase. A played note held past the end of a favorite phrase stops at that end when the next phrase is not exported. When the session has no favorite, the favorites-only scope is unavailable and says why.

## TECHNICAL INTERFACE
Each export action offers a whole-session or a favorites-only scope, and a favorites-only file's name says that it holds the favorites.

## EXPECTATION
- A favorites-only file, of either content, holds exactly the favorite phrases, in session order, with their phrase numbers.
- In a favorites-only file the first favorite phrase starts at time zero and each next one where the one before ends, each at its own tempo; with favorites 2, 5 and 6, the MusicXML measures are numbered 5 to 8, 17 to 20 and 21 to 24.
- The played-notes file and the generated-notes MIDI file of one favorites-only scope share the tempo map and the phrase markers.
- A played note held past a favorite phrase's end stops at that end when the next phrase is not exported.
- With no favorite, the favorites-only scope is unavailable and states the reason.
