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

- **D62 — Context of use for v2 (2026-09-28, user-confirmed; input to the `strategy.md` persona
  pass).** The product owner confirmed the playing conditions the strategy designs for: a laptop or
  desktop in Chrome or Edge as the main device; a tablet on the music stand as a good candidate
  (their own is an older iPad Pro); a landscape phone (Samsung Galaxy S20 FE) occasionally, outside
  with the Travel Sax, accepted as "probably not ideal". The screen is read at music-stand distance,
  often standing. During a session both hands (and the mouth, on sax or Travel Sax) are on the
  instrument: nothing mid-session may require a click or key press. Between sessions the hands are
  free, so controls need **no enlargement beyond the existing accessibility floor** (44px minimum
  targets): the owner explicitly asked not to design oversized buttons for distance. Sessions run
  about 5 to 30 minutes, alone, at home. Backing and click level balance is a real problem the
  owner cannot quantify yet; it needs listening tests (see Q31). These facts belong in
  `specs/personas.md`; to be passed to `spec-writer`. The tablet candidate collides with spec
  v2's Chromium-only scope (see Q32).

- **D63 — No iPad (WebKit) support in v2 (2026-09-28, user-confirmed; closes Q32).** The product
  owner places the wider browser scope (Chromium, Firefox, Safari) at v4 or v5. For v2 the iPad
  gets no dedicated design: it is outside the supported browsers, and the controller-connection
  sheet's existing Unsupported browser state is what it shows. The tablet in the context of use
  (ux D62) therefore means a Chromium tablet for v2. Noted to the owner: supporting Safari does
  not by itself bring controllers to the iPad, since WebKit has no Web MIDI; what would is Apple
  shipping it, or the roadmap's microphone input (v5+). To be recorded by `spec-writer` with ux D62.

- **D64 — The phone's Review is the plain baseline (2026-09-28, user-confirmed; closes Q33).** On
  the phone layout the Review keeps the functions the v2 spec gives it on every device, and nothing
  more, with the least information and annotation the space allows: no phone-specific tooling.
  Richer review tooling, if it comes, belongs to the tablet and desktop layouts; the owner cites
  selecting a passage to replay, and showing what was expected against what was played on the same
  measure, as later possibilities (future scope, for `spec-writer`). A player who wants a real
  review of a phone session exports it and moves device. The owner places an import that reopens an
  exported session for review as a "maybe, not before v6", mainly for the Fledgling Composer (P3);
  passed to `spec-writer` for the roadmap. Applied to `strategy.md`, trade-offs (phone and larger
  screens).

- **D65 — Persona trade-offs confirmed (2026-09-28, user-confirmed; completes the `strategy.md`
  persona pass).** The review appears between sessions only, is mainly about the last session, and
  starting the next session is one action away from it. Acknowledgement is quiet and sits on the
  notes themselves; a missed note produces nothing. Comparing played against expected, whenever it
  comes, offers no judgment. The owner restated that v2's review is the plain review the spec
  defines; later review tooling (replay a selection, pinning or commenting on sessions) is not v2.
  Applied to `strategy.md`, trade-offs.

- **D66 — Export by content: generated or played (2026-09-28, user-confirmed; closes Q34).** Getting
  what was played out of the app matters to the owner. The export offers the generated notes
  (MusicXML or MIDI, as the spec has them) or the played notes (MIDI only, unquantized, since
  played timing cannot be engraved faithfully); both at once means two separate files. This
  changes the v2 spec's export (§7), where played notes were an opt-in track inside the one MIDI
  file; passed to `spec-writer`. Governs the export part of the Review screen.

- **D67 — Keeping sessions is later than v2 (2026-09-28, user-confirmed; closes Q35).** v2 keeps
  the spec's ephemeral model: nothing survives a reload. The owner's ideas for later — storing more
  than one session only when the player asks (pinning), suitable access to older sessions, a
  comment on a session — are v3-or-later candidates, passed to `spec-writer`.

- **D68 — Two export buttons (2026-09-28, user-confirmed).** The Review offers one export action for
  the generated notes and one for the played notes. "Both" is simply using both, one file each,
  so no single action ever triggers two downloads (and no browser multiple-download prompt).
  Governs the Review screen's export; passed to `spec-writer` for spec §7's wording.

- **D69 — Favorites move to v3; the next session is one click from the Review (2026-09-28,
  user-confirmed).** The owner places marking favorites, and what counts as an exported favorite,
  in v3. In v2 the Review has no favorites, its export has no favorites-only scope, and starting
  the next session from it asks no confirmation. The Fledgling Composer's C1 is served in v2 by
  looking back at the last session, and marking by v3. Changes v2 spec §2, §7, §11 and spec O86;
  passed to `spec-writer`. Applied to `strategy.md` (problem alignment, trade-offs).

- **D70 — In a session only the staff and Stop are essential (2026-09-28, user-confirmed; narrows
  Q36).** Everything else on screen during a session (audio levels, tempo, status) is secondary and
  forgettable, apart from the exceptions already settled (the disconnect countdown). The owner
  floated letting the player remove everything else from the screen: carried as a proposed
  staff-only view (Q37). Applied to `strategy.md`, context of use.

- **D71 — The rolling display is two alternating staff systems (2026-09-28, user-confirmed; closes
  Q17).** During a session the staff area shows two systems, one above the other. The player reads
  one while the other, never the one being read, is refilled with what comes next; reading goes
  top, bottom, top, like a page. Each system holds what the layout already puts on one line: four
  measures where a phrase fits one system (desktop, tablet, and a phone wide enough), two measures
  on a phone that splits a phrase over two systems, so the phone keeps exactly the two systems it
  already uses and refills half a phrase at a time. A phrase always starts on the top system. The
  read-ahead is at least a whole phrase on large screens and two measures on the split phone layout
  (the spec asks for one). The system being played is marked by the playhead only; the other is not
  dimmed, since it is what the player reads ahead into. Refilling uses the existing phrase-
  replacement fade; nothing scrolls or shifts, so `motion.md`'s "never scroll the staff" stands. The
  idle workspace reserves the second system's space, so Start causes no layout shift. Rejected:
  replacing one system in place (no read-ahead), a scrolling strip or lines moving up (music moving
  under the eyes, hardest to follow from a stand). Governs unit 2; recorded in `strategy.md`,
  trade-offs.

