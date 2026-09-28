# UI/UX Decisions

Append-only record of settled UI/UX decisions. Earlier logs are archived verbatim:

- D1–D44 (first release, v1.0): [archive/v1/decisions-D1-D44.md](archive/v1/decisions-D1-D44.md)

Archived IDs keep their meaning; a citation to one by ID elsewhere in this repository stays valid
through this header. Numbering continues from D45.

- **D45 (2026-09-27).** v2 (Rolling Phrase) layers session mode onto the existing
  `screens/phrase-workspace/` screen rather than introducing a separate top-level "session" screen.
  Grounds: `specs/versions/v2/master-spec.md` §4 states that "the phrase already on screen before
  Start was pressed becomes phrase 1 of the new session (there is no separate 'generate phrase 1'
  step)" — the pre-session static workspace and its already-generated phrase are the session's own
  starting point, not a distinct prior screen. Definition of done item 3 (§11) additionally
  requires the unchanged v1 static workspace to remain byte-identical output with no carry-in,
  confirming it survives as v2's own Idle state rather than being replaced. This decision fixes the
  information architecture for all v2 flow/screen work that follows: the rolling session, its
  locked-controls state, and the review are all extensions of the same screen and its existing
  flow, not a parallel IA. It does not settle how the rolling display itself presents the phrase
  sequence on screen — see `open-questions.md` Q17.

- **D46 (2026-09-27).** The Idle screen carries a quiet, non-comparative reference to the tempo
  reached in the previous session (adaptive tempo, v2.2), when that session used adaptive tempo.
  Closes `open-questions.md` Q22, a pure presentation call left to `ux-writer` by `spec-writer` (no
  business-rule or data-model content: the value only needs to persist in memory for the current
  browser session, same as the review already does). Reasoning: the master spec's own "never
  graded, scored or marked wrong" guarantee (DoD item 13, §11) rules out anything that reads as a
  score, a streak, or a comparison against a target — but a single factual, past-tense line (e.g.
  "Last session reached 165 BPM") is neither of those; it is the same quiet acknowledgement the
  review screen already gives the number, carried one screen forward so the two don't tell
  different stories about the same session. It must stay low visual weight (no badge, no
  before/after framing, no color-coding for higher/lower), appear only when the last session
  actually used adaptive tempo, and never be phrased as an invitation or a target for the next
  session ("last time you reached," never "beat your last tempo" or similar). Screen-level
  placement, exact copy, and the empty case (no prior session this browser session) are for the
  Idle screen's own `intent.md`/`handoff.md` when that unit is written up (todo.md unit 8).

