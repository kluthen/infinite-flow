# Controller Connection Intent

> **Changes since v2**
>
> - _New:_ the check can make my instrument follow the controller, warning first when that erases
>   its kept sessions ([Using the check's result for my instrument](#using-the-checks-result-for-my-instrument))
> - _New:_ the controller is remembered across visits and reattaches at load, with no prompt
>   ([The controller remembered across visits](#the-controller-remembered-across-visits))
> - _Changed:_ the `Connect controller` click is no longer the only audio unlock: the page's first
>   click, tap or key press anywhere unlocks sound, and the starting note waits for it after a
>   controller reattached at load ([When connecting can happen at all](#when-connecting-can-happen-at-all))
> - _Changed:_ the header shows a badge from the load when the remembered controller is expected,
>   and the remembered controller counts as a selected input
>   ([Why a header badge, not a persistent panel](#why-a-header-badge-not-a-persistent-panel),
>   [What "connected" and "lost" mean](#what-connected-and-lost-mean))
> - _Changed:_ with my instrument selected, the check runs against it and suggests a built-in
>   profile when one matches; the flow also serves both personas across visits
>   ([Why the transposition check is framed as a diagnostic, not a pass/fail test](#why-the-transposition-check-is-framed-as-a-diagnostic-not-a-passfail-test),
>   [Whose flow this is](#whose-flow-this-is))
> - _Removed:_ "It does not remember a detected offset or offer a custom profile" (v2 in the
>   [frozen copy](../../versions/v2/flows/controller-connection/intent.md#why-the-transposition-check-is-framed-as-a-diagnostic-not-a-passfail-test))

Connecting a MIDI controller is a separate concern from generating or reading a phrase, not a
variant state of either. Generating a phrase is about musical content: what the player wants to
practice next. Connecting a controller is about a physical device handshake: is one plugged in,
does the browser let the page see it, which one should the app read, and does it agree with the
instrument profile's written pitch. Nothing about that handshake changes what a phrase says or how
it is notated, and nothing about a phrase's controls resolves a device question. `phrase-workspace`
already owns every state that is actually about the phrase on screen; folding a six-step device
handshake into that screen's own state machine would make an unrelated concern compete for the
same states and the same header action that generation, regeneration, and notation recovery
already use. A separate flow keeps `phrase-workspace`'s state machine exactly as specified and
gives the handshake its own beginning, middle, and end.

## Whose flow this is

The flow serves two persona goals from `specs/personas.md`, primary persona first:

- **P1, the Curious Improviser** (the primary persona) — **G2, real-time reading and dexterity**:
  adjusting on the fly to notes as they come. In v2 the controller is what lets the session
  acknowledge the notes they play, so a controller that is connected and agrees with the instrument
  profile is what turns that goal's "mild pressure" into feedback rather than silence.
- **P2, the Speed Builder** — **S1, an endless supply of fresh material read at a steadily higher
  tempo**. v2 is the release that gives this player a tempo to read against, and a connected
  controller is what lets a session acknowledge what they play at it.

Neither persona is tied to one instrument. The Curious Improviser may play a wind or breath
controller, reading a transposed B-flat tenor or E-flat alto saxophone part, or a keyboard; the
Speed Builder is often on a keyboard or a generic MIDI controller, reading concert pitch. The flow
has to make sense for all of them. Its own job is narrow: get one controller connected and
confirmed to agree with the chosen instrument profile before a session relies on it, so that the
positive-only note acknowledgement can actually light notes up. Playing without a controller is the
other ordinary way to use the product, and this flow must never make that path feel second-class.

**[v3 new]** From v3.0 the flow also serves both goals across visits. The same player comes back to
the same browser, practice sitting after practice sitting, and the controller they chose last time
is simply there again, so a sitting starts with playing rather than with connecting. And when the
check finds the controller and the instrument disagree, the player can make their own instrument
follow the controller instead of changing the controller's settings: for the Curious Improviser on
a wind controller left at its default, that is often the quicker way to a part they can read and
play.

## When connecting can happen at all

Connecting happens only between sessions: at Idle, or while the last-session Review is showing.
Never during a session. This is what makes the whole flow safe to be a modal sheet: while it is
open there is no running phrase, no backing, and no click it could hide. It also shapes three rules
the flow is built around:

- **[v3 changed]** **The page's first click unlocks sound.** Browsers need one real click, tap or
  key press before a page may play sound, and they do not count a MIDI note as one. Any of them,
  anywhere on the page, is enough. With no controller remembered, that first click is usually
  `Connect controller`, which also requests MIDI permission, or `Start session`, a click of its
  own, so the player meets no "enable audio" step. A controller the app reattached at load (see
  The controller remembered across visits) has had no click at all, so until the page's first
  click, tap or key press, the starting note starts nothing, and the starting-note line asks for
  one click first (its wording is in `screens/phrase-workspace/`). This is surfaced rather than
  designed around: without it, the first session of a visit could start silent, with no backing
  and no click, and nothing on screen saying why.
- **Nothing played while this sheet is open can start a session.** Not the note the transposition
  check asks for, and not the note the phrase starts on either, even if it happens to be the same
  note. Connecting is its own step. A player playing their check note must never be surprised by a
  count-in starting behind the sheet.
- **The transposition check can be re-run only between sessions**, from the sheet, like every
  other part of connecting.

A session that starts without a controller stays without one until it ends. Its header keeps the
`Connect controller` button (or the no-controller badge) in place but disabled, so the header does
not shift and the player can see that connecting is simply not available right now rather than
wondering where the button went.

## What "connected" and "lost" mean

**[v3 changed]** The header and the sheet use one definition throughout, so that the badge never
claims something the rest of the app does not believe. A controller is **connected** once MIDI
permission is granted, one input is selected (the player's pick, the only device present, or the
controller remembered from an earlier visit), and that input's port is present and open. No note has to be played first; the transposition check is a separate
step that follows. A controller is **lost** when that selected port reports it has disconnected.
This is the same meaning the session uses for its silence timer and for starting from a MIDI note,
so the badge, the sheet, and the session can never disagree about whether a controller is there.

## Why every state is non-blocking and dismissable

A session is always startable with no controller connected. If this flow could ever trap the
player — no visible way out of "permission denied," no way to skip "no device found" — it would
break that guarantee in spirit even while a page reload technically still escapes it. So every
state carries a way out that does not depend on the device problem resolving: Escape, a backdrop
click, the sheet's `Close` button, and, on the states before a device is chosen, an explicit
`Continue without a controller` action. A player who cannot get their controller working, or who
simply changes their mind, is never stuck looking at this sheet.

This is also why the flow is a modal sheet over `phrase-workspace` rather than a route change: the
player's workspace — controls, the phrase on screen, the Review, scroll position — must be exactly
there the moment the sheet closes, whichever state it closed from. A route change would have to
reconstruct that context; a sheet never leaves it. The sheet uses `--z-sheet`, the layer reserved
for an overlay above the workspace, distinct from `--z-alert`, which stays reserved for notices
inside the workspace itself.

When the sheet closes, focus goes to the workspace's session action, `Start session`, rather than
back to the header element that opened it. A player who has just connected a controller is most
likely about to play, and `Start session` is the one control that matters then. When `Start
session` is disabled, as on an empty workspace or under a generation-failure message, focus goes
to the phrase action instead: a disabled button cannot take focus, and generating or retrying the
phrase is then the step that leads to playing. When both are disabled, while a phrase is still
being generated or when the rhythm settings cannot form a phrase, focus goes back to the header
element that opened the sheet, which is always usable between sessions: there is no next step to
jump to yet, so the player lands where they started.

## Why only two connection states use the error tone

Most connection states describe something ordinary: this browser has no MIDI support, no device is
plugged in yet, the player chose to continue without one, a controller was unplugged between
sessions. Those are all normal ways to use the app, so they are shown in a neutral tone and never
as a fault. Exactly two states use the theme's error tone: a refused MIDI permission (below), and a
controller unplugged during a running session, whose banner and header badge are explained under
"A controller lost during a session".

A refused MIDI permission is different in kind from the neutral states. It is a setting the
player's own browser now holds, and the app cannot undo it from inside the page: once a Chromium
browser blocks MIDI for a site, asking again from the page does nothing until the player changes
the site's permission in the browser itself. It is the one state before a session that really is
a blocked setting rather than an ordinary way of playing. So it is shown in the theme's error tone,
in the header badge and in the sheet, so the player can see at a glance that access was refused by
a browser choice and not by a fault in the app. The sheet then explains how to allow MIDI again
in the browser, instead of offering a bare retry that cannot work on its own. Its `Check again`
action only asks the browser once more, after the player has changed that setting.

This error tone is about a browser setting, never about the player's playing. The "nothing ever
marked wrong" rule for notes is untouched: a missed or wrong note still produces no visible change
of any kind.

## Why the transposition check is framed as a diagnostic, not a pass/fail test

A wind or breath controller can silently disagree with a transposing instrument profile. For
example, a controller left at its factory default sends the written note untransposed, while the
B-flat tenor saxophone profile expects the concert pitch 14 semitones (1 octave and 2) below the
written note. Because acknowledgement never gives a mismatch hint, a player in that state would get
total silence during a session with no clue why.

The check catches that before a session starts, but it must never read as the player having done
something wrong. A player whose controller is transposed did not make a meaningful mistake — most
likely they never touched the device setting, or they are playing a different instrument from the
one the selected profile describes. So there is no red state, no "failed" language, and no colour
separating a match from an offset. Every result is a plain factual statement followed by one
concrete thing to do, in the same neutral notice style.

The wording is built so a player who is still learning music theory can act on it without
translating:

- A mismatch always says **which way** the controller is off (it sounds higher or lower than the
  profile expects) and **names the current profile**, because "transposed by 14" alone does not
  tell anyone which way to turn a setting or which profile the app was assuming.
- The distance is given in semitones (the smallest step between two notes, one piano key to the
  next). When it is 12 or more, the octave breakdown is added — "14 semitones (1 octave and 2
  semitones)" — because an octave is 12 semitones and a player setting a controller often has a
  separate octave switch. An exact whole number of octaves is described only in octaves.
- The first suggestion is always the controller's own setting: its transpose setting for a
  semitone offset, its octave setting for a whole-octave one. That is the fix for the most common
  cause.
- A different instrument profile is suggested only when one of the other two profiles would make
  the played note match exactly, and then framed as "if you actually play that instrument," naming
  it. A keyboard player who left the B-flat tenor saxophone profile selected sees the C MIDI keyboard
  suggested; a saxophonist whose controller is already set up for alto sees the E-flat alto
  saxophone suggested. No profile is ever suggested when none would match, and none can match a
  whole-octave offset, so for that case the octave setting is the only suggestion.

**[v3 changed]** The profile suggestion stays within the three built-in profiles. When my instrument
is the selected instrument, the check runs against it: its name stands where a profile's would, the
note it asks for comes from its range, and a built-in profile is suggested when one would match
exactly. My instrument itself is never suggested by that line: the action below covers it.

## Using the check's result for my instrument

**[v3 new]** On every result that is not a match, the check offers one more action after `Continue`:
`Use this for my instrument`. It sets my instrument's transposition so the written notes match what
the controller plays, creating my instrument from the selected profile if there is none yet. It is
there because the most common mismatch, a controller left at its default and sending the written
note untransposed, can be fixed from either side, and a beginner may find their controller's
transpose setting harder to reach than one button here. It is a plain button, after `Continue`:
the controller's own setting stays the first suggestion, and nothing in the result's wording
pushes the player towards changing their instrument.

**[v3 new]** It asks once before acting, inside the sheet, because it changes something kept: the
confirmation says what a written C4 will sound as and, when my instrument does not exist yet, that
it will be made from the selected profile, with its name and range. The way back is focused, so an
Enter pressed out of habit changes nothing. On confirmation my instrument is saved and selected,
the phrase is replaced as on any instrument switch, and the sheet goes to `Connected` saying that
my instrument now matches the controller. The app still applies no offset to played notes: they
are compared at the pitch received, and it is the instrument's written part that moves to meet
them. Only the transposition changes; the written range and the clef stay as they were, since that
is what the player reads, and the rest of my instrument is changed in its own sheet
(`flows/my-instrument/`).

**[v3 new]** A new transposition changes what my instrument plays, so the sessions kept with it go
(`flows/my-instrument/`, What Changing It Does to Its Sessions). When my instrument has kept
sessions, the same confirmation says so, with how many, and its confirming action takes the error
tone and says it erases: `Use and erase`. A tab that must be reloaded erases nothing, so there the
action is not offered while my instrument has kept sessions, and the result says a reload comes
first. The check note follows my instrument's clef when it is selected, so the note asked for looks
as it does in the player's part.

## Why a header badge, not a persistent panel

A persistent connection panel would claim space from the score, which fills the first content row
on every landscape target and never yields width to interface chrome. Controller connection is
also not something the player thinks about while playing — it is checked once at the start of a
practice sitting and revisited only occasionally. A small header element fits that: quiet by
default, informative at a glance, and one click away from the full sheet between sessions.

The header element takes one of these forms:

- **[v3 changed]** **`Connect controller` button** — a plain `btn`, deliberately not `btn-primary`, because
  connecting is optional support for the practice loop, not the loop itself (`Generate phrase` /
  `Regenerate phrase` keeps that role). It stays a button until a controller has actually
  connected or the browser has refused permission. A failed attempt that found no device, or an
  unsupported browser, leaves it as a button: trying again is the natural next step there, and a
  badge would claim a status that has not changed. From v3.0 it is also what a load shows unless
  a remembered controller is expected (see The controller remembered across visits).
- **Connected badge** — a status dot plus the device's name, once a controller has connected.
- **[v3 changed]** **No-controller badge** — a neutral status dot plus "No controller", once a
  controller that had connected is no longer attached: disconnected by the player, lost in a
  session that then ended, or unplugged between sessions; and from a load, while the remembered
  controller is expected but not plugged in. The no-controller badge never reverts to the `Connect controller`
  button: the player already knows what clicking it does, and falling back to the earlier label
  would read as amnesia about a device they were just using.
- **MIDI-blocked badge** — error-toned, with the words "MIDI access blocked", once the browser has
  refused permission. When a later request succeeds (the player has allowed MIDI in the browser and
  chosen `Check again`), the header shows the connected badge if that request connects a device.
  If it does not, the header shows the no-controller badge when a controller had connected earlier
  in this page session, and the `Connect controller` button only when none ever had. Once a
  controller has connected in the page session, the header never goes back to the button.
- **Disconnected badge** — error-toned, with the words "Controller disconnected", only while a
  controller unplugged during a session has its reconnection countdown running (see "A controller
  lost during a session").

Every badge carries words as well as its dot, so colour is never the only signal.

**Every badge form has the same width.** The badge's label area has one fixed width, sized for the
longest fixed label, "Controller disconnected". A device name longer than that is cut with an
ellipsis; its full name shows on hover and in the sheet. Switching between a device name,
"No controller", "MIDI access blocked" and "Controller disconnected" therefore never moves anything
else in the header, at any screen size. That matters most during a session, when a mid-session
unplug and reattach flip the badge while the player is reading, but it holds between sessions too.

## A controller unplugged between sessions

Unplugging a connected controller at Idle or while the Review is showing does not forget which
controller the player chose. While it is away, the header shows the neutral no-controller badge
and the app behaves exactly as with no controller connected. Nothing is wrong, and nothing here is
error-toned: no session is running, so no countdown applies and there is nothing for the player to
rescue.

If the **same device** is plugged back in, it reattaches by itself: no click, no sheet, and no new
transposition check, exactly as it does during a session. The header returns to the connected
badge. The check already told the player how this device relates to the instrument profile, and
plugging a cable back in does not change that; asking again would make a routine replug feel like
starting over. A **different device** plugged in is not picked up by itself; connecting it goes
through the sheet, from the no-controller badge, like any new connection.

Two cases at the edge of a session follow the same logic:

- **Start clicked while the chosen controller is away.** The session starts without a
  controller, like any session started without one, and stays that way until it ends: plugging the
  device back in during that session does not reattach it. The header keeps the no-controller
  badge, disabled for the session. Once the session ends, the device reattaches by itself if it is
  plugged in by then.
- **A controller still away when a session ends.** A controller unplugged during a
  session and not back when the session ends (the countdown ran out, the player stopped, the tab
  was hidden, or the window could no longer show the staff) keeps its selection into the Review,
  like any controller unplugged between sessions: the header shows the no-controller badge, and
  plugging the same device back in reattaches it by itself.

## The controller remembered across visits

**[v3 new]** The app remembers the last controller the player chose and reselects it at the next
load, as soon as it is plugged in, the way it already recognises a controller that comes back
within a page: no click, no sheet and no new check. The check told the player how this device
relates to their instrument last time, and a reload does not change that.

**[v3 new]** A load never raises a browser prompt. The app asks for MIDI access at load only when
the browser already allows it for this page; otherwise the header shows `Connect controller`, as in
v2, and the first click on it goes through the sheet. A permission prompt appearing by itself at
every visit, before the player has done anything, would be the app asking for something the player
did not reach for.

**[v3 new]** While the remembered controller is expected but not plugged in, the header shows the
neutral no-controller badge, exactly as for a controller unplugged between sessions, and the
controller attaches by itself when it is plugged in. Through the sheet, a remembered controller
found among the inputs is chosen directly and the sheet goes straight to `Connected`: the picker and
the check are skipped, and `Run check again` is there for a player who has changed their
controller's settings since.

**[v3 new]** The memory is one device, never a history. Choosing another device replaces it.
`Disconnect` forgets it, because that is the player choosing no controller, and a reload must not
bring back a device the player turned away. Deleting my instrument leaves it alone, since the two
are independent; `Delete everything` forgets it with everything else.

**[v3 new]** Reattaching at load has one cost: the page has had no click yet, so it may not play
sound. The starting note therefore waits for the page's first click, tap or key press (see When
connecting can happen at all).

## A controller lost during a session

Falling silent and losing the controller are different things, and the flow treats them
differently.

**Silence** — the player stops to breathe or loses their place — changes nothing visible. The
phrase keeps rolling at tempo, notes that fall due simply stay unlit, and the session's ordinary
30-second no-note rule applies unchanged: a session with a controller ends after more than 30
seconds without a note. The controller is still there; the player just is not playing it.

**An unplug** — the selected port reports it has disconnected — is made clearly visible, even
though that briefly draws attention away from playing. A player who does not notice their
controller has gone would otherwise keep playing into silence and conclude the app stopped
listening. What changes:

- A banner in the theme's error tone appears above the staff, with a live countdown: "Controller
  disconnected — plug it back in to keep playing. Session ends in 23 s." On a phone, where it
  shares its row with a compact `Stop` and `Volume`, it reads "Controller disconnected. Session
  ends in 23 s.", the obvious clause dropped so it still fits. It takes the session cue
  row, which is always present at one fixed height, so it never pushes the staff or shifts what
  the player is reading (see `flows/play-session/`).
- The header badge switches to the same error tone, with the words "Controller disconnected".
- The phrase keeps rolling at tempo — there is no pause state — and notes that fall due while the
  controller is away stay unlit, like any unplayed note.
- The countdown starts at 30 seconds from the moment of the unplug, however long the player had
  already been silent. The silence timer is suspended while no controller is attached.

If the **same device** comes back within those 30 seconds, it reattaches by itself: no click, no
sheet, and no second transposition check. The banner disappears, the badge returns to the
connected badge, the session carries on, and notes played from then on are acknowledged as usual.
The silence timer starts counting again from the reattachment. A different device plugged in
during the countdown is ignored — connecting a new device is something that only happens between
sessions.

If the countdown reaches zero, the session ends exactly as a silence timeout ends it, and the
Review opens. The badge is then the neutral no-controller badge, and the controller is treated as
unplugged between sessions (see "A controller unplugged between sessions").

This flow's sheet never opens during any of this. Reconnecting mid-session is the device coming
back, not the player going through a connection step, and a modal over a running session would
hide the Stop button and the staff at the very moment the player needs them.

## During a session, the header element is status only

Because a controller can only be connected between sessions, and a lost one comes back by itself,
there is nothing the player can do from the header element while a session runs: no reconnecting,
no switching device, no re-running the check. So during a session it is a status display only.
The badge keeps showing its state at full strength but is not clickable, and the `Connect
controller` button (in a session started before any controller had connected) stays in place but
disabled. It becomes interactive again at Idle and in the Review.

## Devices appearing or disappearing while the sheet is open

The sheet follows what the browser currently reports rather than a snapshot taken when it
opened, so a player plugging in a controller after reading "No controller found" does not have
to find a button to make the app notice. Plugging a new device in while that state is showing moves the
sheet on by itself, exactly as `Try again` would; the controller the player just unplugged coming
back instead picks up where it left off, straight to Connected if its check was done, or back
into the check if it was unplugged mid-check. In the device list, a newly plugged device is
added at the end and an unplugged one is removed. If the device being checked or already connected
is unplugged while the sheet is open, the sheet says so in one plain line and goes back to choosing
a device from what is still plugged in, rather than silently switching to a different one. The full
rules are in the screen's handoff.
