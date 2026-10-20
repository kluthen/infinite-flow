// @lint-ignore-atd shared UI plumbing: the option shape of the generic segmented control; no business rule

/** One SegmentedControl choice: the raw value it selects and its rendered display label. */
export interface SegmentedControlOption {
  readonly value: string
  readonly label: string
  /**
   * The option can't be chosen here: rendered natively disabled, never the checked option, and
   * skipped by arrow-key, Home and End selection. Its reason is given in words elsewhere, in the
   * element `describedBy` names.
   */
  readonly disabled?: boolean
  /** The id of the element giving the reason a disabled option can't be chosen. */
  readonly describedBy?: string
  /**
   * A guidance in force points to this option: its segment is drawn with a small dot, a shape and
   * not colour alone, in every state of the segment, read-only included. Independent of `disabled`
   * and `describedBy`, it changes nothing about choosing the option. What the marks mean is said
   * once for the whole group, by the element the group's `describedBy` names.
   */
  readonly marked?: boolean
}
