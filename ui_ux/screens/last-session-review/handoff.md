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
>   unavailable states, a confirmation open, a change not saved ([States](#states))
> - _Removed:_ "Kept until the next session starts or the page is closed." from the summary;
>   Format, Backing track and `Played notes` "never stored, a reload resets it"; "Items in the
>   list hold nothing focusable"; the `review-link` details and its focus rule at a session start,
>   now in `flows/kept-sessions/` (v2 in
>   the [frozen copy](../../versions/v2/screens/last-session-review/handoff.md#components-and-content))

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
          btn                    ("Delete session"; absent in an outdated tab)
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
        btn                    ("Delete played notes"; only when this session's played notes are kept, never in an outdated tab; v3 new)
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
      room-notice                (p, no tabindex; in place of review-list while the staff has no room)
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
- **[v3 changed]** `review-title` reads "Last session" for the most recent session, and the
  session date (`flows/kept-sessions/handoff.md`, Terms) for any other. It carries `tabindex="-1"`
  so the links, the list and the deletions can move focus to it; it is never in the tab order and
  takes the `:focus-visible` ring.
- **[v3 changed]** `review-summary` reads "{session date} · {length} · {phrases} · {instrument} ·
  {profile} · {favorites}", the session date left out when it is the title. {length}, {phrases},
  {instrument} and {profile} are written exactly as in the session list's detail line, and
  {favorites} as in its status line (`screens/session-list/handoff.md`): the instrument by the name
  it had at the session, which may differ from the profile selected now. The favorites count
  changes in place when a star is pressed. Muted, small. Not rendered below
  `bp-tablet-landscape`. No figure about how the player played.
- **[v3 new]** `review-keep-line`: "Pinned: kept until you unpin or delete it.", "Not pinned:
  deleted when your next session is saved.", or, for a session whose save failed, "Not saved on
  this device: export it to keep it." Its text changes in place, with no announcement. Below
  `bp-tablet-landscape` it is rendered only in its "Not saved" form, the one thing the pin
  button's label cannot say.
- **[v3 new]** `review-session-tools`: two plain `btn`s. "Pin" on an unpinned session, "Unpin" on
  a pinned one (the label changes in place, focus stays); "Delete session". Neither is
  `btn-primary` or `btn-error`. Rules and confirmations: `flows/kept-sessions/handoff.md`, Pin and
  Unpin, Deleting a Session. In an outdated tab, `Delete session` is absent and the pin button
  stands alone (`flows/kept-sessions/handoff.md`, In an Outdated Tab).
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
  is building. Under `Favorites only`, when no favorite phrase holds a played note, it is
  disabled and named by `aria-describedby` to a `field-note` "No played notes in your
  favorites."
- **[v3 new]** **Include very short notes**: `btn toggle-button` reading "Include very short
  notes" with `toggle-button-state` "on"/"off" (`aria-pressed`; the accessible name is the label
  alone), before `Export played notes`. Off at first; holds while the page is open, across
  Reviews; never saved. It changes the played-notes file only, never the lane or the
  generated-notes file. It stays live while `Export played notes` is disabled or building.
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
  played-notes confirmation opens (see Confirmations). In an outdated tab the switch changes for
  the visit only: nothing is saved, no played notes are kept, and turning it off opens no
  confirmation.
- **[v3 new]** **Delete played notes**: a plain `btn` reading "Delete played notes", last in
  `review-view`, rendered only when this session's played notes are kept, and never in an
  outdated tab. It opens its confirmation; on confirmation this session's played notes are
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
  - A deletion that fails keeps its sheet open with `inline-alert alert-error` "That couldn't be
    deleted. Try again." under its paragraphs; the confirming action tries again.
- **Played-notes lane**: while `Played notes` is on, each system position in `review-staff`
  is followed by one `played-notes-lane`, a block of the full content inline size and the block
  size `--played-notes-lane-block-size`, separated from the system above by `--spacing-2`, holding
  absolutely placed `played-notes-divider` and `played-note` elements:
  - **[v3 changed]** **Which notes.** Every played note of the session whose onset falls in this
    phrase (the notes before phrase 1 belong to none, as in the export), except very short notes,
    which the lane always leaves out (master spec §9; no switch). In the split layout the top lane
    holds bars 1–2 and the bottom lane bars 3–4.
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
    at the break. A bar is never narrower than `--played-note-min-inline-size`, so a very short
    note stays visible.
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
- `review-staff` holds the phrase's engraving, drawn from the stored timeline exactly as it was
  shown: the session profile's written pitch, its key signature and chord symbols, treble clef, the
  Notation Contract of `screens/phrase-workspace/handoff.md` in full, except that nothing of the
  session is drawn (no `start-note-marker`, `playhead-band` or `note-ack`).
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
  After `Delete session`, as `flows/kept-sessions/handoff.md` sets (the list's title).
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
- `review-panel` takes the full inline size of `layout-workspace` at every breakpoint; no side
  rail, no second column.
- Every visual value comes from the token source (`src/styles/theme.css`,
  `src/styles/components.css`) or `ui_ux/token-source-v3.md`; this handoff declares none.

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
- **[v3 new]** **Outdated tab:** no deletion is offered: no `Delete session`, no
  `Delete played notes`, and turning `Keep my played notes` off opens no confirmation. Every other
  control works, in memory for the visit. When the tab becomes outdated while the Review shows,
  those buttons leave at once; focus on one of them, or in a deletion confirmation then open,
  goes to `review-title` (`flows/kept-sessions/handoff.md`, In an Outdated Tab).
- **[v3 new]** **A change not saved:** a favorite, pin, comment or `Keep my played notes` change
  the device refuses stays in memory for the visit and shows as made; the workspace's notice row
  tells it once the player is back at idle (`flows/saved-data/handoff.md`).
- **[v3 changed]** **No played note:** a session without a controller, one in which nothing was
  played in a phrase, or a kept session whose played notes were not kept or were deleted: neither
  `review-export-played` nor `review-view` is rendered.
- **Played notes on / off:** lanes shown under every system position, or none; see
  Components and Content.
- **[v3 new]** **Favorites only unavailable:** no favorite: the segment disabled with its
  `field-note`. **Played notes export unavailable:** under `Favorites only` with no played note in
  a favorite phrase: `Export played notes` disabled with its `field-note`.
- **[v3 new]** **Comment:** collapsed-empty, collapsed-filled, editing (see Components and
  Content).
- **[v3 new]** **A confirmation open:** the Review stays under the sheet's backdrop, unchanged.
- **Review code not loaded:** the Review's code is fetched ahead at session start and cached with
  the app, so a failed load means a broken deployment or offline before the app was first cached.
  Then nothing is drawn in the staff area's place: no message, `Close review` works as usual, and
  the next show tries the load again.
- **[v3 changed]** **No room:** `room-notice` in place of `review-list`; header, comment, exports and `review-view`
  unchanged (the switches keep their state for when the list returns).
- **Portrait below `bp-desktop`:** hidden with the whole workspace behind `orientation-notice`,
  kept, shown again in landscape.
- **Theme change:** recolours the engraving and the panel at once, without re-engraving.
