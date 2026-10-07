# Motion

> **Changes since v1**
>
> - _New:_ the session's motion: the stepping playhead, instant count-in beats and
>   acknowledgements, a cue row with no animation, refills with the existing fades, and the
>   one instant jump at a session start, which on the phone settles the cue row and both systems
>   into view ([Rules](#rules))
> - _New:_ a window resized during a session redraws the staff instantly, with no fade
>   ([Rules](#rules))
> - _New:_ the notice shown when the staff has no room appears and leaves with no animation, and
>   the new phrase generated once it clears enters with the ordinary fade ([Rules](#rules))
> - _New:_ the review of the last session shows, is left and is shown again with no animation,
>   and its phrases are drawn with no fade ([Rules](#rules))
> - _New:_ an automatic change during a session (a varied setting, a risen tempo) shows with no
>   transition, and the review's played-notes lanes appear and go with no animation
>   ([Rules](#rules))
> - _Changed:_ "do not animate musical playback" becomes: the playhead steps and never glides,
>   and nothing else moves with the music ([Rules](#rules))
> - _Removed:_ nothing

## Rules

- Motion communicates phrase replacement and immediate interaction feedback; it never decorates the music stand.
- Use `--duration-fade` with `--ease-out-gentle` for staff-content entrance after an initial or regenerated phrase is fully engraved.
- Fade old staff content with `--duration-fade-fast` before inserting a newly ready phrase. The staff frame, measure slots, control positions, and page layout do not move.
- Use `--duration-feedback` with `--ease-out-fast` for button and segmented-control feedback.
- **[v2 changed]** Do not animate notes independently, scroll the staff, or delay an enabled next action. During a session the playhead steps from measure to measure at each barline, on the audio clock, and never glides; nothing else moves with the music.
- **[v2 new]** Anything that happens in time with the music changes instantly, with no transition or easing, because an eased change lands late by the length of its easing: the count-in's beats lighting, a note's acknowledgement colour, the playhead's step.
- **[v2 new]** Session refills use the phrase-replacement fades above: a system the playhead has left takes the `--duration-fade-fast` fade-out at once, and its new material enters with the `--duration-fade` entrance when engraved. Only the system not being read ever fades.
- **[v2 new]** The session cue row's contents (the starting-note line, the count-in, the notices, the phone's compact Stop and Volume) and the staff's start marker appear and leave with no animation, and the disconnect countdown's number changes with no animation. The row itself never changes size.
- **[v2 new]** If the staff is out of view when a session starts, the page jumps to the top of the workspace instantly, never with a smooth scroll, once, before the count-in. At `bp-mobile-landscape` the same single instant jump instead settles the page so the session cue row and both staff systems are wholly in view. The app scrolls nothing else during a session.
- **[v2 new]** When a viewport change during a session leaves room for the staff, both systems re-engrave at the new size instantly, with no fade: a re-engrave is not a refill, and only a refill fades. It is the one change a session makes to the system being read, allowed because the player caused it by resizing the window. A browser toolbar hiding or reappearing on a phone redraws nothing: the phone's staff is sized to the height with the toolbars showing. A session start redraws nothing: phrase 1 is already shown in the layout the session keeps, on a phone as on a larger screen.
- **[v2 new]** The notice that replaces the score when the staff has no room (`room-notice`) appears and leaves with no animation, like the rotate-device message: it tracks the window's size, and a fade would flicker as a window is dragged across the limit. For the same reason its sentence, which depends on the breakpoint and on why the staff has no room, changes with no animation. When it clears, a new phrase is generated and enters with the ordinary loading and `--duration-fade` entrance; when the rhythm settings cannot form a phrase at that moment, it gives way to the empty staff instead, with no animation. Under the too-many-notes sentence, the round of retries that a widening, a change to a setting the phrase is generated from, or `Regenerate phrase` starts runs under the ordinary loading with the notice kept in place, never blinking off and back on; the first phrase that fits enters with the same entrance, and the notice leaves with no animation. A phrase regenerated at idle because it was too wide for the room uses the ordinary loading and entrance; its failed attempts are never drawn.
- **[v2 new]** The audio mix's Volume popover opens and closes instantly. The toggle buttons use the ordinary button feedback.
- **[v2 new]** The review of the last session (`review-panel`) takes the staff area's place at a session end, and gives it back on `Close review`, with no animation; `Review last session` shows it again the same way. Each switch puts the page at its top with an instant jump, never a smooth scroll, like the session start's jump. Its phrases are drawn as they come near the screen with no fade, since a fade on something scrolling into view is decoration and would flicker under a fast scroll. At a session end the staff's last systems are cleared out of sight, and the next phrase lands there with the ordinary loading, also out of sight; the player finds it on leaving the review.
- **[v2 new]** A value the app changes during a session (a setting varied by `Vary settings`, the tempo raised by `Rising tempo`) replaces the old one in the read-only control and in `tempo-readout` instantly, at the moment the first phrase generated with that setting, or playing at that tempo, starts sounding, with no transition, highlight or easing, and moves nothing. At the session end the controls return to the player's values just as instantly, out of sight under the review.
- **[v2 new]** In the review, the played-notes lanes appear and go with no animation when `Played notes` is switched, and are drawn with their phrase, with no fade, like the phrases themselves. The list grows or shrinks around the phrase in view, held in place by the browser's scroll anchoring; nothing scrolls on its own.
- Under `prefers-reduced-motion: reduce`, staff replacement is instant and only non-spatial color feedback remains.
