# Issue: Score is black-on-black in dark mode

**ID:** `Ref_20260925_score_dark_mode_black_strokes`
**Ref:** `ISS-001`
**Date:** 2026-09-25
**Severity:** High
**Status:** Resolved
**Component:** `src/styles/components.css`
**Affects:** `src/components/notation/PhraseScore.vue`, `src/notation/vexflow-engraver.ts`, `src/notation/vexflow-two-system-engraver.ts`, `tests/e2e/workspace/theme.spec.ts`

---

## Summary

In dark mode (explicit `data-theme='dark'` or the system preference), the staff lines, stems, barlines, beams, ties and ledger lines are drawn in black on the dark staff surface (`#23231f`). Only the SMuFL glyphs (note heads, clef, key signature, rests, time signature) and the chord symbols get recolored. The score is barely legible. Reported by the user during manual testing after the Step 10 merge.

---

## Technical Description

### Background

`components.css` recolors the VexFlow SVG through CSS, so a theme switch recolors the score without a redraw. The rules only match elements that carry `fill`/`stroke` presentation attributes:

```css
.staff-frame .staff-svg [fill]:not([fill='none']) {
  fill: var(--color-staff);
}
.staff-frame .staff-svg [stroke]:not([stroke='none']) {
  stroke: var(--color-staff);
}
.staff-frame .staff-svg text {
  fill: var(--color-staff);
}
```

The comment above them assumes VexFlow paints presentation attributes with a black default.

### The Problem Scenario

1. Set the system to dark mode, open the app and generate a phrase (B-flat display, any settings).
2. VexFlow 5 emits most shapes without `fill`/`stroke` attributes. They inherit black from VexFlow's group or SVG defaults.
3. Only `<text>` matches a recolor rule.

These are the computed styles in dark mode (Chromium, 2026-09-25 probe on `main` at 2418069):

```
element  count  computed fill / stroke     fill attr / stroke attr
g        71     rgb(0,0,0) / rgb(0,0,0)    null / null
path     34     none / rgb(0,0,0)          none / null     <- stems, ties, staff lines
rect     25     rgb(0,0,0) / (none|black)  null / null     <- beams, ledger lines, barlines
path      2     rgb(0,0,0) / none          null / none
text     25     rgb(255,248,233) / none    null / none     <- glyphs: recolored correctly
staff-frame background: rgb(35,35,31)
```

### Where This Pattern Exists Today

- `src/styles/components.css:167-180`: attribute-scoped recolor rules.
- `src/styles/theme.css`: `--color-staff` is `#fff8e9` in both dark blocks.
- `tests/e2e/workspace/theme.spec.ts`: it asserts only that the SVG markup is unchanged across a theme switch. No test checks the painted color.

---

## Risk Assessment

| Factor              | Value                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------- |
| Likelihood          | High: any user whose OS is set to dark mode                                              |
| Impact if triggered | High: the staff and rhythm (beams/stems) are unreadable                                  |
| Detectability       | Low in CI: axe does not evaluate SVG stroke contrast, and no test checks computed colors |
| Current mitigant    | Switch the theme to Light                                                                |

---

## Recommended Fix

**Short term:** Recolor by inheritance instead of attribute matching. Keep explicit `none` values transparent. For example:

```css
.staff-frame .staff-svg,
.staff-frame .staff-svg g {
  fill: var(--color-staff);
  stroke: var(--color-staff);
}
.staff-frame .staff-svg [fill='none'] {
  fill: none;
}
.staff-frame .staff-svg [stroke='none'],
.staff-frame .staff-svg text {
  stroke: none;
}
```

Verify that the note heads, rests and text keep no stroke outline. Update the CSS comment.

**Medium term:** Add an e2e check in both themes. For every painted element under `svg.staff-svg`, the computed non-`none` fill/stroke must equal `--color-staff`, or be AA-contrast against `--color-surface`. Include a dark-mode screenshot assertion in the notation suite.

**Long term:** Set the colors at engrave time through the VexFlow render context (`context.setFillStyle`/`setStrokeStyle` with `currentColor`), so the SVG inherits `color` from `.staff-frame` whatever VexFlow's internal markup.

---

## Extra Data

A dark-mode screenshot of the probe shows white note heads, clef and key signature on invisible (black) staff lines, stems and barlines.

---

## References

- `src/styles/components.css`
- `src/styles/theme.css`
- `tests/e2e/workspace/theme.spec.ts`
- `ui_ux/decisions.md` (theme decisions)

## Change Log

- **2026-09-25**: Fix started on branch `release-followups`, after the v1.0-rc1 tag.
- **2026-09-25**: Resolved. `.staff-frame .staff-svg` and its `g` descendants now take `--color-staff` by inheritance, so root-only VexFlow fill and stroke no longer leave black shapes; `[fill='none']` stays transparent. Covered by the new `theme.spec.ts` test "every painted staff element matches --color-staff in both Light and Dark". The notation-visual snapshots were regenerated.
