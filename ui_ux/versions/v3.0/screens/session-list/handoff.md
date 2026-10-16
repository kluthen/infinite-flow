# Session List Handoff

> **New in v3.**

`sessions-panel` is the second level of the phrase-workspace page's review mode
(`screens/phrase-workspace/`): while the list shows, it is rendered inside `score-panel`, after
`score-toolbar`, in `review-panel`'s place, with every mode rule of the review
(`screens/last-session-review/handoff.md`): the staff area out of sight, `control-section` after
it, the session action reading `Close review`, no session starting. At most one of
`sessions-panel` and `review-panel` is rendered. Routing: `flows/kept-sessions/handoff.md`.

## Layout Tree

```text
layout-header                  (screens/phrase-workspace/; the session action reads Close review, primary; the phrase action is disabled)
layout-workspace
  score-panel                  (screens/phrase-workspace/)
    score-toolbar              (stays; score-title not rendered; mix-controls usable)
    sessions-panel             (section, aria-labelledby the list's title; rendered only while the list shows)
      sessions-header
        h2 review-title        (tabindex -1: "All sessions")
        btn                    ("Your data"; opens screens/your-data/)
      sessions-intro           (p)
      session-list             (ol; when at least one session is kept)
        session-row x n        (li, newest first)
          (text column)
            h3                 (no class of its own; carries the row's title button)
              btn session-row-open ("{session date}", plus " · Last session" on the most recent session's row)
            session-row-meta   (p: the detail line)
            session-row-meta   (p: the status line)
            session-row-comment  (p; only when the session has a comment)
            session-row-note     (p; in place of session-row-comment when the row cannot be opened, or failed to open)
          session-row-actions  (not rendered when it holds no button)
            btn                ("Pin" or "Unpin"; absent on a row saved by a newer version)
            btn                ("Delete"; absent in an outdated tab)
      sessions-empty           (p, in place of session-list when no session is kept)
    (generation-failure banner, session-cue-row: hidden; staff-viewport is-out-of-sight and inert, as while a review shows)
  control-section              (screens/phrase-workspace/; stays, fully editable)
```

## Components and Content

- `sessions-panel`: `review-panel`'s surface. No state classes of its own; rendered while the
  list shows, and not otherwise. Appears and goes with no animation.
