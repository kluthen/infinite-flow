# Controller Connection Intent

Connecting a MIDI controller is a genuinely separate concern from generating or reading a phrase,
not a variant state of either. Generating a phrase is about musical content: what the player wants
to practice next. Connecting a controller is about a physical device handshake: is one plugged in,
does the browser see it, which one should the app read, and does it agree with the instrument
template's written pitch. Nothing about that handshake changes what a phrase says or how it is
notated, and nothing about a phrase's controls resolves a device question. Keeping the two apart
mirrors the same reasoning that keeps session mode inside `phrase-workspace` as an extension of a
shared concern while still giving controller connection its own flat screen: `phrase-workspace`
already owns every state that is actually about the phrase on screen, and folding a five-or-six-step
device handshake into that screen's own state machine would make an unrelated concern compete for
the same states, the same header action, and the same script logic that generation, regeneration,
and notation recovery already use. A separate flow keeps `phrase-workspace`'s existing state machine
exactly as specified, and gives the connection handshake room to have its own beginning, middle, and
end without contorting either one to fit the other.

## Why every state is non-blocking and dismissable

The master spec is explicit that a session is always startable with no controller connected at all
(`master-spec.md` §8: "a session without any controller connected is always possible") and that
starting audio only needs one prior click, not a completed connection (§6). If the connection flow
could ever trap the player — no visible way out of "permission denied," no way to skip "no device
found" — it would contradict that guarantee in spirit even while a Stop or a page reload technically
still escapes it. So every state in this flow carries an explicit way out that does not depend on
the underlying device problem resolving: Escape, a backdrop click, or, on the states before a device
is actually selected, an explicit `Continue without a controller` action. None of these dismiss
paths are gated behind fixing anything. A player who cannot get their controller working, or who
simply changes their mind about connecting one, is never stuck looking at this sheet.

This is also why the flow is a modal sheet over `phrase-workspace` rather than a route change: the
player's workspace — controls, any phrase already on screen, scroll position — must still be exactly
there the moment the sheet closes, regardless of which state it closed from. A route change would
have to reconstruct that context on return; a sheet never leaves it. Using `--z-sheet` for this is
also the token's first real use in this design set — it was reserved for exactly this shape of
element (an overlay above the workspace that never competes with `--z-alert`, which stays reserved
for content that lives inside the workspace itself, like the generation-failure banner).

## Why the transposition check is framed as a diagnostic, not a pass/fail test

A wind or breath controller can silently disagree with a written-pitch instrument template — for
example, a controller left at its factory default sends untransposed MIDI while the tenor
saxophone template expects concert pitch a major ninth below written pitch (`master-spec.md` §8).
Without a check, this produces total silence during a real session with no way for the player to
know why: every expected-note match in the product is already silent on a miss (the "no mismatch
hint, ever" principle, carried through from v1 and restated at §8), so a controller-transposition
mismatch would look identical to the player simply not being heard at all, with no diagnostic
signal anywhere.

The check exists to catch that specific silent failure mode before a session ever starts, but it
must never read as the player having done something wrong. A player whose controller happens to be
transposed did not misconfigure anything meaningful — they most likely never touched the relevant
device setting, or they are using a instrument template that legitimately differs from their
controller's default. So the check's own framing avoids every pass/fail signal this product has
already ruled out elsewhere: there is no red state, no "failed" language, and no color distinguishing
a match from an offset. All three outcomes — match, transposed by N octaves, transposed by N
semitones — are reported in the same visual register, each as a plain factual statement followed by
one concrete, actionable suggestion. "Transposed by 14 semitones" is not a worse outcome than
"matches," it is simply a different fact the player now has, with something obvious to do about it.
This is the same ethos §8's own live acknowledgement view holds to for played notes during a
session — nothing is ever marked wrong, only useful information is ever surfaced — carried into the
one place in this flow where a genuine mismatch has to be named at all.

## Why a header badge, not a persistent panel

A persistent connection panel sitting in the workspace at all times would claim space from the one
region this whole design set treats as sacred: the score, which fills the first content row on
every landscape target and never yields width to UI chrome (`strategy.md`, Trade-offs). Controller
connection is also not something the player thinks about continuously while playing — it is checked
once, at the start of a practice sitting, and only occasionally revisited (switching devices,
re-running the check after moving controllers). A small, always-clickable header badge fits that
usage pattern: quiet by default, exactly like the audio-mix controls (§6, always reachable but never
demanding attention), informative at a glance (a status dot plus a device name or "No controller"),
and a single click away from the full sheet when the player does want to act on it. This mirrors how
`theme-control` sits in the header rather than occupying workspace body space for a similarly
occasional decision.

Before any connection attempt this browser session, the badge instead reads as a plain `btn` action,
`Connect controller` — deliberately not `btn-primary`, because connecting a controller is optional
supporting infrastructure, not the primary thing this screen asks the player to do (`Generate
phrase`/`Regenerate phrase` keeps that role). Once a connection has ever been attempted this
session, the badge form takes over permanently — even after a disconnect, it never reverts to the
plain "not yet tried" button, because the player has already learned what clicking it does and a
regression to the earlier label would read as amnesia about a device they were just using.

## Why a mid-session device loss never reopens this sheet

`master-spec.md` §7 and §8 are both explicit that a controller falling silent mid-session — whether
the player set it down or it was physically unplugged — never ends or interrupts the session; it
simply turns the session into a no-controller session, with the inactivity timer disarmed and only
a manual Stop able to end it from that point. A modal sheet appearing uninvited over a running
session, interrupting whatever the player is doing to inform them of something that changes nothing
about their ability to keep playing, would itself be the interruption the spec is explicit about
avoiding — the entire point of "the phrase keeps rolling regardless" is that losing a controller is
a non-event from the session's point of view. So this flow is deliberately never entered
automatically. A mid-session loss is documented and handled entirely on `screens/phrase-workspace/`
itself: the header's `controller-status` badge quietly updates to a neutral "No controller" state,
with no popover, no toast, and no sheet. The badge stays clickable afterward exactly as always, so a
player who does want to reconnect can do so on their own initiative — but the flow only ever opens
because the player asked it to, never because the device did something.

## Color discipline

No state in this flow is a fault, including permission denied and no device found — a session with
no controller is a fully supported, ordinary way to use the app (§8: "always possible"), and the
product's existing discipline never marks an ordinary path as an error. Every state that would read
as a warning in another product instead uses `alert-notice` and a muted, neutral `status-dot`, the
same vocabulary `phrase-workspace` already uses for its own non-error notices (the unsupported-rhythm
alert). `--color-error`/`alert-error` never appears anywhere in this flow or on the header badge,
even when the news is "this didn't work" — the news is always framed as "here's what's true right
now," not "something went wrong."