- **D72 — Staff-only session view goes to v5 (2026-09-28, user-confirmed; closes Q37).** v2 has no
  staff-only view. With the unit-2 layout, everything on or near the staff during a session already
  belongs to the session, and hiding the audio mix would conflict with spec §5/§6 ("reachable at
  all times"). The owner places the idea in v5; passed to `spec-writer` for the roadmap.

- **D73 — The screen stays awake during a session (2026-09-28, user-confirmed; new behaviour for
  `spec-writer`).** A 5–30 minute session involves no touch (ux D62), so a tablet, phone or laptop
  would dim and lock mid-session. On a phone a locked screen hides the tab, which ends the session
  (spec §6). The app holds a screen wake lock from session start (Start click or starting note)
  until the session ends, and releases it at the end. If the browser refuses or lacks the lock, the
  session runs as normal, with no message (not worth pulling the eyes off the staff). The spec
  does not mention this; passed to `spec-writer` to record.

- **D74 — The count-in always clicks (2026-09-28, user-confirmed; for `spec-writer`).** The
  count-in's click sounds even when the player has turned the click off. It is the only thing
  that sets the tempo before bar 1. The click setting governs the session after the count-in.
  Clarifies spec §6 ("one measure of click"); passed to `spec-writer`.

- **D75 — The playhead is a minor, stepping measure band (2026-09-28, user-confirmed).** A quiet
  tint behind the measure being played. It steps at each barline on the audio clock and never
  glides; it sits behind the notes, so it never competes with acknowledgement. The owner wants the
  playhead minor. Rejected: a line gliding through the beat (music moving under the eyes, as D71
  rejected). `motion.md`'s "do not animate musical playback" becomes: the playhead steps measure
  by measure and never glides, and nothing else moves with the music.

- **D76 — The session cue row (2026-09-28, user-confirmed; closes Q27).** One row between the score
  toolbar and the staff, with a fixed block size and always present (Idle, session, Review). It
  replaces the session-only `session-alert-slot`. It holds one thing at a time: at Idle, with a
  controller connected and a phrase shown, the starting-note line; during the count-in, the beat
  count; during the session, nothing, or a notice (the disconnect banner takes priority over the
  "struggling" notice). Neither Start, the count-in nor a disconnect ever moves the staff. Accepted
  cost: an empty row at Idle when no controller is connected.

- **D77 — Wording correction to D71 (2026-09-28).** D71's "a phrase always starts on the top
  system" holds only on the split phone layout (bars 1–2 on top, bars 3–4 below). Where a phrase
  fits one system, whole phrases alternate between the top and bottom systems. The rest of D71
  stands.

- **D78 — The session flow's shape (2026-09-28, user-confirmed).** The session core loop is its own
  flow, `flows/play-session/`, on the same screen, `screens/phrase-workspace/`, as that screen's
  session states. D45's point (no separate session screen) stands; its "and its existing flow" is
  narrowed, since folding the session into `generate-phrase` would bury both flows' logic. The flow
  ends where the Review opens (unit 6). Units 3 (locked controls), 4 (acknowledgement) and 5 (audio
  mix) are folded into this unit.

- **D79 — Start and Stop (2026-09-28, user-confirmed).** Two fixed action slots end the header: the
  phrase action, then the session action. Primary emphasis sits on the next useful step:
  - Empty or initial generation error: phrase action primary (`Generate phrase` / `Retry
generation`); `Start session` secondary, disabled.
  - Phrase shown (Ready, or generation error over a retained phrase): `Regenerate phrase` / `Retry
generation` secondary; `Start session` primary.
  - Loading: phrase action disabled and loading; `Start session` primary, disabled until the new
    phrase lands (so phrase 1 is never ambiguous).
  - Notation error (staff blank): `Retry notation` primary; `Start session` secondary, disabled.
  - Unsupported rhythm combination: both disabled (spec DoD 11).
  - Session running, count-in included: phrase action disabled in place; the session action reads
    `Stop`, primary.
    `Start session` and `Stop` share one fixed inline size (new token), so the header never moves. A
    Start click leaves focus on the button, now `Stop`, so Space or Enter stops; no global shortcut.
    At session start, if the staff is not in view, the page jumps (no animation) to the top of the
    workspace, once, before the count-in.

- **D80 — Session-time workspace (2026-09-28, user-confirmed).** During a session: `controller-status`
  is display-only (D53); the theme control stays live; `tempo-readout` shows the tempo in effect.
  The controls below the score take the Loading state's read-only treatment for the whole session
  (full-strength values, read-only ring, no change accepted); an automatic change (v2.1+) updates
  the shown value with no highlight. The audio mix is never locked. The two staff systems are
  already reserved at Idle (D71), so nothing moves at Start.

- **D81 — Starting-note line and count-in (2026-09-28, user-confirmed; completes D52).** In the cue
  row (D76):
  - At Idle, with a controller connected and a phrase shown: "Play this note to start: {note}",
    the note in written pitch with its octave number (e.g. B♭4), neutral tone, `--text-md`. Phrase
    1's first attacked note carries a small accent-coloured start marker (a triangle above the
    note), which is what makes the octave unambiguous for a reader who doesn't use octave numbers.
    Line and marker are hidden when no controller is attached (including a selected controller
    that is away); the marker goes when the count-in starts.
  - During the count-in, either kind of start: four beat marks "1 2 3 4" at `--text-2xl`, each lit
    on its click on the audio clock (current strong, passed stay visible, upcoming muted). The staff
    is untouched, so bar 1 stays fully visible. On large screens phrase 2 fades into the lower
    system as soon as it is ready. After beat 4 the row empties and the playhead starts.

