# Last Session Review Handoff

> **New in v2.**

`review-panel` is the phrase-workspace page's review mode (`screens/phrase-workspace/`): while the
Review shows, it is rendered inside `score-panel`, after `score-toolbar`, in place of the staff area
(the generation-failure banner and `session-cue-row` hidden; `staff-viewport` out of sight but
still laid out, see the Layout Tree), with
`control-section` still after it and `layout-header` unchanged except that its session action reads
`Close review`. A Review exists from a session end once phrase 1 has sounded until the next
session starts or the page closes; it shows at that session end and after `Review last session`,
and is kept, not shown, after `Close review`. It is drawn from the session history held in
memory; nothing in it reads the current controls. Flow and routing:
`flows/review-and-export/handoff.md`.

## Layout Tree

```text
layout-header                  (screens/phrase-workspace/; the session action reads Close review, primary, while the Review shows; the phrase action is disabled)
layout-workspace
  score-panel                  (screens/phrase-workspace/)
    score-toolbar              (stays; score-title not rendered while the Review shows; mix-controls usable)
    review-panel               (section, aria-labelledby review-title; rendered only while the Review shows)
      review-header
        review-heading
          review-title           (h2, tabindex -1: "Last session")
          review-summary         (p; from bp-tablet-landscape up only)
        review-actions           (whole-session tools: review-export, then, from v2.1, the played-notes export)
          review-export          (role group, aria-label "Export generated notes")
            field-group          (Format)
              field-label        ("Format")
              segmented-control  (MusicXML, MIDI)
            btn toggle-button    (Backing track; aria-pressed; rendered only while MIDI is selected)
              toggle-button-state
            btn review-export-action ("Export generated notes")
          btn review-export-action ("Export played notes"; v2.1; rendered only when the session holds a played note)
        inline-alert alert-error review-export-error (only after a failed export, of either content)
        review-view              (v2.1; a row of its own after the export row; rendered only when the session holds a played note)
          btn toggle-button      (Played notes; aria-pressed; no aria-controls)
            toggle-button-state
      review-list                (ol; replaced by room-notice while the staff has no room)
        review-phrase x n        (li, one per phrase that started sounding, in session order)
          review-phrase-header
            review-phrase-title  (h3: "Phrase {n}")
            review-phrase-tempo  ("{tempo} BPM")
            (later per-phrase tools go at this row's trailing end -- none in v2.0)
          review-staff           (one system position from bp-tablet-landscape up, two below, each followed by its played-notes lane while Played notes is on; all reserved before engraving)
            staff-content        (one per system position: a whole phrase, or bars 1-2 then bars 3-4)
              chord-symbol
              measure-slot       (four per unit in the one-system layout, two in the split layout)
            review-phrase-note   (in place of staff-content when the phrase cannot be drawn -- see States)
            played-notes-lane    (v2.1; div, role img; one under each system position, only while Played notes is on -- see Components and Content)
              played-notes-divider (a line at each barline between the lane's measures)
              played-note x n    (a bar per played note whose onset falls in this phrase, or the part of it in this lane)
      room-notice                (p, no tabindex; in place of review-list while the staff has no room)
        room-notice-wide
        room-notice-narrow
    (generation-failure banner, session-cue-row: hidden while the Review shows; session-cue-row holds review-link while a Review exists and is not showing)
    staff-viewport is-out-of-sight (while the Review shows, also inert: laid out at its normal inline size so the staff still engraves and measures, but invisible, out of the accessibility tree and tab order, taking no block space)
  control-section              (screens/phrase-workspace/; stays, fully editable, while the Review shows)
```

## Components and Content

- `review-panel` is a surface panel like `control-section` (surface, border, radius, shadow,
  padding from the token source). It has no state classes of its own; it is rendered while the Review shows, and not otherwise.
- `review-title` reads "Last session". It carries `tabindex="-1"` so `review-link` can move focus
  to it; it is never in the tab order and takes the `:focus-visible` ring.
- `review-summary` reads "{n} phrases · {instrument profile}. Kept until the next session starts
  or the page is closed." `{n}` is the number of phrases in the history ("1 phrase" when one);
  `{instrument profile}` is the session's profile name as the instrument-profile control labels it
  (e.g. "B-flat tenor saxophone"), which may differ from the profile selected now. Muted, small.
  Not rendered below `bp-tablet-landscape`.
