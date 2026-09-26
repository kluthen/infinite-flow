---
id: module_notation_layout_preflight
status: REVIEW
priority: 1
tags: notation
parents:
  - [[req_landscape_phrase_workspace]]
  - [[rule_notation_display_preserves_phrase]]
dependents: []
type: MODULE
human_name: Notation Layout Preflight
version: 0.4
layer: ARCHITECTURE
notes: User sign-off 2026-09-24: approved the two-line landscape-phone layout fallback (D46) and the 5 px legibility floor (D46); atom orientation language and floor sign-off status corrected to match, then promoted DRAFT to REVIEW.
---

# Notation Layout Preflight

## INTENT

Guarantee the four-measure written phrase is legible on the current viewport, trying a single staff system first and falling back to a two-line phone layout only on narrow landscape viewports, failing with a retryable notation error only when neither fits at the legibility floor.

## THE RULE / LOGIC

Written notation for the four-measure phrase is first budgeted as exactly one staff system containing all four measures (clef, key signature, and 4/4 time signature on the first measure; chord symbols above their harmonic events) against a single named legibility floor expressed as a minimum staff-space size in CSS pixels; the engraving scale may shrink toward that floor but never below it, and may grow up to a named maximum. At viewport widths at or above the 64rem tablet-landscape breakpoint, this one-system budget is the only layout tried: if it does not fit at or above the floor, or would exceed the container horizontally, notation fails with a typed, retryable notation error. Below the 64rem tablet-landscape breakpoint, if the one-system layout does not fit at or above the floor, layout retries as two staff systems in a single SVG: line one holds bars 1-2 with clef, key signature, and the 4/4 time signature; line two holds bars 3-4 with clef and key signature repeated but no time signature. Both lines share the same engraving scale and use aligned, equal-width measure columns -- each line's width is the leading clef/key/time width plus two times the widest of the four measures, and all four measures render at that same equal width in both the one-system and two-system layouts. Below 64rem, portrait viewports show a rotate-device notice instead of interactive phrase controls per the master spec, so in practice this two-system fallback is reached only on landscape phones. If the two-system layout also does not fit at or above the floor, the typed retryable notation error remains. Engraved height is derived from content, never budgeted against a container height; the two-line layout is expected to fit within a landscape phone viewport. Layout never scrolls horizontally, clips, splits beyond two systems, or shrinks the engraving scale below the floor. Engraving waits until notation fonts and the container size are ready, and redraws when the container is resized or the viewport crosses the 64rem breakpoint, re-running the same budget. Every successful engraving, one-system or two-system, is accompanied by a semantic text description of the same written phrase (the selected instrument profile's written pitch, clef, key, meter, and each measure's chord symbols, notes, rests, durations, ties) for assistive technology; a failed or superseded engraving clears that description instead of leaving a stale one. The two-line phone fallback described in this atom was signed off by the user on 2026-09-24. The legibility floor is 5 CSS pixels of staff-space size, signed off by the user on 2026-09-24; the 12 CSS-pixel maximum is an engineering choice, not a product decision requiring sign-off.

## TECHNICAL INTERFACE

Layout accepts the four-measure written phrase, the current score container width, and whether the viewport matches the phone-layout media query (`NOTATION_PHONE_LAYOUT_MEDIA_QUERY`, a width-only viewport query mirroring 64rem), the 64rem tablet-landscape breakpoint, and readiness signals for notation fonts and container size; it produces one engraved staff system, or, below the breakpoint, two engraved staff systems of two measures each in one SVG, at a scale between the named minimum and maximum staff-space size, or a typed retryable notation error, plus an accompanying semantic text description of the phrase.

## EXPECTATION

At 64rem and above, all four measures render in exactly one staff system, or layout fails with a typed retryable notation error; behavior at this width is unchanged. Below 64rem, layout first tries the same one-system rendering; if that does not fit at or above the legibility floor, it renders two staff systems of two measures each, bars 1-2 then bars 3-4, in one SVG, both at the same scale, with clef and key signature repeated on line two, the time signature only on line one, and all four measures at one aligned equal width, leading width plus two widest-measure widths per line. Below 64rem in portrait, the workspace shows a rotate-device notice instead of interactive phrase controls per the master spec, so in practice this two-system fallback is reached only on landscape phones. If neither the one-system nor the two-system layout fits at or above the floor, the typed retryable notation error is shown instead. Height is always derived from content, never clipped, scrolled, or split beyond two systems, and engraving scale never drops below the floor. Every successful engraving is paired with a semantic text description of the same written phrase for assistive technology; a failed engraving clears the description instead.
