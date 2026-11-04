---
id: module_kept_doodle
status: DRAFT
human_name: The Kept Doodle in Jam's Code
tags: [v3, release-v3.2, jam, idle]
parents:
  - [[rule_held_doodle_dropped_on_change]]
  - [[rule_held_doodle_in_memory_only]]
  - [[rule_held_doodle_phrase_one_at_idle]]
  - [[rule_jam_again_on_this_doodle]]
  - [[rule_jam_on_held_doodle_skips_capture]]
  - [[rule_jam_pregeneration_only_for_kept_doodle]]
  - [[rule_jam_setting_change_rewrites_kept_phrase_one]]
layer: ARCHITECTURE
version: 0.1
dependents: []
type: MODULE
priority: 1
---

# The Kept Doodle in Jam's Code

## INTENT
Hold Jam mode's kept doodle in one place of Jam's code, for the visit only, so everything that keeps it, reads it or lets it go agrees on which doodle Jam mode keeps.

## THE RULE / LOGIC
The kept doodle lives in one composable of Jam's code, in memory only: nothing it holds is ever saved, so after a reload no doodle is kept. It holds at most one doodle: the quantized doodle with the tempo it was captured at, the readings Jam's controls were taken from (which depend on no window width), its key and mode suggestion with whether it was declined, and the session it comes from, the latest session played on it.

What keeps a doodle, each replacing any doodle kept before: the end of a Jam that reached phrase 1, from the ended Jam's Jam part, the one its review shows, which the workspace hands to Jam's code at that end (a Jam on the kept doodle keeps the same doodle, and its own session becomes the one the doodle comes from); and Jam again on this doodle, from a kept Jam session's review. A Jam that ends before phrase 1 hands no Jam part: a fresh Jam's doodle is not kept, and a doodle already kept stays.

What lets it go, and nothing else: New doodle; leaving Jam mode; the player's deletion of the latest session played on it, one session or by Delete everything; Jam again on this doodle on another doodle, which replaces it; a reload. A session end that replaces an earlier unpinned session keeps it.

What reads it: phrase 1 at Jam mode's Idle, written from it through the three rungs with no deadline, written again at once when a Jam setting other than the tempo changes, or the instrument does; Jam's own pre-generation queue; and a Jam started on it, which skips the capture. The tempo, the theme, the audio mix, a controller lost or attached and a window crossing rewrite nothing. Jam's queue is its own instance of the pre-generation queue, keyed by Jam's settings and the kept doodle, never session mode's queue, so nothing of Jam's touches session mode's prepared phrases.

## TECHNICAL INTERFACE
src/jam/use-kept-doodle.ts, inside Jam's code (module_jam_code_boundary), holds the kept doodle; the workspace's src/components/workspace/use-fresh-jam.ts hands it the ended Jam's Jam part, a ReviewedJamPart (src/components/workspace/session-jam-part.ts), at a Jam's end with a review. The composable's exported names are written in once it is built.

## EXPECTATION
- At a Jam's end with a review, the kept doodle is the doodle of the Jam part that review shows; an end before phrase 1 changes nothing kept.
- Jam again on this doodle replaces any kept doodle with that session's doodle.
- Each of New doodle, leaving Jam mode, deleting the latest session played on it, Delete everything, Jam again on another doodle and a reload lets the kept doodle go, and nothing else does; a Jam on it that replaces an earlier unpinned session keeps it.
- Jam's phrases prepared ahead come from Jam's own queue, keyed by Jam's settings and the kept doodle, and nothing of Jam's discards or prepares session mode's phrases.