- **D47 (2026-09-27).** Controller connection is its own flow and screen (`flows/controller-
  connection/`, `screens/controller-connection/`), entered from a new persistent header element on
  `screens/phrase-workspace/` rather than folded into that screen's own states. Grounds:
  `master-spec.md` §6 ("Starting audio at all needs one prior user click") and §8 (connection
  states, the re-runnable transposition check) describe a self-contained sub-journey that is
  reachable from Idle, reachable again after a session to re-run the check or switch device, and
  must never block or interrupt a session (§8: "every connection state ... is non-blocking"). This
  is a genuinely separate concern from generating or reading a phrase, not a variant of it — same
  reasoning D45 used to keep session mode inside `phrase-workspace` (a shared concern) while still
  giving controller connection its own flat screen (a distinct concern with its own state machine).
  Settles the following for the unit:
  - **Entry point.** `screens/phrase-workspace/`'s header gains a persistent `controller-status`
    element in `context-group` (before `theme-control`). Before any connection attempt in this
    browser session, it renders as a plain `btn` (not `btn-primary` — it is not the primary action)
    labeled `Connect controller`. Once ever connected this session, it becomes a small status
    badge (a `status-dot` plus device name or "No controller") that stays clickable at all times —
    Idle, running session, and Review alike, the same "always reachable" footing as the audio-mix
    controls (§5) — to reopen the connection screen at its current state (re-run the check, switch
    device, or reconnect). This is a phrase-workspace addition, documented as a conditional in that
    screen's own handoff, not a fork of the screen.
  - **Presentation.** The connection screen is a modal sheet over `phrase-workspace` (using the
    existing, previously unused `--z-sheet` token), not a route change — it must never lose the
    player's place. It is always dismissable (Escape, backdrop click, or an explicit
    `Continue without a controller` action) and dismissing it never blocks Start or a MIDI-started
    session in any way; nothing about it is a gate.
  - **States, in the order a first connection attempt walks through:** unsupported browser (no Web
    MIDI API — informational only, no retry) → requesting access (brief connecting state) →
    permission denied (explains the browser blocked access, with a retry and a
    continue-without-a-controller action) → no device found (zero inputs; retry and
    continue-without actions) → device resolution, either a single device (auto-selected, proceeds
    directly) or multiple devices (an accessible picker list the player chooses from, modeled on
    the existing `segmented-control` radiogroup/roving-tab-stop pattern) → the transposition check
    (one written note from the instrument's current range, a play prompt, and one of three plain-
    language results — match, transposed by N octaves, or transposed by N semitones — each with its
    own short suggestion) → connected (device name, `Run check again`, `Choose a different device`
    when more than one has ever been seen, `Disconnect`, and a close action). The check is
    re-enterable directly at its own state from the header badge once a device is already connected
    — a re-run skips permission and device resolution entirely.
  - **A controller lost mid-session never opens this sheet at all** — per §8, it just turns the
    session into a no-controller session with no interruption; only the header `controller-status`
    badge updates (to a neutral "No controller" state, not an error state — see below), documented
    on `screens/phrase-workspace/` itself, not on the connection screen.
  - **Color discipline.** No connection state (including permission denied, no device found, or a
    lost mid-session controller) ever uses `--color-error` or `alert-error` — a session with no
    controller is a fully supported, ordinary way to use the app, not a fault (§8: "always
    possible"). These states use `alert-notice` and a muted/neutral `status-dot`, exactly the "no
    mismatch hint, ever" and "nothing ever marked wrong" discipline the rest of the product already
    holds to.
  - **New Tier 2 surface needed, not yet drawn:** a `sheet`/`sheet-backdrop` modal pair (the first
    real use of `--z-sheet`), a `device-picker`/`device-option` list component modeled on
    `segmented-control`/`segment`, and the header's `controller-status` badge (`status-dot` plus
    label). These are additions to the existing, already-settled token system, not a rethink of it.

- **D48 (2026-09-27).** Refines D47's entry point and colour rule after `ux-critic` flagged a
  contradiction (D47 said the header's `Connect controller` button becomes a badge "once ever
  connected"; the tier docs said "once ever attempted"). User's call: **a refused MIDI permission
  is badged, in the theme's error tone** (`--color-error` family — "red" is only what the current
  themes happen to render, not a fixed colour), so the player can see at a glance that access was
  refused by their own browser choice, not by a fault in the app. Grounds: unlike "no device
  found" or "no controller", a refused permission cannot be fixed from inside the app —
  Chromium remembers the block, so the app can't simply ask again, and the player has to undo it
  in the browser's own site settings. That makes it the one connection state that really is a
  blocked setting, not an ordinary way of playing. Consequences:
  - The header element shows the `Connect controller` button until either a controller has
    actually connected (then the neutral status badge, as D47) or permission has been refused
    (then an error-toned badge). A failed attempt with no device found leaves the button as it
    is, since trying again is the natural next step there.
  - D47's "no connection state ever uses `--color-error`" rule is narrowed: it still holds for
    no MIDI support, no device found, and ordinary no-controller play. Permission refused is the
    one exception. How a mid-session disconnect is shown is **not** settled by this entry (see
    Q23). The "nothing ever marked wrong" rule for the player's own playing is unaffected: this is
    about a browser setting, never about a note.
  - The permission-refused sheet copy has to tell the player how to allow MIDI again in the
    browser, rather than offering a retry that cannot work on its own.

- **D49 (2026-09-27).** Keyboard and focus rules for the controller-connection sheet, and the
  scope of assistive-technology work, answering `ux-critic`'s accessibility findings. User's call:
  - **Screen-reader users are not a design target.** Blind players are outside the product's
    audience, so no v2 screen or state is designed around spoken announcements.
    "Announced" in these docs means a **clear visible message**. The visually hidden live regions
    v1 already ships stay as they are (no removal work), and a new screen may reuse that existing
    pattern where it costs nothing, but no v2 finding is ever blocked on screen-reader behavior.
  - **Keyboard (computer keyboard) and mouse users are the target.** In `device-picker`, arrow
    keys only move between devices; Enter or Space (or a click) chooses one. Arrow keys never
    commit a choice.
  - **Focus.** When the sheet moves to a new state, focus goes to that state's main action,
    inside the sheet. When the sheet closes, focus goes to the workspace's Start/Stop button
    rather than back to the header element that opened it: the player is most likely about to
    play, and Start/Stop is the one control that matters then. That is also the fallback
    whenever a focus target is unclear.
  - States that were only conveyed to a screen reader ("unsupported browser", a controller lost
    mid-session) must instead be conveyed by a clear, visible message.
  - A colour is never the only signal: the error-toned permission-refused badge (D48) and any
    status dot always carry words as well, for colour-blind players.

