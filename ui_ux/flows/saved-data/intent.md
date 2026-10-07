# Saved Data Intent

> **New in v3.**

Up to v2, every visit started from the defaults and forgot everything when the page closed. v3.0
keeps things on the player's device: settings, the last session and the sessions the player
chose to keep, their favorites and comments, the player's own instrument, the remembered
controller and, only on request, the notes the player played (master spec §4, §5). This flow is
everything about keeping that is not a screen of its own: what is saved and when, how it comes
back at load, how a saving problem is told, and the **Your data** sheet where the player sees
what is kept and deletes it. The sheet is specified in
[`screens/your-data/`](../../screens/your-data/intent.md); the notices live in a row the
workspace draws, [`screens/phrase-workspace/`](../../screens/phrase-workspace/handoff.md).

## Whose flow this is

The flow serves three persona goals from `specs/personas.md`, primary persona first:

- **P1, the Curious Improviser** (the primary persona) — **G1, vocabulary by exposure.** Their
  settings come back as they left them, so the next practice sitting starts where the last one
  ended instead of from a row of defaults they have to set again. For this player, keeping is
  comfort, and comfort only works if it is silent.
- **P2, the Speed Builder** — the same comfort: the tempo, the density and the audio mix they
  settled on come back.
- **P3, the Fledgling Composer** — **C1, review a session**, and **C2, take it out.** Sessions
  they pinned, their favorites and comments survive a reload. They also keep the most data, so
  they are the player most likely to look at the space it takes, and to meet a full device.

Every persona shares one tension the master spec settles (§3): the music is kept by itself, but
the player's own played notes are kept only when the player asks, and everything kept can be
deleted. This flow carries that settlement into the interface.

## Keeping is silent

Nothing in this flow ever says "saved". A setting is saved when the player changes it; a session
is saved once, when it ends and its review opens; a pin, a favorite, a comment, my instrument and
the chosen controller are saved when the player makes them. A confirmation of every one of
these would be noise on a screen whose job is the phrase, and the player's own experience
already confirms the save: the settings are there the next day. The one moment a success would
matter, a session the player wants to keep, already has its own line in the review saying how the
session is kept.

Silence has a cost: the player can't see that a save worked. That is why the failures are told,
always, and why Your data shows everything that is kept. A player who doubts can look.

## Nothing is written during a session

A session's timing comes first (master spec §4.1, §12). Between Start and the session's end the
app writes nothing: the session itself is saved at its end, as its review opens. The controls are
read-only for the whole session anyway, so the player has nothing to save; and what the app
changes by itself during a session (the varied settings, the density stepping down on a phone,
a raised tempo) is never saved, since it belongs to that session and goes back at its end. A
session cut short by closing or reloading the page is lost, exactly as in v2: the honest price of
never touching storage while the player plays. A session that ends during its count-in has no
review and changes nothing that is kept.

## Asking the browser to protect the data

A browser may clear a site's data when the device runs short of space, without warning, unless
the site has asked for its storage to be protected and the browser agreed. Chrome and Edge answer
silently, by their own rules, with no prompt to the player. So the app asks at the moment the
player first keeps something they would miss (a pin, a favorite, a saved instrument), not at load:
a site that asks on its first visit, before the player has kept anything, is more likely to be
refused, and nothing yet would be lost. The request shows nothing. Its answer appears in one
place, Your data's protection line, because the player can do nothing about a refusal except
export what they want to be sure of keeping, and Your data is where that advice is useful. A
notice saying "your data isn't protected" would worry the player about something they cannot
fix, on every visit.

The request is made at the first such act of each visit while the data is not yet protected: a
browser's answer can change as the player keeps using the site, and asking again costs nothing.

## Coming back at load

The first thing a returning player sees should already be their own setup. If the workspace
appeared with the defaults and then switched to the saved values, every control and the theme
would flicker, and a phrase asked for in that moment would come from the wrong settings. So the
workspace is drawn only once the saved settings are read: the theme is right from the first
frame, the controls show their saved values, and the first phrase the player asks for comes from
them. Reading a few settings from the browser's database takes a
moment at most, so in practice the player sees no delay.

Each saved value is checked on its own (master spec §4.4). A later version of the app may drop a
choice, or a value may have been damaged; the setting concerned quietly shows its default and
every other setting is kept. No notice is shown: the control itself shows the value in effect,
and a message about one setting the player may not even remember changing would be more confusing
than useful. The saved choice, not the value a phrase was generated with, is what comes back: a
`Sixteenth` density chosen on a laptop stays `Sixteenth` when the app is opened on a phone, even
though phones generate eighth notes, so it is still there on the laptop.

A read can fail, or hang. The app waits only a short start-up time, a build constant proposed at
2 seconds, so a stuck database never leaves the player in front of an empty page. Past that, or
on a failed read, the visit starts from the defaults, in memory, and saves nothing at all. Saving
nothing is the important half: a visit that could not read the kept data must not overwrite it
with defaults, or one bad moment would wipe every setting and every pinned session. The player is
told once, in a notice that offers the one cure that usually works, a reload. A read that
finishes after the wait is ignored for that visit, because applying it then would change the
controls under the player's eyes.

