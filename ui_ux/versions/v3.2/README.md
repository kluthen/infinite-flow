# v3.2 — Jam: UI/UX Design

Status: **approved and built, not yet released.** Approved by the owner on 2026-10-21 and built
(its last wave merged on 2026-11-05), this folder is the v3.2 design as it stands after the build's
corrections, frozen on 2026-11-09, before v3.2's release, so that v3.3 is approved against a v3.2
that no longer moves. It is never edited again, except to correct it to match what v3.2 actually
ships, at its release gate (each such correction is recorded in the root `decisions.md`, and the
same correction is applied at the root). The product scope is Part C of
[`specs/versions/v3/master-spec.md`](../../../specs/versions/v3/master-spec.md#part-c--v32). The
v3.1 design it extends is in [`versions/v3.1/`](../v3.1/README.md).

At the root, v3.2 and v3.3 were designed one on top of the other, every v3.3 change written as
its own tagged paragraph, item or annotation. This copy is the root with every v3.3 part left
out: their tagged paragraphs, list items, table rows, change-block lines, code-block annotations
and the section they open. Nothing else was reworded. Link paths were adjusted to this folder.

The documents keep their marks, in three layers. A `[v3 new]` or `[v3 changed]` tag, and each
document's unprefixed **Changes since v2** items, show what v3.0 changed from v2; a `[v3.1 new]`
or `[v3.1 changed]` tag, and the change-block items prefixed `_v3.1 new:_`, `_v3.1 changed:_` or
`_v3.1 removed:_`, what v3.1 changed from v3.0; a `[v3.2 new]` or `[v3.2 changed]` tag, and the
items prefixed `_v3.2 new:_` or `_v3.2 changed:_`, what v3.2 changes from v3.1. Removed wording
is in [`versions/v3.0/`](../v3.0/README.md) and [`versions/v3.1/`](../v3.1/README.md). A document
new in v3.2, such as the Jam flow (`flows/jam/`), says so under its title.
`grep -rn "v3\(\.[12]\)\? \(new\|changed\)"` finds every mark.

There is no token-source document for v3.2. Its classes, and the guide playback's tokens, are
written into `src/styles/components.css` and `src/styles/theme.css` under `v3.2 new` comments;
once v3.2 ships, the shipped state of those two files is the `v3.2.0` release tag's. The handoffs
here cite those files alone: every class and token they name is in them.

## What v3.2 is

The app gets a second mode, Jam, switched in the header beside the app's name. In Jam mode the
player plays a short idea of their own, a doodle, after the count-in, and the app's phrases
continue it: a rhythm close to it, the same ups and downs, a first note joined to its last one.
Jam mode has its own few settings, its key and mode, tempo, drift, rhythm lock and a little
harmony, and lists what the doodle set rather than offering it; its tempo can be tapped. After a
Jam, Jam mode keeps the doodle, so the next Jam goes round again on it, and a kept Jam's review
brings an older doodle back; the review, and the bar that holds the kept doodle, suggest the key
and mode the doodle sounds in. In session mode, a rhythm lock keeps one rhythm across a session,
with the small changes the player allows, and the player chooses which groups of settings Vary
settings may move. In both modes, two guides can play what is written, the melody and its rhythm,
for a player still learning to read at sight.

## The decisions worth keeping, and why

- **Jam is its own mode, switched in the header.** A two-segment `Session` / `Jam` switch beside
  the app's name reads as which app the player is in, not as one more setting; it works between
  sessions only, and nothing ever switches it for the player.
  ([strategy, Trade-offs](strategy.md#trade-offs),
  [phrase-workspace intent](screens/phrase-workspace/intent.md#the-mode-switch))
- **A visit that never jams never pays for it.** Jam's part of the app loads on the first press of
  `Jam`; a failed load leaves session mode as it was and says so, with a way to try again.
  ([jam intent](flows/jam/intent.md#opening-jam-mode-the-first-time))
- **Jam's controls are few, and what the doodle sets is shown, not offered.** Seven figure rows
  would turn an idea to grow back into a generator to tune; the doodle's readings are a plain
  list, since locked controls would invite a hunt for the unlock.
  ([jam intent](flows/jam/intent.md#jams-settings),
  [phrase-workspace intent](screens/phrase-workspace/intent.md#jams-controls))
- **Tap-in listens only after its button.** A player warming up at idle would otherwise keep
  moving the tempo; uneven taps are never judged.
  ([jam intent](flows/jam/intent.md#setting-the-tempo-by-tapping))
- **A Jam runs hands-free.** It starts on the home note as well as on `Start Jam`, the doodle ends
  by itself, and its measures are counted above the staff.
  ([jam intent](flows/jam/intent.md#starting-hands-free-by-the-home-note),
  [playing the doodle](flows/jam/intent.md#playing-the-doodle))
- **Nothing is asked during a Jam.** The key and mode suggestion waits for the review or Jam's
  idle, where the hands are free. ([jam intent](flows/jam/intent.md#nothing-is-asked-during-a-jam))
- **Jam mode keeps the doodle, to go round again.** Phrase 1 is written again from it whenever a
  setting it is written from changes, `New doodle` lets it go without a confirmation since its session still holds
  it, and a kept Jam's review brings an older one back.
  ([jam intent](flows/jam/intent.md#going-round-again-the-doodle-jam-mode-keeps))
- **The suggestion's buttons say what they change.** `Jam in G Dorian` and `Keep C Major`, never
  "Use it", and only Jam's key and mode.
  ([jam intent](flows/jam/intent.md#the-suggestions-place))
- **A Jam that ends before phrase 1 keeps nothing**, opens no review and tells one cause only, in
  a calm line at idle. ([jam intent](flows/jam/intent.md#when-a-jam-ends-before-phrase-1))
- **The rhythm lock comes first in "During a session"**, because it changes what the player reads
  from the first phrase; the allowed rhythm changes and what may vary appear under their switch,
  only while it is on. ([phrase-workspace intent](screens/phrase-workspace/intent.md#the-session-options))
- **What the app does to the rhythm by itself is never marked**: a mark on the staff would pull
  the eyes off the notes for something the player cannot act on mid-session.
  ([strategy, Trade-offs](strategy.md#trade-offs))
- **The guides are two more switches after `Backing` and `Click`**, off by default, labelled in
  full at every size, their volumes in the same `Volume` panel; they sound only during a session.
  ([phrase-workspace intent](screens/phrase-workspace/intent.md#the-audio-mix),
  [strategy, Context of Use](strategy.md#context-of-use))
- **A Jam's review shows its doodle**, every file of a Jam opens with it, and what needs Jam's
  part of the app waits for it while the rest of the review works.
  ([review-and-export intent](flows/review-and-export/intent.md#a-jams-review))
- **Switching modes is instant**, with no fade or slide, and scrolls nothing.
  ([motion](motion.md))
