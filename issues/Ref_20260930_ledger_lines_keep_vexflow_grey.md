# Issue: Ledger lines keep VexFlow's own grey instead of the staff colour

**ID:** `Ref_20260930_ledger_lines_keep_vexflow_grey`
**Ref:** `ISS-007`
**Date:** 2026-09-30
**Severity:** Medium
**Status:** Resolved
**Component:** `src/notation/vexflow-engraver.ts`
**Affects:** `src/styles/components.css` (the staff recolouring), `src/notation/vexflow-two-system-engraver.ts`, `src/notation/vexflow-mapping.ts`, the notation visual baselines, every phrase with a note above or below the staff

---

## Summary

VexFlow draws every ledger line with its own presentation attribute `stroke="#444"`, taken from the
stave's default ledger line style. The staff is recoloured by inheritance only (a `fill` and
`stroke` rule on the SVG root and every `g`), and an inherited value never overrides an element's
own presentation attribute, so ledger lines stay `#444` in both themes instead of taking
`--color-staff`. In the light theme they are only slightly off the staff colour; in the dark theme
they are dark grey lines on the dark staff surface, with low contrast, next to light staff lines
and noteheads. This is not new: `main` has no ledger line styling either.

---

## Technical Description

### Background

The stylesheet recolours the score without redrawing it: `.staff-frame .staff-svg` and
`.staff-frame .staff-svg g` set `fill` and `stroke` to `var(--color-staff)`, and every drawn shape
that carries no colour of its own inherits it. VexFlow's SVG context writes an attribute on an
element only when it differs from the enclosing group's, so most shapes carry no colour and the
recolouring reaches them.

### The Problem Scenario

```js
// node_modules/vexflow/build/esm/src/stave.js:53 (Stave constructor)
this.defaultLedgerLineStyle = { strokeStyle: '#444', lineWidth: 2 };

// node_modules/vexflow/build/esm/src/stavenote.js:715 (StaveNote ledger line drawing)
const style = Object.assign(Object.assign({}, stave.getDefaultLedgerLineStyle()), this.getLedgerLineStyle());
ctx.save();
this.applyStyle(ctx, style); // sets the context stroke to '#444'
// ... each ledger line: ctx.stroke() -> <path stroke="#444" stroke-width="2" ...>
```

```css
/* src/styles/components.css, staff recolouring (about lines 232-243) */
.staff-frame .staff-svg,
.staff-frame .staff-svg g {
  fill: var(--color-staff);
  stroke: var(--color-staff); /* inherited by children without their own stroke */
}
```

1. A phrase has a note on a ledger line, for example the saxophones' written C4 or the C MIDI
   keyboard's written C3.
2. VexFlow draws the ledger line as a bare `<path>` in the note's `g.vf-stavenote` group, with
   `stroke="#444"` written on the path itself.
3. The recolouring rule sets `stroke` on the groups only; the path's own attribute wins over the
   inherited value.
4. In the dark theme the staff lines and noteheads are light, and the ledger line is dark grey on
   the dark staff surface.

### Where This Pattern Exists Today

- `src/notation/vexflow-engraver.ts` and `src/notation/vexflow-two-system-engraver.ts` build the
  staves and draw the notes with VexFlow's default ledger line style; nothing sets it.
- `src/styles/components.css`, the staff recolouring rule (about lines 232-243), has no rule for
  ledger line paths.
- `tests/e2e/notation/notation-overlays.spec.ts` asserts only that an acknowledgement leaves the
  ledger lines' colour unchanged, not that they have the staff colour.

---

## Risk Assessment

| Factor | Value |
|---|---|
| Likelihood | High: every phrase with a note above or below the staff, in either theme |
| Impact if triggered | Medium: the notes stay readable, but in the dark theme ledger lines have low contrast against the staff surface, and in both themes they differ from the staff colour |
| Detectability | Medium: visible on the dark staff, but no test checks the ledger lines' colour |
| Current mitigant | None |

---

## Recommended Fix

**Short term:** Stop VexFlow writing a colour on ledger lines: call
`stave.setDefaultLedgerLineStyle({ lineWidth: 2 })` on every stave the engraver builds (or set each
note's ledger line style the same way), so the path inherits the staff colour like every other
shape. Alternatively, add a stylesheet rule on the ledger paths
(`.staff-frame .staff-svg g.vf-stavenote > path { stroke: var(--color-staff); }`), since a CSS
rule does override a presentation attribute.

**Medium term:** Add a notation spec assertion that ledger lines resolve to `--color-staff` in
both themes, next to the acknowledgement colour checks, and review the visual baselines whose
phrases have ledger lines.

**Long term:** Keep one rule for the whole adapter: no drawn shape carries its own colour, so the
stylesheet alone decides every colour of the score.

---

## Extra Data

Found on 2026-09-30 while building the note identity and session overlays: ledger lines, which an
acknowledgement never lights, were seen to keep `#444` rather than the staff ink in the dark theme.

---

## References

- `node_modules/vexflow/build/esm/src/stave.js` (line 53, `defaultLedgerLineStyle`)
- `node_modules/vexflow/build/esm/src/stavenote.js` (line 715, ledger line style applied)
- `node_modules/vexflow/build/esm/src/svgcontext.js` (`applyAttributes`: an attribute is written when it differs from the group's)
- `src/styles/components.css`
- `src/notation/vexflow-engraver.ts`
- `tests/e2e/notation/notation-overlays.spec.ts`

---

## Change Log

- **2026-10-05**: Resolved. `buildStaveNote` (`src/notation/vexflow-mapping.ts`), which builds every
  engraved note (the Idle score, the session's rolling staff, the Review and the controller check
  note), now gives each note the ledger line style `{ strokeStyle: '', lineWidth: 2 }`. The short-term
  fix proposed above (`stave.setDefaultLedgerLineStyle({ lineWidth: 2 })`) would not have worked:
  `Stave.getDefaultLedgerLineStyle()` merges the stave's own style, whose stroke is VexFlow's
  `#999999`, under the ledger line style, so the lines would have carried `#999999` instead of
  `#444`. VexFlow then merges the note's ledger line style over the stave's, and the empty stroke
  style overrides both greys. `Element.applyStyle` skips an empty stroke style, so no stroke
  attribute is written, and the ledger lines inherit `--color-staff` like every other shape. The
  width stays 2. The check-note engraver's post-draw stripping (`clearLedgerLineColour`) became
  redundant and was removed, so one mechanism covers every engraver. Covered by
  `tests/e2e/notation/notation-ledger-lines.spec.ts`: no own stroke, computed stroke equal to
  `--color-staff` and width 2, in the light and dark themes, on the Idle staff, the session staff
  and the Review. `notation-overlays.spec.ts` now requires the ledger lines to keep the staff ink
  through an acknowledgement. Three dark-theme overlay baselines were updated, each differing only
  at its ledger lines: `start-marker-desktop-dark`, `band-and-acks-desktop-dark` and
  `band-and-system-break-tie-phone-dark`. The light-theme and system-scheme baselines still match
  within Playwright's colour tolerance (`#444` against `#171613`).
