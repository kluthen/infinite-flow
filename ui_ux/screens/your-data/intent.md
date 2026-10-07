# Your Data Intent

> **New in v3.**

## What This Screen Is

**Your data** is the one place where the player sees everything the app keeps on their device and
deletes it (master spec §4.1). It is a sheet, wider than the connection sheet, opened between
sessions from three places: the one-line footer under the controls, the session list's header,
and the notice that says the device is full. The journey around it, and what each deletion
removes, is in [`flows/saved-data/`](../../flows/saved-data/intent.md).

It is a place visited rarely and on purpose: to check what is kept, to free space, to stop keeping
played notes, or to wipe everything before handing the device to someone else. None of those
belongs on the workspace's face, whose job is the phrase, and none needs a page of its own. A
sheet over the workspace says "this is a side trip; Done takes you back to where you were". The
header was the other candidate and was rejected: its widths are fixed and already full, and a
rarely used place does not earn a permanent button there.

## Whose Screen This Is

All three personas from `specs/personas.md` keep something here, and the screen puts first what
the Fledgling Composer (P3) needs, since they keep the most:

- **P3, the Fledgling Composer**, keeps pinned sessions, favorites, comments and, often, their
  played notes. They are the player who looks at the space used, meets a full device, and wants
  to know whether the browser will protect what they kept (**C1, review a session**).
- **P1, the Curious Improviser** (the primary persona), and **P2, the Speed Builder**, mostly keep
  settings, the remembered controller and, for some, their own instrument. For them the screen is
  reassurance: what is kept, in plain words, and a way to delete it.

For everyone, the played notes are the most private thing the app can hold. Their switch and
their deletion sit together in their own section, so a player who has any doubt finds both in the
same place.

## Focal Point

The overview reads from top to bottom as an inventory: one plain sentence saying where the data
lives and that nothing is sent anywhere, then one short section per kind of thing kept, then how
much space it takes and whether the browser protects it, then, apart from everything else, the
one action that deletes it all.

Each section answers "what is kept?" in words and numbers the player recognises: an instrument's
name, a controller's name, "3 sessions kept: 2 pinned, 5 favorite phrases". Where a thing is
changed somewhere else (my instrument in the instrument control, the controller in its connection
sheet), the section names that place rather than duplicating its controls; the sheet is an
inventory with deletions, not a second settings page.

The settings have no delete of their own. Resetting one setting is changing it back; resetting
all of them, with nothing else, is a need no persona has. `Delete everything` covers the rare
player who wants a clean slate.

## Deleting

Deletions are graded by how much they take, and placed accordingly.

- **Inside their section:** `Delete every session` under the sessions, `Delete all played notes`
  under the played notes, each shown only when there is something to delete. They are plain
  buttons here: their own confirmation carries the error tone, so the overview is not a wall of
  red.
- **Apart, last:** `Delete everything` sits alone after every section, in the error tone, aligned
  to the start and far from `Done`, so a player reaching for `Done` never lands on it.

Every deletion asks once, inside this sheet: its title becomes the question, the sections give
way to one paragraph naming what goes and saying it can't be undone, and focus goes to the way
back, so an Enter pressed out of habit deletes nothing. Asking inside the sheet, rather than
stacking a second sheet on top, keeps one dialog on screen and one place to come back to.

`Delete everything` reloads the page afterwards, into its first visit. That is the honest picture
of what was just done, and the player sees at once that nothing is left.

## Keep My Played Notes

The switch is here and in the review, where seeing one's own notes is the moment the choice
means most. Here, it sits with a line saying what it does in both positions, because a privacy
setting must be understood before it is used, and a count of the sessions that have their played
notes kept, because that count is what the player is deciding about.

Turning it off never waits for an answer: it is off at once. When played notes are already kept,
the sheet then asks whether to delete them too, with keeping them as the way back. Turning off a
privacy setting must never depend on answering a question.

## Space and Protection

The space line answers "is this getting big?", so it is an approximate size, "About 2.4 MB", of
what the app keeps, not the browser's figure for everything the site stores (that would include
the app's own offline copy, which the player did not choose to keep). It is measured each time the
sheet opens, and may read "Measuring…" for a moment, rather than keeping the sheet closed until
it is known.

Protection is told in two states, in words, with what each means for the player: protected, the
browser won't clear the data to free space; or not protected, the browser may clear it when the
device runs short, so export what you want to be sure to keep. The app asked the browser for
protection silently, the first time the player kept something they would miss; this is the one
place the answer shows, because it is the one place the advice "export it" makes sense.

## When the Data Can't Be Listed

In a visit that started from the defaults because the saved data couldn't be read, and in a tab
older than the data it found, the sheet cannot honestly list what is kept. It says why and that a
reload is the cure, and keeps only what still works: the space and the protection, and, after
unreadable data, `Delete everything`. Keeping that last one there matters: if the saved data is
damaged for good, deleting it is the player's way back to a working app.

An outdated tab offers no `Delete everything`. It deletes nothing at all until it is reloaded
(master spec §4.3): the data belongs to the newer version now, and wiping it from a tab that
cannot read it would destroy what the newer version just saved, on the word of a page that no
longer knows what is there. The reload is one press away in the workspace's notice, and after it
the newer version's own Your data offers every deletion. The sheet's notice says so, so the
missing button reads as a reason, not an omission.

## On a Phone

The phone gets every function, as the plain baseline. The sheet takes the screen's width, its
sections stack as they do everywhere, `Done` takes the full width as the connection sheet's
actions do, and the sheet scrolls inside itself. It opens at its top, so the player reads the
inventory first.

## What Is Deliberately Left Out

- **Per-item deletion of settings, or a "reset settings" action.** See above.
- **A list of the sessions.** The session list already is one; this screen counts them.
- **A backup or import file.** A later candidate, not in v3.0.
- **Anything about how the player played.** Counts here are of sessions, pins, favorites and
  sessions with played notes; never of notes, hits or anything that could read as a score.
