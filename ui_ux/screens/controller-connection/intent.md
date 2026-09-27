# Controller Connection Screen Intent

This screen is a sheet, not a route, and its every state is built to be read in a few seconds and
then acted on or dismissed — nothing here asks for sustained attention the way the phrase workspace
itself does. Each state has exactly one job, stated in its own heading and body copy, with no
competing message on screen at the same time.

## Focal point per state

**Requesting access** has no decision to make yet; its only job is to tell the player something is
happening so a silent pause after clicking `Connect controller` doesn't read as nothing happening.

**Unsupported browser**'s only job is to explain, plainly, that this specific browser cannot see a
MIDI controller at all, and that this changes nothing about being able to practice. There is
deliberately no retry here — offering one would imply the player could do something to fix it, when
the actual fix (a different browser) is outside anything this sheet can influence.

**Permission denied**'s only job is to say the browser blocked the request and name the one concrete
thing that resolves it — a browser-level permission setting — without walking the player through
browser-specific instructions this design set cannot keep accurate across every Chromium browser and
version. It trusts the player to find their own browser's site-permission UI once told what to look
for.

**No device found**'s only job is to say plainly that no MIDI input was seen, and to suggest the one
concrete physical fact that resolves it (a controller needs to actually be plugged in and powered
before the browser can see it). It is not a diagnostic panel; it does not try to distinguish "you
have no controller" from "your controller isn't plugged in yet" from "your OS hasn't recognized it" —
those are all the same actionable next step from here (plug it in, try again).

**Multi-device picker**'s only job is to get one device chosen. It shows every input the browser
currently reports and nothing else — no last-used indicator, no reordering by recency, no device
capability detail — because none of that changes which one the player wants to pick right now, and
adding it would turn a one-decision list into a small research task.

**Transposition check**'s only job is to get one note played and report the relationship between
what the player played and what the instrument template expected, in plain language. It shows
exactly one written note (from the current instrument profile's own range) and one instruction —
play it — and, once played, exactly one of three outcome strings with its own one-line suggestion.
Nothing else competes for attention on this screen: no history of a previous run of the same check
this session, no running tally of attempts, no countdown. A player who wants to run it again clicks
`Run check again` from the state that follows it, deliberately outside this screen's own focus.

**Connected**'s only job is to confirm which device is in use and offer the small set of things a
player might want to do with an already-working connection: re-run the check, switch device, or
disconnect. It is the one state in this flow that is allowed to feel like a settled resting point
rather than a step in a sequence, because for a player who is done with this sheet, it usually is.

## What's demoted or absent entirely

There is no connection history or log anywhere in this flow — no list of previously seen devices
beyond the ones needed for the current picker or the current "choose a different device" action, no
record of how many times the transposition check has been run, no timestamp of when a device was
last connected. None of that changes what the player should do next, and this product's existing
"nothing is ever marked wrong, and nothing is ever kept as a record to be judged by" ethos (already
established for note acknowledgement and the retained-review data in `master-spec.md` §7-8) extends
naturally to not keeping a device-connection log either. A player reconnecting the same controller
for the tenth time gets exactly the same screen as the first time.

There is also no persistent settings surface inside this sheet for anything MIDI-related beyond
device selection — no input-channel filter, no latency-calibration control (the master spec defers
player-facing latency calibration to a future version, §8), and no way to rename a device. Anything
not needed to get the player from "no controller" to "connected and checked" is left out.

## Why a sheet, not a route, and why dismiss is always available

Presenting this as a modal sheet over `phrase-workspace`, rather than navigating to a separate
screen, keeps the player's workspace state — controls, any phrase on screen, scroll position —
untouched underneath it the entire time the sheet is open, and instantly visible again the moment it
closes. A route change would have to preserve and restore all of that explicitly; a sheet never
disturbs it in the first place. This is the same reasoning `flows/controller-connection/intent.md`
gives for treating this as a separate flow at all: a genuinely separate concern gets its own screen,
but "separate" does not mean "leaves the player's place."

The dismiss action is available at every single state precisely because none of this flow is ever a
gate. A player can close this sheet from `Permission denied` having fixed nothing, from the
`Multi-device picker` having chosen nothing, or from `Transposition check` having played nothing, and
in every case land back on an entirely normal, entirely functional `phrase-workspace` — a session
without a controller is not a degraded session, it is one of the two ordinary ways to use this
product (`master-spec.md` §7-8). The explicit `Continue without a controller` action exists,
worded that way, on the states before a device has been chosen, so the choice to skip this entirely
reads as a legitimate, named option rather than something the player has to discover is possible by
noticing the sheet happens to be closable. Once a device has been chosen and the flow has moved past
device resolution, closing the sheet no longer needs that explicit phrasing — Escape, backdrop
click, and the close action all still work, but the labeled invitation to skip forward stops making
sense once there's no longer a "forward" being skipped.
