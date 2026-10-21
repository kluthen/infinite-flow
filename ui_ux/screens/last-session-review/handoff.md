# Last Session Review Handoff

> **Changes since v2**
>
> - _Changed:_ a Review exists for every session that can be opened and is drawn from that
>   session as kept or held in memory ([Last Session Review Handoff](#last-session-review-handoff))
> - _New:_ `review-nav`, `review-keep-line`, `review-session-tools`, `review-comment`,
>   `review-scope`, `review-export-played`, `favorite-toggle`, and `Keep my played notes` and
>   `Delete played notes` in `review-view`; _Changed:_ `review-actions` leaves `review-header`
>   for a row of its own ([Layout Tree](#layout-tree))
> - _Changed:_ the title, the summary, Format, Backing track and the `Played notes` switch (now
>   saved), the export's file names and the played-notes export's content
>   ([Components and Content](#components-and-content))
> - _New:_ the keep line, the session tools, the comment, the scope, very short notes,
>   favorites, keeping and deleting played notes, and their confirmations
>   ([Components and Content](#components-and-content))
> - _Changed:_ the tab order and the focus moves ([Focus and Keyboard](#focus-and-keyboard))
> - _Changed:_ the phone drops the keep line (except its "Not saved" form) and the star's word,
>   and keeps every new control
>   ([Responsive Behavior](#responsive-behavior))
> - _Changed:_ Absent and not showing; _New:_ not saved, editing, the scope's and played notes'
>   unavailable states, a confirmation open, saving off, a change not saved, its session erased
>   through my instrument ([States](#states))
> - _Changed:_ each phrase drawn in the clef it was played in; _New:_ the room a phrase in another
>   clef gets ([Components and Content](#components-and-content))
> - _Removed:_ "Kept until the next session starts or the page is closed." from the summary;
>   Format, Backing track and `Played notes` "never stored, a reload resets it"; "Items in the
>   list hold nothing focusable"; the `review-link` details and its focus rule at a session start,
>   now in `flows/kept-sessions/` (v2 in
>   the [frozen copy](../../versions/v2/screens/last-session-review/handoff.md#components-and-content))
> - _v3.1 changed:_ the summary names the preset the session started with, where it named the
>   musical profile ([Components and Content](#components-and-content))
> - _v3.2 new:_ `review-doodle`, with `Jam again on this doodle` and `suggestion-row`, between
>   `review-view` and `review-list` in a Jam's review; _v3.2 changed:_ `room-notice` stands in for
>   it too ([Layout Tree](#layout-tree))
> - _v3.2 new:_ the doodle section, its played-notes lane, the key and mode suggestion about Jam's
>   key and mode, and `Jam again on this doodle`; the doodle loading with Jam's code, and the
>   section and the exports when it cannot load; _v3.2 changed:_ the summary begins with "Jam"
>   and names no preset for a Jam session, the raw doodle notes count as played notes, both
>   exports open with the doodle, and the played-notes confirmation of a Jam session says the
>   written-out doodle stays ([Components and Content](#components-and-content))
> - _v3.2 changed:_ the tab order gains the doodle section's buttons; _v3.2 new:_ focus after
>   `Jam in {answer}`, `Keep` and `Jam again on this doodle` ([Focus and Keyboard](#focus-and-keyboard))
> - _v3.2 new:_ the doodle and the suggestion at each breakpoint
>   ([Responsive Behavior](#responsive-behavior))
> - _v3.2 new:_ the review over either mode, a Jam's review, the suggestion's forms, the doodle
>   loading or unable to load, a Jam on the kept doodle, and the doodle under no room and while
>   saving is off ([States](#states))
> - _v3.3 new:_ seventh chord symbols in the phrases, and the files' chords
>   ([Components and Content](#components-and-content))

**[v3 changed]** `review-panel` is the phrase-workspace page's review mode
(`screens/phrase-workspace/`): while a Review shows, it is rendered inside `score-panel`, after
`score-toolbar`, in place of the staff area (the generation-failure banner and `session-cue-row`
hidden; `staff-viewport` out of sight but still laid out, see the Layout Tree), with
`control-section` still after it and `layout-header` unchanged except that its session action
reads `Close review`. The mode's other level, the session list (`screens/session-list/`), takes
the same place; at most one of the two is rendered. A Review exists for every session that can be
opened: the most recent session (from its end once phrase 1 has sounded, kept or held in memory
after a failed save) and every kept session. It shows at a session end, after
`Review last session`, and after a row of the list is opened. It is drawn from that session as
kept, or as held in memory; nothing in it reads the current controls. Flow and routing:
`flows/review-and-export/handoff.md`, and `flows/kept-sessions/handoff.md` for the list, the
cue-row links, pinning and deleting.

## Layout Tree

```text
layout-header                  (screens/phrase-workspace/; the session action reads Close review, primary, while the Review shows; the phrase action is disabled)
layout-workspace
  score-panel                  (screens/phrase-workspace/)
    score-toolbar              (stays; score-title not rendered while the Review shows; mix-controls usable)
    review-panel               (section, aria-labelledby review-title; rendered only while a Review shows)
      review-nav               (v3 new)
        btn                    ("All sessions")
      review-header            (v3 changed: the heading row; review-actions no longer inside it)
        review-heading
          review-title           (h2, tabindex -1: "Last session", or the session date; v3 changed)
          review-summary         (p; from bp-tablet-landscape up only; v3 changed)
          review-keep-line       (p; from bp-tablet-landscape up only; v3 new)
        review-session-tools     (v3 new)
          btn                    ("Pin" or "Unpin")
          btn                    ("Delete session"; absent while saving is off)
      review-comment           (v3 new; one of three states)
        -- collapsed, empty:  btn ("Add a comment")
        -- collapsed, filled: p (the comment), btn ("Edit comment")
        -- editing:           field-group
                                field-label ("Comment")
                                text-area
                                field-count ("{n}/500")
                                btn ("Done")
      review-actions           (v3 changed: a row of its own after review-comment; whole-session tools)
        review-scope           (v3 new; field-group)
          field-label          ("Export")
          segmented-control    (Whole session, Favorites only)
          field-note           (only while Favorites only is disabled)
        review-export          (role group, aria-label "Export generated notes")
          field-group          (Format)
            field-label        ("Format")
            segmented-control  (MusicXML, MIDI)
          btn toggle-button    (Backing track; aria-pressed; rendered only while MIDI is selected)
            toggle-button-state
          btn review-export-action ("Export generated notes")
          field-note           (v3.2 new; only while Export generated notes is disabled: a Jam session whose doodle could not load)
        review-export-played   (v3 new; role group, aria-label "Export played notes"; rendered only when the session holds a played note)
          btn toggle-button    (Include very short notes; aria-pressed)
            toggle-button-state
          btn review-export-action ("Export played notes")
          field-note           (only while Export played notes is disabled)
      inline-alert alert-error review-export-error (only after a failed export, of either content)
      review-view              (a row of its own after the export row; rendered only when the session holds a played note)
        btn toggle-button      (Played notes; aria-pressed; no aria-controls)
          toggle-button-state
        btn toggle-button      (Keep my played notes; aria-pressed; v3 new)
          toggle-button-state
        btn                    ("Delete played notes"; only when this session's played notes are kept, never while saving is off; v3 new)
      review-doodle            (v3.2 new; section, aria-labelledby its title; a Jam session's review only; replaced, with review-list, by room-notice while the staff has no room)
        review-phrase-header
          review-phrase-title  (h3: "Your doodle")
          review-phrase-tempo  ("{tempo} BPM": the tempo the doodle was played at)
          btn                  ("Jam again on this doodle"; at the row's trailing end, where per-phrase tools go; disabled only while the doodle loads or when it could not load, named by review-phrase-note)
        review-staff           (one system position from bp-tablet-landscape up; below it one, or two for a doodle of three or four measures; each followed by its played-notes lane while Played notes is on; all reserved before engraving)
          staff-content        (the quantized doodle: its measures at a phrase's measure width from the system's start; no chord-symbol)
            measure-slot       (one per doodle measure in this system position)
          review-phrase-note   (in place of staff-content while Jam's code loads, when it could not load, or when the doodle cannot be drawn)
          played-notes-lane    (as a phrase's, holding the raw doodle notes; empty in a Jam on the kept doodle; none while the doodle is not drawn)
            played-notes-divider
            played-note x n
        suggestion-row         (v3.2 new; one of offering, set, no fit; absent otherwise, and while the doodle is not loaded)
          p                    (the sentence)
          btn                  ("Jam in {answer}"; offering only)
          btn                  ("Keep {key} {mode}"; offering only; Jam's key and mode)
      review-list                (ol; replaced by room-notice while the staff has no room)
        review-phrase x n        (li, one per phrase that started sounding, in session order)
          review-phrase-header
            review-phrase-title  (h3: "Phrase {n}")
            review-phrase-tempo  ("{tempo} BPM")
            btn favorite-toggle  (v3 new; aria-pressed; at the row's trailing end, where per-phrase tools go)
          review-staff           (one system position from bp-tablet-landscape up, two below, each followed by its played-notes lane while Played notes is on; all reserved before engraving)
            staff-content        (one per system position: a whole phrase, or bars 1-2 then bars 3-4)
              chord-symbol
              measure-slot       (four per unit in the one-system layout, two in the split layout)
            review-phrase-note   (in place of staff-content when the phrase cannot be drawn -- see States)
            played-notes-lane    (div, role img; one under each system position, only while Played notes is on -- see Components and Content)
              played-notes-divider (a line at each barline between the lane's measures)
              played-note x n    (a bar per played note, very short notes left out, whose onset falls in this phrase, or the part of it in this lane)
      room-notice                (p, no tabindex; in place of review-list, and of review-doodle (v3.2 changed), while the staff has no room)
        room-notice-wide
        room-notice-narrow
    (generation-failure banner, session-cue-row: hidden while the Review shows; at idle session-cue-row holds review-link and sessions-link by their rules)
    staff-viewport is-out-of-sight (while the Review shows, also inert: laid out at its normal inline size so the staff still engraves and measures, but invisible, out of the accessibility tree and tab order, taking no block space)
  control-section              (screens/phrase-workspace/; stays, fully editable, while the Review shows)
sheet-backdrop                 (v3 new; only while a confirmation is open -- see Components and Content, Confirmations)
  sheet
```

## Components and Content

- `review-panel` is a surface panel like `control-section` (surface, border, radius, shadow,
  padding from the token source). It has no state classes of its own; it is rendered while the Review shows, and not otherwise.
- **[v3 new]** `review-nav`: one plain `btn` reading "All sessions", at the inline start. It shows
  the session list in the Review's place (`flows/kept-sessions/handoff.md`).
- **[v3 new]** **Order of the panel's rows.** `review-nav`, `review-header`, `review-comment`,
  `review-actions` (then `review-export-error` when it shows), `review-view`, then `review-list`
  or `room-notice`. The rows after `review-header` are separated from each other by
  `--spacing-3`.
- **[v3.2 new]** In a Jam's review, `review-doodle` comes after `review-view` (or after
  `review-actions` and `review-export-error` when `review-view` is not rendered) and before
  `review-list`, spaced from the first phrase as one `review-phrase` is from the next. A Jam
  session is a session begun in Jam mode whose phrase 1 sounded; a session kept before v3.2 is
  never one.
- **[v3 changed]** `review-title` reads "Last session" for the most recent session, and the
  session date (`flows/kept-sessions/handoff.md`, Terms) for any other. It carries `tabindex="-1"`
  so the links, the list and the deletions can move focus to it; it is never in the tab order and
  takes the `:focus-visible` ring.
- **[v3.1 changed]** `review-summary` reads "{session date} · {length} · {phrases} · {instrument} ·
  {preset} · {favorites}", the session date left out when it is the title. {length}, {phrases},
  {instrument} and {preset} are written exactly as in the session list's detail line, and
  {favorites} as in its status line (`screens/session-list/handoff.md`): the instrument by the name
  it had at the session, which may differ from the profile selected now, and the preset as the
  label the session recorded at its start ("Bebop", "Custom, based on Bebop", "Custom"), which a
  later rename or deletion of that preset never changes. The favorites count
  changes in place when a star is pressed. Muted, small. Not rendered below
  `bp-tablet-landscape`. No figure about how the player played.
- **[v3.2 changed]** For a Jam session, the part of the summary after the session date begins with
  the word "Jam", as the session list's detail line does: "Tue 6 Oct 2026, 18:42 · Jam · 12 min ·
  9 phrases · …", or "Jam · 12 min · 9 phrases · …" when the date is the title. A word, not an
  icon. A Jam session has no preset label (Jam mode has no presets), so its summary has no
  {preset} part: "Jam · 12 min · 9 phrases · {instrument} · {favorites}".
- **[v3 new]** `review-keep-line`: "Pinned: kept until you unpin or delete it.", "Not pinned:
  deleted when your next session is saved.", or, for a session whose save failed, "Not saved on
  this device: export it to keep it." Its text changes in place, with no announcement. Below
  `bp-tablet-landscape` it is rendered only in its "Not saved" form, the one thing the pin
  button's label cannot say.
- **[v3 new]** `review-session-tools`: two plain `btn`s. "Pin" on an unpinned session, "Unpin" on
  a pinned one (the label changes in place, focus stays); "Delete session". Neither is
  `btn-primary` or `btn-error`. Rules and confirmations: `flows/kept-sessions/handoff.md`, Pin and
  Unpin, Deleting a Session. While saving is off (an outdated tab, or a visit whose saved data
  couldn't be read), `Delete session` is absent and the pin button stands alone
  (`flows/kept-sessions/handoff.md`, While Saving Is Off).
- **[v3 new]** `review-comment`:
  - **Collapsed, empty:** a plain `btn` "Add a comment".
  - **Collapsed, filled:** the comment as a `p` (its line breaks kept, never cut), then a plain
    `btn` "Edit comment".
  - **Editing:** a `field-group` with `field-label` "Comment", a `text-area` (`maxlength` 500,
    named by the label, described by `field-count`), `field-count` "{n}/500" updated as the
    player types, and a plain `btn` "Done". Typing stops at 500 characters and a paste is cut at
    500, so there is no error state.
  - Saved on `Done`, when the field loses focus, and when the Review is left or replaced; an
    emptied field removes the comment and the row returns to "Add a comment". Leading and
    trailing spaces and blank lines are trimmed on save. Never written into an export.
- **[v3 new]** `review-scope`: `field-group` with `field-label` "Export" and a
  `segmented-control` (radiogroup, roving tab stop) with `Whole session` then `Favorites only`.
  `Whole session` is checked at every Review opening; the choice is never saved. With no favorite
  in the session, `Favorites only` is disabled and named by `aria-describedby` to a `field-note`
  "No favorites in this session yet."; if the last favorite is removed while `Favorites only` is
  checked, `Whole session` becomes checked. The scope governs both exports.
- `review-export`:
  - **[v3 changed]** **Format**: `field-group` with `field-label` "Format" and a
    `segmented-control` (radiogroup, roving tab stop, as every single-select control in the
    workspace) with `MusicXML` then `MIDI`. `MusicXML` is checked until the player changes it; the
    choice is saved when changed and applies to every Review, after a reload too.
  - **[v3 changed]** **Backing track**: `btn toggle-button` reading "Backing track" with
    `toggle-button-state` "on"/"off" (`aria-pressed`; the accessible name is "Backing track"
    alone), rendered only while `MIDI` is checked. Off until the player turns it on; saved when
    changed, as Format is, and kept while hidden. It is independent of the audio mix's `Backing`
    toggle.
  - **Export**: `btn review-export-action` reading "Export generated notes". Secondary emphasis
    (never `btn-primary`): `Close review`, in the header, is the page's one primary action while
    the Review shows. Activation builds
    exactly one file from the session history and starts a browser download.
  - While the file is built the button takes `is-loading` and `disabled`; Format and Backing track
    stay live and apply to the next export. Focus stays on the button and returns to it enabled.
    The first export of the page also loads the export code, within the same `is-loading` state.
  - No message on success: the browser's download is the confirmation. `generation-status` and
    `notation-status` say nothing about exports.
- **[v3 changed]** **File names.** `infinite-flow-{date}-{time}-generated.musicxml` for MusicXML
  and `infinite-flow-{date}-{time}-generated.mid` for MIDI, where `{date}` is `YYYY-MM-DD` and
  `{time}` is `HHmmss`, the session's start (the Start click or starting note) in local time. The
  played-notes file takes the same stem with `-played.mid`, so a session's files sort together and
  name their content. Under `Favorites only` each name adds `-favorites` after its last word:
  `...-generated-favorites.musicxml`, `...-generated-favorites.mid`, `...-played-favorites.mid`.
  `Include very short notes` does not change the name.
- **[v3 changed]** **File contents** follow the v2 master spec's export section (MusicXML
  score-partwise 4.0 in the session profile's written pitch with its transposition; MIDI type 1 at
  concert pitch with the tempo map, a marker per phrase, and the backing track only when
  `Backing track` is on), for the phrases the scope selects (master spec §6). No played note is
  ever in either generated-notes file.
- **[v3.3 new]** **Seventh chords.** A phrase's `chord-symbol`s may be seventh chords (`maj7`, `m7`,
  `7`, `m7♭5`), drawn and fitted by the workspace Notation Contract (**Seventh chord symbols**),
  which `review-staff` applies in full at its own width, and read by the score's spoken description
  in the same words. In the files: MusicXML writes each with its chord kind and the suffix as
  printed; the MIDI backing track, when on, holds the chords as the backing played them, four
  notes for a seventh chord. `Backing track` keeps its label and has no description to change.
- **[v3.2 new]** **A Jam's files open with the doodle**, in both scopes and in all three files:
  a section marked "Doodle" (the MusicXML rehearsal mark and the MIDI marker), as many measures
  long as the doodle, starting at time zero, at the tempo the doodle was played at; then the
  first exported phrase at the next barline, the waiting measures between them never written.
  In the generated-notes files the section holds the quantized doodle (MusicXML in written pitch
  with the key signature the Jam started with and no chord symbol; MIDI with no backing under
  it). In the played-notes file it holds the raw doodle notes, very short ones following
  `Include very short notes`, a note running past the section's end stopping there; in a Jam on
  the kept doodle the section is there, empty. Other notes played before phrase 1 are still left out.
  So the files of one Jam still line up measure for measure (master spec §C5.15).
- **[v3.2 new]** **A Jam's exports need its doodle.** The doodle's part of each file comes with
  Jam's code, as the doodle section does. An export pressed while that code loads waits for it
  inside its own `is-loading` state, as the first export of a page waits for the export code.
  When it could not load, `Export generated notes` and `Export played notes` are both
  `disabled`, each named by `aria-describedby` to a `field-note` after it reading "Your doodle
  can't be shown: part of the app didn't load. Check that you're online, then open this session
  again." (for `Export played notes`, that reason comes before every other); Format, Backing
  track, the scope and `Include very short notes` stay live. An export already waiting when the
  load fails ends in that state, never in `review-export-error`.
- **[v3 changed]** **Export played notes**: `btn review-export-action` reading "Export played
  notes", in `review-export-played` after `Include very short notes`, rendered only when the
  session holds at least one played note whose onset falls in a phrase (never after a session
  without a controller, nor one in which nothing was played in a phrase, nor a kept session whose
  played notes were not kept). "Holds a played note" counts every note as received, very short
  ones included. Secondary emphasis. The file is always MIDI (one track of the played notes,
  concert pitch as received, original velocity, unquantized, the same tempo map and phrase
  markers as the generated-notes MIDI file; never the backing), very short notes left out unless
  `Include very short notes` is on. File name `infinite-flow-{date}-{time}-played.mid` (or
  `-played-favorites.mid`). Activation builds exactly one file and starts a browser download,
  with the same `is-loading`, focus, code-loading and no-message-on-success behaviour as
  `Export generated notes`. The two buttons are independent: either may be used while the other
  is building. It is disabled whenever its file would hold no note under the current scope and
  `Include very short notes`, and named by `aria-describedby` to a `field-note` giving the first
  reason that applies: under `Favorites only`, when no favorite phrase holds a played note, "No
  played notes in your favorites."; otherwise, while `Include very short notes` is off and every
  played note the scope selects is very short, "Every note you played is very short. Turn on
  Include very short notes to export them." under `Whole session`, and "Every note you played in
  your favorites is very short. Turn on Include very short notes to export them." under
  `Favorites only`. Turning the option on or off, or changing the scope, updates the button and
  its note at once; focus stays on the control the player changed. A change made while the file
  builds leaves that build as it started; the button then takes the state the current choices
  give. So it never reaches `review-export-error` for want of a note.
- **[v3.2 changed]** **In a Jam, the raw doodle notes count as played notes.** "Holds a played
  note" also counts a note whose onset falls in the doodle's measures, so a Jam in which only the
  doodle was played still has `review-export-played` and `review-view`. Under `Favorites only`,
  `Export played notes` is disabled only when neither a favorite phrase nor the doodle holds a
  played note. A Jam on the kept doodle holds none of the doodle's raw notes: they belong to the
  session it was first played in. With `Include very short notes` off, the doodle's raw notes
  count with the phrases' toward the file holding a note, in both scopes. Under `Favorites only`
  in a Jam, the very-short reason reads "Every note you played in your favorites and the doodle
  is very short. Turn on Include very short notes to export them."; the other reasons keep their
  wording.
- **[v3 new]** **Include very short notes**: `btn toggle-button` reading "Include very short
  notes" with `toggle-button-state` "on"/"off" (`aria-pressed`; the accessible name is the label
  alone), before `Export played notes`. Off at first; holds while the page is open, across
  Reviews; never saved. It changes the played-notes file only, never the lane or the
  generated-notes file. It stays live while `Export played notes` is disabled or building: when
  every played note the scope selects is very short, it is what enables the export.
- `review-export-error`: `inline-alert alert-error` reading "The file couldn't be made. Try
  again." It appears under `review-actions` after any failure to build or hand over a file, of
  either content (a failed load of the export code included), is not a live region, moves no
  focus, and leaves when the next export of either content starts.
- **[v3 changed]** **Played notes**: `review-view`, a row after the export row (and after
  `review-export-error` when that shows), starts with one `btn toggle-button` reading "Played
  notes" with `toggle-button-state` "on"/"off" (`aria-pressed`; the accessible name is "Played
  notes" alone; no `aria-controls`, since `review-list` is absent while the staff has no room and
  the lanes appear right under the switch). `review-view` is rendered only when
  **Export played notes** is. Off until the player turns it on; saved when changed and applies to
  every Review, after a reload too. It changes only what `review-list` shows: never the exports,
  never the generated staff.
- **[v3 new]** **Keep my played notes**: `btn toggle-button` reading "Keep my played notes" with
  `toggle-button-state` "on"/"off" (`aria-pressed`; the accessible name is the label alone), after
  `Played notes` in `review-view`. It shows and changes the one saved setting `Your data` shows
  too. Turning it on saves it and, in the Review of the session that just ended whose played notes
  are still in memory, keeps that session's played notes as well: `Delete played notes` then
  appears after it. Turning it off saves it; when played notes are kept with any session, the
  played-notes confirmation opens (see Confirmations). While saving is off the switch changes
  for the visit only: nothing is saved, no played notes are kept, and turning it off opens no
  confirmation.
- **[v3 new]** **Delete played notes**: a plain `btn` reading "Delete played notes", last in
  `review-view`, rendered only when this session's played notes are kept, and never while
  saving is off. It opens its confirmation; on confirmation this session's played notes are
  deleted, from memory too, and
  `review-view`, every `played-notes-lane` and `review-export-played` leave the Review at once.
- **[v3 new]** `favorite-toggle`: `btn favorite-toggle` with `aria-pressed`, at the trailing end
  of each `review-phrase-header`: the star (inline SVG, `aria-hidden`) and, from
  `bp-tablet-landscape` up, the word "Favorite". Accessible name "Favorite phrase {n}" at every
  breakpoint. Pressing it marks or unmarks the phrase at once and keeps focus. Marking the first
  favorite of an unpinned session pins it: `review-keep-line` and the pin button change in place,
  with no message. Removing the last favorite leaves the session pinned. Never disabled.
- **[v3 new]** **Confirmations.** Each is a `sheet` of its own over the page, in the pattern of
  `flows/kept-sessions/handoff.md`, The Confirmation Pattern (focus on the way back at open; a
  deleting action in `btn btn-error`):
  - **Unpin** (with favorites) and **Delete session**: copy in `flows/kept-sessions/handoff.md`.
  - **Played notes already kept** (`Keep my played notes` turned off while some are kept; the
    switch is already off and saved): title "Delete the played notes already kept?"; body "Your
    played notes won't be kept from now on. The ones already kept with {n} sessions can be deleted
    too; the sessions stay." ("with 1 session" when one) then "This can't be undone."; actions
    `Delete them` (`btn btn-error`) then `Keep them` (`btn`). `Delete them` deletes every kept
    played note, this session's included, from memory too.
  - **This session's played notes** (`Delete played notes`): title "Delete this session's played
    notes?"; body "This deletes the notes you played in this session. The session stays, with its
    favorite phrases and comment." then "This can't be undone."; actions `Delete played notes`
    (`btn btn-error`) then `Cancel` (`btn`).
  - **[v3.2 changed]** **This session's played notes, in a Jam session:** the body's first
    paragraph reads "This deletes the notes you played in this session. The session stays, with
    its doodle as the app wrote it, its favorite phrases and comment.", since the written-out
    doodle is kept (master spec §C5.14); the rest as above.
  - A deletion that fails keeps its sheet open with `inline-alert alert-error` "That couldn't be
    deleted. Try again." under its paragraphs; the confirming action tries again.
  - While a deletion runs, its confirming action takes `is-loading`; the way back stays live and
    closes the sheet without stopping it: the deletion finishes (`flows/kept-sessions/handoff.md`,
    The Confirmation Pattern). Its result then shows as on confirmation, with no message. A
    refusal after the sheet closed shows nothing: the played notes or the session are still
    there, and `Delete played notes` or `Delete session` tries again (the played notes already
    kept, through `Your data`'s `Delete all played notes`).
- **Played-notes lane**: while `Played notes` is on, each system position in `review-staff`
  is followed by one `played-notes-lane`, a block of the full content inline size and the block
  size `--played-notes-lane-block-size`, separated from the system above by `--spacing-2`, holding
  absolutely placed `played-notes-divider` and `played-note` elements:
  - **[v3 changed]** **Which notes.** Every played note of the session whose onset falls in this
    phrase (the notes before phrase 1 belong to none, as in the export), except very short notes,
    which the lane always leaves out (master spec §9; no switch). In the split layout the top lane
    holds bars 1–2 and the bottom lane bars 3–4.
  - **[v3.2 new]** **The doodle's lane.** In a Jam's review the doodle's system positions get
    lanes too, by every rule here: they hold the raw doodle notes, every played note whose onset
    falls in the doodle's measures, very short notes left out; the anchors are the doodle's
    engraved notes, rests and measure ends, and nothing is drawn after its last barline (a note
    still sounding there stops at it). These notes count in the session's pitch scale. Labelled
    "Played notes, your doodle" ("…, bars 1–2" and "…, bars 3–4" when split). In a Jam on the
    kept doodle the doodle's lane is empty: its dividers only. While the doodle is not drawn
    (loading, unable to load, or no room for it), it has no lane.
  - **Time (inline axis).** A note's onset and release, as the session history records them (the
    same values the played-notes export uses), are placed by beat time against the written notes
    of the staff above, so that a note played exactly on a written note's beat starts right under
    that written note:
    - **Anchors, per measure.** Every written note and rest is an anchor: its beat, at the inline
      start of its notehead (or rest) in the engraving. Every measure's end is an anchor too: its
      last beat's end, at its closing barline (where a `played-notes-divider` stands, except
      after the lane's last measure).
    - **Inside a measure** time maps linearly between consecutive anchors, from its first note
      to its closing barline. So a moment late in a measure always sits before that measure's
      barline, and a moment in the next measure always after it.
    - **At a barline**, the space between the barline and the next measure's first note takes
      no time: a note released on the downbeat ends at the barline, a note played on the downbeat
      starts under the first note, and a note held across the barline is one bar spanning that
      space. Clef, key signature and time signature likewise take no time and never hold a bar;
      a measure's whole `measure-slot` extent is not the scale.
    - So the bars follow the staff's own spacing, not a uniform grid: the same held length looks
      longer under a busy stretch of notes than under a sparse one, as the staff spaces them.

    A note held when the session ended stops at the session's end. A bar is cut at its phrase's
    end; in the split layout a bar that crosses from bar 2 into bar 3 is drawn in both lanes, cut
    at the break.

    **[v3 changed]** A bar is never narrower than `--played-note-min-inline-size`, so a brief note
    the lane shows, one at or just above the very-short-note threshold, still gets a visible bar.

  - **Pitch (block axis).** Higher notes higher. The scale runs from the lowest to the highest
    played note of the whole session (not of the phrase), widened equally on both sides to at
    least an octave (12 half steps) when the session's span is smaller, so every lane of the
    session has the same scale. The drawing gives each bar its place on that scale as
    `--played-note-pitch`, from 0 (the scale's lowest) to 1 (its highest); the stylesheet makes it
    `--played-note-block-size` thick and centres it at that height, keeping the highest and
    lowest bars fully inside the lane. The drawing sets each bar's inline start and inline size
    (from the time axis above) and each divider's inline position, nothing else.
  - **Look.** Every `played-note` takes `--color-played-note` (rounded ends, `--radius-sm`), one
    colour for every note: no note is ever coloured, marked or labelled differently, matched or
    not, and velocity is not shown. Overlapping notes (a chord on a keyboard) simply overlap. A
    `played-notes-divider` (a hairline in `--color-border`) marks each barline between the lane's
    measures, at that barline's inline position in the engraving above; nothing else is drawn, no text, no grid.
  - **Accessibility.** `role="img"`, `aria-label` "Played notes, phrase {n}" ("…, bars 1–2" and
    "…, bars 3–4" in the split layout). Not interactive, not focusable.
  - **Empty lane.** A phrase in which nothing was played shows its lane with its dividers only, and
    no text.
  - **Reserved space.** While `Played notes` is on, every phrase reserves its lanes' block size
    together with its system positions, whether its engraving is drawn, released, or replaced by
    `review-phrase-note` (the lanes are then blank: a lane is drawn only with its phrase's
    engraving, since it needs the engraving's note and barline positions). Switching `Played notes` adds or
    removes every lane at once; the browser's scroll anchoring keeps the phrase at the top of the
    view in place (nothing in the Review may disable it), so the list grows or shrinks around it.
    Lanes are drawn and released with their phrase's engraving (see **Lazy engraving**), with no
    fade.
  - The generated staff is unchanged: no `note-ack`, and nothing of the played notes on it.
- `review-list` is an `ol`; each `review-phrase` is an `li`, in the order the phrases started
  sounding, one per phrase in the history. A failure-ladder repeat is an ordinary item with its own
  number: nothing marks it.
- **[v3 changed]** `review-phrase-header`: `review-phrase-title` "Phrase {n}" (the session phrase
  number, which the export's rehearsal marks and markers also carry) and `review-phrase-tempo`
  "{tempo} BPM" (the tempo the phrase played at), muted, on one line, then `favorite-toggle` at
  the line's trailing end; it wraps below `bp-tablet-landscape` if needed, the star staying at
  the trailing end.
- **[v3 changed]** `review-staff` holds the phrase's engraving, drawn from the stored timeline
  exactly as it was shown: the session profile's written pitch, its key signature and chord
  symbols, the clef the phrase was played in (treble clef for a built-in profile; for my
  instrument, its clef at the time, whatever its clef is now), the Notation Contract of
  `screens/phrase-workspace/handoff.md` in full, except that nothing of the session is drawn (no
  `start-note-marker`, `playhead-band` or `note-ack`).
  - **Layout** follows the workspace staff's current viewport (its layout and height budget),
    applied at `review-staff`'s own content width: from
    `bp-tablet-landscape` up, one system with four measures; below it, the split layout (bars 1–2,
    then bars 3–4, clef and key signature repeated, time signature on the first system only, measure
    columns aligned). Never scrolled horizontally, cut off, or split further.
  - **Size.** `review-staff` reserves one system position (two in the split layout) with the same
    block size the workspace staff's system positions have at the current viewport, set by the
    notation layout, before the phrase is engraved. The phrase is drawn in it at the largest scale
    its own content allows, never above the workspace staff's scale and never below the legibility
    floor, and placed for the session's profile (see the workspace Notation Contract, **System
    position size and staff placement**).
  - **[v3 new]** **Room for a phrase in another clef.** A review never cuts a phrase. Its system
    positions, counted in staff spaces, take the larger of the workspace's shared size and the
    size the session's own instrument needs: that instrument's written range placed in the clef
    its phrases were played in, measured by the rule that sizes the workspace staff. They
    differ for a session played with my instrument in a clef it no longer has (written C2 to
    C4 in treble clef needs 19 staff spaces, where the staff may now keep 16 for the same range in
    bass clef), and for the session held in memory in a visit that saves nothing after my
    instrument's range changed, since that session keeps its review. The larger size is turned into a block size at the workspace staff's scale, so
    every phrase keeps the same notation size as on the staff and only its position is taller; it
    holds for the whole review, set before the first phrase is engraved, so the scroll position
    never jumps. The placement is the one that instrument's range and clef give.
  - **Lazy engraving.** A phrase is engraved when its item comes within one viewport height of the
    visible area, and released (its reserved space left blank) once it is more than three viewport
    heights away. Engravings run one at a time, the item nearest the visible area first. The
    reserved size never changes, so the scroll position never jumps. No fade: `staff-content` in the review takes no entrance or
    exit animation.
- `review-phrase-note`, muted, centred in the reserved space, in place of `staff-content`:
  - "This phrase needs a wider window." when the staff has room but this phrase's notes do not fit
    at the legibility floor in the current layout at `review-staff`'s content width. It is drawn again, with no fade, once a viewport
    change gives it room.
  - "This phrase couldn't be drawn." when its engraving fails for any other reason. No action; the
    export does not depend on the engraving.
- `room-notice` in the review: while the workspace staff has no room (screens/phrase-workspace,
  Notation Contract, **Room for the staff**, the no-room cause), `review-list` is not rendered and a
  `room-notice` stands in its place holding `room-notice-wide` and `room-notice-narrow`, shown by
  the same width-only query as in `staff-frame`. It carries no `tabindex` and is not announced.
  It follows the workspace staff's no-room state live, since that staff stays laid out and keeps
  checking its room while the Review shows; the too-many-notes cause does not replace the list.
  The list returns on the viewport change that gives the staff room.
- **[v3.2 changed]** In a Jam's review, `room-notice` stands in for `review-doodle` as well, its
  suggestion and `Jam again on this doodle` included: one notice in place of the doodle and the
  phrases, both coming back together.
- **[v3.2 new]** **`review-doodle`**, the doodle section of a Jam's review. Its classes are in
  `ui_ux/token-source-v3.1-v3.2.md`. In order:
  - **Header.** `review-phrase-header` with `review-phrase-title` (h3) "Your doodle", which names
    the section, and `review-phrase-tempo` "{tempo} BPM", the tempo the doodle was played at,
    kept with it; then, at the line's trailing end, where per-phrase tools go, a plain `btn`
    "Jam again on this doodle". No phrase number and no `favorite-toggle`: the doodle is not a
    phrase and cannot be a favorite. The button is enabled with or without a connected
    controller; it is `disabled` only while Jam's code loads and when it could not load, named
    then by `aria-describedby` to the section's `review-phrase-note`. What the button does:
    `flows/review-and-export/handoff.md`, The Doodle and the Suggestion.
  - **Jam's code.** The doodle section and the suggestion come with Jam's code, loaded on demand
    (`flows/jam/`). In the review of the Jam just played, and in any visit where Jam mode has
    opened or a Jam session's review has loaded it, it is there at once. Otherwise, as the review
    opens, the header shows at once and `review-staff` holds `review-phrase-note` "Loading your
    doodle." in place of the doodle, with no spinner, until the code has loaded; then the doodle
    is engraved and the suggestion judged, silently. If it cannot load (offline before the app's
    files were kept), `review-phrase-note` reads "Your doodle can't be shown: part of the app
    didn't load. Check that you're online, then open this session again.";
    `Jam again on this doodle` stays disabled, named by it; there is no suggestion; and both
    exports are unavailable with the same reason (see A Jam's exports need its doodle). The rest
    of the review works. Never error-toned. The next opening of a Jam session's review, or a
    press of `Jam` in the mode switch, tries the load again.
  - **Staff.** `review-staff` holds the quantized doodle, engraved by the rules of a phrase's
    `review-staff` (the Notation Contract in full, nothing of the session drawn, no fade): in the
    written pitch of the session's instrument, with the key signature of the written key and
    collection the Jam started with, in the clef the Jam was played in (treble, or my instrument's
    clef then), and 4/4, and no chord symbol. Its measures take a
    phrase's measure width from the system's start: the system is laid out as a four-measure
    system whose first measures are the doodle's, so a two-measure doodle fills half the width and
    looks two measures long; the staff lines end at the doodle's last barline, and the rest of the
    system position stays blank. Size, scale, placement and lazy engraving are a phrase's; the
    doodle is the list's first item for the engraving order. When it cannot be drawn,
    `review-phrase-note` reads "This doodle needs a wider window." or "This doodle couldn't be
    drawn.", by the phrase's rules; neither disables `Jam again on this doodle`, the suggestion or
    the exports.
  - **Lanes.** While `Played notes` is on, a `played-notes-lane` under each of its system
    positions (see Played-notes lane).
  - **Suggestion.** `suggestion-row`, last, in one of the forms below, or absent (always absent
    until Jam's code has loaded).
- **[v3.2 new]** **`suggestion-row`**, the key and mode suggestion worked out from the quantized
  doodle (master spec §C6), about Jam's key and mode: Jam's own Written key and Collection
  (`screens/phrase-workspace/handoff.md`, Saved settings), never session mode's, whichever mode
  the review shows over. Until Jam mode has first opened on this device, Jam's key and mode are
  session mode's current ones, as Jam's first values are. The answer is named in written pitch,
  its key as the Written key control labels it, its mode in the player's family: while Jam's
  Collection is Major or Minor an Ionian answer reads "Major" and an Aeolian one "Minor";
  otherwise every answer reads as its mode ("G Dorian", "F Major", "D Ionian"). {answer} below is
  that name. Forms:
  - **Offering:** a `p`, "Your doodle sounds like {answer}.", then two plain `btn`s,
    `Jam in {answer}` then `Keep {key} {mode}`, naming Jam's Written key and Collection as their
    controls label them ("Keep C Major"). Neither is `btn-primary`. There is no second line:
    Jam mode has no presets.
  - **Set:** after `Jam in {answer}`, one `p`, "Jams now play in {answer}.", and no button, until
    the review closes or Jam's key or mode is changed again; then the row is absent.
  - **No fit:** when under 80 % of the doodle fits the best answer, one `p` and no button: "Your
    doodle uses notes outside the app's keys and modes, so no key is suggested." It never names a
    note.
  - **Absent:** too little to go on (fewer than 5 pitch classes, 6 notes or 2 beats of sounding
    time after very short notes are left out), with nothing said; Jam's key and mode among the
    close answers; declined with `Keep`; Jam's code not loaded yet, or unable to load; in a
    session that is not a Jam.
  - **Judged against Jam's key and mode**, in the review of the Jam that just ended and of any
    kept one: when the review opens (once Jam's code has loaded), and again whenever Jam's key or
    mode changes while it shows (in Jam's controls below it, when the review shows over Jam
    mode). `Keep {key} {mode}` follows the change in place, and the row leaves when Jam's key and
    mode become one of the close answers. The answer itself never changes: the same doodle always
    gives the same suggestion.
  - **`Jam in {answer}`** sets Jam's key and mode only, saved as Jam's; **`Keep {key} {mode}`**
    changes nothing and declines the suggestion for good, the decline kept with the session. What
    each changes: `flows/review-and-export/handoff.md`, The Doodle and the Suggestion.
- `Close review` is the header's session action (`btn btn-primary btn-lg session-action`, same
  fixed inline size) with that label while the Review shows; see `screens/phrase-workspace/`,
  Components and Content, and `flows/review-and-export/handoff.md`, Close review.
- **[v3 changed]** `review-link` and `sessions-link` (in `screens/phrase-workspace/`,
  `session-cue-row`): when each shows, what it opens and where focus goes are in
  `flows/kept-sessions/handoff.md`, The Cue-Row Links.

## Focus and Keyboard

- **[v3 changed]** While the Review shows, the tab order is the header (`controller-status`,
  `theme-control`, the disabled phrase action skipped, `Close review`), `score-toolbar`'s
  `mix-controls`, then `review-panel`: `All sessions`; `Pin` or `Unpin`, `Delete session` (when
  shown); the
  comment (`Add a comment` or `Edit comment`, or while editing the `text-area` then `Done`); the
  scope; Format, Backing track when shown, `Export generated notes`; `Include very short notes`,
  `Export played notes` (when the session holds a played note); `Played notes`,
  `Keep my played notes`, `Delete played notes` (when shown); then each phrase's
  `favorite-toggle`, in list order. Then `control-section`, then the page footer. A disabled
  segment or button is skipped.
- **[v3.2 changed]** The header's `mode-switch`, read-only while the Review shows, keeps its tab
  stop before `controller-status` (its checked segment, which refuses an arrow key).
- **[v3.2 changed]** In a Jam's review, `review-doodle`'s buttons come between `review-view`'s
  and the first `favorite-toggle`: `Jam again on this doodle` (skipped while disabled), then
  `Jam in {answer}` and `Keep {key} {mode}` while the suggestion is offered.
- Switching `Played notes` keeps focus on it.
- **[v3 new]** Pressing `favorite-toggle`, `Pin` / `Unpin` (when no confirmation opens),
  `Include very short notes` or `Keep my played notes` (when no confirmation opens) keeps focus
  on it.
- **[v3 new]** Comment: `Add a comment` and `Edit comment` open the editor and move focus into
  the `text-area`, the caret at the end. `Done` closes it and moves focus to `Edit comment` (or
  `Add a comment` when the comment was emptied). Escape in the field does what `Done` does. Tab
  out of the field saves and moves on, the editor staying open until `Done` or the Review is left.
- **[v3 new]** Confirmations: focus goes to the way back on open and is trapped in the sheet. On
  the way back, focus returns to the button that opened it. After `Delete played notes` or
  `Delete them` removes `review-view`, focus moves to `review-title`; after `Delete them` with
  `review-view` still shown, to `Keep my played notes`. After `Unpin`, to the button, now `Pin`.
  After `Delete session`, as `flows/kept-sessions/handoff.md` sets (the list's title). A sheet
  closed while its deletion runs returns focus as the way back does; when the deletion then
  ends, focus still on a button it removed (`Delete played notes`, or `Keep my played notes` with
  `review-view`, or `Delete session` with the Review) moves as after that confirmation, and focus
  anywhere else stays.
- **[v3 changed]** A session end moves focus to `Close review`. `Close review`, `Review last session`,
  `All sessions` and a list row move focus as `flows/review-and-export/handoff.md` and
  `flows/kept-sessions/handoff.md` set. Keyboard route from a session end: Space closes the
  Review, focus stays on the session action, now `Start session`; Space starts the next session.
  No global shortcut closes the Review.
- `Close review` in **Needs more room** moves focus to `room-notice` whichever the notice's cause
  (no room, or this phrase's notes too wide).
- `generation-status` and `notation-status` are emptied when the Review opens and say nothing
  while it shows; a generation that ends after `Close review` is announced as at idle.
- **[v3 new]** No change made in the Review (a favorite, the keep line, a pin, a saved comment)
  is announced: each control's own state (`aria-pressed`, its label) carries it.
- **[v3.2 new]** `Jam in {answer}` and `Keep {key} {mode}` take the suggestion's buttons away, so
  focus moves to `Jam again on this doodle` when it is enabled, else to `review-title`. Nothing is
  announced: the row's sentence carries the change.
- **[v3.2 new]** `Jam again on this doodle` leaves the review mode onto Jam mode, focus moving to
  `mode-switch`'s checked segment while phrase 1 is written; from the review of the Jam just
  played it acts as `Close review`, focus included (`flows/review-and-export/handoff.md`).
- **[v3.2 new]** When a control of `review-doodle` that has focus goes away or becomes disabled
  (`room-notice` replacing the section, or the suggestion's buttons leaving after a change of
  Jam's key or mode), focus moves to `review-title`.

## Responsive Behavior

- **[v3 changed]** At `bp-mobile-landscape` (below `bp-tablet-landscape`): `review-nav` as on
  larger screens. `review-header` stacks: `review-title`, then `review-session-tools` under it,
  wrapping as needed. `review-summary` is not rendered, and `review-keep-line` only in its "Not saved" form. `review-comment`
  takes the full inline size. `review-actions` wraps onto as many lines as it needs, the scope
  and Format controls at their natural width rather than full width. `favorite-toggle` shows the
  star alone, with the `btn`'s minimum square target. Phrases use the split layout at the
  workspace staff's phone scale, and each of a phrase's two system positions gets its own lane.
  Nothing else is added or removed on the phone: every control of the larger screens is here.
- **[v3 changed]** `review-actions` separates its groups (`review-scope`, the generated-notes
  `review-export`, then `review-export-played`) by a wider gap than the items inside a group, at
  every breakpoint.
- `review-view` takes a row of its own under the heading and the actions at every breakpoint,
  aligned to the inline start, wrapping its buttons when they do not fit.
- `played-notes-lane` keeps `--played-notes-lane-block-size` at every breakpoint; only its inline
  size follows the staff above it.
- **[v3 changed]** At `bp-tablet-landscape` and `bp-desktop`: `review-heading` at the inline start
  and `review-session-tools` at the inline end of one row, wrapping under the heading when they do
  not fit; `review-summary` then `review-keep-line` under the title; `review-actions` on its own
  row after `review-comment`, wrapping when its groups do not fit. `favorite-toggle` shows the
  star and the word. One system per phrase, across the panel's content width.
- **[v3.2 new]** `review-doodle` at `bp-tablet-landscape` and `bp-desktop`: its header on one
  line as a phrase's, `Jam again on this doodle` at the trailing end; the doodle in one system,
  its measures from the system's start; `suggestion-row`'s sentence and buttons on one row that
  wraps.
- **[v3.2 new]** `review-doodle` at `bp-mobile-landscape`: the header wraps as a phrase's,
  `Jam again on this doodle` staying at the trailing end; the doodle takes the split layout like a
  phrase, bars 1–2 in the top system position and bars 3–4 in the bottom one, each at a phrase's
  measure width from its system's start; a doodle of one or two measures reserves the top system
  position only. Each of its system positions gets its own lane. `suggestion-row` wraps, its
  buttons under the sentence when they do not fit beside it. Nothing of the section is dropped.
- `review-panel` takes the full inline size of `layout-workspace` at every breakpoint; no side
  rail, no second column.
- Every visual value comes from the token source (`src/styles/theme.css`,
  `src/styles/components.css`); this handoff declares none.
  **[v3.2 changed]** `review-doodle` and `suggestion-row` are in
  `ui_ux/token-source-v3.1-v3.2.md`.

## States

- **[v3 changed]** **Absent:** no Review shows (idle, a session, the session list showing). No
  `review-panel`. With no session that can be opened (before the first session with a sounded
  phrase, after deleting the most recent session, with saved data unusable and no session this
  visit), no `review-link` either.
- **Showing:** as above, in place of the staff area, whatever idle state the hidden staff is in (**Loading**, **Ready**, the errors, **Needs more room**, **Empty**). It never
  changes with those states, except for the no-room list replacement. No session starts: the
  session action reads `Close review`, and no MIDI note starts a session (the connection sheet
  and its check note work as usual). The audio mix, tempo and settings stay usable.
- **[v3 changed]** **Not showing, session still there:** after `Close review`, or while the list
  shows: the session stays kept (or in memory after a failed save) by the rules of kept sessions,
  reachable from `review-link` when it is the most recent and from the list when it is kept.
- **[v3 new]** **Its session erased through my instrument:** deleting my instrument, or saving a
  change to its range or transposition after the warning, in its sheet or through the check,
  erases every session played with it. A review showing one of them gives way to the session
  list exactly as after `Delete session`, its empty state included; the sheet that did it keeps
  focus and then returns it by its own rule (`flows/my-instrument/handoff.md`). A visit whose saved
  data couldn't be read erases nothing this way, and a tab that must be reloaded offers neither
  change while my instrument has kept sessions.
- **[v3 new]** **Not saved:** the session's own save failed: `review-keep-line` reads "Not saved on
  this device: export it to keep it."; every control works, in memory.
- **Empty:** cannot occur: a Review opens only once a phrase has sounded, so it always holds at
  least one phrase.
- **[v3 changed]** **Loading:** per phrase only: an item not yet engraved shows its reserved space
  (and, with `Played notes` on, its lanes' space), blank, with no spinner. Export building: the
  `review-export-action` used takes `is-loading`. Reading a kept session before it shows: the
  control that opened it (`review-link`, or the row's `session-row-open`) takes `is-loading`; the
  panel itself has no loading state.
- **Error:** per phrase, `review-phrase-note`; export, `review-export-error`. Neither blocks
  anything else.
- **[v3 new]** **Saving off:** an outdated tab, or a visit started from the defaults because the
  saved data couldn't be read, or not within the start-up wait. No deletion is offered: no
  `Delete session`, no `Delete played notes`, whichever session the Review shows, the session
  held in memory included, and turning `Keep my played notes` off opens no confirmation. Every
  other control works, in memory for the visit: no change made there tries a save. A session
  that ended in such a visit is not saved, so its `review-keep-line` reads "Not saved on this
  device: export it to keep it.", as in **Not saved**. When the tab becomes outdated while the Review
  shows, those buttons leave at once; focus on one of them, or in a deletion confirmation then
  open, goes to `review-title` (`flows/kept-sessions/handoff.md`, While Saving Is Off).
- **[v3 new]** **A change not saved:** a favorite, pin, comment or `Keep my played notes` change
  the device refuses stays in memory for the visit and shows as made; the workspace's notice row
  tells it once the player is back at idle (`flows/saved-data/handoff.md`).
- **[v3 changed]** **No played note:** a session without a controller, one in which nothing was
  played in a phrase, or a kept session whose played notes were not kept or were deleted: neither
  `review-export-played` nor `review-view` is rendered.
- **Played notes on / off:** lanes shown under every system position, or none; see
  Components and Content.
- **[v3 new]** **Favorites only unavailable:** no favorite: the segment disabled with its
  `field-note`. **Played notes export unavailable:** its file would hold no note, under
  `Favorites only` with no played note in a favorite phrase, or with `Include very short notes`
  off and every played note the scope selects very short: `Export played notes` disabled with its
  `field-note` (Components and Content). In the second case, with `Played notes` on, the lanes
  show no bar.
- **[v3 new]** **Comment:** collapsed-empty, collapsed-filled, editing (see Components and
  Content).
- **[v3 new]** **A confirmation open:** the Review stays under the sheet's backdrop, unchanged.
- **Review code not loaded:** the Review's code is fetched ahead at session start and cached with
  the app, so a failed load means a broken deployment or offline before the app was first cached.
  Then nothing is drawn in the staff area's place: no message, `Close review` works as usual, and
  the next show tries the load again.
- **[v3 changed]** **No room:** `room-notice` in place of `review-list`; header, comment, exports and `review-view`
  unchanged (the switches keep their state for when the list returns).
- **[v3.2 new]** **Over either mode:** the Review shows over session mode or Jam mode, the
  header's `mode-switch` read-only, and `Close review` returns to that mode's idle state
  (`screens/phrase-workspace/`, States). Nothing in the Review differs between the two.
- **[v3.2 new]** **A Jam's review:** `review-doodle` before the phrases. Any other session,
  one kept before v3.2 included, has none, and its Review is as above.
- **[v3.2 new]** **The suggestion:** offering, set, no fit or absent (see Components and Content).
  It is never shown during a session, only in a review and, for the doodle Jam mode keeps, at
  Jam mode's Idle (`flows/jam/`).
- **[v3.2 new]** **The doodle loading:** Jam's code not loaded yet: `review-phrase-note` "Loading
  your doodle.", `Jam again on this doodle` disabled, no suggestion; an export pressed meanwhile
  waits in its `is-loading` state. Everything else works.
- **[v3.2 new]** **The doodle unable to load:** `review-phrase-note` with the failure sentence,
  `Jam again on this doodle` disabled, no suggestion, both exports disabled with the same reason;
  everything else works. Never error-toned.
- **[v3.2 new]** **The doodle not drawn:** its reserved space blank until engraved, as a
  phrase's; `review-phrase-note` in its doodle wording when it cannot be drawn. Neither blocks
  the suggestion, `Jam again on this doodle` or the exports.
- **[v3.2 new]** **The doodle with no room:** `room-notice` in place of `review-doodle` and
  `review-list` together; both return with the room.
- **[v3.2 new]** **A Jam on the kept doodle:** the doodle section shows the kept doodle with the
  tempo it was played at; its lane, with `Played notes` on, is empty, the raw notes belonging to
  the session the doodle was first played in, and the played-notes file's doodle section is empty
  too. A suggestion declined for that doodle stays declined for this session.
- **[v3.2 new]** **Saving off (the doodle):** `Jam in {answer}`, `Keep {key} {mode}` and
  `Jam again on this doodle` work in memory for the visit; Jam's key and mode set by
  `Jam in {answer}` and the decline are not saved, so after a reload the suggestion is offered
  again. No deletion is added or removed.
- **Portrait below `bp-desktop`:** hidden with the whole workspace behind `orientation-notice`,
  kept, shown again in landscape.
- **Theme change:** recolours the engraving and the panel at once, without re-engraving.