- **Title.** `h2` with `review-title` (the review's title style, focus ring included) reading
  "All sessions", `tabindex="-1"`: a focus target, never in the tab order.
- **`Your data`.** A plain `btn` at `sessions-header`'s inline end; opens the Your data sheet
  (`screens/your-data/`). When the sheet closes, focus returns to it.
- `sessions-intro`: "Your most recent session is kept until your next one is saved. Pin a
  session to keep it for good."
- **Session date.** As defined in `flows/kept-sessions/handoff.md`, Terms: the session's start in
  local time with the browser's locale (short weekday, day, short month, year, hour, minutes).
- `session-row-open`: the session date; on the most recent session's row followed by
  " · Last session" (U+00B7 with a space each side), inside the button. Its accessible name is its
  text. Activation opens the session (`flows/kept-sessions/handoff.md`, Opening a Session).
- **Detail line** (`session-row-meta`): "{length} · {n} phrases · {instrument} · {profile}".
  {length}: whole minutes, "{m} min", rounded to the nearest minute, "Under 1 min" below 30
  seconds. {n}: "1 phrase" when one. {instrument}: the instrument the session was played with, by
  the name it had then (a built-in profile's label as the instrument control writes it, or my
  instrument's name). {profile}: the musical profile at the session's start as `control-summary`
  writes it (`Neutral`, `Jazz`, or `Custom ({grammar} grammar)`).
- **Status line** (`session-row-meta`): "{favorites} · {played notes} · {keeping}", where
  {favorites} is "No favorites", "1 favorite" or "{k} favorites"; {played notes} is "Played notes
  kept", present only when the session's played notes are kept; {keeping} is "Pinned" or "Not
  pinned: deleted when your next session is saved."
- `session-row-comment`: the comment, its line breaks shown as spaces, cut to one line with an
  ellipsis by the class.
- `session-row-note`: "This session was saved by a newer version of the app. Reload the page to
  open it." on a row saved by a newer version; "This session couldn't be opened. Try again, or
  delete it." on a row whose opening failed, until it opens ("This session couldn't be opened.
  Try again." in an outdated tab, which offers no deletion). A failed opening means the device
  refused or failed the read, or the session was deleted meanwhile in another tab; a damaged
  session leaves the list instead (States), except in an outdated tab, which deletes nothing and
  shows this note for it too.
- **`Pin` / `Unpin`.** A plain `btn` reading "Pin" on an unpinned row, "Unpin" on a pinned one;
  accessible name "Pin session {session date}" or "Unpin session {session date}" (the visible
  word first). Behaviour and confirmation: `flows/kept-sessions/handoff.md`, Pin and Unpin.
- **`Delete`.** A plain `btn` reading "Delete"; accessible name "Delete session {session date}".
  It opens the confirmation; it is never `btn-error` itself (`btn-error` is the confirmation's
  deleting action only). Behaviour: `flows/kept-sessions/handoff.md`, Deleting a Session. Absent
  on every row in an outdated tab (`flows/kept-sessions/handoff.md`, While Saving Is Off).
- `sessions-empty`: "No sessions are kept. Your next session will be kept here." When saved data
  cannot be used this visit: "Kept sessions can't be read in this visit."
- No row, line or count shows how the player played.

## Focus and Keyboard

- Tab order while the list shows: the header (`controller-status`, `theme-control`, the disabled
  phrase action skipped, `Close review`), `mix-controls`, `Your data`, then each row in order
  (`session-row-open`, `Pin`/`Unpin`, `Delete`, each when shown; a disabled `session-row-open`
  skipped), then
  `control-section`, then the page footer.
- Focus on arrival, after an opening, a pin, an unpin, a deletion or a closed sheet: as set in
  `flows/kept-sessions/handoff.md`. In short: the list's title when the list is reached from the
  cue row or after a review's deletion; that session's `session-row-open` when coming back from
  its review; the next row's `session-row-open` (else the previous, else the title) after a row's
  deletion; the pressed button after a pin or unpin; the opener after a sheet's way back.
- Rows are not focusable themselves; no arrow-key navigation between rows (Tab moves through
  them).
- No global shortcut opens or leaves the list.

## Responsive Behavior

- At `bp-tablet-landscape` and `bp-desktop`: each `session-row` is a two-column grid, the text
  column at the inline start and `session-row-actions` at the inline end; `sessions-header` holds
  the title and `Your data` on one row, wrapping when they do not fit.
- At `bp-mobile-landscape` (below `bp-tablet-landscape`): `session-row-actions` drops under the
  text column, aligned to the inline start; `Your data` wraps under the title when needed. Every
  row keeps every line and every button it has.
- `sessions-panel` takes the full inline size of `layout-workspace` at every breakpoint; no side
  rail. The list never scrolls inside itself: the page scrolls.
- Every visual value comes from the token source (`src/styles/theme.css`,
  `src/styles/components.css`); this handoff declares none.

## States

- **Absent:** the list is not showing (idle, a session, a review showing).
- **Showing, with rows:** `session-list` with one `session-row` per kept session whose summary can
  be read (a session saved by a newer version included), newest first. A session whose summary is
  damaged has no row, saving on or off, nor has a damaged one left unlisted for the visit after the
  device refused to delete it; `sessions-link` shows only while there is at least one
  row.
- **Empty:** `sessions-empty` in place of `session-list`; `sessions-header` and `sessions-intro`
  stay.
- **Loading:** none for the list: what the rows show is read with the saved settings at load and
  kept current, so the list shows at once. Opening one session: its `session-row-open` takes
  `is-loading` and `disabled`; nothing else changes.
- **Error, per row:** a row saved by a newer version (`session-row-open` disabled,
  `session-row-note`, no `session-row-actions`: such a row is met only in an outdated tab, which
  pins and deletes nothing of it; the detail and status lines show what can be read and are
  omitted otherwise, the title falling back to "Saved by a newer version" when the date cannot be
  read); a row whose opening failed (`session-row-note`, the title enabled).
- **A damaged session opened from its row** (saving on): `session-row-open` keeps `is-loading`
  until the session's deletion settles; then the row leaves, focus moves as after that row's
  deletion (the next row's `session-row-open`, else the previous row's, else the list's title
  over `sessions-empty`), and the notice row shows the apology, or the save-problem notice if the
  device refused the deletion (`flows/kept-sessions/handoff.md`, A Damaged Session). When it was
  the most recent session, " · Last session" moves at once to the readable kept session that
  started last (unlike the player's own deletion of the most recent session, after which no row
  carries it until the next session ends with a review). The list shows no line of its own
  about it.
- **Outdated tab:** every row without `Delete`, from the moment the tab is outdated; the rest of
  each row as in its own state. Focus on a `Delete` that leaves, or in its open confirmation, goes
  to the list's title (`flows/kept-sessions/handoff.md`, While Saving Is Off).
- **Error, the whole list:** saved data that cannot be used this visit: the empty state with its
  second sentence (see Components and Content).
- **A confirmation open:** the list stays under the sheet's backdrop, unchanged.
- **Review code not loaded:** the list ships with the review's code; as for the review, a failed
  load draws nothing in the staff area's place, `Close review` works, and the next show tries
  again.
- **Theme change:** recolours the panel at once.
- **Portrait below `bp-desktop`:** hidden with the whole workspace behind `orientation-notice`,
  shown again in landscape.