- **D50 (2026-09-27).** Transposition-check result wording, within the three existing instrument
  profiles (C MIDI keyboard, B-flat tenor saxophone, E-flat alto saxophone). Remembering a detected
  offset or adding a custom "my instrument" profile is v3 scope, not v2. User's call to stay on the
  three; the wording rules are `ux-writer`'s:
  - Every mismatch result states the **direction** (the controller sounds higher or lower than the
    current profile expects) and **names the current profile**.
  - The distance is given in semitones, with the octave breakdown added when it is 12 or more
    ("14 semitones — 1 octave and 2"). An exact whole number of octaves is described in octaves.
  - The first suggestion is always the controller's own setting (its transposition, or its octave
    setting for a whole-octave shift). A different profile is suggested only when one of the other
    two profiles would make the played note match, and then framed as "if you actually play
    that instrument", naming it. For a whole-octave shift no profile can match, so the controller's
    octave setting is the only suggestion.

- **D51 (2026-09-27).** How a controller lost mid-session is shown, under spec D112/D114
  (visible unplug; 30 seconds to reconnect, counted from the unplug itself whatever came before,
  or the session ends). User's call: a banner in the theme's error tone above the staff, with a
  **live countdown** ("Controller disconnected — plug it back in to keep playing. Session ends in
  23 s."). It sits in space kept free for it, so it never pushes the staff or shifts what the
  player is reading. It disappears the moment the same device reattaches (automatically, with no
  new check), and the session carries on. If the countdown reaches zero, the session ends exactly
  as a silence timeout does. The phrase keeps rolling at tempo throughout, and notes due while the
  controller is away simply stay unlit, like any unplayed note. This replaces the neutral
  "No controller" treatment D47 gave a mid-session loss. Because an error colour is never the only
  signal (D49), the words carry the state on their own.

- **D52 (2026-09-27).** Starting a session from the controller, under spec D115 (only phrase 1's
  first note starts a session). User's direction, for the session core-loop unit to design in
  full:
  - During the one-measure count-in, the beat count is **shown on screen**, in time with the
    click (one number per beat of the 4/4 measure), and the whole first measure of phrase 1 stays
    fully visible the entire time. The player then plays phrase 1 from its first note, on beat 1.
  - A neutral, always-visible line says which note starts the session. It identifies the exact
    note, octave included (the note on the staff, not just its letter name), since only that
    exact note starts anything. A different note still changes nothing on screen.

- **D53 (2026-09-27).** The header `controller-status` element during a running session, as a
  direct consequence of spec D113/D123 (a controller connects only between sessions; a lost
  controller reattaches by itself, with no second check). Closes ux Q23 together with D51. D47 had
  made the element clickable at all times, including mid-session, to reconnect, switch device or
  re-run the check; none of those can happen during a session any more. So, while a session is
  running, the element is a **status display only**: the badge is not clickable, and the
  `Connect controller` button (a session started without a controller) stays in place but
  disabled, so the header never shifts. It becomes interactive again at Idle and in the Review.
  While a lost controller's 30-second countdown runs, the badge shows the disconnected state in
  the same error tone as the D51 banner, with words, and returns to the connected badge when the
  device reattaches.

- **D54 (2026-09-27).** Execution details of the unit-1 fix pass (controller connection), made by
  a `ux-writer` delegate as direct consequences of D47–D51, D53 and spec §6/§8 (spec D111–D124).
  None changes a settled decision; the three genuinely new behaviors are logged as Q26–Q28 for
  confirmation instead of here.
  - `device-picker` is a group of plain buttons with one roving tab stop, not a `radiogroup`:
    under D49 arrow keys only move and Enter/Space/click chooses, which a radio group's
    "arrow selects" convention would contradict. `is-selected` now marks only the device in use
    when the picker is reached from Connected, with the visible words "(in use)".
  - The visually hidden `connection-status` region is dropped: under D49 it was not free (a
    second copy of every state's wording to keep in step), every state is already conveyed by
    its visible title and body, and the dialog is named by its title.
  - Focus on each state change goes to that state's main action (D49); states with no labeled
    action (Requesting access, the check's Prompt) send it to `sheet-close`, since focus must
    stay inside the modal. Connected gets an explicit `Done` primary action (D47's "a close
    action"), so it has a main action to focus.
  - Permission denied uses `inline-alert alert-error` inside the sheet as well as the header's
    error-toned badge (D48), with `Check again` worded as the step after changing the browser
    setting. The header shows the MIDI-blocked badge from the moment that state is reached,
    until a later request succeeds.
  - Following spec §8's definition, the header shows the connected badge from the moment a
    device is selected and its port open (on entering the check), not only after a check result;
    dismissing during the check leaves the controller connected but unchecked.
  - Check-result copy (D50): distance in brackets after the semitone count ("14 semitones
    (1 octave and 2)") rather than after a dash, for readability inside a sentence; the full
    offset → suggested-profile table is written into the screen handoff.
  - Tier 2: plain `.btn` gets a real neutral surface, border, hover, active and explicit
    `:focus-visible` (v1 only ever shipped `btn-primary`, so the plain button had no visible
    chrome); `:disabled` and `is-loading` are split (`not-allowed` vs `wait`). New:
    `.sheet-body`, `.sheet-hint`, `.check-note` (with the same theme recoloring as the staff),
    `.controller-status.is-badge`/`.is-error`, `.controller-status-label`, `.status-dot.is-error`,
    `.session-alert-slot`, `.session-alert`, `.session-alert-countdown`; tokens
    `--controller-status-label-max-inline-size`, `--session-alert-slot-block-size`, and a dark
    value for `--color-scrim`. `.sheet-actions` stacks by default and becomes a row from
    bp-tablet-landscape; the stray `.sheet` inline margin at 48rem (which overflowed the
    backdrop) is removed; `.sheet` scrolls vertically inside itself on short viewports.

- **D55 (2026-09-27).** Closes ux Q28 and ux Q26 on the user's go-ahead ("ok, go ahead") to the
  proposals put to them:
  - **Q28:** the proposed device-change behaviors while the connection sheet is open are
    confirmed as written in `screens/controller-connection/handoff.md` ("Device changes while
    the sheet is open"): No device found moves on by itself when a device is plugged in; the
    picker adds and removes devices live; unplugging the device being checked or already
    connected returns to the picker or No device found with a "{device} was unplugged." line,
    never switching device by itself. Their (proposed) tags come off.
  - **Q26:** between sessions, an unplugged controller's selection survives: the same device
    plugged back in reattaches by itself, with no new transposition check, exactly as it does
    mid-session. A different device goes through the sheet. While it is away, the header shows
    the neutral no-controller badge (not the error tone, which is reserved for a mid-session
    unplug). This extends spec D123 to Idle and the Review, so it is passed to `spec-writer` to
    record on the spec side.

- **D56 (2026-09-27).** Settles two points `ux-critic`'s re-run on the controller-connection unit
  found inconsistent:
  - **The header badge keeps one width in every form.** Its label area has a fixed inline size (a
    named token), sized for the longest fixed label ("Controller disconnected"); a longer device
    name is truncated with an ellipsis, and its full name stays available on hover and in the
    sheet. Changing between a device name, "No controller", "MIDI blocked" and "Controller
    disconnected" then never moves anything else in the header, at any breakpoint. This makes the
    "the header never shifts" promise hold, not only at session start.
  - **The header never goes back to the `Connect controller` button once a controller has
    connected in this page session.** After MIDI access was blocked and later allowed again, the
    header shows the connected badge if a device is now connected; if none is, it shows the
    no-controller badge when a controller had connected earlier in the page session, and the
    `Connect controller` button only when none ever had.
  Also records that the controller-connection flow serves two persona goals, which its intent
  document must name: P1.G2 (real-time reading) and P2.S1 (a steady supply of material at a rising
  tempo), both from `specs/personas.md`.

- **D57 (2026-09-27).** Closes ux Q29 (mirrors spec O85): the user accepted both proposed
  defaults. (1) A Start click while the selected controller is unplugged begins a no-controller
  session; plugging that device back in during the session does not reattach it, and it
  reattaches by itself once the session ends if still plugged in. (2) A controller lost
  mid-session and still away when the session ends keeps its selection into the Review, like any
  controller unplugged between sessions. The "(proposed)" tags on these two cases come off.
  Passed to `spec-writer` to close spec O85.

- **D58 (2026-09-27).** Closes ux Q30 (the selected controller unplugged while the connection
  sheet is open), and records execution details from the unit-1 second fix pass.
  - **Replug inside the open sheet.** The same device plugged back in while the sheet is still
    open reattaches with no new check if it had already reached Connected (its check was done, so
    spec D125's "no new check" applies), and the sheet returns to Connected. If it was unplugged
    during the check, the check starts again, since it never finished. Closing the sheet without
    choosing another device keeps it as the selected controller, so a later replug reattaches it
    by itself. This refines Q30's proposed default, which would have re-run a completed check.
  - **Execution details.** The badge label token D54 named is now
    `--controller-status-label-inline-size`, a fixed width sized for "Controller disconnected"
    (D56). The disconnect banner's copy sits in a single `session-alert-text` run so the countdown
    stays inside its sentence. The blocked-permission label is "MIDI access blocked", the tier
    docs' wording, not D56's shorthand "MIDI blocked".
  - **Accepted.** Switching between the `Connect controller` button and a badge can still change
    the header element's width, but only between sessions (first connection, permission blocked
    or lifted), never while the player is reading a running session. No fixed width for the whole
    element.

- **D59 (2026-09-27).** Closes `ux-critic`'s third-pass findings on the controller-connection
  unit. (1) The flow intent's two session-edge cases are stated as settled (they were closed by
  D57). (2) D58's in-sheet replug rule wins over the general device-change rules for the device
  that was just unplugged; the flow diagram gains the replug edges and the general rules say they
  apply to new devices only. (3) A late "block" answer to a browser permission prompt left waiting
  when the sheet was closed changes the header to the MIDI-blocked badge only between sessions;
  during a running session (count-in included) the change waits until the session ends, keeping
  D53's "the header never changes shape during a session" true. A narrow confirmation pass then found two
  placement slips in these edits (a scoping sentence attached to the wrong bullet; the flow
  intent's summary still stating the new-device rule without the replug exception); both fixed.
- **D60 — Released versions live frozen in `versions/<version>/`; the root is work in progress
  (2026-09-28, user direction).** `versions/v1/` holds the v1 design exactly as it shipped: the
  tier documents taken from the `v1.0` tag, with the phrase-workspace handoff at the one
  post-tag correction that aligned it with shipped code (`d0a831c`), plus the mockup and its
  frozen `ui_common.css`, moved there because they are v1-only artifacts. Its `README.md` summarizes
  the v1 decisions worth keeping, with links into those documents. The working record stays in
  `archive/v1/`. Everything else at the `ui_ux/` root is work in progress toward the next version
  and stays cumulative: it specifies the whole interface, old behavior included, rather than only
  the next version's additions, so nothing built earlier can be broken for lack of a spec. When a
  version's design is approved, a copy goes into `versions/<version>/`. The user's concern with a
  cumulative root — an implementer should not have to read every page to find what changed — is
  to be answered by highlighting what each version adds, changes and removes; that convention is
  being settled separately. One inbound reference is left for `coding-leader`: the comment in
  `src/notation/notation-layout-policy.ts` still names `ui_ux/ui_common.css` (application source,
  not edited here).
- **D61 — Change marking for the version in progress (2026-09-28, user-confirmed; completes
  D60).** Every root tier document that differs from its copy in the latest `versions/` folder
  opens with a "Changes since v1" block (New / Changed / Removed, one line each, linking to the
  section; in a document without headings, pointing to the tagged paragraph, because the link
  checker rejects HTML anchors). The changed spot carries `**[v2 new]**` or `**[v2 changed]**` at
  the start of its section, list item, paragraph or table row, never mid-sentence; bracketed, so a
  tag stays distinct from a bullet's own bold label. In a code block or diagram the same words go
  in the element's annotation (`controller-status (v2 new; …)`); in the stylesheets
  (`src/styles/theme.css`, `components.css`) as comments, with a from-here/end pair around a long
  run of new blocks. Removals appear only in the block, linking to the frozen wording, never as
  struck-through text. A wholly new document carries `> **New in v2.**` only. The `versions/` copy
  keeps its marks; at the root they are cleared in one pass when design work on the next version
  starts. Applied 2026-09-28 to `strategy.md`, `screens/phrase-workspace/`, the four
  controller-connection documents and both stylesheets. The same convention was written into the
  shared agent definitions (`ux-writer`, `ux-critic`, `coding-leader`, in all three ports), the
  `ux-validate` and `milestone-archive` skills, and `doc-tree-conventions.md`, in the dev_team
  repo, at the user's request.
