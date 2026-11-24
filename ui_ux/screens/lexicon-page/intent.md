# Lexicon Page Intent

## What This Screen Is

The research behind this design, what the lexicon holds and how good glossary pages handle each
choice below, is in [`research/lexicon-page.md`](../../research/lexicon-page.md).

The lexicon, [`docs/music/lexicon.md`](../../../docs/music/lexicon.md), is the project's one
list of music words, written for a reader with no music theory: every word has one plain line,
a short definition, and, where the app gives the word a meaning of its own, what it does in
Infinite Flow. Until now only the people building the app read it. This page puts it in front of
the player: every word, A to Z, with a search, offline, over the workspace and back.

It serves the Curious Improviser (P1) first, from
[`specs/personas.md`](../../../specs/personas.md): a player who can read music but is a
beginner at improvisation, curious, who pokes at settings to see what happens, and who wants to
get to know the possibilities rather than study theory (P1.G1). The page is for the moment
between sessions when a word stops them: what is Leapiness, what does an enclosure do, why does
the chord say "m7". It is a place to look a word up and wander a little, not a course.

## The Focal Point: the Plain Line

Each entry shows its word and its one plain line, and keeps the rest one press away. The plain
line is the lexicon's popup, at most two sentences, written to need no theory. A beginner who
looks a word up mostly wants that line; the definition and the app meaning are for when it
raises a further question. So the list reads as word, line, word, line: easy to scan with the
eyes, easy to browse for a player who wants to see what words exist, which is what "get to know
the possibilities" asks for. `More` opens the rest in place, under the line just read, so the
reader never loses their spot.

The other names ("Also called semitone, half tone") are shown with the plain line, not hidden
with the detail: a player who knows a word by another name recognises the entry at a glance,
and a search that found it by that name shows why it matched.

Opening in place was preferred to a list beside a detail pane. A split view would leave the list
half the width of a tablet and needs a second layout on a phone; it also shows one entry at a
time, while in place several words can stay open side by side for comparison (Contour the music
word and Contour the control).

## Letters and Search, Both Always at Hand

The owner asked for alphabetical exploration and a simple search, so both sit in the bar at the
top of the page, which stays in view while the words scroll under it. A letter jumps; the search
filters as the player types. Choosing a letter while searching empties the search, so a letter
always means "browse from here" and the two never combine into a state that has to be explained.

Letters with no word (U, X, Y and Z today) are shown, greyed, and cannot be chosen. Hiding them
would make the row shift each time the lexicon gains a word and would leave the player
wondering whether the row is complete; a greyed letter says plainly "nothing here".

Search is forgiving because the player is a beginner and the words come from other languages:
no case, no accents ("compas" finds Compás), no hyphens ("b flat" finds B-flat instrument). It
matches the other names too, since a player may know a half step only as a semitone. The best
matches come first: a word that is exactly what was typed, then words that start with it, then
the rest, so typing "tension" puts the Tension control at the top and Chord extension (also
called a tension) below it. When one word matches, it opens, since that is the word the player
came for.

A beginner often has the idea but not the word: they heard a horn player slide up into a note
and do not know it is called a scoop. A list searched by name alone fails them. So, from three
characters on, the search also looks in each word's plain line, and lists the entries it finds
there in a group of their own, "Mentioned in other words", under the named matches: typing
"sliding" finds Scoop, whose plain line reads "A jazz effect: sliding up into a note from a
little below it." Kept apart,
these looser finds never crowd out the word the player typed; starting at three characters and
matching only the start of a word keeps the group short. The definitions and app meanings are
not searched: they are long, and a match deep in one would explain nothing at a glance.

A search that finds nothing says so in words and offers the way back, `Clear search`, with a
hint that a shorter or differently spelled search may work. It never shows an empty page.

## Doubled Words

Four words are in the lexicon twice: Contour, Register, Syncopation and Tempo, each once as the
music word and once as the app's control of that name. They are the same word with two
meanings, and the player meets both: the control's label is the music word. So each entry shows
its group beside its word ("Melody", "App controls"), the music word comes first, and a link to
either names its group ("Tempo (App controls)"). The group is the lexicon's own, so a fifth
doubled word would need nothing new. The two entries already link to each other in the lexicon.

## What Was Demoted or Hidden

- **The entry's `id` and `sources`.** They are for the people who keep the lexicon: the id is
  only the entry's address on the page, and the sources are references for checking facts.
- **The Internal words** (forced bend, tick, seed and others). The lexicon itself says they are
  never shown: their lines start with "Internal" and are written for developers. A related link
  to one of them is left out of the entry's related words. Some of them are words a curious
  player might like (gesture and answer, open ending); bringing one to the page is an edit to the
  lexicon, moving it out of the Internal group in plain words, and the page shows it at the next
  build.
- **Nothing reworded.** Every entry shows the lexicon's own words, app meanings included, even
  where an app meaning reads as written for the people building the app. The page never shortens
  or hides part of one by a rule: a text that reads badly is mended in the lexicon, once, and
  every reader of it gains.
- **Browsing by group.** The twelve groups are a label, not a way in, in this first step.

## Visual Weight

The page is built like the app's sheets, from the same parts (`sheet-title`, `sheet-hint`,
`Close`, the text field), but fills the window, because 300 words of reading do not fit a box in
the middle of the screen. It sits on the page's background colour with the bar on the surface
colour, so it reads as a page of its own rather than a dialog. The reading column is the width
of the wide sheet, about 70 characters at body size, which is a comfortable reading line; on a
wide screen the rest is quiet margin. Nothing on the page is error-toned; nothing moves but the
jump to a letter or a word, which is instant, like every jump in the app.

## The Words

The page uses the lexicon's own words for every entry and very few of its own: "Lexicon" for the
footer button and the title (the owner's word for it, explained by the intro line), "Find a word"
for the search, "More" and "Less", "Also called", "In Infinite Flow", "Related", "Clear search".
"Glossary" would be the more common English label; "Lexicon" is kept because it is the owner's
word for the list, and the intro line says what it holds.