- **D82 — Refilling and acknowledgement (2026-09-28, user-confirmed; with D75, D77).** When the
  playhead leaves a system, that system clears at once (existing fast fade-out) and fills with the
  next material as soon as it is engraved (existing fade-in), so a glance never lands on the phrase
  just played. A failure-ladder repeat fills a system like any phrase, unmarked (spec D109). On a
  match, the expected note's notehead, stem, flag and own accidental switch instantly to
  `--color-note-ack` (new semantic token, an alias of the success green, differing from the staff
  ink in lightness as well as hue, at least 3:1 against the canvas in both themes); shared beams
  and ledger lines stay; a tied continuation lights with its attack; the note stays lit until its
  system is refilled. No animation. A missed or wrong note changes nothing, and the played note is
  never drawn.

- **D83 — Session notices (2026-09-28, user-confirmed; closes Q36).** Both live in the cue row. The
  disconnect banner (D51 wording unchanged): sentence at `--text-lg`, countdown "{n} s" at
  `--text-2xl`, bold, inline in the sentence; the only session text sized for music-stand distance;
  the row's block size fits it at `bp-mobile-landscape`. The "struggling" notice (spec §4 step 4):
  neutral `alert-notice`, "The generator is struggling with these settings.", from the second
  consecutive repeat until a freshly generated phrase starts sounding; no animation, never
  error-toned; the disconnect banner replaces it while the countdown runs.

- **D84 — Audio mix placement (2026-09-28, user-confirmed).** In the score toolbar's trailing end,
  always visible (Idle, session, Review), never over the staff, never locked: two toggle buttons,
  `Backing` and `Click`, their state in words ("on"/"off"); one `Volume` button opening a small
  popover with two sliders (Backing, Click), opened only by the player, closed by Escape or an
  outside click (the one element allowed to cover part of the staff). Same pattern at every
  breakpoint; on the phone the toolbar wraps the mix under the title. Defaults: click on (spec),
  backing on. **The volume sliders never reach silence:** off is the toggles' job, so the count-in,
  which follows the click volume and always sounds (D74), is always audible. Exact ranges and
  default levels wait on Q31. New Tier 2 components: `toggle-button` (`aria-pressed`),
  `range-input`, `popover`, each with a full state matrix.

