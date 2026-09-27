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
