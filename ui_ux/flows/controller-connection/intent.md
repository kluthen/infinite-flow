# Controller Connection Intent

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

## When connecting can happen at all

Connecting happens only between sessions: at Idle, or while the last-session Review is showing.
Never during a session. This is what makes the whole flow safe to be a modal sheet: while it is
open there is no running phrase, no backing, and no click it could hide. It also shapes three rules
the flow is built around:

- **The `Connect controller` click is also the click that unlocks audio.** Browsers need one real
  click before a page may play sound, and they do not count a MIDI note as one. The same click
  requests MIDI permission, so a single click lifts both restrictions and there is no separate
  "enable audio" step anywhere. A player who connects a controller can then start a session from
  the controller itself; a player who never connects one starts with the Start button, which is a
  click of its own.
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

The header and the sheet use one definition throughout, so that the badge never claims something
the rest of the app does not believe. A controller is **connected** once MIDI permission is
granted, one input is selected (the player's pick, or the only device present), and that input's
port is present and open. No note has to be played first; the transposition check is a separate
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

When the sheet closes, focus goes to the workspace's Start/Stop button rather than back to the
header element that opened it. A player who has just connected a controller is most likely about
to play, and Start/Stop is the one control that matters then.

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
  next). When it is 12 or more, the octave breakdown is added — "14 semitones (1 octave and 2)" —
  because an octave is 12 semitones and a player setting a controller often has a separate octave
  switch. An exact whole number of octaves is described only in octaves.
- The first suggestion is always the controller's own setting: its transpose setting for a
  semitone offset, its octave setting for a whole-octave one. That is the fix for the most common
  cause.
- A different instrument profile is suggested only when one of the other two profiles would make
  the played note match exactly, and then framed as "if you actually play that instrument," naming
  it. A keyboard player who left the B-flat tenor saxophone profile selected sees the C MIDI keyboard
  suggested; a saxophonist whose controller is already set up for alto sees the E-flat alto
  saxophone suggested. No profile is ever suggested when none would match, and none can match a
  whole-octave offset, so for that case the octave setting is the only suggestion.

The check stays within the three instrument profiles that exist. It does not remember a detected
offset or offer a custom profile.

## Why a header badge, not a persistent panel

A persistent connection panel would claim space from the score, which fills the first content row
on every landscape target and never yields width to interface chrome. Controller connection is
also not something the player thinks about while playing — it is checked once at the start of a
practice sitting and revisited only occasionally. A small header element fits that: quiet by
default, informative at a glance, and one click away from the full sheet between sessions.

The header element takes one of these forms:

- **`Connect controller` button** — a plain `btn`, deliberately not `btn-primary`, because
  connecting is optional support for the practice loop, not the loop itself (`Generate phrase` /
  `Regenerate phrase` keeps that role). It stays a button until a controller has actually
  connected or the browser has refused permission. A failed attempt that found no device, or an
  unsupported browser, leaves it as a button: trying again is the natural next step there, and a
  badge would claim a status that has not changed.
- **Connected badge** — a status dot plus the device's name, once a controller has connected.
- **No-controller badge** — a neutral status dot plus "No controller", once a controller that had
  connected is no longer attached: disconnected by the player, lost in a session that then ended,
  or unplugged between sessions. The no-controller badge never reverts to the `Connect controller`
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
  session and not back when the session ends (the countdown ran out, or the player stopped) keeps
  its selection into the Review, like any controller unplugged between sessions: the header shows
  the no-controller badge, and plugging the same device back in reattaches it by itself.

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
  disconnected — plug it back in to keep playing. Session ends in 23 s." It sits in space kept
  free for it for the whole session, so it never pushes the staff or shifts what the player is
  reading.
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