- **D85 — Ending a session (2026-09-28, user-confirmed).** Stop, more than 30 s of silence, a
  disconnect countdown reaching zero, and a hidden tab all end the session the same way: backing
  and click fade out over about 100 ms, the playhead goes, the Review opens with no confirmation and
  no summary step. Focus goes to the session action, which reads `Start session` again. (v2.2: the
  tempo control resets to the session's starting tempo, spec §10.)

- **D86 — The backing volume may reach silence (2026-09-28, user-confirmed; narrows D84).** D84's
  "the volume sliders never reach silence" holds for the **click** slider only (it carries the
  always-audible count-in, spec D134). The **backing** slider's range goes down to silence: the
  player may mute the backing entirely, by its toggle or by its slider. D84 had extended the
  no-silence rule to the backing without the owner's confirmation; this corrects it.

- **D87 — No session starts over a generation error (2026-09-28, user-confirmed; closes Q38;
  changes D79).** While a generation-failure banner is showing, `Start session` is disabled, and
  the starting note starts nothing (the starting-note line is not shown), including over a
  retained phrase. The phrase shown is then primary as `Retry generation`. The player regenerates
  successfully first. So no error banner is ever on screen at Start and nothing shifts at Start.
  D79's "Phrase shown … or generation error over a retained phrase" row loses its generation-error
  case. Restricts when a session may start (spec §6/§7); passed to `spec-writer`.

- **D88 — A controller lost during the count-in (2026-09-28, user-confirmed; closes Q39).** The
  disconnect banner takes the cue row at once; the count-in keeps clicking; after beat 4 the
  session runs as in any disconnect (countdown from the unplug).

- **D89 — A session ended before phrase 1 sounds (2026-09-28, user-confirmed; closes Q40).** Stop,
  or a hidden tab, during the count-in returns straight to Idle with phrase 1 still on screen; no
  Review opens (there is nothing to review) and the previous Review, if any, is not restored.
  Touches spec §7 (what a session with no sounded phrase is); passed to `spec-writer`.

- **D90 — Orientation and resizing during a session (2026-09-28, user-confirmed; closes Q41).** At
  session start the app asks the browser to lock landscape orientation, and releases the lock at
  the end; a refusal is silent. If the device still turns to portrait mid-session, the session ends
  exactly like Stop. Any other viewport change keeps the staff layout chosen at Start (one system
  per phrase or the split layout) until the session ends. Noted to the owner: Chromium grants an
  orientation lock only in fullscreen, so on a phone in a normal tab the lock will usually be
  refused and the portrait rule is what applies in practice. Passed to `spec-writer` (a new way a
  session ends).

- **D91 — On a phone, a session shows the whole staff (2026-09-28, user-confirmed; closes Q42).**
  The phone is the tertiary display. At `bp-mobile-landscape`, when a session starts the page
  settles so the cue row and both staff systems are entirely visible; the header and the score
  toolbar may sit above the visible area. During a session, a compact `Stop` and the `Volume`
  button sit at the cue row's trailing end on the phone only, so Stop and the mix stay reachable
  (spec §5). Everything else is secondary, apart from the exceptions already settled (count-in,
  starting-note line, disconnect countdown, all in the cue row). Desktop and tablet are unchanged.

- **D92 — Focus when the connection sheet closes and Start is disabled (2026-09-28,
  user-confirmed; closes Q43).** Focus goes to the phrase action instead of the session action.

- **D93 — Three write-up behaviours confirmed (2026-09-28, user-confirmed).** Proposed by the unit-2
  write-up delegate, now settled: the starting-note line (and its start marker) shows only when
  `Start session` is enabled; the generation and notation status live regions stay silent for
  generation during a session; the "struggling" notice comes back after a disconnect banner leaves,
  if the generator is still struggling (the condition that raised it still holds).

- **D94 — A session ends when the staff can no longer be shown (2026-09-28, user-confirmed; closes
  Q46, answers spec O89; generalizes D90's portrait rule).** One rule covers every viewport change
  during a session: if the workspace would show the orientation notice (the viewport becomes
  portrait-shaped below `bp-desktop`, whether the device was turned or not — split screen, a
  resized window), or the held staff layout can no longer be engraved at the legibility floor in the
  new width, the session ends exactly like Stop (during the count-in, as D89). Otherwise, on any
  viewport change, both systems re-engrave at once at the new width with the layout chosen at
  Start (one phrase per system, or the split layout); a resize is the player's own manual action,
  so the redraw does not break the hands-free reading rule. Passed to `spec-writer` for O89 and the
  "too narrow" end.

- **D95 — Focus when the connection sheet closes with both header actions disabled (2026-09-28,
  user-confirmed; closes Q44; completes D92).** In Loading or under an unsupported rhythm
  combination, focus returns to `controller-status`, the element that opened the sheet (always
  interactive outside a session). Order of preference on close: the session action if enabled,
  else the phrase action if enabled, else `controller-status`.

- **D96 — Short disconnect wording on the phone (2026-09-28, user-confirmed; closes Q45).** At
  `bp-mobile-landscape` the disconnect banner reads "Controller disconnected. Session ends in
  {n} s." (the "plug it back in" clause is dropped as obvious), so it fits the cue row's two lines
  beside the compact session actions. Wider breakpoints keep D51's full sentence.

- **D97 — Five write-up choices confirmed (2026-09-28, user-confirmed).** From the D86–D92 pass:
  the phone settle scrolls the least distance that puts the whole cue row and `staff-viewport` in
  view, once and instantly; a phrase 2 already drawn clears with the fast fade-out when a session
  ends during the count-in; a controller reattaching during the count-in brings the count-in back
  into the cue row; the volume popover closes when the session ends; "portrait" means the viewport
  becomes portrait-shaped below `bp-desktop`, where the orientation notice would replace the
  workspace.

- **D98 — No session starts while the staff is not shown (2026-09-28, user-confirmed; answers
  spec O90; completes D94).** While the rotate-device notice replaces the workspace (portrait-shaped
  below `bp-desktop`), and while the held staff layout cannot be engraved at the legibility floor,
  the starting note does nothing and `Start session` is not reachable: a session started there would
  end at once under D94. Once the view can show the staff again, the idle start conditions apply as
  usual. Passed to `spec-writer` for O90.

- **D99 — Focus after a too-narrow end that lands in Notation error (2026-09-28, user-confirmed;
  narrows Q47).** When a session ended during the count-in by a too-narrow window leaves the
  workspace in Notation error, focus goes to the phrase action, `Retry notation`, per D95's order.
  The play-session diagram gains this branch. The end after phrase 1 (the Review over a staff in
  notation error) stays open under Q47 for unit 6. A rare, mostly desktop case.

- **D100 — A session phrase must fit the held layout; phones hold the split layout (2026-09-28,
  user-confirmed; closes Q48; corrects Q20).** Whether a phrase fits at the legibility floor depends
  on its content, so an in-session misfit can occur (Q20's "cannot occur" was wrong for fit). During
  a session, fitting the held staff layout at the legibility floor is part of what makes a
  look-ahead phrase valid: a phrase that does not fit is a failed attempt and takes spec §4's normal
  fresh-seed retries, exactly like one the generator could not find; only when every retry fails
  does the failure ladder repeat a phrase, as for any generation failure. The fit check is invisible
  to the player. The held layout no longer depends on phrase 1's content: below
  `bp-tablet-landscape` a session always uses the split layout (bars 1–2 on the top system, bars 3–4
  on the bottom); at `bp-tablet-landscape` and up it always uses one system per phrase. The idle
  layout rules are unchanged. Passed to `spec-writer` (§4 retries, §7 history).

- **D101 — The acknowledgement colour gets its own mid-tone green (2026-09-28, user-confirmed;
  closes Q49; amends D82).** `--color-note-ack` stops aliasing `--color-success`: acknowledgement is
  carried by colour alone, so it must differ from the staff ink by at least 3:1 in luminance
  (WCAG G183), and also clear 3:1 against the staff surface and `--color-playhead-band`, in both
  themes. Light `#128159` (3.71:1 ink, 4.28:1 canvas, 3.78:1 band); dark `#2d9a72` (3.32:1 ink,
  5.07:1 canvas, 3.45:1 band). `--color-success` is unchanged for text. No non-colour cue: a lit
  note is encouragement, not information the player needs to keep playing. The slim dark margin
  joins the listening/playing checks alongside Q31.

- **D102 — Phones always use the split layout, idle included (2026-09-28, user-confirmed; closes
  Q50; completes D100; changes v1's phone idle rule).** Below `bp-tablet-landscape` the staff is
  always engraved as two systems of two measures (bars 1–2 top, bars 3–4 bottom), at idle as in a
  session; the v1 "try one system first, fall back to two" rule no longer applies there. What the
  player sees before Start is exactly what they read during the session, so Start never moves a
  note (D71). The cost, a wide phone no longer showing a short phrase on one line at idle, is
  accepted because the phone is the tertiary display (D91). At idle a phrase that does not fit the
  split layout at the legibility floor still takes Notation error. At `bp-tablet-landscape` and up
  nothing changes. Replaces the proposed instant re-engrave of phrase 1 at Start.

- **D103 — Three re-engrave behaviours confirmed (2026-09-28, user-confirmed; from the D94 write-up,
  checked sound by `ux-critic`).** When a viewport change re-engraves both systems mid-session: notes
  already lit keep `note-ack` and `playhead-band` stays on the measure being played (both are
  reconstructable from the session history and the audio clock); the re-engrave is instant, with no
  fade, since a fade would blank the system being read (only a refill fades); and a session never
  shows the notation-error state (a layout that no longer fits ends the session under D94, a
  look-ahead misfit is retried under D100, and a repeat is the phrase just shown).

- **D104 — On a phone the staff is sized to the height too (2026-09-28, user-confirmed; closes
  Q51; extends D94 and D98).** Below `bp-tablet-landscape` the engraving scale is the largest that
  fits both the width and the height: `session-cue-row` and both staff systems (with the
  `staff-frame` chrome) must fit together inside the viewport, measured as the small viewport height
  (browser toolbars showing), so a toolbar hiding or reappearing never redraws the staff. The
  scale never drops below the legibility floor. v1's fixed minimum block size for `staff-frame`
  no longer applies there; the staff area's block size is set by that scale and is the same at idle
  and in a session (D102), so Start still moves nothing. If even the legibility floor cannot fit the
  height, the staff counts as not shown: no session starts (as D98) and a running one ends like Stop
  (as D94). At `bp-tablet-landscape` and up nothing changes. Passed to `spec-writer` (spec D138,
  D139: the "staff not shown" condition now includes height).

- **D105 — A viewport change re-checks material already waiting (2026-09-28, user-confirmed;
  closes Q52; completes D94 and D100).** On any viewport change during a session, the fit test
  covers the systems on screen and every piece of material already checked and waiting to be drawn
  (in the split layout, the next phrase's bars 3–4 or a repeated phrase's bars 1–2). If any of it no
  longer fits the held layout at the legibility floor, the session ends like Stop, as for any
  too-narrow change. A session therefore never shows the notation-error state.

- **D106 — What a misfit does to the struggling notice, worded exactly (2026-09-28; write-up
  correction found by `ux-critic`, consistent with D100 and spec D141).** A misfit that a retry
  fixes never counts toward the struggling notice. A repeat counts whatever caused its failed
  attempts, misfits included. The intents must not claim a misfit can never raise the notice.

- **D107 — When the staff has no room, say so plainly (2026-09-28, user-confirmed; closes Q53;
  changes v1's too-narrow idle behaviour).** Some screens simply cannot show the staff, and that is
  accepted. When the reason is space (a window too narrow, or below `bp-tablet-landscape` a
  viewport too short for the legibility floor), the workspace shows a plain notice on the
  `orientation-notice` pattern, "The staff needs more room. Make the window larger.", with no
  action: it clears by itself once the staff fits. Start is unreachable while it shows (D98). The
  notation-error state with `Retry notation` is kept only for failures a retry can cure.

- **D108 — At idle, a phrase with too many notes to fit is regenerated (2026-09-28,
  user-confirmed; extends D100 to idle; changes v1's idle behaviour).** When the space would fit a
  phrase but this phrase's content does not (its notes need more width than the legibility floor
  allows), the app quietly generates a new one with the normal fresh-seed retries, as in a session,
  instead of showing the notation error. Only when every retry fails does the workspace show the
  D107 notice. Passed to `spec-writer`.

- **D109 — No `Sixteenth` note density on a phone (2026-09-28, user-confirmed; product rule passed
  to `spec-writer`).** Below `bp-tablet-landscape` the `Sixteenth` option of Note density is
  unavailable (shown disabled with a short reason), because it is the most likely cause of a phrase
  too dense to fit; if `Sixteenth` was chosen elsewhere, the phone generates with `Eighth`. This
  removes the main overflow case without banning sixteenth notes themselves: other settings (such
  as rhythmic variety) can still produce some. The phone is the tertiary display (D91), so the
  narrower choice is accepted. How this behaves when the viewport crosses `bp-tablet-landscape`
  (at idle, and during a session whose settings are locked) is written up as proposed, pending the
  owner.

- **D110 — The phone density rule follows the current screen size, even mid-session (2026-09-28,
  user-confirmed; settles D109's two proposed behaviours).** The effective Note density is derived
  from the current viewport: whenever the viewport is below `bp-tablet-landscape`, a stored
  `Sixteenth` generates as `Eighth`; above it, the stored choice applies again. This applies to the
  next phrase generated, at idle and during a session alike (a session's locked setting is the
  stored choice; the effective density is derived from the screen, and the owner does not expect a
  desktop window to be resized mid-session). A phrase already on screen or already checked for a
  refill is not regenerated for this reason; it stays if it fits (otherwise D108 at idle, D105 in a
  session). Replaces the proposed "fixed at Start" default. Passed to `spec-writer`: a session's
  history records the effective density each phrase was generated with.

- **D111 — Phrases keep their own engraving scale during a session (2026-09-28, user-confirmed;
  closes Q54).** Each phrase is engraved at the largest scale its own content allows within the
  fixed system positions, so two phrases on screen may occasionally differ slightly in size; nothing
  moves, since the system positions never change. Holding one scale for a session was rejected: it
  would shrink every phrase to fit the densest possible one, or reject more phrases. In practice the
  difference is rare (most desktop phrases reach the scale cap; on a phone the height sets the
  scale). Revisit if playing tests find it distracting.

- **D112 — Knock-on rules of the phone density rule (2026-09-28, user-confirmed; answers spec O91
  and O92; completes D110).** (1) Unsupported rhythm combinations are judged on the density actually
  generated with: below `bp-tablet-landscape` a stored `Sixteenth` counts as `Eighth`, so
  combinations blocked only because of `Sixteenth` are allowed there. (2) During a session, widening
  the viewport changes nothing: once a session generates as `Eighth`, it stays `Eighth` until it
  ends (the density may step down mid-session, never up); the stored choice applies again from
  Idle. (3) When the "staff needs more room" notice clears because the staff fits again, a new
  phrase is generated (not the last one shown). (4) The v2.1 settings mutation can never land on
  `Sixteenth` below `bp-tablet-landscape`: it treats it as unavailable. Passed to `spec-writer`.

- **D113 — The "needs more room" notice has one sentence per cause (2026-09-28, user-confirmed;
  closes Q57).** Not enough space at `bp-tablet-landscape` and up: "The staff needs more room. Make
  the window larger." Not enough space below `bp-tablet-landscape` (a phone cannot be made
  larger): "This screen is too small to show the staff." Space enough for a staff but every idle
  retry too dense: "These notes need more room. Make the window larger, or choose a lower note
  density." The idle retry count ("up to three fresh-seed retries, no carry-in") is already stated
  by spec D145.

- **D114 — The proposed detail sets for the phone density rule and the room notice are confirmed
  (2026-09-28, user-confirmed; closes Q55 and Q56; answers spec O94).** All details listed in Q55
  and Q56 stand as written in the phrase-workspace and play-session documents, including: the
  disabled `Sixteenth` segment's `field-note`; the substitution never clearing a musical profile
  preset; the read-only control showing the effective density in a session; `Regenerate phrase`
  staying enabled under the notice; focus to `room-notice` after a session ends on it; shrinking the
  window at idle may replace the phrase on screen; and a notice that clears while the rhythm
  combination is unsupported leaves the staff empty with the unsupported-rhythm alert until a
  setting changes (spec O94's default). The `(proposed)` tags on them are to be removed.

- **D115 — The no-room sentence follows the width breakpoint, desktop included (2026-09-28,
  user-confirmed; closes Q58).** A desktop window narrowed below `bp-tablet-landscape` gets the
  phone sentence, "This screen is too small to show the staff." Accepted: the notice only appears
  there when the window is extremely narrow or short (the split layout usually fits), and a desktop
  player reading "too small" enlarges the window anyway. The sentence keeps the engraver's width
  query, so it always matches the room rule that applied.

- **D116 — What clears the "these notes need more room" notice (2026-09-28, user-confirmed;
  closes Q59).** Anything that could cure it starts a fresh round of the idle fresh-seed retries
  automatically: widening the viewport, changing a setting (such as Note density), or
  `Regenerate phrase`, which stays enabled. The first phrase that fits clears the notice and is
  shown; if the round fails too, the notice stays. Narrowing the viewport never starts a round.
  Passed to `spec-writer` with spec O94's answer (D114).

- **D117 — Last detail answers of unit 2 (2026-09-28, user-confirmed; closes Q60 and Q61; answers
  spec O95).** (1) spec O95, option (b): a blocked rhythm combination always shows the empty staff
  with the unsupported-rhythm alert, whatever was on screen before, including when the "these
  notes need more room" notice is showing (the notice gives way; nothing is generated
  automatically afterwards, as spec D151). This replaces the write-up where that notice stayed
  beside the alert. (2) Q60: during a fresh round `room-notice` stays in the frame with the loading
  treatment; after a failed round `notation-status` reads the notice's sentence again. (3) Q61:
  under a generation-failure banner, the notice keeps the banner's rule: `Retry generation` is the
  primary action and `Start session` is secondary and disabled. Also to fix in the write-up: only
  a change to a setting the phrase is generated from starts a round (tempo, the audio mix and the
  theme do not), as spec D152 reads.

- **D118 — A wider window during a running round starts nothing (2026-09-29, user-confirmed).**
  While the "these notes need more room" notice shows and a round of fresh-seed retries is
  running, the window getting wider neither restarts that round nor queues another one. The round
  carries on (each remaining attempt is engraved at the window's size when it is drawn, as every
  engraving is), and if it fails the notice stays until the next widening, setting change or
  `Regenerate phrase`. Rejected: queueing one more round when the window grew during a round that
  then failed (every widening would visibly get an answer, at the cost of one more rule), and
  abandoning and restarting the round (needs a settle delay, since dragging a window edge fires
  many changes in a row). Accepted cost: a single widening that lands inside a round's brief run
  can look as if it did nothing; a player dragging an edge keeps widening after the round ends.
  A reading of spec D152, which says a wider window starts a round but not what happens during
  one; passed to `spec-writer`. Governs `screens/phrase-workspace/handoff.md`, States, **Needs
  more room** (too-many-notes clearing).

- **D119 — Working rules from the owner: minor calls, phones, and problems during a session
  (2026-09-29, user-stated).** (1) Minor design issues, including `ux-critic` findings that do not
  change a flow, a product rule or the session's behaviour as the player sees it, are
  `ux-writer`'s to settle at its best judgment and record here, without asking the owner. (2) The
  phone is not a main customer: where a phone case needs a call, the simplest acceptable
  behaviour is enough, and the larger screen wins any conflict (confirms `strategy.md`,
  context of use and trade-offs). (3) During a running session the player is never expected to
  interact. The one exception is a hard problem the player can fix, such as a controller
  disconnect, which shows its countdown. Any problem follows the default rule already applied:
  it ends the session exactly as Stop does, after the 30-second window if it can recover, or at
  once if not. This confirms the strategy's "hands and eyes during a session" and "interruptions
  end a session" rules and extends them to any case not yet listed. Applied to `strategy.md`,
  edge-case policy.

- **D120 — During a round, each attempt takes the density the window gives (2026-09-29;
  `ux-writer`'s call under D119; answers spec O96).** Each fresh-seed attempt of a round under the
  "these notes need more room" notice takes its note density from the window's width at the moment
  it is generated, as every generation does (the phone density rule follows the current window).
  If a crossing of `bp-tablet-landscape` during the round makes the rhythm combination unsupported
  (a widening with a stored `Sixteenth`), the round stops and the workspace shows **Empty** with
  the unsupported-rhythm alert, exactly where D117 (1) leaves a blocked combination; nothing is
  generated automatically afterwards. A narrowing below it steps the remaining attempts down to
  `Eighth` and the round carries on. Rejected: freezing the round's starting density (a second
  density rule, for a rare case on a secondary device). Passed to `spec-writer` to close spec O96.
  Governs `screens/phrase-workspace/handoff.md`, States, **Needs more room**.

- **D121 — A phrase that stops fitting under a blocked rhythm combination gives way to Empty
  (2026-09-29; `ux-writer`'s call under D119; closes Q62 with D120).** At idle, while the rhythm
  combination is unsupported, a phrase on screen that stops fitting the room (a narrowing, or one
  widening past `bp-tablet-landscape` that both switches to one system per phrase and makes a
  stored `Sixteenth` combination unsupported) is not drawn, and the workspace shows **Empty** with
  the unsupported-rhythm alert, as D117 (1) does when the too-many-notes notice meets a blocked
  combination; it no longer takes the too-many-notes notice. This replaces one detail confirmed in
  D114 (Q56's list): the notice's sentence offers two cures, neither of which can work while no
  phrase can be generated, whereas the alert names the actual block. A window with no room at all
  still shows the no-room notice, which is about the window and stays true. Q62 (b) is D120.
  Governs `screens/phrase-workspace/handoff.md`, Notation Contract, **Room for the staff**, and
  States, **Needs more room**.

- **D122 — A session start closes the volume popover (2026-09-29; `ux-writer`'s call under D119;
  from the third `ux-critic` pass on unit 2).** A session start, by the Start click or by the
  starting note, closes the `Volume` popover if it is open, whichever `Volume` opened it. If focus
  was inside the popover, it returns to the `Volume` button that opened it, as Escape does;
  otherwise focus does not move. Reason: a popover left open over the top system would need a hand
  off the instrument to clear, which D119 (3) and the strategy rule out. Opened by the player
  during a session, the popover closes the usual ways only (Escape, a pointer press outside, Tab
  out): opening it mid-session is the player's own choice. The existing close at session end
  stays. Governs `screens/phrase-workspace/handoff.md` (`mix-controls`, States **Session
  count-in**) and `flows/play-session/handoff.md` (start).

- **D123 — On the phone, the on/off toggles stay a scroll away during a session (2026-09-29;
  `ux-writer`'s call under D119 (2); from the same pass).** The phone's compact set at the end of
  the cue row stays `Stop` and `Volume`. The `Backing` and `Click` toggles stay in the score
  toolbar, which can sit above the visible area during a phone session: still reachable by
  scrolling back up, so the mix stays reachable as the spec requires, just not on screen.
  Accepted because the phone is a secondary device and a session never needs the toggles.
  Rejected: adding the toggles to the compact popover (content that changes by breakpoint, for a
  secondary device). The intents' "Stop and the volumes are the only things up there the player
  may still need" is corrected to say so. Governs `flows/play-session/intent.md` (Starting, Audio
  Mix) and `screens/phrase-workspace/intent.md` (the phone and the window).

- **D124 — Each staff system is its own `staff-content` unit (2026-09-29; `ux-writer`'s call;
  from the same pass).** `staff-frame` holds the two system positions in every state, and each
  position that shows notes is one `staff-content` unit (its own engraving) holding its own
  `measure-slot`s: four in the one-system layout, two in the split layout. At idle in the
  one-system layout, the top position holds phrase 1 and the bottom one is reserved and empty; in
  the split layout, phrase 1 is two units, bars 1–2 on top and bars 3–4 below, drawn at the
  phrase's one scale. The fade, the refill and the engraving scale apply per unit, so a session
  start redraws nothing and each half can fade on its own. Replaces the first release's "one
  `staff-content` unit with exactly four `measure-slot` elements". Governs
  `screens/phrase-workspace/handoff.md` (Layout Tree; Components and Content).

- **D125 — Two audio-mix details confirmed as written (2026-09-29; `ux-writer`'s call under D119
  (1); from the same pass).** A volume slider stays adjustable while its channel is toggled off,
  and its level applies when the channel is switched back on; Tab moving focus out of the volume
  popover closes it. Their `(proposed)` tags go. The default levels and ranges still wait on Q31.
  Governs `screens/phrase-workspace/handoff.md`, `mix-controls`.

- **D126 — Stopped first retries go to Empty, even after `Regenerate phrase` (2026-09-29;
  `ux-writer`'s call under D119, confirming a write-up reading).** When the first fresh-seed
  retries of an idle generation stop because a crossing of `bp-tablet-landscape` made the rhythm
  combination unsupported, the workspace shows **Empty** with the unsupported-rhythm alert, even
  when the retries followed `Regenerate phrase` from **Ready** and the previous phrase was still
  shown during the Loading: that phrase goes too. Rejected: bringing the previous phrase back
  (it would need its own fit check at the new size, for a rare edge on a secondary device). Also
  confirmed from the same write-up: an attempt that finds no phrase during a Loading that showed no
  score lands in **Initial generation error**, since no phrase is kept. Governs
  `flows/generate-phrase/handoff.md` and `screens/phrase-workspace/handoff.md`, Notation Contract,
  **Room for the staff**.

- **D127 — One system-position size for every profile, sized for one profile's reach, the staff
  placed per profile (2026-09-29; `ux-writer`'s call under D119 (1) and (2); from the phone-height
  finding of build-plan chunk 3, "Notation layout v2").** Chunk 3 sized each system position at
  17.5 staff spaces (the notation layout's `NOTATION_SYSTEM_POSITION_UNITS`, 175, with the top
  line at 80), measured on real ink: the saxophones' highest ink, a chord symbol over written C6,
  about 7.2 spaces above the top line, and the C MIDI keyboard's lowest, written C3 with its ledger
  lines, about 8.5 below it. That is the union of two profiles' extremes, which no phrase reaches:
  the saxophones (written C4–C6) never go below the staff's first ledger line, and the keyboard
  (written C3–C5) never above the staff. Two positions at the 5 px floor then need 175 px, and with
  the fixed 142 px (cue row 96, gap 12, frame padding 2 × 16, border 2 × 1) a small viewport height
  of 317 px: a 360-px landscape phone with its toolbar showing (about 300 px) gets the no-room
  notice. Decided: the two positions keep one shared size, the same for every profile (so a profile
  switch never resizes the staff area, as before), equal to the tallest single profile's ink plus
  about one staff space at each end, `start-note-marker` included (D129); within it, the staff's
  top line is placed per profile, derived from its written range (never a per-profile table, so a
  future profile needs no new rule; one that needs more makes the shared size larger for all).
  From chunk 3's height calibration (`docs/notation-engraving.md`): saxophone ink spans about 12.8
  spaces (7.2 above the top line, 5.7 below), keyboard ink about 11.7 measured, 12.2 at C3's
  notehead (3.2 above, up to 9.0 below). So the position becomes 15 spaces (150 units), the
  saxophones' top line about 8.2 spaces from the position's top edge (82 units) and the keyboard's
  about 4.6 (46 units), to be confirmed by re-running the calibration with the start marker drawn.
  Acceptance bound: at most 16 spaces, so that, with D128, the phone keeps at least 10 px of
  margin at a 300 px small viewport height. Effect alone: 292 px needed (5.27 px per space at
  300 px, 6.27 at 330 px). Side effect from `bp-tablet-landscape` up, where positions are sized at
  the 12 px maximum: the frame goes from about 454 px to about 394 px (v1's `24rem` minimum is
  384 px; at `bp-desktop` the `28rem` minimum, 448 px, holds), so most of chunk 3's "about 70 px
  taller than v1" goes too. Rejected: a position size per profile (the frame would change size on
  a profile switch, for no gain on the default tenor saxophone, the tallest); tighter chord-symbol
  clearance over high notes (about 1.5 spaces at best on the saxophones only, crowds the melody,
  takes the start marker's room, and alone still needs about 302 px); a shared chord row between
  the systems (in the split layout each system has its own measures and chords, so both still need
  a row); lowering the legibility floor (the owner's, see Q63). Governs
  `screens/phrase-workspace/handoff.md` (Notation Contract, **System position size and staff
  placement**; Layout Tree) and `screens/phrase-workspace/intent.md` (Focal Point and Header).
  Needs, in the coding chunk: `src/notation/notation-layout-policy.ts` (position size, top line
  per written range), the engraver, the calibration test, `docs/notation-engraving.md`, and
  `docs/module_notation_layout_preflight.atom.md` (`documentalist`).

- **D128 — The phone's staff frame takes a smaller block padding (2026-09-29; `ux-writer`'s call
  under D119 (1) and (2); with D127).** Below `bp-tablet-landscape`, `staff-frame`'s block padding
  (top and bottom) drops from `--staff-frame-padding` (`--spacing-4`, 16 px) to a new token
  `--staff-frame-padding-block-phone` (`--spacing-2`, 8 px); its inline padding stays, since width
  does not limit the phone's staff. The phone budget subtracts the new token. Saves 16 px: the
  fixed cost goes from 142 to 126 px. With D127: two systems at the floor need 150 px, so 276 px
  of small viewport height; at 300 px the staff draws at about 5.8 px per space, at 330 px about
  6.8 px (at the 740 px and 844 px phone widths the width allows more, so the height sets the
  scale). If D129's check makes the position 16.5 spaces, 291 px is needed (5.27 px at 300 px).
  Rejected: a smaller cue row on the phone (`4rem` would save 32 px, but the disconnect banner
  would have to fit one line beside the compact `Stop` and `Volume`, shrinking the one session text
  D51 sizes for the music stand; kept in reserve, see Q63); taking the header or the score toolbar
  out during a session (they already sit above the view after the start jump, outside the budget:
  no gain); a smaller cue-row gap (4 px, not worth a phone-only rule). Governs
  `screens/phrase-workspace/handoff.md` (Notation Contract, **Scale below
  `bp-tablet-landscape`**; Responsive Behavior). The token is not yet in `src/styles/theme.css`:
  this pass proposes it for the coding chunk (see `todo.md`).

- **D129 — The start marker stays inside the top system position (2026-09-29; `ux-writer`'s call
  under D119 (1); found while sizing D127).** `start-note-marker` (D81) sits above phrase 1's first
  attacked note, clear of any chord symbol. Over a saxophone phrase that starts on a high note
  under a chord symbol, a marker above the chord symbol would reach beyond the position's headroom
  (already so with the 17.5-space position; chunk 3's calibration did not draw the marker, which is
  not implemented yet). Decided: the marker sits between the note's own ink and its chord symbol
  where they leave room, the chord symbol never moved for it, and above the chord symbol only
  where they do not; the shared position size (D127) allows for whichever the calibration finds
  tallest, and the calibration draws the marker. Governs `screens/phrase-workspace/handoff.md`,
  Notation Contract, **Start marker**.
