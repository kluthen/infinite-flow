# Last Session Review Handoff

> **New in v2.**

`review-panel` is the phrase-workspace page's review mode (`screens/phrase-workspace/`): while the
Review shows, it is the only child of `layout-workspace` that is rendered, in place of
`score-panel` and `control-section`, under the unchanged `layout-header`, whose session action
reads `Close review`. A Review exists from a session end once phrase 1 has sounded until the next
session starts or the page closes; it shows at that session end and after `Review last session`,
and is kept, not shown, after `Close review`. It is drawn from the session history held in
memory; nothing in it reads the current controls. Flow and routing:
`flows/review-and-export/handoff.md`.

## Layout Tree

```text
layout-header                  (screens/phrase-workspace/; the session action reads Close review, primary, while the Review shows; the phrase action is disabled)
layout-workspace
  score-panel                  (screens/phrase-workspace/; hidden while the Review shows; its session-cue-row holds review-link while a Review exists and is not showing)
  control-section              (screens/phrase-workspace/; hidden while the Review shows)
  review-panel                 (section, aria-labelledby review-title; rendered only while the Review shows)
    review-header
      review-heading
        review-title           (h2, tabindex -1: "Last session")
        review-summary         (p; from bp-tablet-landscape up only)
      review-actions           (whole-session tools; v2.0 holds review-export only)
        review-export          (role group, aria-label "Export generated notes")
          field-group          (Format)
            field-label        ("Format")
            segmented-control  (MusicXML, MIDI)
          btn toggle-button    (Backing track; aria-pressed; rendered only while MIDI is selected)
            toggle-button-state
          btn review-export-action ("Export generated notes")
        (v2.1: the played-notes export joins here, beside review-export -- not rendered in v2.0)
      inline-alert alert-error review-export-error (only after a failed export)
      (v2.1: the played-notes toggle joins review-header -- not rendered in v2.0)
    review-list                (ol; replaced by room-notice while the staff has no room)
      review-phrase x n        (li, one per phrase that started sounding, in session order)
        review-phrase-header
          review-phrase-title  (h3: "Phrase {n}")
          review-phrase-tempo  ("{tempo} BPM")
          (later per-phrase tools go at this row's trailing end -- none in v2.0)
        review-staff           (one system position from bp-tablet-landscape up, two below; reserved before engraving)
          staff-content        (one per system position: a whole phrase, or bars 1-2 then bars 3-4)
            chord-symbol
            measure-slot       (four per unit in the one-system layout, two in the split layout)
          review-phrase-note   (in place of staff-content when the phrase cannot be drawn -- see States)
    room-notice                (p, no tabindex; in place of review-list while the staff has no room)
      room-notice-wide
      room-notice-narrow
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
    `MusicXML` is checked at first; the choice holds for the page session.
  - **Backing track**: `btn toggle-button` reading "Backing track" with `toggle-button-state`
    "on"/"off" (`aria-pressed`; the accessible name is "Backing track" alone), rendered only while
    `MIDI` is checked. Off at first; its state holds for the page session, including while hidden.
    It is independent of the audio mix's `Backing` toggle.
  - **Export**: `btn review-export-action` reading "Export generated notes". Secondary emphasis
    (never `btn-primary`): `Close review`, in the header, is the page's one primary action while
    the Review shows. Activation builds
    exactly one file from the session history and starts a browser download.
  - While the file is built the button takes `is-loading` and `disabled`; Format and Backing track
    stay live and apply to the next export. Focus stays on the button and returns to it enabled.
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
  either file.
- `review-export-error`: `inline-alert alert-error` reading "The file couldn't be made. Try
  again." It appears under `review-actions` after a failed build, is not a live region, moves no
  focus, and leaves when the next export starts.
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
  - **Layout** follows the current breakpoint, as the workspace staff does: from
    `bp-tablet-landscape` up, one system with four measures; below it, the split layout (bars 1–2,
    then bars 3–4, clef and key signature repeated, time signature on the first system only, measure
    columns aligned). Never scrolled horizontally, cut off, or split further.
  - **Size.** `review-staff` reserves one system position (two in the split layout) with the same
    block size the workspace staff's system positions have at the current viewport, set by the
    notation layout, before the phrase is engraved. The phrase is drawn in it at the largest scale
    its own content allows, never above the workspace staff's scale and never below the legibility
    floor, and placed for the session's profile (see the workspace Notation Contract, **System
    position size and staff placement**).
  - **Lazy engraving.** A phrase is engraved when its item comes within about one viewport height
    of the visible area, and may be released when far from it; its reserved size never changes, so
    the scroll position never jumps. No fade: `staff-content` in the review takes no entrance or
    exit animation.
- `review-phrase-note`, muted, centred in the reserved space, in place of `staff-content`:
  - "This phrase needs a wider window." when the staff has room but this phrase's notes do not fit
    at the legibility floor in the current layout. It is drawn again, with no fade, once a viewport
    change gives it room.
  - "This phrase couldn't be drawn." when its engraving fails for any other reason. No action; the
    export does not depend on the engraving.
- `room-notice` in the review: while the workspace staff has no room (screens/phrase-workspace,
  Notation Contract, **Room for the staff**, the no-room cause), `review-list` is not rendered and a
  `room-notice` stands in its place holding `room-notice-wide` and `room-notice-narrow`, shown by
  the same width-only query as in `staff-frame`. It carries no `tabindex` and is not announced.
  The list returns on the viewport change that gives the staff room.
- `Close review` is the header's session action (`btn btn-primary btn-lg session-action`, same
  fixed inline size) with that label while the Review shows; see `screens/phrase-workspace/`,
  Components and Content, and `flows/review-and-export/handoff.md`, Close review.
- `review-link` (in `screens/phrase-workspace/`, `session-cue-row`): `btn review-link` reading
  "Review last session", at the row's trailing end, rendered at idle while a Review exists and is
  not showing, beside whatever else the row holds (`start-note-line`, or nothing). Activation shows
  the Review again, scrolled to its top, and moves focus to `review-title`.

## Focus and Keyboard

- While the Review shows, the tab order is the header (`controller-status`, `theme-control`, the
  disabled phrase action skipped, `Close review`), then `review-panel`: Format, Backing track (when
  shown), Export generated notes. Items in the list hold nothing focusable in v2.0.
- A session end moves focus to `Close review`. `Close review` and `Review last session` move focus
  as `flows/review-and-export/handoff.md` sets. Keyboard route from a session end: Space closes the
  Review, focus stays on the session action, now `Start session`; Space starts the next session.
  No global shortcut closes the Review.
- A session start (only from idle, the Review not showing) removes `review-link`; if it had focus
  when the starting note started the session, focus moves to the session action.

## Responsive Behavior

- At `bp-mobile-landscape` (below `bp-tablet-landscape`): `review-header` stacks: `review-title`,
  then `review-actions` wrapping onto as many lines as it needs, the Format control at its natural
  width rather than full width. `review-summary` is not rendered. Phrases use the split layout at
  the workspace staff's phone scale. Nothing else is added or removed on the phone; v2.1's
  played-notes toggle and export join `review-header` and `review-actions` here too.
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
- **Showing:** as above, in place of the staff and the controls, whatever idle state the hidden
  workspace is in (**Loading**, **Ready**, the errors, **Needs more room**, **Empty**). It never
  changes with those states, except for the no-room list replacement. No session starts: the
  session action reads `Close review`, and every MIDI note is ignored.
- **Kept, not showing:** after `Close review`, until the next session starts: the workspace as at
  idle, with `review-link` in `session-cue-row`.
- **Empty:** cannot occur: a Review opens only once a phrase has sounded, so it always holds at
  least one phrase.
- **Loading:** per phrase only: an item not yet engraved shows its reserved space, blank, with no
  spinner. Export building: `review-export-action` `is-loading`.
- **Error:** per phrase, `review-phrase-note`; export, `review-export-error`. Neither blocks
  anything else.
- **No room:** `room-notice` in place of `review-list`; header and export unchanged.
- **Portrait below `bp-desktop`:** hidden with the whole workspace behind `orientation-notice`,
  kept, shown again in landscape.
- **Theme change:** recolours the engraving and the panel at once, without re-engraving.
