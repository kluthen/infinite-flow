# Motion

## Rules

- Motion communicates phrase replacement and immediate interaction feedback; it never decorates the music stand.
- Use `--duration-fade` with `--ease-out-gentle` for staff-content entrance after an initial or regenerated phrase is fully engraved.
- Fade old staff content with `--duration-fade-fast` before inserting a newly ready phrase. The staff frame, measure slots, control positions, and page layout do not move.
- Use `--duration-feedback` with `--ease-out-fast` for button, segmented-control, and MIDI-indicator feedback.
- Do not animate notes independently, scroll the staff, animate musical playback, or delay an enabled next action.
- Under `prefers-reduced-motion: reduce`, staff replacement is instant and only non-spatial color feedback remains.