- `review-export`:
  - **Format**: `field-group` with `field-label` "Format" and a `segmented-control` (radiogroup,
    roving tab stop, as every single-select control in the workspace) with `MusicXML` then `MIDI`.
    `MusicXML` is checked at first; the choice holds for the page session (across `Close review`,
    re-showing and later sessions' Reviews), is never stored, and a reload resets it.
  - **Backing track**: `btn toggle-button` reading "Backing track" with `toggle-button-state`
    "on"/"off" (`aria-pressed`; the accessible name is "Backing track" alone), rendered only while
    `MIDI` is checked. Off at first; its state holds for the page session, including while hidden,
    as Format's does.
    It is independent of the audio mix's `Backing` toggle.
  - **Export**: `btn review-export-action` reading "Export generated notes". Secondary emphasis
    (never `btn-primary`): `Close review`, in the header, is the page's one primary action while
    the Review shows. Activation builds
    exactly one file from the session history and starts a browser download.
  - While the file is built the button takes `is-loading` and `disabled`; Format and Backing track
    stay live and apply to the next export. Focus stays on the button and returns to it enabled.
    The first export of the page also loads the export code, within the same `is-loading` state.
  - No message on success: the browser's download is the confirmation. `generation-status` and
    `notation-status` say nothing about exports.
- **File names.** `infinite-flow-{date}-{time}-generated.musicxml` for MusicXML and
  `infinite-flow-{date}-{time}-generated.mid` for MIDI, where `{date}` is `YYYY-MM-DD` and
  `{time}` is `HHmmss`, the session's start (the Start click or starting note) in local time. The
  played-notes file of v2.1 takes the same stem with `-played.mid`, so a session's files sort
  together and name their content.
- **File contents** follow master spec §7 (MusicXML score-partwise 4.0 in the session profile's
  written pitch with its transposition; MIDI type 1 at concert pitch with the tempo map, a marker
  per phrase, and the backing track only when `Backing track` is on). No played note is ever in
  either generated-notes file.
- **Export played notes** (v2.1): `btn review-export-action` reading "Export played notes", in
  `review-actions` after `review-export`, rendered only when the session history holds at least
  one played note whose onset falls in a phrase (never after a session without a controller, nor
  one in which nothing was played in a phrase). Secondary emphasis, no options: the file is
  always MIDI (master spec §7: one track of the played notes, concert pitch as received, original
  velocity, unquantized, the same tempo map and phrase markers as the generated-notes MIDI file;
  never the backing). File name `infinite-flow-{date}-{time}-played.mid`, the stem as above.
  Activation builds exactly one file and starts a browser download, with the same `is-loading`,
  focus, code-loading and no-message-on-success behaviour as `Export generated notes`. The two
  buttons are independent: either may be used while the other is building.
- `review-export-error`: `inline-alert alert-error` reading "The file couldn't be made. Try
  again." It appears under `review-actions` after any failure to build or hand over a file, of
  either content (a failed load of the export code included), is not a live region, moves no
  focus, and leaves when the next export of either content starts.
- **Played notes** (v2.1): `review-view`, a row after the export row (and after
  `review-export-error` when that shows), holds one `btn toggle-button` reading "Played notes"
  with `toggle-button-state` "on"/"off" (`aria-pressed`; the accessible name is "Played notes"
  alone; no `aria-controls`, since `review-list` is absent while the staff has no room and the
  lanes appear right under the switch). Rendered only when **Export played notes** is.
  Off when the Review first opens; its state holds for the page session (across `Close review`,
  re-showing and later sessions' Reviews), is never stored, and a reload resets it. It changes
  only what `review-list` shows: never the exports, never the generated staff.
- **Played-notes lane** (v2.1): while `Played notes` is on, each system position in `review-staff`
  is followed by one `played-notes-lane`, a block of the full content inline size and the block
  size `--played-notes-lane-block-size`, separated from the system above by `--spacing-2`, holding
  absolutely placed `played-notes-divider` and `played-note` elements:
  - **Which notes.** Every played note in the session history whose onset falls in this phrase
    (the notes before phrase 1 belong to none, as in the export). In the split layout the top
    lane holds bars 1–2 and the bottom lane bars 3–4.
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
- `review-phrase-header`: `review-phrase-title` "Phrase {n}" (the session phrase number, which the
  export's rehearsal marks and markers also carry) and `review-phrase-tempo` "{tempo} BPM" (the
  tempo the phrase played at), muted, on one line; it wraps below `bp-tablet-landscape` if needed.
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
- `review-link` (in `screens/phrase-workspace/`, `session-cue-row`): `btn review-link` reading
  "Review last session", at the row's trailing end, rendered at idle while a Review exists and is
  not showing, beside whatever else the row holds (`start-note-line`, or nothing). Activation shows
  the Review again, scrolls the page instantly to its top, then moves focus to `review-title`.

## Focus and Keyboard

- While the Review shows, the tab order is the header (`controller-status`, `theme-control`, the
  disabled phrase action skipped, `Close review`), `score-toolbar`'s `mix-controls`, then
  `review-panel` (Format, Backing track when shown, Export generated notes), then
  `control-section`. From v2.1, when the session holds a played note, `Export played notes`
  follows `Export generated notes`, and `Played notes` follows the export row. Items in the list
  hold nothing focusable.
- Switching `Played notes` keeps focus on it.
- A session end moves focus to `Close review`. `Close review` and `Review last session` move focus
  as `flows/review-and-export/handoff.md` sets. Keyboard route from a session end: Space closes the
  Review, focus stays on the session action, now `Start session`; Space starts the next session.
  No global shortcut closes the Review.
- A session start (only from idle, the Review not showing) removes `review-link`; if it had focus
  when the starting note started the session, focus moves to the session action (now `Stop`);
  focus anywhere else is left where it is.
- `Close review` in **Needs more room** moves focus to `room-notice` whichever the notice's cause
  (no room, or this phrase's notes too wide).
- `generation-status` and `notation-status` are emptied when the Review opens and say nothing
  while it shows; a generation that ends after `Close review` is announced as at idle.

## Responsive Behavior

- At `bp-mobile-landscape` (below `bp-tablet-landscape`): `review-header` stacks: `review-title`,
  then `review-actions` wrapping onto as many lines as it needs, the Format control at its natural
  width rather than full width. `review-summary` is not rendered. Phrases use the split layout at
  the workspace staff's phone scale. Nothing else is added or removed on the phone; v2.1's
  `Export played notes` joins `review-actions` and `review-view` its own row here too, and each of
  a phrase's two system positions gets its own lane.
- `review-actions` separates its groups (the generated-notes `review-export`, then
  `Export played notes`) by a wider gap than the items inside a group, at every breakpoint.
- `review-view` takes a row of its own under the heading and the actions at every breakpoint,
  aligned to the inline start.
- `played-notes-lane` keeps `--played-notes-lane-block-size` at every breakpoint; only its inline
  size follows the staff above it.
- At `bp-tablet-landscape` and `bp-desktop`: `review-heading` at the inline start and
  `review-actions` at the inline end of one row, wrapping under the heading when they do not fit;
  `review-summary` under the title. One system per phrase, across the panel's content width.
- `review-panel` takes the full inline size of `layout-workspace` at every breakpoint; no side
  rail, no second column.
- Every visual value comes from the token source (`src/styles/theme.css`,
  `src/styles/components.css`); this handoff declares none.

## States

- **Absent:** no Review exists (before the first session with a sounded phrase, from any session
  start, after a reload). No `review-panel`, no `review-link`.
- **Showing:** as above, in place of the staff area, whatever idle state the hidden staff is in (**Loading**, **Ready**, the errors, **Needs more room**, **Empty**). It never
  changes with those states, except for the no-room list replacement. No session starts: the
  session action reads `Close review`, and no MIDI note starts a session (the connection sheet
  and its check note work as usual). The audio mix, tempo and settings stay usable.
- **Kept, not showing:** after `Close review`, until the next session starts: the workspace as at
  idle, with `review-link` in `session-cue-row`.
- **Empty:** cannot occur: a Review opens only once a phrase has sounded, so it always holds at
  least one phrase.
- **Loading:** per phrase only: an item not yet engraved shows its reserved space (and, with
  `Played notes` on, its lanes' space), blank, with no spinner. Export building: the
  `review-export-action` used takes `is-loading`.
- **Error:** per phrase, `review-phrase-note`; export, `review-export-error`. Neither blocks
  anything else.
- **No played note** (v2.1): a session without a controller, or one in which nothing was played
  in a phrase: neither `Export played notes` nor `review-view` is rendered; the Review is as in
  v2.0.
- **Played notes on / off** (v2.1): lanes shown under every system position, or none; see
  Components and Content.
- **Review code not loaded:** the Review's code is fetched ahead at session start and cached with
  the app, so a failed load means a broken deployment or offline before the app was first cached.
  Then nothing is drawn in the staff area's place: no message, `Close review` works as usual, and
  the next show tries the load again.
- **No room:** `room-notice` in place of `review-list`; header, exports and `Played notes`
  unchanged (the switch keeps its state for when the list returns).
- **Portrait below `bp-desktop`:** hidden with the whole workspace behind `orientation-notice`,
  kept, shown again in landscape.
- **Theme change:** recolours the engraving and the panel at once, without re-engraving.
