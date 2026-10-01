---
id: rule_readonly_controls_keep_contrast
status: DRAFT
human_name: Readonly Controls Keep Contrast
version: 0.2
dependents: []
type: RULE
layer: ARCHITECTURE
priority: 2
tags: accessibility,contrast,readonly,controls
parents:
  - [[service_workspace_session_flow]]
---

# Readonly Controls Keep Contrast

## INTENT
Keep a read-only generation control at the same text and UI-component contrast as its active state while an Idle operation runs or a session is active, instead of dimming it, and signal its locked state with a dashed ring rather than reduced opacity.

## THE RULE / LOGIC
While the workspace's Idle operation is not idle, or while a session is active (count-in or running), every musical configuration control, tempo included, is read-only; the presentation theme control is not a musical control and stays interactive. A read-only control never applies an opacity reduction to its label, selected-segment, or border colors: those colors render identically to the control's own active state. Instead, the control draws a locked-state indicator using the design token --readonly-ring, defined as 0.125rem dashed var(--color-text-muted), applied as an outline with an outline-offset of one spacing unit, alongside pointer-events: none so the control stays keyboard-focusable but not interactive. The ring is drawn once per field: a field-group wrapping a segmented control applies the ring on the field-group itself, and the nested segmented control's own ring is suppressed while it has a read-only field-group ancestor, so a wrapped control never shows two rings. A segmented control with no field-group ancestor (for example a header control not wrapped in a field-group) draws its own ring directly.

## TECHNICAL INTERFACE
Any control participating in the workspace's read-only state (segmented controls and field-groups, including tempo steppers and other field-group contents) exposes an is-readonly state that callers/styles key off of; no control-specific override may reintroduce an opacity-based dimming for that state. The --readonly-ring token and the outline treatment it drives are the sole visual signal of read-only lock, layered onto the control's otherwise-unchanged active-state appearance.

## EXPECTATION
Every color rendered by a read-only control (text, selected-segment, border) equals the color rendered by the same control in its active state -- no read-only control ever falls below the WCAG AA 4.5:1 text contrast floor or 3:1 non-text-UI floor as a result of dimming, because no dimming occurs. Every read-only control shows exactly one dashed --readonly-ring outline: a wrapped segmented control's own ring is suppressed in favor of its field-group's ring, and an unwrapped control draws its own.
