# Generate Phrase Intent

The player needs one complete musical thought, not four piecemeal surprises. The flow therefore makes generation a whole-phrase act. Any control change updates the pending musical direction but leaves the visible phrase intact until the player explicitly requests a replacement.

The workspace opens with a ready-to-generate empty staff when no result exists. Once a result exists, the same prominent action says `Regenerate phrase`, making the scope of replacement explicit. The action is deliberately near the score header rather than buried in controls: the player looks at the phrase, decides whether to seek another idea, and acts there.

The notation mode is a display control adjacent to the score. Changing it never suggests a new musical request; it redraws the current result in the selected reading convention. Controls follow the score in a vertically reached section: a compact horizontal group layout on wide displays and a stacked layout on mobile landscape. This gives all four measures the full available width without a horizontal scroll.

The phrase is shown only after generation has produced a valid, complete result. During regeneration, the current phrase remains readable; the action becomes unavailable only long enough to prevent accidental duplicate requests. The next score replaces it as a cohesive unit rather than measure by measure.