Data written by a newer version of the app is a different case with a different cure. The app
updates itself silently, so a tab can be older than the data it finds. It reads what it can,
each value checked as above, saves nothing, and says that a reload brings the newer version. The
same holds when a newer version writes while an older tab is open: that tab stops saving from
that moment and says so.

## Telling a saving problem

Saving never gets in the way of playing (master spec §4.1): a failed save leaves the app working
in memory, and the player hears about it outside a session. Everything about how they hear is
built around two rules of the whole design: a running session never asks or shows the player
anything new, and nothing moves on screen once a session has started.

So a problem is told in one notice row at the top of the workspace, above the staff, between
sessions only. A notice that arises during a session waits and appears when the session ends.
One already showing when a session starts stays exactly where it is, unchanged, its buttons
disabled like every control: removing it would shift the staff at the very moment the player
starts reading. Notices are calm: never in the error tone, because a full device or an outdated
tab is not the player's fault and needs no alarm, and never announced or given focus, because they
appear after something the player did, beside what they were doing, and must not pull them away
from it.

Four notices, each saying what happened, what it means, and the one thing the player can do:

- **A save that failed.** The app still works, but the change may be lost when the page closes.
  The player can only take note, so the notice can be dismissed.
- **A full device.** The same, with the cause and its cure: deleting sessions frees space, and
  the notice opens Your data, where the space used and the deletions are. Nothing is deleted
  automatically to make room (master spec §5.1): the app never decides which of the player's
  sessions are worth less.
- **An outdated tab.** A newer version has saved data; a reload brings it in, and until then this
  tab saves and deletes nothing, so it offers no deletion anywhere: no `Delete everything` in Your
  data, no session or played-notes deletion in the list or a review, and turning
  `Keep my played notes` off asks nothing. It stays, because every change made in this tab is now
  at risk.
- **Data that couldn't be read at load.** This visit started from the defaults and saves nothing;
  a reload may fix it. It stays for the same reason.

The row holds one notice at a time. The two that stay are the more serious and already imply that
nothing is being saved, so they replace a save-failure notice rather than sit beside it. Repeated
failures never stack: the save-failure notice is one notice whose wording follows the latest
cause, and once dismissed it comes back only if saving fails again after a save has succeeded, so
a browser that refuses every save does not bring it back at each click.

A session whose own save failed is the one exception: the player is already looking at its review,
and the review's line about how the session is kept says it was not saved and is best exported.
A notice above the review saying the same thing again would be redundant.

## Your data

The master spec asks for one place where the player sees and deletes what is kept (§4.1). It is a
sheet, opened from a one-line footer under the controls, from the session list's header, and from
the full-device notice: a place visited rarely, on purpose, that needs neither a header button nor
a page of its own. Its reasoning is in [`screens/your-data/intent.md`](../../screens/your-data/intent.md).

Its deletions follow the one confirmation pattern of the whole design: one short question naming
what goes, saying it can't be undone, with the way back focused. Three of them are this flow's:

- **Delete every session.** Every kept session goes, pinned ones included, with their favorites,
  comments and played notes; so does the session that just ended if it is still in memory, since
  a player who deletes every session does not expect one to linger behind `Review last session`.
  Settings, my instrument and the controller stay. The page beneath is brought up to date when the
  sheet closes, not under the scrim while the player is still in the sheet.
- **Delete all played notes.** The played notes kept with any session go; the sessions stay, and
  the `Keep my played notes` setting stays as it is. Played notes held only in memory for the
  session that just ended, because the setting was off, are not kept data and are untouched.
- **Delete everything.** Everything the app keeps goes, the remembered controller included, and
  the page reloads into its first visit. Resetting every control, closing the review and
  releasing the controller in place would be a long list of special cases to get exactly right;
  a reload is the honest picture of "nothing is kept", and it is what the player will see on their
  next visit anyway. Deleting my instrument alone, in its own sheet, does not forget the
  controller; Delete everything does (master spec §7.3).

Turning `Keep my played notes` off, from here or from a review, keeps nothing new and, when some
played notes are already kept, asks whether to delete them, with keeping them as the way back
(an outdated tab, which may delete nothing, never asks). The
switch is off either way: turning off a privacy setting should never be held hostage by a
question. Turning it on keeps the played notes of the session that just ended too, while they are
still in memory: the player who switches "keep" on, after a session, expects that session's notes
to be kept, wherever the switch was pressed.

## What this flow deliberately leaves out

- **A "saved" message, or a saving indicator.** Silence is the design (see above).
- **A storage-protection notice.** Shown only in Your data.
- **Automatic deletion to make room.** Never; the full-device notice points to Your data instead.
- **A backup file of everything kept, to move it to another browser.** A later candidate, not in
  v3.0 (master spec §2); the exports remain the way to take sessions out.
- **Accounts or anything sent anywhere.** Everything stays on the device (master spec §4.1, §15).
